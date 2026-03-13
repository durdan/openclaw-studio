'use client';

import { useState, useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import { SkillBrowser } from './SkillBrowser';
import type { SkillNodeConfig } from '@openclaw-studio/shared';

interface SkillPropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

function SectionHeader({ title, tag, open, onToggle }: { title: string; tag: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded bg-studio-bg/50 px-2 py-1.5 text-left hover:bg-studio-bg transition-colors"
    >
      <span className="text-xs font-semibold text-studio-text">{title}</span>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-emerald-400/70">{tag}</span>
        <span className="text-[10px] text-studio-text-muted">{open ? '▾' : '▸'}</span>
      </div>
    </button>
  );
}

export function SkillProperties({ nodeId }: SkillPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showBrowser, setShowBrowser] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    frontmatter: true,
    prompt: true,
    schemas: false,
    reuse: false,
  });

  const toggle = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as SkillNodeConfig;

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      if (!activeDesign?.graph) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const graph = activeDesign.graph!;
        const updatedNodes = graph.nodes.map((n) => {
          if (n.id === nodeId) {
            const updatedConfig = { ...n.config, [field]: value };
            return {
              ...n,
              config: updatedConfig as SkillNodeConfig,
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

  const handleJsonChange = useCallback(
    (field: string, value: string) => {
      try {
        const parsed = value.trim() ? JSON.parse(value) : undefined;
        handleChange(field, parsed);
      } catch {
        // Don't update on invalid JSON
      }
    },
    [handleChange],
  );

  const handleSkillSelect = useCallback(
    (skill: { name: string; slug?: string; description?: string; summary?: string; tags?: string[] }) => {
      if (!activeDesign?.graph) return;
      const graph = activeDesign.graph;
      const updatedNodes = graph.nodes.map((n) => {
        if (n.id === nodeId) {
          const newConfig: SkillNodeConfig = {
            ...(n.config as SkillNodeConfig),
            name: skill.slug || skill.name,
            purpose: skill.description || skill.summary || (n.config as SkillNodeConfig).purpose || '',
            tags: skill.tags || (n.config as SkillNodeConfig).tags,
            reuse_mode: 'new',
            // Mark as a ClawHub skill so publish knows to install it
            existing_asset_ref: `clawhub:${skill.slug || skill.name}`,
          };
          return { ...n, config: newConfig, label: skill.slug || skill.name };
        }
        return n;
      });
      updateGraph({
        ...graph,
        nodes: updatedNodes,
        metadata: { ...graph.metadata, updated_at: new Date().toISOString() },
      });
      setShowBrowser(false);
    },
    [activeDesign?.graph, nodeId, updateGraph],
  );

  const isClawHubSkill = config.existing_asset_ref?.startsWith('clawhub:');

  return (
    <div className="space-y-2">
      {/* ClawHub Search Button */}
      <button
        onClick={() => setShowBrowser(!showBrowser)}
        className="flex items-center gap-2 w-full rounded-lg border border-studio-accent/30 bg-studio-accent/5 px-3 py-2 text-left hover:bg-studio-accent/10 transition-colors"
      >
        <svg className="w-4 h-4 text-studio-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-studio-accent">Browse ClawHub</span>
          <p className="text-[9px] text-studio-text-muted">Search 45,000+ community skills</p>
        </div>
        {isClawHubSkill && (
          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5 flex-shrink-0">
            ClawHub
          </span>
        )}
      </button>

      {/* Skill Browser */}
      {showBrowser && (
        <SkillBrowser
          onSelect={handleSkillSelect}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {/* ClawHub badge if skill was selected from registry */}
      {isClawHubSkill && (
        <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
          <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] text-emerald-400">
            Will be installed from ClawHub on publish via <code className="font-mono">skills.install</code>
          </span>
        </div>
      )}

      {/* SKILL.md Frontmatter */}
      <SectionHeader title="Frontmatter" tag="SKILL.md" open={openSections.frontmatter} onToggle={() => toggle('frontmatter')} />
      {openSections.frontmatter && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              defaultValue={config.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Skill name (used in frontmatter)"
              className={inputClass}
              key={`${nodeId}-name`}
            />
          </div>
          <div>
            <label className={labelClass}>Purpose / Description</label>
            <textarea
              defaultValue={config.purpose || ''}
              onChange={(e) => handleChange('purpose', e.target.value)}
              placeholder="What this skill does (frontmatter description)"
              rows={2}
              className={`${inputClass} resize-none`}
              key={`${nodeId}-purpose`}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${nodeId}-user_invocable`}
              defaultChecked={config.user_invocable !== false}
              onChange={(e) => handleChange('user_invocable', e.target.checked)}
              className="rounded border-studio-border"
              key={`${nodeId}-user_invocable`}
            />
            <label htmlFor={`${nodeId}-user_invocable`} className="text-xs font-medium text-studio-text-muted">
              User Invocable
            </label>
          </div>
          <div>
            <label className={labelClass}>Tags (comma-separated)</label>
            <input
              type="text"
              defaultValue={(config.tags || []).join(', ')}
              onChange={(e) =>
                handleChange('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
              }
              placeholder="email, triage, support"
              className={inputClass}
              key={`${nodeId}-tags`}
            />
          </div>
          {/* Frontmatter Preview */}
          <div className="rounded bg-studio-bg p-2 border border-studio-border">
            <p className="text-[9px] text-studio-text-muted mb-1 font-semibold">YAML Preview</p>
            <pre className="text-[10px] text-emerald-400/80 font-mono whitespace-pre-wrap">
{`---
name: ${config.name || 'untitled'}
description: ${config.purpose || '...'}
user-invocable: ${config.user_invocable !== false}
${config.tags?.length ? `tags: [${config.tags.join(', ')}]` : ''}---`}
            </pre>
          </div>
        </div>
      )}

      {/* Prompt Content */}
      <SectionHeader title="Prompt Content" tag="body" open={openSections.prompt} onToggle={() => toggle('prompt')} />
      {openSections.prompt && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Prompt Summary</label>
            <textarea
              defaultValue={config.prompt_summary || ''}
              onChange={(e) => handleChange('prompt_summary', e.target.value)}
              placeholder="The main prompt/instructions for this skill..."
              rows={5}
              className={`${inputClass} resize-none`}
              key={`${nodeId}-prompt_summary`}
            />
          </div>
        </div>
      )}

      {/* Input/Output Schemas */}
      <SectionHeader title="Schemas" tag="I/O" open={openSections.schemas} onToggle={() => toggle('schemas')} />
      {openSections.schemas && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Input Schema (JSON)</label>
            <textarea
              defaultValue={config.input_schema ? JSON.stringify(config.input_schema, null, 2) : ''}
              onChange={(e) => handleJsonChange('input_schema', e.target.value)}
              placeholder='{"type": "object", "properties": {}}'
              rows={4}
              className={`${inputClass} resize-none font-mono`}
              key={`${nodeId}-input_schema`}
            />
          </div>
          <div>
            <label className={labelClass}>Output Schema (JSON)</label>
            <textarea
              defaultValue={config.output_schema ? JSON.stringify(config.output_schema, null, 2) : ''}
              onChange={(e) => handleJsonChange('output_schema', e.target.value)}
              placeholder='{"type": "object", "properties": {}}'
              rows={4}
              className={`${inputClass} resize-none font-mono`}
              key={`${nodeId}-output_schema`}
            />
          </div>
        </div>
      )}

      {/* Reuse */}
      <SectionHeader title="Reuse" tag="config" open={openSections.reuse} onToggle={() => toggle('reuse')} />
      {openSections.reuse && (
        <div className="space-y-3 pl-1 pb-2">
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
          {config.reuse_mode === 'existing' && (
            <div>
              <label className={labelClass}>Existing Asset Ref</label>
              <input
                type="text"
                defaultValue={config.existing_asset_ref || ''}
                onChange={(e) => handleChange('existing_asset_ref', e.target.value)}
                placeholder="Asset reference ID"
                className={inputClass}
                key={`${nodeId}-existing_asset_ref`}
              />
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-studio-text-muted pt-1">Node ID: {nodeId}</p>
    </div>
  );
}
