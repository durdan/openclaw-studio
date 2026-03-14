'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface ClawHubSkill {
  name: string;
  slug: string;
  description?: string;
  summary?: string;
  version?: string;
  tags?: string[];
  author?: string;
  downloads?: number;
}

interface SyncState {
  status: 'pending' | 'syncing' | 'success' | 'error';
  skill_count: number;
  error_message?: string;
}

interface SkillBrowserProps {
  onSelect: (skill: ClawHubSkill) => void;
  onClose: () => void;
}

export function SkillBrowser({ onSelect, onClose }: SkillBrowserProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClawHubSkill[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check sync status on mount
  useEffect(() => {
    api.get<SyncState>('/clawhub/sync/status')
      .then(setSyncState)
      .catch(() => {/* ignore */});
  }, []);

  // Load popular skills on mount (empty query)
  useEffect(() => {
    if (syncState?.status === 'success' && syncState.skill_count > 0) {
      api.get<{ skills: ClawHubSkill[] }>('/clawhub/skills/search?q=&limit=10')
        .then((data) => {
          if (!searched && data.skills?.length) {
            setResults(data.skills);
          }
        })
        .catch(() => {/* ignore */});
    }
  }, [syncState, searched]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const data = await api.get<{ skills: ClawHubSkill[] }>(
        `/clawhub/skills/search?q=${encodeURIComponent(q)}&limit=20`,
      );
      setResults(data.skills || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      search(query);
    }
    if (e.key === 'Escape') onClose();
  };

  const triggerSync = async () => {
    try {
      await api.post('/clawhub/sync/trigger');
      setSyncState((prev) => prev ? { ...prev, status: 'syncing' } : { status: 'syncing', skill_count: 0 });
    } catch {/* ignore */}
  };

  const isSyncing = syncState?.status === 'syncing';
  const isSyncError = syncState?.status === 'error';
  const hasSkills = (syncState?.skill_count || 0) > 0;

  return (
    <div className="rounded-lg border border-studio-accent/30 bg-studio-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-studio-accent/5 border-b border-studio-accent/20">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-studio-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="text-[10px] font-semibold text-studio-accent">ClawHub Skill Search</span>
          {hasSkills && (
            <span className="text-[8px] text-studio-text-muted">
              ({syncState!.skill_count.toLocaleString()} skills)
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-studio-text-muted hover:text-studio-text transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sync status banner */}
      {isSyncing && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-studio-accent/5 border-b border-studio-accent/10">
          <svg className="w-3 h-3 animate-spin text-studio-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[9px] text-studio-accent">Indexing ClawHub skills...</span>
        </div>
      )}
      {isSyncError && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-red-500/5 border-b border-red-500/10">
          <span className="text-[9px] text-red-400">
            Sync error: {syncState?.error_message || 'Unknown'}
          </span>
          <button onClick={triggerSync} className="text-[9px] text-studio-accent hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search skills (e.g. email, github, scraping...)"
          className="w-full rounded border border-studio-border bg-studio-surface px-2.5 py-1.5 text-xs text-studio-text placeholder:text-studio-text-muted/50 focus:border-studio-accent focus:outline-none"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="max-h-[240px] overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-6">
            <svg className="w-4 h-4 animate-spin text-studio-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {error && (
          <div className="px-3 py-3">
            <p className="text-[10px] text-red-400">{error}</p>
          </div>
        )}

        {!isSearching && !error && searched && results.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] text-studio-text-muted">No skills found for &quot;{query}&quot;</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="px-2 pb-2 space-y-1">
            {!searched && (
              <p className="text-[9px] text-studio-text-muted px-1 py-1">Popular skills</p>
            )}
            {results.map((skill, i) => (
              <button
                key={skill.slug || skill.name || i}
                onClick={() => onSelect(skill)}
                className="flex flex-col w-full rounded-lg border border-studio-border bg-studio-surface hover:border-studio-accent/40 px-3 py-2 text-left transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-studio-text">{skill.name || skill.slug}</span>
                  {skill.version && (
                    <span className="text-[9px] text-studio-text-muted font-mono">v{skill.version}</span>
                  )}
                  {skill.author && (
                    <span className="text-[9px] text-studio-text-muted">by {skill.author}</span>
                  )}
                </div>
                {skill.description && (
                  <span className="text-[10px] text-studio-text-muted line-clamp-2 mt-0.5">
                    {skill.description}
                  </span>
                )}
                {skill.tags && skill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {skill.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[8px] text-studio-accent bg-studio-accent/10 rounded px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {!searched && !isSearching && results.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] text-studio-text-muted">
              {hasSkills
                ? `Search ${syncState!.skill_count.toLocaleString()} indexed ClawHub skills`
                : 'ClawHub skills are being indexed...'}
            </p>
            <p className="text-[9px] text-studio-text-muted/60 mt-1">Local search — no gateway required</p>
          </div>
        )}
      </div>
    </div>
  );
}
