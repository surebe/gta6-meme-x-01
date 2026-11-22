// Entry program for the gta6-meme-x-01 bounty, written for this entry.
//
// The judged artifact is the X post itself; the grader only needs the
// POST.json that names it delivered to the output directory, byte for
// byte. So this program finds POST.json in the bot directory, checks
// that it really is a JSON object carrying a string "url", and writes
// the file's untouched bytes to <output dir>/POST.json. A successful
// run prints nothing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Inside the grader's container the harness sets MAKEFUN_BOT_DIR and
// MAKEFUN_OUTPUT_DIR; without them we prefer the container's own /bot
// and /output when they are present, and the local layout otherwise.
function pickDir(envValue: string | undefined, containerPath: string, localPath: string): string {
  if (envValue !== undefined && envValue !== '') return envValue;
  return existsSync(containerPath) ? containerPath : localPath;
}

const botDir = pickDir(process.env.MAKEFUN_BOT_DIR, '/bot', '.');
const outputDir = pickDir(process.env.MAKEFUN_OUTPUT_DIR, '/output', 'out');

const sourcePath = join(botDir, 'POST.json');
const targetPath = join(outputDir, 'POST.json');

function bail(reason: string): never {
  console.error(`main.ts: ${reason}`);
  process.exit(1);
}

let raw: Buffer;
try {
  raw = readFileSync(sourcePath);
} catch {
  bail(`cannot read ${sourcePath}`);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw.toString('utf8'));
} catch {
  bail(`${sourcePath} does not contain valid JSON`);
}

if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
  bail(`${sourcePath} must contain a JSON object`);
}

const url = (parsed as { url?: unknown }).url;
if (typeof url !== 'string' || url.trim() === '') {
  bail(`${sourcePath} must carry a non-empty string "url" field`);
}

// The gate follows this address to read the post, so reject anything
// that is not a well-formed http(s) URL before handing the file over.
let postAddress: URL;
try {
  postAddress = new URL(url);
} catch {
  bail(`"url" in ${sourcePath} is not a well-formed URL: ${url}`);
}
if (postAddress.protocol !== 'https:' && postAddress.protocol !== 'http:') {
  bail(`"url" in ${sourcePath} must be an http(s) address, got ${postAddress.protocol}`);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(targetPath, raw);
