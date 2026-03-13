'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDesignStore } from '@/store/design.store';
import { useChatStore } from '@/store/chat.store';
import { api } from '@/lib/api';
import type { StudioTemplate, StudioGraph } from '@openclaw-studio/shared';
import { DesignStatus } from '@openclaw-studio/shared';

const SUGGESTIONS = [
  { label: 'Customer support team with triage', icon: '🎧' },
  { label: 'Content marketing crew with SEO', icon: '📝' },
  { label: 'Research agent with daily digest', icon: '🔬' },
  { label: 'DevOps pipeline with alerting', icon: '🔧' },
];

interface LandingPageProps {
  onOpenStudio: () => void;
}

export function LandingPage({ onOpenStudio }: LandingPageProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');

  const designs = useDesignStore((s) => s.designs);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const setActiveDesign = useDesignStore((s) => s.setActiveDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const isGenerating = useDesignStore((s) => s.isGenerating);

  const { sessionId, createSession, sendMessageStream } = useChatStore();

  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  useEffect(() => {
    loadDesigns();
    setIsLoadingTemplates(true);
    api.get<StudioTemplate[]>('/templates')
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setIsLoadingTemplates(false));
  }, [loadDesigns]);

  useEffect(() => {
    if (!sessionId) createSession();
  }, [sessionId, createSession]);

  const handleSubmit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    // Create a new design and switch to studio
    const newDesign = {
      id: `design-${Date.now()}`,
      name: 'AI Generated Design',
      description: text,
      status: DesignStatus.Draft,
      use_case_prompt: text,
      graph: { nodes: [], edges: [], metadata: { name: 'AI Generated Design', description: text, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 } },
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setActiveDesign(newDesign);
    setPrompt('');
    onOpenStudio();

    // Fire off the AI generation in the background
    await sendMessageStream(text, newDesign.graph);
  }, [prompt, isGenerating, setActiveDesign, onOpenStudio, sendMessageStream]);

  const handleSuggestion = (text: string) => {
    setPrompt(text);
    // Slight delay to show it in the input, then submit
    setTimeout(() => {
      const newDesign = {
        id: `design-${Date.now()}`,
        name: 'AI Generated Design',
        description: text,
        status: DesignStatus.Draft,
        use_case_prompt: text,
        graph: { nodes: [], edges: [], metadata: { name: 'AI Generated Design', description: text, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 } },
        created_by: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setActiveDesign(newDesign);
      setPrompt('');
      onOpenStudio();
      sendMessageStream(text, newDesign.graph);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOpenDesign = async (designId: string) => {
    try {
      await loadDesign(designId);
    } catch {
      // Fallback: find from local list
      const d = designs.find((d) => d.id === designId);
      if (d) setActiveDesign(d);
    }
    onOpenStudio();
  };

  const handleUseTemplate = (template: StudioTemplate) => {
    const graph = template.template_json as unknown as StudioGraph;
    const newDesign = {
      id: `design-${Date.now()}`,
      name: template.name,
      description: template.description || '',
      status: DesignStatus.Draft,
      use_case_prompt: '',
      graph: graph && graph.nodes ? graph : { nodes: [], edges: [], metadata: { name: template.name, description: template.description || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 } },
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setActiveDesign(newDesign);
    if (graph && graph.nodes) {
      updateGraph(graph);
    }
    onOpenStudio();
  };

  const formatRelativeDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return '';
    }
  };

  const recentDesigns = designs.slice(0, 7); // Show up to 7 recent designs (+ create card = 8)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-studio-text mb-2">
            Design AI Agent Workflows
          </h2>
          <p className="text-sm text-studio-text-muted max-w-lg mx-auto">
            Describe what you want to build and watch AI create your OpenClaw multi-agent system
          </p>
        </div>

        {/* AI Prompt Input */}
        <div className="relative mb-4">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the agent workflow you want to build..."
            rows={3}
            className="w-full rounded-xl border border-studio-border bg-studio-surface px-4 py-3.5 pr-14 text-sm text-studio-text placeholder:text-studio-text-muted/50 focus:outline-none focus:border-studio-accent resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-studio-accent text-white hover:bg-studio-accent-hover disabled:opacity-30 transition-colors"
          >
            {isGenerating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            )}
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.label)}
              className="flex items-center gap-1.5 rounded-full border border-studio-border bg-studio-surface px-3.5 py-1.5 text-xs text-studio-text-muted hover:border-studio-accent/50 hover:text-studio-text transition-colors"
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Recent Projects */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-studio-text">Recent Designs</h3>
              <p className="text-xs text-studio-text-muted">Pick up where you left off or start something new</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {/* Create New Card */}
            <button
              onClick={() => {
                inputRef.current?.focus();
              }}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-studio-border hover:border-studio-accent/50 bg-studio-surface/30 px-3 py-6 transition-colors group min-h-[120px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-studio-bg border border-studio-border group-hover:border-studio-accent/30 transition-colors mb-2">
                <svg className="w-5 h-5 text-studio-text-muted group-hover:text-studio-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xs font-medium text-studio-text-muted group-hover:text-studio-text transition-colors">Create New</span>
              <span className="text-[10px] text-studio-text-muted/50">Start fresh</span>
            </button>

            {/* Design Cards */}
            {recentDesigns.map((design) => {
              const agentCount = design.graph?.nodes.filter((n) => n.type === 'agent').length || 0;
              return (
                <button
                  key={design.id}
                  onClick={() => handleOpenDesign(design.id)}
                  className="flex flex-col rounded-xl border border-studio-border bg-studio-surface hover:border-studio-accent/40 px-3 py-3 text-left transition-colors min-h-[120px]"
                >
                  <span className="text-xs font-medium text-studio-text truncate w-full mb-1">
                    {design.name}
                  </span>
                  {design.description && (
                    <span className="text-[10px] text-studio-text-muted line-clamp-2 mb-auto">
                      {design.description}
                    </span>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-studio-border/50 w-full">
                    <span className="text-[10px] text-studio-text-muted/60">
                      {formatRelativeDate(design.updated_at)}
                    </span>
                    {agentCount > 0 && (
                      <span className="text-[10px] text-studio-accent/70">
                        {agentCount} agent{agentCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-studio-text">Templates</h3>
                <p className="text-xs text-studio-text-muted">Pre-built agent architectures to get started quickly</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="flex flex-col rounded-xl border border-studio-border bg-studio-surface hover:border-studio-accent/40 px-3 py-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-studio-text truncate">{template.name}</span>
                    <span className="text-[9px] text-studio-accent bg-studio-accent/10 rounded px-1.5 py-0.5 flex-shrink-0">
                      {template.template_type}
                    </span>
                  </div>
                  {template.description && (
                    <span className="text-[10px] text-studio-text-muted line-clamp-2">{template.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingTemplates && templates.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-studio-text-muted">Loading templates...</p>
          </div>
        )}
      </div>
    </div>
  );
}
