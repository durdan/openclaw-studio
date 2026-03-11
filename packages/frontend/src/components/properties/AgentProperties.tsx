'use client';

import { useState, useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { AgentNodeConfig } from '@openclaw-studio/shared';

interface AgentPropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

function Section({ title, tag, defaultOpen, children }: { title: string; tag: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded bg-studio-bg/50 px-2 py-1.5 text-left hover:bg-studio-bg transition-colors"
      >
        <span className="text-xs font-semibold text-studio-text">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-indigo-400/70">{tag}</span>
          <span className="text-[10px] text-studio-text-muted">{open ? '▾' : '▸'}</span>
        </div>
      </button>
      {open && <div className="space-y-3 pl-1 pb-2 pt-2">{children}</div>}
    </div>
  );
}

/** Build SOUL.md preview — informal lowercase personality prose */
function buildSoulMdPreview(config: AgentNodeConfig): string {
  const parts: string[] = [];

  if (config.personality) {
    parts.push(config.personality.toLowerCase());
  } else if (config.role) {
    parts.push(`you are ${config.role.toLowerCase()}.`);
  }

  if (config.communication_style) {
    parts.push(config.communication_style.toLowerCase());
  }

  if (config.do_rules && config.do_rules.length > 0) {
    parts.push(`you always ${config.do_rules.map(r => r.toLowerCase()).join('. you always ')}.`);
  }

  if (config.dont_rules && config.dont_rules.length > 0) {
    parts.push(`you never ${config.dont_rules.map(r => r.toLowerCase()).join('. you never ')}.`);
  }

  if (config.description && !config.personality) {
    parts.push(config.description.toLowerCase());
  }

  return parts.join(' ') || 'you are a helpful assistant.';
}

/** Build AGENTS.md preview — structured operating instructions */
function buildAgentsMdPreview(config: AgentNodeConfig): string {
  const lines: string[] = [];

  lines.push(`# ${config.name || 'Unnamed Agent'}`);
  lines.push('', '## Role');
  lines.push(`You are ${config.name || 'an agent'}, ${config.role || 'an AI agent'}.`);

  if (config.goal || config.description) {
    lines.push('', '## Mission');
    lines.push(config.goal || config.description || '');
  }

  if (config.responsibilities && config.responsibilities.length > 0) {
    lines.push('', '## Capabilities');
    for (const r of config.responsibilities) lines.push(`- ${r}`);
  }

  if (config.skills && config.skills.length > 0) {
    lines.push('', '## Skills');
    for (const s of config.skills) lines.push(`- ${s}`);
  }

  if (config.tools && config.tools.length > 0) {
    lines.push('', '## Tools');
    for (const t of config.tools) lines.push(`- ${t}`);
  }

  const allRules: string[] = [];
  if (config.rules) allRules.push(...config.rules);
  if (config.do_rules) allRules.push(...config.do_rules.map(r => `Always ${r}`));
  if (config.dont_rules) allRules.push(...config.dont_rules.map(r => `Never ${r}`));
  if (allRules.length > 0) {
    lines.push('', '## Rules');
    for (const r of allRules) lines.push(`- ${r}`);
  }

  if (config.handoffs && config.handoffs.length > 0) {
    lines.push('', '## Coordination');
    for (const h of config.handoffs) lines.push(`- ${h}`);
  }

  if (config.example_interactions) {
    lines.push('', '## Example Interactions');
    lines.push(config.example_interactions);
  }

  return lines.join('\n');
}

export function AgentProperties({ nodeId }: AgentPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as AgentNodeConfig;

  const handleChange = useCallback(
    (field: keyof AgentNodeConfig, value: unknown) => {
      if (!activeDesign?.graph) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const graph = activeDesign.graph!;
        const updatedNodes = graph.nodes.map((n) => {
          if (n.id === nodeId) {
            const updatedConfig = { ...n.config, [field]: value } as AgentNodeConfig;
            return {
              ...n,
              config: updatedConfig,
              label: field === 'name' ? (value as string) || n.label : n.label,
            };
          }
          return n;
        });
        updateGraph({
          ...graph,
          nodes: updatedNodes,
          metadata: { ...graph.metadata, updated_at: new Date().toISOString() },
        });
      }, 300);
    },
    [activeDesign?.graph, nodeId, updateGraph],
  );

  const handleArrayChange = useCallback(
    (field: keyof AgentNodeConfig, value: string) => {
      const arr = value.split('\n').map((s) => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
      handleChange(field, arr);
    },
    [handleChange],
  );

  return (
    <div className="space-y-2">
      {/* Role (top-level, always visible) */}
      <div className="rounded bg-studio-bg/30 p-2 border border-studio-border">
        <label className={labelClass}>Role</label>
        <input
          type="text"
          defaultValue={config.role || ''}
          onChange={(e) => handleChange('role', e.target.value)}
          placeholder="e.g., AI Software Engineer, Deep Researcher"
          className={inputClass}
          key={`${nodeId}-role`}
        />
      </div>

      {/* AGENTS.md — Operating Instructions */}
      <Section title="AGENTS.md" tag="operating instructions" defaultOpen={true}>
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            defaultValue={config.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Neo, Pulse, Pixel"
            className={inputClass}
            key={`${nodeId}-name`}
          />
        </div>
        <div>
          <label className={labelClass}>Goal / Mission</label>
          <textarea
            defaultValue={config.goal || ''}
            onChange={(e) => handleChange('goal', e.target.value)}
            placeholder="e.g., Help with all software engineering tasks. Always test code before reporting results."
            rows={2}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-goal`}
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            defaultValue={config.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Short description of the agent"
            rows={2}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-description`}
          />
        </div>
        <div>
          <label className={labelClass}>Capabilities (one per line)</label>
          <textarea
            defaultValue={(config.responsibilities || []).join('\n')}
            onChange={(e) => handleArrayChange('responsibilities', e.target.value)}
            placeholder={"Write, debug, and execute Python, JavaScript, TypeScript\nInstall packages and run code\nCreate visualizations (matplotlib, Manim, Plotly)"}
            rows={4}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-responsibilities`}
          />
        </div>
        <div>
          <label className={labelClass}>Rules (one per line)</label>
          <textarea
            defaultValue={(config.rules || []).join('\n')}
            onChange={(e) => handleArrayChange('rules', e.target.value)}
            placeholder={"Always run code and verify it works before claiming success\nIf something fails, debug silently and retry\nSend rendered outputs directly in the chat"}
            rows={3}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-rules`}
          />
        </div>
      </Section>

      {/* SOUL.md — Personality */}
      <Section title="SOUL.md" tag="personality" defaultOpen={false}>
        <p className="text-[10px] text-studio-text-muted italic mb-2">
          SOUL.md is an informal, lowercase personality prompt. Describe how this agent communicates, its tone, and behavioral traits.
        </p>
        <div>
          <label className={labelClass}>Personality</label>
          <textarea
            defaultValue={config.personality || ''}
            onChange={(e) => handleChange('personality', e.target.value)}
            placeholder="e.g., you are precise, methodical, and concise. you don't over-explain. you write clean, well-commented code."
            rows={3}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-personality`}
          />
        </div>
        <div>
          <label className={labelClass}>Communication Style</label>
          <input
            type="text"
            defaultValue={config.communication_style || ''}
            onChange={(e) => handleChange('communication_style', e.target.value)}
            placeholder="e.g., direct and efficient, reports only final results"
            className={inputClass}
            key={`${nodeId}-communication_style`}
          />
        </div>
        <div>
          <label className={labelClass}>Do (one per line)</label>
          <textarea
            defaultValue={(config.do_rules || []).join('\n')}
            onChange={(e) => handleArrayChange('do_rules', e.target.value)}
            placeholder={"base decisions on data and analytics\nalign content with business objectives"}
            rows={3}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-do_rules`}
          />
        </div>
        <div>
          <label className={labelClass}>Don&apos;t (one per line)</label>
          <textarea
            defaultValue={(config.dont_rules || []).join('\n')}
            onChange={(e) => handleArrayChange('dont_rules', e.target.value)}
            placeholder={"make assumptions without asking\noverwhelm with too many tasks at once"}
            rows={3}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-dont_rules`}
          />
        </div>
      </Section>

      {/* Model */}
      <Section title="Model" tag="openclaw.json" defaultOpen={true}>
        <div>
          <label className={labelClass}>Primary Model</label>
          <select
            defaultValue={config.model || 'claude-sonnet-4-20250514'}
            onChange={(e) => handleChange('model', e.target.value)}
            className={inputClass}
            key={`${nodeId}-model`}
          >
            <option value="minimax-m2.1">MiniMax M2.1 (recommended)</option>
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-opus-4-20250514">Claude Opus 4</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Fallback Model</label>
          <select
            defaultValue={config.model_fallback || ''}
            onChange={(e) => handleChange('model_fallback', e.target.value)}
            className={inputClass}
            key={`${nodeId}-model_fallback`}
          >
            <option value="">None</option>
            <option value="minimax-m2.1">MiniMax M2.1</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          </select>
        </div>
      </Section>

      {/* Tools & Skills */}
      <Section title="Tools & Skills" tag="TOOLS.md" defaultOpen={true}>
        <div>
          <label className={labelClass}>Tools (one per line)</label>
          <textarea
            defaultValue={(config.tools || []).join('\n')}
            onChange={(e) => handleArrayChange('tools', e.target.value)}
            placeholder={"Browser\nFileSystem\nShell\nGitHub API"}
            rows={3}
            className={`${inputClass} resize-none font-mono`}
            key={`${nodeId}-tools`}
          />
        </div>
        <div>
          <label className={labelClass}>Skills (one per line)</label>
          <textarea
            defaultValue={(config.skills || []).join('\n')}
            onChange={(e) => handleArrayChange('skills', e.target.value)}
            placeholder={"firecrawl-cli\ngithub-cli\nimagegen"}
            rows={3}
            className={`${inputClass} resize-none font-mono`}
            key={`${nodeId}-skills`}
          />
        </div>
      </Section>

      {/* Channel Binding */}
      <Section title="Channel Binding" tag="openclaw.json" defaultOpen={true}>
        <p className="text-[10px] text-studio-text-muted mb-2">
          Route messages from a specific channel to this agent. Each agent is independent — no connections needed.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={config.is_default ?? false}
            onChange={(e) => handleChange('is_default', e.target.checked)}
            className="rounded border-studio-border"
            id={`${nodeId}-is_default`}
          />
          <label htmlFor={`${nodeId}-is_default`} className="text-xs text-studio-text-muted">
            Default agent (fallback when no binding matches)
          </label>
        </div>
        <div>
          <label className={labelClass}>Channel</label>
          <select
            defaultValue={config.channel_binding?.channel || ''}
            onChange={(e) => handleChange('channel_binding', {
              ...config.channel_binding,
              channel: e.target.value,
            })}
            className={inputClass}
            key={`${nodeId}-channel`}
          >
            <option value="">Not assigned</option>
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="discord">Discord</option>
            <option value="slack">Slack</option>
            <option value="websocket">WebSocket API</option>
          </select>
        </div>
        {config.channel_binding?.channel && (
          <div>
            <label className={labelClass}>Account ID</label>
            <input
              type="text"
              defaultValue={config.channel_binding?.accountId || ''}
              onChange={(e) => handleChange('channel_binding', {
                ...config.channel_binding,
                accountId: e.target.value,
              })}
              placeholder="e.g., default, neo_bot, alerts"
              className={inputClass}
              key={`${nodeId}-accountId`}
            />
            <p className="text-[9px] text-studio-text-muted/60 mt-0.5">
              Maps to a specific bot token / phone number in that channel
            </p>
          </div>
        )}
      </Section>

      {/* Handoffs — Agent Coordination */}
      <Section title="Handoffs" tag="coordination" defaultOpen={false}>
        <div>
          <label className={labelClass}>Handoff Rules (one per line)</label>
          <textarea
            defaultValue={(config.handoffs || []).join('\n')}
            onChange={(e) => handleArrayChange('handoffs', e.target.value)}
            placeholder={"When you need keyword data, ask @SEOAnalyst\nWhen draft is complete, hand off to @Editor\nFor analysis tasks, delegate to @Radar"}
            rows={4}
            className={`${inputClass} resize-none`}
            key={`${nodeId}-handoffs`}
          />
        </div>
      </Section>

      {/* LLM Settings */}
      <Section title="LLM Settings" tag="openclaw.json" defaultOpen={false}>
        <div>
          <label className={labelClass}>Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            defaultValue={config.temperature ?? 0.7}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className={inputClass}
            key={`${nodeId}-temperature`}
          />
        </div>
        <div>
          <label className={labelClass}>Max Tokens</label>
          <input
            type="number"
            step="256"
            min="256"
            defaultValue={config.max_tokens ?? 4096}
            onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
            className={inputClass}
            key={`${nodeId}-max_tokens`}
          />
        </div>
        <div>
          <label className={labelClass}>Timeout (seconds)</label>
          <input
            type="number"
            min="30"
            step="30"
            defaultValue={config.timeout_seconds ?? 300}
            onChange={(e) => handleChange('timeout_seconds', parseInt(e.target.value))}
            className={inputClass}
            key={`${nodeId}-timeout_seconds`}
          />
        </div>
      </Section>

      {/* Example Interactions */}
      <Section title="Example Interactions" tag="AGENTS.md" defaultOpen={false}>
        <div>
          <label className={labelClass}>Example conversations (markdown)</label>
          <textarea
            defaultValue={config.example_interactions || ''}
            onChange={(e) => handleChange('example_interactions', e.target.value)}
            placeholder={"**User:** I need to create a Manim animation of gradient descent\n**Neo:** Installing Manim... writing script... rendering video... Here's the result."}
            rows={6}
            className={`${inputClass} resize-none font-mono`}
            key={`${nodeId}-example_interactions`}
          />
        </div>
      </Section>

      {/* Agent Settings (Studio-specific) */}
      <Section title="Studio Settings" tag="studio" defaultOpen={false}>
        <div>
          <label className={labelClass}>Manager Agent Ref</label>
          <input
            type="text"
            defaultValue={config.manager_agent_ref || ''}
            onChange={(e) => handleChange('manager_agent_ref', e.target.value)}
            placeholder="Parent agent (for sub-agents)"
            className={inputClass}
            key={`${nodeId}-manager_agent_ref`}
          />
        </div>
        <div>
          <label className={labelClass}>Reuse Mode</label>
          <select
            defaultValue={config.reuse_mode || 'new'}
            onChange={(e) => handleChange('reuse_mode', e.target.value)}
            className={inputClass}
            key={`${nodeId}-reuse_mode`}
          >
            <option value="new">New</option>
            <option value="existing">Existing</option>
            <option value="template">Template</option>
          </select>
        </div>
      </Section>

      {/* File Previews */}
      <Section title="SOUL.md Preview" tag="preview" defaultOpen={false}>
        <p className="text-[10px] text-studio-text-muted italic mb-1">Informal lowercase personality prompt — no headers</p>
        <div className="rounded bg-studio-bg p-2 border border-studio-border max-h-40 overflow-y-auto">
          <pre className="text-[10px] text-indigo-400/80 font-mono whitespace-pre-wrap">
{buildSoulMdPreview(config)}
          </pre>
        </div>
      </Section>

      <Section title="AGENTS.md Preview" tag="preview" defaultOpen={false}>
        <p className="text-[10px] text-studio-text-muted italic mb-1">Structured operating instructions with markdown headers</p>
        <div className="rounded bg-studio-bg p-2 border border-studio-border max-h-64 overflow-y-auto">
          <pre className="text-[10px] text-green-400/80 font-mono whitespace-pre-wrap">
{buildAgentsMdPreview(config)}
          </pre>
        </div>
      </Section>

      <p className="text-[10px] text-studio-text-muted pt-1">Node ID: {nodeId}</p>
    </div>
  );
}
