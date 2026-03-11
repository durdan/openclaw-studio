'use client';

import type { StudioGraph, StudioNode, StudioEdge } from '@openclaw-studio/shared';

interface DesignDiffProps {
  graphA: StudioGraph;
  graphB: StudioGraph;
  labelA?: string;
  labelB?: string;
}

interface DiffResult {
  addedNodes: StudioNode[];
  removedNodes: StudioNode[];
  modifiedNodes: Array<{ before: StudioNode; after: StudioNode }>;
  unchangedNodes: StudioNode[];
  addedEdges: StudioEdge[];
  removedEdges: StudioEdge[];
}

function computeDiff(graphA: StudioGraph, graphB: StudioGraph): DiffResult {
  const nodesA = new Map(graphA.nodes.map((n) => [n.id, n]));
  const nodesB = new Map(graphB.nodes.map((n) => [n.id, n]));
  const edgesA = new Map(graphA.edges.map((e) => [e.id, e]));
  const edgesB = new Map(graphB.edges.map((e) => [e.id, e]));

  const addedNodes: StudioNode[] = [];
  const removedNodes: StudioNode[] = [];
  const modifiedNodes: Array<{ before: StudioNode; after: StudioNode }> = [];
  const unchangedNodes: StudioNode[] = [];

  for (const [id, node] of nodesB) {
    const prev = nodesA.get(id);
    if (!prev) {
      addedNodes.push(node);
    } else if (JSON.stringify(prev.config) !== JSON.stringify(node.config) || prev.label !== node.label) {
      modifiedNodes.push({ before: prev, after: node });
    } else {
      unchangedNodes.push(node);
    }
  }

  for (const [id, node] of nodesA) {
    if (!nodesB.has(id)) {
      removedNodes.push(node);
    }
  }

  const addedEdges: StudioEdge[] = [];
  const removedEdges: StudioEdge[] = [];

  for (const [id, edge] of edgesB) {
    if (!edgesA.has(id)) addedEdges.push(edge);
  }
  for (const [id, edge] of edgesA) {
    if (!edgesB.has(id)) removedEdges.push(edge);
  }

  return { addedNodes, removedNodes, modifiedNodes, unchangedNodes, addedEdges, removedEdges };
}

export function DesignDiff({ graphA, graphB, labelA = 'Before', labelB = 'After' }: DesignDiffProps) {
  const diff = computeDiff(graphA, graphB);

  const hasChanges =
    diff.addedNodes.length > 0 ||
    diff.removedNodes.length > 0 ||
    diff.modifiedNodes.length > 0 ||
    diff.addedEdges.length > 0 ||
    diff.removedEdges.length > 0;

  if (!hasChanges) {
    return (
      <div className="rounded border border-studio-border p-3 text-center">
        <p className="text-xs text-studio-text-muted">No differences found between versions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-studio-text-muted">{labelA} → {labelB}</span>
        {diff.addedNodes.length > 0 && (
          <span className="text-green-400">+{diff.addedNodes.length} nodes</span>
        )}
        {diff.removedNodes.length > 0 && (
          <span className="text-red-400">-{diff.removedNodes.length} nodes</span>
        )}
        {diff.modifiedNodes.length > 0 && (
          <span className="text-yellow-400">~{diff.modifiedNodes.length} modified</span>
        )}
      </div>

      {/* Side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left: Before */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-semibold text-studio-text-muted uppercase">{labelA}</h4>
          {diff.removedNodes.map((node) => (
            <div key={node.id} className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1.5">
              <span className="text-[10px] font-medium text-red-400">{node.label}</span>
              <span className="ml-1 text-[9px] text-red-400/60">[{node.type}]</span>
            </div>
          ))}
          {diff.modifiedNodes.map(({ before }) => (
            <div key={before.id} className="rounded border border-yellow-500/30 bg-yellow-500/5 px-2 py-1.5">
              <span className="text-[10px] font-medium text-yellow-400">{before.label}</span>
              <span className="ml-1 text-[9px] text-yellow-400/60">[{before.type}]</span>
            </div>
          ))}
          {diff.unchangedNodes.map((node) => (
            <div key={node.id} className="rounded border border-studio-border px-2 py-1.5 opacity-50">
              <span className="text-[10px] text-studio-text-muted">{node.label}</span>
            </div>
          ))}
        </div>

        {/* Right: After */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-semibold text-studio-text-muted uppercase">{labelB}</h4>
          {diff.addedNodes.map((node) => (
            <div key={node.id} className="rounded border border-green-500/30 bg-green-500/5 px-2 py-1.5">
              <span className="text-[10px] font-medium text-green-400">{node.label}</span>
              <span className="ml-1 text-[9px] text-green-400/60">[{node.type}]</span>
            </div>
          ))}
          {diff.modifiedNodes.map(({ after }) => (
            <div key={after.id} className="rounded border border-yellow-500/30 bg-yellow-500/5 px-2 py-1.5">
              <span className="text-[10px] font-medium text-yellow-400">{after.label}</span>
              <span className="ml-1 text-[9px] text-yellow-400/60">[{after.type}]</span>
            </div>
          ))}
          {diff.unchangedNodes.map((node) => (
            <div key={node.id} className="rounded border border-studio-border px-2 py-1.5 opacity-50">
              <span className="text-[10px] text-studio-text-muted">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edge changes */}
      {(diff.addedEdges.length > 0 || diff.removedEdges.length > 0) && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-semibold text-studio-text-muted uppercase">Edge Changes</h4>
          {diff.addedEdges.map((edge) => (
            <div key={edge.id} className="flex items-center gap-1 text-[10px] text-green-400">
              <span>+</span>
              <span>{edge.source} → {edge.target}</span>
              <span className="text-green-400/60">({edge.relation_type})</span>
            </div>
          ))}
          {diff.removedEdges.map((edge) => (
            <div key={edge.id} className="flex items-center gap-1 text-[10px] text-red-400">
              <span>-</span>
              <span>{edge.source} → {edge.target}</span>
              <span className="text-red-400/60">({edge.relation_type})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
