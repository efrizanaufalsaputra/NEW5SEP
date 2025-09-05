import { createClient } from "./client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export type RealtimeSubscription = {
  channel: RealtimeChannel
  unsubscribe: () => void
}

export function subscribeToReports(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const supabase = createClient()

  const channel = supabase
    .channel("reports_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (payload) => onInsert?.(payload))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, (payload) => onUpdate?.(payload))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "reports" }, (payload) => onDelete?.(payload))
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToTaskAssignments(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void,
): RealtimeSubscription {
  const supabase = createClient()

  const channel = supabase
    .channel("task_assignments_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_assignments" }, (payload) =>
      onInsert?.(payload),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "task_assignments" }, (payload) =>
      onUpdate?.(payload),
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "task_assignments" }, (payload) =>
      onDelete?.(payload),
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

export function subscribeToWorkflowHistory(
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
): RealtimeSubscription {
  const supabase = createClient()

  const channel = supabase
    .channel("workflow_history_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "workflow_history" }, (payload) =>
      onInsert?.(payload),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workflow_history" }, (payload) =>
      onUpdate?.(payload),
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}
