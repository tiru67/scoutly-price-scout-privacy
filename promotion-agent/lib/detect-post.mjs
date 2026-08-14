import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { guidesDir, marketingDir, outputDir } from './paths.mjs';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleFromMarkdown(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function titleFromHtml(content, fallback) {
  const match = content.match(/<title>([^<|]+)/i);
  return match ? match[1].replace(/\s*\|\s*Scoutly.*$/i, '').trim() : fallback;
}

function guideUrlFromFilename(filename) {
  return `https://scoutly-price-scout.vercel.app/guides/${filename}`;
}

async function listCampaignSlugs() {
  try {
    const files = await readdir(outputDir);
    return new Set(
      files
        .filter((name) => name.endsWith('.md'))
        .flatMap((name) => {
          const match = name.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
          return match ? [match[1]] : [];
        })
    );
  } catch {
    return new Set();
  }
}

async function scanMarketingFiles() {
  const entries = [];
  try {
    const files = await readdir(marketingDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const path = join(marketingDir, file);
      const content = await readFile(path, 'utf8');
      const base = basename(file, '.md');
      entries.push({
        kind: 'marketing-brief',
        path,
        slug: slugify(base.replace(/-launch$/, '')),
        title: titleFromMarkdown(content, base),
        content,
        mtimeMs: (await stat(path)).mtimeMs
      });
    }
  } catch {
    /* marketing folder may be empty */
  }
  return entries;
}

async function scanGuideFiles() {
  const entries = [];
  try {
    const files = await readdir(guidesDir);
    for (const file of files) {
      if (!file.endsWith('.html') || file === 'index.html') continue;
      const path = join(guidesDir, file);
      const content = await readFile(path, 'utf8');
      const base = basename(file, '.html');
      entries.push({
        kind: 'published-guide',
        path,
        slug: slugify(base),
        title: titleFromHtml(content, base),
        guideUrl: guideUrlFromFilename(file),
        content,
        mtimeMs: (await stat(path)).mtimeMs
      });
    }
  } catch {
    /* guides folder may be missing */
  }
  return entries;
}

export async function detectPosts({ includeExisting = false } = {}) {
  const existing = includeExisting ? new Set() : await listCampaignSlugs();
  const candidates = [...(await scanMarketingFiles()), ...(await scanGuideFiles())];
  const unseen = candidates.filter((entry) => !existing.has(entry.slug));
  unseen.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return { candidates, unseen, existing: [...existing] };
}

export async function resolvePostInput(input) {
  if (!input) {
    const { unseen } = await detectPosts();
    if (!unseen.length) throw new Error('No new posts detected. Pass --post <path> or --campaign <slug>.');
    return unseen[0];
  }

  const normalized = input.replace(/\\/g, '/');
  if (normalized.endsWith('.md') || normalized.endsWith('.html')) {
    const path = normalized.startsWith('/') ? normalized : join(process.cwd(), normalized);
    const content = await readFile(path, 'utf8');
    const ext = extname(path);
    const base = basename(path, ext);
    return {
      kind: ext === '.html' ? 'published-guide' : 'marketing-brief',
      path,
      slug: slugify(base.replace(/-launch$/, '')),
      title: ext === '.html' ? titleFromHtml(content, base) : titleFromMarkdown(content, base),
      guideUrl: ext === '.html' ? guideUrlFromFilename(basename(path)) : null,
      content,
      mtimeMs: (await stat(path)).mtimeMs
    };
  }

  const { candidates } = await detectPosts({ includeExisting: true });
  const match = candidates.find((entry) => entry.slug === input || entry.slug.includes(input));
  if (!match) throw new Error(`No post found for campaign slug: ${input}`);
  return match;
}
