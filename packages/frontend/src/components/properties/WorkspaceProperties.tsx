'use client';

import { useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { WorkspaceNodeConfig } from '@openclaw-studio/shared';

interface WorkspacePropertiesProps {
  nodeId: string;
}

const inputClass = 'w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none';
const labelClass = 'block text-xs font-medium text-studio-text-muted mb-1';

export function WorkspaceProperties({ nodeId }: WorkspacePropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as WorkspaceNodeConfig;

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
              config: { ...n.config, [field]: value } as WorkspaceNodeConfig,
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
        <label className={labelClass}>Template Ref</label>
        <input
          type="text"
          defaultValue={config.workspace_template_ref || ''}
          onChange={(e) => handleChange('workspace_template_ref', e.target.value)}
          placeholder="Workspace template reference"
          className={inputClass}
          key={`${nodeId}-workspace_template_ref`}
        />
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          defaultValue={config.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Workspace notes"
          rows={3}
          className={`${inputClass} resize-none`}
          key={`${nodeId}-notes`}
        />
      </div>
      <div>
        <label className={labelClass}>Metadata Summary</label>
        <textarea
          defaultValue={config.metadata_summary || ''}
          onChange={(e) => handleChange('metadata_summary', e.target.value)}
          placeholder="Summary of workspace metadata"
          rows={2}
          className={`${inputClass} resize-none`}
          key={`${nodeId}-metadata_summary`}
        />
      </div>
      <p className="text-[10px] text-studio-text-muted">Node ID: {nodeId}</p>
    </div>
  );
}
