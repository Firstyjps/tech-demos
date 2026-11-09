import { spawn } from "node:child_process"
import path from "node:path"

import { resolveDesktopEnv } from "./desktop-env"
import type { Envelope, LiveOp } from "./types"

export type CommandSpec = {
  args: string[]
  timeoutMs: number
}

export function buildCommand(input: LiveOp): CommandSpec {
  switch (input.op) {
    case "status":
      return { args: ["status"], timeoutMs: 8_000 }
    case "list-apps":
      return { args: ["list-apps"], timeoutMs: 8_000 }
    case "list-windows":
      return {
        args: ["list-windows", "--app", input.app],
        timeoutMs: 8_000,
      }
    case "launch":
      return {
        args: ["launch", input.target, "--activate", "--timeout", "20000"],
        timeoutMs: 25_000,
      }
    case "snapshot": {
      const args = ["snapshot", "--app", input.app, "--timeout-ms", "8000"]
      if (input.windowId) args.push("--window-id", input.windowId)
      if (input.compact) args.push("--compact")
      if (input.interactiveOnly) args.push("--interactive-only")
      return { args, timeoutMs: 15_000 }
    }
    case "click":
      return { args: ["click", input.ref], timeoutMs: 12_000 }
    case "type":
      return { args: ["type", input.ref, input.text], timeoutMs: 15_000 }
  }
}

export function cliPath(cwd = process.cwd()): string {
  return path.join(cwd, "node_modules", ".bin", "agent-desktop")
}

export function parseEnvelope(stdout: string): Envelope {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
  const last = lines.at(-1)
  if (!last) {
    throw new Error("agent-desktop did not print a JSON envelope.")
  }
  const parsed: unknown = JSON.parse(last)
  if (!parsed || typeof parsed !== "object" || !("ok" in parsed)) {
    throw new Error("agent-desktop printed JSON that is not an envelope.")
  }
  return parsed as Envelope
}

export function runAgentDesktop(
  spec: CommandSpec,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ envelope: Envelope; stderr: string }> {
  const cwd = options?.cwd ?? process.cwd()
  const env = options?.env ?? resolveDesktopEnv()
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath(cwd), spec.args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error(`agent-desktop timed out after ${spec.timeoutMs}ms.`))
    }, spec.timeoutMs)
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("close", () => {
      clearTimeout(timer)
      try {
        resolve({ envelope: parseEnvelope(stdout), stderr })
      } catch (error) {
        const detail = stderr.trim().slice(0, 500)
        reject(
          new Error(
            detail
              ? `${error instanceof Error ? error.message : "Bad envelope"} ${detail}`
              : error instanceof Error
                ? error.message
                : "Bad envelope",
          ),
        )
      }
    })
  })
}
