import type { StudioTemplate } from '@openclaw-studio/shared';
import { NodeType, EdgeRelationType, ValidationState } from '@openclaw-studio/shared';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';

interface TemplateRow {
  id: string;
  name: string;
  template_type: string;
  description: string;
  template_json: string;
  created_at: string;
  updated_at: string;
}

function parseRow(row: TemplateRow): StudioTemplate {
  return {
    id: row.id,
    name: row.name,
    template_type: row.template_type,
    description: row.description,
    template_json: JSON.parse(row.template_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function makeGraphSeed(
  agentName: string,
  agentRole: string,
  agentGoal: string,
  skillNames: string[],
  toolNames: string[],
  hasTrigger: boolean,
  hasHeartbeat: boolean,
  hasApproval: boolean,
) {
  const now = new Date().toISOString();
  const topId = uuidv4();
  const nodes: any[] = [];
  const edges: any[] = [];

  nodes.push({
    id: topId,
    type: NodeType.Agent,
    label: agentName,
    config: { name: agentName, role: agentRole, goal: agentGoal, description: `Top-level agent for ${agentName}`, reuse_mode: 'new' },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: { x: 400, y: 50 },
  });

  let skillX = 150;
  for (const sn of skillNames) {
    const id = uuidv4();
    nodes.push({
      id,
      type: NodeType.Skill,
      label: sn,
      config: { name: sn, purpose: `${sn} capability`, prompt_summary: `Execute ${sn}`, reuse_mode: 'new' },
      proposed_new: true,
      validation_state: ValidationState.Incomplete,
      position: { x: skillX, y: 350 },
    });
    edges.push({ id: uuidv4(), source: topId, target: id, relation_type: EdgeRelationType.Invokes });
    skillX += 180;
  }

  let toolX = 150;
  for (const tn of toolNames) {
    const id = uuidv4();
    nodes.push({
      id,
      type: NodeType.Tool,
      label: tn,
      config: { tool_type: 'api', binding_name: tn, allowed_actions: ['read', 'write'], reuse_mode: 'new' },
      proposed_new: true,
      validation_state: ValidationState.Incomplete,
      position: { x: toolX, y: 500 },
    });
    edges.push({ id: uuidv4(), source: topId, target: id, relation_type: EdgeRelationType.Uses });
    toolX += 180;
  }

  if (hasTrigger) {
    const id = uuidv4();
    nodes.push({
      id,
      type: NodeType.Trigger,
      label: 'Schedule Trigger',
      config: { trigger_type: 'schedule', source: 'cron', schedule: '0 9 * * *' },
      proposed_new: true,
      validation_state: ValidationState.Incomplete,
      position: { x: 100, y: 50 },
    });
    edges.push({ id: uuidv4(), source: id, target: topId, relation_type: EdgeRelationType.Triggers });
  }

  if (hasHeartbeat) {
    const id = uuidv4();
    nodes.push({
      id,
      type: NodeType.Heartbeat,
      label: 'Heartbeat',
      config: { mode: 'cron', schedule: '0 9 * * *', purpose: 'Periodic health check' },
      proposed_new: true,
      validation_state: ValidationState.Incomplete,
      position: { x: 700, y: 50 },
    });
    edges.push({ id: uuidv4(), source: id, target: topId, relation_type: EdgeRelationType.ManagedBy });
  }

  if (hasApproval) {
    const id = uuidv4();
    nodes.push({
      id,
      type: NodeType.Approval,
      label: 'Approval Gate',
      config: { required: true, reviewer_type: 'human', rationale: 'Human review required' },
      proposed_new: true,
      validation_state: ValidationState.Incomplete,
      position: { x: 400, y: 650 },
    });
    edges.push({ id: uuidv4(), source: topId, target: id, relation_type: EdgeRelationType.Approves });
  }

  return {
    nodes,
    edges,
    metadata: { name: agentName, description: `Graph seed for ${agentName}`, created_at: now, updated_at: now, version: 1 },
  };
}

const DEFAULT_TEMPLATES: Array<{
  name: string;
  description: string;
  template_json: Record<string, unknown>;
}> = [
  {
    name: 'Inbox Triage',
    description: 'Email monitoring and triage agent architecture. Automatically reads, classifies, and routes incoming emails.',
    template_json: {
      planner_output: {
        use_case_summary: 'Monitor inbox and triage emails by priority and category',
        recommended_architecture_name: 'Email Triage Pipeline',
        top_level_goal: 'Automatically classify and route incoming emails',
      },
      graph_seed: makeGraphSeed(
        'Email Triage Coordinator',
        'Email classifier and router',
        'Read, classify, and route incoming emails',
        ['email_reading', 'classification', 'email_drafting'],
        ['gmail'],
        true,
        true,
        false,
      ),
    },
  },
  {
    name: 'Compliance Monitor',
    description: 'Continuous compliance monitoring architecture. Checks actions and data against regulatory policies.',
    template_json: {
      planner_output: {
        use_case_summary: 'Monitor system for compliance violations and report findings',
        recommended_architecture_name: 'Compliance Monitor',
        top_level_goal: 'Continuously verify compliance and flag violations',
      },
      graph_seed: makeGraphSeed(
        'Compliance Coordinator',
        'Compliance monitor',
        'Monitor and verify compliance with regulations',
        ['policy_checking', 'report_generation'],
        ['db_query'],
        true,
        true,
        true,
      ),
    },
  },
  {
    name: 'DevOps Incident Review',
    description: 'Incident response and review architecture. Analyzes alerts, triages incidents, and coordinates response.',
    template_json: {
      planner_output: {
        use_case_summary: 'Analyze DevOps incidents, triage by severity, and coordinate response',
        recommended_architecture_name: 'Incident Response Pipeline',
        top_level_goal: 'Quickly triage and respond to production incidents',
      },
      graph_seed: makeGraphSeed(
        'Incident Coordinator',
        'Incident response orchestrator',
        'Triage and coordinate incident response',
        ['incident_analysis', 'classification', 'notification_drafting'],
        ['slack', 'pagerduty'],
        true,
        true,
        true,
      ),
    },
  },
  {
    name: 'Daily Reporting',
    description: 'Automated daily reporting architecture. Gathers data, generates reports, and distributes them on schedule.',
    template_json: {
      planner_output: {
        use_case_summary: 'Generate and distribute daily reports from multiple data sources',
        recommended_architecture_name: 'Daily Reporting Pipeline',
        top_level_goal: 'Produce comprehensive daily reports automatically',
      },
      graph_seed: makeGraphSeed(
        'Reporting Coordinator',
        'Report generator',
        'Gather data and produce daily reports',
        ['data_aggregation', 'report_generation'],
        ['db_query', 'gmail'],
        true,
        true,
        false,
      ),
    },
  },
  {
    name: 'Support Escalation',
    description: 'Customer support escalation architecture. Handles support tickets, triages, responds, and escalates complex issues.',
    template_json: {
      planner_output: {
        use_case_summary: 'Handle customer support tickets with automatic triage and escalation',
        recommended_architecture_name: 'Support Escalation Pipeline',
        top_level_goal: 'Efficiently handle and escalate customer support requests',
      },
      graph_seed: makeGraphSeed(
        'Support Coordinator',
        'Support orchestrator',
        'Triage, respond to, and escalate support tickets',
        ['classification', 'response_drafting', 'escalation_routing'],
        ['helpdesk', 'slack'],
        true,
        false,
        true,
      ),
    },
  },
];

export class TemplateService {
  private seeded = false;

  private seedDefaults(): void {
    if (this.seeded) return;
    this.seeded = true;

    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM studio_templates').get() as { cnt: number };
    if (count.cnt > 0) return;

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO studio_templates (id, name, template_type, description, template_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tmpl of DEFAULT_TEMPLATES) {
      insert.run(
        uuidv4(),
        tmpl.name,
        'architecture',
        tmpl.description,
        JSON.stringify(tmpl.template_json),
        now,
        now,
      );
    }

    console.log(`Seeded ${DEFAULT_TEMPLATES.length} default templates.`);
  }

  async list(): Promise<StudioTemplate[]> {
    this.seedDefaults();
    const db = getDb();
    const rows = db.prepare('SELECT * FROM studio_templates ORDER BY name ASC').all() as TemplateRow[];
    return rows.map(parseRow);
  }

  async getById(id: string): Promise<StudioTemplate | null> {
    this.seedDefaults();
    const db = getDb();
    const row = db.prepare('SELECT * FROM studio_templates WHERE id = ?').get(id) as TemplateRow | undefined;
    if (!row) return null;
    return parseRow(row);
  }

  async create(data: Partial<StudioTemplate>): Promise<StudioTemplate> {
    this.seedDefaults();
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO studio_templates (id, name, template_type, description, template_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name || 'New Template',
      data.template_type || 'architecture',
      data.description || '',
      JSON.stringify(data.template_json || {}),
      now,
      now,
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: Partial<StudioTemplate>): Promise<StudioTemplate | null> {
    this.seedDefaults();
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.template_type !== undefined) { fields.push('template_type = ?'); values.push(data.template_type); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.template_json !== undefined) { fields.push('template_json = ?'); values.push(JSON.stringify(data.template_json)); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE studio_templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return (await this.getById(id))!;
  }

  async delete(id: string): Promise<boolean> {
    this.seedDefaults();
    const db = getDb();
    const result = db.prepare('DELETE FROM studio_templates WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const templateService = new TemplateService();
