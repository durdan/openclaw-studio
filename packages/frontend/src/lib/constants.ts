export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const NODE_COLORS: Record<string, string> = {
  agent: '#6366f1',
  skill: '#10b981',
  tool: '#f59e0b',
  trigger: '#06b6d4',
  condition: '#f97316',
  approval: '#f43f5e',
  output: '#a855f7',
  workspace: '#14b8a6',
  heartbeat: '#ec4899',
  template_reference: '#94a3b8',
};

export const NODE_LABELS: Record<string, string> = {
  agent: 'Agent',
  skill: 'Skill',
  tool: 'Tool',
  trigger: 'Trigger',
  condition: 'Condition',
  approval: 'Approval',
  output: 'Output',
  workspace: 'Workspace',
  heartbeat: 'Heartbeat',
  template_reference: 'Template Ref',
};
