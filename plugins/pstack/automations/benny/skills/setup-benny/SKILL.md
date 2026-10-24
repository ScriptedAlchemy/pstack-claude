---
name: setup-benny
description: Configure Benny and prepare its triage and repro scheduled tasks. Use when installing Benny or changing its Slack, tracker, repository, routing, control, model, schedule, or budget settings.
disable-model-invocation: true
---

# Set up Benny

Benny ships as a dormant automation pack inside pstack. The plugin manifest exposes only pstack's normal skill root; this file and the two operational files are not slash skills.

The human enters setup by pointing Claude Code at the pack's `FOR_AGENTS.md`. The bootstrap flow copies the whole pack into the target repository, then reads this file directly at `.claude/automations/benny/skills/setup-benny/SKILL.md`.

Benny needs external configuration, two ledger branches, and two Claude Code scheduled tasks. Read `../../SCHEDULING.md` before step 7.

Do not create or update a scheduled task until the user explicitly asks. Never put a secret value in plugin files, prompts, committed configuration, environment variables, or chat.

## 1. Copy the pack and enable shared pstack skills

Do this before asking for Benny configuration and before running `/schedule`.

Ask which repository the tasks will run in. The source pack is the directory containing `FOR_AGENTS.md`. The destination is `<target-repository>/.claude/automations/benny/`.

Merge the entire source pack into the destination:

1. Create the destination when it is absent.
2. Copy every source file to the same relative path.
3. Preserve destination-only files. Never delete unrelated files during install or refresh.
4. Keep user-owned configuration, feature maps, and routing maps outside the destination. Never overwrite them.
5. When an existing source-managed file differs, inspect the diff and merge without discarding local edits. If ownership is ambiguous, stop and ask before replacing it.
6. Verify that the destination contains `FOR_AGENTS.md`, `SCHEDULING.md`, this setup file, both operational files, their references, and the templates.

If this file is already being read from the target destination, treat the copy as complete and run the same verification before continuing.

Add pstack to the target repository's `.claude/settings.json`. If the file or `.claude` directory does not exist, create it.

Merge these entries into the existing JSON:

```json
{
	"extraKnownMarketplaces": {
		"pstack-claude": {
			"source": { "source": "github", "repo": "ScriptedAlchemy/pstack-claude" }
		}
	},
	"enabledPlugins": {
		"pstack@pstack-claude": true
	}
}
```

Preserve every unrelated top-level setting, every other marketplace, and every other plugin entry. If `enabledPlugins["pstack@pstack-claude"]` already exists, change only its value. Validate the file after editing it.

Start a fresh session rooted in the target repository. Verify that pstack arrives through the project settings and that the `SKILL.md` of each of these shared skills is readable from the installed plugin:

- `how`
- `why`
- `tdd`
- `unslop`
- `principle-separate-before-serializing-shared-state`
- `principle-minimize-reader-load`
- `principle-guard-the-context-window`
- `principle-sequence-verifiable-units`
- `principle-fix-root-causes`
- `principle-prove-it-works`

pstack skills are not model-invocable, so the operational files read each one as a file. Find it by searching `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/` for `skills/<name>/SKILL.md`. Do not count a plugin installed only in the user's own scope or a skill loaded in the current session. The check must show that a fresh session in the target repository receives pstack through project settings. The first readiness run repeats this check inside the task's cloud session.

If the project-scoped plugin does not install or any shared dependency is unreadable, stop and explain the failure.

The Benny files are read directly from `.claude/automations/benny/`. Do not add that directory to a plugin manifest, move it under `.claude/skills/`, or expect its `SKILL.md` files to appear in the slash-skill list.

Tell the user that `.claude/settings.json`, `.claude/automations/benny/`, and any referenced secret-free configuration must be committed on the default branch before either task is created, because every run clones that branch. Do not commit them unless the user asks.

Once this check passes, live task prompts may read the committed operational files by their stable repository-relative paths. They must not embed a plugin cache path or copy the file contents.

## 2. Adapt the configuration

Open these copied examples:

- `../../templates/configuration.example.yaml`
- `../reproduce-and-fix-issues/references/feature-map.example.md`

Create user-owned copies outside `.claude/automations/benny/`. These are configuration files, not pack files. Example locations:

- Project config, such as `.claude/benny/configuration.yaml`
- Project feature map, such as `.claude/benny/feature-map.md`
- Project routing map, such as `.claude/benny/routing.md`

A scheduled run sees only what is committed in its cloned repository, so user-scoped copies under the home directory do not reach it.

Fill one feature-map section for every user-facing feature the task may reproduce. Keep it at the user point of view. Do not freeze implementation details or current code paths in the map.

Do not edit the copied examples. Pack refreshes may update source-managed files after conflict review, but they must never touch the user-owned copies.

Prefer committed, secret-free files in the target repository, because a fresh clone must read them. Otherwise paraphrase the required values into the live prompt. Reference a repository file only after you confirm it is committed on the branch the task clones.

Use stable repository-relative paths for committed pack and configuration files. Never reference the plugin source directory or a plugin cache path from a live task.

