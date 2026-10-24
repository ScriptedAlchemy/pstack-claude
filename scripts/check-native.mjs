#!/usr/bin/env node
// Fails while the plugin still speaks Cursor. Every finding names the Claude Code replacement.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = join(ROOT, "plugins", "pstack");
const ALLOW = JSON.parse(readFileSync(join(ROOT, "scripts", "native-allowlist.json"), "utf8"));
const TEXT = /\.(md|mdc|json|ya?ml|sh|mjs|ts|tsv)$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".DS_Store") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(PLUGIN).map((path) => relative(PLUGIN, path));
const skills = readdirSync(join(PLUGIN, "skills")).filter((name) => existsSync(join(PLUGIN, "skills", name, "SKILL.md")));
const bareCommand = new RegExp(`(?<![\\w:./@-])/(${skills.join("|")})(?![\\w/-])`);

const RULES = [
  { re: /(?<![a-z])cursor(?![a-z])/i, fix: "Claude Code name, or an allowlisted attribution" },
  { re: /`Task`|\bTask (tool|subagent|call)/, fix: "the `Agent` tool" },
  { re: /\bAskQuestion\b/, fix: "`AskUserQuestion`" },
  { re: /generalPurpose/, fix: '`subagent_type: "general-purpose"`' },
  { re: /readonly: (true|false)/, fix: '`subagent_type: "Explore"` or `"general-purpose"`' },
  { re: /environment: "(cloud|local)"|cloud_base_branch/, fix: '`isolation: "worktree"`' },
  { re: /file_attachments/, fix: "paths listed in the brief" },
  { re: /\b(claude-[a-z]+-\d|grok-\d|gpt-\d|composer-\d)/i, fix: "`opus`, `sonnet`, `haiku`, or `fable` with an effort" },
  { re: /\.mdc\b|always-applied rule/, fix: "`CLAUDE.md` or `~/.claude/rules/*.md`" },
  { re: /agent-transcripts/, fix: "`~/.claude/projects/<slug>/<session>.jsonl`" },
  { re: /Bugbot|[Aa]utomations? (routine|run)|cloud agent|built-in PR tool|SendToUser|update_state/, fix: "a Claude Code equivalent or an explicit skip" },
  { re: /Claude Code adapter|docs\/harness/, fix: "nothing; the port is native" },
  { re: /fast or standard speed|`origin pr|command -v origin/, fix: "effort only, and `gh` as the only forge" },
  { re: /\bdeslop\b|control-(ui|cli)\b/, fix: "the bundled `/simplify`, or the project verify skill and the bundled `run`" },
  { re: bareCommand, fix: "`/pstack:<name>`" },
  { re: /(?<![\w:-])(poteto-agent|comment-sicko)(?=["`])/, fix: "`pstack:poteto-agent` or `pstack:comment-sicko`" },
];

const allowed = (path, line) => ALLOW.some((entry) => path.startsWith(entry.path) && line.includes(entry.text));
const findings = [];

for (const path of files.filter((path) => TEXT.test(path))) {
  const lines = readFileSync(join(PLUGIN, path), "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const { re, fix } of RULES) {
      const match = line.match(re);
      if (match && !allowed(path, line)) findings.push(`${path}:${index + 1} ${JSON.stringify(match[0])} -> ${fix}`);
    }
  });
}

const LINK = /\]\(([^)\s]+)\)/g;
for (const path of files.filter((path) => path.endsWith(".md"))) {
  for (const [, href] of readFileSync(join(PLUGIN, path), "utf8").matchAll(LINK)) {
    const target = href.replace(/[#?].*/, "");
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = posix.join(posix.dirname(path), target);
    if (!existsSync(join(PLUGIN, resolved))) findings.push(`${path} links to missing ${href}`);
  }
}

for (const skill of skills) {
  const text = readFileSync(join(PLUGIN, "skills", skill, "SKILL.md"), "utf8");
  const name = text.match(/^---\n[\s\S]*?^name:\s*["']?([^"'\n]+)/m)?.[1].trim();
  if (name !== skill) findings.push(`skills/${skill}/SKILL.md has name ${JSON.stringify(name)}, not ${skill}`);
}

for (const finding of findings) console.log(`FAIL ${finding}`);
console.log(findings.length ? `${findings.length} findings` : `native: ${files.length} files, ${skills.length} skills, 0 findings`);
process.exit(findings.length ? 1 : 0);
