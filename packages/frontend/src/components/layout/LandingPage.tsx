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

    await sendMessageStream(text, newDesign.graph);
  }, [prompt, isGenerating, setActiveDesign, onOpenStudio, sendMessageStream]);

  const handleSuggestion = (text: string) => {
    setPrompt(text);
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
      const d = designs.find((d) => d.id === designId);
      if (d) setActiveDesign(d);
    }
    onOpenStudio();
  };

  const handleUseTemplate = (template: StudioTemplate) => {
    // template_json may be a direct graph OR { planner_output, graph_seed }
    const tj = template.template_json as Record<string, unknown>;
    const graph = (
      tj.graph_seed ? tj.graph_seed : tj.nodes ? tj : null
    ) as StudioGraph | null;

    const emptyGraph: StudioGraph = { nodes: [], edges: [], metadata: { name: template.name, description: template.description || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 } };
    const finalGraph = graph && graph.nodes?.length ? graph : emptyGraph;

    const newDesign = {
      id: `design-${Date.now()}`,
      name: template.name,
      description: template.description || '',
      status: DesignStatus.Draft,
      use_case_prompt: '',
      graph: finalGraph,
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setActiveDesign(newDesign);
    if (finalGraph.nodes.length) {
      updateGraph(finalGraph);
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

  const recentDesigns = designs.slice(0, 7);
  const totalAgents = designs.reduce((sum, d) => sum + (d.graph?.nodes.filter((n) => n.type === 'agent').length || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-10">

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-studio-accent/20 bg-studio-accent/5 px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-studio-accent animate-pulse" />
            <span className="text-[11px] font-medium text-studio-accent">AI-Powered Designer</span>
          </div>
          <h2 className="text-3xl font-bold text-studio-text mb-3 tracking-tight">
            Design Multi-Agent Systems
          </h2>
          <p className="text-sm text-studio-text-muted max-w-md mx-auto leading-relaxed">
            Describe your use case and let AI architect your OpenClaw agents, skills, and workflows
          </p>
        </div>

        {/* AI Prompt Input — elevated card style */}
        <div className="relative mb-5 rounded-2xl border border-studio-border bg-studio-surface shadow-sm">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What kind of agent system do you want to build?"
            rows={3}
            className="w-full rounded-2xl bg-transparent px-5 py-4 pr-14 text-sm text-studio-text placeholder:text-studio-text-muted/50 focus:outline-none resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="absolute bottom-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-xl bg-studio-accent text-white hover:bg-studio-accent-hover disabled:opacity-30 transition-all shadow-sm"
          >
            {isGenerating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
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
              className="flex items-center gap-1.5 rounded-full border border-studio-border bg-studio-surface px-3.5 py-1.5 text-xs text-studio-text-muted hover:border-studio-accent/40 hover:text-studio-text hover:shadow-sm transition-all"
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Stats Row */}
        {(designs.length > 0 || templates.length > 0) && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="rounded-xl border border-studio-border bg-studio-surface px-4 py-3">
              <p className="text-2xl font-bold text-studio-text">{designs.length}</p>
              <p className="text-[11px] text-studio-text-muted">Designs Created</p>
            </div>
            <div className="rounded-xl border border-studio-border bg-studio-surface px-4 py-3">
              <p className="text-2xl font-bold text-studio-text">{totalAgents}</p>
              <p className="text-[11px] text-studio-text-muted">Total Agents</p>
            </div>
            <div className="rounded-xl border border-studio-border bg-studio-surface px-4 py-3">
              <p className="text-2xl font-bold text-studio-text">{templates.length}</p>
              <p className="text-[11px] text-studio-text-muted">Templates Available</p>
            </div>
          </div>
        )}

        {/* Recent Designs */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-studio-text">Recent Designs</h3>
            {designs.length > 7 && (
              <button className="text-[11px] text-studio-accent hover:text-studio-accent-hover transition-colors">
                View all
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {/* Create New Card */}
            <button
              onClick={() => inputRef.current?.focus()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-studio-border hover:border-studio-accent/40 bg-transparent px-3 py-6 transition-all group min-h-[130px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-studio-border bg-studio-surface group-hover:border-studio-accent/30 group-hover:bg-studio-accent/5 transition-all mb-2.5">
                <svg className="w-5 h-5 text-studio-text-muted group-hover:text-studio-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xs font-medium text-studio-text-muted group-hover:text-studio-text transition-colors">New Design</span>
            </button>

            {/* Design Cards */}
            {recentDesigns.map((design) => {
              const agentCount = design.graph?.nodes.filter((n) => n.type === 'agent').length || 0;
              return (
                <button
                  key={design.id}
                  onClick={() => handleOpenDesign(design.id)}
                  className="flex flex-col rounded-xl border border-studio-border bg-studio-surface hover:border-studio-accent/40 hover:shadow-sm px-4 py-3.5 text-left transition-all min-h-[130px]"
                >
                  <span className="text-xs font-semibold text-studio-text truncate w-full mb-1">
                    {design.name}
                  </span>
                  {design.description && (
                    <span className="text-[11px] text-studio-text-muted line-clamp-2 mb-auto leading-relaxed">
                      {design.description}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-studio-border/40 w-full">
                    <span className="text-[10px] text-studio-text-muted/70">
                      {formatRelativeDate(design.updated_at)}
                    </span>
                    {agentCount > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-studio-accent">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                        </svg>
                        {agentCount}
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
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-studio-text">Templates</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="flex flex-col rounded-xl border border-studio-border bg-studio-surface hover:border-studio-accent/40 hover:shadow-sm px-4 py-3.5 text-left transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-studio-text truncate">{template.name}</span>
                    <span className="text-[9px] font-medium text-studio-accent bg-studio-accent/10 rounded-full px-2 py-0.5 flex-shrink-0">
                      {template.template_type}
                    </span>
                  </div>
                  {template.description && (
                    <span className="text-[11px] text-studio-text-muted line-clamp-2 leading-relaxed">{template.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingTemplates && templates.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-xs text-studio-text-muted">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading templates...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
