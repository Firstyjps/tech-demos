import { describe, expect, test } from "bun:test"

import { buildCommand } from "./agent-desktop"
import { assertAppName, assertRef, assertText, assertWindowId } from "./validate"

describe("assertRef", () => {
  test("accepts a qualified ref", () => {
    expect(assertRef(" @s26u7pv9qta5g4:e6 ")).toBe("@s26u7pv9qta5g4:e6")
  })

  test("rejects a bare ref", () => {
    expect(() => assertRef("@e6")).toThrow(/qualified/)
  })
})

describe("names", () => {
  test("accepts list-apps names", () => {
    expect(assertAppName("python3.12")).toBe("python3.12")
    expect(assertAppName("gnome-calculator")).toBe("gnome-calculator")
  })

  test("rejects shell syntax", () => {
    expect(() => assertAppName("mousepad;id")).toThrow()
    expect(() => assertAppName("../etc")).toThrow()
    expect(() => assertAppName("-rf")).toThrow()
  })

  test("accepts a window id", () => {
    expect(
      assertWindowId("w-1.53-org-a11y-atspi-accessible-4"),
    ).toBe("w-1.53-org-a11y-atspi-accessible-4")
  })
})

describe("buildCommand", () => {
  test("passes type text as one argument", () => {
    const spec = buildCommand({
      op: "type",
      ref: "@ssamplefixture:e1",
      text: "hello --from agent",
    })
    expect(spec.args).toEqual([
      "type",
      "@ssamplefixture:e1",
      "hello --from agent",
    ])
  })

  test("adds snapshot flags without a shell", () => {
    const spec = buildCommand({
      op: "snapshot",
      app: "python3.12",
      windowId: "w-1.53-org-a11y-atspi-accessible-4",
      compact: true,
      interactiveOnly: true,
    })
    expect(spec.args).toEqual([
      "snapshot",
      "--app",
      "python3.12",
      "--timeout-ms",
      "8000",
      "--window-id",
      "w-1.53-org-a11y-atspi-accessible-4",
      "--compact",
      "--interactive-only",
    ])
  })
})

describe("assertText", () => {
  test("rejects empty text", () => {
    expect(() => assertText("")).toThrow(/text/i)
  })
})
