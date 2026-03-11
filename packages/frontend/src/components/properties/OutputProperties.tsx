'use client';

import { useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { OutputNodeConfig } from '@openclaw-studio/shared';

interface OutputPropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

export function OutputProperties({ nodeId }: OutputPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as OutputNodeConfig;

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
              config: { ...n.config, [field]: value } as OutputNodeConfig,
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
        <label className={labelClass}>Output Type</label>
        <select
          defaultValue={config.output_type || 'file'}
          onChange={(e) => handleChange('output_type', e.target.value)}
          className={inputClass}
          key={`${nodeId}-output_type`}
        >
          <option value="file">File</option>
          <option value="api">API Response</option>
          <option value="email">Email</option>
          <option value="webhook">Webhook</option>
          <option value="database">Database</option>
          <option value="notification">Notification</option>
          <option value="log">Log</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Destination</label>
        <input
          type="text"
          defaultValue={config.destination || ''}
          onChange={(e) => handleChange('destination', e.target.value)}
          placeholder="e.g., /reports/daily.md, slack:#alerts"
          className={inputClass}
          key={`${nodeId}-destination`}
        />
      </div>
      <div>
        <label className={labelClass}>Summary</label>
        <textarea
          defaultValue={config.summary || ''}
          onChange={(e) => handleChange('summary', e.target.value)}
          placeholder="What does this output contain?"
          rows={3}
          className={`${inputClass} resize-none`}
          key={`${nodeId}-summary`}
        />
      </div>
      <p className="text-[10px] text-studio-text-muted">Node ID: {nodeId}</p>
    </div>
  );
}
