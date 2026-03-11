import type {
  PlannerInput,
  PlannerOutput,
  AgentSuggestion,
  SkillSuggestion,
  ToolSuggestion,
  TriggerSuggestion,
  HeartbeatSuggestion,
  ApprovalSuggestion,
  OutputSuggestion,
  StudioGraph,
  StudioNode,
  StudioEdge,
} from '@openclaw-studio/shared';
import { NodeType, EdgeRelationType, ValidationState } from '@openclaw-studio/shared';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesAny(prompt: string, keywords: string[]): boolean {
  const lower = prompt.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function buildEdge(source: string, target: string, relationType: EdgeRelationType): StudioEdge {
  return { id: uuidv4(), source, target, relation_type: relationType };
}

// ---------------------------------------------------------------------------
// Node builders (now with full OpenClaw config support)
// ---------------------------------------------------------------------------

interface AgentSpec {
  name: string;
  role: string;
  goal: string;
  description: string;
  personality: string;
  boundaries: string[];
  communication_style: string;
  operating_guidelines: string;
  model_primary: string;
  temperature: number;
  timeout_seconds: number;
  max_tokens?: number;
}

function buildAgentNode(id: string, spec: AgentSpec, position: { x: number; y: number }): StudioNode {
  return {
    id,
    type: NodeType.Agent,
    label: spec.name,
    config: {
      name: spec.name,
      role: spec.role,
      goal: spec.goal,
      description: spec.description,
      model: spec.model_primary,
      personality: spec.personality,
      communication_style: spec.communication_style,
      dont_rules: spec.boundaries,
      responsibilities: spec.operating_guidelines ? spec.operating_guidelines.split('\n').filter(Boolean) : [],
      temperature: spec.temperature,
      timeout_seconds: spec.timeout_seconds,
      max_tokens: spec.max_tokens ?? 4096,
      reuse_mode: 'new' as const,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

interface SkillSpec {
  name: string;
  purpose: string;
  prompt_summary: string;
  user_invocable: boolean;
  tags: string[];
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

function buildSkillNode(id: string, spec: SkillSpec, position: { x: number; y: number }): StudioNode {
  return {
    id,
    type: NodeType.Skill,
    label: spec.name,
    config: {
      name: spec.name,
      purpose: spec.purpose,
      prompt_summary: spec.prompt_summary,
      user_invocable: spec.user_invocable,
      tags: spec.tags,
      input_schema: spec.input_schema,
      output_schema: spec.output_schema,
      reuse_mode: 'new' as const,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

function buildToolNode(
  id: string,
  toolType: string,
  bindingName: string,
  allowedActions: string[],
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type: NodeType.Tool,
    label: bindingName,
    config: {
      tool_type: toolType,
      binding_name: bindingName,
      allowed_actions: allowedActions,
      reuse_mode: 'new' as const,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

function buildTriggerNode(
  id: string,
  triggerType: 'event' | 'schedule' | 'manual',
  source: string,
  schedule: string | undefined,
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type: NodeType.Trigger,
    label: `${source} trigger`,
    config: {
      trigger_type: triggerType,
      source,
      schedule,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

function buildHeartbeatNode(
  id: string,
  mode: 'interval' | 'cron' | 'event',
  schedule: string,
  purpose: string,
  escalation_summary: string | undefined,
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type: NodeType.Heartbeat,
    label: purpose.length > 30 ? purpose.slice(0, 27) + '...' : purpose,
    config: {
      mode,
      schedule,
      purpose,
      escalation_summary,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

function buildApprovalNode(
  id: string,
  reviewerType: string,
  rationale: string,
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type: NodeType.Approval,
    label: 'Approval Gate',
    config: {
      required: true,
      reviewer_type: reviewerType,
      rationale,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

function buildOutputNode(
  id: string,
  outputType: string,
  destination: string,
  summary: string,
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type: NodeType.Output,
    label: `${outputType} output`,
    config: {
      output_type: outputType,
      destination,
      summary,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

function buildWorkspaceNode(
  id: string,
  notes: string,
  metadataSummary: string,
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type: NodeType.Workspace,
    label: 'Workspace',
    config: {
      notes,
      metadata_summary: metadataSummary,
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position,
  };
}

// ---------------------------------------------------------------------------
// Agent blueprint definitions for each use-case pattern
// ---------------------------------------------------------------------------

interface AgentBlueprint {
  spec: AgentSpec;
  skills: SkillSpec[];
  tools: { toolType: string; bindingName: string; allowedActions: string[] }[];
  heartbeat?: { mode: 'interval' | 'cron' | 'event'; schedule: string; purpose: string; escalation_summary?: string };
  needsWorkspace: boolean;
  needsApproval: boolean;
}

// ---------------------------------------------------------------------------
// Use-case pattern registry
// ---------------------------------------------------------------------------

interface UseCasePattern {
  id: string;
  archName: string;
  keywords: string[];
  /** At least N of the keyword groups must match */
  minMatches: number;
  piAgent: AgentSpec;
  specialists: AgentBlueprint[];
  triggers: TriggerSuggestion[];
  outputs: OutputSuggestion[];
  guardrails: string[];
  assumptions: string[];
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-haiku-35-20241022';

// ---- Pattern: Email Triage & Response ----
const emailTriagePattern: UseCasePattern = {
  id: 'email_triage',
  archName: 'Email Triage & Response Pipeline',
  keywords: ['email', 'inbox', 'mail', 'gmail', 'outlook', 'triage', 'reply', 'draft', 'respond'],
  minMatches: 2,
  piAgent: {
    name: 'Email Operations PI',
    role: 'Primary Intelligence - Email Pipeline Orchestrator',
    goal: 'Route incoming emails to the right specialist, ensure timely and accurate responses, and escalate when necessary',
    description: 'Top-level reasoning engine that receives email events, triages them through specialist agents, and coordinates the full response lifecycle from classification to delivery.',
    personality: 'Calm, methodical, and decisive. Thinks in workflows. Never drops a thread.',
    boundaries: ['Never send emails without human approval for external recipients', 'Do not access attachments containing credentials', 'Escalate anything involving legal, HR, or financial commitments'],
    communication_style: 'Brief status updates with clear next-step assignments. Uses structured handoff messages between agents.',
    operating_guidelines: 'On each email event: 1) Forward to Email Monitor Agent for parsing, 2) Route parsed data to Triage Agent, 3) Based on triage result, invoke Response Drafter or Escalation Agent, 4) Final draft goes through approval before sending.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.3,
    timeout_seconds: 120,
  },
  specialists: [
    {
      spec: {
        name: 'Email Monitor Agent',
        role: 'Inbox Surveillance Specialist',
        goal: 'Continuously monitor shared inbox, extract structured data from every incoming email (sender, subject, body summary, attachments, urgency signals)',
        description: 'Watches the inbox via webhook or polling, parses raw email into structured fields, detects spam/noise, and forwards clean data to downstream agents.',
        personality: 'Detail-oriented and tireless. Treats every email as important until proven otherwise.',
        boundaries: ['Read-only access to inbox', 'Never reply directly', 'Flag but do not delete suspected spam'],
        communication_style: 'Structured JSON payloads with sender, subject, body_summary, urgency_score, detected_intent fields.',
        operating_guidelines: 'When triggered: parse email headers and body, run spam/noise detection, extract key entities (names, dates, amounts), compute urgency score (1-5), output structured EmailEvent object.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 30,
      },
      skills: [
        {
          name: 'email_parsing',
          purpose: 'Parse raw email into structured fields',
          prompt_summary: 'Extract sender, recipients, subject, body text, attachments list, and inline metadata from raw email. Return as structured EmailEvent.',
          user_invocable: false,
          tags: ['email', 'parsing', 'extraction'],
        },
        {
          name: 'spam_detection',
          purpose: 'Detect spam, phishing, and noise emails',
          prompt_summary: 'Analyze email content for spam indicators, phishing patterns, and low-value automated notifications. Return confidence score and classification.',
          user_invocable: false,
          tags: ['email', 'security', 'classification'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'gmail', allowedActions: ['read', 'list', 'get_attachment_metadata'] },
      ],
      heartbeat: { mode: 'interval', schedule: '*/5 * * * *', purpose: 'Poll inbox for new emails every 5 minutes', escalation_summary: 'Alert if inbox polling fails 3 consecutive times' },
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Triage Agent',
        role: 'Email Classification & Priority Specialist',
        goal: 'Classify each email by intent (question, complaint, request, FYI), assign priority (P1-P4), and determine routing destination',
        description: 'Receives parsed email data and applies classification rules to determine priority, category, and which downstream agent should handle it.',
        personality: 'Analytical and fast. Makes firm decisions. Comfortable with ambiguity but always picks a lane.',
        boundaries: ['Classification only - never draft responses', 'Must assign exactly one priority and one category', 'Escalate ambiguous cases as P2 minimum'],
        communication_style: 'Terse classification outputs: { priority, category, routing_target, reasoning }',
        operating_guidelines: 'Apply classification taxonomy: QUESTION, COMPLAINT, REQUEST, ACTION_REQUIRED, FYI, SPAM. Priority matrix: P1=urgent+important, P2=important, P3=normal, P4=low. Route: P1->Escalation, P2/P3->Response Drafter, P4->archive suggestion.',
        model_primary: FAST_MODEL,
        temperature: 0.2,
        timeout_seconds: 30,
      },
      skills: [
        {
          name: 'intent_classification',
          purpose: 'Classify email intent and priority',
          prompt_summary: 'Given parsed email data, determine: intent category (QUESTION/COMPLAINT/REQUEST/ACTION_REQUIRED/FYI), priority level (P1-P4), sentiment (positive/neutral/negative), and recommended routing target.',
          user_invocable: false,
          tags: ['classification', 'nlp', 'triage'],
        },
      ],
      tools: [],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Response Drafter Agent',
        role: 'Professional Email Response Composer',
        goal: 'Draft high-quality, contextually appropriate email responses that match the organization tone and address every point raised',
        description: 'Takes classified email data and drafts a professional response. Uses context from previous conversations, knowledge base, and organizational templates.',
        personality: 'Articulate, empathetic, and thorough. Mirrors the formality level of the sender. Never leaves a question unanswered.',
        boundaries: ['Never promise commitments without approval', 'Do not include internal jargon in external replies', 'Always include a clear call-to-action or next step', 'Max 3 paragraphs unless complexity demands more'],
        communication_style: 'Professional email prose. Adapts tone: formal for executives, friendly for peers, supportive for complaints.',
        operating_guidelines: 'Receive triage output + original email. Check knowledge base for relevant context. Draft response addressing each point. Include greeting, body, action items, sign-off. Submit for approval before sending.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.5,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'response_composition',
          purpose: 'Compose contextual email responses',
          prompt_summary: 'Given the original email, triage classification, and relevant knowledge base context, draft a professional email response. Match sender formality, address all points, and include clear next steps.',
          user_invocable: true,
          tags: ['email', 'writing', 'composition'],
        },
        {
          name: 'knowledge_lookup',
          purpose: 'Search knowledge base for relevant context',
          prompt_summary: 'Query the organizational knowledge base for FAQs, policies, or previous responses relevant to the current email topic. Return top 3 relevant snippets with source references.',
          user_invocable: true,
          tags: ['search', 'knowledge-base', 'context'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'gmail', allowedActions: ['send', 'draft'] },
      ],
      needsWorkspace: true,
      needsApproval: true,
    },
    {
      spec: {
        name: 'Escalation Agent',
        role: 'Urgent Issue Escalation & Notification Specialist',
        goal: 'Immediately escalate P1 issues to the right human stakeholder via the fastest channel available, with full context summary',
        description: 'Handles high-priority items that need human intervention. Packages context, suggests response options, and routes to the right person via Slack, SMS, or direct email.',
        personality: 'Urgent but not panicky. Clear-headed under pressure. Always provides enough context for the recipient to act immediately.',
        boundaries: ['Must notify within 2 minutes of receiving P1 classification', 'Never attempt to resolve P1 issues autonomously', 'Always include original email, triage summary, and suggested actions in escalation'],
        communication_style: 'Alert format: one-line summary, severity badge, full context block, suggested actions list.',
        operating_guidelines: 'On P1 receipt: 1) Format escalation package (summary, full email, triage data, suggested responses), 2) Send to primary on-call via Slack, 3) If no acknowledgment in 5 minutes, send SMS, 4) Log escalation with timestamp.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 15,
      },
      skills: [
        {
          name: 'escalation_packaging',
          purpose: 'Package context for human escalation',
          prompt_summary: 'Bundle original email, triage classification, urgency reasoning, and 2-3 suggested response options into a concise escalation package formatted for quick human review.',
          user_invocable: false,
          tags: ['escalation', 'formatting', 'notification'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'slack', allowedActions: ['send_message', 'send_dm'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
  ],
  triggers: [{ trigger_type: 'event', source: 'email_webhook' }],
  outputs: [
    { output_type: 'email_response', destination: 'gmail', summary: 'Approved email responses sent to original senders' },
    { output_type: 'notification', destination: 'slack', summary: 'Escalation alerts and status updates sent to team Slack channels' },
  ],
  guardrails: ['Content filtering on outbound emails', 'Rate limiting: max 50 auto-responses per hour', 'PII detection before external sends', 'Approval required for all external-facing responses'],
  assumptions: ['Gmail API credentials configured', 'Slack workspace integration active', 'Knowledge base populated with FAQ content'],
};

// ---- Pattern: Customer Support ----
const customerSupportPattern: UseCasePattern = {
  id: 'customer_support',
  archName: 'Customer Support Automation Pipeline',
  keywords: ['support', 'helpdesk', 'help desk', 'ticket', 'customer', 'service', 'complaint', 'issue'],
  minMatches: 1,
  piAgent: {
    name: 'Support Operations PI',
    role: 'Primary Intelligence - Customer Support Orchestrator',
    goal: 'Deliver fast, accurate, and empathetic customer support by routing tickets to specialist agents and ensuring resolution quality',
    description: 'Orchestrates the customer support pipeline from ticket intake through resolution. Routes to specialists based on issue type, tracks SLAs, and ensures consistent quality.',
    personality: 'Service-obsessed and metrics-driven. Treats every customer interaction as a brand moment.',
    boundaries: ['Never close a ticket without customer confirmation', 'Escalate any issue unresolved after 2 agent attempts', 'Do not access payment or billing systems directly'],
    communication_style: 'Structured handoffs with ticket context. Internal: concise. Customer-facing: warm and professional.',
    operating_guidelines: 'On ticket creation: 1) Route to Intake Agent for classification, 2) Assign to appropriate specialist, 3) Monitor resolution time against SLA, 4) Trigger escalation if SLA breach imminent, 5) Request customer satisfaction rating on close.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.3,
    timeout_seconds: 120,
  },
  specialists: [
    {
      spec: {
        name: 'Ticket Intake Agent',
        role: 'Support Ticket Classification Specialist',
        goal: 'Parse every incoming support ticket, classify by type and urgency, extract key details, and route to the correct specialist queue',
        description: 'First touchpoint for all support tickets. Parses freeform customer messages into structured ticket data with category, urgency, and initial response.',
        personality: 'Quick and precise. Acknowledges the customer immediately. Never makes the customer repeat themselves.',
        boundaries: ['Classification only - do not attempt resolution', 'Always send an acknowledgment within 30 seconds', 'Flag abusive language for human review'],
        communication_style: 'Customer-facing: warm acknowledgment. Internal: structured ticket JSON.',
        operating_guidelines: 'On ticket receipt: 1) Send auto-acknowledgment, 2) Parse customer message for issue type, product, urgency signals, 3) Classify into: BILLING, TECHNICAL, ACCOUNT, FEATURE_REQUEST, OTHER, 4) Route to specialist queue.',
        model_primary: FAST_MODEL,
        temperature: 0.2,
        timeout_seconds: 20,
      },
      skills: [
        {
          name: 'ticket_classification',
          purpose: 'Classify support tickets by type and urgency',
          prompt_summary: 'Analyze customer message to determine: issue category, urgency level, affected product/feature, customer sentiment, and recommended specialist queue.',
          user_invocable: false,
          tags: ['classification', 'support', 'nlp'],
        },
        {
          name: 'auto_acknowledgment',
          purpose: 'Generate personalized ticket acknowledgment',
          prompt_summary: 'Craft a brief, personalized acknowledgment message confirming receipt of the customer issue. Reference their specific problem. Provide estimated response time.',
          user_invocable: false,
          tags: ['support', 'writing', 'customer-facing'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'ticketing_system', allowedActions: ['create_ticket', 'update_ticket', 'list_tickets'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Technical Support Agent',
        role: 'Technical Issue Resolution Specialist',
        goal: 'Diagnose and resolve technical issues by walking customers through solutions, checking system status, and providing clear fix instructions',
        description: 'Handles TECHNICAL category tickets. Has access to system status, documentation, and known-issue databases. Can walk through troubleshooting steps.',
        personality: 'Patient and methodical. Explains complex concepts simply. Never assumes technical knowledge. Celebrates when the fix works.',
        boundaries: ['Cannot modify production systems', 'Escalate infrastructure issues to engineering on-call', 'Max 3 troubleshooting steps before escalating'],
        communication_style: 'Step-by-step instructions with screenshots where possible. Technical internally, plain language for customers.',
        operating_guidelines: 'On assignment: 1) Check known issues database, 2) Check system status, 3) If known issue: provide documented fix, 4) If new: walk through diagnostic steps, 5) If unresolved after 3 attempts: escalate with full diagnostic log.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 90,
      },
      skills: [
        {
          name: 'troubleshooting',
          purpose: 'Systematic technical troubleshooting',
          prompt_summary: 'Given a technical issue description and system context, produce a numbered troubleshooting guide. Include diagnostic commands, expected outputs, and decision branches.',
          user_invocable: true,
          tags: ['technical', 'debugging', 'support'],
        },
        {
          name: 'known_issue_lookup',
          purpose: 'Search known issues database',
          prompt_summary: 'Query the known issues database for matching problems. Return issue ID, description, affected versions, workaround, and permanent fix status.',
          user_invocable: true,
          tags: ['search', 'knowledge-base', 'technical'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'status_page', allowedActions: ['check_status', 'get_incidents'] },
        { toolType: 'api', bindingName: 'documentation', allowedActions: ['search', 'get_article'] },
      ],
      needsWorkspace: true,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Customer Resolution Agent',
        role: 'Customer Communication & Resolution Specialist',
        goal: 'Craft empathetic, solution-oriented responses that resolve customer issues and leave them feeling heard and valued',
        description: 'Handles non-technical tickets (billing inquiries, account issues, feature requests). Focuses on customer satisfaction and clear communication.',
        personality: 'Empathetic, solution-oriented, and proactive. Goes above and beyond. Turns complaints into loyalty.',
        boundaries: ['Cannot issue refunds over $100 without approval', 'Never share other customer data', 'Always offer an alternative when saying no'],
        communication_style: 'Warm, personal, and solution-focused. Uses customer name. Acknowledges frustration before solving.',
        operating_guidelines: 'On assignment: 1) Review full ticket history, 2) Acknowledge customer emotion, 3) Provide solution or clear path to resolution, 4) If resolution requires approval, submit for review, 5) Follow up after resolution.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.5,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'empathetic_response',
          purpose: 'Draft empathetic customer responses',
          prompt_summary: 'Given ticket context and customer sentiment, draft a warm, solution-oriented response that acknowledges the customer feeling, provides a clear resolution path, and ends with a positive action item.',
          user_invocable: true,
          tags: ['writing', 'customer-facing', 'support'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'ticketing_system', allowedActions: ['update_ticket', 'add_note', 'close_ticket'] },
      ],
      needsWorkspace: false,
      needsApproval: true,
    },
    {
      spec: {
        name: 'Support Escalation Agent',
        role: 'SLA Watchdog & Escalation Specialist',
        goal: 'Monitor ticket SLAs, detect breach risks, and escalate unresolved issues to appropriate human teams with full context',
        description: 'Watches all open tickets for SLA compliance. Proactively escalates before breaches. Packages context for human reviewers.',
        personality: 'Vigilant and persistent. The safety net. Never lets a ticket fall through the cracks.',
        boundaries: ['Cannot resolve tickets directly', 'Must escalate through defined channels only', 'Log all escalation actions'],
        communication_style: 'Alert-style messages with severity, ticket summary, time remaining, and recommended action.',
        operating_guidelines: 'Continuously: 1) Monitor open ticket ages against SLA thresholds, 2) At 75% SLA: send warning to assigned agent, 3) At 90% SLA: escalate to team lead, 4) At 100% SLA: escalate to manager with full ticket summary.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 15,
      },
      skills: [
        {
          name: 'sla_monitoring',
          purpose: 'Monitor and report SLA compliance',
          prompt_summary: 'Check all open tickets against SLA thresholds. For each ticket: calculate time elapsed, time remaining, breach risk percentage. Flag any tickets at 75%+ of SLA limit.',
          user_invocable: true,
          tags: ['monitoring', 'sla', 'reporting'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'ticketing_system', allowedActions: ['list_tickets', 'get_ticket'] },
        { toolType: 'api', bindingName: 'slack', allowedActions: ['send_message', 'send_dm'] },
      ],
      heartbeat: { mode: 'interval', schedule: '*/10 * * * *', purpose: 'SLA compliance check every 10 minutes', escalation_summary: 'Alert if any ticket is at 90%+ of SLA threshold' },
      needsWorkspace: false,
      needsApproval: false,
    },
  ],
  triggers: [{ trigger_type: 'event', source: 'ticket_webhook' }],
  outputs: [
    { output_type: 'ticket_response', destination: 'ticketing_system', summary: 'Responses posted to customer tickets' },
    { output_type: 'notification', destination: 'slack', summary: 'Escalation alerts sent to support team Slack channel' },
  ],
  guardrails: ['PII redaction in logs', 'Rate limiting: max 100 auto-responses per hour', 'Sentiment monitoring on outbound messages', 'Approval required for refunds and account changes'],
  assumptions: ['Ticketing system API configured', 'SLA thresholds defined per ticket category', 'Support team Slack channel exists'],
};

// ---- Pattern: Incident Response / DevOps ----
const incidentResponsePattern: UseCasePattern = {
  id: 'incident_response',
  archName: 'Incident Response & Ops Pipeline',
  keywords: ['incident', 'alert', 'outage', 'devops', 'ops', 'sre', 'on-call', 'pagerduty', 'downtime'],
  minMatches: 1,
  piAgent: {
    name: 'Incident Commander PI',
    role: 'Primary Intelligence - Incident Response Orchestrator',
    goal: 'Coordinate rapid incident response by triaging alerts, mobilizing responders, tracking resolution, and producing post-mortems',
    description: 'Acts as the automated incident commander. Receives alerts, classifies severity, coordinates specialist agents for diagnosis and communication, and drives incidents to resolution.',
    personality: 'Cool under fire. Decisive and structured. Runs a tight incident timeline. Zero tolerance for ambiguity in severity.',
    boundaries: ['Never auto-remediate production without human approval for SEV1/SEV2', 'Always page on-call for SEV1', 'Never suppress alerts'],
    communication_style: 'Incident channel format: timestamp, severity, status, action items. Concise and factual.',
    operating_guidelines: 'On alert: 1) Route to Alert Triage Agent, 2) Based on severity: SEV1->page on-call + open war room, SEV2->notify team + assign, SEV3/4->assign to queue, 3) Track resolution timeline, 4) On resolution: trigger post-mortem.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.2,
    timeout_seconds: 30,
  },
  specialists: [
    {
      spec: {
        name: 'Alert Triage Agent',
        role: 'Alert Classification & Deduplication Specialist',
        goal: 'Classify incoming alerts by severity (SEV1-4), deduplicate related alerts, correlate with known issues, and produce actionable triage summaries',
        description: 'First responder for all monitoring alerts. Deduplicates alert storms, classifies severity, checks for known issues, and produces structured triage output.',
        personality: 'Lightning-fast and pattern-aware. Sees through alert storms to find the real signal.',
        boundaries: ['Classification only - never acknowledge or resolve alerts', 'Must classify within 60 seconds', 'Default to higher severity when uncertain'],
        communication_style: 'Structured triage output: severity, service, symptoms, blast radius, known issue match, recommended actions.',
        operating_guidelines: 'On alert: 1) Check for duplicate/related recent alerts within 15-min window, 2) Correlate with active incidents, 3) Check known issues database, 4) Classify severity using service criticality matrix, 5) Output triage summary.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 15,
      },
      skills: [
        {
          name: 'alert_classification',
          purpose: 'Classify alert severity and correlate',
          prompt_summary: 'Given alert data (source, metric, threshold, current value, service), determine severity (SEV1-4), check for correlation with active incidents, and identify blast radius.',
          user_invocable: false,
          tags: ['ops', 'classification', 'alerting'],
        },
        {
          name: 'alert_deduplication',
          purpose: 'Deduplicate and correlate alert storms',
          prompt_summary: 'Given a set of recent alerts, identify duplicates and related alerts that likely stem from the same root cause. Group them into a single incident context.',
          user_invocable: false,
          tags: ['ops', 'deduplication', 'correlation'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'monitoring', allowedActions: ['get_alerts', 'get_metrics', 'query_logs'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Diagnostic Agent',
        role: 'Infrastructure Diagnostic & Root Cause Specialist',
        goal: 'Investigate incidents by querying metrics, logs, and traces to identify root cause and recommend remediation steps',
        description: 'Deep-dives into system telemetry to find root causes. Queries dashboards, log aggregators, and distributed traces. Produces diagnostic reports.',
        personality: 'Methodical investigator. Follows the evidence. Documents every finding. Never guesses without data.',
        boundaries: ['Read-only access to production systems', 'Cannot execute remediation commands', 'Must document all queries run and results found'],
        communication_style: 'Investigation timeline with findings, evidence links, and confidence levels.',
        operating_guidelines: 'On assignment: 1) Query relevant metrics dashboards, 2) Search logs for error patterns around incident start time, 3) Check recent deployments, 4) Check dependency health, 5) Produce root cause hypothesis with confidence score.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.2,
        timeout_seconds: 120,
        max_tokens: 8192,
      },
      skills: [
        {
          name: 'log_analysis',
          purpose: 'Analyze application and system logs',
          prompt_summary: 'Query and analyze log data for error patterns, anomalies, and correlation with incident timeline. Produce a summary of key findings with timestamps and log references.',
          user_invocable: true,
          tags: ['ops', 'debugging', 'logs'],
        },
        {
          name: 'root_cause_analysis',
          purpose: 'Determine probable root cause',
          prompt_summary: 'Given metrics, logs, and system context, identify the most likely root cause. Rate confidence (high/medium/low). List supporting evidence and alternative hypotheses.',
          user_invocable: true,
          tags: ['ops', 'diagnosis', 'rca'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'monitoring', allowedActions: ['query_metrics', 'query_logs', 'get_traces'] },
        { toolType: 'shell', bindingName: 'diagnostics_cli', allowedActions: ['run_diagnostic', 'check_health'] },
      ],
      needsWorkspace: true,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Incident Communicator Agent',
        role: 'Stakeholder Communication & Status Page Specialist',
        goal: 'Keep all stakeholders informed with timely, accurate incident updates across status page, Slack, and email channels',
        description: 'Manages all incident communications. Posts status page updates, sends Slack notifications, drafts executive summaries, and maintains incident timeline.',
        personality: 'Clear communicator under pressure. Translates technical findings into stakeholder-appropriate language. Never speculates publicly.',
        boundaries: ['All external status updates require approval', 'Never share internal diagnostic details externally', 'Update at minimum every 30 minutes during active incident'],
        communication_style: 'Status page: factual, no jargon. Slack: concise with action items. Executive: impact-focused.',
        operating_guidelines: 'On incident: 1) Post initial status page update within 5 minutes, 2) Open Slack incident channel, 3) Post updates every 15-30 minutes, 4) On resolution: draft final update + preliminary post-mortem summary.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 30,
      },
      skills: [
        {
          name: 'status_update_drafting',
          purpose: 'Draft incident status updates for multiple audiences',
          prompt_summary: 'Given current incident state (severity, affected services, diagnosis progress, ETA), draft appropriate updates for: 1) public status page, 2) internal Slack, 3) executive summary.',
          user_invocable: true,
          tags: ['communication', 'writing', 'incident'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'slack', allowedActions: ['send_message', 'create_channel', 'pin_message'] },
        { toolType: 'api', bindingName: 'status_page', allowedActions: ['create_incident', 'update_incident', 'resolve_incident'] },
      ],
      needsWorkspace: false,
      needsApproval: true,
    },
    {
      spec: {
        name: 'Post-Mortem Agent',
        role: 'Incident Retrospective & Learning Specialist',
        goal: 'Produce thorough, blameless post-mortem documents that capture timeline, root cause, impact, and actionable follow-up items',
        description: 'After incident resolution, compiles the full incident timeline, diagnostic findings, communication log, and generates a structured post-mortem document with action items.',
        personality: 'Thoughtful and thorough. Focused on learning, not blame. Always asks what systems can be improved.',
        boundaries: ['Blameless language only', 'Must include at least 3 action items', 'Draft only - human must review and publish'],
        communication_style: 'Structured document with sections: Summary, Timeline, Root Cause, Impact, Action Items, Lessons Learned.',
        operating_guidelines: 'On incident resolution: 1) Compile full timeline from incident channel, 2) Incorporate diagnostic findings, 3) Calculate customer impact, 4) Draft action items with owners, 5) Submit for team review.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.4,
        timeout_seconds: 120,
        max_tokens: 8192,
      },
      skills: [
        {
          name: 'postmortem_generation',
          purpose: 'Generate structured post-mortem documents',
          prompt_summary: 'Given incident timeline, diagnostic data, communication log, and resolution steps, produce a complete blameless post-mortem document with: executive summary, detailed timeline, root cause analysis, customer impact, action items with owners, and lessons learned.',
          user_invocable: true,
          tags: ['documentation', 'incident', 'retrospective'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'documentation', allowedActions: ['create_document', 'update_document'] },
      ],
      needsWorkspace: true,
      needsApproval: true,
    },
  ],
  triggers: [{ trigger_type: 'event', source: 'alerting_webhook' }],
  outputs: [
    { output_type: 'status_update', destination: 'status_page', summary: 'Public and internal incident status updates' },
    { output_type: 'notification', destination: 'slack', summary: 'Real-time incident updates to Slack channels' },
    { output_type: 'document', destination: 'wiki', summary: 'Post-mortem documents published to team wiki' },
  ],
  guardrails: ['Auto-remediation requires human approval for SEV1/SEV2', 'External communications require approval', 'Rate limiting on alert processing', 'Audit trail for all incident actions'],
  assumptions: ['Monitoring/alerting system configured', 'On-call rotation defined', 'Status page and Slack integrations active'],
};

// ---- Pattern: Compliance & Audit ----
const compliancePattern: UseCasePattern = {
  id: 'compliance_audit',
  archName: 'Compliance Monitoring & Audit Pipeline',
  keywords: ['compliance', 'audit', 'regulation', 'policy', 'governance', 'risk', 'sox', 'gdpr', 'hipaa'],
  minMatches: 1,
  piAgent: {
    name: 'Compliance Operations PI',
    role: 'Primary Intelligence - Compliance & Governance Orchestrator',
    goal: 'Ensure continuous compliance by orchestrating policy checks, audit evidence collection, risk assessments, and remediation tracking',
    description: 'Central compliance brain that coordinates specialist agents for policy monitoring, evidence gathering, and risk management across the organization.',
    personality: 'Meticulous, principled, and thorough. Treats compliance as a continuous process, not a checkbox exercise.',
    boundaries: ['Never auto-remediate compliance violations without human approval', 'All findings must be documented', 'Escalate critical violations immediately'],
    communication_style: 'Formal, evidence-based reporting. Clear risk ratings and recommended actions.',
    operating_guidelines: 'Continuously: 1) Schedule policy scans via Policy Monitor, 2) Route violations to Risk Assessor, 3) Coordinate evidence collection for audits, 4) Track remediation progress, 5) Generate compliance reports.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.2,
    timeout_seconds: 120,
  },
  specialists: [
    {
      spec: {
        name: 'Policy Monitor Agent',
        role: 'Continuous Policy Compliance Scanner',
        goal: 'Continuously scan systems, configurations, and processes against defined compliance policies and flag violations',
        description: 'Automated policy scanner that checks infrastructure, code, and process configurations against compliance frameworks (SOX, GDPR, HIPAA, etc.).',
        personality: 'Relentless and precise. Checks every corner. Never assumes compliance without evidence.',
        boundaries: ['Read-only access to all systems', 'Cannot remediate violations directly', 'Must document evidence for every finding'],
        communication_style: 'Structured findings: policy_id, violation_type, evidence, severity, affected_resource.',
        operating_guidelines: 'On schedule: 1) Run policy checks against configured frameworks, 2) Compare current state to required state, 3) Flag deviations with evidence, 4) Forward findings to Risk Assessor.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'policy_scanning',
          purpose: 'Scan systems against compliance policies',
          prompt_summary: 'Execute compliance policy checks against target systems. For each policy rule: verify current state, compare against required state, capture evidence, flag violations with severity rating.',
          user_invocable: true,
          tags: ['compliance', 'scanning', 'policy'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'compliance_platform', allowedActions: ['get_policies', 'check_compliance', 'get_controls'] },
        { toolType: 'shell', bindingName: 'config_scanner', allowedActions: ['scan', 'audit'] },
      ],
      heartbeat: { mode: 'cron', schedule: '0 2 * * *', purpose: 'Nightly full compliance scan across all systems', escalation_summary: 'Alert if any critical compliance violations detected' },
      needsWorkspace: true,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Risk Assessment Agent',
        role: 'Compliance Risk Evaluation Specialist',
        goal: 'Evaluate compliance violations for business risk impact, prioritize by severity, and recommend remediation approaches',
        description: 'Receives violation findings and assesses their risk impact. Prioritizes based on regulatory severity, business impact, and likelihood of audit finding.',
        personality: 'Analytical and risk-aware. Balances urgency with practicality. Always frames risk in business terms.',
        boundaries: ['Assessment only - cannot implement remediation', 'Must assign risk score to every finding', 'Critical risks require immediate escalation'],
        communication_style: 'Risk matrix format: finding, risk score (1-10), business impact, regulatory impact, recommended action, deadline.',
        operating_guidelines: 'On findings receipt: 1) Score each violation on risk matrix, 2) Assess business and regulatory impact, 3) Prioritize remediation order, 4) Assign recommended actions and deadlines, 5) Escalate critical findings.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.2,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'risk_scoring',
          purpose: 'Score compliance risks and prioritize remediation',
          prompt_summary: 'Given a compliance violation, assess: regulatory severity, business impact, likelihood of audit finding, ease of remediation. Compute composite risk score (1-10). Recommend priority and deadline.',
          user_invocable: true,
          tags: ['risk', 'assessment', 'compliance'],
        },
      ],
      tools: [],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Evidence Collection Agent',
        role: 'Audit Evidence Gathering & Documentation Specialist',
        goal: 'Collect, organize, and document compliance evidence from across systems to support internal and external audits',
        description: 'Gathers evidence artifacts (configs, logs, screenshots, attestations) needed to demonstrate compliance for audit purposes.',
        personality: 'Organized archivist. Everything documented, timestamped, and cross-referenced. Nothing goes missing.',
        boundaries: ['Read-only access to evidence sources', 'Must timestamp and hash all evidence', 'Chain of custody must be maintained'],
        communication_style: 'Evidence catalog format: evidence_id, source, collection_date, hash, related_control, status.',
        operating_guidelines: 'On request: 1) Identify required evidence per control, 2) Collect from source systems, 3) Timestamp and hash, 4) Organize by framework and control, 5) Generate evidence inventory report.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.1,
        timeout_seconds: 120,
      },
      skills: [
        {
          name: 'evidence_gathering',
          purpose: 'Collect and catalog audit evidence',
          prompt_summary: 'Given a compliance control requirement, identify needed evidence artifacts, collect from source systems, timestamp and catalog each item with: source, collection method, hash, and related control mapping.',
          user_invocable: true,
          tags: ['audit', 'evidence', 'documentation'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'compliance_platform', allowedActions: ['get_evidence', 'upload_evidence', 'get_controls'] },
        { toolType: 'database', bindingName: 'audit_db', allowedActions: ['query', 'read'] },
      ],
      needsWorkspace: true,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Compliance Reporter Agent',
        role: 'Compliance Reporting & Dashboard Specialist',
        goal: 'Generate comprehensive compliance reports, dashboards, and executive summaries that accurately reflect the organization compliance posture',
        description: 'Produces regular compliance reports: daily summaries, weekly dashboards, audit-ready packages, and executive briefings.',
        personality: 'Data-driven storyteller. Turns complex compliance data into clear narratives. Makes the board understand risk.',
        boundaries: ['Reports must be factual - no speculation', 'Include confidence levels for all metrics', 'Draft only - human review required before distribution'],
        communication_style: 'Executive format: key metrics, trend arrows, risk highlights, action items. Detailed appendix available.',
        operating_guidelines: 'On schedule: 1) Aggregate compliance data across all frameworks, 2) Calculate compliance scores, 3) Identify trends and anomalies, 4) Draft report for target audience, 5) Submit for review.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 90,
      },
      skills: [
        {
          name: 'compliance_reporting',
          purpose: 'Generate compliance status reports',
          prompt_summary: 'Aggregate compliance findings, risk scores, and remediation progress into a structured report. Include: overall compliance score, per-framework status, trend analysis, top risks, upcoming deadlines, and recommended actions.',
          user_invocable: true,
          tags: ['reporting', 'compliance', 'analytics'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'compliance_platform', allowedActions: ['get_dashboard_data', 'get_reports'] },
      ],
      heartbeat: { mode: 'cron', schedule: '0 8 * * 1', purpose: 'Weekly compliance posture report generation', escalation_summary: 'Alert if overall compliance score drops below threshold' },
      needsWorkspace: false,
      needsApproval: true,
    },
  ],
  triggers: [{ trigger_type: 'schedule', source: 'cron', schedule: '0 2 * * *' }],
  outputs: [
    { output_type: 'report', destination: 'email', summary: 'Weekly compliance posture reports delivered to leadership' },
    { output_type: 'dashboard', destination: 'compliance_platform', summary: 'Real-time compliance dashboard data' },
    { output_type: 'notification', destination: 'slack', summary: 'Critical violation alerts sent to compliance Slack channel' },
  ],
  guardrails: ['Audit trail for all compliance actions', 'Evidence integrity verification', 'Role-based access to compliance data', 'Immutable finding records'],
  assumptions: ['Compliance platform configured with applicable frameworks', 'Policy rules defined and versioned', 'Evidence sources accessible via API'],
};

// ---- Pattern: Content & Marketing ----
const contentMarketingPattern: UseCasePattern = {
  id: 'content_marketing',
  archName: 'Content Creation & Marketing Pipeline',
  keywords: ['content', 'marketing', 'blog', 'social media', 'youtube', 'seo', 'newsletter', 'publish', 'copywriting', 'campaign'],
  minMatches: 1,
  piAgent: {
    name: 'Content Operations PI',
    role: 'Primary Intelligence - Content Strategy Orchestrator',
    goal: 'Coordinate end-to-end content production from ideation through publication, ensuring brand consistency and audience engagement across channels',
    description: 'Orchestrates the content pipeline: topic research, content creation, editing, SEO optimization, and multi-channel distribution.',
    personality: 'Creative strategist with a data edge. Thinks in content calendars and audience personas. Balances art and analytics.',
    boundaries: ['All published content requires human approval', 'Brand guidelines must be followed', 'No AI-generated content published without disclosure where required'],
    communication_style: 'Creative briefs for content agents, data summaries for analytics, editorial feedback for reviews.',
    operating_guidelines: 'Content workflow: 1) Topic research + SEO analysis, 2) Content brief creation, 3) Draft by Content Creator, 4) SEO optimization, 5) Editorial review, 6) Publication.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.4,
    timeout_seconds: 120,
  },
  specialists: [
    {
      spec: {
        name: 'Research & Ideation Agent',
        role: 'Content Research & Topic Discovery Specialist',
        goal: 'Identify high-potential content topics through trend analysis, keyword research, competitor monitoring, and audience interest signals',
        description: 'Researches content opportunities by analyzing search trends, competitor content, social media conversations, and audience questions. Produces content briefs with topic, angle, target keywords, and audience.',
        personality: 'Curious and data-savvy. Always asking what the audience wants to know next. Finds gaps others miss.',
        boundaries: ['Research only - do not write content', 'Must cite data sources for all recommendations', 'Topics must align with brand content pillars'],
        communication_style: 'Structured content briefs: topic, angle, target audience, primary keyword, supporting keywords, competitive landscape, suggested format.',
        operating_guidelines: 'Weekly: 1) Analyze search trends for target keywords, 2) Monitor competitor publications, 3) Review audience questions and comments, 4) Score topics by potential (search volume * relevance * gap), 5) Produce ranked topic backlog.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.5,
        timeout_seconds: 90,
      },
      skills: [
        {
          name: 'keyword_research',
          purpose: 'Research keywords and search intent',
          prompt_summary: 'Given a topic area, research relevant keywords: search volume, difficulty, intent type, related questions. Return ranked keyword list with content angle suggestions.',
          user_invocable: true,
          tags: ['seo', 'research', 'keywords'],
        },
        {
          name: 'competitor_analysis',
          purpose: 'Analyze competitor content for gaps',
          prompt_summary: 'Analyze top-ranking content for target keywords. Identify: content gaps, unique angles, depth differences, and opportunities to provide superior value.',
          user_invocable: true,
          tags: ['research', 'competitive', 'analysis'],
        },
      ],
      tools: [
        { toolType: 'browser', bindingName: 'web_browser', allowedActions: ['navigate', 'scrape', 'search'] },
      ],
      needsWorkspace: true,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Content Creator Agent',
        role: 'Long-Form Content Writer & Storyteller',
        goal: 'Produce engaging, well-structured content pieces that educate the audience, rank for target keywords, and drive meaningful engagement',
        description: 'Writes blog posts, articles, and long-form content from content briefs. Maintains brand voice, follows SEO guidelines, and creates compelling narratives.',
        personality: 'Articulate storyteller with subject matter depth. Writes in a way that makes complex topics accessible and engaging.',
        boundaries: ['Must follow brand voice guide', 'Factual claims must be verifiable', 'Include proper attribution for data and quotes', 'Word count within 80-120% of brief target'],
        communication_style: 'Natural, authoritative prose. Varies tone by channel: educational for blog, conversational for social, concise for email.',
        operating_guidelines: 'On brief assignment: 1) Research topic depth, 2) Create outline with H2/H3 structure, 3) Write first draft, 4) Self-edit for clarity, flow, and SEO, 5) Submit for review.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.7,
        timeout_seconds: 180,
        max_tokens: 8192,
      },
      skills: [
        {
          name: 'article_writing',
          purpose: 'Write long-form content from briefs',
          prompt_summary: 'Given a content brief (topic, angle, keywords, audience, format), produce a well-structured article with: compelling headline, engaging introduction, clear H2/H3 sections, actionable takeaways, and strong conclusion.',
          user_invocable: true,
          tags: ['writing', 'content', 'long-form'],
        },
        {
          name: 'social_adaptation',
          purpose: 'Adapt content for social media channels',
          prompt_summary: 'Take long-form content and create platform-specific social posts: LinkedIn (professional thought leadership), Twitter/X (concise thread), Instagram (visual caption), with appropriate hashtags and CTAs.',
          user_invocable: true,
          tags: ['writing', 'social-media', 'adaptation'],
        },
      ],
      tools: [],
      needsWorkspace: true,
      needsApproval: true,
    },
    {
      spec: {
        name: 'SEO Optimization Agent',
        role: 'Search Engine Optimization Specialist',
        goal: 'Optimize every content piece for search visibility: keyword placement, meta tags, internal linking, readability score, and technical SEO factors',
        description: 'Reviews content for SEO best practices and suggests improvements. Handles meta descriptions, title tags, keyword density, readability, and internal linking recommendations.',
        personality: 'Data-driven perfectionist. Knows every ranking factor. Balances optimization with readability.',
        boundaries: ['Suggestions only - do not alter author voice', 'Never keyword-stuff', 'Readability score must stay above target'],
        communication_style: 'Actionable edit suggestions with reasoning: "Change X to Y because [ranking factor]".',
        operating_guidelines: 'On draft review: 1) Check keyword placement (title, H1, first paragraph, H2s), 2) Analyze readability score, 3) Draft meta title + description, 4) Suggest internal links, 5) Return optimization report.',
        model_primary: FAST_MODEL,
        temperature: 0.2,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'seo_audit',
          purpose: 'Audit content for SEO optimization',
          prompt_summary: 'Given a content draft and target keywords, produce an SEO audit: keyword density, placement analysis, readability score, meta tag suggestions, internal linking opportunities, and overall optimization score (1-100).',
          user_invocable: true,
          tags: ['seo', 'audit', 'optimization'],
        },
      ],
      tools: [],
      needsWorkspace: false,
      needsApproval: false,
    },
  ],
  triggers: [{ trigger_type: 'schedule', source: 'cron', schedule: '0 9 * * 1' }],
  outputs: [
    { output_type: 'content', destination: 'cms', summary: 'Published articles and blog posts pushed to CMS' },
    { output_type: 'social_posts', destination: 'social_scheduler', summary: 'Social media posts queued for scheduled publishing' },
  ],
  guardrails: ['Brand voice consistency check', 'Fact-verification requirement', 'Plagiarism detection', 'Human approval before publication'],
  assumptions: ['Brand guidelines document available', 'CMS API configured', 'SEO tools accessible'],
};

// ---- Pattern: Data & Reporting ----
const dataReportingPattern: UseCasePattern = {
  id: 'data_reporting',
  archName: 'Data Analysis & Reporting Pipeline',
  keywords: ['report', 'summary', 'dashboard', 'digest', 'analytics', 'data', 'metrics', 'kpi', 'daily', 'weekly'],
  minMatches: 2,
  piAgent: {
    name: 'Analytics Operations PI',
    role: 'Primary Intelligence - Data & Reporting Orchestrator',
    goal: 'Orchestrate data collection, analysis, and report generation to deliver timely, accurate insights to stakeholders',
    description: 'Coordinates the data pipeline from collection through delivery. Routes analysis tasks to specialist agents and ensures reports meet quality and timeliness standards.',
    personality: 'Numbers-focused and deadline-driven. Ensures data tells a clear story. Zero tolerance for misleading metrics.',
    boundaries: ['Never alter source data', 'All reports must include data freshness timestamps', 'Anomalies must be flagged, not hidden'],
    communication_style: 'Metric-driven with context. Always includes: current value, trend, comparison to target, and recommended action.',
    operating_guidelines: 'On schedule: 1) Trigger data collection, 2) Route to Data Analyst for processing, 3) Send to Report Builder for formatting, 4) Route to Insight Generator for narrative, 5) Deliver to stakeholders.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.2,
    timeout_seconds: 120,
  },
  specialists: [
    {
      spec: {
        name: 'Data Collection Agent',
        role: 'Multi-Source Data Extraction Specialist',
        goal: 'Extract, validate, and normalize data from all configured sources into a consistent format for analysis',
        description: 'Pulls data from databases, APIs, spreadsheets, and external services. Validates data quality and normalizes formats for downstream analysis.',
        personality: 'Systematic and thorough. Double-checks every data point. Catches quality issues before they propagate.',
        boundaries: ['Read-only access to data sources', 'Must validate data quality on extraction', 'Log all extraction runs with row counts'],
        communication_style: 'Data manifests: source, extraction_time, row_count, quality_score, schema_version.',
        operating_guidelines: 'On trigger: 1) Connect to each configured data source, 2) Extract data for target time range, 3) Validate schema and completeness, 4) Flag quality issues, 5) Output normalized dataset.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'data_extraction',
          purpose: 'Extract and normalize data from multiple sources',
          prompt_summary: 'Connect to configured data sources, extract data for the specified time range, validate against expected schema, normalize formats, and output a quality report with the dataset.',
          user_invocable: false,
          tags: ['data', 'extraction', 'etl'],
        },
      ],
      tools: [
        { toolType: 'database', bindingName: 'analytics_db', allowedActions: ['query', 'read'] },
        { toolType: 'api', bindingName: 'data_apis', allowedActions: ['get_metrics', 'get_events'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Data Analyst Agent',
        role: 'Statistical Analysis & Pattern Recognition Specialist',
        goal: 'Analyze datasets to identify trends, anomalies, correlations, and actionable patterns that drive business decisions',
        description: 'Performs statistical analysis on collected data. Identifies trends, anomalies, and patterns. Computes KPIs and compares against targets.',
        personality: 'Intellectually curious with statistical rigor. Loves finding the story in the numbers. Skeptical of outliers until explained.',
        boundaries: ['Analysis must be reproducible', 'Statistical claims must include confidence levels', 'Correlation is not causation - always note this distinction'],
        communication_style: 'Analysis results with methodology, confidence intervals, and business interpretation.',
        operating_guidelines: 'On data receipt: 1) Compute configured KPIs, 2) Compare against targets and historical baselines, 3) Run anomaly detection, 4) Identify top 3 trends, 5) Output structured analysis results.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.2,
        timeout_seconds: 90,
      },
      skills: [
        {
          name: 'kpi_computation',
          purpose: 'Compute KPIs and compare against targets',
          prompt_summary: 'Given raw data, compute configured KPI metrics. For each KPI: current value, period-over-period change, distance from target, trend direction, and statistical significance of change.',
          user_invocable: true,
          tags: ['analytics', 'kpi', 'metrics'],
        },
        {
          name: 'anomaly_detection',
          purpose: 'Detect data anomalies and outliers',
          prompt_summary: 'Analyze dataset for statistical anomalies, unexpected patterns, and outliers. For each anomaly: description, magnitude, potential cause, and recommended investigation.',
          user_invocable: true,
          tags: ['analytics', 'anomaly', 'detection'],
        },
      ],
      tools: [],
      needsWorkspace: true,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Report Builder Agent',
        role: 'Report Formatting & Visualization Specialist',
        goal: 'Transform analysis results into polished, visually clear reports with charts, tables, and executive summaries tailored to each audience',
        description: 'Takes analysis output and formats it into professional reports. Creates appropriate visualizations, organizes sections by audience, and ensures clarity.',
        personality: 'Design-minded and audience-aware. Makes data beautiful and accessible. Every chart tells a story.',
        boundaries: ['Never omit negative metrics', 'Visualizations must be accessible (colorblind-safe, labeled)', 'Executive summary must fit on one page'],
        communication_style: 'Polished report format: executive summary, key metrics dashboard, detailed sections, appendix with methodology.',
        operating_guidelines: 'On analysis receipt: 1) Draft executive summary (3-5 bullet points), 2) Create KPI dashboard table, 3) Format trend analysis with charts, 4) Add anomaly highlights, 5) Compile into final report document.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'report_formatting',
          purpose: 'Format analysis into polished reports',
          prompt_summary: 'Given analysis results, produce a formatted report: executive summary (5 bullets max), KPI dashboard (table), trend analysis (narrative + chart descriptions), anomaly highlights, and recommendations section.',
          user_invocable: true,
          tags: ['reporting', 'formatting', 'visualization'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'document_service', allowedActions: ['create_document', 'add_chart', 'export_pdf'] },
      ],
      heartbeat: { mode: 'cron', schedule: '0 7 * * *', purpose: 'Generate daily morning metrics brief', escalation_summary: 'Alert if data sources are stale or unavailable' },
      needsWorkspace: false,
      needsApproval: true,
    },
  ],
  triggers: [{ trigger_type: 'schedule', source: 'cron', schedule: '0 6 * * *' }],
  outputs: [
    { output_type: 'report', destination: 'email', summary: 'Formatted reports delivered to stakeholder distribution list' },
    { output_type: 'dashboard', destination: 'analytics_platform', summary: 'Real-time dashboard data updates' },
  ],
  guardrails: ['Data quality validation on extraction', 'Metric calculation audit trail', 'Report accuracy review before distribution', 'Source data immutability'],
  assumptions: ['Data sources accessible via API or database', 'KPI definitions and targets configured', 'Stakeholder distribution lists defined'],
};

// ---- Pattern: Invoice / Document Processing ----
const invoiceProcessingPattern: UseCasePattern = {
  id: 'invoice_processing',
  archName: 'Document Processing & Approval Pipeline',
  keywords: ['invoice', 'billing', 'payment', 'purchase', 'expense', 'receipt', 'document', 'ocr', 'processing'],
  minMatches: 1,
  piAgent: {
    name: 'Document Processing PI',
    role: 'Primary Intelligence - Document Workflow Orchestrator',
    goal: 'Orchestrate end-to-end document processing from intake through approval and filing, ensuring accuracy and compliance',
    description: 'Coordinates document processing pipeline: intake, data extraction, validation, approval routing, and archival.',
    personality: 'Process-oriented and audit-conscious. Every document accounted for. Nothing falls through the cracks.',
    boundaries: ['Cannot approve financial transactions', 'All extracted data must be validated', 'Maintain audit trail for every document'],
    communication_style: 'Status tracking format: document_id, stage, extracted_data_summary, validation_status, approval_status.',
    operating_guidelines: 'On document receipt: 1) Route to Document Intake for extraction, 2) Send extracted data to Validation Agent, 3) Route validated documents to Approval Router, 4) On approval: trigger filing and payment processing.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.2,
    timeout_seconds: 120,
  },
  specialists: [
    {
      spec: {
        name: 'Document Intake Agent',
        role: 'Document Parsing & Data Extraction Specialist',
        goal: 'Extract structured data from invoices, receipts, and business documents with high accuracy regardless of format',
        description: 'Parses incoming documents (PDF, email, image) and extracts key fields: vendor, date, line items, amounts, tax, totals. Handles various document formats and layouts.',
        personality: 'Precision-focused with an eye for detail. Double-checks every number. Catches formatting inconsistencies others miss.',
        boundaries: ['Read-only document access', 'Flag low-confidence extractions for human review', 'Preserve original document unchanged'],
        communication_style: 'Structured extraction output: vendor_name, invoice_number, date, line_items[], subtotal, tax, total, confidence_score.',
        operating_guidelines: 'On document receipt: 1) Determine document type, 2) Apply appropriate extraction template, 3) Extract all fields, 4) Compute confidence score per field, 5) Flag any fields below 90% confidence.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.1,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'document_extraction',
          purpose: 'Extract structured data from documents',
          prompt_summary: 'Parse the document and extract: document type, vendor/sender, date, reference number, line items (description, quantity, unit price, amount), subtotal, tax, total. Include confidence score per field.',
          user_invocable: false,
          tags: ['extraction', 'ocr', 'parsing'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'document_parser', allowedActions: ['parse', 'extract_text', 'extract_tables'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Validation Agent',
        role: 'Data Validation & Reconciliation Specialist',
        goal: 'Validate extracted document data against business rules, existing records, and mathematical accuracy',
        description: 'Cross-checks extracted data: math verification, duplicate detection, vendor validation, budget checking, and policy compliance.',
        personality: 'Skeptical and thorough. Trusts but verifies everything. Catches discrepancies that would cost money.',
        boundaries: ['Cannot modify extracted data', 'Must flag all discrepancies', 'Cannot override validation failures'],
        communication_style: 'Validation report: check_name, status (pass/fail/warn), details, recommended_action.',
        operating_guidelines: 'On extraction receipt: 1) Verify math (line items sum to subtotal, tax calculation, total), 2) Check for duplicate documents, 3) Validate vendor against approved vendor list, 4) Check against budget, 5) Output validation report.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 30,
      },
      skills: [
        {
          name: 'data_validation',
          purpose: 'Validate document data against business rules',
          prompt_summary: 'Given extracted document data, perform validation checks: mathematical accuracy, duplicate detection, vendor verification, budget compliance, policy adherence. Return detailed validation report with pass/fail per check.',
          user_invocable: false,
          tags: ['validation', 'reconciliation', 'accuracy'],
        },
      ],
      tools: [
        { toolType: 'database', bindingName: 'finance_db', allowedActions: ['query', 'read'] },
        { toolType: 'api', bindingName: 'accounting', allowedActions: ['check_vendor', 'check_budget', 'check_duplicates'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Approval Router Agent',
        role: 'Approval Workflow & Routing Specialist',
        goal: 'Route validated documents to the correct approver based on amount thresholds, department rules, and delegation policies',
        description: 'Determines the approval chain for each document based on business rules. Routes to appropriate approvers, tracks approval status, and handles escalation for overdue approvals.',
        personality: 'Process guardian. Knows every approval rule. Persistent with overdue approvals. Never bypasses the chain.',
        boundaries: ['Cannot approve documents', 'Must follow delegation matrix exactly', 'Escalate overdue approvals after defined threshold'],
        communication_style: 'Routing decision: approver, reason, threshold_rule, deadline, escalation_path.',
        operating_guidelines: 'On validated document: 1) Determine amount threshold tier, 2) Look up approver by department + tier, 3) Check for delegation/out-of-office, 4) Route to approver with context, 5) Track and escalate if overdue.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 20,
      },
      skills: [
        {
          name: 'approval_routing',
          purpose: 'Determine and execute approval routing',
          prompt_summary: 'Given a validated document with amount and department, determine the approval chain: required approvers, thresholds, delegation rules, and escalation path. Route to the first approver.',
          user_invocable: false,
          tags: ['approval', 'routing', 'workflow'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'approval_system', allowedActions: ['create_request', 'get_status', 'send_reminder'] },
      ],
      heartbeat: { mode: 'interval', schedule: '0 */4 * * *', purpose: 'Check for overdue approval requests every 4 hours', escalation_summary: 'Escalate approvals overdue by more than 48 hours' },
      needsWorkspace: false,
      needsApproval: false,
    },
  ],
  triggers: [{ trigger_type: 'event', source: 'document_upload_webhook' }],
  outputs: [
    { output_type: 'processed_document', destination: 'accounting_system', summary: 'Approved documents filed in accounting system' },
    { output_type: 'notification', destination: 'email', summary: 'Approval requests and status updates sent to approvers' },
  ],
  guardrails: ['Mathematical accuracy verification', 'Duplicate document detection', 'Budget threshold enforcement', 'Audit trail for all approvals'],
  assumptions: ['Document parser/OCR service configured', 'Approval hierarchy defined', 'Accounting system API accessible'],
};

// ---- Pattern: Scheduling & Calendar ----
const schedulingPattern: UseCasePattern = {
  id: 'scheduling',
  archName: 'Intelligent Scheduling & Calendar Pipeline',
  keywords: ['schedule', 'calendar', 'meeting', 'appointment', 'booking', 'availability'],
  minMatches: 1,
  piAgent: {
    name: 'Scheduling Operations PI',
    role: 'Primary Intelligence - Calendar & Scheduling Orchestrator',
    goal: 'Coordinate intelligent meeting scheduling by analyzing availability, preferences, and priorities to find optimal time slots',
    description: 'Manages scheduling requests end-to-end: parses requests, checks availability, resolves conflicts, and sends calendar invites.',
    personality: 'Organized and considerate. Respects everyone time. Finds creative solutions to scheduling conflicts.',
    boundaries: ['Never double-book without explicit permission', 'Respect blocking time and focus hours', 'Get confirmation before sending invites'],
    communication_style: 'Clear scheduling proposals with options. Always includes time zones.',
    operating_guidelines: 'On request: 1) Parse scheduling intent, 2) Check all participant availability, 3) Generate optimal time proposals, 4) Present options to requestor, 5) On confirmation, send invites.',
    model_primary: DEFAULT_MODEL,
    temperature: 0.3,
    timeout_seconds: 60,
  },
  specialists: [
    {
      spec: {
        name: 'Availability Checker Agent',
        role: 'Calendar Availability & Conflict Detection Specialist',
        goal: 'Analyze multiple calendars to find available time slots, detect conflicts, and respect scheduling preferences',
        description: 'Checks calendar availability for all participants, identifies conflicts, respects preferences (time zones, working hours, focus blocks), and returns available slots.',
        personality: 'Methodical and thorough. Checks every calendar. Respects focus time as sacred.',
        boundaries: ['Read-only calendar access', 'Respect privacy settings on calendar events', 'Always consider time zones'],
        communication_style: 'Structured availability matrix: participant, available_slots[], conflicts[], preferences.',
        operating_guidelines: 'On request: 1) Fetch calendars for all participants, 2) Identify free slots within working hours, 3) Filter out focus/blocked time, 4) Cross-reference for common availability, 5) Rank slots by preference score.',
        model_primary: FAST_MODEL,
        temperature: 0.1,
        timeout_seconds: 30,
      },
      skills: [
        {
          name: 'availability_analysis',
          purpose: 'Analyze calendar availability across participants',
          prompt_summary: 'Given a list of participants and time range, check calendars for availability. Return: common free slots, individual conflicts, time zone considerations, and preference-ranked suggestions.',
          user_invocable: true,
          tags: ['calendar', 'scheduling', 'availability'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'calendar', allowedActions: ['list_events', 'get_freebusy'] },
      ],
      needsWorkspace: false,
      needsApproval: false,
    },
    {
      spec: {
        name: 'Meeting Scheduler Agent',
        role: 'Meeting Creation & Invitation Specialist',
        goal: 'Create well-structured calendar events with clear agendas, correct attendees, and appropriate logistics',
        description: 'Takes a confirmed time slot and creates the calendar event with all details: title, attendees, agenda, video link, room booking, and pre-meeting materials.',
        personality: 'Detail-oriented organizer. Every meeting has a purpose and agenda. Makes sure everyone knows what to prepare.',
        boundaries: ['Confirmation required before sending invites', 'Must include agenda for meetings over 15 minutes', 'Check room availability before booking'],
        communication_style: 'Meeting invite format: title, date/time, duration, attendees, agenda, preparation notes, video link.',
        operating_guidelines: 'On confirmation: 1) Create calendar event, 2) Add agenda and description, 3) Book meeting room if in-person, 4) Generate video conference link, 5) Send invites, 6) Set reminder.',
        model_primary: FAST_MODEL,
        temperature: 0.2,
        timeout_seconds: 30,
      },
      skills: [
        {
          name: 'meeting_creation',
          purpose: 'Create meetings with full details',
          prompt_summary: 'Given confirmed meeting parameters (participants, time, topic), create a complete meeting invite: professional title, structured agenda, preparation notes, and logistics (room/video link).',
          user_invocable: true,
          tags: ['calendar', 'scheduling', 'meetings'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'calendar', allowedActions: ['create_event', 'update_event', 'delete_event'] },
      ],
      needsWorkspace: false,
      needsApproval: true,
    },
    {
      spec: {
        name: 'Schedule Optimizer Agent',
        role: 'Calendar Optimization & Conflict Resolution Specialist',
        goal: 'Optimize daily and weekly schedules by grouping related meetings, protecting focus time, and suggesting schedule improvements',
        description: 'Analyzes calendar patterns and suggests optimizations: batching similar meetings, protecting deep work blocks, and resolving recurring conflicts.',
        personality: 'Strategic time architect. Sees the big picture in a calendar. Protects productivity ruthlessly.',
        boundaries: ['Suggestions only - cannot move existing meetings without approval', 'Protect existing focus blocks', 'Consider travel time between locations'],
        communication_style: 'Optimization proposals: current_schedule, suggested_changes, expected_benefit, implementation_steps.',
        operating_guidelines: 'Weekly: 1) Analyze upcoming week calendar, 2) Identify fragmentation and context-switching, 3) Suggest meeting batches, 4) Propose focus block placement, 5) Flag conflicting recurring meetings.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 60,
      },
      skills: [
        {
          name: 'schedule_optimization',
          purpose: 'Optimize weekly calendar layout',
          prompt_summary: 'Analyze a week of calendar events. Identify: fragmentation score, context-switching cost, meeting clusters, and focus time availability. Propose optimizations with expected productivity gain.',
          user_invocable: true,
          tags: ['calendar', 'optimization', 'productivity'],
        },
      ],
      tools: [
        { toolType: 'api', bindingName: 'calendar', allowedActions: ['list_events', 'get_freebusy'] },
      ],
      heartbeat: { mode: 'cron', schedule: '0 8 * * 0', purpose: 'Sunday evening weekly schedule optimization review', escalation_summary: 'Alert if upcoming week has more than 80% meeting density' },
      needsWorkspace: false,
      needsApproval: false,
    },
  ],
  triggers: [{ trigger_type: 'event', source: 'scheduling_request' }],
  outputs: [
    { output_type: 'calendar_invite', destination: 'calendar', summary: 'Meeting invites sent to participants' },
    { output_type: 'notification', destination: 'email', summary: 'Scheduling proposals and confirmations sent via email' },
  ],
  guardrails: ['Double-booking prevention', 'Working hours enforcement', 'Privacy-respecting calendar access', 'Confirmation required before invite sends'],
  assumptions: ['Calendar API (Google/Outlook) configured', 'Participant working hours defined', 'Video conferencing integration available'],
};

// ---------------------------------------------------------------------------
// Pattern registry
// ---------------------------------------------------------------------------

const PATTERNS: UseCasePattern[] = [
  emailTriagePattern,
  customerSupportPattern,
  incidentResponsePattern,
  compliancePattern,
  contentMarketingPattern,
  dataReportingPattern,
  invoiceProcessingPattern,
  schedulingPattern,
];

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const LAYOUT = {
  PI_Y: 50,
  TRIGGER_Y: 50,
  HEARTBEAT_Y: 50,
  SPECIALIST_Y: 250,
  SKILL_Y: 450,
  TOOL_Y: 630,
  WORKSPACE_Y: 380,
  APPROVAL_Y: 780,
  OUTPUT_Y: 780,
  CENTER_X: 500,
  COL_WIDTH: 280,
  SKILL_COL_WIDTH: 200,
  TOOL_COL_WIDTH: 200,
} as const;

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

export class PlannerService {
  async generate(input: PlannerInput): Promise<PlannerOutput> {
    const prompt = input.use_case_prompt.toLowerCase();

    // Find best matching pattern
    const scored = PATTERNS.map((p) => {
      const matchCount = p.keywords.filter((kw) => prompt.includes(kw)).length;
      return { pattern: p, score: matchCount };
    }).filter((s) => s.score >= s.pattern.minMatches);

    scored.sort((a, b) => b.score - a.score);

    const pattern = scored.length > 0 ? scored[0].pattern : this.buildGenericPattern(input.use_case_prompt);

    return this.buildFromPattern(pattern, input.use_case_prompt);
  }

  private buildGenericPattern(useCase: string): UseCasePattern {
    const prompt = useCase.toLowerCase();

    // Build a reasonable generic multi-agent architecture
    const specialists: AgentBlueprint[] = [
      {
        spec: {
          name: 'Input Processor Agent',
          role: 'Data Intake & Normalization Specialist',
          goal: 'Receive, validate, and normalize incoming data from all configured sources into a standard format for processing',
          description: 'Handles all inbound data: parses, validates, normalizes, and routes to appropriate downstream agents.',
          personality: 'Reliable and thorough. Catches bad data before it causes problems downstream.',
          boundaries: ['Read-only on input sources', 'Must validate all inputs', 'Flag malformed data for review'],
          communication_style: 'Structured data payloads with validation status.',
          operating_guidelines: 'On input: 1) Validate format, 2) Normalize to standard schema, 3) Route to appropriate processor.',
          model_primary: FAST_MODEL,
          temperature: 0.1,
          timeout_seconds: 30,
        },
        skills: [
          {
            name: 'input_validation',
            purpose: 'Validate and normalize input data',
            prompt_summary: 'Validate incoming data against expected schema. Normalize formats, flag errors, and route valid data for processing.',
            user_invocable: false,
            tags: ['validation', 'parsing', 'intake'],
          },
        ],
        tools: [],
        needsWorkspace: false,
        needsApproval: false,
      },
      {
        spec: {
          name: 'Processing Agent',
          role: 'Core Task Processing Specialist',
          goal: 'Execute the primary processing logic for the use case, transforming inputs into actionable outputs',
          description: `Main processing engine for: ${useCase.slice(0, 100)}. Handles the core business logic and transformation.`,
          personality: 'Focused and efficient. Gets the job done right the first time. Asks for clarification rather than guessing.',
          boundaries: ['Follow defined processing rules', 'Log all processing decisions', 'Escalate edge cases'],
          communication_style: 'Structured processing results with decision reasoning.',
          operating_guidelines: 'On assignment: 1) Review input data, 2) Apply processing rules, 3) Generate output, 4) Validate results, 5) Route to output handler.',
          model_primary: DEFAULT_MODEL,
          temperature: 0.3,
          timeout_seconds: 90,
        },
        skills: [
          {
            name: 'core_processing',
            purpose: 'Execute primary processing logic',
            prompt_summary: `Process the input data according to the use case requirements: ${useCase.slice(0, 80)}. Apply business rules and produce structured output.`,
            user_invocable: true,
            tags: ['processing', 'core', 'business-logic'],
          },
          {
            name: 'decision_making',
            purpose: 'Make routing and processing decisions',
            prompt_summary: 'Given processed data, determine the appropriate next action: approve, escalate, modify, or reject. Provide reasoning for the decision.',
            user_invocable: false,
            tags: ['decision', 'routing', 'logic'],
          },
        ],
        tools: [],
        needsWorkspace: true,
        needsApproval: false,
      },
      {
        spec: {
          name: 'Quality Review Agent',
          role: 'Output Quality & Compliance Reviewer',
          goal: 'Review all outputs for quality, accuracy, and compliance before delivery to ensure consistent high standards',
          description: 'Final quality gate before outputs are delivered. Checks accuracy, completeness, and compliance with standards.',
          personality: 'Critical eye with high standards. Catches what others miss. Constructive in feedback.',
          boundaries: ['Review only - do not modify outputs directly', 'Must provide specific feedback for rejections', 'Approve or reject - no ambiguous states'],
          communication_style: 'Review verdicts with specific feedback: approved, revision_needed (with details), or rejected (with reasoning).',
          operating_guidelines: 'On output review: 1) Check completeness, 2) Verify accuracy, 3) Assess quality standards, 4) Provide verdict with specific feedback.',
          model_primary: DEFAULT_MODEL,
          temperature: 0.2,
          timeout_seconds: 60,
        },
        skills: [
          {
            name: 'quality_review',
            purpose: 'Review outputs for quality and accuracy',
            prompt_summary: 'Review the output against quality standards. Check: completeness, accuracy, formatting, and compliance. Return: verdict (approve/revise/reject), quality score, specific feedback.',
            user_invocable: true,
            tags: ['review', 'quality', 'validation'],
          },
        ],
        tools: [],
        needsWorkspace: false,
        needsApproval: true,
      },
    ];

    // Detect if we need specific tools
    const hasWeb = matchesAny(prompt, ['website', 'web', 'browser', 'scrape', 'crawl', 'url']);
    const hasDb = matchesAny(prompt, ['database', 'sql', 'query', 'data']);
    const hasSlack = matchesAny(prompt, ['slack', 'chat', 'message', 'notification']);
    const hasFile = matchesAny(prompt, ['file', 'document', 'upload', 'download']);

    if (hasWeb) {
      specialists[0].tools.push({ toolType: 'browser', bindingName: 'web_browser', allowedActions: ['navigate', 'scrape', 'search'] });
    }
    if (hasDb) {
      specialists[0].tools.push({ toolType: 'database', bindingName: 'db_query', allowedActions: ['query', 'read'] });
    }
    if (hasSlack) {
      specialists[2].tools.push({ toolType: 'api', bindingName: 'slack', allowedActions: ['send_message', 'read_channel'] });
    }
    if (hasFile) {
      specialists[0].tools.push({ toolType: 'file', bindingName: 'file_system', allowedActions: ['read', 'write', 'list'] });
    }

    return {
      id: 'generic',
      archName: 'Multi-Agent Processing Pipeline',
      keywords: [],
      minMatches: 0,
      piAgent: {
        name: 'Pipeline Orchestrator PI',
        role: 'Primary Intelligence - Pipeline Orchestrator',
        goal: `Coordinate the multi-agent pipeline to accomplish: ${useCase.slice(0, 120)}`,
        description: `Top-level orchestrator that routes work through specialized agents for: ${useCase.slice(0, 100)}`,
        personality: 'Systematic and reliable. Ensures every task is tracked from intake to delivery. Adapts routing based on results.',
        boundaries: ['Follow defined pipeline stages', 'Escalate unhandled cases to human operators', 'Log all routing decisions'],
        communication_style: 'Structured task assignments with clear context. Status updates at each pipeline stage.',
        operating_guidelines: 'Pipeline flow: 1) Receive input, 2) Route to Input Processor, 3) Send to Processing Agent, 4) Submit to Quality Review, 5) Deliver approved outputs.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 120,
      },
      specialists,
      triggers: [{ trigger_type: 'manual', source: 'user' }],
      outputs: [
        { output_type: 'result', destination: 'notification', summary: 'Processing results delivered to configured destination' },
      ],
      guardrails: ['Input validation', 'Output quality checks', 'Rate limiting', 'Error handling and retry logic'],
      assumptions: ['Required data sources accessible', 'Processing rules defined', 'Notification channels configured'],
    };
  }

  private buildFromPattern(pattern: UseCasePattern, useCasePrompt: string): PlannerOutput {
    const nodes: StudioNode[] = [];
    const edges: StudioEdge[] = [];
    const subAgents: AgentSuggestion[] = [];
    const skills: SkillSuggestion[] = [];
    const tools: ToolSuggestion[] = [];
    const triggers: TriggerSuggestion[] = [];
    const heartbeats: HeartbeatSuggestion[] = [];
    const approvals: ApprovalSuggestion[] = [];
    const outputs: OutputSuggestion[] = [];

    // ---- PI Agent (top-center) ----
    const piId = uuidv4();
    nodes.push(buildAgentNode(piId, pattern.piAgent, { x: LAYOUT.CENTER_X, y: LAYOUT.PI_Y }));

    const piAgentSuggestion: AgentSuggestion = {
      name: pattern.piAgent.name,
      role: pattern.piAgent.role,
      goal: pattern.piAgent.goal,
      description: pattern.piAgent.description,
      reuse_mode: 'new',
      skills: [],
      tools: [],
    };

    // ---- Triggers (left of PI) ----
    pattern.triggers.forEach((t, i) => {
      const tId = uuidv4();
      triggers.push(t);
      nodes.push(buildTriggerNode(tId, t.trigger_type, t.source, t.schedule, { x: 100, y: LAYOUT.TRIGGER_Y + i * 80 }));
      edges.push(buildEdge(tId, piId, EdgeRelationType.Triggers));
    });

    // ---- Specialist Agents ----
    const specialistCount = pattern.specialists.length;
    const totalSpecialistWidth = (specialistCount - 1) * LAYOUT.COL_WIDTH;
    const specialistStartX = LAYOUT.CENTER_X - totalSpecialistWidth / 2;

    // Track tool nodes to deduplicate
    const toolNodeMap = new Map<string, string>(); // bindingName -> nodeId

    pattern.specialists.forEach((blueprint, specIdx) => {
      const specX = specialistStartX + specIdx * LAYOUT.COL_WIDTH;
      const specId = uuidv4();

      // Create specialist agent node
      nodes.push(buildAgentNode(specId, blueprint.spec, { x: specX, y: LAYOUT.SPECIALIST_Y }));
      edges.push(buildEdge(piId, specId, EdgeRelationType.Invokes));

      const specSuggestion: AgentSuggestion = {
        name: blueprint.spec.name,
        role: blueprint.spec.role,
        goal: blueprint.spec.goal,
        description: blueprint.spec.description,
        manager_agent_ref: piId,
        reuse_mode: 'new',
        skills: blueprint.skills.map((s) => s.name),
        tools: blueprint.tools.map((t) => t.bindingName),
      };
      subAgents.push(specSuggestion);

      // ---- Skills for this specialist (below agent) ----
      const skillCount = blueprint.skills.length;
      const skillTotalWidth = (skillCount - 1) * LAYOUT.SKILL_COL_WIDTH;
      const skillStartX = specX - skillTotalWidth / 2;

      blueprint.skills.forEach((skill, skIdx) => {
        const skId = uuidv4();
        const skX = skillStartX + skIdx * LAYOUT.SKILL_COL_WIDTH;
        nodes.push(buildSkillNode(skId, skill, { x: skX, y: LAYOUT.SKILL_Y }));
        edges.push(buildEdge(specId, skId, EdgeRelationType.Invokes));
        skills.push({
          name: skill.name,
          purpose: skill.purpose,
          prompt_summary: skill.prompt_summary,
          input_schema: skill.input_schema,
          output_schema: skill.output_schema,
          reuse_mode: 'new',
        });
      });

      // ---- Tools for this specialist (below skills) ----
      blueprint.tools.forEach((tool, tIdx) => {
        let toolId = toolNodeMap.get(tool.bindingName);
        if (!toolId) {
          toolId = uuidv4();
          toolNodeMap.set(tool.bindingName, toolId);
          const toolX = specX + (tIdx - (blueprint.tools.length - 1) / 2) * LAYOUT.TOOL_COL_WIDTH;
          nodes.push(buildToolNode(toolId, tool.toolType, tool.bindingName, tool.allowedActions, { x: toolX, y: LAYOUT.TOOL_Y }));
          tools.push({
            tool_type: tool.toolType,
            binding_name: tool.bindingName,
            allowed_actions: tool.allowedActions,
            reuse_mode: 'new',
          });
        }
        edges.push(buildEdge(specId, toolId, EdgeRelationType.Uses));
      });

      // ---- Heartbeat for this specialist ----
      if (blueprint.heartbeat) {
        const hbId = uuidv4();
        const hb = blueprint.heartbeat;
        heartbeats.push({ mode: hb.mode, schedule: hb.schedule, purpose: hb.purpose, escalation_summary: hb.escalation_summary });
        nodes.push(buildHeartbeatNode(hbId, hb.mode, hb.schedule, hb.purpose, hb.escalation_summary, { x: specX + 120, y: LAYOUT.HEARTBEAT_Y }));
        edges.push(buildEdge(hbId, specId, EdgeRelationType.ManagedBy));

        // Link agent to heartbeat ref
        const agentNode = nodes.find((n) => n.id === specId);
        if (agentNode && agentNode.config && 'heartbeat_ref' in agentNode.config) {
          (agentNode.config as { heartbeat_ref?: string }).heartbeat_ref = hbId;
        }
      }

      // ---- Workspace for this specialist ----
      if (blueprint.needsWorkspace) {
        const wsId = uuidv4();
        nodes.push(buildWorkspaceNode(wsId, `Working memory and context storage for ${blueprint.spec.name}`, `Stores intermediate results, conversation context, and agent-specific state for ${blueprint.spec.role}`, { x: specX + 140, y: LAYOUT.WORKSPACE_Y }));
        edges.push(buildEdge(specId, wsId, EdgeRelationType.Uses));

        // Link agent to workspace ref
        const agentNode = nodes.find((n) => n.id === specId);
        if (agentNode && agentNode.config && 'workspace_ref' in agentNode.config) {
          (agentNode.config as { workspace_ref?: string }).workspace_ref = wsId;
        }
      }

      // ---- Approval gate for this specialist ----
      if (blueprint.needsApproval) {
        const appId = uuidv4();
        const rationale = `Human review required before ${blueprint.spec.name} can execute external actions`;
        approvals.push({ required: true, reviewer_type: 'human', rationale });
        nodes.push(buildApprovalNode(appId, 'human', rationale, { x: specX, y: LAYOUT.APPROVAL_Y }));
        edges.push(buildEdge(specId, appId, EdgeRelationType.Approves));
      }
    });

    // ---- Outputs ----
    pattern.outputs.forEach((out, i) => {
      const outId = uuidv4();
      outputs.push(out);
      const outX = LAYOUT.CENTER_X + (i - (pattern.outputs.length - 1) / 2) * 250;
      nodes.push(buildOutputNode(outId, out.output_type, out.destination, out.summary, { x: outX, y: LAYOUT.OUTPUT_Y + 80 }));
      edges.push(buildEdge(piId, outId, EdgeRelationType.WritesTo));
    });

    // ---- Build graph seed ----
    const now = new Date().toISOString();
    const graphSeed: StudioGraph = {
      nodes,
      edges,
      metadata: {
        name: pattern.archName,
        description: useCasePrompt,
        created_at: now,
        updated_at: now,
        version: 1,
      },
    };

    const output: PlannerOutput = {
      use_case_summary: `Architecture plan for: ${useCasePrompt}`,
      recommended_architecture_name: pattern.archName,
      top_level_goal: pattern.piAgent.goal,
      top_level_agent: piAgentSuggestion,
      sub_agents: subAgents,
      reusable_assets: [],
      proposed_new_assets: [
        ...subAgents.map((sa) => ({ asset_type: 'agent', name: sa.name, description: sa.description, rationale: `Required for ${pattern.archName}` })),
        ...skills.map((sk) => ({ asset_type: 'skill', name: sk.name, description: sk.purpose, rationale: `Required for ${pattern.archName}` })),
        ...tools.map((t) => ({ asset_type: 'tool', name: t.binding_name, description: `${t.tool_type} tool`, rationale: `Required for ${pattern.archName}` })),
      ],
      skills,
      tools,
      triggers,
      heartbeat: heartbeats,
      approvals,
      outputs,
      guardrails: pattern.guardrails,
      assumptions: pattern.assumptions,
      graph_seed: graphSeed,
    };

    return output;
  }

  async refine(currentOutput: PlannerOutput, feedback: string): Promise<PlannerOutput> {
    const lower = feedback.toLowerCase();
    const refined = JSON.parse(JSON.stringify(currentOutput)) as PlannerOutput;
    const graph = refined.graph_seed;
    const now = new Date().toISOString();

    // Handle "add" requests
    if (matchesAny(lower, ['add agent', 'more agent', 'another agent', 'need agent'])) {
      const id = uuidv4();
      const name = 'Additional Specialist Agent';
      const spec: AgentSpec = {
        name,
        role: 'Supplementary Specialist',
        goal: 'Handle additional tasks identified during refinement',
        description: 'Additional specialist agent added based on feedback to cover gaps in the pipeline.',
        personality: 'Adaptable and focused. Quick learner. Fills gaps efficiently.',
        boundaries: ['Follow established pipeline conventions', 'Log all actions', 'Escalate edge cases'],
        communication_style: 'Structured outputs consistent with pipeline format.',
        operating_guidelines: 'On assignment: 1) Review task context, 2) Apply relevant processing, 3) Output results in standard format, 4) Report completion.',
        model_primary: DEFAULT_MODEL,
        temperature: 0.3,
        timeout_seconds: 60,
      };
      const sa: AgentSuggestion = { name, role: spec.role, goal: spec.goal, description: spec.description, reuse_mode: 'new', skills: [], tools: [] };
      refined.sub_agents.push(sa);
      const maxX = Math.max(...graph.nodes.filter((n) => n.type === NodeType.Agent).map((n) => n.position.x), 200);
      graph.nodes.push(buildAgentNode(id, spec, { x: maxX + LAYOUT.COL_WIDTH, y: LAYOUT.SPECIALIST_Y }));
      const topNode = graph.nodes.find((n) => n.type === NodeType.Agent && n.position.y <= 100);
      if (topNode) graph.edges.push(buildEdge(topNode.id, id, EdgeRelationType.Invokes));
    }

    if (matchesAny(lower, ['add skill', 'more skill', 'another skill', 'need skill'])) {
      const id = uuidv4();
      const spec: SkillSpec = {
        name: 'additional_skill',
        purpose: 'Additional capability based on feedback',
        prompt_summary: 'Perform the additional task as specified in refinement feedback.',
        user_invocable: true,
        tags: ['custom', 'added'],
      };
      refined.skills.push({ name: spec.name, purpose: spec.purpose, prompt_summary: spec.prompt_summary, reuse_mode: 'new' });
      const maxX = Math.max(...graph.nodes.filter((n) => n.type === NodeType.Skill).map((n) => n.position.x), 100);
      graph.nodes.push(buildSkillNode(id, spec, { x: maxX + LAYOUT.SKILL_COL_WIDTH, y: LAYOUT.SKILL_Y }));
    }

    if (matchesAny(lower, ['add tool', 'more tool', 'another tool', 'need tool'])) {
      const id = uuidv4();
      refined.tools.push({ tool_type: 'api', binding_name: 'additional_tool', allowed_actions: ['read', 'write'], reuse_mode: 'new' });
      const maxX = Math.max(...graph.nodes.filter((n) => n.type === NodeType.Tool).map((n) => n.position.x), 100);
      graph.nodes.push(buildToolNode(id, 'api', 'additional_tool', ['read', 'write'], { x: maxX + LAYOUT.TOOL_COL_WIDTH, y: LAYOUT.TOOL_Y }));
    }

    if (matchesAny(lower, ['add approval', 'need approval', 'require approval', 'human review'])) {
      if (!graph.nodes.some((n) => n.type === NodeType.Approval)) {
        const id = uuidv4();
        refined.approvals.push({ required: true, reviewer_type: 'human', rationale: 'Added per refinement feedback' });
        graph.nodes.push(buildApprovalNode(id, 'human', 'Added per refinement feedback', { x: LAYOUT.CENTER_X, y: LAYOUT.APPROVAL_Y }));
        const topNode = graph.nodes.find((n) => n.type === NodeType.Agent && n.position.y <= 100);
        if (topNode) graph.edges.push(buildEdge(topNode.id, id, EdgeRelationType.Approves));
      }
    }

    if (matchesAny(lower, ['add heartbeat', 'need heartbeat', 'monitoring', 'periodic check'])) {
      if (!graph.nodes.some((n) => n.type === NodeType.Heartbeat)) {
        const id = uuidv4();
        refined.heartbeat.push({ mode: 'interval', schedule: '*/30 * * * *', purpose: 'Periodic health check added per feedback', escalation_summary: 'Alert on consecutive failures' });
        graph.nodes.push(buildHeartbeatNode(id, 'interval', '*/30 * * * *', 'Periodic health check added per feedback', 'Alert on consecutive failures', { x: LAYOUT.CENTER_X + 300, y: LAYOUT.HEARTBEAT_Y }));
        const topNode = graph.nodes.find((n) => n.type === NodeType.Agent && n.position.y <= 100);
        if (topNode) graph.edges.push(buildEdge(id, topNode.id, EdgeRelationType.ManagedBy));
      }
    }

    if (matchesAny(lower, ['add workspace', 'need workspace', 'memory', 'context storage'])) {
      const specAgents = graph.nodes.filter((n) => n.type === NodeType.Agent && n.position.y > 100);
      const agentWithoutWorkspace = specAgents.find((a) => {
        return !graph.edges.some((e) => e.source === a.id && graph.nodes.find((n) => n.id === e.target && n.type === NodeType.Workspace));
      });
      if (agentWithoutWorkspace) {
        const wsId = uuidv4();
        graph.nodes.push(buildWorkspaceNode(wsId, `Working memory for ${agentWithoutWorkspace.label}`, 'Context and state storage', { x: agentWithoutWorkspace.position.x + 140, y: LAYOUT.WORKSPACE_Y }));
        graph.edges.push(buildEdge(agentWithoutWorkspace.id, wsId, EdgeRelationType.Uses));
      }
    }

    // Handle "remove" requests
    if (matchesAny(lower, ['remove approval', 'no approval', 'skip approval'])) {
      graph.nodes = graph.nodes.filter((n) => n.type !== NodeType.Approval);
      graph.edges = graph.edges.filter((e) => {
        const src = graph.nodes.find((n) => n.id === e.source);
        const tgt = graph.nodes.find((n) => n.id === e.target);
        return src && tgt;
      });
      refined.approvals = [];
    }

    if (matchesAny(lower, ['remove heartbeat', 'no heartbeat'])) {
      graph.nodes = graph.nodes.filter((n) => n.type !== NodeType.Heartbeat);
      graph.edges = graph.edges.filter((e) => {
        const src = graph.nodes.find((n) => n.id === e.source);
        const tgt = graph.nodes.find((n) => n.id === e.target);
        return src && tgt;
      });
      refined.heartbeat = [];
    }

    // Handle simplification
    if (matchesAny(lower, ['simplify', 'simpler', 'fewer', 'reduce'])) {
      const topNode = graph.nodes.find((n) => n.type === NodeType.Agent && n.position.y <= 100);
      const subNodes = graph.nodes.filter((n) => n.type === NodeType.Agent && n.id !== topNode?.id);
      const keepSubAgents = subNodes.slice(0, 2); // Keep first 2 specialists

      const keepIds = new Set<string>();
      if (topNode) keepIds.add(topNode.id);
      keepSubAgents.forEach((n) => keepIds.add(n.id));

      // Keep skills connected to kept agents
      const keptAgentIds = new Set(keepIds);
      graph.edges.forEach((e) => {
        if (keptAgentIds.has(e.source) && e.relation_type === EdgeRelationType.Invokes) {
          const targetNode = graph.nodes.find((n) => n.id === e.target && n.type === NodeType.Skill);
          if (targetNode) keepIds.add(targetNode.id);
        }
      });

      // Keep triggers
      graph.nodes.filter((n) => n.type === NodeType.Trigger).forEach((n) => keepIds.add(n.id));

      graph.nodes = graph.nodes.filter((n) => keepIds.has(n.id));
      graph.edges = graph.edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target));
      refined.sub_agents = refined.sub_agents.slice(0, 2);
      refined.tools = [];
      refined.approvals = [];
      refined.heartbeat = [];
    }

    graph.metadata.updated_at = now;
    graph.metadata.version += 1;

    return refined;
  }
}

export const plannerService = new PlannerService();
