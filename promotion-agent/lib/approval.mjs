import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { approvalsDir } from './paths.mjs';
import { loadConfig } from './config.mjs';

async function readApproval(slug) {
  const path = join(approvalsDir, `${slug}.json`);
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return {
      slug,
      publishApproved: false,
      approvedPlatforms: [],
      approvedAt: null,
      notes: 'Draft only. External publishing is disabled until explicit approval.'
    };
  }
}

export async function getApprovalState(slug) {
  const config = await loadConfig();
  const approval = await readApproval(slug);
  return {
    ...approval,
    requireApprovalBeforePublish: config.guardrails.requireApprovalBeforePublish,
    canPublish: approval.publishApproved && !config.guardrails.requireApprovalBeforePublish
      ? true
      : approval.publishApproved
  };
}

export async function saveApprovalDraft(slug, analysis) {
  await mkdir(approvalsDir, { recursive: true });
  const path = join(approvalsDir, `${slug}.json`);
  const current = await readApproval(slug);
  const next = {
    ...current,
    slug,
    campaignTitle: analysis.title,
    sourcePath: analysis.sourcePath,
    publishApproved: false,
    approvedPlatforms: [],
    approvedAt: null,
    updatedAt: new Date().toISOString(),
    notes: current.notes || 'Draft only. External publishing is disabled until explicit approval.'
  };
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function approveCampaign(slug, platforms) {
  await mkdir(approvalsDir, { recursive: true });
  const path = join(approvalsDir, `${slug}.json`);
  const current = await readApproval(slug);
  const next = {
    ...current,
    slug,
    publishApproved: true,
    approvedPlatforms: platforms || ['x'],
    approvedAt: new Date().toISOString(),
    approvedBy: 'user-explicit-approval',
    updatedAt: new Date().toISOString(),
    notes: 'Approved for publishing by user.'
  };
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export function assertPublishAllowed(approval, platform) {
  if (!approval.publishApproved) {
    throw new Error(
      `Publishing blocked for ${approval.slug}. Approval required before any external ${platform || 'action'}.`
    );
  }
  if (platform && approval.approvedPlatforms?.length && !approval.approvedPlatforms.includes(platform)) {
    throw new Error(`Platform not approved for publishing: ${platform}`);
  }
}
