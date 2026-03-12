import type { StudioGraph, StudioNode, ValidationResult, ValidationIssue, ValidationRule } from '@openclaw-studio/shared';
import { NodeType, ValidationState } from '@openclaw-studio/shared';
import type { AgentNodeConfig, SkillNodeConfig, ToolNodeConfig, HeartbeatNodeConfig, ApprovalNodeConfig } from '@openclaw-studio/shared';

interface RuleCheck {
  id: string;
  check: (graph: StudioGraph) => ValidationIssue[];
}

function nodesOfType(graph: StudioGraph, type: NodeType): StudioNode[] {
  return graph.nodes.filter((n) => n.type === type);
}


const rules: RuleCheck[] = [
  {
    id: 'agent-has-name',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Agent)) {
        const cfg = node.config as AgentNodeConfig;
        if (!cfg.name || cfg.name.trim() === '') {
          issues.push({ rule_id: 'agent-has-name', node_id: node.id, message: `Agent node "${node.label}" is missing a name`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'agent-has-goal',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Agent)) {
        const cfg = node.config as AgentNodeConfig;
        const goalOrDesc = cfg.goal || cfg.description;
        if (!goalOrDesc || goalOrDesc.trim() === '') {
          issues.push({ rule_id: 'agent-has-goal', node_id: node.id, message: `Agent node "${node.label}" is missing a description/goal`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'agent-has-role',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Agent)) {
        const cfg = node.config as AgentNodeConfig;
        if (!cfg.role || cfg.role.trim() === '') {
          issues.push({ rule_id: 'agent-has-role', node_id: node.id, message: `Agent node "${node.label}" is missing a role`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'skill-has-purpose',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Skill)) {
        const cfg = node.config as SkillNodeConfig;
        if (!cfg.purpose || cfg.purpose.trim() === '') {
          issues.push({ rule_id: 'skill-has-purpose', node_id: node.id, message: `Skill node "${node.label}" is missing a purpose`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  // Note: "skill-has-output" rule removed — OpenClaw skills use SKILL.md with
  // YAML frontmatter and don't require output_schema. It's optional metadata.
  {
    id: 'tool-has-binding',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Tool)) {
        const cfg = node.config as ToolNodeConfig;
        if (!cfg.binding_name || cfg.binding_name.trim() === '') {
          issues.push({ rule_id: 'tool-has-binding', node_id: node.id, message: `Tool node "${node.label}" is missing a binding_name`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'tool-has-type',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Tool)) {
        const cfg = node.config as ToolNodeConfig;
        if (!cfg.tool_type || cfg.tool_type.trim() === '') {
          issues.push({ rule_id: 'tool-has-type', node_id: node.id, message: `Tool node "${node.label}" is missing a tool_type`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'heartbeat-has-schedule',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Heartbeat)) {
        const cfg = node.config as HeartbeatNodeConfig;
        if (!cfg.schedule || cfg.schedule.trim() === '') {
          issues.push({ rule_id: 'heartbeat-has-schedule', node_id: node.id, message: `Heartbeat node "${node.label}" is missing a schedule`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'heartbeat-has-mode',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Heartbeat)) {
        const cfg = node.config as HeartbeatNodeConfig;
        if (!cfg.mode) {
          issues.push({ rule_id: 'heartbeat-has-mode', node_id: node.id, message: `Heartbeat node "${node.label}" is missing a mode`, severity: 'error' });
        }
      }
      return issues;
    },
  },
  {
    id: 'approval-has-rationale',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Approval)) {
        const cfg = node.config as ApprovalNodeConfig;
        if (!cfg.rationale || cfg.rationale.trim() === '') {
          issues.push({ rule_id: 'approval-has-rationale', node_id: node.id, message: `Approval node "${node.label}" should have a rationale`, severity: 'warning' });
        }
      }
      return issues;
    },
  },
  {
    id: 'graph-has-agent',
    check: (graph) => {
      const agents = nodesOfType(graph, NodeType.Agent);
      if (agents.length === 0) {
        return [{ rule_id: 'graph-has-agent', message: 'Graph must contain at least one agent node', severity: 'error' }];
      }
      return [];
    },
  },
  // Note: "no-orphan-agents" rule removed — OpenClaw agents are independent
  // and communicate via channel bindings, not canvas edges. Unconnected
  // agent nodes are normal and expected.
  {
    id: 'no-disconnected-tools',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of nodesOfType(graph, NodeType.Tool)) {
        const connected = graph.edges.some((e) => {
          if (e.source === node.id || e.target === node.id) {
            const otherId = e.source === node.id ? e.target : e.source;
            const otherNode = graph.nodes.find((n) => n.id === otherId);
            return otherNode && (otherNode.type === NodeType.Skill || otherNode.type === NodeType.Agent);
          }
          return false;
        });
        if (!connected) {
          issues.push({ rule_id: 'no-disconnected-tools', node_id: node.id, message: `Tool node "${node.label}" is not connected to any skill or agent`, severity: 'warning' });
        }
      }
      return issues;
    },
  },
  {
    id: 'reused-asset-ref-present',
    check: (graph) => {
      const issues: ValidationIssue[] = [];
      for (const node of graph.nodes) {
        const cfg = node.config as { reuse_mode?: string; existing_asset_ref?: string };
        if (cfg.reuse_mode === 'existing' && (!node.reused_asset_ref && !cfg.existing_asset_ref)) {
          issues.push({ rule_id: 'reused-asset-ref-present', node_id: node.id, message: `Node "${node.label}" has reuse_mode "existing" but no reused_asset_ref is set`, severity: 'error' });
        }
      }
      return issues;
    },
  },
];

const RULE_DESCRIPTIONS: ValidationRule[] = [
  { id: 'agent-has-name', node_type: NodeType.Agent, description: 'Agent nodes must have a name', severity: 'error' },
  { id: 'agent-has-goal', node_type: NodeType.Agent, description: 'Agent nodes must have a goal', severity: 'error' },
  { id: 'agent-has-role', node_type: NodeType.Agent, description: 'Agent nodes must have a role', severity: 'error' },
  { id: 'skill-has-purpose', node_type: NodeType.Skill, description: 'Skill nodes must have a purpose', severity: 'error' },
  { id: 'tool-has-binding', node_type: NodeType.Tool, description: 'Tool nodes must have a binding_name', severity: 'error' },
  { id: 'tool-has-type', node_type: NodeType.Tool, description: 'Tool nodes must have a tool_type', severity: 'error' },
  { id: 'heartbeat-has-schedule', node_type: NodeType.Heartbeat, description: 'Heartbeat nodes must have a schedule', severity: 'error' },
  { id: 'heartbeat-has-mode', node_type: NodeType.Heartbeat, description: 'Heartbeat nodes must have a mode', severity: 'error' },
  { id: 'approval-has-rationale', node_type: NodeType.Approval, description: 'Approval nodes should have a rationale', severity: 'warning' },
  { id: 'graph-has-agent', description: 'Graph must contain at least one agent node', severity: 'error' },
  { id: 'no-orphan-agents', node_type: NodeType.Agent, description: 'Agent nodes should have at least one edge', severity: 'warning' },
  { id: 'no-disconnected-tools', node_type: NodeType.Tool, description: 'Tool nodes should be connected to at least one skill or agent', severity: 'warning' },
  { id: 'reused-asset-ref-present', description: 'Nodes with reuse_mode "existing" must have reused_asset_ref set', severity: 'error' },
];

export class ValidationService {
  async validate(graph: StudioGraph): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Run all rule checks
    for (const rule of rules) {
      const issues = rule.check(graph);
      for (const issue of issues) {
        if (issue.severity === 'error') {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    // Build a map of node_id -> issues for setting validation_state
    const nodeIssues = new Map<string, { hasError: boolean; hasWarning: boolean }>();
    for (const issue of [...errors, ...warnings]) {
      if (issue.node_id) {
        const current = nodeIssues.get(issue.node_id) || { hasError: false, hasWarning: false };
        if (issue.severity === 'error') current.hasError = true;
        if (issue.severity === 'warning') current.hasWarning = true;
        nodeIssues.set(issue.node_id, current);
      }
    }

    // Update validation_state on each node in the graph (mutates the input for caller convenience)
    for (const node of graph.nodes) {
      const issues = nodeIssues.get(node.id);
      if (issues?.hasError) {
        node.validation_state = ValidationState.Invalid;
      } else if (issues?.hasWarning) {
        node.validation_state = ValidationState.Warning;
      } else {
        // Check if node is incomplete (missing optional but important configs)
        const cfg = node.config as unknown as Record<string, unknown>;
        const hasAllRequired = Object.values(cfg).every((v) => v !== undefined && v !== '');
        node.validation_state = hasAllRequired ? ValidationState.Valid : ValidationState.Incomplete;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getRules(): ValidationRule[] {
    return RULE_DESCRIPTIONS;
  }
}

export const validationService = new ValidationService();
