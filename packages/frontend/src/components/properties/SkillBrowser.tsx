'use client';

import { useState, useCallback, useRef } from 'react';
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const data = await api.post<{ results: unknown }>('/publish/gateway/skills/search', { query: q });
      const raw = data.results;
      // Gateway may return array or object with skills
      const skills = Array.isArray(raw) ? raw : (raw as Record<string, unknown>)?.skills || [];
      setResults(skills as ClawHubSkill[]);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed — is the gateway running?');
      setResults([]);
      setSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      search(query);
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="rounded-lg border border-studio-accent/30 bg-studio-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-studio-accent/5 border-b border-studio-accent/20">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-studio-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="text-[10px] font-semibold text-studio-accent">ClawHub Skill Search</span>
        </div>
        <button onClick={onClose} className="text-studio-text-muted hover:text-studio-text transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

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
            <p className="text-[10px] text-studio-text-muted mt-1">
              Tip: The gateway must be running for skill search to work.
              You can still type a skill name manually.
            </p>
          </div>
        )}

        {!isSearching && !error && searched && results.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] text-studio-text-muted">No skills found for &quot;{query}&quot;</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="px-2 pb-2 space-y-1">
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
                </div>
                {(skill.description || skill.summary) && (
                  <span className="text-[10px] text-studio-text-muted line-clamp-2 mt-0.5">
                    {skill.description || skill.summary}
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

        {!searched && !isSearching && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px] text-studio-text-muted">Search ClawHub for real OpenClaw skills</p>
            <p className="text-[9px] text-studio-text-muted/60 mt-1">Requires gateway connection</p>
          </div>
        )}
      </div>
    </div>
  );
}
