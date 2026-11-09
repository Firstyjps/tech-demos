import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export type SessionBusFile = {
  name: string
  text: string
}

export type ParsedSessionBus = SessionBusFile & {
  address?: string
  displayHint?: string
}

export function parseSessionBusFile(text: string): {
  address?: string
  displayHint?: string
} {
  const quoted = text.match(/DBUS_SESSION_BUS_ADDRESS='([^']+)'/)
  const bare = text.match(/^DBUS_SESSION_BUS_ADDRESS=(\S+)/m)
  const address = quoted?.[1] ?? bare?.[1]
  const display = text.match(/display\s+:(\d+)/)
  return {
    address: address && address !== "autolaunch:" ? address : undefined,
    displayHint: display ? `:${display[1]}` : undefined,
  }
}

export function selectSessionBus(
  files: SessionBusFile[],
  display: string | undefined,
): ParsedSessionBus | undefined {
  const parsed = files
    .map((file) => ({ ...file, ...parseSessionBusFile(file.text) }))
    .filter((file) => file.address && socketExists(file.address))
  if (parsed.length === 0) return undefined
  if (display) {
    const match = parsed.find((file) => file.displayHint === display)
    if (match) return match
  }
  return parsed[0]
}

function socketExists(address: string | undefined): boolean {
  if (!address) return false
  const match = address.match(/unix:path=([^,]+)/)
  if (!match) return true
  try {
    return fs.existsSync(match[1])
  } catch {
    return false
  }
}

export function readSessionBusFiles(home = os.homedir()): SessionBusFile[] {
  const dir = path.join(home, ".dbus", "session-bus")
  let names: string[]
  try {
    names = fs.readdirSync(dir)
  } catch {
    return []
  }
  return names.map((name) => ({
    name,
    text: fs.readFileSync(path.join(dir, name), "utf8"),
  }))
}

export function resolveDesktopEnv(
  base: NodeJS.ProcessEnv = process.env,
  files: SessionBusFile[] = readSessionBusFiles(),
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base }
  const dbusMissing =
    !env.DBUS_SESSION_BUS_ADDRESS ||
    env.DBUS_SESSION_BUS_ADDRESS === "autolaunch:"
  if (!dbusMissing && env.DISPLAY) return env
  const picked = selectSessionBus(files, env.DISPLAY)
  if (!picked) return env
  if (dbusMissing && picked.address) {
    env.DBUS_SESSION_BUS_ADDRESS = picked.address
  }
  if (!env.DISPLAY && picked.displayHint) {
    env.DISPLAY = picked.displayHint
  }
  return env
}
