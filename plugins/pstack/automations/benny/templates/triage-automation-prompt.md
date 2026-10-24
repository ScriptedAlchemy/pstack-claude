# Triage task prompt

> Source material for the copied setup workflow. Paraphrase this intent into the `benny-triage` scheduled task's prompt after you confirm that the copied pack is committed on the branch the task clones.

Read `.claude/automations/benny/SCHEDULING.md`, then follow it for this run. For each report it selects, read and follow `.claude/automations/benny/skills/triage-issue-reports/SKILL.md`.

Configuration source. Include this repository-relative path only when it is committed in the same target repository. Otherwise paraphrase the configured values. Never use a plugin source or cache path:

```text
{{BENNY_CONFIG_PATH}}
```

Ledger branch:

```text
{{BENNY_TRIAGE_LEDGER_BRANCH}}
```

The runner builds each trigger from a top-level report it observed in the configured source Slack channel:

```json
{
	"source_channel_id": "<verified channel>",
	"ts": "<exact root ts>",
	"thread_ts": "<same root ts>"
}
```

The prompt should describe the source as new top-level reports in the configured source Slack channel, read through the included Slack connector on each scheduled run.

Treat the source channel and root thread timestamp as immutable. If either is missing or does not match configuration, stop without posting or writing to the issue tracker.

The committed operational file owns classification, attachment review, cause tracing, routing, dedupe, tracker writes, and the final verdict. Post no progress messages. Never post a root message in the source channel.

The coordinator is the only Slack poster. Any delegated worker must be read-only, return findings only, and receive an explicit ban on every Slack write action.

Record every external write in the ledger before and after it, as the runner file describes. Never repeat a write the ledger cannot confirm.

End the single verdict with exactly one configured marker:

```text
[benny:bug]
[benny:performance]
[benny:other]
```

A bug or performance marker may add `tracker=<URL>`.
