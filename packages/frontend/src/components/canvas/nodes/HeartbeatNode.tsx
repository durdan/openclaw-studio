'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { HeartbeatNodeConfig } from '@openclaw-studio/shared';
import { ValidationState } from '@openclaw-studio/shared';

const validationDot: Record<string, string> = {
  [ValidationState.Valid]: 'bg-green-500',
  [ValidationState.Warning]: 'bg-yellow-500',
  [ValidationState.Incomplete]: 'bg-gray-500',
  [ValidationState.Invalid]: 'bg-red-500',
};

function HeartbeatNodeComponent({ data, selected }: NodeProps) {
  const config = (data?.config || {}) as HeartbeatNodeConfig;
  const proposedNew = data?.proposed_new as boolean;
  const vState = (data?.validation_state || 'incomplete') as string;

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 px-3 py-2 shadow-lg ${
        selected ? 'border-pink-400 ring-2 ring-pink-400/30' : 'border-pink-500'
      }`}
      style={{ backgroundColor: '#1e1f2e' }}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-pink-400 !border-studio-bg" />

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Heartbeat</span>
        <div className="flex items-center gap-1">
          {proposedNew && (
            <span className="text-[9px] font-semibold bg-pink-500/30 text-pink-300 px-1.5 py-0.5 rounded">NEW</span>
          )}
          <span className={`w-2 h-2 rounded-full ${validationDot[vState] || 'bg-gray-500'}`} />
        </div>
      </div>

      <div className="text-sm font-semibold text-studio-text truncate">
        {config.mode || 'Heartbeat'}
      </div>
      {config.schedule && (
        <div className="text-xs text-studio-text-muted truncate mt-0.5">{config.schedule}</div>
      )}
      {config.purpose && (
        <div className="text-[10px] text-studio-text-muted/70 truncate mt-0.5">{config.purpose}</div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-pink-400 !border-studio-bg" />
    </div>
  );
}

export const HeartbeatNode = memo(HeartbeatNodeComponent);
