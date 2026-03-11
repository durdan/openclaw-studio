import type { NodeTypes } from '@xyflow/react';
import { AgentNode } from './AgentNode';
import { SkillNode } from './SkillNode';
import { ToolNode } from './ToolNode';
import { TriggerNode } from './TriggerNode';
import { ConditionNode } from './ConditionNode';
import { ApprovalNode } from './ApprovalNode';
import { OutputNode } from './OutputNode';
import { WorkspaceNode } from './WorkspaceNode';
import { HeartbeatNode } from './HeartbeatNode';
import { TemplateRefNode } from './TemplateRefNode';

export const nodeTypes: NodeTypes = {
  agent: AgentNode,
  skill: SkillNode,
  tool: ToolNode,
  trigger: TriggerNode,
  condition: ConditionNode,
  approval: ApprovalNode,
  output: OutputNode,
  workspace: WorkspaceNode,
  heartbeat: HeartbeatNode,
  template_reference: TemplateRefNode,
};

export {
  AgentNode,
  SkillNode,
  ToolNode,
  TriggerNode,
  ConditionNode,
  ApprovalNode,
  OutputNode,
  WorkspaceNode,
  HeartbeatNode,
  TemplateRefNode,
};
