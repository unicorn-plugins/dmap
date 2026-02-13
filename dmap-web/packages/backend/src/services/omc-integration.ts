import { readdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';

export interface OmcAgentDef {
  description: string;
  prompt: string;
  model?: string;
  disallowedTools?: string[];
}

// 스킬 패턴에서 실제 참조하는 에이전트만 포함
const ESSENTIAL_AGENTS = new Set([
  'architect',         // ralplan, ralph, analyze
  'executor',          // ralph, ultraqa
  'explore',           // plan, analyze, deepsearch
  'planner',           // plan, ralplan
  'critic',            // ralplan, review
  'analyst',           // plan
  'build-fixer',       // build-fix
  'qa-tester',         // ultraqa
  'code-reviewer',     // code-review
  'security-reviewer', // security-review
  'researcher',        // research
  'scientist',         // research
]);


const AGENT_MODELS: Record<string, string> = {
  architect: 'opus',
  planner: 'opus',
  critic: 'opus',
  analyst: 'opus',
  'code-reviewer': 'opus',
  executor: 'sonnet',
  'build-fixer': 'sonnet',
  'qa-tester': 'sonnet',
  'security-reviewer': 'sonnet',
  scientist: 'sonnet',
  researcher: 'sonnet',
  explore: 'haiku',
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  architect: 'System design, code analysis, debugging, and verification (Opus)',
  executor: 'Code implementation, features, and refactoring (Sonnet)',
  explore: 'Fast codebase discovery and pattern matching (Haiku)',
  planner: 'Task sequencing, execution plans, and risk flags (Opus)',
  critic: 'Plan review, critical challenge, and evaluation (Opus)',
  analyst: 'Requirements clarity, hidden constraint analysis (Opus)',
  'build-fixer': 'Build and compilation error resolution (Sonnet)',
  'qa-tester': 'Interactive CLI testing and runtime validation (Sonnet)',
  'code-reviewer': 'Comprehensive code quality review (Opus)',
  'security-reviewer': 'Security vulnerability detection and OWASP audits (Sonnet)',
  scientist: 'Data analysis, statistics, and research (Sonnet)',
  researcher: 'External SDK/API/package evaluation and documentation research (Sonnet)',
};

function parseFrontmatterDisallowedTools(
  content: string
): string[] | undefined {
  const match = content.match(/^---[\s\S]*?---/);
  if (!match) return undefined;
  const disallowedMatch = match[0].match(/^disallowedTools:\s*(.+)/m);
  if (!disallowedMatch) return undefined;
  return disallowedMatch[1]
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
  }
  return 0;
}

function findLatestVersion(basePath: string): string | null {
  if (!existsSync(basePath)) {
    return null;
  }

  const entries = readdirSync(basePath, { withFileTypes: true });
  const versionDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => /^\d+\.\d+\.\d+/.test(name))
    .sort(compareVersions);

  return versionDirs.length > 0 ? versionDirs[versionDirs.length - 1] : null;
}

// Tier → model mapping for plugin agents
const TIER_MODEL_MAP: Record<string, string> = {
  HEAVY: 'opus',
  HIGH: 'opus',
  MEDIUM: 'sonnet',
  LOW: 'haiku',
};

// Skip these directories in plugin cache scan
const SKIP_SCOPES = new Set(['omc', 'claude-plugins-official']);

