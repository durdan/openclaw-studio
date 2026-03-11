'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants';
import type { StudioGraph } from '@openclaw-studio/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: WorkflowAction;
}

export interface WorkflowAction {
  type: 'create_graph' | 'add_nodes' | 'remove_nodes' | 'modify_nodes' | 'add_edges' | 'explain' | 'refine';
  nodes?: any[];
  edges?: any[];
  remove_node_ids?: string[];
  graph?: StudioGraph;
  summary?: string;
}

export interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;

  // Actions
  createSession: () => Promise<void>;
  sendMessage: (message: string, currentGraph?: StudioGraph) => Promise<WorkflowAction | undefined>;
  sendMessageStream: (message: string, currentGraph?: StudioGraph, onText?: (text: string) => void) => Promise<WorkflowAction | undefined>;
  clearSession: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: null,
  messages: [],
  isStreaming: false,
  error: null,

  createSession: async () => {
    try {
      const response = await api.post<{ id: string; messages?: ChatMessage[] }>('/chat/sessions');
      set({
        sessionId: response.id,
        messages: response.messages || [
          {
            id: 'msg-system-welcome',
            role: 'system',
            content: 'Welcome to OpenClaw Studio AI Assistant. Describe what you want to build and I will create it on the canvas.',
            timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      });
    } catch {
      // Fallback: create a local session if backend is unavailable
      set({
        sessionId: `local-${Date.now()}`,
        messages: [
          {
            id: 'msg-system-welcome',
            role: 'system',
            content: 'Welcome to OpenClaw Studio AI Assistant. Describe what you want to build and I will create it on the canvas.',
            timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      });
    }
  },

  sendMessage: async (message, currentGraph) => {
    const { sessionId } = get();
    if (!sessionId) return undefined;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isStreaming: true, error: null }));

    try {
      const response = await api.post<{ message: ChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
        message,
        currentGraph,
      });

      const assistantMsg: ChatMessage = response.message || {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: 'I received your message but could not process it.',
        timestamp: new Date().toISOString(),
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isStreaming: false,
      }));

      return assistantMsg.action;
    } catch (error) {
      set({
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
      return undefined;
    }
  },

  sendMessageStream: async (message, currentGraph, onText) => {
    const { sessionId } = get();
    if (!sessionId) return undefined;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isStreaming: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, currentGraph }),
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let action: WorkflowAction | undefined;

      const assistantMsgId = `msg-${Date.now()}-assistant`;
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: assistantMsgId,
            role: 'assistant' as const,
            content: '',
            timestamp: new Date().toISOString(),
          },
        ],
      }));

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '');
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text') {
              fullContent += parsed.content;
              onText?.(parsed.content);
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: fullContent } : m
                ),
              }));
            } else if (parsed.type === 'action') {
              action = parsed.action;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsgId ? { ...m, content: fullContent, action } : m
        ),
        isStreaming: false,
      }));

      return action;
    } catch (error) {
      // Fall back to non-streaming if streaming fails
      set((s) => ({
        // Remove the user message we already added so sendMessage can re-add it
        messages: s.messages.filter((m) => m.id !== userMsg.id),
        isStreaming: false,
      }));
      return get().sendMessage(message, currentGraph);
    }
  },

  clearSession: () => {
    set({
      sessionId: null,
      messages: [],
      isStreaming: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
