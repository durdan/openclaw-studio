'use client';

import { useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { ConditionNodeConfig } from '@openclaw-studio/shared';

interface ConditionPropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

export function ConditionProperties({ nodeId }: ConditionPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as ConditionNodeConfig;

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      if (!activeDesign?.graph) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const graph = activeDesign.graph!;
        const updatedNodes = graph.nodes.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              config: { ...n.config, [field]: value } as ConditionNodeConfig,
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

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Expression Summary</label>
        <textarea
          defaultValue={config.expression_summary || ''}
          onChange={(e) => handleChange('expression_summary', e.target.value)}
          placeholder="Describe the branching condition..."
          rows={3}
          className={`${inputClass} resize-none`}
          key={`${nodeId}-expression_summary`}
        />
      </div>
      <div>
        <label className={labelClass}>Branch Metadata (JSON)</label>
        <textarea
          defaultValue={config.branch_metadata ? JSON.stringify(config.branch_metadata, null, 2) : ''}
          onChange={(e) => handleJsonChange('branch_metadata', e.target.value)}
          placeholder='{"true_branch": "proceed", "false_branch": "escalate"}'
          rows={4}
          className={`${inputClass} resize-none font-mono`}
          key={`${nodeId}-branch_metadata`}
        />
      </div>
      <p className="text-[10px] text-studio-text-muted">Node ID: {nodeId}</p>
    </div>
  );
}
