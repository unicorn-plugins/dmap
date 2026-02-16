// Shared utilities for agent parsing (omc-integration.ts, agent-registry.ts)

export const TIER_MODEL_MAP: Record<string, string> = {
  HEAVY: 'opus',
  HIGH: 'opus',
  MEDIUM: 'sonnet',
  LOW: 'haiku',
};

export function parseFrontmatterField(content: string, field: string): string | undefined {
  const match = content.match(/^---[\s\S]*?---/);
  if (!match) return undefined;
  const fieldMatch = match[0].match(new RegExp(`^${field}:\\s*(.+)`, 'm'));
  return fieldMatch ? fieldMatch[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

export function parseYamlTier(content: string): string | undefined {
  const match = content.match(/^tier:\s*(\w+)/m);
  return match ? match[1].trim() : undefined;
}
