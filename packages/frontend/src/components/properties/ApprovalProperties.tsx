'use client';

import { useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { ApprovalNodeConfig } from '@openclaw-studio/shared';

interface ApprovalPropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

export function ApprovalProperties({ nodeId }: ApprovalPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as ApprovalNodeConfig;

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
              config: { ...n.config, [field]: value } as ApprovalNodeConfig,
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
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${nodeId}-required`}
          defaultChecked={config.required !== false}
          onChange={(e) => handleChange('required', e.target.checked)}
          className="rounded border-studio-border"
          key={`${nodeId}-required`}
        />
        <label htmlFor={`${nodeId}-required`} className="text-xs font-medium text-studio-text-muted">
          Required
        </label>
      </div>
      <div>
        <label className={labelClass}>Reviewer Type</label>
        <input
          type="text"
          defaultValue={config.reviewer_type || ''}
          onChange={(e) => handleChange('reviewer_type', e.target.value)}
          placeholder="e.g., human, automated, manager"
          className={inputClass}
          key={`${nodeId}-reviewer_type`}
        />
      </div>
      <div>
        <label className={labelClass}>Rationale</label>
        <textarea
          defaultValue={config.rationale || ''}
          onChange={(e) => handleChange('rationale', e.target.value)}
          placeholder="Why approval is needed"
          rows={3}
          className={`${inputClass} resize-none`}
          key={`${nodeId}-rationale`}
        />
      </div>
      <p className="text-[10px] text-studio-text-muted">Node ID: {nodeId}</p>
    </div>
  );
}