function parseFrontmatterField(content: string, field: string): string | undefined {
  const match = content.match(/^---[\s\S]*?---/);
  if (!match) return undefined;
  const fieldMatch = match[0].match(new RegExp(`^${field}:\\s*(.+)`, 'm'));
  return fieldMatch ? fieldMatch[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

function parseYamlTier(content: string): string | undefined {
  const match = content.match(/^tier:\s*(\w+)/m);
  return match ? match[1].trim() : undefined;
}

function parseYamlForbiddenActions(content: string, actionMapping: Record<string, string[]>): string[] {
  const section = content.match(/forbidden_actions:\s*\n((?:\s+-\s*".+"\n?)+)/);
  if (!section) return [];
  const actions = [...section[1].matchAll(/- "(.+?)"/g)].map(m => m[1]);
  const tools: string[] = [];
  for (const action of actions) {
    if (actionMapping[action]) {
      tools.push(...actionMapping[action]);
    }
  }
  return tools;
}

function parseActionMapping(runtimeContent: string): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};
  const section = runtimeContent.match(/action_mapping:\s*\n([\s\S]*?)(?=\n\w|\n$|$)/);
  if (!section) return mapping;
  const lines = section[1].split('\n');
  for (const line of lines) {
    const match = line.match(/^\s+(\w+):\s*\[(.+)]/);
    if (match) {
      mapping[match[1]] = match[2].split(',').map(t => t.trim().replace(/"/g, ''));
    }
  }
  return mapping;
}

export function loadPluginAgents(scopeFilter?: string): Record<string, OmcAgentDef> {
  const agents: Record<string, OmcAgentDef> = {};
  try {
    const homedir = os.homedir();
    const cacheDir = path.join(homedir, '.claude', 'plugins', 'cache');
    if (!existsSync(cacheDir)) return agents;

    const scopes = readdirSync(cacheDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !SKIP_SCOPES.has(e.name))
      .filter(e => !scopeFilter || e.name === scopeFilter);

    for (const scope of scopes) {
      const scopePath = path.join(cacheDir, scope.name);
      const pluginDirs = readdirSync(scopePath, { withFileTypes: true }).filter(e => e.isDirectory());

      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(scopePath, pluginDir.name);
        const latestVersion = findLatestVersion(pluginPath);
        if (!latestVersion) continue;

        const versionPath = path.join(pluginPath, latestVersion);
        const agentsDir = path.join(versionPath, 'agents');
        if (!existsSync(agentsDir)) continue;

        // Load runtime-mapping for action_mapping
        const runtimePath = path.join(versionPath, 'gateway', 'runtime-mapping.yaml');
        let actionMapping: Record<string, string[]> = {};
        if (existsSync(runtimePath)) {
          actionMapping = parseActionMapping(readFileSync(runtimePath, 'utf-8'));
        }

        const agentSubDirs = readdirSync(agentsDir, { withFileTypes: true })
          .filter(e => e.isDirectory());

        for (const agentDir of agentSubDirs) {
          const agentPath = path.join(agentsDir, agentDir.name);
          const agentMd = path.join(agentPath, 'AGENT.md');
          const agentCard = path.join(agentPath, 'agentcard.yaml');

          if (!existsSync(agentMd)) continue;

          // Read description from AGENT.md frontmatter
          const mdContent = readFileSync(agentMd, 'utf-8');
          const description = parseFrontmatterField(mdContent, 'description') || agentDir.name;

          // Read tier from agentcard.yaml
          let model = 'sonnet';
          let disallowedTools: string[] = [];
          if (existsSync(agentCard)) {
            const cardContent = readFileSync(agentCard, 'utf-8');
            const tier = parseYamlTier(cardContent);
            if (tier && TIER_MODEL_MAP[tier]) {
              model = TIER_MODEL_MAP[tier];
            }
            disallowedTools = parseYamlForbiddenActions(cardContent, actionMapping);
          }

          // FQN: {scope}:{agent-name}:{agent-name}
          const fqn = `${scope.name}:${agentDir.name}:${agentDir.name}`;
          agents[fqn] = {
            description,
            prompt: description,
            model,
            ...(disallowedTools.length > 0 ? { disallowedTools } : {}),
          };
        }
      }
    }

    if (Object.keys(agents).length > 0) {
      console.log(`Loaded ${Object.keys(agents).length} plugin agents: ${Object.keys(agents).join(', ')}`);
    }
  } catch (error) {
    console.error('Failed to load plugin agents:', error);
  }
  return agents;
}

export async function loadOmcAgents(): Promise<Record<
  string,
  OmcAgentDef
> | null> {
  try {
    const homedir = os.homedir();
    const basePath = path.join(
      homedir,
      '.claude',
      'plugins',
      'cache',
      'omc',
      'oh-my-claudecode'
    );

    const latestVersion = findLatestVersion(basePath);
    if (!latestVersion) {
      console.warn(
        'OMC not installed: no version found in',
        basePath
      );
      return null;
    }

    const agentsDir = path.join(basePath, latestVersion, 'agents');
    if (!existsSync(agentsDir)) {
      console.warn(
        'OMC agents directory not found:',
        agentsDir
      );
      return null;
    }

    const agentFiles = readdirSync(agentsDir).filter((f) =>
      f.endsWith('.md')
    );
    const agents: Record<string, OmcAgentDef> = {};

    for (const file of agentFiles) {
      const agentName = path.basename(file, '.md');
      if (!ESSENTIAL_AGENTS.has(agentName)) {
        continue;
      }

      const filePath = path.join(agentsDir, file);
      const content = readFileSync(filePath, 'utf-8');

      const disallowedTools = parseFrontmatterDisallowedTools(content);
      const model = AGENT_MODELS[agentName];
      const description = AGENT_DESCRIPTIONS[agentName] || agentName;

      // Windows 32KB CLI 한계 대응: description만 prompt로 사용
      const prompt = description;

      agents[`omc-${agentName}`] = {
        description,
        prompt,
        model,
        disallowedTools,
      };
    }

    console.log(
      `Loaded ${Object.keys(agents).length} OMC agents from ${latestVersion}`
    );
    return agents;
  } catch (error) {
    console.error('Failed to load OMC agents:', error);
    return null;
  }
}

export function getSkillPatterns(): string {
  return `
## OMC 스킬 부스팅 해석 규칙

SKILL.md 워크플로우에 아래 OMC FQN 참조가 등장하면, 해당 패턴을 직접 실행하세요.
이것은 외부 도구 호출이 아니라, 아래 "OMC Skill Patterns" 섹션의 행동 패턴을 따르라는 의미입니다.

| SKILL.md 표기 | 실행 방법 |
|---------------|----------|
| \`/oh-my-claudecode:plan\` | 아래 **plan** 패턴을 따름 |
| \`/oh-my-claudecode:ralplan\` | 아래 **ralplan** 패턴을 따름 (planner→architect→critic 합의 루프) |
| \`/oh-my-claudecode:ralph\` | 아래 **ralph** 패턴을 따름 (완료까지 지속 실행) |
| \`/oh-my-claudecode:research\` | 아래 **research** 패턴을 따름 |
| \`/oh-my-claudecode:review\` | 아래 **review** 패턴을 따름 |
| \`/oh-my-claudecode:analyze\` | 아래 **analyze** 패턴을 따름 |
| \`/oh-my-claudecode:deepsearch\` | 아래 **deepsearch** 패턴을 따름 |
| \`/oh-my-claudecode:build-fix\` | 아래 **build-fix** 패턴을 따름 |
| \`/oh-my-claudecode:ultraqa\` | 아래 **ultraqa** 패턴을 따름 |
| \`/oh-my-claudecode:code-review\` | 아래 **code-review** 패턴을 따름 |
| \`/oh-my-claudecode:security-review\` | 아래 **security-review** 패턴을 따름 |
| \`/oh-my-claudecode:cancel\` | 현재 워크플로우 즉시 중단 |
| \`ulw\` 매직 키워드 | 해당 단계를 병렬 에이전트 위임 + 완료 보장으로 실행. Task 도구로 적절한 에이전트에 위임하고, 모든 하위 작업이 완료될 때까지 지속 |

**중요**: \`/oh-my-claudecode:*\` 형식을 Skill 도구로 호출하지 마세요. Skill 도구는 사용할 수 없습니다.
대신 위 매핑에 따라 해당 패턴의 행동을 직접 수행하세요.

## OMC Skill Patterns

When the user requests one of these workflows, follow the corresponding pattern using the Task tool to delegate to specialized agents.
All OMC agents use the "omc-" prefix (e.g., "omc-architect", "omc-executor").

### plan — Planning Session
When user says "plan this", "plan the", or makes a broad/vague request:
1. Delegate to **omc-explore** agent to understand the codebase structure
2. Delegate to **omc-analyst** agent to identify requirements and constraints
3. Delegate to **omc-planner** agent to create an execution plan
4. Present the plan to the user for approval before proceeding

### ralplan — Iterative Planning Consensus
When user says "ralplan":
1. Delegate to **omc-planner** to create initial plan
2. Delegate to **omc-architect** to review technical feasibility
3. Delegate to **omc-critic** to challenge and evaluate the plan
4. If critic finds issues, iterate: omc-planner revises → omc-architect reviews → omc-critic evaluates
5. Continue until consensus reached (max 3 iterations)

### ralph — Persistent Execution
When user says "ralph", "don't stop", or "must complete":
1. Break the task into subtasks
2. Execute each subtask, delegating to appropriate omc- agents
3. After each subtask, verify completion
4. Do NOT stop until ALL subtasks are verified complete
5. Use **omc-architect** for final verification before claiming done

### build-fix — Build Error Resolution
When user says "build-fix" or build errors are detected:
1. Run build/type check command to collect all errors
2. Delegate to **omc-build-fixer** agent with the error list
3. Verify fix doesn't introduce new errors
4. Repeat until build passes clean

### ultraqa — QA Cycling
When user says "test", "QA", or "verify":
1. Delegate to **omc-qa-tester** to run tests and capture results
2. If failures found, delegate to **omc-executor** to fix
3. Re-run tests via **omc-qa-tester**
4. Repeat until all tests pass (max 5 cycles)

### review — Plan Review
When user says "review plan" or "review":
1. Delegate to **omc-critic** agent with the plan/code to review
2. Present critique findings to user

### analyze — Deep Analysis
When user says "analyze", "debug", or "investigate":
1. Delegate to **omc-explore** to gather relevant code context
2. Delegate to **omc-architect** for deep technical analysis
3. Present findings with root causes and recommendations

### deepsearch — Thorough Codebase Search
When user says "search", "find in codebase":
1. Delegate to **omc-explore** agent for broad pattern search
2. If needed, use multiple search strategies (grep, glob, AST)
3. Compile and present findings

### code-review — Code Review
When user says "code review" or "review code":
1. Delegate to **omc-code-reviewer** for comprehensive review
2. Include: logic errors, security issues, performance, style
3. Present severity-rated findings

### security-review — Security Review
When user says "security review" or "security audit":
1. Delegate to **omc-security-reviewer** for OWASP Top 10 analysis
2. Check: injection, auth, XSS, secrets, trust boundaries
3. Present vulnerability report with severity ratings

### research — Research
When user says "research" or "analyze data":
1. Delegate to **omc-researcher** for external documentation/API research
2. Optionally delegate to **omc-scientist** for data analysis
3. Compile research findings
`;
}
