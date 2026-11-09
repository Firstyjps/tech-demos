import { describe, expect, test } from "bun:test"

import {
  replaySample,
  sampleSnapshot,
  SAMPLE_REF_NOTE,
  SAMPLE_REF_PING,
} from "./sample-replay"

describe("sample replay", () => {
  test("types into Note and click updates the status label", () => {
    const typed = replaySample(sampleSnapshot(), {
      op: "type",
      ref: SAMPLE_REF_NOTE,
      text: "hello",
    })
    expect(typed.envelope.ok).toBe(true)
    expect(typed.envelope.data).toMatchObject({ sample: true })
    const clicked = replaySample(typed.snapshot, {
      op: "click",
      ref: SAMPLE_REF_PING,
    })
    expect(clicked.envelope.ok).toBe(true)
    const names: string[] = []
    const visit = (node: { name?: string; children?: { name?: string; children?: never[] }[] }) => {
      if (node.name) names.push(node.name)
      for (const child of node.children ?? []) visit(child)
    }
    visit(clicked.snapshot.tree!)
    expect(names).toContain("Pong: hello")
  })

  test("refuses a ref the fixture does not act on", () => {
    const result = replaySample(sampleSnapshot(), {
      op: "click",
      ref: "@ssamplefixture:e9",
    })
    expect(result.envelope.ok).toBe(false)
    expect(result.envelope.error?.code).toBe("SAMPLE_ONLY")
    expect(result.snapshot.tree).toEqual(sampleSnapshot().tree)
  })
})
