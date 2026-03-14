'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDesignStore } from '@/store/design.store';
import { useChatStore } from '@/store/chat.store';
import { DesignStatus } from '@openclaw-studio/shared';
import type { StudioGraph } from '@openclaw-studio/shared';

// ─── Types ──────────────────────────────────────────────────────────

interface WizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface UseCase {
  id: string;
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

interface Channel {
  id: string;
  icon: string;
  name: string;
}

// ─── Data ───────────────────────────────────────────────────────────

const USE_CASES: UseCase[] = [
  {
    id: 'email',
    icon: '📧',
    title: 'Email Management',
    description: 'Monitor inboxes, triage messages, draft responses, handle follow-ups',
    prompt: 'Build an email management system that monitors my inbox, triages messages by priority, drafts responses for routine emails, and flags urgent items for my attention',
  },
  {
    id: 'support',
    icon: '🎧',
    title: 'Customer Support',
    description: 'Handle tickets, auto-respond to FAQs, escalate complex issues',
    prompt: 'Create a customer support team that handles incoming tickets, auto-responds to common questions from a knowledge base, and escalates complex issues to a human',
  },
  {
    id: 'devops',
    icon: '🔧',
    title: 'DevOps & Monitoring',
    description: 'Watch alerts, diagnose issues, create fix PRs automatically',
    prompt: 'Build a DevOps automation system that monitors Sentry alerts, diagnoses issues by reading logs and code, and creates fix pull requests on GitHub',
  },
  {
    id: 'content',
    icon: '📝',
    title: 'Content & Marketing',
    description: 'Social media posting, SEO optimization, competitor research',
    prompt: 'Create a marketing growth team that manages social media across platforms, optimizes SEO content, monitors competitors, and generates weekly reports',
  },
  {
    id: 'research',
    icon: '🔬',
    title: 'Research & Analysis',
    description: 'Web research, data analysis, summarize findings into reports',
    prompt: 'Build a research agent team that scrapes the web for information, analyzes data trends, and produces daily digest reports with actionable insights',
  },
  {
    id: 'business',
    icon: '💼',
    title: 'Business Operations',
    description: 'Morning briefs, calendar management, expense tracking, task coordination',
    prompt: 'Create a business operations assistant that sends morning briefings, manages calendar scheduling, tracks expenses, and coordinates task assignments across the team',
  },
  {
    id: 'compliance',
    icon: '🛡️',
    title: 'Compliance & Legal',
    description: 'Monitor regulatory changes, review documents, flag risks',
    prompt: 'Build a compliance monitoring system that tracks regulatory changes, reviews documents for compliance issues, and alerts the team about potential risks',
  },
  {
    id: 'custom',
    icon: '✨',
    title: 'Custom',
    description: 'Describe your own use case in plain English',
    prompt: '',
  },
];

const CHANNELS: Channel[] = [
  { id: 'telegram', icon: '💬', name: 'Telegram' },
  { id: 'slack', icon: '🔷', name: 'Slack' },
  { id: 'whatsapp', icon: '📱', name: 'WhatsApp' },
  { id: 'discord', icon: '🎮', name: 'Discord' },
  { id: 'email', icon: '📧', name: 'Email' },
  { id: 'web', icon: '🌐', name: 'Web / API' },
];

type AgentMode = 'single' | 'multi' | 'auto';

// ─── Component ──────────────────────────────────────────────────────

export function SetupWizard({ onComplete, onCancel }: WizardProps) {
  const [step, setStep] = useState(1);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [agentMode, setAgentMode] = useState<AgentMode>('auto');
  const [agentName, setAgentName] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);

  const setActiveDesign = useDesignStore((s) => s.setActiveDesign);
  const { sessionId, createSession, sendMessageStream } = useChatStore();

  useEffect(() => {
    if (!sessionId) createSession();
  }, [sessionId, createSession]);

