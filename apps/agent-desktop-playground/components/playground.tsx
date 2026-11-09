"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { TreeView } from "@/components/tree-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { asApps, asSnapshot, asWindows } from "@/lib/normalize"
import {
  replaySample,
  sampleSnapshot,
  SAMPLE_APP,
} from "@/lib/sample-replay"
import type { DesktopApp, DesktopWindow, Envelope, SnapshotData, TreeNode } from "@/lib/types"

type Mode = "live" | "sample"

type LogEntry = {
  id: number
  at: string
  mode: Mode
  envelope: Envelope
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function findNode(node: TreeNode | undefined, ref: string | undefined): TreeNode | undefined {
  if (!node || !ref) return undefined
  if (node.ref_id === ref) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, ref)
    if (found) return found
  }
  return undefined
}

function findByIdentity(
  node: TreeNode | undefined,
  role: string,
  name: string | undefined,
): TreeNode | undefined {
  if (!node) return undefined
  if (node.role === role && node.name === name && node.ref_id) return node
  for (const child of node.children ?? []) {
    const found = findByIdentity(child, role, name)
    if (found) return found
  }
  return undefined
}

function statusLine(envelope: Envelope | undefined): string {
  if (!envelope) return "Status has not been read."
  if (!envelope.ok) {
    return envelope.error?.message ?? "status failed"
  }
  if (!isRecord(envelope.data)) return "Status returned no data."
  const platform = typeof envelope.data.platform === "string" ? envelope.data.platform : "unknown"
  const permissions = isRecord(envelope.data.permissions) ? envelope.data.permissions : undefined
  const accessibility = permissions && isRecord(permissions.accessibility) ? permissions.accessibility : undefined
  const state = accessibility && typeof accessibility.state === "string" ? accessibility.state : "unknown"
  const surfaces = Array.isArray(envelope.data.supported_surfaces)
    ? envelope.data.supported_surfaces.filter((item) => typeof item === "string").join(", ")
    : ""
  return `${platform} · accessibility ${state}${surfaces ? ` · ${surfaces}` : ""}`
}

