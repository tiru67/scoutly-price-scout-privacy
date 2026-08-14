import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { agentRoot } from './paths.mjs';

let cached;

export async function loadConfig() {
  if (cached) return cached;
  const raw = await readFile(join(agentRoot, 'config.json'), 'utf8');
  cached = JSON.parse(raw);
  return cached;
}
