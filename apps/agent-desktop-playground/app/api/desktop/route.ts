import path from "node:path"

import { NextResponse } from "next/server"

import { buildCommand, runAgentDesktop } from "@/lib/agent-desktop"
import type { LiveOp } from "@/lib/types"
import {
  assertAppName,
  assertRef,
  assertText,
  assertWindowId,
} from "@/lib/validate"

function bad(message: string) {
  return NextResponse.json(
    {
      ok: false,
      command: "playground",
      error: { code: "INVALID_ARGS", message },
    },
    { status: 400 },
  )
}

function bundledTarget(): string {
  return path.join(process.cwd(), "target", "playground-target.py")
}

function parseOp(body: unknown): LiveOp {
  if (!body || typeof body !== "object") {
    throw new Error("Expected a JSON object.")
  }
  const record = body as Record<string, unknown>
  const op = record.op
  if (op === "status" || op === "list-apps") return { op }
  if (op === "list-windows") {
    if (typeof record.app !== "string") throw new Error("list-windows needs an app name.")
    return { op, app: assertAppName(record.app) }
  }
  if (op === "launch") {
    if (record.bundled === true) return { op, target: bundledTarget() }
    if (typeof record.app !== "string") throw new Error("launch needs an app name.")
    return { op, target: assertAppName(record.app) }
  }
  if (op === "snapshot") {
    if (typeof record.app !== "string") throw new Error("snapshot needs an app name.")
    const windowId =
      typeof record.windowId === "string" && record.windowId.length > 0
        ? assertWindowId(record.windowId)
        : undefined
    return {
      op,
      app: assertAppName(record.app),
      windowId,
      compact: record.compact !== false,
      interactiveOnly: record.interactiveOnly === true,
    }
  }
  if (op === "click") {
    if (typeof record.ref !== "string") throw new Error("click needs a ref.")
    return { op, ref: assertRef(record.ref) }
  }
  if (op === "type") {
    if (typeof record.ref !== "string") throw new Error("type needs a ref.")
    if (typeof record.text !== "string") throw new Error("type needs text.")
    return { op, ref: assertRef(record.ref), text: assertText(record.text) }
  }
  throw new Error("Unknown op.")
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return bad("Expected JSON.")
  }

  let op: LiveOp
  try {
    op = parseOp(body)
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Invalid request.")
  }

  try {
    const { envelope } = await runAgentDesktop(buildCommand(op))
    return NextResponse.json(envelope)
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent-desktop failed."
    return NextResponse.json(
      {
        ok: false,
        command: op.op,
        error: { code: "RUNNER", message },
      },
      { status: 500 },
    )
  }
}
