'use client';

type BadgeVariant =
  | 'valid'
  | 'warning'
  | 'incomplete'
  | 'invalid'
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'exported'
  | 'new'
  | 'reuse'
  | 'info';

const variantStyles: Record<BadgeVariant, string> = {
  valid: 'bg-green-500/15 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  incomplete: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  invalid: 'bg-red-500/15 text-red-400 border-red-500/30',
  draft: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  reviewed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
  exported: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  new: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  reuse: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export function Badge({ variant, label, className = '' }: BadgeProps) {
  const displayLabel = label || variant.charAt(0).toUpperCase() + variant.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${variantStyles[variant]} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
