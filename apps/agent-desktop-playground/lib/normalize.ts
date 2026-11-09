import type { DesktopApp, DesktopWindow, SnapshotData, TreeNode } from "./types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function asApps(data: unknown): DesktopApp[] {
  if (!isRecord(data) || !Array.isArray(data.apps)) return []
  return data.apps.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string") return []
    return [
      {
        name: item.name,
        pid: typeof item.pid === "number" ? item.pid : undefined,
        bundle_id: typeof item.bundle_id === "string" ? item.bundle_id : undefined,
        presentation:
          typeof item.presentation === "string" ? item.presentation : undefined,
      },
    ]
  })
}

export function asWindows(data: unknown): DesktopWindow[] {
  const rows = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.windows)
      ? data.windows
      : []
  return rows.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string") return []
    return [
      {
        id: item.id,
        title: typeof item.title === "string" ? item.title : undefined,
        app_name: typeof item.app_name === "string" ? item.app_name : undefined,
        is_focused: typeof item.is_focused === "boolean" ? item.is_focused : undefined,
        visible: typeof item.visible === "boolean" ? item.visible : undefined,
        pid: typeof item.pid === "number" ? item.pid : undefined,
      },
    ]
  })
}

export function asSnapshot(data: unknown): SnapshotData | undefined {
  if (!isRecord(data) || !isRecord(data.tree) || typeof data.tree.role !== "string") {
    return undefined
  }
  return data as SnapshotData
}

export function nodeMatches(node: TreeNode, query: string): boolean {
  const haystack = [node.role, node.name, node.ref_id, node.value]
    .filter((part) => part != null && part !== "")
    .join(" ")
    .toLowerCase()
  return haystack.includes(query)
}
