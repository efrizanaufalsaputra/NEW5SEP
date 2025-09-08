"use client"

import type React from "react"
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect, type ReactNode } from "react"
import type { User, Report, TaskAssignment, ReportStatus } from "../types"
import { useRealtime } from "../../hooks/useRealtime"
import { trackingToasts } from "../../lib/toast"
import { supabase } from "../../lib/supabaseClient"

interface AppState {
  currentUser: User | null
  users: User[]
  reports: Report[]
  isAuthenticated: boolean
  isConnected: boolean
  lastSyncTime: string | null
}

type AppAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "DELETE_USER"; payload: string }
  | { type: "ADD_REPORT"; payload: Report }
  | { type: "UPDATE_REPORT"; payload: Report }
  | { type: "DELETE_REPORT"; payload: string }
  | { type: "REQUEST_REVISION"; payload: { reportId: string; staffName: string; revisionNotes: string } }
  | { type: "SET_CONNECTION_STATUS"; payload: boolean }
  | { type: "UPDATE_SYNC_TIME" }
  | { type: "SYNC_REPORT_FROM_REALTIME"; payload: Report }
  | { type: "SYNC_TASK_FROM_REALTIME"; payload: { reportId: string; assignment: TaskAssignment } }

const calculateReportProgress = (assignments: TaskAssignment[]): number => {
  if (!assignments || assignments.length === 0) return 0

  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed")
  return Math.round((completedAssignments.length / assignments.length) * 100)
}

const determineReportStatus = (assignments: TaskAssignment[]): string => {
  if (!assignments || assignments.length === 0) return "Dalam Proses"

  const completedCount = assignments.filter((assignment) => assignment.status === "completed").length
  const totalCount = assignments.length

  if (completedCount === 0) return "Dalam Proses"
  if (completedCount === totalCount) return "Selesai"
  return "Dalam Proses"
}

const STORAGE_KEY = "sitrack_app_state"

const loadInitialState = (): AppState => {
  if (typeof window !== "undefined") {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        const parsed = JSON.parse(savedState)
        return {
          ...parsed,
          users: parsed.users || [],
          reports: parsed.reports || [],
          currentUser: parsed.currentUser || null,
          isAuthenticated: parsed.isAuthenticated || false,
          isConnected: false,
          lastSyncTime: null,
        }
      }
    } catch (error) {
      console.error("Error loading saved state:", error)
    }
  }
  return {
    currentUser: null,
    users: [{ id: "admin1", name: "Administrator", password: "admin123", role: "Admin" }],
    reports: [
      {
        id: "RPT001",
        noSurat: "001/SDM/2025",
        hal: "Perpanjangan Kontrak PPPK",
        status: "in-progress",
        layanan: "Layanan Perpanjangan Hubungan Kerja PPPK",
        dari: "Bagian Kepegawaian",
        tanggalSurat: "2025-01-15",
        tanggalAgenda: "2025-01-16",
        originalFiles: [],
        assignments: [
          {
            id: "ASG001",
            staffName: "Roza Erlinda",
            todoList: ["Jadwalkan/Agendakan", "Bahas dengan saya", "Untuk ditindaklanjuti"],
            completedTasks: ["Jadwalkan/Agendakan"],
            progress: 33,
            status: "in-progress",
            notes: "Verifikasi dokumen SK PPPK dan perjanjian kerja",
            assignedAt: "2025-01-16T09:00:00.000Z",
          },
        ],
        assignedStaff: ["Roza Erlinda"],
        assignedCoordinators: ["Suwarti, S.H"],
        currentHolder: "Suwarti, S.H",
        progress: 33,
        workflow: [
          {
            id: "w1",
            action: "Dibuat oleh TU Staff",
            user: "TU Staff",
            timestamp: "2025-01-16T08:00:00.000Z",
            status: "completed",
          },
          {
            id: "w2",
            action: "Diteruskan ke Koordinator",
            user: "TU Staff",
            timestamp: "2025-01-16T08:30:00.000Z",
            status: "completed",
          },
          {
            id: "w3",
            action: "Staff ditugaskan: Roza Erlinda",
            user: "Suwarti, S.H",
            timestamp: "2025-01-16T09:00:00.000Z",
            status: "completed",
          },
        ],
      },
    ],
    isAuthenticated: false,
    isConnected: false,
    lastSyncTime: null,
  }
}

