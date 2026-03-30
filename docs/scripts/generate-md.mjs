/**
 * Post-export script that generates .md files for each documentation page.
 * Reads .mdx source files, strips frontmatter, and writes .md files to the
 * export output directory so that /docs/path/to/page.md serves raw markdown.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';

const CONTENT_DIR = new URL('../content/docs', import.meta.url).pathname;
const OUT_DIR = new URL('../out/docs', import.meta.url).pathname;

function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return content;
  return content.slice(match[0].length);
}

function extractTitle(frontmatter) {
  const match = frontmatter.match(/^title:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

async function collectMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

async function processFile(filePath) {
  const raw = await readFile(filePath, 'utf-8');

  // Extract title from frontmatter for heading
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const title = fmMatch ? extractTitle(fmMatch[1]) : null;

  const body = stripFrontmatter(raw).trim();
  const markdown = title ? `# ${title}\n\n${body}` : body;

  // Map content path to output path: content/docs/a/b.mdx → out/docs/a/b.md
  const rel = relative(CONTENT_DIR, filePath).replace(/\.mdx$/, '.md');
  const outPath = join(OUT_DIR, rel);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, markdown, 'utf-8');

  return rel;
}

const files = await collectMdxFiles(CONTENT_DIR);
const results = await Promise.all(files.map(processFile));

console.log(`Generated ${results.length} markdown files:`);
for (const rel of results.sort()) {
  console.log(`  /docs/${rel}`);
}