## 3. Fill the required choices

Ask for or confirm:

- Source Slack channel ID
- Optional operations or status channel ID
- Repository URL and default branch
- Triage identity or Slack user ID
- Issue tracker type, team, project, labels, and intake status
- Tracker connector, or `gh api` for GitHub Issues
- Optional routing map path
- Required control skill name
- Required user-facing feature-map path
- Status emoji strings
- Pull request URL format
- Cron schedule for each task, hourly or slower
- Ledger branch for each task and the initial `start_after_ts`
- Verdict, follow-up, rejection, repro, and fix budgets
- Model for triage, repro, code work, and media review

Each task runs on the model chosen in its prompt's model selector, so pick triage and repro models from that selector. Code work and media review run as subagents, so give each an `Agent` tool `model` (`opus`, `sonnet`, `haiku`, or `fable`) and an effort. Do not guess a model and do not carry over a private default.

Set each wait window to at least one schedule interval. A window shorter than the interval closes before the next run can look.

The source channel, triage identity, repository, tracker adapter, control skill, and feature map must be explicit. Fail setup if any required value stays ambiguous.

Use pstack's `unslop` skill on the final task names, descriptions, and prompts before saving them.

## 4. Check integration capabilities

Scheduled tasks reach Slack and the tracker only through connectors included on the task. Connector actions run as the accounts linked to the task owner's claude.ai account, so the triage identity is the owner's linked Slack user. Recommend a dedicated Slack account for it.

The triage task needs:

- A Slack connector that reads paginated history of the configured source channel and its threads
- Thread-reply access in that channel
- Attachment metadata and file download access when reports include media
- Search, read, create, and update access through the configured issue-tracker connector or `gh api`
- Push access to its ledger branch

The repro task needs:

- Read access to the source thread
- Thread-reply access in the source channel
- Optional post and edit access in the configured operations channel
- Repository read and history access
- Draft pull request creation through `gh api repos/{owner}/{repo}/pulls`. Cloud sessions reject GraphQL, so `gh pr create` fails there
- Push access to its ledger branch and to fix branches under `repository.fix_branch_prefix`
- The configured control-adapter skill, able to run unattended in the task's cloud environment

If the owner has no Slack connector with these actions, stop. Benny cannot run without one. `../../SCHEDULING.md` describes what an issue-intake variant would need, and it is not covered here.

Prefer the configured Slack connector actions for reads and posts. An optional Slack bot token may fill a narrow gap such as editing one operations status message or downloading an attachment. Store it as a network secret on the task's cloud environment, limited to `slack.com`. Never put it in an environment variable, because anyone who uses the environment can read those.

Subagents share the run's connectors and network secrets. If the user wants delegated workers, offer a subagent definition in the target repository's `.claude/agents/` whose `tools` allowlist names only read tools, with no Slack connector tool, and no `Bash` or web tool when a Slack network secret is attached. Without one, the coordinator does the work.

Do not use undocumented integration endpoints.

## 5. Prepare the routing map

If the user wants reroutes or owner pings:

1. Copy `../triage-issue-reports/references/routing.example.md` outside `.claude/automations/benny/`.
2. Replace every placeholder with public or organization-local values.
3. Keep owner pings off by default.
4. Allow a ping only for a configured feature owner or a confirmed likely regression author.

If no routing map is configured, triage may classify a report but must not guess a destination or owner.

## 6. Verify the control adapter

Read `../reproduce-and-fix-issues/references/control-adapter.md` and the user's completed feature map.

Confirm that the named skill can:

- Bring up the target app
- Navigate every mapped feature through the real UI
- Exercise mapped states through declared adapter actions
- Inspect state without forcing the result
- Capture screenshots
- Start and stop a recording
- Clean up its processes and temporary data

It must do all of this inside the task's cloud environment, which is a fresh Linux VM with the environment's setup script and network access. If the target app cannot run there, route the task to a self-hosted environment that can run it, or leave the repro task off.

If any capability is missing, leave the repro task off. It must fail closed rather than claim a reproduction it did not perform.

## 7. Prepare the live scheduled tasks

Ask whether this is first-time creation or configuration of existing tasks.

Read `../../FOR_AGENTS.md` from the copied pack as the primary user-intent source for either path. Use it to understand the two schedules, connectors, instructions, outcomes, and shared rules.

### Ledger branches

Before creating a task, create its ledger branch from the template in `../../SCHEDULING.md`, with `mode` set to `readiness`, the configured `source_channel_id`, `start_after_ts`, and the authorized test report's `readiness_root_ts`. Push it without force. Do this only when the user asks. If the branch already exists, read it and keep its `reports`. Never reset it.

### First-time creation

Create one task at a time, from a local session. `/schedule` is not available inside a cloud session.

For each task:

