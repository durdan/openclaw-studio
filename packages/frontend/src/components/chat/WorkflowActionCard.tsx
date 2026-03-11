'use client';

import { useState } from 'react';

interface WorkflowActionCardProps {
  action: {
    type: string;
    nodes?: any[];
    edges?: any[];
    remove_node_ids?: string[];
    summary?: string;
    graph?: any;
  };
  onApply: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  create_graph: 'Create Graph',
  add_nodes: 'Add Nodes',
  remove_nodes: 'Remove Nodes',
  modify_nodes: 'Modify Nodes',
  add_edges: 'Add Edges',
  explain: 'Explanation',
  refine: 'Refine Graph',
};

const ACTION_COLORS: Record<string, string> = {
  create_graph: 'border-l-indigo-500',
  add_nodes: 'border-l-green-500',
  remove_nodes: 'border-l-red-500',
  modify_nodes: 'border-l-yellow-500',
  add_edges: 'border-l-cyan-500',
  explain: 'border-l-purple-500',
  refine: 'border-l-orange-500',
};

const ACTION_BADGE_COLORS: Record<string, string> = {
  create_graph: 'bg-indigo-500/20 text-indigo-400',
  add_nodes: 'bg-green-500/20 text-green-400',
  remove_nodes: 'bg-red-500/20 text-red-400',
  modify_nodes: 'bg-yellow-500/20 text-yellow-400',
  add_edges: 'bg-cyan-500/20 text-cyan-400',
  explain: 'bg-purple-500/20 text-purple-400',
  refine: 'bg-orange-500/20 text-orange-400',
};

export function WorkflowActionCard({ action, onApply }: WorkflowActionCardProps) {
  const [applied, setApplied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const borderColor = ACTION_COLORS[action.type] || 'border-l-studio-accent';
  const badgeColor = ACTION_BADGE_COLORS[action.type] || 'bg-studio-accent/20 text-studio-accent';
  const label = ACTION_LABELS[action.type] || action.type;

  const handleApply = () => {
    onApply();
    setApplied(true);
  };

  const nodes = action.nodes || action.graph?.nodes || [];
  const edges = action.edges || action.graph?.edges || [];

  return (
    <div className={`mt-2 rounded border-l-4 ${borderColor} bg-studio-bg p-3`}>
      {/* Badge */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
          {label}
        </span>
      </div>

      {/* Summary */}
      {action.summary && (
        <p className="mb-2 text-xs text-studio-text-muted">{action.summary}</p>
      )}

      {/* Node list */}
      {nodes.length > 0 && (
        <div className="mb-2 space-y-1">
          <span className="text-[10px] font-medium uppercase text-studio-text-muted">
            Nodes ({nodes.length})
          </span>
          {nodes.slice(0, 5).map((node: any, i: number) => (
            <div key={node.id || i} className="flex items-center gap-2 text-xs text-studio-text">
              <span className="inline-block h-2 w-2 rounded-full bg-studio-accent" />
              <span className="font-medium">{node.label || node.name || node.id}</span>
              {node.type && (
                <span className="text-studio-text-muted">({node.type})</span>
              )}
            </div>
          ))}
          {nodes.length > 5 && (
            <span className="text-[10px] text-studio-text-muted">
              ...and {nodes.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Edge list */}
      {edges.length > 0 && (
        <div className="mb-2 space-y-1">
          <span className="text-[10px] font-medium uppercase text-studio-text-muted">
            Edges ({edges.length})
          </span>
          {edges.slice(0, 3).map((edge: any, i: number) => (
            <div key={edge.id || i} className="text-xs text-studio-text-muted">
              {edge.source} &rarr; {edge.target}
              {edge.label && <span className="ml-1">({edge.label})</span>}
            </div>
          ))}
          {edges.length > 3 && (
            <span className="text-[10px] text-studio-text-muted">
              ...and {edges.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Remove node IDs */}
      {action.remove_node_ids && action.remove_node_ids.length > 0 && (
        <div className="mb-2 space-y-1">
          <span className="text-[10px] font-medium uppercase text-studio-text-muted">
            Removing ({action.remove_node_ids.length})
          </span>
          {action.remove_node_ids.slice(0, 5).map((id: string) => (
            <div key={id} className="flex items-center gap-2 text-xs text-red-400">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              <span>{id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {action.type !== 'explain' && (
        <div className="mt-3 flex items-center gap-2">
          {applied ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Applied
            </span>
          ) : (
            <>
              <button
                onClick={handleApply}
                className="rounded bg-studio-accent px-3 py-1 text-xs font-medium text-white hover:bg-studio-accent-hover transition-colors"
              >
                Apply to Canvas
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="rounded border border-studio-border px-3 py-1 text-xs text-studio-text-muted hover:text-studio-text transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