  const totalSteps = 4;
  const useCase = USE_CASES.find((u) => u.id === selectedUseCase);

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedUseCase && (selectedUseCase !== 'custom' || customPrompt.trim().length > 10);
      case 2: return selectedChannels.length > 0;
      case 3: return true; // agent mode always has a default
      case 4: return true; // review step
      default: return false;
    }
  };

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const buildPrompt = useCallback(() => {
    const base = selectedUseCase === 'custom'
      ? customPrompt.trim()
      : (useCase?.prompt || '');

    const channelNames = selectedChannels
      .map((id) => CHANNELS.find((c) => c.id === id)?.name)
      .filter(Boolean);

    const parts = [base];

    if (channelNames.length > 0) {
      parts.push(`Use these channels: ${channelNames.join(', ')}.`);
    }

    if (agentMode === 'single') {
      parts.push('Use a single agent that handles everything.');
    } else if (agentMode === 'multi') {
      parts.push('Split responsibilities across multiple specialized agents (3-5 agents).');
    }

    if (agentName.trim()) {
      parts.push(`Name the primary agent "${agentName.trim()}".`);
    }

    return parts.join(' ');
  }, [selectedUseCase, customPrompt, useCase, selectedChannels, agentMode, agentName]);

  const handleBuild = useCallback(async () => {
    const prompt = buildPrompt();
    if (!prompt) return;

    setIsBuilding(true);

    const emptyGraph: StudioGraph = {
      nodes: [],
      edges: [],
      metadata: {
        name: useCase?.title || 'Custom Design',
        description: prompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      },
    };

    const newDesign = {
      id: `design-${Date.now()}`,
      name: agentName.trim() || useCase?.title || 'My Agent System',
      description: prompt,
      status: DesignStatus.Draft,
      use_case_prompt: prompt,
      graph: emptyGraph,
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setActiveDesign(newDesign);
    onComplete();

    // Send to AI in the background (canvas is now open)
    await sendMessageStream(prompt, emptyGraph);
    setIsBuilding(false);
  }, [buildPrompt, useCase, agentName, setActiveDesign, onComplete, sendMessageStream]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-studio-text">Setup Wizard</h2>
            <p className="text-xs text-studio-text-muted mt-0.5">
              Step {step} of {totalSteps} — {
                step === 1 ? 'What do you want to automate?' :
                step === 2 ? 'Where will your agents communicate?' :
                step === 3 ? 'How should agents be organized?' :
                'Review & Build'
              }
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-xs text-studio-text-muted hover:text-studio-text transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-studio-accent' : 'bg-studio-border'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Use Case */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-studio-text mb-4">What do you want to automate?</p>
            <div className="grid grid-cols-2 gap-3">
              {USE_CASES.map((uc) => (
                <button
                  key={uc.id}
                  onClick={() => setSelectedUseCase(uc.id)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                    selectedUseCase === uc.id
                      ? 'border-studio-accent bg-studio-accent/5 shadow-sm'
                      : 'border-studio-border bg-studio-surface hover:border-studio-accent/30'
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{uc.icon}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-studio-text block">{uc.title}</span>
                    <span className="text-[11px] text-studio-text-muted line-clamp-2 mt-0.5">{uc.description}</span>
                  </div>
                </button>
              ))}
            </div>
            {selectedUseCase === 'custom' && (
              <div className="mt-4">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe what you want your agents to do..."
                  rows={3}
                  className="w-full rounded-xl border border-studio-border bg-studio-surface px-4 py-3 text-sm text-studio-text placeholder:text-studio-text-muted/50 focus:border-studio-accent focus:outline-none resize-none"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Channels */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-studio-text mb-1">Where will your agents communicate?</p>
            <p className="text-[11px] text-studio-text-muted mb-4">Select all the channels your agents should be available on.</p>
            <div className="grid grid-cols-3 gap-3">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-all ${
                    selectedChannels.includes(ch.id)
                      ? 'border-studio-accent bg-studio-accent/5'
                      : 'border-studio-border bg-studio-surface hover:border-studio-accent/30'
                  }`}
                >
                  <span className="text-lg">{ch.icon}</span>
                  <span className="text-xs font-medium text-studio-text">{ch.name}</span>
                  {selectedChannels.includes(ch.id) && (
                    <svg className="w-4 h-4 text-studio-accent ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Agent Organization */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-studio-text mb-1">How should agents be organized?</p>
            <p className="text-[11px] text-studio-text-muted mb-4">Choose how your AI team is structured.</p>

            <div className="space-y-3">
              {([
                {
                  mode: 'auto' as AgentMode,
                  title: 'Let AI decide (recommended)',
                  desc: 'The AI will create the right number of agents based on your use case',
                  icon: '🤖',
                },
                {
                  mode: 'multi' as AgentMode,
                  title: 'Multiple specialized agents',
                  desc: '3-5 agents, each handling a specific part of the workflow',
                  icon: '👥',
                },
                {
                  mode: 'single' as AgentMode,
                  title: 'Single agent',
                  desc: 'One agent that handles everything — simpler but less specialized',
                  icon: '👤',
                },
              ]).map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => setAgentMode(opt.mode)}
                  className={`flex items-start gap-3 w-full rounded-xl border px-4 py-3.5 text-left transition-all ${
                    agentMode === opt.mode
                      ? 'border-studio-accent bg-studio-accent/5'
                      : 'border-studio-border bg-studio-surface hover:border-studio-accent/30'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{opt.icon}</span>
                  <div>
                    <span className="text-xs font-semibold text-studio-text">{opt.title}</span>
                    <p className="text-[11px] text-studio-text-muted mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-medium text-studio-text-muted block mb-1.5">
                Name your agent (optional)
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., Atlas, Luna, Jarvis..."
                className="w-full rounded-xl border border-studio-border bg-studio-surface px-4 py-2.5 text-sm text-studio-text placeholder:text-studio-text-muted/50 focus:border-studio-accent focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-studio-text mb-4">Review your configuration</p>

            <div className="rounded-xl border border-studio-border bg-studio-surface divide-y divide-studio-border">
              {/* Use Case */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-studio-text-muted uppercase tracking-wider">Use Case</p>
                  <p className="text-xs font-medium text-studio-text mt-0.5">
                    {useCase?.icon} {useCase?.title || 'Custom'}
                  </p>
                </div>
                <button onClick={() => setStep(1)} className="text-[10px] text-studio-accent hover:underline">Edit</button>
              </div>

              {/* Channels */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-studio-text-muted uppercase tracking-wider">Channels</p>
                  <div className="flex gap-1.5 mt-1">
                    {selectedChannels.map((id) => {
                      const ch = CHANNELS.find((c) => c.id === id);
                      return (
                        <span key={id} className="text-[11px] bg-studio-accent/10 text-studio-accent rounded-full px-2 py-0.5">
                          {ch?.icon} {ch?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="text-[10px] text-studio-accent hover:underline">Edit</button>
              </div>

              {/* Agent Mode */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-studio-text-muted uppercase tracking-wider">Organization</p>
                  <p className="text-xs font-medium text-studio-text mt-0.5">
                    {agentMode === 'auto' ? '🤖 AI decides' : agentMode === 'multi' ? '👥 Multiple agents' : '👤 Single agent'}
                    {agentName && ` — "${agentName}"`}
                  </p>
                </div>
                <button onClick={() => setStep(3)} className="text-[10px] text-studio-accent hover:underline">Edit</button>
              </div>
            </div>

            {/* Generated Prompt Preview */}
            <div className="rounded-xl border border-studio-border bg-studio-bg p-4">
              <p className="text-[10px] text-studio-text-muted uppercase tracking-wider mb-2">What the AI will build</p>
              <p className="text-xs text-studio-text leading-relaxed">{buildPrompt()}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-studio-border">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
            className="text-xs text-studio-text-muted hover:text-studio-text transition-colors px-3 py-2"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-xl bg-studio-accent px-5 py-2.5 text-xs font-medium text-white hover:bg-studio-accent-hover disabled:opacity-30 transition-all"
            >
              Continue
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleBuild}
              disabled={isBuilding}
              className="flex items-center gap-1.5 rounded-xl bg-studio-accent px-5 py-2.5 text-xs font-medium text-white hover:bg-studio-accent-hover disabled:opacity-50 transition-all"
            >
              {isBuilding ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Building...
                </>
              ) : (
                <>
                  Build My Agents
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
