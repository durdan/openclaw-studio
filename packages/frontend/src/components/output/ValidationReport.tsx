'use client';

import { useDesignStore } from '@/store/design.store';

export function ValidationReport() {
  const validationResult = useDesignStore((s) => s.validationResult);
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const isLoading = useDesignStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Validation Report</h3>
        <p className="text-xs text-studio-text-muted">Validating...</p>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Validation Report</h3>
        <div className="rounded border border-studio-border p-2">
          <p className="text-xs text-studio-text-muted">
            No validation results yet. Add nodes to the canvas and run validation.
          </p>
        </div>
      </div>
    );
  }

  const { valid, errors, warnings } = validationResult;
  const graphNodes = activeDesign?.graph?.nodes || [];

  const getNodeLabel = (nodeId?: string) => {
    if (!nodeId) return null;
    const node = graphNodes.find((n) => n.id === nodeId);
    return node?.label || nodeId;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Validation Report</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${valid ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span
            className={`text-xs font-semibold ${valid ? 'text-green-400' : 'text-red-400'}`}
          >
            {valid ? 'Valid' : 'Invalid'}
          </span>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-red-400 uppercase">
            Errors ({errors.length})
          </span>
          <ul className="mt-1 space-y-1">
            {errors.map((issue, i) => (
              <li
                key={i}
                className="rounded border border-red-500/20 bg-red-500/5 p-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-red-400 font-medium">{issue.message}</span>
                </div>
                {issue.node_id && (
                  <span className="text-[10px] text-red-400/60 ml-3 mt-0.5 block">
                    Node: {getNodeLabel(issue.node_id)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-yellow-400 uppercase">
            Warnings ({warnings.length})
          </span>
          <ul className="mt-1 space-y-1">
            {warnings.map((issue, i) => (
              <li
                key={i}
                className="rounded border border-yellow-500/20 bg-yellow-500/5 p-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-yellow-400 font-medium">{issue.message}</span>
                </div>
                {issue.node_id && (
                  <span className="text-[10px] text-yellow-400/60 ml-3 mt-0.5 block">
                    Node: {getNodeLabel(issue.node_id)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All good */}
      {valid && errors.length === 0 && warnings.length === 0 && (
        <div className="rounded border border-green-500/20 bg-green-500/5 p-2">
          <p className="text-xs text-green-400">
            All validation checks passed. The design is ready for export.
          </p>
        </div>
      )}
    </div>
  );
}
