'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { useCanvasStore } from '@/store/canvas.store';
import { useDesignStore } from '@/store/design.store';
import { convertGraphToReactFlow, convertReactFlowToGraph, getNodeColor } from '@/hooks/useCanvas';
import { EdgeRelationType } from '@openclaw-studio/shared';

function StudioCanvasInner() {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => convertGraphToReactFlow(activeDesign?.graph),
    [activeDesign?.graph],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const reactFlowInstance = useReactFlow();
  const syncingRef = useRef(false);

  // Sync from store to local state when graph changes externally
  useEffect(() => {
    syncingRef.current = true;
    setNodes(flowNodes);
    setEdges(flowEdges);
    // Use a microtask to reset the flag after React processes the state update
    queueMicrotask(() => {
      syncingRef.current = false;
    });
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Sync local changes back to store
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Only sync position changes (drag) back to store
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && 'dragging' in c && !c.dragging && c.position,
      );
      if (positionChanges.length > 0 && activeDesign?.graph && !syncingRef.current) {
        // Defer the store update to avoid updating during render
        requestAnimationFrame(() => {
          const currentNodes = reactFlowInstance.getNodes();
          const currentEdges = reactFlowInstance.getEdges();
          const graph = activeDesign?.graph;
          if (graph) {
            updateGraph(convertReactFlowToGraph(currentNodes, currentEdges, graph.metadata));
          }
        });
      }
    },
    [onNodesChange, activeDesign?.graph, updateGraph, reactFlowInstance],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: params.source,
        target: params.target,
        type: 'studio',
        data: { relation_type: EdgeRelationType.DependsOn },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Sync to store
      requestAnimationFrame(() => {
        const graph = activeDesign?.graph;
        if (graph) {
          const currentNodes = reactFlowInstance.getNodes();
          const allEdges = [...reactFlowInstance.getEdges(), newEdge];
          updateGraph(convertReactFlowToGraph(currentNodes, allEdges, graph.metadata));
        }
      });
    },
    [setEdges, activeDesign?.graph, updateGraph, reactFlowInstance],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id, node.type || null);
    },
    [selectNode],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'studio' }}
          fitView
          className="bg-studio-bg"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2d3a" />
          <Controls className="!bg-studio-surface !border-studio-border !shadow-lg [&>button]:!bg-studio-surface [&>button]:!border-studio-border [&>button]:!text-studio-text [&>button:hover]:!bg-studio-border" />
          <MiniMap
            nodeColor={(node) => getNodeColor(node.type || 'agent')}
            maskColor="rgba(15, 17, 23, 0.8)"
            className="!bg-studio-surface !border-studio-border"
            pannable
            zoomable
          />
        </ReactFlow>
    </div>
  );
}

export function StudioCanvas() {
  return (
    <ReactFlowProvider>
      <StudioCanvasInner />
    </ReactFlowProvider>
  );
}
