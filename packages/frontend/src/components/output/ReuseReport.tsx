'use client';

import { useDesignStore } from '@/store/design.store';
import { Badge } from '@/components/common/Badge';
import type { ReusableAssetRef } from '@openclaw-studio/shared';

export function ReuseReport() {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const plannerOutput = activeDesign?.planner_output;

  if (!plannerOutput) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Reuse Report</h3>
        <p className="text-xs text-studio-text-muted">
          Generate a plan to see reusable asset analysis.
        </p>
      </div>
    );
  }

  const reusable = plannerOutput.reusable_assets;
  const newAssets = plannerOutput.proposed_new_assets;
  const totalCount = reusable.length + newAssets.length;
  const reusePercentage = totalCount > 0
    ? Math.round((reusable.length / totalCount) * 100)
    : 0;

  // Group reusable by asset_type
  const grouped = reusable.reduce<Record<string, ReusableAssetRef[]>>((acc, asset) => {
    const key = asset.asset_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Reuse Report</h3>
        <Badge variant="reuse" label={`${reusePercentage}% Reuse`} />
      </div>

      {/* Summary bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-studio-text-muted">
            {reusable.length} reused / {newAssets.length} new ({totalCount} total)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-studio-border overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${reusePercentage}%` }}
          />
        </div>
      </div>

      {reusable.length === 0 ? (
        <p className="text-xs text-studio-text-muted">
          No reusable assets identified. All assets in this design are new.
        </p>
      ) : (
        <>
          {Object.keys(grouped).map((type) => (
            <div key={type} className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-studio-text capitalize">{type}s</h4>
              {grouped[type].map((asset, idx) => (
                <div
                  key={`${asset.asset_id}-${idx}`}
                  className="rounded border border-studio-border p-2 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-studio-text">{asset.name}</span>
                    <Badge variant="reuse" />
                  </div>
                  <p className="text-[10px] text-studio-text-muted">
                    {asset.reason}
                  </p>
                  <p className="text-[10px] text-studio-text-muted font-mono">
                    Ref: {asset.asset_id}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
