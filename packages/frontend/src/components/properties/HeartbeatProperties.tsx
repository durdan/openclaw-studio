'use client';

import { useState, useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { HeartbeatNodeConfig } from '@openclaw-studio/shared';

interface HeartbeatPropertiesProps {
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
        <span className="text-[9px] font-mono text-pink-400/70">{tag}</span>
        <span className="text-[10px] text-studio-text-muted">{open ? '▾' : '▸'}</span>
      </div>
    </button>
  );
}

export function HeartbeatProperties({ nodeId }: HeartbeatPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    schedule: true,
    checklist: true,
  });

  const toggle = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as HeartbeatNodeConfig;

  const handleChange = useCallback(
    (field: string, value: string) => {
      if (!activeDesign?.graph) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const graph = activeDesign.graph!;
        const updatedNodes = graph.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              config: { ...n.config, [field]: value } as HeartbeatNodeConfig,
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

  return (
    <div className="space-y-2">
      {/* Schedule Section */}
      <SectionHeader title="Schedule" tag="HEARTBEAT.md" open={openSections.schedule} onToggle={() => toggle('schedule')} />
      {openSections.schedule && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Mode</label>
            <select
              defaultValue={config.mode || 'interval'}
              onChange={(e) => handleChange('mode', e.target.value)}
              className={inputClass}
              key={`${nodeId}-mode`}
            >
              <option value="interval">Interval</option>
              <option value="cron">Cron</option>
              <option value="event">Event-driven</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Schedule</label>
            <input
              type="text"
              defaultValue={config.schedule || ''}
              onChange={(e) => handleChange('schedule', e.target.value)}
              placeholder={config.mode === 'cron' ? '0 */6 * * *' : 'every 5m'}
              className={inputClass}
              key={`${nodeId}-schedule`}
            />
          </div>
          <div>
            <label className={labelClass}>Purpose</label>
            <textarea
              defaultValue={config.purpose || ''}
              onChange={(e) => handleChange('purpose', e.target.value)}
              placeholder="Why does this heartbeat exist? What does it check?"
              rows={3}
              className={`${inputClass} resize-none`}
              key={`${nodeId}-purpose`}
            />
          </div>
        </div>
      )}

      {/* Checklist & Escalation */}
      <SectionHeader title="Checklist & Escalation" tag="escalation" open={openSections.checklist} onToggle={() => toggle('checklist')} />
      {openSections.checklist && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Escalation Summary</label>
            <textarea
              defaultValue={config.escalation_summary || ''}
              onChange={(e) => handleChange('escalation_summary', e.target.value)}
              placeholder="What happens when the heartbeat detects a failure?"
              rows={3}
              className={`${inputClass} resize-none`}
              key={`${nodeId}-escalation_summary`}
            />
          </div>
          {/* HEARTBEAT.md Preview */}
          <div className="rounded bg-studio-bg p-2 border border-studio-border">
            <p className="text-[9px] text-studio-text-muted mb-1 font-semibold">HEARTBEAT.md Preview</p>
            <pre className="text-[10px] text-pink-400/80 font-mono whitespace-pre-wrap">
{`# Heartbeat Configuration

## Schedule
- **Mode:** ${config.mode || 'interval'}
- **Schedule:** ${config.schedule || '...'}

## Purpose
${config.purpose || '...'}

## Checklist
- [ ] Verify agent is responsive
- [ ] Check task queue status
- [ ] Validate output quality
${config.escalation_summary ? `\n## Escalation\n${config.escalation_summary}` : ''}`}
            </pre>
          </div>
        </div>
      )}

      <p className="text-[10px] text-studio-text-muted pt-1">Node ID: {nodeId}</p>
    </div>
  );
}
