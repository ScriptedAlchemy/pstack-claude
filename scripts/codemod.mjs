#!/usr/bin/env node
// Mechanical Cursor-to-Claude Code renames. Idempotent: a second run changes nothing.
// Judgment calls (models, cloud agents, automations, transcripts) stay with a human pass; see PORTING.md.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..", "plugins", "pstack");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const skills = readdirSync(join(PLUGIN, "skills")).filter((name) => existsSync(join(PLUGIN, "skills", name, "SKILL.md")));

const EDITS = [
  [new RegExp(`(?<![\\w:./@-])/(${skills.join("|")})(?![\\w/-])`, "g"), "/pstack:$1"],
  [/\bAskQuestion\b/g, "AskUserQuestion"],
  [/`Task`/g, "`Agent`"],
  [/\bTask (tool|subagent|call)/g, "Agent $1"],
  [/\bgeneralPurpose\b/g, "general-purpose"],
  [/~\/\.cursor\/rules\/pstack-models\.mdc/g, "~/.claude/rules/pstack-models.md"],
  [/pstack-models\.mdc/g, "pstack-models.md"],
  [/(~\/)?\.cursor\/skills\//g, (_, home) => `${home ?? ""}.claude/skills/`],
  [/(?<![\w:-])(poteto-agent|comment-sicko)(?=["`])/g, "pstack:$1"],
];

let changed = 0;
for (const path of walk(PLUGIN).filter((path) => path.endsWith(".md"))) {
  const before = readFileSync(path, "utf8");
  const after = EDITS.reduce((text, [re, to]) => text.replace(re, to), before);
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
    console.log(relative(PLUGIN, path));
  }
}
console.log(`${changed} files changed`);
