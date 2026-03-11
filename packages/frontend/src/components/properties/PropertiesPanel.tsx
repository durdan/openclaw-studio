'use client';

import { useCanvasStore } from '@/store/canvas.store';
import { useDesignStore } from '@/store/design.store';
import { AgentProperties } from './AgentProperties';
import { SkillProperties } from './SkillProperties';
import { ToolProperties } from './ToolProperties';
import { HeartbeatProperties } from './HeartbeatProperties';
import { WorkspaceProperties } from './WorkspaceProperties';
import { ApprovalProperties } from './ApprovalProperties';
import { TriggerProperties } from './TriggerProperties';
import { ConditionProperties } from './ConditionProperties';
import { OutputProperties } from './OutputProperties';

const NODE_TYPE_COLORS: Record<string, string> = {
  agent: 'text-indigo-400',
  skill: 'text-emerald-400',
  tool: 'text-amber-400',
  trigger: 'text-rose-400',
  condition: 'text-cyan-400',
  approval: 'text-purple-400',
  output: 'text-teal-400',
  workspace: 'text-blue-400',
  heartbeat: 'text-pink-400',
};

const NODE_TYPE_ICONS: Record<string, string> = {
  agent: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  skill: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  tool: 'M11.42 15.17l-5.66-5.66 1.41-1.41 5.66 5.66-1.41 1.41zM14.41 6.41l-1.41-1.41 5.66-5.66 1.41 1.41-5.66 5.66zM4.93 19.07l-1.41-1.41L19.07 2.1l1.41 1.41L4.93 19.07z',
  trigger: 'M13 10V3L4 14h7v7l9-11h-7z',
  heartbeat: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
};

export function PropertiesPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedNodeType = useCanvasStore((s) => s.selectedNodeType);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const activeDesign = useDesignStore((s) => s.activeDesign);

  if (!selectedNodeId) return null;

  const node = activeDesign?.graph?.nodes.find((n) => n.id === selectedNodeId);
  const colorClass = NODE_TYPE_COLORS[selectedNodeType || ''] || 'text-studio-text-muted';
  const iconPath = NODE_TYPE_ICONS[selectedNodeType || ''];

  const renderProperties = () => {
    switch (selectedNodeType) {
      case 'agent':
        return <AgentProperties nodeId={selectedNodeId} />;
      case 'skill':
        return <SkillProperties nodeId={selectedNodeId} />;
      case 'tool':
        return <ToolProperties nodeId={selectedNodeId} />;
      case 'heartbeat':
        return <HeartbeatProperties nodeId={selectedNodeId} />;
      case 'workspace':
        return <WorkspaceProperties nodeId={selectedNodeId} />;
      case 'approval':
        return <ApprovalProperties nodeId={selectedNodeId} />;
      case 'trigger':
        return <TriggerProperties nodeId={selectedNodeId} />;
      case 'condition':
        return <ConditionProperties nodeId={selectedNodeId} />;
      case 'output':
        return <OutputProperties nodeId={selectedNodeId} />;
      default:
        return (
          <div className="space-y-2 p-4">
            <p className="text-xs text-studio-text-muted">
              No properties editor for this node type.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-studio-border px-4 py-3">
        <div className="flex items-center gap-2">
          {iconPath && (
            <svg className={`w-4 h-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          )}
          <div>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>
              {selectedNodeType}
            </h2>
            {node && (
              <p className="text-sm font-medium text-studio-text">{node.label}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => removeNode(selectedNodeId)}
            className="rounded p-1.5 text-studio-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete node"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={clearSelection}
            className="rounded p-1.5 text-studio-text-muted hover:text-studio-text hover:bg-studio-bg transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Properties content */}
      <div className="flex-1 overflow-y-auto">
        {renderProperties()}
      </div>
    </div>
  );
}
