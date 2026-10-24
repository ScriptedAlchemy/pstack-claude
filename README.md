# pstack for Claude Code

A Claude Code-native port of [Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack). It keeps pstack's skills, playbooks, principles, and agent personas, and rewrites their runtime instructions for Claude Code: the `Agent` tool, `AskUserQuestion`, `/pstack:<name>` commands, `.claude/` paths, and the `opus`, `sonnet`, `haiku`, and `fable` models. There is no adapter file. Each skill reads as if it were written for Claude Code. This is an independent port, not an official Cursor or Anthropic plugin.

The plugin lives in `plugins/pstack`. `.claude-plugin/marketplace.json` makes this repository a Claude Code marketplace named `pstack-claude`.

## Install

```sh
claude plugin marketplace add ScriptedAlchemy/pstack-claude
claude plugin install pstack@pstack-claude
```

Inside a session, `/plugin marketplace add ScriptedAlchemy/pstack-claude` and `/plugin install pstack@pstack-claude` do the same. Claude Code keeps auto-update off for third-party marketplaces. Turn it on from the `/plugin` marketplaces tab, or update by hand with `claude plugin update pstack@pstack-claude`.

A marketplace name is unique per machine. If another marketplace named `pstack-claude` is already installed, remove it first with `claude plugin marketplace remove pstack-claude`.

Start a new session, run `/pstack:setup-pstack` to choose a model and effort per role, then use `/pstack:poteto-mode` for work that needs rigor. The setup writes `~/.claude/rules/pstack-models.md`, which Claude Code loads into every session. The skills are explicit-only (`disable-model-invocation: true`), so they run when you type them or when another pstack skill routes to them.

## Additions beyond upstream

- `/pstack:automate-maintainer sokra, alex for owner/repo` drafts mode skills from named GitHub users' code, reviews, and design discussions, with a group mode for shared conventions and disagreements.
- `/pstack:automate-team owner/repo` discovers a repository's active core contributors first, then builds a team mode.

Both keep evidence and ownership explicit. They create skills without posting or acting as the people studied. `automate-maintainer` restores the generator from [ScriptedAlchemy/plugins PR #1](https://github.com/ScriptedAlchemy/plugins/pull/1). Both are shared with [pstack-codex](https://github.com/ScriptedAlchemy/pstack-codex).

## Verify

```sh
./scripts/test.sh
```

It runs the native-port gate (`scripts/check-native.mjs`), `claude plugin validate` on the marketplace and the plugin when `claude` is on `PATH`, and the helper-script tests. The gate fails on any Cursor-only name, any dangling relative link, and any skill whose frontmatter `name` differs from its folder. The helper tests need Bun and Node 22.15 or later. Run `bun install --frozen-lockfile` in `plugins/pstack/skills/poteto-mode/scripts` first, and remove that `node_modules` before you publish.

## Track upstream

`origin` is this port. `upstream` is `https://github.com/cursor/plugins.git`. [UPSTREAM.json](UPSTREAM.json) pins the upstream commit this port was last synced to. The first commit in this repository imports that upstream `pstack/` verbatim, so `git diff <first-commit> -- plugins/pstack` shows the whole port.

```sh
git remote add upstream https://github.com/cursor/plugins.git # once, if absent
./scripts/check-upstream.sh   # list upstream pstack changes since the pin
./scripts/sync-upstream.sh    # three-way merge them into the port
```

See [UPDATING.md](UPDATING.md) for the procedure and [PORTING.md](PORTING.md) for the Cursor-to-Claude Code mapping every ported file follows.

## License and attribution

MIT, copyright Lauren Tan. See [LICENSE](LICENSE). pstack's skills, playbooks, principles, and personas are Lauren Tan's work. This repository adapts them to Claude Code.
