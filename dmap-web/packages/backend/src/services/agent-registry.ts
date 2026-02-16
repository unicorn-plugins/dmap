import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs';
import path from 'path';
import { DATA_DIR } from '../config.js';
import type { OmcAgentDef } from './omc-integration.js';
import { TIER_MODEL_MAP, parseFrontmatterField, parseYamlTier } from './agent-utils.js';

const AGENTS_DIR = path.join(DATA_DIR, 'agents');

interface RegisteredAgents {
  pluginName: string;
  registeredAt: string;
  agents: Record<string, { description: string; prompt: string; model: string; disallowedTools?: string[] }>;
}

/**
 * Scan agents from a local plugin project directory.
 * Reads {projectDir}/agents/{agent-name}/AGENT.md + agentcard.yaml
 */
function scanLocalAgents(projectDir: string, pluginId: string): Record<string, OmcAgentDef> {
  const agents: Record<string, OmcAgentDef> = {};
  const agentsDir = path.join(projectDir, 'agents');
  if (!existsSync(agentsDir)) return agents;

  const agentSubDirs = readdirSync(agentsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const agentDir of agentSubDirs) {
    const agentPath = path.join(agentsDir, agentDir.name);
    const agentMd = path.join(agentPath, 'AGENT.md');

    if (!existsSync(agentMd)) continue;

    const mdContent = readFileSync(agentMd, 'utf-8');
    const description = parseFrontmatterField(mdContent, 'description') || agentDir.name;

    let model = 'sonnet';
    const agentCard = path.join(agentPath, 'agentcard.yaml');
    const cardContent = existsSync(agentCard) ? readFileSync(agentCard, 'utf-8') : null;

    if (cardContent) {
      const tier = parseYamlTier(cardContent);
      if (tier && TIER_MODEL_MAP[tier]) {
        model = TIER_MODEL_MAP[tier];
      }
    }

    // Build full prompt: AGENT.md content + agentcard.yaml (if exists)
    let prompt = mdContent;
    if (cardContent) {
      prompt += `\n\n--- agentcard.yaml ---\n${cardContent}`;
    }

    // FQN: {pluginId}:{agent-name}:{agent-name}
    const fqn = `${pluginId}:${agentDir.name}:${agentDir.name}`;
    agents[fqn] = {
      description,
      prompt,
      model,
    };
  }

  return agents;
}

/**
 * Sync plugin agents to local registry.
 * Scans local project directory ({projectDir}/agents/) and saves to dmap-web/agents/{pluginId}/agents.json
 */
export function syncPluginAgents(pluginId: string, projectDir: string): { count: number; agents: string[] } {
  const scanned = scanLocalAgents(projectDir, pluginId);

  // Skip overwrite if scan found nothing but agents.json already exists
  if (Object.keys(scanned).length === 0) {
    const existingFile = path.join(AGENTS_DIR, pluginId, 'agents.json');
    if (existsSync(existingFile)) {
      const existing = loadRegisteredAgents(pluginId);
      const names = Object.keys(existing);
      console.log(`[AgentRegistry] No local agents found for ${pluginId}, keeping existing ${names.length} agents`);
      return { count: names.length, agents: names };
    }
    return { count: 0, agents: [] };
  }

  const agentEntries: RegisteredAgents['agents'] = {};
  for (const [fqn, def] of Object.entries(scanned)) {
    agentEntries[fqn] = {
      description: def.description,
      prompt: def.prompt || def.description,
      model: def.model || 'sonnet',
      ...(def.disallowedTools && def.disallowedTools.length > 0 ? { disallowedTools: def.disallowedTools } : {}),
    };
  }

  const pluginDir = path.join(AGENTS_DIR, pluginId);
  mkdirSync(pluginDir, { recursive: true });

  const data: RegisteredAgents = {
    pluginName: pluginId,
    registeredAt: new Date().toISOString(),
    agents: agentEntries,
  };

  writeFileSync(path.join(pluginDir, 'agents.json'), JSON.stringify(data, null, 2), 'utf-8');

  const agentNames = Object.keys(agentEntries);
  console.log(`[AgentRegistry] Synced ${agentNames.length} agents for ${pluginId}: ${agentNames.join(', ')}`);
  return { count: agentNames.length, agents: agentNames };
}

/**
 * Load registered agents for a specific plugin from the local registry.
 * Returns SDK-compatible agent definitions.
 */
export function loadRegisteredAgents(pluginId: string): Record<string, OmcAgentDef> {
  const filePath = path.join(AGENTS_DIR, pluginId, 'agents.json');
  if (!existsSync(filePath)) return {};

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data: RegisteredAgents = JSON.parse(raw);
    const agents: Record<string, OmcAgentDef> = {};

    for (const [fqn, entry] of Object.entries(data.agents)) {
      agents[fqn] = {
        description: entry.description,
        prompt: entry.prompt || entry.description,
        model: entry.model,
        disallowedTools: entry.disallowedTools,
      };
    }

    return agents;
  } catch (error) {
    console.error(`[AgentRegistry] Failed to load agents for ${pluginId}:`, error);
    return {};
  }
}

/**
 * Remove registered agents for a plugin (called on plugin deletion).
 */
export function removeRegisteredAgents(pluginId: string): void {
  const pluginDir = path.join(AGENTS_DIR, pluginId);
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true, force: true });
    console.log(`[AgentRegistry] Removed agents for ${pluginId}`);
  }
}
