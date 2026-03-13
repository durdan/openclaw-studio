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

// ── Node helpers ───────────────────────────────────────────────

function agentNode(
  label: string,
  role: string,
  goal: string,
  pos: { x: number; y: number },
  extra?: {
    responsibilities?: string[];
    do_rules?: string[];
    dont_rules?: string[];
    model?: string;
    handoffs?: string[];
  },
) {
  return {
    id: uuidv4(),
    type: NodeType.Agent,
    label,
    config: {
      name: label,
      role,
      goal,
      description: role,
      reuse_mode: 'new' as const,
      ...(extra?.responsibilities && { responsibilities: extra.responsibilities }),
      ...(extra?.do_rules && { do_rules: extra.do_rules }),
      ...(extra?.dont_rules && { dont_rules: extra.dont_rules }),
      ...(extra?.model && { model: extra.model }),
      ...(extra?.handoffs && { handoffs: extra.handoffs }),
    },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: pos,
  };
}

function skillNode(label: string, purpose: string, pos: { x: number; y: number }) {
  return {
    id: uuidv4(),
    type: NodeType.Skill,
    label,
    config: { name: label, purpose, prompt_summary: `Execute ${label}`, reuse_mode: 'new' as const },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: pos,
  };
}

function toolNode(label: string, toolType: string, pos: { x: number; y: number }) {
  return {
    id: uuidv4(),
    type: NodeType.Tool,
    label,
    config: { tool_type: toolType, binding_name: label, allowed_actions: ['read', 'write'], reuse_mode: 'new' as const },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: pos,
  };
}

function triggerNode(label: string, schedule: string, pos: { x: number; y: number }, triggerType: string = 'schedule') {
  return {
    id: uuidv4(),
    type: NodeType.Trigger,
    label,
    config: { trigger_type: triggerType, source: triggerType === 'event' ? 'webhook' : 'cron', schedule },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: pos,
  };
}

function heartbeatNode(schedule: string, purpose: string, pos: { x: number; y: number }) {
  return {
    id: uuidv4(),
    type: NodeType.Heartbeat,
    label: 'Heartbeat',
    config: { mode: 'cron', schedule, purpose },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: pos,
  };
}

function approvalNode(label: string, rationale: string, pos: { x: number; y: number }) {
  return {
    id: uuidv4(),
    type: NodeType.Approval,
    label,
    config: { required: true, reviewer_type: 'human', rationale },
    proposed_new: true,
    validation_state: ValidationState.Incomplete,
    position: pos,
  };
}

