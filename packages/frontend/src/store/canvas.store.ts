import { create } from 'zustand';
import type { NodeConfig } from '@openclaw-studio/shared';
import { NodeType, ValidationState } from '@openclaw-studio/shared';
import { useDesignStore } from './design.store';

interface CanvasState {
  selectedNodeId: string | null;
  selectedNodeType: string | null;
  selectedEdgeId: string | null;
  zoomLevel: number;
  nodeConfigs: Record<string, NodeConfig>;

  // Selection
  selectNode: (nodeId: string | null, nodeType?: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setZoomLevel: (zoom: number) => void;
  clearSelection: () => void;

  // Node operations
  updateNodeConfig: (nodeId: string, config: Partial<NodeConfig>) => void;
  addNode: (type: NodeType, position: { x: number; y: number }, config?: NodeConfig) => void;
  removeNode: (nodeId: string) => void;
}

function getDefaultConfig(type: NodeType): NodeConfig {
  switch (type) {
    case NodeType.Agent:
      return { name: 'New Agent', role: '', description: '', model: 'claude-sonnet-4-20250514', reuse_mode: 'new' as const };
    case NodeType.Skill:
      return { name: 'New Skill', purpose: '', prompt_summary: '', reuse_mode: 'new' as const };
    case NodeType.Tool:
      return { tool_type: '', binding_name: '', allowed_actions: [], reuse_mode: 'new' as const };
    case NodeType.Trigger:
      return { trigger_type: 'manual' as const, source: '' };
    case NodeType.Condition:
      return { expression_summary: '' };
    case NodeType.Approval:
      return { required: true, reviewer_type: 'human', rationale: '' };
    case NodeType.Output:
      return { output_type: '', destination: '', summary: '' };
    case NodeType.Workspace:
      return { notes: '' };
    case NodeType.Heartbeat:
      return { mode: 'interval' as const, schedule: '', purpose: '' };
    case NodeType.TemplateReference:
      return { notes: '' } as NodeConfig;
    default:
      return { name: '', role: '', description: '', model: 'claude-sonnet-4-20250514', reuse_mode: 'new' as const };
  }
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  selectedNodeId: null,
  selectedNodeType: null,
  selectedEdgeId: null,
  zoomLevel: 1,
  nodeConfigs: {},

  selectNode: (nodeId, nodeType = null) =>
    set({ selectedNodeId: nodeId, selectedNodeType: nodeType, selectedEdgeId: null }),

  selectEdge: (edgeId) =>
    set({ selectedEdgeId: edgeId, selectedNodeId: null, selectedNodeType: null }),

  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

  clearSelection: () =>
    set({ selectedNodeId: null, selectedNodeType: null, selectedEdgeId: null }),

  updateNodeConfig: (nodeId: string, configUpdate: Partial<NodeConfig>) => {
    const designStore = useDesignStore.getState();
    const graph = designStore.activeDesign?.graph;
    if (!graph) return;

    const updatedNodes = graph.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          config: { ...node.config, ...configUpdate } as NodeConfig,
        };
      }
      return node;
    });

    designStore.updateGraph({
      ...graph,
      nodes: updatedNodes,
      metadata: { ...graph.metadata, updated_at: new Date().toISOString() },
    });
  },

  addNode: (type: NodeType, position: { x: number; y: number }, config?: NodeConfig) => {
    const designStore = useDesignStore.getState();
    const graph = designStore.activeDesign?.graph;

    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nodeConfig = config || getDefaultConfig(type);
    const label = 'name' in nodeConfig
      ? (nodeConfig as { name: string }).name
      : type.charAt(0).toUpperCase() + type.slice(1);

    const newNode = {
      id: nodeId,
      type,
      label,
      config: nodeConfig,
      proposed_new: true,
      validation_state: ValidationState.Incomplete,
      position,
    };

    if (graph) {
      designStore.updateGraph({
        ...graph,
        nodes: [...graph.nodes, newNode],
        metadata: { ...graph.metadata, updated_at: new Date().toISOString() },
      });
    } else {
      designStore.updateGraph({
        nodes: [newNode],
        edges: [],
        metadata: {
          name: 'New Design',
          description: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        },
      });
    }
  },

  removeNode: (nodeId: string) => {
    const designStore = useDesignStore.getState();
    const graph = designStore.activeDesign?.graph;
    if (!graph) return;

    const { selectedNodeId } = get();
    if (selectedNodeId === nodeId) {
      set({ selectedNodeId: null, selectedNodeType: null });
    }

    designStore.updateGraph({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      edges: graph.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      metadata: { ...graph.metadata, updated_at: new Date().toISOString() },
    });
  },
}));
