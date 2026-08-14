import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const agentRoot = join(here, '..');
export const repoRoot = join(agentRoot, '..');
export const outputDir = join(agentRoot, 'output');
export const metricsDir = join(agentRoot, 'metrics');
export const approvalsDir = join(agentRoot, 'approvals');
export const marketingDir = join(repoRoot, 'marketing');
export const guidesDir = join(repoRoot, 'docs', 'guides');
