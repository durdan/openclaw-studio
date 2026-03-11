'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDesignStore } from '@/store/design.store';
import { DesignDiff } from './DesignDiff';
import { useToast } from '@/components/common/Toast';
import type { StudioDesignVersion } from '@openclaw-studio/shared';

export function VersionHistory() {
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const updateGraph = useDesignStore((s) => s.updateGraph);
  const { toast } = useToast();

  const [versions, setVersions] = useState<StudioDesignVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [diffVersions, setDiffVersions] = useState<[StudioDesignVersion, StudioDesignVersion] | null>(null);

  const designId = activeDesign?.id;

  useEffect(() => {
    if (!designId) {
      setVersions([]);
      return;
    }
    loadVersions();
  }, [designId]);

  const loadVersions = async () => {
    if (!designId) return;
    setIsLoading(true);
    try {
      const data = await api.get<StudioDesignVersion[]>(`/designs/${designId}/versions`);
      setVersions(data);
    } catch (err) {
      toast('error', 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!designId || !activeDesign?.graph) return;
    setIsCreating(true);
    try {
      const version = await api.post<StudioDesignVersion>(`/designs/${designId}/versions`, {
        graph: activeDesign.graph,
        planner_output: activeDesign.planner_output,
        export_bundle: activeDesign.export_bundle,
        change_summary: changeSummary || `Version snapshot`,
      });
      setVersions((prev) => [...prev, version]);
      setChangeSummary('');
      toast('success', `Version ${version.version_number} created`);
    } catch (err) {
      toast('error', 'Failed to create version');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = (version: StudioDesignVersion) => {
    if (!version.graph) return;
    updateGraph(version.graph);
    toast('info', `Restored to version ${version.version_number}`);
  };

  const handleCompare = (vA: StudioDesignVersion, vB: StudioDesignVersion) => {
    setDiffVersions([vA, vB]);
  };

  if (!activeDesign) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Version History</h3>
        <p className="text-xs text-studio-text-muted">
          Select or create a design to view version history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Version History</h3>

      {/* Create version */}
      <div className="flex gap-2">
        <input
          type="text"
          value={changeSummary}
          onChange={(e) => setChangeSummary(e.target.value)}
          placeholder="Change summary..."
          className="flex-1 rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text placeholder:text-studio-text-muted focus:border-studio-accent focus:outline-none"
        />
        <button
          onClick={handleCreateVersion}
          disabled={isCreating || !activeDesign.graph}
          className="whitespace-nowrap rounded bg-studio-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-studio-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Saving...' : 'Create Version'}
        </button>
      </div>

      {/* Version list */}
      {isLoading ? (
        <p className="text-xs text-studio-text-muted">Loading versions...</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-studio-text-muted">
          No versions saved yet. Create a version to start tracking changes.
        </p>
      ) : (
        <div className="space-y-1.5">
          {[...versions].reverse().map((version, idx) => {
            const reversedVersions = [...versions].reverse();
            const prevVersion = idx < reversedVersions.length - 1 ? reversedVersions[idx + 1] : null;

            return (
              <div
                key={version.id}
                className="rounded border border-studio-border p-2 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-studio-accent">
                      v{version.version_number}
                    </span>
                    <span className="text-[10px] text-studio-text-muted">
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {prevVersion && (
                      <button
                        onClick={() => handleCompare(prevVersion, version)}
                        className="rounded border border-studio-border px-2 py-0.5 text-[10px] text-studio-text-muted hover:text-studio-text hover:border-studio-accent transition-colors"
                      >
                        Compare
                      </button>
                    )}
                    <button
                      onClick={() => handleRestore(version)}
                      className="rounded border border-studio-border px-2 py-0.5 text-[10px] text-studio-text-muted hover:text-studio-text hover:border-studio-accent transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-studio-text-muted">{version.change_summary}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Diff view */}
      {diffVersions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-semibold text-studio-text">
              Comparing v{diffVersions[0].version_number} → v{diffVersions[1].version_number}
            </h4>
            <button
              onClick={() => setDiffVersions(null)}
              className="text-[10px] text-studio-text-muted hover:text-studio-text transition-colors"
            >
              Close diff
            </button>
          </div>
          <DesignDiff
            graphA={diffVersions[0].graph}
            graphB={diffVersions[1].graph}
            labelA={`v${diffVersions[0].version_number}`}
            labelB={`v${diffVersions[1].version_number}`}
          />
        </div>
      )}
    </div>
  );
}