export function Playground() {
  const [mode, setMode] = useState<Mode>("live")
  const [status, setStatus] = useState<Envelope>()
  const [apps, setApps] = useState<DesktopApp[]>([])
  const [windows, setWindows] = useState<DesktopWindow[]>([])
  const [appName, setAppName] = useState("")
  const [windowId, setWindowId] = useState("")
  const [launchName, setLaunchName] = useState("mousepad")
  const [compact, setCompact] = useState(true)
  const [interactiveOnly, setInteractiveOnly] = useState(false)
  const [snapshot, setSnapshot] = useState<SnapshotData>()
  const [selectedRef, setSelectedRef] = useState<string>()
  const [query, setQuery] = useState("")
  const [text, setText] = useState("hello from agent-desktop")
  const [log, setLog] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string>()
  const modeRef = useRef<Mode>("live")

  const selected = useMemo(
    () => findNode(snapshot?.tree, selectedRef),
    [snapshot, selectedRef],
  )

  const pushLog = useCallback((entryMode: Mode, envelope: Envelope) => {
    setLog((current) => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        at: new Date().toLocaleTimeString(),
        mode: entryMode,
        envelope,
      },
      ...current,
    ].slice(0, 30))
  }, [])

  const callLive = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch("/api/desktop", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const envelope = (await response.json()) as Envelope
    return envelope
  }, [])

  const applyLiveLists = useCallback(
    (statusEnvelope: Envelope, appsEnvelope: Envelope) => {
      setStatus(statusEnvelope)
      pushLog("live", statusEnvelope)
      pushLog("live", appsEnvelope)
      setApps(asApps(appsEnvelope.data))
      if (!statusEnvelope.ok) {
        setBanner(statusEnvelope.error?.suggestion ?? statusEnvelope.error?.message)
      }
    },
    [pushLog],
  )

  const refreshLive = useCallback(async () => {
    setBusy(true)
    setBanner(undefined)
    try {
      const statusEnvelope = await callLive({ op: "status" })
      const appsEnvelope = await callLive({ op: "list-apps" })
      if (modeRef.current !== "live") return
      applyLiveLists(statusEnvelope, appsEnvelope)
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Request failed.")
    } finally {
      setBusy(false)
    }
  }, [applyLiveLists, callLive])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const statusEnvelope = await callLive({ op: "status" })
        const appsEnvelope = await callLive({ op: "list-apps" })
        if (cancelled || modeRef.current !== "live") return
        applyLiveLists(statusEnvelope, appsEnvelope)
      } catch (error) {
        if (cancelled || modeRef.current !== "live") return
        setBanner(error instanceof Error ? error.message : "Request failed.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyLiveLists, callLive])

  function showSample() {
    modeRef.current = "sample"
    const initial = sampleSnapshot()
    setMode("sample")
    setSnapshot(initial)
    setAppName(SAMPLE_APP)
    setWindows([
      {
        id: initial.window?.id ?? "sample-window",
        title: initial.window?.title ?? "Playground Target",
      },
    ])
    setWindowId(initial.window?.id ?? "sample-window")
    setApps([{ name: SAMPLE_APP, presentation: "fixture" }])
    setStatus(undefined)
    setSelectedRef(undefined)
    setBanner(undefined)
  }

  function showLive() {
    modeRef.current = "live"
    setMode("live")
    void refreshLive()
  }

  async function loadWindows(name: string) {
    setAppName(name)
    setWindowId("")
    setWindows([])
    if (mode === "sample") return
    const envelope = await callLive({ op: "list-windows", app: name })
    pushLog("live", envelope)
    const rows = asWindows(envelope.data)
    setWindows(rows)
    const focused = rows.find((row) => row.is_focused) ?? rows[0]
    if (focused) setWindowId(focused.id)
  }

  function rememberSnapshot(envelope: Envelope, entryMode: Mode) {
    pushLog(entryMode, envelope)
    const data = asSnapshot(envelope.data)
    if (data) {
      setSnapshot(data)
      if (selectedRef && findNode(data.tree, selectedRef)) {
        setSelectedRef(selectedRef)
      } else if (selected?.ref_id) {
        setSelectedRef(findByIdentity(data.tree, selected.role, selected.name)?.ref_id)
      }
    }
    if (!envelope.ok) {
      setBanner(envelope.error?.suggestion ?? envelope.error?.message)
    } else {
      setBanner(undefined)
    }
  }

  async function takeSnapshot(name = appName, nextWindowId = windowId) {
    if (!name) {
      setBanner("Pick an app first.")
      return
    }
    setBusy(true)
    try {
      if (mode === "sample") {
        const result = replaySample(snapshot ?? sampleSnapshot(), { op: "snapshot" })
        rememberSnapshot(result.envelope, "sample")
        return
      }
      const envelope = await callLive({
        op: "snapshot",
        app: name,
        windowId: nextWindowId || undefined,
        compact,
        interactiveOnly,
      })
      rememberSnapshot(envelope, "live")
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Snapshot failed.")
    } finally {
      setBusy(false)
    }
  }

  async function launch(bundled: boolean) {
    setBusy(true)
    setBanner(undefined)
    try {
      if (mode === "sample") {
        setBanner("Sample replay does not launch apps. Switch to Live.")
        return
      }
      const envelope = await callLive(
        bundled ? { op: "launch", bundled: true } : { op: "launch", app: launchName },
      )
      pushLog("live", envelope)
      if (!envelope.ok) {
        setBanner(envelope.error?.suggestion ?? envelope.error?.message)
        return
      }
      const data = isRecord(envelope.data) ? envelope.data : {}
      const launched = typeof data.app === "string" ? data.app : ""
      const window = isRecord(data.window) ? data.window : undefined
      const launchedWindow = window && typeof window.id === "string" ? window.id : ""
      if (launched) {
        setAppName(launched)
        const listed = await callLive({ op: "list-apps" })
        setApps(asApps(listed.data))
        const windowsEnvelope = await callLive({ op: "list-windows", app: launched })
        const rows = asWindows(windowsEnvelope.data)
        setWindows(rows)
        setWindowId(launchedWindow || rows[0]?.id || "")
      }
      await takeSnapshot(launched || appName, launchedWindow)
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Launch failed.")
    } finally {
      setBusy(false)
    }
  }

  async function act(kind: "click" | "type") {
    if (!selectedRef) {
      setBanner("Select an element that has a ref.")
      return
    }
    setBusy(true)
    try {
      if (mode === "sample") {
        const current = snapshot ?? sampleSnapshot()
        const result =
          kind === "click"
            ? replaySample(current, { op: "click", ref: selectedRef })
            : replaySample(current, { op: "type", ref: selectedRef, text })
        setSnapshot(result.snapshot)
        pushLog("sample", result.envelope)
        if (!result.envelope.ok) {
          setBanner(result.envelope.error?.message)
        } else {
          setBanner(undefined)
        }
        return
      }
      const envelope =
        kind === "click"
          ? await callLive({ op: "click", ref: selectedRef })
          : await callLive({ op: "type", ref: selectedRef, text })
      pushLog("live", envelope)
      if (!envelope.ok) {
        setBanner(envelope.error?.suggestion ?? envelope.error?.message)
        return
      }
      setBanner(undefined)
      await takeSnapshot()
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  const actions = selected?.available_actions ?? []
  const canClick = Boolean(selected?.ref_id) && (actions.length === 0 || actions.includes("Click"))
  const canType =
    Boolean(selected?.ref_id) &&
    (actions.length === 0 || actions.includes("TypeText") || actions.includes("SetValue"))

  return (
    <div className="min-h-full bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Agent Desktop Playground</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Pick a running desktop app, snapshot its accessibility tree with the agent-desktop CLI, then click or type by ref.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "live" ? "default" : "outline"}
              onClick={showLive}
            >
              Live
            </Button>
            <Button
              variant={mode === "sample" ? "default" : "outline"}
              onClick={showSample}
            >
              Sample replay
            </Button>
          </div>
        </div>
      </header>

      {mode === "sample" ? (
        <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">
          Sample replay. This tree is a saved fixture of the bundled GTK target. agent-desktop is not called, and nothing on the desktop changes.
        </div>
      ) : null}

      {banner ? (
        <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {banner}
        </div>
      ) : null}

      <main className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Desktop</CardTitle>
            <CardDescription>
              {mode === "live" ? statusLine(status) : "Fixture only. Not a live session."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy || mode === "sample"} onClick={() => void refreshLive()}>
                Refresh
              </Button>
              <Button disabled={busy || mode === "sample"} onClick={() => void launch(true)}>
                Open GTK target
              </Button>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void launch(false)
              }}
            >
              <Label className="sr-only" htmlFor="launch-name">
                App to launch
              </Label>
              <Input
                id="launch-name"
                value={launchName}
                onChange={(event) => setLaunchName(event.target.value)}
                disabled={mode === "sample"}
              />
              <Button type="submit" variant="secondary" disabled={busy || mode === "sample"}>
                Launch
              </Button>
            </form>
            <Separator />
            <div className="flex max-h-64 flex-col gap-1 overflow-auto">
              {apps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No apps reported.</p>
              ) : (
                apps.map((app) => (
                  <button
                    key={`${app.name}-${app.pid ?? "sample"}`}
                    type="button"
                    onClick={() => void loadWindows(app.name)}
                    className={`rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                      app.name === appName ? "bg-muted ring-1 ring-foreground/15" : ""
                    }`}
                  >
                    <span className="font-medium">{app.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {app.presentation ?? ""}
                      {app.pid ? ` · ${app.pid}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
            {windows.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">Window</p>
                {windows.map((window) => (
                  <button
                    key={window.id}
                    type="button"
                    onClick={() => setWindowId(window.id)}
                    className={`truncate rounded-md px-2 py-1 text-left text-xs hover:bg-muted ${
                      window.id === windowId ? "bg-muted ring-1 ring-foreground/15" : ""
                    }`}
                  >
                    {window.title || window.id}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox
                id="compact"
                checked={compact}
                onCheckedChange={(checked) => setCompact(checked === true)}
                disabled={mode === "sample"}
              />
              <Label htmlFor="compact">Compact</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="interactive"
                checked={interactiveOnly}
                onCheckedChange={(checked) => setInteractiveOnly(checked === true)}
                disabled={mode === "sample"}
              />
              <Label htmlFor="interactive">Interactive only</Label>
            </div>
            <Button disabled={busy || !appName} onClick={() => void takeSnapshot()}>
              Snapshot
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Tree</CardTitle>
            <CardDescription>
              {snapshot
                ? `${snapshot.app ?? "app"} · ${snapshot.snapshot_id ?? "no id"} · ${snapshot.ref_count ?? "?"} refs${
                    snapshot.window?.title ? ` · ${snapshot.window.title}` : ""
                  }`
                : "No snapshot yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by role, name, or ref"
              aria-label="Filter the tree"
            />
            <ScrollArea className="h-[32rem] rounded-lg border">
              <div className="p-1">
                {snapshot?.tree ? (
                  <TreeView
                    node={snapshot.tree}
                    query={query}
                    selectedRef={selectedRef}
                    onSelect={(node) => setSelectedRef(node.ref_id)}
                  />
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">
                    Take a snapshot to browse refs.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Act by ref</CardTitle>
              <CardDescription>
                {selected?.ref_id ?? "Select a node with a ref."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="text-sm">
                <div>
                  {selected ? (
                    <>
                      <Badge variant="secondary">{selected.role}</Badge>{" "}
                      {selected.name || "unnamed"}
                    </>
                  ) : (
                    "Nothing selected."
                  )}
                </div>
                {selected?.value ? (
                  <p className="mt-1 text-muted-foreground">Value: {selected.value}</p>
                ) : null}
              </div>
              <Button disabled={busy || !canClick} onClick={() => void act("click")}>
                Click ref
              </Button>
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void act("type")
                }}
              >
                <Label htmlFor="type-text">Text</Label>
                <Textarea
                  id="type-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={busy || !canType}>
                  Type into ref
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action log</CardTitle>
              <CardDescription>JSON envelopes, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="flex flex-col gap-3 pr-3">
                  {log.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commands yet.</p>
                  ) : (
                    log.map((entry) => (
                      <div key={entry.id} className="text-xs">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-muted-foreground">{entry.at}</span>
                          <Badge variant={entry.mode === "sample" ? "outline" : "secondary"}>
                            {entry.mode === "sample" ? "Sample" : "Live"}
                          </Badge>
                          <Badge variant={entry.envelope.ok ? "default" : "destructive"}>
                            {entry.envelope.command ?? "result"}
                          </Badge>
                        </div>
                        <pre className="overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed">
                          {JSON.stringify(entry.envelope, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
