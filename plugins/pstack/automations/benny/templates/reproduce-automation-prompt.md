# Reproduce task prompt

> Source material for the copied setup workflow. Paraphrase this intent into the `benny-reproduce` scheduled task's prompt after you confirm that the copied pack is committed on the branch the task clones.

Read `.claude/automations/benny/SCHEDULING.md`, then follow it for this run. For each report it selects, read and follow `.claude/automations/benny/skills/reproduce-and-fix-issues/SKILL.md`.

Configuration source. Include this repository-relative path only when it is committed in the same target repository. Otherwise paraphrase the configured values. Never use a plugin source or cache path:

```text
{{BENNY_CONFIG_PATH}}
```

Ledger branch:

```text
{{BENNY_REPRODUCE_LEDGER_BRANCH}}
```

The runner builds each trigger from a top-level report it observed in the configured source Slack channel:

```json
{
	"source_channel_id": "<verified channel>",
	"ts": "<exact root ts>",
	"thread_ts": "<same root ts>"
}
```

The prompt should describe the source as new top-level reports in the configured source Slack channel, read through the included Slack connector on each scheduled run. It should include the configured repository, default branch, issue tracker, control adapter, feature map, and draft pull request creation through `gh api`.

Treat the source channel and root thread timestamp as immutable. If either is missing or does not match configuration, stop without posting.

Wait for a configured triage marker from the configured triage identity in this exact thread. Proceed only for `[benny:bug]` or `[benny:performance]`. When the marker has not landed, record the stage and deadline in the ledger and let a later run resume.

Require the configured control-adapter skill before attempting a repro. Reproduce the exact discriminating symptom twice through the real UI. Verify existing pull requests or commits without authoring over them. Attempt a bounded fix only after a confirmed repro and the operational file's fix gate.

The coordinator is the only Slack poster. Every child prompt must forbid `SendSlackMessage`, `PostToSlack`, `chat.postMessage`, every Slack connector write tool, and all other Slack writes. Children return findings only.

Record every external write in the ledger before and after it, as the runner file describes. Never repeat a write the ledger cannot confirm.

Never post a root message in the source channel.
