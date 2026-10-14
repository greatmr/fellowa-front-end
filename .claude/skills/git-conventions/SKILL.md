---
name: git-conventions
description: Git history analysis and Git safety for the Fellowa workspace. When to read history (previous behavior, porting from the prototype, unclear intent), the read-only commands that answer it, the rules that protect uncommitted work and parked stashes or branches, and the commit, branch and pull-request conventions (Conventional Commits with a scope, task id in the subject, feature/* branches). Use before any git write, commit, branch or stash operation and whenever history matters.
---

## Safety (before any git write)

1. Run `git status`, `git diff`, `git diff --staged` and `git stash list` first. Know what is uncommitted and whose it is. This workspace has had work in progress on feature branches while documentation and configuration were being generated — assume someone else's work is in the tree.
2. Never discard or overwrite working-tree changes: no `reset --hard`, `clean`, `checkout -- <path>`, `checkout <sha> -- <path>`, `restore`, stashing someone else's work, or a branch switch that drops it. `.claude/settings.json` makes the destructive commands ask first; do not look for ways around that.
3. Stashes and other branches often hold parked, unmerged work. Read them with `git stash show -p stash@{n}` or `git show <ref>:<path>`; never `stash pop`, `apply` or `drop`. Do not revive a superseded approach without asking.
4. Never blind `cherry-pick`, revert-and-reapply, or restore an old file. History tells you intent; today's code decides the implementation. Read the old diff, work out what is still valid, then re-implement adapted.
5. No force-push, no history rewriting, no commits, pushes or branches unless the user asked.
6. **Deletion caveat on the user's machine:** file deletion in a connected folder may be blocked, which makes `git` leave `.lock` files under `.git` and fail later commands with "File exists". If a git command fails that way, say so rather than working around it with more git commands.

## When to read history

Read it when the task says "previous / old / used to / restore / port / migrate", when the current code's intent is unclear, when matching a convention you cannot see in a sibling, or when a stash or branch is named. Skip it for plain new work.

This project has almost no history of its own yet — it is new. The history that matters is usually in `../back-end` (what the API actually did and when) or in `../presentation` (what the prototype established). Read in the repository that owns the answer.

## How (read-only)

```
git log --oneline -n 30 -- <path>                  # what changed here, and why
git log -S'<symbol or string>' --oneline           # when it appeared / disappeared
git log -G'<regex>' --oneline -- <path>
git blame -L <a>,<b> -- <file>    then  git show <sha>
git show --stat <sha>             then  git show <sha> -- <path>
git log --merges --first-parent --oneline -- <path>
git log --grep='<task id>' --oneline               # everything for one task
git log --grep='^Revert' --oneline -- <path>       # was it tried and reverted?
git diff <base>...<branch> --stat                  # what a branch adds
```

Cite the sha when history changed your decision.

## Conventions

- **Commit:** `type(scope): subject [<task id>]`. Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `build`, `ci`, `style`. Scope is the feature or area (`auth`, `page`, `post`, `membership`, `payment`, `payout`, `chat`, `ui`, `i18n`, `api`, `config`). Subject: lower-case, imperative, no trailing period, header ≤ 100 characters. Include the task id from `../.claude/tasks/board.md` where one exists.
- **Choose the type by effect:** new user-visible behavior `feat`, bug `fix`, internal restructure `refactor`, tooling / dependencies / config `chore`.
- **Branch:** `feature/<short-kebab-description>` or `fix/<…>`, matching the convention already used in `../back-end` (for example `feature/phase0-security-hardening`). One intention per branch.
- **Staging:** stage explicit paths, never `git add -A` — this workspace contains generated documents, `.env.local` and other people's work in progress. One intention per commit; structural change separate from behavior change. End the message with the Co-Authored-By trailer the environment specifies.
- **Nothing is enforced.** This project has no husky hooks, no commitlint and no CI. The conventions above are yours to keep; run `npm run lint`, `npm run typecheck` and `npm run test` yourself before committing, because nothing else will.
- **Pull-request description:** what changed and why; where a reviewer should look hardest; how it was verified and what was not; locale, RTL and access-level impact; anything needed outside this repo (a backend field, a migration, an environment value); the task or story id. One intention per PR.
