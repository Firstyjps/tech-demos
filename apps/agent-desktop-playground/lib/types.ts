export type Envelope = {
  version?: string
  ok: boolean
  command?: string
  data?: unknown
  error?: {
    code?: string
    message?: string
    suggestion?: string
    details?: unknown
  }
}

export type TreeNode = {
  role: string
  ref_id?: string
  name?: string
  value?: string | null
  description?: string
  available_actions?: string[]
  children?: TreeNode[]
}

export type SnapshotData = {
  app?: string
  complete?: boolean
  ref_count?: number
  snapshot_id?: string
  window?: { id?: string; title?: string }
  tree?: TreeNode
}

export type DesktopApp = {
  name: string
  pid?: number
  bundle_id?: string
  presentation?: string
}

export type DesktopWindow = {
  id: string
  title?: string
  app_name?: string
  is_focused?: boolean
  visible?: boolean
  pid?: number
}

export type LiveOp =
  | { op: "status" }
  | { op: "list-apps" }
  | { op: "list-windows"; app: string }
  | { op: "launch"; target: string }
  | {
      op: "snapshot"
      app: string
      windowId?: string
      compact: boolean
      interactiveOnly: boolean
    }
  | { op: "click"; ref: string }
  | { op: "type"; ref: string; text: string }
