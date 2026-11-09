# Agent rules for tech-demos

This repo holds one small demo app per technology picked from the owner's X bookmarks. Do not create a new repository.

## Where code goes

- One app per pick, at `apps/<kebab-slug>/`.
- Each app is self-contained. From that folder, `bun install && bun run dev` is enough to run it.
- Add or update only the app you were asked to work on. Leave other `apps/<slug>/` directories alone.

## Before writing app code

1. Read `skills/project-planning/SKILL.md` and follow it.
2. Write `apps/<slug>/PLAN.md` (goal, MVP, tasks, stack, deferred work) before coding.
3. Start from an official `bunx create-*` scaffold. Do not hand-roll the project skeleton.
4. Before `bun install` or `bun add` in that app, add `apps/<slug>/bunfig.toml`:

```toml
[install]
minimumReleaseAge = 259200
```

Bun is the runtime, package manager, and script runner for every app.

## Pull requests

Every PR that adds or changes an app must attach at least one screenshot and at least one video of that app running. The description should say what was exercised on a real desktop and what, if anything, is a labeled fixture.
