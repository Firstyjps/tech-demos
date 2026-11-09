"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "cn"
import type { TreeNode } from "@/lib/types"
import { nodeMatches } from "@/lib/normalize"

export function TreeView({
  node,
  query,
  selectedRef,
  onSelect,
  depth = 0,
}: {
  node: TreeNode
  query: string
  selectedRef?: string
  onSelect: (node: TreeNode) => void
  depth?: number
}) {
  const needle = query.trim().toLowerCase()
  const visible =
    needle.length === 0 ||
    nodeMatches(node, needle) ||
    (node.children ?? []).some((child) => subtreeMatches(child, needle))
  if (!visible) return null

  const selected = node.ref_id != null && node.ref_id === selectedRef

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={cn(
          "flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left hover:bg-muted",
          selected && "bg-muted ring-1 ring-foreground/15",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <Badge variant="outline">{node.role}</Badge>
        <span className="min-w-0 flex-1 truncate">
          {node.name || "unnamed"}
          {node.value ? (
            <span className="text-muted-foreground"> · {node.value}</span>
          ) : null}
        </span>
        {node.ref_id ? (
          <code className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {node.ref_id}
          </code>
        ) : (
          <span className="shrink-0 text-[11px] text-muted-foreground">no ref</span>
        )}
      </button>
      {node.children?.map((child, index) => (
        <TreeView
          key={`${child.ref_id ?? child.role}-${index}`}
          node={child}
          query={query}
          selectedRef={selectedRef}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function subtreeMatches(node: TreeNode, needle: string): boolean {
  if (nodeMatches(node, needle)) return true
  return (node.children ?? []).some((child) => subtreeMatches(child, needle))
}
