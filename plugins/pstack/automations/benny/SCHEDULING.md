# Scheduled runner

Read this file before either operational workflow. Benny runs as two Claude Code scheduled tasks, one for triage and one for repro. Each task runs on a cron schedule in a cloud session, discovers new reports through a Slack connector, and hands one verified trigger at a time to the unchanged per-report workflow. A Slack message does not start a run. The schedule does, so every report waits up to one schedule interval before Benny sees it.

## What each task needs

- A schedule trigger. Scheduled tasks reject a cron expression that runs more often than once an hour, so the shortest interval is hourly. Pick a minute past the hour, such as `7 * * * *`, because runs set exactly on the hour can start several minutes late.
- The target repository, selected on the task. Each run starts from a fresh clone of its default branch.
- A Slack connector included on the task that can read paginated channel history, read thread replies, and post thread replies. Repro also needs the configured operations actions. Without such a connector Benny stays off. See [Without a Slack connector](#without-a-slack-connector).
- The configured tracker, as a connector or through `gh api` for GitHub Issues.
- A cloud environment whose network access reaches what the control adapter needs. Store any API key as a network secret on that environment, never as an environment variable, because anyone who uses the environment can read its variables.

Connector actions run as the Slack and tracker accounts linked to the task owner's claude.ai account. The triage identity is therefore the owner's linked Slack user. Use a dedicated Slack account for it, so that the follow-up rule "answer a direct question to the triage identity" does not answer messages meant for a person.

## The ledger

Each task owns one ledger. It replaces in-run memory across runs and makes a retried or overlapping run converge on the same end state.

The ledger is `ledger.json` at the root of a branch only that task writes. Use `ledger.triage_branch` and `ledger.reproduce_branch` from the configuration, for example `claude/benny-triage-ledger` and `claude/benny-reproduce-ledger`. Two branches keep the two tasks from ever writing the same file. A separate private state repository attached to both tasks works the same way when the target repository should not carry Slack coordinates.

```json
{
	"schema_version": 1,
	"mode": "readiness",
	"source_channel_id": "C0123456789",
	"start_after_ts": "1767225600.000000",
	"readiness_root_ts": "1767225900.000100",
	"discovered_through_ts": "1767225600.000000",
	"lease": { "run_id": "", "expires_at": "" },
	"reports": {
		"1767225900.000100": {
			"stage": "waiting_verdict",
			"first_seen_at": "2026-01-01T00:05:00Z",
			"deadlines": { "verdict": "2026-01-01T03:05:00Z" },
			"tracker_url": "",
			"verdict_ts": "",
			"operations": { "channel_id": "", "thread_ts": "" },
			"branch": "",
			"pull_request_url": "",
			"actions": []
		}
	}
}
```

Rules:

- Store every Slack timestamp as the exact string Slack returned. Never pass one through a floating-point number.
- Store identifiers, stages, deadlines, and URLs only. Never store message text, attachments, tokens, or reporter details.
- `mode` gates live traffic. `off` means the run acts on nothing. `readiness` means the run acts only on `readiness_root_ts`. `live` means normal traffic. Setup writes `readiness`. Only the user's explicit approval after the readiness test moves it to `live`.
- Each entry in `actions` names one external write (`kind`, `state`, `at`, `ref`). Its `state` is `prepared`, `verified`, or `blocked`.

### Write protocol

Keep the ledger branch in its own `git worktree`, so ledger commits never mix with a fix branch.

1. `git fetch origin <ledger branch>` and read `ledger.json` from it. If the branch or file is missing, stop. Setup creates it.
2. Change the file, commit, and `git push origin HEAD:<ledger branch>` without force.
3. If the push is rejected, another run wrote first. Fetch again, re-read, and decide again from the new state. Never force-push the ledger.

A rejected push is the only lock Benny relies on. It does not assume the scheduler keeps runs from overlapping.

### Lease

At the start of a run, generate a run ID and write `lease` with an `expires_at` past the longest run you expect (`ledger.lease_minutes`). If another run holds an unexpired lease, finish without acting. An expired lease means the earlier run may still be alive, so reconcile every `prepared` action it left before taking over. Clear the lease at the end of the run.

### External writes

Before each Slack post, tracker write, branch push, or pull request:

1. Append a `prepared` action and push the ledger.
2. Perform the write.
3. Read the result back from Slack, the tracker, or GitHub.
4. Mark the action `verified` with its reference, such as the reply `ts` or the issue URL, and push the ledger.

A `prepared` action with no `verified` mark means a run stopped mid-write. Reconcile it by reading the source thread, the tracker's source-permalink search, and the repository. If the write landed, mark it `verified`. If it did not, it may run once more. If you cannot tell, mark it `blocked` and leave it for a person. A `prepared` record never grants a retry by itself. Slack and tracker writes are not a transaction, so this protocol prevents duplicates in the common failure cases but cannot promise exactly-once delivery when a service gives an ambiguous answer.

## Every scheduled run

1. Load the configuration and the ledger, and take the lease. Confirm the connector can read `slack.source_channel_id`. If `mode` is `off`, release the lease and finish.
2. Page through channel history after `discovered_through_ts`, or after `start_after_ts` on the first run. Never backfill before `start_after_ts`. Skip thread replies. Add each unseen top-level human report to `reports` with its exact root `ts`.
3. Resume pending reports first, then take new ones, up to `schedule.max_reports_per_run`. In `readiness` mode take only `readiness_root_ts`.
4. For each selected report, build the trigger from the observed root and follow the operational file with it:

```json
{ "source_channel_id": "<verified channel>", "ts": "<exact root ts>", "thread_ts": "<same root ts>" }
```

   Triage follows `skills/triage-issue-reports/SKILL.md`. Repro follows `skills/reproduce-and-fix-issues/SKILL.md`.
5. Advance `discovered_through_ts` only past pages whose reports are all in the ledger. This mark helps paging. It never proves a report finished. Re-read a small overlap each run and drop coordinates the ledger already has.
6. Record each report's new stage, release the lease, and finish. With no change, post nothing.

## Waits that outlast a run

The verdict wait, the rejection window, and both follow-up windows are durable deadlines in the ledger. When a wait runs past what the current run can hold, record the stage and its deadline and end. The next run re-reads the thread and resumes from that stage. Never start a second task, a detached sleeper, or `/loop` to wait for one report.

Because runs are at least an hour apart, a window shorter than the interval closes before the next run looks. Set each window to at least one interval. A longer rejection window only makes repro wait longer before a fix, which is safe.

Repro never enters the fix phase before its rejection deadline has passed and a fresh ownership and rejection check of the thread has run.

## Permission prompts

A scheduled run starts in auto mode, where a classifier allows or blocks each action. The saved prompt does not count as approval for actions during the run. A run that hits an ask rule or repeated blocks stops and waits for someone to answer in the run's session. During the readiness test, confirm that the ledger push, the thread reply, the tracker writes, and the draft pull request go through without a prompt. If one stops, add a narrow `permissions.allow` rule for that tool in the target repository's `.claude/settings.json`, commit it, and run the test again.

## Readiness test

Run this before `mode` becomes `live`. Use **Run now** on each task's detail page at `claude.ai/code/routines`, or `/schedule run`, against one report the user explicitly authorized as a harmless test.

1. Discovery finds the test report, and a second run does not add it twice.
2. A run stopped after a `prepared` action resumes by reconciling, not by writing again.
3. Two runs started close together leave one lease holder. The other finishes without acting.
4. Repro waits on a delayed triage marker across runs and accepts it once it lands.
5. Triage finds its own existing verdict and posts no second one.
6. No tracker issue or verdict is duplicated, nothing appears at the source-channel root, and no pending report is skipped.
7. No run stops on a permission prompt.

Keep `mode` at `readiness` until all seven pass and the thread-safety checks in the setup file pass. If the environment cannot run the Slack connector, the tracker, or the control adapter unattended, report that and do not call Benny live.

## GitHub Actions instead

The same runner works as a GitHub Actions workflow on an `on: schedule` cron that runs `anthropics/claude-code-action@v1` with the template as its `prompt`. Pass the Claude credential from an Actions secret (`anthropic_api_key` or `claude_code_oauth_token`). Slack then comes from a Slack MCP server you configure through `--mcp-config` in `claude_args`, with its bot token in an Actions secret, and the triage identity is that bot user. Grant the tools the prompt needs with `--allowedTools`. Add a workflow `concurrency` group so GitHub serializes runs, and keep the ledger anyway, because retries and cancelled jobs still leave partial writes. GitHub runs scheduled workflows only from the default branch and may start them late.

## Without a Slack connector

Benny's contract is a Slack source thread. If the task owner has no Slack connector that can read history and post thread replies, leave both tasks off. A GitHub issue can stand in for the Slack report through a GitHub Actions workflow on `issues: opened`, with issue comments as the thread and a comment from the triage account as the marker. That is a different contract. These files do not cover it, and setup must not claim it.
