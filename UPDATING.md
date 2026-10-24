# Updating from upstream pstack

[UPSTREAM.json](UPSTREAM.json) records the upstream commit the port was last synced to. Do not merge the Cursor plugins monorepo into this repository. Its layout differs, and it would overwrite the port.

1. Start from a clean working tree on a new branch.
2. Run `scripts/check-upstream.sh`. It fetches `upstream` and lists the commits and files under upstream `pstack/` since the pin. No output beyond "No upstream pstack changes" means there is nothing to do.
3. Run `scripts/sync-upstream.sh`. For each changed upstream file it runs `git merge-file` with the pinned upstream file as the base, the new upstream file as theirs, and the ported file as ours. Added files are copied in, deleted files are removed, and `scripts/codemod.mjs` reapplies the mechanical renames. It prints each conflict and each upstream path with no direct counterpart, such as `plugin.json` or `docs/harness/`.
4. Resolve every conflict. Port each new Cursor name per [PORTING.md](PORTING.md). When upstream adds a tool, field, path, or feature that PORTING.md has no row for, add the row first, then port the files.
5. Check by hand what `scripts/check-native.mjs` cannot see. New skills and playbooks need native wording, not only renamed tokens. Upstream manifest changes, such as a new keyword or description, go into `plugins/pstack/.claude-plugin/plugin.json` by hand.
6. Run `scripts/test.sh` until it passes.
7. Set `UPSTREAM.json` to the synced commit and version. Bump the plugin version to `<upstream-version>-claude.<n>`, so installed copies see the update. Commit the port and the pin together.
8. Reinstall with `claude plugin update pstack@pstack-claude` and try the changed skills in a new session.

The custom skills (`automate-maintainer`, `automate-team`) have no upstream counterpart. A sync never touches them. Keep their mentions in `README.md`, `docs/guide/09-make-it-yours.md`, and `skills/poteto-help/SKILL.md` when those files merge.
