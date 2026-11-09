# tech-demos

Small, self-contained demos of technologies picked from X bookmarks. Each app lives in its own folder under `apps/` and runs with Bun (`bun install && bun run dev`).

| App | What it shows | Run |
| --- | --- | --- |
| [agent-desktop-playground](apps/agent-desktop-playground/) | Pick a running desktop app, snapshot its accessibility tree with [agent-desktop](https://github.com/vercel-labs/agent-desktop), and click or type by element ref | `cd apps/agent-desktop-playground && bun install && bun run dev` |

On this repo's Linux VM, agent-desktop talks to real apps through AT-SPI. The playground also has a labeled sample replay for when no desktop session is available. That fixture is never presented as a live tree.
