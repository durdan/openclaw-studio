'use client';

import { useState } from 'react';
import { DesignList } from './DesignList';
import { AssetBrowser } from './AssetBrowser';
import { TemplateList } from './TemplateList';

type SidebarTab = 'designs' | 'assets' | 'templates';

export function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('designs');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-studio-border p-3">
        <h1 className="text-sm font-bold text-studio-accent">OpenClaw Studio</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-studio-border">
        {(['designs', 'assets', 'templates'] as SidebarTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-studio-accent text-studio-accent'
                : 'text-studio-text-muted hover:text-studio-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'designs' && <DesignList />}
        {activeTab === 'assets' && <AssetBrowser />}
        {activeTab === 'templates' && <TemplateList />}
      </div>
    </div>
  );
}
