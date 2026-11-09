# agent-desktop playground

A local control panel for [agent-desktop](https://github.com/vercel-labs/agent-desktop) (docs: [agent-browser.dev/desktop](https://agent-browser.dev/desktop)). It lists running desktop apps, takes an accessibility-tree snapshot, and clicks or types an element by the qualified ref the CLI prints (`@<snapshot_id>:eN`).

Live mode shells out to the real `agent-desktop` binary and shows the JSON envelope it returns. Sample replay is a saved fixture of the bundled GTK window. The amber banner stays up the whole time, and the action log tags those entries `Sample`. That path never calls the CLI.

## Run

```bash
bun install
bun run dev
```

Open the URL Next prints (usually http://localhost:3000).

## Prerequisites

agent-desktop 1.2.0 ships in this app's dependencies. It needs the OS accessibility API:

| OS | What you need |
| --- | --- |
| Linux | Ubuntu 24.04 or later (glibc 2.35+), x86_64 or aarch64, a graphical session, and `at-spi2-core`. Run the dev server in that session so `DISPLAY` is set. If `DBUS_SESSION_BUS_ADDRESS` is unset, the server reads `~/.dbus/session-bus/`. X11 keys need XTEST. |
| macOS | macOS 13 or later. Grant Accessibility to the terminal or app that runs `bun run dev`. |
| Windows | Windows 10 1809 or later, or Windows Server 2019+, in the signed-in user's interactive desktop. |

Check with `./node_modules/.bin/agent-desktop status`. `accessibility.state` should be `granted` and `supported_surfaces` should list `window`.

The bundled target is a GTK 3 window (`target/playground-target.py`): a Note field, a Ping button, and a label that becomes `Pong: …`. On Debian or Ubuntu:

```bash
sudo apt install python3-gi gir1.2-gtk-3.0
```

Use **Open GTK target** in the panel, snapshot `python3.12` (that is the name `list-apps` returns for the script), type into `@…:e1`, then click `@…:e2`. Any other running app can be selected instead. On macOS or Windows, skip the GTK script and pick an app that is already open.

## What was verified

On Ubuntu 24.04 with an X11 session and AT-SPI, `status` reported `platform: linux` and `accessibility: granted`. `type` into the Note field returned `delivered_verified`, and `click` on Ping returned `delivered_unverified` through AT-SPI `Action.DoAction`. A later snapshot showed the label name `Pong: hello`.

## Limitations

- One local user. There is no auth. Bind the dev server to localhost.
- Headless semantic actions only. Pointer gestures that need `--headed` are not in this panel.
- Linux refs are matched by role and stable fields, not by an accessibility address. Two identical controls can come back `AMBIGUOUS_TARGET`. The bundled window avoids that.
- `click` is often `delivered_unverified`. Read the tree again; the panel snapshots after a successful action.
- Interactive-only snapshots drop the status label, because it has no ref. Leave that box off to see `Pong`.
- Sample replay only types into Note and clicks Ping. Other refs return `SAMPLE_ONLY`.
