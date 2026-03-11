'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, WorkflowAction } from '@/store/chat.store';
import { useDesignStore } from '@/store/design.store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { StudioGraph } from '@openclaw-studio/shared';
import { DesignStatus } from '@openclaw-studio/shared';
import { ExportDialog } from '@/components/export/ExportDialog';
import { api } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

function applyWorkflowAction(
  action: WorkflowAction,
  currentGraph: StudioGraph | undefined,
): StudioGraph {
  const graph: StudioGraph = currentGraph || {
    nodes: [],
    edges: [],
    metadata: {
      name: 'New Design',
      description: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
  };

  switch (action.type) {
    case 'create_graph':
      return action.graph || { ...graph, nodes: action.nodes || [], edges: action.edges || [] };
    case 'add_nodes':
      return {
        ...graph,
        nodes: [...graph.nodes, ...(action.nodes || [])],
        edges: [...graph.edges, ...(action.edges || [])],
      };
    case 'remove_nodes': {
      const removeIds = new Set(action.remove_node_ids || []);
      return {
        ...graph,
        nodes: graph.nodes.filter((n) => !removeIds.has(n.id)),
        edges: graph.edges.filter((e) => !removeIds.has(e.source) && !removeIds.has(e.target)),
      };
    }
    case 'modify_nodes': {
      const modMap = new Map((action.nodes || []).map((n) => [n.id, n]));
      return {
        ...graph,
        nodes: graph.nodes.map((n) => (modMap.has(n.id) ? { ...n, ...modMap.get(n.id) } : n)),
      };
    }
    case 'add_edges':
      return {
        ...graph,
        edges: [...graph.edges, ...(action.edges || [])],
      };
    case 'refine':
      return {
        ...graph,
        nodes: action.nodes || graph.nodes,
        edges: action.edges || graph.edges,
      };
    default:
      return graph;
  }
}

const SUGGESTIONS = [
  'Build a customer support team with ticket triage and escalation',
  'Create a content marketing crew with SEO and social media',
  'Design a research agent that summarizes findings',
  'Set up a DevOps pipeline with monitoring and alerting',
];

export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const {
    sessionId,
    messages,
    isStreaming,
    error,
    createSession,
    sendMessageStream,
    clearError,
  } = useChatStore();

  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const setActiveDesign = useDesignStore((s) => s.setActiveDesign);
  const validateDesign = useDesignStore((s) => s.validateDesign);

  useEffect(() => {
    if (!sessionId) {
      createSession();
    }
  }, [sessionId, createSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (message: string) => {
      const currentGraph = activeDesign?.graph;
      await sendMessageStream(message, currentGraph);
    },
    [activeDesign, sendMessageStream],
  );

  const handleApplyAction = useCallback(
    (action: WorkflowAction) => {
      const currentGraph = activeDesign?.graph;
      const newGraph = applyWorkflowAction(action, currentGraph);

      if (!activeDesign) {
        const newDesign = {
          id: `design-${Date.now()}`,
          name: 'AI Generated Design',
          description: 'Created via AI Assistant',
          status: DesignStatus.Draft,
          use_case_prompt: '',
          graph: newGraph,
          created_by: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setActiveDesign(newDesign);
        setTimeout(() => updateGraph(newGraph), 0);
      } else {
        updateGraph(newGraph);
      }
    },
    [activeDesign, updateGraph, setActiveDesign],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  const handleSaveVersion = async () => {
    if (!activeDesign?.id || !activeDesign?.graph) {
      toast('warning', 'No design to save');
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/designs/${activeDesign.id}/versions`, { change_summary: 'Quick save' });
      toast('success', 'Version saved');
    } catch {
      toast('error', 'Failed to save version');
    } finally {
      setIsSaving(false);
    }
  };

  const hasMessages = messages.filter((m) => m.role !== 'system').length > 0;
  const agentCount = activeDesign?.graph?.nodes.filter((n) => n.type === 'agent').length || 0;

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Branding Header */}
        <div className="flex items-center justify-between border-b border-studio-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-studio-accent/20">
              <svg className="h-4 w-4 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-studio-text">OpenClaw Studio</h1>
              <p className="text-[10px] text-studio-text-muted">Design-time agent builder</p>
            </div>
          </div>

          {/* Quick actions */}
          {activeDesign?.graph && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveVersion}
                disabled={isSaving}
                className="rounded p-1.5 text-studio-text-muted hover:text-studio-text hover:bg-studio-bg transition-colors"
                title="Save version"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4h8V3M7 21v-7h10v7" />
                </svg>
              </button>
              <button
                onClick={validateDesign}
                className="rounded p-1.5 text-studio-text-muted hover:text-yellow-400 hover:bg-studio-bg transition-colors"
                title="Validate design"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setIsExportOpen(true)}
                className="rounded p-1.5 text-studio-text-muted hover:text-studio-accent hover:bg-studio-bg transition-colors"
                title="Publish to OpenClaw"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Design summary card (when agents exist) */}
        {agentCount > 0 && (
          <div className="border-b border-studio-border px-4 py-3 bg-studio-bg/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-studio-text">
                {activeDesign?.name || 'Agent Workflow'}
              </span>
              <span className="text-[10px] text-studio-text-muted bg-studio-bg px-2 py-0.5 rounded-full">
                {agentCount} agent{agentCount !== 1 ? 's' : ''}
              </span>
            </div>
            {activeDesign?.description && (
              <p className="text-[10px] text-studio-text-muted line-clamp-2">{activeDesign.description}</p>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-3">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onApplyAction={handleApplyAction} />
          ))}

          {isStreaming && (
            <div className="flex items-center gap-1 px-4 py-2">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-studio-accent" />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-studio-accent" style={{ animationDelay: '0.2s' }} />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-studio-accent" style={{ animationDelay: '0.4s' }} />
            </div>
          )}

          {/* Empty state with suggestions */}
          {!hasMessages && !isStreaming && (
            <div className="flex flex-col items-center justify-center px-6 py-12">
              <svg
                className="mb-4 h-16 w-16 text-studio-accent opacity-20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
              <p className="mb-1 text-base font-semibold text-studio-text">
                What would you like to build?
              </p>
              <p className="mb-6 text-center text-xs text-studio-text-muted max-w-[280px]">
                Describe your use case and I&apos;ll design an OpenClaw multi-agent workflow on the canvas.
              </p>
              <div className="space-y-2 w-full">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-center gap-2 w-full rounded-lg border border-studio-border bg-studio-bg/50 px-3 py-2.5 text-left text-xs text-studio-text-muted hover:border-studio-accent/50 hover:text-studio-text hover:bg-studio-bg transition-all"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-studio-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5">
              <span className="text-xs text-red-400">{error}</span>
              <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 ml-2">
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming} placeholder="Ask, build, refine... (Shift + Enter for new line)" />
      </div>

      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </>
  );
}
