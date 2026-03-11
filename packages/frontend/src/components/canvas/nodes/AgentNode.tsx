'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeConfig } from '@openclaw-studio/shared';
import { ValidationState } from '@openclaw-studio/shared';

const validationColors: Record<string, { dot: string; ring: string }> = {
  [ValidationState.Valid]: { dot: 'bg-green-500', ring: 'ring-green-400/20' },
  [ValidationState.Warning]: { dot: 'bg-yellow-500', ring: 'ring-yellow-400/20' },
  [ValidationState.Incomplete]: { dot: 'bg-gray-500', ring: 'ring-gray-400/20' },
  [ValidationState.Invalid]: { dot: 'bg-red-500', ring: 'ring-red-400/20' },
};

const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'minimax/MiniMax-M2': 'MiniMax M2.1',
};

function AgentNodeComponent({ data, selected }: NodeProps) {
  const config = (data?.config || {}) as AgentNodeConfig;
  const modelLabel = MODEL_LABELS[config.model || ''] || config.model || 'No model';
  const toolsList = config.tools || [];
  const skillsList = config.skills || [];
  const vState = (data?.validation_state || 'incomplete') as string;
  const vStyle = validationColors[vState] || validationColors[ValidationState.Incomplete];

  return (
    <div
      className={`min-w-[200px] max-w-[260px] rounded-xl border bg-white/[0.03] backdrop-blur-sm shadow-lg transition-all ${
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-400/20 shadow-indigo-500/10'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-[2px] !border-studio-bg !-top-1.5" />

      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="text-sm font-semibold text-studio-text truncate">
                {config.name || 'Unnamed Agent'}
              </div>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${vStyle.dot}`} title={`Validation: ${vState}`} />
            </div>
            {(config.role || config.description) && (
              <div className="text-[10px] text-studio-text-muted/70 line-clamp-2 mt-0.5 leading-snug">
                {config.role || config.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model badge */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1">
          <svg className="w-3 h-3 text-studio-text-muted/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          <span className="text-[10px] text-studio-text-muted truncate">{modelLabel}</span>
        </div>
      </div>

      {/* Tools & Skills */}
      {(toolsList.length > 0 || skillsList.length > 0) && (
        <div className="px-3 pb-3 space-y-1">
          {toolsList.slice(0, 2).map((tool, i) => (
            <div key={`t-${i}`} className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-amber-400/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-[10px] text-studio-text-muted truncate">{tool}</span>
            </div>
          ))}
          {skillsList.slice(0, 2).map((skill, i) => (
            <div key={`s-${i}`} className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-emerald-400/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-[10px] text-studio-text-muted truncate">{skill}</span>
            </div>
          ))}
          {(toolsList.length + skillsList.length) > 4 && (
            <span className="text-[9px] text-studio-text-muted/40 pl-4.5">
              +{toolsList.length + skillsList.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Bottom actions hint */}
      <div className="flex items-center justify-between border-t border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-3">
          <svg className="w-3 h-3 text-studio-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
        <svg className="w-3 h-3 text-studio-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-[2px] !border-studio-bg !-bottom-1.5" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
