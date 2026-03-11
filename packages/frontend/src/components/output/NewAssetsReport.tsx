'use client';

import { useDesignStore } from '@/store/design.store';
import { Badge } from '@/components/common/Badge';
import type { ProposedAsset } from '@openclaw-studio/shared';

export function NewAssetsReport() {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const plannerOutput = activeDesign?.planner_output;

  if (!plannerOutput || !plannerOutput.proposed_new_assets.length) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">New Assets</h3>
        <p className="text-xs text-studio-text-muted">
          No proposed new assets yet. Generate a plan to see what new assets are needed.
        </p>
      </div>
    );
  }

  const assets = plannerOutput.proposed_new_assets;

  // Group by asset_type
  const grouped = assets.reduce<Record<string, ProposedAsset[]>>((acc, asset) => {
    const key = asset.asset_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {});

  const typeOrder = ['agent', 'skill', 'tool', 'trigger', 'workspace', 'heartbeat', 'approval', 'output'];
  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) - (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">New Assets</h3>
        <Badge variant="new" label={`${assets.length} New`} />
      </div>

      {/* Summary counts */}
      <div className="flex flex-wrap gap-2">
        {sortedTypes.map((type) => (
          <div
            key={type}
            className="flex items-center gap-1.5 rounded border border-studio-border px-2 py-1"
          >
            <span className="text-[10px] font-medium text-studio-text capitalize">{type}</span>
            <span className="text-[10px] font-bold text-studio-accent">{grouped[type].length}</span>
          </div>
        ))}
      </div>

      {/* Grouped asset list */}
      {sortedTypes.map((type) => (
        <div key={type} className="space-y-1.5">
          <h4 className="text-[11px] font-semibold text-studio-text capitalize">{type}s</h4>
          {grouped[type].map((asset, idx) => (
            <div
              key={`${asset.name}-${idx}`}
              className="rounded border border-studio-border p-2 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-studio-text">{asset.name}</span>
                <Badge variant="new" />
              </div>
              <p className="text-[10px] text-studio-text-muted">{asset.description}</p>
              <p className="text-[10px] text-studio-text-muted italic">
                Rationale: {asset.rationale}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
