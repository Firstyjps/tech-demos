import { describe, expect, test } from "bun:test"

import {
  parseSessionBusFile,
  resolveDesktopEnv,
  selectSessionBus,
} from "./desktop-env"

const FILE = `
# display :1 to find the D-Bus session bus
DBUS_SESSION_BUS_ADDRESS='unix:path=/tmp/dbus-example,guid=abc'
DBUS_SESSION_BUS_PID=1
`

describe("parseSessionBusFile", () => {
  test("reads the address and display hint", () => {
    expect(parseSessionBusFile(FILE)).toEqual({
      address: "unix:path=/tmp/dbus-example,guid=abc",
      displayHint: ":1",
    })
  })

  test("ignores autolaunch", () => {
    expect(parseSessionBusFile("DBUS_SESSION_BUS_ADDRESS=autolaunch:\n")).toEqual({
      address: undefined,
      displayHint: undefined,
    })
  })
})

describe("resolveDesktopEnv", () => {
  test("fills a missing bus from the session file when the socket exists", () => {
    const env = resolveDesktopEnv(
      { DISPLAY: ":1", PATH: "/usr/bin" },
      [{ name: "machine-1", text: FILE.replace("/tmp/dbus-example", "/tmp") }],
    )
    expect(env.DISPLAY).toBe(":1")
    expect(env.DBUS_SESSION_BUS_ADDRESS).toContain("unix:path=/tmp")
    expect(env.PATH).toBe("/usr/bin")
  })

  test("keeps an explicit bus address", () => {
    const env = resolveDesktopEnv(
      { DISPLAY: ":1", DBUS_SESSION_BUS_ADDRESS: "unix:path=/already" },
      [{ name: "machine-1", text: FILE }],
    )
    expect(env.DBUS_SESSION_BUS_ADDRESS).toBe("unix:path=/already")
  })
})

describe("selectSessionBus", () => {
  test("skips a socket that is not there", () => {
    expect(
      selectSessionBus(
        [{ name: "gone", text: "DBUS_SESSION_BUS_ADDRESS='unix:path=/no/such/socket,guid=a'\n" }],
        ":1",
      ),
    ).toBeUndefined()
  })
})
