'use client';

import { useState } from 'react';
import { ArchitectureSummary } from './ArchitectureSummary';
import { ValidationReport } from './ValidationReport';
import { ExportPreview } from './ExportPreview';
import { NewAssetsReport } from './NewAssetsReport';
import { ReuseReport } from './ReuseReport';
import { VersionHistory } from '@/components/versioning/VersionHistory';

type OutputTab = 'architecture' | 'validation' | 'new-assets' | 'reuse' | 'export' | 'versions';

const TAB_LABELS: Record<OutputTab, string> = {
  architecture: 'Architecture Summary',
  validation: 'Validation',
  'new-assets': 'New Assets',
  reuse: 'Reuse Report',
  export: 'Export Preview',
  versions: 'Version History',
};

const TAB_ORDER: OutputTab[] = ['architecture', 'validation', 'new-assets', 'reuse', 'export', 'versions'];

export function OutputTabs() {
  const [activeTab, setActiveTab] = useState<OutputTab>('architecture');

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-studio-border overflow-x-auto">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-studio-accent text-studio-accent'
                : 'text-studio-text-muted hover:text-studio-text'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'architecture' && <ArchitectureSummary />}
        {activeTab === 'validation' && <ValidationReport />}
        {activeTab === 'new-assets' && <NewAssetsReport />}
        {activeTab === 'reuse' && <ReuseReport />}
        {activeTab === 'export' && <ExportPreview />}
        {activeTab === 'versions' && <VersionHistory />}
      </div>
    </div>
  );
}
