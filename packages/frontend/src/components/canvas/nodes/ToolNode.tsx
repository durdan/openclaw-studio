'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ToolNodeConfig } from '@openclaw-studio/shared';
import { ValidationState } from '@openclaw-studio/shared';

const validationDot: Record<string, string> = {
  [ValidationState.Valid]: 'bg-green-500',
  [ValidationState.Warning]: 'bg-yellow-500',
  [ValidationState.Incomplete]: 'bg-gray-500',
  [ValidationState.Invalid]: 'bg-red-500',
};

function ToolNodeComponent({ data, selected }: NodeProps) {
  const config = (data?.config || {}) as ToolNodeConfig;
  const proposedNew = data?.proposed_new as boolean;
  const reusedRef = data?.reused_asset_ref as string | undefined;
  const vState = (data?.validation_state || 'incomplete') as string;

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 px-3 py-2 shadow-lg ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-amber-500'
      }`}
      style={{ backgroundColor: '#1e1f2e' }}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-amber-400 !border-studio-bg" />

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Tool</span>
        <div className="flex items-center gap-1">
          {proposedNew && (
            <span className="text-[9px] font-semibold bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">NEW</span>
          )}
          {reusedRef && (
            <span className="text-[9px] font-semibold bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded">REUSE</span>
          )}
          <span className={`w-2 h-2 rounded-full ${validationDot[vState] || 'bg-gray-500'}`} />
        </div>
      </div>

      <div className="text-sm font-semibold text-studio-text truncate">
        {config.binding_name || config.tool_type || 'Unnamed Tool'}
      </div>
      {config.tool_type && (
        <div className="text-xs text-studio-text-muted truncate mt-0.5">{config.tool_type}</div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-400 !border-studio-bg" />
    </div>
  );
}

export const ToolNode = memo(ToolNodeComponent);
