# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

In a Claude Code session, run:

```text
/plugin marketplace add ScriptedAlchemy/pstack-claude
/plugin install pstack@pstack-claude
```

The install command opens the plugin's details. Choose a scope, and Claude Code prints an install summary. Claude Code prefixes plugin commands, so each command in this guide starts with `pstack:`, such as `/pstack:setup-pstack`.

## Pick your models

Run:

```text
/pstack:setup-pstack
```

[`/pstack:setup-pstack`](../../skills/setup-pstack/SKILL.md) detects the models you have access to, asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes `~/.claude/rules/pstack-models.md`, a small rule file that Claude Code loads into every new session and every pstack skill reads.

The rule covers the subagents pstack spawns. Your main session runs on the model you pick with `/model`.

The defaults run at `xhigh` reasoning, the same as the `large` budget. `unlimited` lifts each model to its highest level, up to `max`. A model that doesn't take a level uses its nearest one. `medium` and `small` lower the reasoning and spend fewer tokens.

You only override what you care about. A role with no line in the rule keeps the skill's default. To restore a default, delete that role's line. A rerun of `/pstack:setup-pstack` keeps any role whose model differs from the default. When a default changes, a rule written before the change still pins the old default, so delete those role lines, or delete the file, then run `/pstack:setup-pstack` again.

You might be wondering how to keep a role on the model you pick with `/model`. Set the role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your session's model. Both values mean the same thing, and neither is a model name. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `/pstack:swarm` worker unless a race names a model for each arm.

## Accept the verification offers, or don't

At the end of setup, `/pstack:setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/pstack:create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.claude/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/pstack:create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`/pstack:create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

After setup, start a new session. Claude Code loads the model rule when a session starts.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/pstack:setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main session with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the session's own model, the one `/model` sets.
- Shorten a panel list. Each entry runs one subagent.
- Save `/pstack:poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/pstack:poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/pstack:poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. Once you type `/pstack:poteto-mode`, the skill stays in the conversation on later turns. After compaction, Claude Code re-attaches only the start of a long skill, and a new session starts without it. To keep the mode on in every session, add a line like this to the project's `CLAUDE.md`, or to `~/.claude/CLAUDE.md` for every project:

```markdown
Work in poteto-mode. At the start of each task, read and follow `skills/poteto-mode/SKILL.md` from the newest pstack version under `~/.claude/plugins/cache/pstack-claude/pstack/`.
```

pstack skills run only when you type them, so the agent can't load the mode through the `Skill` tool. This line has it read the file instead.

Next: [Route work through `/pstack:poteto-mode`](./02-poteto-mode.md).
