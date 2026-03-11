'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ValidationState } from '@openclaw-studio/shared';

const validationDot: Record<string, string> = {
  [ValidationState.Valid]: 'bg-green-500',
  [ValidationState.Warning]: 'bg-yellow-500',
  [ValidationState.Incomplete]: 'bg-gray-500',
  [ValidationState.Invalid]: 'bg-red-500',
};

function TemplateRefNodeComponent({ data, selected }: NodeProps) {
  const config = (data?.config || {}) as Record<string, unknown>;
  const proposedNew = data?.proposed_new as boolean;
  const vState = (data?.validation_state || 'incomplete') as string;

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 border-dashed px-3 py-2 shadow-lg ${
        selected ? 'border-slate-300 ring-2 ring-slate-300/30' : 'border-slate-400'
      }`}
      style={{ backgroundColor: '#1e1f2e' }}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400 !border-studio-bg" />

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Template Ref</span>
        <div className="flex items-center gap-1">
          {proposedNew && (
            <span className="text-[9px] font-semibold bg-slate-500/30 text-slate-300 px-1.5 py-0.5 rounded">NEW</span>
          )}
          <span className={`w-2 h-2 rounded-full ${validationDot[vState] || 'bg-gray-500'}`} />
        </div>
      </div>

      <div className="text-sm font-semibold text-studio-text truncate">
        {(config.name as string) || (data?.label as string) || 'Template Reference'}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400 !border-studio-bg" />
    </div>
  );
}

export const TemplateRefNode = memo(TemplateRefNodeComponent);
