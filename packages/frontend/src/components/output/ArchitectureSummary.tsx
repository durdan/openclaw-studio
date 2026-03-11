'use client';

import { useDesignStore } from '@/store/design.store';

export function ArchitectureSummary() {
  const plannerOutput = useDesignStore((s) => s.plannerOutput);
  const activeDesign = useDesignStore((s) => s.activeDesign);

  const output = plannerOutput || activeDesign?.planner_output;

  if (!output) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Architecture Summary</h3>
        <p className="text-xs text-studio-text-muted">
          Generate a plan from the use-case prompt to see the architecture summary here.
          This will display the recommended agent hierarchy, skills, tools, and data flow.
        </p>
      </div>
    );
  }

  const renderAgentTree = (agent: typeof output.top_level_agent, depth: number = 0): JSX.Element => (
    <div key={agent.name} style={{ marginLeft: depth * 16 }} className="py-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-indigo-400">
          {depth > 0 ? 'L ' : ''}
        </span>
        <span className="text-xs font-medium text-studio-text">{agent.name}</span>
        <span className="text-[10px] text-studio-text-muted">- {agent.role}</span>
      </div>
      {agent.sub_agents?.map((sub) => renderAgentTree(sub, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase">Architecture Summary</h3>
        <span className="text-[10px] font-medium text-studio-accent">{output.recommended_architecture_name}</span>
      </div>

      {/* Top Level Goal */}
      <div className="rounded border border-studio-border p-2">
        <span className="text-[10px] font-semibold text-studio-text-muted uppercase">Goal</span>
        <p className="text-xs text-studio-text mt-0.5">{output.top_level_goal}</p>
      </div>

      {/* Use Case Summary */}
      <div className="rounded border border-studio-border p-2">
        <span className="text-[10px] font-semibold text-studio-text-muted uppercase">Summary</span>
        <p className="text-xs text-studio-text mt-0.5">{output.use_case_summary}</p>
      </div>

      {/* Agent Hierarchy */}
      <div>
        <span className="text-[10px] font-semibold text-studio-text-muted uppercase">Agent Hierarchy</span>
        <div className="mt-1 rounded border border-studio-border p-2">
          {renderAgentTree(output.top_level_agent)}
          {output.sub_agents.map((agent) => renderAgentTree(agent, 1))}
        </div>
      </div>

      {/* Skills */}
      {output.skills.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">
            Skills ({output.skills.length})
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {output.skills.map((skill, i) => (
              <span
                key={i}
                className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tools */}
      {output.tools.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">
            Tools ({output.tools.length})
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {output.tools.map((tool, i) => (
              <span
                key={i}
                className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-400"
              >
                {tool.binding_name} ({tool.tool_type})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Guardrails */}
      {output.guardrails.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">Guardrails</span>
          <ul className="mt-1 space-y-0.5">
            {output.guardrails.map((g, i) => (
              <li key={i} className="text-[10px] text-studio-text-muted flex items-start gap-1">
                <span className="text-rose-400 mt-px">*</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {output.assumptions.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-studio-text-muted uppercase">Assumptions</span>
          <ul className="mt-1 space-y-0.5">
            {output.assumptions.map((a, i) => (
              <li key={i} className="text-[10px] text-studio-text-muted flex items-start gap-1">
                <span className="text-yellow-400 mt-px">*</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