const saveStateToStorage = (state: AppState) => {
  if (typeof window !== "undefined") {
    try {
      const stateToSave = {
        users: state.users,
        reports: state.reports,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (error) {
      console.error("Error saving state:", error)
    }
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  let newState: AppState

  switch (action.type) {
    case "LOGIN":
      const loginUser = {
        ...action.payload,
        name: action.payload.name || "User", // Fallback to "User" if name is missing, never show UUID
      }
      console.log("[v0] Setting currentUser in reducer:", loginUser)
      newState = {
        ...state,
        currentUser: loginUser,
        isAuthenticated: true,
      }
      break
    case "LOGOUT":
      newState = {
        ...state,
        currentUser: null,
        isAuthenticated: false,
      }
      break
    case "ADD_USER":
      const newUser = {
        ...action.payload,
        name: action.payload.name || "User", // Ensure name is never empty or UUID
      }

      // Check if user already exists to prevent duplicates
      const existingUserIndex = state.users.findIndex((u) => u.id === newUser.id)
      if (existingUserIndex >= 0) {
        // Update existing user instead of adding duplicate
        newState = {
          ...state,
          users: state.users.map((user) => (user.id === newUser.id ? newUser : user)),
        }
      } else {
        newState = {
          ...state,
          users: [...state.users, newUser],
        }
      }
      break
    case "UPDATE_USER":
      const updatedUser = {
        ...action.payload,
        name: action.payload.name || "User", // Ensure name is never empty or UUID
      }
      newState = {
        ...state,
        users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
        currentUser: state.currentUser?.id === updatedUser.id ? updatedUser : state.currentUser,
      }
      break
    case "DELETE_USER":
      newState = {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      }
      break
    case "ADD_REPORT":
      newState = {
        ...state,
        reports: [...state.reports, action.payload],
      }
      break
    case "UPDATE_REPORT":
      const updatedReport = {
        ...action.payload,
        progress: calculateReportProgress(action.payload.assignments),
        status: determineReportStatus(action.payload.assignments) as ReportStatus,
      }

      newState = {
        ...state,
        reports: state.reports.map((report) => (report.id === updatedReport.id ? updatedReport : report)),
      }
      break
    case "DELETE_REPORT":
      newState = {
        ...state,
        reports: state.reports.filter((report) => report.id !== action.payload),
      }
      break
    case "REQUEST_REVISION":
      newState = {
        ...state,
        reports: state.reports.map((report) => {
          if (report.id === action.payload.reportId) {
            const updatedAssignments = report.assignments.map((assignment) => {
              if (assignment.staffName === action.payload.staffName) {
                return {
                  ...assignment,
                  status: "revision-requested" as const,
                  revisionNotes: action.payload.revisionNotes,
                  revisionRequestedAt: new Date().toISOString(),
                }
              }
              return assignment
            })

            return {
              ...report,
              assignments: updatedAssignments,
              workflow: [
                ...report.workflow,
                {
                  id: `w${report.workflow.length + 1}`,
                  action: `Revisi diminta untuk ${action.payload.staffName}`,
                  user: state.currentUser?.name || "Koordinator",
                  timestamp: new Date().toISOString(),
                  status: "completed",
                },
              ],
            }
          }
          return report
        }),
      }
      break
    case "SET_CONNECTION_STATUS":
      newState = {
        ...state,
        isConnected: action.payload,
      }
      break
    case "UPDATE_SYNC_TIME":
      newState = {
        ...state,
        lastSyncTime: new Date().toISOString(),
      }
      break
    case "SYNC_REPORT_FROM_REALTIME":
      const syncedReport = {
        ...action.payload,
        progress: calculateReportProgress(action.payload.assignments),
        status: determineReportStatus(action.payload.assignments) as ReportStatus,
      }

      const existingReportIndex = state.reports.findIndex((r) => r.id === syncedReport.id)
      if (existingReportIndex >= 0) {
        newState = {
          ...state,
          reports: state.reports.map((report) => (report.id === syncedReport.id ? syncedReport : report)),
          lastSyncTime: new Date().toISOString(),
        }
      } else {
        newState = {
          ...state,
          reports: [...state.reports, syncedReport],
          lastSyncTime: new Date().toISOString(),
        }
      }
      break
    case "SYNC_TASK_FROM_REALTIME":
      newState = {
        ...state,
        reports: state.reports.map((report) => {
          if (report.id === action.payload.reportId) {
            const updatedAssignments = report.assignments.map((assignment) =>
              assignment.id === action.payload.assignment.id ? action.payload.assignment : assignment,
            )

            const updatedReport = {
              ...report,
              assignments: updatedAssignments,
              progress: calculateReportProgress(updatedAssignments),
              status: determineReportStatus(updatedAssignments) as ReportStatus,
            }

            return updatedReport
          }
          return report
        }),
        lastSyncTime: new Date().toISOString(),
      }
      break
    default:
      newState = state
  }

  saveStateToStorage(newState)
  return newState
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
  calculateProgress: (assignments: TaskAssignment[]) => number
  getReportStatus: (assignments: TaskAssignment[]) => string
  requestRevision?: (reportId: string, staffName: string, revisionNotes: string) => void
} | null>(null)

export { AppContext }

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, loadInitialState())

  const realtimeCallbacks = useMemo(
    () => ({
      reports: {
        onInsert: (payload) => {
          dispatch({ type: "SYNC_REPORT_FROM_REALTIME", payload: payload.new })
          trackingToasts.reportCreated()
        },
        onUpdate: (payload) => {
          dispatch({ type: "SYNC_REPORT_FROM_REALTIME", payload: payload.new })
          trackingToasts.workflowUpdated()
        },
        onDelete: (payload) => {
          dispatch({ type: "DELETE_REPORT", payload: payload.old.id })
        },
      },
      file_attachments: {
        onInsert: (payload) => {
          trackingToasts.fileUploaded()
          dispatch({ type: "UPDATE_SYNC_TIME" })
        },
        onUpdate: (payload) => {
          dispatch({ type: "UPDATE_SYNC_TIME" })
        },
        onDelete: (payload) => {
          dispatch({ type: "UPDATE_SYNC_TIME" })
        },
      },
      letter_tracking: {
        onInsert: (payload) => {
          trackingToasts.workflowUpdated()
          dispatch({ type: "UPDATE_SYNC_TIME" })
        },
        onUpdate: (payload) => {
          dispatch({ type: "UPDATE_SYNC_TIME" })
        },
      },
      profiles: {
        onInsert: (payload) => {
          // Handle new user creation
          const profileUser = {
            id: payload.new.id,
            name: payload.new.name || "User", // Always use name from profiles, never UUID
            role: payload.new.role,
            password: "", // Profiles from Supabase don't have passwords in local state
          }
          console.log("[v0] Adding user from profile realtime:", profileUser)
          dispatch({ type: "ADD_USER", payload: profileUser })
        },
        onUpdate: (payload) => {
          // Handle user updates
          const updatedProfileUser = {
            id: payload.new.id,
            name: payload.new.name || "User", // Always use name from profiles, never UUID
            role: payload.new.role,
            password: "", // Profiles from Supabase don't have passwords in local state
          }
          console.log("[v0] Updating user from profile realtime:", updatedProfileUser)
          dispatch({ type: "UPDATE_USER", payload: updatedProfileUser })
        },
        onDelete: (payload) => {
          console.log("[v0] Deleting user from profile realtime:", payload.old.id)
          dispatch({ type: "DELETE_USER", payload: payload.old.id })
        },
      },
    }),
    [],
  )

  const { isConnected, lastSync } = useRealtime(
    state.isAuthenticated ? ["reports", "file_attachments", "letter_tracking", "profiles"] : [],
    realtimeCallbacks,
  )

  useEffect(() => {
    dispatch({ type: "SET_CONNECTION_STATUS", payload: isConnected })
    if (lastSync) {
      dispatch({ type: "UPDATE_SYNC_TIME" })
    }
  }, [isConnected, lastSync])

  useEffect(() => {
    if (!state.isAuthenticated) return

    const loadInitialData = async () => {
      try {
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })

        if (reportsError) {
          console.error("Error loading reports:", reportsError)
        } else if (reports) {
          reports.forEach((report) => {
            dispatch({ type: "SYNC_REPORT_FROM_REALTIME", payload: report })
          })
        }

        try {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, name, role, created_at")
            .order("created_at", { ascending: false })

          if (profilesError) {
            console.error("Error loading profiles:", profilesError)
          } else if (profiles) {
            console.log("[v0] Loading profiles from Supabase:", profiles)
            profiles.forEach((profile) => {
              const profileUser = {
                id: profile.id,
                name: profile.name || "User", // Always use name from profiles, never UUID
                role: profile.role,
                password: "", // Profiles from Supabase don't have passwords
              }
              dispatch({ type: "ADD_USER", payload: profileUser })
            })
          }
        } catch (profileError) {
          console.error("Profiles query failed, continuing without sync:", profileError)
        }

        trackingToasts.syncSuccess()
      } catch (error) {
        console.error("Error loading initial data:", error)
        trackingToasts.connectionError()
      }
    }

    loadInitialData()
  }, [state.isAuthenticated])

  const requestRevision = useCallback((reportId: string, staffName: string, revisionNotes: string) => {
    dispatch({
      type: "REQUEST_REVISION",
      payload: { reportId, staffName, revisionNotes },
    })
    trackingToasts.revisionRequested()
  }, [])

  const enhancedState = useMemo(
    () => ({
      ...state,
      reports: state.reports.map((report) => ({
        ...report,
        progress: calculateReportProgress(report.assignments),
        status: determineReportStatus(report.assignments) as ReportStatus,
      })),
    }),
    [state],
  )

  const contextValue = useMemo(
    () => ({
      state: enhancedState,
      dispatch,
      calculateProgress: calculateReportProgress,
      getReportStatus: determineReportStatus,
      requestRevision,
    }),
    [enhancedState, requestRevision],
  )

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
