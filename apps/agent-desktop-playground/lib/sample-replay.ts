import fixture from "../fixtures/sample-snapshot.json"

import type { Envelope, SnapshotData, TreeNode } from "./types"

export const SAMPLE_APP = "playground-target"
export const SAMPLE_REF_NOTE = "@ssamplefixture:e1"
export const SAMPLE_REF_PING = "@ssamplefixture:e2"

export function sampleSnapshot(): SnapshotData {
  return structuredClone(fixture.data) as SnapshotData
}

function walk(node: TreeNode, visit: (node: TreeNode) => void) {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

export function replaySample(
  data: SnapshotData,
  action:
    | { op: "snapshot" }
    | { op: "type"; ref: string; text: string }
    | { op: "click"; ref: string },
): { envelope: Envelope; snapshot: SnapshotData } {
  if (action.op === "snapshot") {
    return {
      snapshot: data,
      envelope: {
        version: "2.6",
        ok: true,
        command: "snapshot",
        data,
      },
    }
  }

  const snapshot = structuredClone(data)
  if (action.op === "type") {
    let updated = false
    if (snapshot.tree) {
      walk(snapshot.tree, (node) => {
        if (node.ref_id === action.ref && node.role === "textfield") {
          node.value = action.text
          updated = true
        }
      })
    }
    if (!updated) {
      return {
        snapshot: data,
        envelope: {
          version: "2.6",
          ok: false,
          command: "type",
          error: {
            code: "SAMPLE_ONLY",
            message: `Sample replay only types into ${SAMPLE_REF_NOTE} (Note).`,
          },
        },
      }
    }
    return {
      snapshot,
      envelope: {
        version: "2.6",
        ok: true,
        command: "type",
        data: {
          action: "type",
          disposition: { delivery: "sample_replay", retry: "safe" },
          post_state: { role: "textfield", value: action.text },
          sample: true,
        },
      },
    }
  }

  let note = ""
  let clicked = false
  if (snapshot.tree) {
    walk(snapshot.tree, (node) => {
      if (node.ref_id === SAMPLE_REF_NOTE && typeof node.value === "string") {
        note = node.value
      }
      if (node.ref_id === action.ref && node.role === "button" && node.name === "Ping") {
        clicked = true
      }
    })
    if (clicked) {
      walk(snapshot.tree, (node) => {
        if (node.role === "statictext") {
          node.name = note ? `Pong: ${note}` : "Pong"
        }
      })
    }
  }
  if (!clicked) {
    return {
      snapshot: data,
      envelope: {
        version: "2.6",
        ok: false,
        command: "click",
        error: {
          code: "SAMPLE_ONLY",
          message: `Sample replay only clicks ${SAMPLE_REF_PING} (Ping).`,
        },
      },
    }
  }
  return {
    snapshot,
    envelope: {
      version: "2.6",
      ok: true,
      command: "click",
      data: {
        action: "click",
        disposition: { delivery: "sample_replay", retry: "safe" },
        sample: true,
      },
    },
  }
}
