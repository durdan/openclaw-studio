'use client';

import { useState, useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/design.store';
import type { ToolNodeConfig } from '@openclaw-studio/shared';

interface ToolPropertiesProps {
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
        <span className="text-[9px] font-mono text-amber-400/70">{tag}</span>
        <span className="text-[10px] text-studio-text-muted">{open ? '▾' : '▸'}</span>
      </div>
    </button>
  );
}

export function ToolProperties({ nodeId }: ToolPropertiesProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    binding: true,
    auth: false,
    reuse: false,
  });

  const toggle = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const node = activeDesign?.graph?.nodes.find((n) => n.id === nodeId);
  const config = (node?.config || {}) as ToolNodeConfig;

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
              config: updatedConfig as ToolNodeConfig,
              label: field === 'binding_name' ? (value as string) || n.label : n.label,
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
    <div className="space-y-2">
      {/* Tool Binding */}
      <SectionHeader title="Tool Binding" tag="TOOLS.md" open={openSections.binding} onToggle={() => toggle('binding')} />
      {openSections.binding && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Tool Type</label>
            <select
              defaultValue={config.tool_type || 'custom'}
              onChange={(e) => handleChange('tool_type', e.target.value)}
              className={inputClass}
              key={`${nodeId}-tool_type`}
            >
              <option value="custom">Custom</option>
              <option value="web_search">Web Search</option>
              <option value="file_read">File Read</option>
              <option value="file_write">File Write</option>
              <option value="http_request">HTTP Request</option>
              <option value="email_client">Email Client</option>
              <option value="database">Database</option>
              <option value="shell">Shell Command</option>
              <option value="api_call">API Call</option>
              <option value="slack">Slack</option>
              <option value="github">GitHub</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Binding Name</label>
            <input
              type="text"
              defaultValue={config.binding_name || ''}
              onChange={(e) => handleChange('binding_name', e.target.value)}
              placeholder="Tool binding name"
              className={inputClass}
              key={`${nodeId}-binding_name`}
            />
          </div>
          <div>
            <label className={labelClass}>Allowed Actions (comma-separated)</label>
            <input
              type="text"
              defaultValue={(config.allowed_actions || []).join(', ')}
              onChange={(e) =>
                handleChange(
                  'allowed_actions',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                )
              }
              placeholder="read, write, delete"
              className={inputClass}
              key={`${nodeId}-allowed_actions`}
            />
          </div>
          {/* TOOLS.md Preview */}
          <div className="rounded bg-studio-bg p-2 border border-studio-border">
            <p className="text-[9px] text-studio-text-muted mb-1 font-semibold">TOOLS.md Preview</p>
            <pre className="text-[10px] text-amber-400/80 font-mono whitespace-pre-wrap">
{`### ${config.binding_name || 'untitled'}
- Type: ${config.tool_type || 'custom'}
- Binding: ${config.binding_name || '...'}
- Actions: ${(config.allowed_actions || []).join(', ') || 'none'}
- Status: Active`}
            </pre>
          </div>
        </div>
      )}

      {/* Auth Config */}
      <SectionHeader title="Authentication" tag="auth" open={openSections.auth} onToggle={() => toggle('auth')} />
      {openSections.auth && (
        <div className="space-y-3 pl-1 pb-2">
          <div>
            <label className={labelClass}>Auth Mode Metadata (JSON)</label>
            <textarea
              defaultValue={config.auth_mode_metadata ? JSON.stringify(config.auth_mode_metadata, null, 2) : ''}
              onChange={(e) => handleJsonChange('auth_mode_metadata', e.target.value)}
              placeholder='{"auth_type": "api_key", "env_var": "MY_API_KEY"}'
              rows={4}
              className={`${inputClass} resize-none font-mono`}
              key={`${nodeId}-auth_mode_metadata`}
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
