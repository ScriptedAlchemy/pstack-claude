# benny

benny gives you two Claude Code scheduled tasks for slack issue reports. one triages each report. the other reproduces confirmed bugs and may prepare a small draft fix.

the files in this directory are dormant setup and automation sources. they do not appear as slash skills.

## set it up

1. point Claude Code at [`FOR_AGENTS.md`](./FOR_AGENTS.md) and name the target repository.
2. let setup merge this whole directory into the target at `.claude/automations/benny/`. it must preserve destination-only files and review conflicts instead of overwriting local edits.
3. let setup enable pstack in the target repository's `.claude/settings.json` for shared dependencies:

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

4. keep user-owned configuration outside the copied pack, for example in `.claude/benny/`. adapt [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md).
5. commit `.claude/settings.json`, `.claude/automations/benny/`, and any secret-free configuration before creating either task.
6. create each task with `/schedule`, or review and update existing tasks at `claude.ai/code/routines`. then run the [readiness test](./SCHEDULING.md#readiness-test) on a harmless test report and verify every source-channel post stays in the original thread.

scheduled tasks poll slack instead of receiving slack events, and they run at most once an hour, so a report can wait up to an hour before benny sees it. benny needs a slack connector that reads history and posts thread replies, your tracker, a ledger branch for state, and a control adapter that runs unattended in the task's cloud environment. installing pstack alone does not activate benny or connect those services.
