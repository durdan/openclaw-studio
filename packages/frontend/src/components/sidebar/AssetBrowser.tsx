'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/store/canvas.store';
import { NodeType } from '@openclaw-studio/shared';
import type { AssetCatalogEntry } from '@openclaw-studio/shared';

const assetTypeToNodeType: Record<string, NodeType> = {
  agent: NodeType.Agent,
  skill: NodeType.Skill,
  tool: NodeType.Tool,
};

export function AssetBrowser() {
  const [assets, setAssets] = useState<AssetCatalogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const addNode = useCanvasStore((s) => s.addNode);

  useEffect(() => {
    setIsLoading(true);
    api
      .get<AssetCatalogEntry[]>('/assets')
      .then(setAssets)
      .catch(() => {
        // API might not be available
        setAssets([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = search
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.asset_type.toLowerCase().includes(search.toLowerCase()),
      )
    : assets;

  const grouped = filtered.reduce<Record<string, AssetCatalogEntry[]>>((acc, asset) => {
    const type = asset.asset_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {});

  const handleUseAsset = useCallback(
    (asset: AssetCatalogEntry) => {
      const nodeType = assetTypeToNodeType[asset.asset_type] || NodeType.Agent;
      const config: Record<string, unknown> = {
        name: asset.name,
        reuse_mode: 'existing',
        existing_asset_ref: asset.id,
      };
      addNode(nodeType, { x: 250, y: 250 }, config as any);
    },
    [addNode],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-studio-text-muted uppercase">Assets</span>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search assets..."
        className="w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text placeholder:text-studio-text-muted focus:border-studio-accent focus:outline-none"
      />

      {isLoading && <p className="text-xs text-studio-text-muted">Loading assets...</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-studio-text-muted">
          {assets.length === 0
            ? 'No assets in catalog. Assets will appear as you create and export designs.'
            : 'No assets match your search.'}
        </p>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="space-y-1">
          <button
            onClick={() => setExpandedType(expandedType === type ? null : type)}
            className="flex items-center justify-between w-full text-xs font-medium text-studio-text-muted hover:text-studio-text transition-colors"
          >
            <span className="capitalize">{type} ({items.length})</span>
            <span className="text-[10px]">{expandedType === type ? '-' : '+'}</span>
          </button>
          {expandedType === type && (
            <ul className="space-y-1 ml-1">
              {items.map((asset) => (
                <li
                  key={asset.id}
                  className="rounded border border-studio-border px-2 py-1.5 text-xs hover:border-studio-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-studio-text truncate">{asset.name}</span>
                    <button
                      onClick={() => handleUseAsset(asset)}
                      className="text-[9px] text-studio-accent hover:text-studio-accent-hover whitespace-nowrap ml-1"
                    >
                      + Use
                    </button>
                  </div>
                  {asset.reusable && (
                    <span className="text-[9px] text-emerald-400">Reusable</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