1. Read the matching copied prompt template as secondary internal source material.
2. Turn `FOR_AGENTS.md`, the finished Benny configuration, and the template intent into a complete, self-contained prompt.
3. Tell the prompt to read `.claude/automations/benny/SCHEDULING.md` and follow its exact committed operational file under `.claude/automations/benny/`.
4. Use the stable repository-relative path, not a plugin source or cache path. Do not copy the operational file contents into the prompt.
5. Run `/schedule` and give it the name, prompt, cron schedule, target repository, and cloud environment.
6. On the task's edit dialog at `claude.ai/code/routines`, remove every connector the task does not need and pick the model.
7. Confirm that the copied pack and any referenced configuration files are committed on the branch the task clones.
8. Run the readiness test for this task before creating the next one.

Give `/schedule` this complete triage intent, filled from configuration:

- Name `benny-triage`.
- Read `.claude/automations/benny/SCHEDULING.md`, then read and follow `.claude/automations/benny/skills/triage-issue-reports/SKILL.md` for each selected report.
- Run on the configured triage cron, hourly or slower.
- Discover new top-level reports in the configured source Slack channel through the Slack connector.
- Keep state in the configured triage ledger branch.
- Read the report's thread and reply only inside it.
- Use the configured issue-tracker connector or `gh api`.
- Classify, inspect evidence, trace cause, dedupe, and create only clear new bugs.
- End one thread-only verdict with the configured `[benny:bug]`, `[benny:performance]`, or `[benny:other]` marker and optional tracker URL.
- Never post a source-channel root message.

After the triage task passes its readiness test, give `/schedule` this complete repro and fix intent:

- Name `benny-reproduce`.
- Read `.claude/automations/benny/SCHEDULING.md`, then read and follow `.claude/automations/benny/skills/reproduce-and-fix-issues/SKILL.md` for each selected report.
- Run on the configured repro cron, offset from triage.
- Discover the same new top-level reports in the configured source Slack channel.
- Keep state in the configured repro ledger branch.
- Use the configured repository and default branch.
- Read the source thread and reply only inside it.
- Include draft pull request creation through `gh api` and the configured tracker, control-adapter, and feature-map requirements. Paraphrase mapped user paths and states unless the feature map is committed on the branch the task clones.
- Wait across runs for a trusted triage marker before acting.
- Reproduce the exact symptom twice through the mapped real UI and capture evidence.
- Verify an existing fix without authoring over it.
- Attempt an optional bounded fix only after confirmed repro, then open a draft pull request when proof and checks pass.
- Never post a source-channel root message.

### Existing tasks

Find existing tasks with `/schedule list`. Do not create replacements or duplicates.

Finish configuration, routing, control-adapter, feature-map, and ledger validation. Then give the user this concise checklist, and apply it with `/schedule update` or the task's edit dialog at `claude.ai/code/routines`.

For the existing triage task, update:

- Name and prompt
- Direct instruction to read `.claude/automations/benny/SCHEDULING.md` and `.claude/automations/benny/skills/triage-issue-reports/SKILL.md`
- Cron schedule
- Target repository and cloud environment
- Slack connector with history read and thread reply
- Issue-tracker connector
- Triage ledger branch
- Paraphrased triage instructions, thread-only rule, and Benny verdict markers

For the existing repro task, update:

- Name and prompt
- Direct instruction to read `.claude/automations/benny/SCHEDULING.md` and `.claude/automations/benny/skills/reproduce-and-fix-issues/SKILL.md`
- Cron schedule
- Target repository, default branch, and cloud environment
- Slack connector with history read and thread reply
- Draft pull request creation through `gh api`
- Tracker, control-adapter, and feature-map requirements
- Repro ledger branch
- Paraphrased marker wait, evidence, verification, and bounded-fix instructions

### Creation boundary

Create and change tasks only through `/schedule` or the dialogs at `claude.ai/code/routines`. Never call an internal service to create or edit one, and never add an API trigger or fire a task's `/fire` endpoint for Benny. A task has one finish path, `/schedule` or the web dialog, reviewed with the user.

Do not set either ledger's `mode` to `live` until the thread-safety test passes.

## 8. Test thread safety

Use a test channel or a harmless test report the user explicitly authorized. Start runs with **Run now** on the task's detail page or `/schedule run`, while the ledger's `mode` is `readiness`.

Before testing, confirm that the target repository's `.claude/settings.json`, `.claude/automations/benny/`, and every referenced secret-free configuration file are committed on the branch the task clones. Confirm that both live prompts point at `SCHEDULING.md` and their exact committed operational files, and that both ledger branches exist. If any check fails, stop. Tell the user that the task cannot go live yet.

Open each run's session and read its transcript. A green run status means only that the session started and exited, not that the work succeeded.

Verify:

1. Triage stores the root `thread_ts` and posts exactly one verdict as a reply.
2. The verdict contains one configured marker.
3. Repro accepts the marker only from the configured triage identity.
4. Repro keeps the same immutable source coordinates.
5. No source-channel root message appears.
6. A delegated worker cannot use any Slack write action.
7. Missing coordinates, a deleted parent, or a failed preflight produces no post and no tracker issue.

Then run the duplicate and recovery checks in `../../SCHEDULING.md#readiness-test`.

Set `mode` to `live` in each ledger only after all seven checks and every readiness check pass, and only when the user asks.