function edge(source: string, target: string, relation: EdgeRelationType) {
  return { id: uuidv4(), source, target, relation_type: relation };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildGraph(name: string, description: string, nodes: any[], edges: ReturnType<typeof edge>[]) {
  const now = new Date().toISOString();
  return { nodes, edges, metadata: { name, description, created_at: now, updated_at: now, version: 1 } };
}

// ── Template definitions (based on real OpenClaw use cases) ────

function emailIntelligenceTemplate() {
  // Use Case 1: Email Monitoring & Draft Preparation
  const coordinator = agentNode('Inbox Intelligence', 'Email classifier and routing coordinator', 'Monitor 10 company inboxes, classify every email by intent/urgency/sentiment, draft responses, route to responsible person', { x: 400, y: 50 }, {
    responsibilities: ['Classify emails by intent, urgency, and sentiment', 'Draft appropriate responses per mailbox tone', 'Route to responsible person via Telegram', 'Create ClickUp tasks for actionable items', 'Morning digest at 8 AM weekdays'],
    do_rules: ['Save responses as drafts — never auto-send', 'Classify conservatively when intent is ambiguous', 'Flag privacy/security@ as high priority'],
    dont_rules: ['Never auto-send emails', 'Never guess at intent', 'Never draft content for payroll@ (sensitive HR)'],
    model: 'claude-sonnet-4-20250514',
  });

  const emailSkill = skillNode('email-cli', 'Gmail/Outlook integration via OAuth 2.0', { x: 100, y: 300 });
  const calendarSkill = skillNode('calendar-cli', 'Google Calendar integration', { x: 280, y: 300 });
  const classifySkill = skillNode('classification', 'Intent, urgency, and sentiment classification', { x: 460, y: 300 });
  const draftSkill = skillNode('email-drafting', 'Draft responses in mailbox-appropriate tone', { x: 640, y: 300 });

  const gmail = toolNode('Gmail', 'api', { x: 100, y: 480 });
  const telegram = toolNode('Telegram', 'api', { x: 300, y: 480 });
  const clickup = toolNode('ClickUp', 'api', { x: 500, y: 480 });

  const hb = heartbeatNode('*/30 * * * *', 'Check all monitored inboxes, classify new emails, draft responses, route', { x: 700, y: 50 });
  const morningCron = triggerNode('Morning Digest', '0 8 * * 1-5', { x: 100, y: 50 });
  const approval = approvalNode('Human Review', 'All drafted emails require 1-click human approval before sending', { x: 400, y: 630 });

  const nodes = [coordinator, emailSkill, calendarSkill, classifySkill, draftSkill, gmail, telegram, clickup, hb, morningCron, approval];
  const edges = [
    edge(coordinator.id, emailSkill.id, EdgeRelationType.Invokes),
    edge(coordinator.id, calendarSkill.id, EdgeRelationType.Invokes),
    edge(coordinator.id, classifySkill.id, EdgeRelationType.Invokes),
    edge(coordinator.id, draftSkill.id, EdgeRelationType.Invokes),
    edge(coordinator.id, gmail.id, EdgeRelationType.Uses),
    edge(coordinator.id, telegram.id, EdgeRelationType.Uses),
    edge(coordinator.id, clickup.id, EdgeRelationType.Uses),
    edge(hb.id, coordinator.id, EdgeRelationType.ManagedBy),
    edge(morningCron.id, coordinator.id, EdgeRelationType.Triggers),
    edge(coordinator.id, approval.id, EdgeRelationType.Approves),
  ];

  return {
    name: 'Email Intelligence',
    description: 'Autonomous inbox monitoring across 10 mailboxes. Classifies emails by intent, urgency, and sentiment. Drafts responses and routes to the right person — all before anyone opens Gmail.',
    template_json: {
      planner_output: {
        use_case_summary: 'Monitor all company inboxes, classify every email, draft responses, and route to responsible handlers',
        recommended_architecture_name: 'Email Intelligence Pipeline',
        top_level_goal: 'Zero-touch email triage with human-in-the-loop approval for sending',
      },
      graph_seed: buildGraph('Email Intelligence', 'Autonomous inbox monitoring and triage', nodes, edges),
    },
  };
}

function devopsAutomationTemplate() {
  // Use Case 2: DevOps & Engineering Automation
  const devopsAgent = agentNode('DevOps Engineer', 'Incident response and CI/CD auto-remediation', 'Analyze stack traces, diagnose errors, generate fix PRs, notify team', { x: 400, y: 50 }, {
    responsibilities: ['Analyze Sentry webhooks with stack traces', 'Locate relevant code via GitHub', 'Generate fixes with unit tests', 'Open PRs with root cause analysis', 'Post to Slack with PR link', 'Page on-call for P0/P1 critical issues'],
    do_rules: ['Always include tests with fixes', 'Provide root cause analysis in PR description', 'Classify severity before acting'],
    dont_rules: ['Never merge PRs automatically', 'Never deploy without human approval', 'Never modify production config directly'],
    model: 'claude-sonnet-4-20250514',
  });

  const githubSkill = skillNode('github-cli', 'GitHub repo access, issues, PR creation', { x: 100, y: 300 });
  const devopsSkill = skillNode('agentic-devops', 'Docker, logs, process management', { x: 300, y: 300 });
  const incidentSkill = skillNode('incident-analysis', 'Stack trace parsing and root cause analysis', { x: 500, y: 300 });
  const notifySkill = skillNode('notification-drafting', 'Craft clear incident notifications for Slack', { x: 700, y: 300 });

  const slack = toolNode('Slack', 'api', { x: 200, y: 480 });
  const github = toolNode('GitHub', 'api', { x: 400, y: 480 });
  const pagerduty = toolNode('PagerDuty', 'api', { x: 600, y: 480 });

  const sentryTrigger = triggerNode('Sentry Webhook', '', { x: 100, y: 50 }, 'event');
  const hb = heartbeatNode('30 7 * * 1-5', 'DevOps brief: open PRs, failed builds, new issues, deployment health', { x: 700, y: 50 });
  const approval = approvalNode('Merge Approval', 'Auto-fix PRs require human review before merge', { x: 400, y: 630 });

  const nodes = [devopsAgent, githubSkill, devopsSkill, incidentSkill, notifySkill, slack, github, pagerduty, sentryTrigger, hb, approval];
  const edges = [
    edge(devopsAgent.id, githubSkill.id, EdgeRelationType.Invokes),
    edge(devopsAgent.id, devopsSkill.id, EdgeRelationType.Invokes),
    edge(devopsAgent.id, incidentSkill.id, EdgeRelationType.Invokes),
    edge(devopsAgent.id, notifySkill.id, EdgeRelationType.Invokes),
    edge(devopsAgent.id, slack.id, EdgeRelationType.Uses),
    edge(devopsAgent.id, github.id, EdgeRelationType.Uses),
    edge(devopsAgent.id, pagerduty.id, EdgeRelationType.Uses),
    edge(sentryTrigger.id, devopsAgent.id, EdgeRelationType.Triggers),
    edge(hb.id, devopsAgent.id, EdgeRelationType.ManagedBy),
    edge(devopsAgent.id, approval.id, EdgeRelationType.Approves),
  ];

  return {
    name: 'DevOps Auto-Remediation',
    description: 'Sentry webhook triggers analysis → diagnose stack trace → generate fix with tests → open PR → notify Slack. Morning brief on open PRs, failed builds, and deployments.',
    template_json: {
      planner_output: {
        use_case_summary: 'Autonomous incident response: analyze errors, generate fixes, open PRs, and notify the team',
        recommended_architecture_name: 'DevOps Incident Response Pipeline',
        top_level_goal: 'Shift from engineers operating tools to engineers supervising agents that operate tools',
      },
      graph_seed: buildGraph('DevOps Auto-Remediation', 'Autonomous incident response and CI/CD remediation', nodes, edges),
    },
  };
}

function brainAndHandsTemplate() {
  // Use Case 3: OpenClaw + n8n
  const brain = agentNode('Brain Agent', 'LLM reasoning, classification, and decision-making', 'Receive requests, reason about them, classify intent, and trigger n8n workflows for execution', { x: 400, y: 50 }, {
    responsibilities: ['Email classification and draft generation', 'Stack trace diagnosis', 'Invoice PDF classification (vision)', 'Regulatory change assessment', 'Morning briefing synthesis'],
    do_rules: ['Use n8n for all deterministic execution', 'Keep credentials in n8n only', 'Classify before routing to workflow'],
    dont_rules: ['Never store API keys directly', 'Never execute deterministic tasks — delegate to n8n', 'Never access credentials directly'],
    model: 'claude-sonnet-4-20250514',
  });

  const classifySkill = skillNode('classification', 'LLM-based intent and priority classification', { x: 150, y: 250 });
  const synthesisSkill = skillNode('report-synthesis', 'Aggregate and synthesize data into actionable summaries', { x: 400, y: 250 });
  const analysisSkill = skillNode('code-analysis', 'Read and diagnose code errors and stack traces', { x: 650, y: 250 });

  const n8nTool = toolNode('n8n Webhooks', 'api', { x: 200, y: 430 });
  const mcpTool = toolNode('n8n-MCP Bridge', 'mcp', { x: 450, y: 430 });
  const telegramTool = toolNode('Telegram', 'api', { x: 650, y: 430 });

  const hb = heartbeatNode('*/30 * * * *', 'Check for pending tasks, process incoming requests, trigger n8n workflows', { x: 700, y: 50 });
  const morningCron = triggerNode('Morning Brief', '0 7 * * 1-5', { x: 100, y: 50 });

  const nodes = [brain, classifySkill, synthesisSkill, analysisSkill, n8nTool, mcpTool, telegramTool, hb, morningCron];
  const edges = [
    edge(brain.id, classifySkill.id, EdgeRelationType.Invokes),
    edge(brain.id, synthesisSkill.id, EdgeRelationType.Invokes),
    edge(brain.id, analysisSkill.id, EdgeRelationType.Invokes),
    edge(brain.id, n8nTool.id, EdgeRelationType.Uses),
    edge(brain.id, mcpTool.id, EdgeRelationType.Uses),
    edge(brain.id, telegramTool.id, EdgeRelationType.Uses),
    edge(hb.id, brain.id, EdgeRelationType.ManagedBy),
    edge(morningCron.id, brain.id, EdgeRelationType.Triggers),
  ];

  return {
    name: 'Brain & Hands (OpenClaw + n8n)',
    description: 'The dominant pattern: OpenClaw reasons and classifies (the Brain), n8n executes deterministic workflows (the Hands). Credentials stay isolated in n8n. 60-80% of tasks offloaded to free execution.',
    template_json: {
      planner_output: {
        use_case_summary: 'OpenClaw as reasoning brain + n8n as execution hands. Best of both worlds.',
        recommended_architecture_name: 'Brain & Hands Architecture',
        top_level_goal: 'LLM reasoning for classification and decisions, deterministic execution via n8n workflows',
      },
      graph_seed: buildGraph('Brain & Hands', 'OpenClaw reasons, n8n executes', nodes, edges),
    },
  };
}

function complianceMonitorTemplate() {
  // Use Case 4: Compliance & Regulatory Monitoring
  const complianceAgent = agentNode('Compliance Monitor', 'Regulatory surveillance and compliance auditing', 'Monitor regulatory websites for changes, assess impact, generate compliance reports, alert stakeholders', { x: 400, y: 50 }, {
    responsibilities: ['Browse regulatory sites on schedule via Playwright', 'Compare today vs yesterday for changes', 'AI-assess relevance and impact of changes', 'Generate plain-English summaries of filings', 'Run security audits (56 automated checks)'],
    do_rules: ['Alert immediately on critical regulatory changes', 'Map findings to compliance frameworks (OWASP, MITRE, NIST)', 'Keep audit trail of all assessments'],
    dont_rules: ['Never make compliance decisions without human review', 'Never skip scheduled checks'],
    model: 'claude-sonnet-4-20250514',
  });

  const browserSkill = skillNode('browser-automation', 'Playwright browser for regulatory site scraping', { x: 100, y: 300 });
  const pdfSkill = skillNode('pdf-extraction', 'PDF text and table extraction from regulatory docs', { x: 300, y: 300 });
  const securitySkill = skillNode('security-audit', '56 automated checks mapped to OWASP/MITRE/NIST', { x: 500, y: 300 });
  const reportSkill = skillNode('report-generation', 'Generate compliance reports and summaries', { x: 700, y: 300 });

  const telegram = toolNode('Telegram', 'api', { x: 200, y: 480 });
  const storage = toolNode('Document Store', 'api', { x: 400, y: 480 });
  const clickup = toolNode('ClickUp', 'api', { x: 600, y: 480 });

  const hb = heartbeatNode('0 */6 * * *', 'Check regulatory sites for changes, assess impact, generate alerts', { x: 700, y: 50 });
  const cronTrigger = triggerNode('Daily Audit', '0 6 * * *', { x: 100, y: 50 });
  const approval = approvalNode('Compliance Review', 'All regulatory assessments require compliance officer sign-off', { x: 400, y: 630 });

  const nodes = [complianceAgent, browserSkill, pdfSkill, securitySkill, reportSkill, telegram, storage, clickup, hb, cronTrigger, approval];
  const edges = [
    edge(complianceAgent.id, browserSkill.id, EdgeRelationType.Invokes),
    edge(complianceAgent.id, pdfSkill.id, EdgeRelationType.Invokes),
    edge(complianceAgent.id, securitySkill.id, EdgeRelationType.Invokes),
    edge(complianceAgent.id, reportSkill.id, EdgeRelationType.Invokes),
    edge(complianceAgent.id, telegram.id, EdgeRelationType.Uses),
    edge(complianceAgent.id, storage.id, EdgeRelationType.Uses),
    edge(complianceAgent.id, clickup.id, EdgeRelationType.Uses),
    edge(hb.id, complianceAgent.id, EdgeRelationType.ManagedBy),
    edge(cronTrigger.id, complianceAgent.id, EdgeRelationType.Triggers),
    edge(complianceAgent.id, approval.id, EdgeRelationType.Approves),
  ];

  return {
    name: 'Compliance & Regulatory Monitor',
    description: 'Playwright browses regulatory sites on schedule, compares changes, AI assesses impact. Supports SEC filing watch, GDPR assessments, SOC 2, ISO 27001. 56 automated security checks.',
    template_json: {
      planner_output: {
        use_case_summary: 'Automated regulatory monitoring with browser automation, AI interpretation, and compliance reporting',
        recommended_architecture_name: 'Compliance Surveillance Pipeline',
        top_level_goal: 'Continuous regulatory monitoring with AI-assessed impact analysis',
      },
      graph_seed: buildGraph('Compliance Monitor', 'Regulatory surveillance and compliance automation', nodes, edges),
    },
  };
}

function marketingGrowthTemplate() {
  // Use Case 5: Marketing & Growth Automation
  const marketingAgent = agentNode('Growth Coordinator', 'Meta-layer across marketing stack — proactive, not reactive', 'Coordinate competitor monitoring, multi-platform social posting, SEO automation, and content pipeline', { x: 400, y: 50 }, {
    responsibilities: ['Monitor competitor ads on Meta Ad Library + Google Ads', 'Coordinate multi-platform social posting', 'SEO rank monitoring and competitor analysis', 'Research → write → format → post pipeline'],
    do_rules: ['Track token spend and flag budget alerts', 'A/B test content variations', 'Report metrics with evidence'],
    dont_rules: ['Never spend without budget approval', 'Never post without content review', 'Never fabricate metrics'],
    model: 'claude-sonnet-4-20250514',
  });

  const socialSkill = skillNode('post-bridge', 'Multi-platform: Instagram, TikTok, YouTube, X, LinkedIn, Threads', { x: 100, y: 300 });
  const seoSkill = skillNode('programmatic-seo', 'Rank monitoring, competitor analysis, page generation', { x: 350, y: 300 });
  const scrapingSkill = skillNode('firecrawl-cli', 'Web scraping for competitor intelligence', { x: 600, y: 300 });

  const socialPlatforms = toolNode('Social APIs', 'api', { x: 150, y: 470 });
  const analytics = toolNode('Analytics', 'api', { x: 400, y: 470 });
  const telegram = toolNode('Telegram', 'api', { x: 600, y: 470 });

  const hb = heartbeatNode('0 */4 * * *', 'Check competitor activity, monitor rankings, schedule posts', { x: 700, y: 50 });
  const contentCron = triggerNode('Content Schedule', '0 9 * * 1-5', { x: 100, y: 50 });
  const approval = approvalNode('Content Approval', 'All social posts require human review before publishing', { x: 400, y: 620 });

  const nodes = [marketingAgent, socialSkill, seoSkill, scrapingSkill, socialPlatforms, analytics, telegram, hb, contentCron, approval];
  const edges = [
    edge(marketingAgent.id, socialSkill.id, EdgeRelationType.Invokes),
    edge(marketingAgent.id, seoSkill.id, EdgeRelationType.Invokes),
    edge(marketingAgent.id, scrapingSkill.id, EdgeRelationType.Invokes),
    edge(marketingAgent.id, socialPlatforms.id, EdgeRelationType.Uses),
    edge(marketingAgent.id, analytics.id, EdgeRelationType.Uses),
    edge(marketingAgent.id, telegram.id, EdgeRelationType.Uses),
    edge(hb.id, marketingAgent.id, EdgeRelationType.ManagedBy),
    edge(contentCron.id, marketingAgent.id, EdgeRelationType.Triggers),
    edge(marketingAgent.id, approval.id, EdgeRelationType.Approves),
  ];

  return {
    name: 'Marketing & Growth Automation',
    description: 'Competitor ad monitoring, multi-platform social posting (7 platforms), SEO automation, and content pipeline. AI coordinates the entire marketing stack proactively.',
    template_json: {
      planner_output: {
        use_case_summary: 'AI-coordinated marketing: competitor intel, multi-platform social, SEO, and content pipeline',
        recommended_architecture_name: 'Marketing Growth Engine',
        top_level_goal: 'Proactive marketing automation across all channels with human content approval',
      },
      graph_seed: buildGraph('Marketing Growth', 'AI-powered marketing automation', nodes, edges),
    },
  };
}

function dataAnalyticsTemplate() {
  // Use Case 6: Data & Analytics Automation
  const analyticsAgent = agentNode('Analytics Agent', 'Automated data collection, analysis, and reporting', 'Gather KPIs from multiple sources, generate period comparisons, produce daily/weekly reports, track expenses', { x: 400, y: 50 }, {
    responsibilities: ['Daily KPI dashboard from GA + Stripe + CRM', 'Cross-platform analytics aggregation', 'Weekly report automation (5-hour manual → automated)', 'Receipt OCR and expense tracking', 'Invoice processing and accounting'],
    do_rules: ['Always show period-over-period comparisons', 'Include data source and freshness in reports', 'Flag anomalies and outliers automatically'],
    dont_rules: ['Never fabricate data points', 'Never make financial decisions autonomously'],
    model: 'claude-sonnet-4-20250514',
  });

  const dataSkill = skillNode('data-aggregation', 'Collect and merge data from multiple APIs', { x: 100, y: 280 });
  const reportSkill = skillNode('report-generation', 'Generate formatted reports with charts and tables', { x: 350, y: 280 });
  const expenseSkill = skillNode('smart-expense-tracker', 'Receipt OCR via WhatsApp photo → spreadsheet', { x: 600, y: 280 });

  const stripe = toolNode('Stripe', 'api', { x: 100, y: 450 });
  const ga = toolNode('Google Analytics', 'api', { x: 300, y: 450 });
  const sheets = toolNode('Google Sheets', 'api', { x: 500, y: 450 });
  const slack = toolNode('Slack', 'api', { x: 700, y: 450 });

  const morningCron = triggerNode('Daily KPI Report', '0 8 * * *', { x: 100, y: 50 });
  const weeklyCron = triggerNode('Weekly Summary', '0 8 * * 1', { x: 250, y: 50 });
  const hb = heartbeatNode('0 */2 * * *', 'Monitor data sources for anomalies, update dashboards', { x: 700, y: 50 });

  const nodes = [analyticsAgent, dataSkill, reportSkill, expenseSkill, stripe, ga, sheets, slack, morningCron, weeklyCron, hb];
  const edges = [
    edge(analyticsAgent.id, dataSkill.id, EdgeRelationType.Invokes),
    edge(analyticsAgent.id, reportSkill.id, EdgeRelationType.Invokes),
    edge(analyticsAgent.id, expenseSkill.id, EdgeRelationType.Invokes),
    edge(analyticsAgent.id, stripe.id, EdgeRelationType.Uses),
    edge(analyticsAgent.id, ga.id, EdgeRelationType.Uses),
    edge(analyticsAgent.id, sheets.id, EdgeRelationType.Uses),
    edge(analyticsAgent.id, slack.id, EdgeRelationType.Uses),
    edge(morningCron.id, analyticsAgent.id, EdgeRelationType.Triggers),
    edge(weeklyCron.id, analyticsAgent.id, EdgeRelationType.Triggers),
    edge(hb.id, analyticsAgent.id, EdgeRelationType.ManagedBy),
  ];

  return {
    name: 'Data & Analytics Automation',
    description: 'Daily KPI dashboards, cross-platform analytics, weekly report automation, expense tracking via receipt photos. What used to take 5 hours every Friday now runs at 8 AM automatically.',
    template_json: {
      planner_output: {
        use_case_summary: 'Automated data collection, analysis, and reporting from multiple business sources',
        recommended_architecture_name: 'Analytics Automation Pipeline',
        top_level_goal: 'Numbers that come to you — with analysis, on schedule',
      },
      graph_seed: buildGraph('Data Analytics', 'Automated data collection and reporting', nodes, edges),
    },
  };
}

function multiAgentFullStackTemplate() {
  // Appendix A1: Multi-Agent Full Stack (Inbox + Neo + Pulse)
  const inbox = agentNode('Inbox Intelligence', 'Email classifier and router', 'Monitor all inboxes, classify, draft, route', { x: 150, y: 50 }, {
    responsibilities: ['Monitor 10 company inboxes', 'Classify by intent/urgency/sentiment', 'Draft responses', 'Route to handlers'],
    dont_rules: ['Never auto-send emails'],
    model: 'claude-sonnet-4-20250514',
    handoffs: ['neo'],
  });

  const neo = agentNode('Neo — Engineering', 'DevOps and engineering assistant', 'Handle code reviews, CI/CD issues, incident response, and PR management', { x: 450, y: 50 }, {
    responsibilities: ['Code review and PR management', 'CI/CD pipeline monitoring', 'Incident response and fix generation', 'Technical documentation'],
    model: 'claude-sonnet-4-20250514',
    handoffs: ['inbox', 'pulse'],
  });

  const pulse = agentNode('Pulse — Research', 'AI/ML research monitor', 'Monitor AI/ML developments, summarize papers, alert on breakthroughs', { x: 750, y: 50 }, {
    responsibilities: ['Monitor AI/ML Reddit, HuggingFace, GitHub trending', 'Summarize relevant papers', 'Daily AI digest', 'Alert on significant developments'],
    model: 'claude-sonnet-4-20250514',
    handoffs: ['neo'],
  });

  const emailSkill = skillNode('email-cli', 'Gmail/Outlook integration', { x: 50, y: 280 });
  const githubSkill = skillNode('github-cli', 'GitHub repos, issues, PRs', { x: 350, y: 280 });
  const devopsSkill = skillNode('agentic-devops', 'Docker, logs, process management', { x: 550, y: 280 });
  const firecrawlSkill = skillNode('firecrawl-cli', 'Web scraping and research', { x: 800, y: 280 });

  const gmail = toolNode('Gmail', 'api', { x: 50, y: 450 });
  const telegram = toolNode('Telegram', 'api', { x: 250, y: 450 });
  const github = toolNode('GitHub', 'api', { x: 450, y: 450 });
  const slack = toolNode('Slack', 'api', { x: 650, y: 450 });

  const inboxHb = heartbeatNode('*/30 * * * *', 'Check all inboxes, classify new emails', { x: 50, y: -80 });
  const pulseHb = heartbeatNode('0 */1 * * *', 'Monitor AI/ML developments', { x: 850, y: -80 });
  const morningDigest = triggerNode('Morning Digest', '0 8 * * 1-5', { x: 450, y: -80 });

  const nodes = [inbox, neo, pulse, emailSkill, githubSkill, devopsSkill, firecrawlSkill, gmail, telegram, github, slack, inboxHb, pulseHb, morningDigest];
  const edges = [
    // Inbox agent
    edge(inbox.id, emailSkill.id, EdgeRelationType.Invokes),
    edge(inbox.id, gmail.id, EdgeRelationType.Uses),
    edge(inbox.id, telegram.id, EdgeRelationType.Uses),
    edge(inboxHb.id, inbox.id, EdgeRelationType.ManagedBy),
    // Neo agent
    edge(neo.id, githubSkill.id, EdgeRelationType.Invokes),
    edge(neo.id, devopsSkill.id, EdgeRelationType.Invokes),
    edge(neo.id, github.id, EdgeRelationType.Uses),
    edge(neo.id, slack.id, EdgeRelationType.Uses),
    // Pulse agent
    edge(pulse.id, firecrawlSkill.id, EdgeRelationType.Invokes),
    edge(pulse.id, telegram.id, EdgeRelationType.Uses),
    edge(pulseHb.id, pulse.id, EdgeRelationType.ManagedBy),
    // Cross-agent routing
    edge(inbox.id, neo.id, EdgeRelationType.RoutesTo),
    edge(pulse.id, neo.id, EdgeRelationType.RoutesTo),
    // Morning digest triggers all
    edge(morningDigest.id, inbox.id, EdgeRelationType.Triggers),
    edge(morningDigest.id, pulse.id, EdgeRelationType.Triggers),
  ];

  return {
    name: 'Multi-Agent Full Stack',
    description: '3-agent system: Inbox Intelligence (email triage), Neo (engineering/DevOps), Pulse (AI research). Each agent has its own workspace, skills, and Telegram bot. Cross-agent routing for handoffs.',
    template_json: {
      planner_output: {
        use_case_summary: 'Full-stack multi-agent system with email, engineering, and research agents working together',
        recommended_architecture_name: 'Multi-Agent Full Stack',
        top_level_goal: 'Three specialized agents with independent workspaces and cross-agent routing',
      },
      graph_seed: buildGraph('Multi-Agent Full Stack', 'Inbox + Neo + Pulse multi-agent system', nodes, edges),
    },
  };
}

function businessOpsTemplate() {
  // Use Case 7: Business Operations & Productivity
  const opsAgent = agentNode('Ops Assistant', 'Business operations and productivity coordinator', 'Morning briefings, calendar management, task routing, expense tracking, meeting prep', { x: 400, y: 50 }, {
    responsibilities: ['7 AM morning briefing: calendar, inbox urgent, health, metrics', 'Calendar scheduling and auto-respond to invites', 'Route tasks across Things 3/Todoist/Trello', 'Expense tracking: receipt photo → OCR → spreadsheet', 'Meeting prep from transcripts and action items'],
    do_rules: ['Personalize morning briefing based on day schedule', 'Confirm before creating calendar events', 'Always include action items in meeting summaries'],
    dont_rules: ['Never accept calendar invites without checking conflicts', 'Never share meeting notes outside the team'],
    model: 'claude-sonnet-4-20250514',
  });

  const calendarSkill = skillNode('calendar-cli', 'Google Calendar integration', { x: 100, y: 280 });
  const taskSkill = skillNode('task-routing', 'Route tasks across project management tools', { x: 350, y: 280 });
  const expenseSkill = skillNode('smart-expense-tracker', 'Receipt OCR and expense categorization', { x: 600, y: 280 });

  const calendar = toolNode('Google Calendar', 'api', { x: 100, y: 450 });
  const telegram = toolNode('Telegram', 'api', { x: 300, y: 450 });
  const sheets = toolNode('Google Sheets', 'api', { x: 500, y: 450 });
  const todoist = toolNode('Task Manager', 'api', { x: 700, y: 450 });

  const morningBrief = triggerNode('Morning Briefing', '0 7 * * *', { x: 100, y: 50 });
  const hb = heartbeatNode('*/30 * * * *', 'Check for new tasks, calendar changes, expense submissions', { x: 700, y: 50 });

  const nodes = [opsAgent, calendarSkill, taskSkill, expenseSkill, calendar, telegram, sheets, todoist, morningBrief, hb];
  const edges = [
    edge(opsAgent.id, calendarSkill.id, EdgeRelationType.Invokes),
    edge(opsAgent.id, taskSkill.id, EdgeRelationType.Invokes),
    edge(opsAgent.id, expenseSkill.id, EdgeRelationType.Invokes),
    edge(opsAgent.id, calendar.id, EdgeRelationType.Uses),
    edge(opsAgent.id, telegram.id, EdgeRelationType.Uses),
    edge(opsAgent.id, sheets.id, EdgeRelationType.Uses),
    edge(opsAgent.id, todoist.id, EdgeRelationType.Uses),
    edge(morningBrief.id, opsAgent.id, EdgeRelationType.Triggers),
    edge(hb.id, opsAgent.id, EdgeRelationType.ManagedBy),
  ];

  return {
    name: 'Business Ops & Productivity',
    description: 'Your AI teammate: morning briefings at 7 AM, calendar management, task routing, expense tracking via receipt photos, and meeting prep. The anti-Zapier — it thinks, not just executes.',
    template_json: {
      planner_output: {
        use_case_summary: 'AI-powered business operations: briefings, scheduling, task management, expense tracking',
        recommended_architecture_name: 'Business Ops Assistant',
        top_level_goal: 'An AI teammate that proactively manages daily operations',
      },
      graph_seed: buildGraph('Business Ops', 'AI-powered business operations and productivity', nodes, edges),
    },
  };
}

// ── All templates ──────────────────────────────────────────────

const DEFAULT_TEMPLATES: Array<{
  name: string;
  description: string;
  template_json: Record<string, unknown>;
}> = [
  emailIntelligenceTemplate(),
  devopsAutomationTemplate(),
  brainAndHandsTemplate(),
  complianceMonitorTemplate(),
  marketingGrowthTemplate(),
  dataAnalyticsTemplate(),
  multiAgentFullStackTemplate(),
  businessOpsTemplate(),
];

// ── Service (v2 — real use-case templates) ─────────────────────

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
