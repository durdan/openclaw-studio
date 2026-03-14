'use client';

import { useDesignStore } from '@/store/design.store';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export type AppView = 'home' | 'studio' | 'templates' | 'gateway' | 'wizard';

interface AppSidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const activeDesign = useDesignStore((s) => s.activeDesign);

  return (
    <div className="flex h-full w-[200px] flex-col border-r border-studio-border bg-studio-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-studio-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-studio-accent/20">
          <svg className="h-4.5 w-4.5 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-studio-text leading-none">OpenClaw</h1>
          <p className="text-[10px] text-studio-text-muted">Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {/* BUILD Section */}
        <div>
          <p className="px-2 mb-1.5 text-[10px] font-semibold text-studio-text-muted/60 uppercase tracking-wider">Build</p>
          <ul className="space-y-0.5">
            <SidebarItem
              icon={<HomeIcon />}
              label="Home"
              active={activeView === 'home'}
              onClick={() => onNavigate('home')}
            />
            <SidebarItem
              icon={<WizardIcon />}
              label="Setup Wizard"
              active={activeView === 'wizard'}
              onClick={() => onNavigate('wizard')}
            />
            <SidebarItem
              icon={<CanvasIcon />}
              label="Design Studio"
              active={activeView === 'studio'}
              onClick={() => onNavigate('studio')}
              badge={activeDesign ? '1' : undefined}
            />
            <SidebarItem
              icon={<TemplateIcon />}
              label="Templates"
              active={activeView === 'templates'}
              onClick={() => onNavigate('templates')}
            />
          </ul>
        </div>

        {/* OPERATE Section */}
        <div>
          <p className="px-2 mb-1.5 text-[10px] font-semibold text-studio-text-muted/60 uppercase tracking-wider">Operate</p>
          <ul className="space-y-0.5">
            <SidebarItem
              icon={<GatewayIcon />}
              label="Gateway Status"
              active={activeView === 'gateway'}
              onClick={() => onNavigate('gateway')}
            />
          </ul>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-studio-border px-2 py-2 space-y-1">
        <ThemeToggle />
        <p className="px-2.5 text-[10px] text-studio-text-muted/40">v0.1</p>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
          active
            ? 'bg-studio-accent/15 text-studio-accent'
            : 'text-studio-text-muted hover:text-studio-text hover:bg-studio-bg/50'
        }`}
      >
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-studio-accent/20 text-studio-accent text-[10px] font-bold">
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}

// Icons
function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function WizardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function GatewayIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}
