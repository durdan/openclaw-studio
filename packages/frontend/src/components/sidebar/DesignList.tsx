'use client';

import { useEffect, useState } from 'react';
import { useDesignStore } from '@/store/design.store';

export function DesignList() {
  const designs = useDesignStore((s) => s.designs);
  const activeDesign = useDesignStore((s) => s.activeDesign);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const createDesign = useDesignStore((s) => s.createDesign);
  const deleteDesign = useDesignStore((s) => s.deleteDesign);
  const setActiveDesign = useDesignStore((s) => s.setActiveDesign);
  const isLoading = useDesignStore((s) => s.isLoading);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createDesign(newName.trim(), '');
    setNewName('');
    setShowNewForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDesign(id);
    setConfirmDeleteId(null);
  };

  const handleSelect = (design: typeof designs[0]) => {
    if (activeDesign?.id === design.id) return;
    // Try to load from API, fall back to setting directly
    loadDesign(design.id).catch(() => {
      setActiveDesign(design);
    });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/20 text-gray-400',
      reviewed: 'bg-blue-500/20 text-blue-400',
      approved: 'bg-green-500/20 text-green-400',
      exported: 'bg-purple-500/20 text-purple-400',
    };
    return (
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${colors[status] || colors.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-studio-text-muted uppercase">Designs</span>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="text-xs text-studio-accent hover:text-studio-accent-hover transition-colors"
        >
          + New
        </button>
      </div>

      {showNewForm && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Design name..."
            autoFocus
            className="w-full rounded border border-studio-border bg-studio-bg px-2 py-1.5 text-xs text-studio-text focus:border-studio-accent focus:outline-none"
          />
          <div className="flex gap-1">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 rounded bg-studio-accent px-2 py-1 text-xs text-white hover:bg-studio-accent-hover disabled:opacity-50 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewName(''); }}
              className="flex-1 rounded border border-studio-border px-2 py-1 text-xs text-studio-text-muted hover:text-studio-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && designs.length === 0 && (
        <p className="text-xs text-studio-text-muted">Loading designs...</p>
      )}

      {!isLoading && designs.length === 0 && (
        <p className="text-xs text-studio-text-muted">No designs yet. Create one to get started.</p>
      )}

      <ul className="space-y-1">
        {designs.map((design) => (
          <li
            key={design.id}
            onClick={() => handleSelect(design)}
            className={`cursor-pointer rounded px-2 py-1.5 text-xs transition-colors group ${
              activeDesign?.id === design.id
                ? 'bg-studio-accent/10 border border-studio-accent/30'
                : 'hover:bg-studio-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-studio-text truncate flex-1">{design.name}</div>
              {confirmDeleteId === design.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(design.id); }}
                    className="text-[9px] text-red-400 hover:text-red-300"
                  >
                    Yes
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    className="text-[9px] text-studio-text-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(design.id); }}
                  className="text-[9px] text-studio-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  Del
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {statusBadge(design.status)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
