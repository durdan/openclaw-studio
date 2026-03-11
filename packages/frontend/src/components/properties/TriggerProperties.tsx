'use client';

import { useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { TriggerNodeConfig } from '@openclaw-studio/shared';

interface TriggerPropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

export function TriggerProperties({ nodeId }: TriggerPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as TriggerNodeConfig;

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
              config: { ...n.config, [field]: value } as TriggerNodeConfig,
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
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Trigger Type</label>
        <select
          defaultValue={config.trigger_type || 'event'}
          onChange={(e) => handleChange('trigger_type', e.target.value)}
          className={inputClass}
          key={`${nodeId}-trigger_type`}
        >
          <option value="event">Event</option>
          <option value="schedule">Schedule</option>
          <option value="manual">Manual</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Source</label>
        <input
          type="text"
          defaultValue={config.source || ''}
          onChange={(e) => handleChange('source', e.target.value)}
          placeholder="e.g., webhook, email inbox, API"
          className={inputClass}
          key={`${nodeId}-source`}
        />
      </div>
      {config.trigger_type === 'schedule' && (
        <div>
          <label className={labelClass}>Schedule (cron)</label>
          <input
            type="text"
            defaultValue={config.schedule || ''}
            onChange={(e) => handleChange('schedule', e.target.value)}
            placeholder="e.g., 0 */6 * * *, every 5m"
            className={inputClass}
            key={`${nodeId}-schedule`}
          />
        </div>
      )}
      <div>
        <label className={labelClass}>Conditions</label>
        <textarea
          defaultValue={config.conditions || ''}
          onChange={(e) => handleChange('conditions', e.target.value)}
          placeholder="When should this trigger fire?"
          rows={3}
          className={`${inputClass} resize-none`}
          key={`${nodeId}-conditions`}
        />
      </div>
      <p className="text-[10px] text-studio-text-muted">Node ID: {nodeId}</p>
    </div>
  );
}
