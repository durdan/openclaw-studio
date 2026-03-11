'use client';

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { getEdgeColor } from '@/hooks/useCanvas';

export function StudioEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  ...rest
}: EdgeProps) {
  const relationType = (data?.relation_type as string) || 'depends_on';
  const color = getEdgeColor(relationType);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: selected ? '5 3' : undefined,
          ...style,
        }}
        {...rest}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-medium"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}40`,
            }}
          >
            {relationType.replace(/_/g, ' ')}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
