import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { StudioGraph, StudioNode, StudioEdge as StudioEdgeType, GraphMetadata } from '@openclaw-studio/shared';
import { EdgeRelationType } from '@openclaw-studio/shared';
import { useCanvasStore } from '@/store/canvas.store';
import { NODE_COLORS } from '@/lib/constants';

export function getNodeColor(type: string): string {
  return NODE_COLORS[type] || '#6b7280';
}

export function getEdgeColor(relationType: string): string {
  const colors: Record<string, string> = {
    [EdgeRelationType.Invokes]: '#6366f1',
    [EdgeRelationType.Uses]: '#10b981',
    [EdgeRelationType.Triggers]: '#06b6d4',
    [EdgeRelationType.RoutesTo]: '#f59e0b',
    [EdgeRelationType.DependsOn]: '#f97316',
    [EdgeRelationType.Approves]: '#f43f5e',
    [EdgeRelationType.WritesTo]: '#a855f7',
    [EdgeRelationType.ManagedBy]: '#ec4899',
    [EdgeRelationType.GroupedUnder]: '#94a3b8',
  };
  return colors[relationType] || '#6b7280';
}

export function convertGraphToReactFlow(graph: StudioGraph | undefined): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!graph) return { nodes: [], edges: [] };

  const nodes: Node[] = graph.nodes.map((node: StudioNode) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.label,
      config: node.config,
      proposed_new: node.proposed_new,
      validation_state: node.validation_state,
      reused_asset_ref: node.reused_asset_ref,
    },
  }));

  const edges: Edge[] = graph.edges.map((edge: StudioEdgeType) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'studio',
    data: {
      relation_type: edge.relation_type,
    },
  }));

  return { nodes, edges };
}

export function convertReactFlowToGraph(
  nodes: Node[],
  edges: Edge[],
  metadata: GraphMetadata,
): StudioGraph {
  const studioNodes: StudioNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.type as StudioNode['type'],
    label: (node.data?.label as string) || '',
    config: (node.data?.config as StudioNode['config']) || { name: '', role: '', goal: '', description: '', reuse_mode: 'new' as const },
    proposed_new: (node.data?.proposed_new as boolean) ?? true,
    validation_state: (node.data?.validation_state as StudioNode['validation_state']) || 'incomplete',
    reused_asset_ref: node.data?.reused_asset_ref as string | undefined,
    position: node.position,
  }));

  const studioEdges: StudioEdgeType[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relation_type: (edge.data?.relation_type as StudioEdgeType['relation_type']) || EdgeRelationType.DependsOn,
  }));

  return {
    nodes: studioNodes,
    edges: studioEdges,
    metadata: {
      ...metadata,
      updated_at: new Date().toISOString(),
    },
  };
}

export function useCanvas() {
  const {
    selectedNodeId,
    selectedNodeType,
    selectedEdgeId,
    zoomLevel,
    selectNode,
    selectEdge,
    setZoomLevel,
    clearSelection,
  } = useCanvasStore();

  const handleNodeClick = useCallback(
    (nodeId: string, nodeType: string) => {
      selectNode(nodeId, nodeType);
    },
    [selectNode],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      selectEdge(edgeId);
    },
    [selectEdge],
  );

  const handleCanvasClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return {
    selectedNodeId,
    selectedNodeType,
    selectedEdgeId,
    zoomLevel,
    handleNodeClick,
    handleEdgeClick,
    handleCanvasClick,
    setZoomLevel,
    clearSelection,
    convertGraphToReactFlow,
    convertReactFlowToGraph,
    getNodeColor,
    getEdgeColor,
  };
}
