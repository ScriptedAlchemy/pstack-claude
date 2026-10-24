# benny automation intent

## what i want to automate

i want two Claude Code scheduled tasks that work together in one slack issue channel. each runs on a schedule and polls the channel through a slack connector, as [`SCHEDULING.md`](./SCHEDULING.md) describes.

### automation 1: triage issue reports

- trigger: when a scheduled run finds a new top-level report in my configured source slack channel, i want this task to start on that report and keep its original thread coordinates.
- behavior: i want it to read the thread and attachments, classify the report as a bug or performance issue, feature request, question or feedback, or reroute, and trace the likely owning layer before routing.
- tracker: i want it to search my configured tracker for duplicates, update a confident duplicate, and create a ticket only for a clear net-new bug.
- tools: i want slack thread read and reply access, my configured tracker integration, and my optional routing map.
- outcome: i want exactly one reply in the source thread with a short verdict and `[benny:bug]`, `[benny:performance]`, or `[benny:other]`. a bug or performance marker may include the tracker url.
- boundary: i never want this task to post a root message in the source channel.

### automation 2: reproduce and fix confirmed bugs

- trigger: i want this task to pick up the same new top-level reports on its own schedule, then wait across runs for the trusted triage marker in the original thread.
- gates: i want it to stop when someone clearly owns the fix. if an existing pull request or merged commit may fix the report, i want verification instead of a competing change.
- behavior: i want it to use my configured control adapter and feature map, reproduce the exact symptom twice through the real ui, and capture screenshots, video, and a read-only state cross-check.
- fix: i want it to verify existing pull requests without authoring over them. after a confirmed repro, it may attempt one bounded root-cause fix, use tdd when the test is cheap, smoke the blast radius, and open a draft pull request only when before-and-after proof passes.
- tools: i want slack thread read and reply access, repository and history access, draft pull request creation, my configured tracker, and my control adapter.
- outcome: i want evidence and a verified result in the source or optional operations threads, plus an optional draft pull request. updates should be concise.
- boundary: i never want this task to post a root message in the source channel.

### shared rules

- i want the source channel and root thread coordinates to stay immutable for the whole run.
- i treat utility and debug bots as evidence, not delegation or fix ownership.
- i allow subagents to help, but they cannot post to slack or receive slack credentials.
- i want this entire pack committed at `.claude/automations/benny/` in the target repository. its `SKILL.md` files are direct task instructions, not registered plugin skills.
- i want pstack enabled through the target repository's committed `.claude/settings.json` only for shared dependencies such as `how`, `why`, `tdd`, `unslop`, and the required principle skills.
- i want each live task prompt to read `SCHEDULING.md` and its committed operational file directly. i do not want plugin cache paths, copied excerpts, or slash-skill discovery.
- i keep user-owned configuration, feature maps, routing maps, and secrets outside `.claude/automations/benny/` so pack refreshes cannot overwrite them.
- i want each task to keep its state in its own ledger branch, so a retried or overlapping run never repeats a post, a ticket, or a pull request.
- i want both tasks to fail closed when channel coordinates, tracker access, the control adapter, or the feature map are missing or uncertain.
- i want draft pull requests only. do not merge or deploy.

### my configuration

- source slack channel: `<channel>`
- optional operations channel: `<channel or none>`
- repository and default branch: `<repo>`, `<branch>`
- tracker: `<type, team, project, labels, intake status>`
- routing map: `<path or none>`
- triage identity: `<slack identity>`
- control skill: `<configured skill or adapter>`
- feature map: `<committed same-repo path outside the copied pack, or behavior to paraphrase>`
- models: `<triage, reproduce, code, media review>`
- status emoji strings: `<seen, reproducing, reproduced, blocked, fixing, failed, pull request opened>`
- schedule: `<cron for each task, hourly or slower>`
- budgets: `<verdict wait, follow-up, repro, rejection, fix>`
- optional bot token capability: `<none, file download, or editable operations status>`, stored as a network secret on the task's cloud environment

start from [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md). copy and fill them outside this pack, for example under `.claude/benny/`. keep secret values in the cloud environment's network secrets, never in files or chat.

## for the agent

the human enters setup by pointing Claude Code at this file. do not look for or invoke a discovered benny slash skill.

1. ask which repository the tasks will run in.
2. treat the directory containing this `FOR_AGENTS.md` as the source pack.
3. merge the entire source pack into `<target-repository>/.claude/automations/benny/`.
4. preserve every destination-only file. never delete unrelated files or overwrite user-owned configuration, feature maps, or routing maps.
5. when an existing destination file at a source-managed path differs, review the diff and merge without discarding local edits. if ownership is ambiguous, stop and ask before replacing it.
6. verify that the copied `FOR_AGENTS.md` and `skills/setup-benny/SKILL.md` exist in the target repository.
7. read and follow `.claude/automations/benny/skills/setup-benny/SKILL.md` directly from the target repository.

i want you to merge these entries into the target repository's `.claude/settings.json`:

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

preserve every unrelated setting, marketplace, and plugin. validate the json after editing it.

i want verification from a fresh session rooted in the target repository, and again inside the first readiness run of a scheduled task. confirm that pstack arrives through the project settings and that the `SKILL.md` files of pstack's `how`, `why`, `tdd`, `unslop`, and the principle skills used by benny are readable from the installed plugin. pstack skills are not model-invocable, so benny reads each one as a file. do not count a plugin installed only in your user scope or skills loaded in the current session.

if the project-scoped plugin does not install or any shared dependency is unreadable, stop and explain what failed. do not add `.claude/automations/benny/skills/` to a plugin manifest or move it under `.claude/skills/`, and do not expect its files to appear in the slash-skill list.

tell me that `.claude/settings.json`, `.claude/automations/benny/`, and any referenced secret-free configuration must be committed on the default branch before either task is created, because each run clones that branch. do not create or update a task until i explicitly ask.

read [`SCHEDULING.md`](./SCHEDULING.md) for the polling runner, the ledger, waits across runs, and the readiness test.

for first-time creation, run `/schedule` from a local session once for triage and once for repro and fix. `/schedule` is not available inside a cloud session. finish the review, the ledger branch, and the readiness test for the first task before starting the second.

paraphrase this intent and the finished configuration into each task prompt. the triage prompt must read `.claude/automations/benny/SCHEDULING.md` and follow `.claude/automations/benny/skills/triage-issue-reports/SKILL.md`. the repro prompt must read the same runner file and follow `.claude/automations/benny/skills/reproduce-and-fix-issues/SKILL.md`. use these repo-relative paths only after you confirm they are committed on the branch the task clones.

for existing tasks, find them with `/schedule list` and change them with `/schedule update` or the edit dialog at `claude.ai/code/routines`. use the concise field checklist in the copied setup file. do not create duplicates.
