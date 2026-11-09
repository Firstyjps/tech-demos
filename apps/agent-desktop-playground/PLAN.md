# Plan: agent-desktop playground

## Goal

A single-user local control panel that lists running desktop apps, snapshots one accessibility tree with the real `agent-desktop` CLI, and clicks or types an element by its qualified ref.

## What already works here

`agent-desktop` 1.2.0 (npm package, JSON envelope `2.6`) is supported on this VM: Ubuntu 24.04, glibc 2.39, x86_64, X11 session on display `:1`, AT-SPI bus up. `agent-desktop status` returns `platform: linux` and `accessibility: granted`. Against a small GTK 3 window, `type` returned `delivered_verified` and `click` returned `delivered_unverified` via `Action.DoAction`. The same CLI is the integration path on macOS (AX) and Windows (UI Automation).

The dev server must see the graphical session. This shell has `DISPLAY` but not `DBUS_SESSION_BUS_ADDRESS`; without the session bus, `status` is `denied`. The server will read the dbus-launch session file (`~/.dbus/session-bus/`) when the variable is missing, then spawn the CLI with that environment. Commands are argv arrays, never a shell.

## Single-user MVP

One screen:

- Show `status` (platform, accessibility, supported surfaces).
- List running apps (`list-apps`) and their windows (`list-windows`).
- Launch the bundled GTK target (`launch <path> --activate`) or another app by a plain name.
- Snapshot the chosen app (`snapshot --app`, optional `--window-id`, `--compact`, `-i`).
- Browse the tree. Each actionable node shows its qualified ref (`@<snapshot_id>:eN`).
- Click a ref (`click`) or type into a ref (`type`). Log the JSON envelope. Snapshot again so the tree matches the app.
- A separate **Sample replay** mode, clearly labeled, replays a saved fixture in the browser. It does not call the CLI and is never described as live. Use it when the bus is down.

## Out of scope

Skeleton and drill-down, `find`, sessions, screenshots, headed pointer gestures, keyboard combos, clipboard, notifications, multiple users, and auth. Refs stay in the default snapshot namespace so a snapshot and the action that follows it share one store.

## Tasks

1. Scaffold Next.js with `bunx create-next-app` (`--skip-install`), write `bunfig.toml`, then `bun install`.
2. Init shadcn/ui with the Nova preset and add only the controls this screen uses.
3. Server route that spawns `agent-desktop` for `status`, `list-apps`, `list-windows`, `launch`, `snapshot`, `click`, and `type`.
4. Control panel: app list, tree, action form, envelope log, live vs sample switch.
5. Bundled GTK 3 target (`target/playground-target.py`) with a Note field, a Ping button, and a status label.
6. Tests for ref checks, argv building, session-bus discovery, and sample replay updates.
7. Run the app, drive a live snapshot, browse the tree, type, and click. Capture a screenshot and a video.

## Stack

- **Bun** — required runtime and package manager, with `minimumReleaseAge = 259200`.
- **Next.js (App Router)** — official `create-next-app` scaffold; one route handler spawns the CLI, so there is no second server.
- **shadcn/ui, Nova preset, Base UI** — minimal default preset; components added as the screen needs them.
- **agent-desktop** — the real CLI (`agent-desktop` on npm). The UI parses its JSON envelopes and does not reimplement AT-SPI.
- **GTK 3 via PyGObject** — a tiny target window so click and type have a visible control. Any other running app can be selected instead.

## Layout

- `app/page.tsx` renders the panel.
- `app/api/desktop/route.ts` validates input and spawns the CLI.
- `lib/agent-desktop.ts` builds argv and collects one JSON envelope.
- `lib/desktop-env.ts` fills `DISPLAY` and `DBUS_SESSION_BUS_ADDRESS` from the session.
- `lib/sample-replay.ts` and `fixtures/sample-snapshot.json` are the labeled fixture.
- `components/playground.tsx` and `components/tree-view.tsx` are the screen.
- `target/playground-target.py` is the optional GTK window.

## Testing and hooks

`bun test` covers ref validation, argv construction, session-file parsing, and sample replay. No git hooks in this cut: the check is one fast test script, and a hook would not add a second kind of signal.

## After the first slice

The live path ran on this Ubuntu 24.04 X11 session. `status` was `granted`, a snapshot of the bundled GTK window returned qualified refs, `type` into Note was `delivered_verified`, and `click` on Ping changed the label to `Pong: …` on the next snapshot. Sample replay stays a labeled fixture and does not call the CLI. Scope did not need to grow.

## Deferred

- Drill-down (`--skeleton`, `--root`) and `find`. The full tree of a small window fits on one screen; large apps can turn on interactive-only.
- A named `--session`. One local user does not need a second snapshot namespace.
- Headed input. Semantic `click` and `type` already move this GTK target.
- Formatting hooks. Add them when a second app needs a shared check.
