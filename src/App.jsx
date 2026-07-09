"use client"
import { useState, useRef, useEffect } from "react"
import { supabase } from "./supabase"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import {
  LayoutDashboard, TrendingUp, ClipboardCheck, UserCheck,
  CheckSquare, FileText, Trophy, Settings, User, Bell,
  Search, Moon, Sun, ChevronDown, ChevronRight, ChevronLeft,
  ArrowUpRight, ArrowDownRight, Mail, MessageSquare, Star,
  Shield, Clock, Activity, LogOut, Filter, Download, Plus,
  AlertCircle, CheckCircle, XCircle, Info, Target, BarChart2, X
} from "lucide-react"

// ─────────────────────────────────────────────
// AUTH — roles and permissions
// Demo users removed for production prototype.
// ─────────────────────────────────────────────
const MOCK_USERS = []

const ROLE_PERMISSIONS = {
  "HEAD": {
    pages:            ["dashboard","performance","qa-audits","attendance","tasks","reports","leaderboard","settings","profile"],
    canViewAllAgents: true,
  },
  "Team Lead": {
    pages:            ["dashboard","performance","qa-audits","attendance","tasks","reports","leaderboard","settings","profile"],
    canViewAllAgents: true,
  },
  "Agent": {
    pages:            ["dashboard","performance","qa-audits","attendance","tasks","leaderboard","profile"],
    canViewAllAgents: false,
  },
}

const canViewAllAgents = (role) => ROLE_PERMISSIONS[role]?.canViewAllAgents ?? false
const canAccessPage    = (role, pageKey) => ROLE_PERMISSIONS[role]?.pages?.includes(pageKey) ?? false

// ─────────────────────────────────────────────
// PLACEHOLDER DATA HOOKS
// All data lives here — swap for real API calls
// ─────────────────────────────────────────────

const useKPIData = () => ({
  overallKPI:  { value: 87.4, change: +3.2, unit: "%",  label: "Overall KPI"     },
  emails:      { value: 1243, change: -12,   unit: "",   label: "Emails Handled"  },
  chats:       { value: 876,  change: +54,   unit: "",   label: "Chats Handled"   },
  csat:        { value: 94,   change: +0.3,  unit: "%",  label: "CSAT Score"      },
  qa:          { value: 92.1, change: +1.8,  unit: "%",  label: "QA Score"        },
  attendance:  { value: 96.5, change: -0.5,  unit: "%",  label: "Productivity" },
})

const useChartData = () => {
  const weeklyPerformance = [
    { day: "Mon", emails: 240, chats: 180, qa: 88 },
    { day: "Tue", emails: 210, chats: 150, qa: 91 },
    { day: "Wed", emails: 280, chats: 220, qa: 87 },
    { day: "Thu", emails: 195, chats: 160, qa: 93 },
    { day: "Fri", emails: 320, chats: 245, qa: 89 },
    { day: "Sat", emails: 150, chats: 80,  qa: 95 },
    { day: "Sun", emails: 98,  chats: 41,  qa: 96 },
  ]
  const monthlyKPI = [
    { month: "Jan", kpi: 82, target: 85 },
    { month: "Feb", kpi: 79, target: 85 },
    { month: "Mar", kpi: 85, target: 85 },
    { month: "Apr", kpi: 88, target: 86 },
    { month: "May", kpi: 84, target: 86 },
    { month: "Jun", kpi: 87, target: 86 },
  ]
  const emailsVsChats = [
    { week: "W1", emails: 980,  chats: 640 },
    { week: "W2", emails: 1120, chats: 720 },
    { week: "W3", emails: 1050, chats: 700 },
    { week: "W4", emails: 1243, chats: 876 },
  ]
  const csatTrend = [
    { month: "Jan", csat: 84 }, { month: "Feb", csat: 86 },
    { month: "Mar", csat: 88 }, { month: "Apr", csat: 90 },
    { month: "May", csat: 88 }, { month: "Jun", csat: 94 },
  ]
  const qaTrend = [
    { month: "Jan", qa: 88 }, { month: "Feb", qa: 86 },
    { month: "Mar", qa: 89 }, { month: "Apr", qa: 91 },
    { month: "May", qa: 90 }, { month: "Jun", qa: 92 },
  ]
  return { weeklyPerformance, monthlyKPI, emailsVsChats, csatTrend, qaTrend }
}
// ─────────────────────────────────────────────
// LIVE API — Google Apps Script JSON endpoint
// ← Paste your deployed Web App URL here after deploying the Apps Script
// ─────────────────────────────────────────────
const LIVE_API_URL = "https://script.google.com/macros/s/AKfycbweaIU0QI81Uk6H_T-Zwl-8DmkPk2EaBNkdP601uffYWmHW4bBh5RT_ea8SgTE7cpi6TQ/exec"

/** Convert a 2-D sheet array (first row = headers) into plain objects */
const sheetToObjects = (arr) => {
  if (!Array.isArray(arr) || arr.length < 2) return []
  const headers = arr[0]
  return arr.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
  )
}

/**
 * Help Scout CSAT formula: CSAT% = (Great ÷ Total Ratings) × 100
 * Total = Great + Okay + Bad  (only rated responses count)
 *
 * csatIsGreat  — true if the rating is "Great"
 * csatIsValid  — true if it is any recognised response (Great / Okay / Bad / numeric)
 * csatCompute  — given an array of raw rating strings → returns CSAT %
 * csatToNum    — legacy shim: 1 if valid, 0 if not (used as a truthy gate)
 */
const csatIsGreat = (val) => {
  const v = (val ?? "").toString().trim().toLowerCase()
  if (v === "great") return true
  const n = parseFloat(v)
  // Numeric: treat ≥ 4/5 (≥ 80%) as "great"
  if (!isNaN(n) && n > 0) return (n <= 5 ? Math.round(n * 20) : n) >= 80
  return false
}
const csatIsValid = (val) => {
  const v = (val ?? "").toString().trim().toLowerCase()
  if (v === "great" || v === "okay" || v === "bad") return true
  const n = parseFloat(v)
  return !isNaN(n) && n > 0
}
const csatCompute = (ratings) => {
  const valid = ratings.filter(csatIsValid)
  if (!valid.length) return 0
  return +(valid.filter(csatIsGreat).length / valid.length * 100).toFixed(1)
}
const csatToNum = (val) => csatIsValid(val) ? 1 : 0

const useLiveData = () => {
  const [tickets, setTickets] = useState(null)
  const [csat,    setCsat]    = useState(null)
  const [agents,  setAgents]  = useState(null)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(false)
  useEffect(() => {
    fetch(LIVE_API_URL)
      .then(r => r.json())
      .then(json => {
        const t = sheetToObjects(json.tickets ?? [])
        const c = sheetToObjects(json.csat    ?? [])
        const a = sheetToObjects(json.agents  ?? [])
        if (import.meta.env.DEV) {
          console.log("[CSPMS Live] tickets:", t.length, "| csat:", c.length, "| agents:", a.length)
        }
        setTickets(t); setCsat(c); setAgents(a); setLoaded(true)
      })
      .catch(err => {
        console.warn("[CSPMS Live] API failed — using mock data.", err)
        setError(true); setLoaded(true)
      })
  }, [])
  return { tickets, csat, agents, loaded, error }
}
const useTableData = () => {
  const recentActivities = [
    { id: 1, agent: "Muhammad Junaid",  action: "Completed QA Audit",       score: 94,   time: "10 min ago", status: "success", date: "2026-06-29", channel: "email" },
    { id: 2, agent: "Anum Aziz",        action: "Handled Chat Session",     score: null, time: "25 min ago", status: "info",    date: "2026-06-29", channel: "chat"  },
    { id: 3, agent: "Sufiyan Merchant", action: "Email Response",           score: null, time: "1h ago",     status: "info",    date: "2026-06-29", channel: "email" },
    { id: 4, agent: "Adeel Hyder",      action: "Late Check-in",            score: null, time: "2h ago",     status: "warning", date: "2026-06-29", channel: "email" },
    { id: 5, agent: "Anum Aziz",        action: "QA Audit Below Threshold", score: 62,   time: "3h ago",     status: "error",   date: "2026-06-28", channel: "chat"  },
  ]
  const latestAudits = [
    { id: 1, agent: "Muhammad Junaid",  auditor: "Admin User", score: 94, type: "Email", date: "2026-06-29", status: "Pass" },
    { id: 2, agent: "Anum Aziz",        auditor: "Admin User", score: 88, type: "Chat",  date: "2026-06-29", status: "Pass" },
    { id: 3, agent: "Sufiyan Merchant", auditor: "Admin User", score: 62, type: "Email", date: "2026-06-28", status: "Fail" },
    { id: 4, agent: "Adeel Hyder",      auditor: "Admin User", score: 91, type: "Chat",  date: "2026-06-28", status: "Pass" },
    { id: 5, agent: "Muhammad Junaid",  auditor: "Admin User", score: 76, type: "Email", date: "2026-06-27", status: "Pass" },
  ]
  const leaderboard = [
    { rank: 1, agent: "Muhammad Junaid",  kpi: 87.4, emails: 112, chats: 14, csat: 96, qa: 94, date: "2026-06-29" },
    { rank: 2, agent: "Anum Aziz",        kpi: 82.1, emails: 98,  chats: 11, csat: 94, qa: 88, date: "2026-06-29" },
    { rank: 3, agent: "Sufiyan Merchant", kpi: 79.6, emails: 105, chats: 12, csat: 92, qa: 85, date: "2026-06-29" },
    { rank: 4, agent: "Adeel Hyder",      kpi: 74.3, emails: 88,  chats:  9, csat: 90, qa: 80, date: "2026-06-29" },
  ]
  const pendingTasks = [
    { id: 1, title: "Review June QA Reports",        assignee: "Admin User",       due: "2026-06-30", priority: "High",   status: "Pending",     date: "2026-06-29" },
    { id: 2, title: "Update Attendance Policy",      assignee: "Admin User",       due: "2026-07-01", priority: "Medium", status: "Pending",     date: "2026-06-29" },
    { id: 3, title: "Coaching Session — Adeel",      assignee: "Admin User",       due: "2026-06-30", priority: "High",   status: "In Progress", date: "2026-06-28" },
    { id: 4, title: "Q2 Performance Report",         assignee: "Admin User",       due: "2026-07-05", priority: "Low",    status: "In Progress", date: "2026-06-27" },
    { id: 5, title: "CSAT Survey Analysis",          assignee: "Muhammad Junaid",  due: "2026-07-03", priority: "Medium", status: "Completed",   date: "2026-06-25" },
    { id: 6, title: "QA Template Update",            assignee: "Anum Aziz",        due: "2026-06-30", priority: "High",   status: "Completed",   date: "2026-06-24" },
    { id: 7, title: "Agent Performance Review",      assignee: "Sufiyan Merchant", due: "2026-07-02", priority: "Medium", status: "Pending",     date: "2026-06-29" },
    { id: 8, title: "Help Scout Integration Test",   assignee: "Adeel Hyder",      due: "2026-07-04", priority: "Low",    status: "Pending",     date: "2026-06-28" },
  ]
  return { recentActivities, latestAudits, leaderboard, pendingTasks }
}

// ─────────────────────────────────────────────
// NAV CONFIG — add new pages here only
// ─────────────────────────────────────────────
const NAV_MAIN = [
  { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { id: "performance", label: "Performance", icon: TrendingUp       },
  { id: "qa-audits",   label: "QA Audits",   icon: ClipboardCheck   },
  { id: "attendance",  label: "Attendance",  icon: UserCheck        },
  { id: "tasks",       label: "Tasks",       icon: CheckSquare      },
  { id: "reports",     label: "Reports",     icon: FileText         },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy           },
]
const NAV_BOTTOM = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "profile",  label: "Profile",  icon: User     },
]

// ─────────────────────────────────────────────
// FILTER CONFIG — inline (no external imports)
// ─────────────────────────────────────────────
const FC_AGENTS = [
  { value:"all",              label:"All Agents"       },
  { value:"muhammad-junaid",  label:"Muhammad Junaid"  },
  { value:"anum-aziz",        label:"Anum Aziz"        },
  { value:"sufiyan-merchant", label:"Sufiyan Merchant" },
  { value:"adeel-hyder",      label:"Adeel Hyder"      },
  { value:"selena-zyn",       label:"Selena Zyn"       },
  { value:"ayna-ray",         label:"Ayna Ray"         },
  { value:"kabeer-ahmed",     label:"Kabeer Ahmed"     },
]
const FC_KPI_TYPES = [
  { value:"all",label:"All KPIs" },{ value:"qa",label:"QA Score" },
  { value:"csat",label:"CSAT" },{ value:"emails",label:"Emails" },
  { value:"chats",label:"Chats" },{ value:"attendance",label:"Attendance" },
]
const FC_STATUS = [
  { value:"all",label:"All Status" },{ value:"pass",label:"Pass" },
  { value:"fail",label:"Fail" },{ value:"pending",label:"Pending" },
]
const FC_TASK_STATUS = [
  { value:"all",label:"All Status" },{ value:"pending",label:"Pending" },
  { value:"in-progress",label:"In Progress" },{ value:"completed",label:"Completed" },
]
const FC_PRIORITY = [
  { value:"all",label:"All Priority" },{ value:"high",label:"High" },
  { value:"medium",label:"Medium" },{ value:"low",label:"Low" },
]
const FC_ATTEND = [
  { value:"all",label:"All Status" },{ value:"present",label:"Present" },
  { value:"late",label:"Late" },{ value:"absent",label:"Absent" },
]
const FILTER_CONFIGS = {
  dashboard:   { showExport:true,  exportLabel:"Export Report", hideSearch:true, fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Agent",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"channel",label:"Channel",type:"channel" }] },
  performance: { showExport:true,  exportLabel:"Export", hideSearch:true, fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Agent",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"channel",label:"Channel",type:"channel" }] },
  "qa-audits": { showExport:true,  exportLabel:"Export Audits",    fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Agent",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"channel",label:"Channel",type:"channel" },{ key:"status",label:"Status",type:"select",options:FC_STATUS,defaultValue:"all" }] },
  attendance:  { showExport:true,  exportLabel:"Export Attendance",fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Agent",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"status",label:"Status",type:"select",options:FC_ATTEND,defaultValue:"all" }] },
  tasks:       { showExport:false, exportLabel:"",                 fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Assignee",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"status",label:"Status",type:"select",options:FC_TASK_STATUS,defaultValue:"all" },{ key:"priority",label:"Priority",type:"select",options:FC_PRIORITY,defaultValue:"all" }] },
  reports:     { showExport:true,  exportLabel:"Generate Report",  fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"channel",label:"Channel",type:"channel" }] },
  leaderboard: { showExport:true,  exportLabel:"Export Rankings",  fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"channel",label:"Channel",type:"channel" },{ key:"kpiType",label:"KPI Type",type:"select",options:FC_KPI_TYPES,defaultValue:"all" }] },
}

// ─────────────────────────────────────────────
// FILTER UTILITIES
// ─────────────────────────────────────────────

/** Normalize an agent display name to its filter-key slug */
const agentSlug = (name) => (name ?? "").toLowerCase().replace(/\s+/g, "-")

/** Export an array of row objects as a CSV file download */
const downloadCSV = (rows, filename = "export.csv") => {
  if (!rows || !rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename })
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

/**
 * Generic filter — works on any array of records.
 * Checks: from/to (date or due), agent slug, channel/type, status, priority, free-text search.
 */
/** Safely coerce any date value to YYYY-MM-DD. Returns "" for blank/invalid. */
const safeDate = (val) => {
  if (!val || typeof val !== "string" || !val.trim()) return ""
  const t = val.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const d = new Date(t)
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}
/** Today as YYYY-MM-DD */
const todayISO = () => safeDate(new Date().toISOString())
/** First day of the current calendar month as YYYY-MM-DD */
const monthStartISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

const applyFilters = (items, filters) => {
  if (!Array.isArray(items)) return []
  if (!items.length) return []
  const { from, to, agent, channel, status, priority, search } = filters || {}
  const norm = (s) => (s ?? "").toLowerCase().replace(/[-\s]+/g, "-")
  const fromDate = safeDate(from)
  const toDate   = safeDate(to)

  return items.filter(item => {
    const itemDate = safeDate(
      item.date          || item.due           ||
      item["Created at"] || item["created_at"] ||
      item["Closed at"]  || item["closed_at"]  || ""
    )
    if (fromDate && itemDate && itemDate < fromDate) return false
    if (toDate   && itemDate && itemDate > toDate)   return false

    if (agent && agent !== "all") {
      const nameField = (
        item.agent        || item.agentName  || item.assignee    ||
        item.agent_name   || item.rated_user ||
        item["Assignee"]  || item["Rated users"] || item["Rated user"] ||
        item["closed_by"] || item["Closed by"]   || ""
      ).toString().trim()
      if (agentSlug(nameField) !== agent) return false
    }

    if (channel && channel !== "all") {
      const ch = (item.type || item.channel || "").toLowerCase()
      if (ch !== channel) return false
    }

    if (status && status !== "all") {
      if (norm(item.status) !== norm(status)) return false
    }

    if (priority && priority !== "all") {
      if ((item.priority || "").toLowerCase() !== priority.toLowerCase()) return false
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      const haystack = [
        item.agent, item.agentName, item.assignee, item.title,
        item.type, item.status, item.channel, item.action,
        String(item.id ?? ""), item.auditor,
      ].filter(Boolean).join(" ").toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

/**
 * Hook — manages filter state with role-based agent lock.
 * If currentUser is an Agent, agent filter is forced to their own slug.
 */
const usePageFilters = (currentUser) => {
  const [filters, setFilters] = useState({})
  const agentLock = currentUser?.role === "Agent" ? agentSlug(currentUser.name) : null
  const effectiveFilters = agentLock ? { ...filters, agent: agentLock } : filters
  const handleFilter = (vals) => setFilters(vals)
  const handleReset  = () => setFilters({})
  const filterData   = (items) => applyFilters(items, effectiveFilters)
  return { filters, effectiveFilters, agentLock, handleFilter, handleReset, filterData }
}

/** Per-agent mock KPI data — used to update KPI cards when an agent filter is active */
const AGENT_KPI_MOCK = {
  "muhammad-junaid":  {
    overallKPI: { label:"Overall KPI",  value:"87.4", unit:"%", change: 3.2 },
    emails:     { label:"Emails Solved",value:"112",  unit:"",  change: 8   },
    chats:      { label:"Chats Handled",value:"14",   unit:"",  change: 2   },
    csat:       { label:"CSAT Rating",  value:"4.8",  unit:"",  change: 0.1 },
    qa:         { label:"QA Score",     value:"94",   unit:"%", change: 2   },
    attendance: { label:"Attendance",   value:"98",   unit:"%", change: 1   },
  },
  "anum-aziz": {
    overallKPI: { label:"Overall KPI",  value:"82.1", unit:"%", change: 1.5  },
    emails:     { label:"Emails Solved",value:"98",   unit:"",  change: -3   },
    chats:      { label:"Chats Handled",value:"11",   unit:"",  change: 1    },
    csat:       { label:"CSAT Rating",  value:"4.7",  unit:"",  change: 0    },
    qa:         { label:"QA Score",     value:"88",   unit:"%", change: -2   },
    attendance: { label:"Attendance",   value:"95",   unit:"%", change: 0    },
  },
  "sufiyan-merchant": {
    overallKPI: { label:"Overall KPI",  value:"79.6", unit:"%", change: -1.2 },
    emails:     { label:"Emails Solved",value:"105",  unit:"",  change: 5    },
    chats:      { label:"Chats Handled",value:"12",   unit:"",  change: 0    },
    csat:       { label:"CSAT Rating",  value:"4.6",  unit:"",  change: -0.1 },
    qa:         { label:"QA Score",     value:"85",   unit:"%", change: -3   },
    attendance: { label:"Attendance",   value:"92",   unit:"%", change: -2   },
  },
  "adeel-hyder": {
    overallKPI: { label:"Overall KPI",  value:"74.3", unit:"%", change: -2.1 },
    emails:     { label:"Emails Solved",value:"88",   unit:"",  change: -8   },
    chats:      { label:"Chats Handled",value:"9",    unit:"",  change: -1   },
    csat:       { label:"CSAT Rating",  value:"4.5",  unit:"",  change: -0.2 },
    qa:         { label:"QA Score",     value:"80",   unit:"%", change: -4   },
    attendance: { label:"Attendance",   value:"88",   unit:"%", change: -4   },
  },
}

// ── Module-level agent allowlist + name normalizer (shared by Dashboard & Leaderboard) ──
const DASHBOARD_ALLOWED_AGENTS = [
  "Muhammad Junaid",
  "Anum Aziz",
  "Sufiyan Merchant",
  "Adeel Hyder",
  "Selena Zyn",
  "Ayna Ray",
  "Kabeer Ahmed",
]
const normAgentName = (raw) => {
  const n = (raw ?? "").trim().toLowerCase()
  if (n.includes("junaid") || n === "muhammad")  return "Muhammad Junaid"
  if (n.includes("anum"))                        return "Anum Aziz"
  if (n.includes("sufiyan"))                     return "Sufiyan Merchant"
  if (n.includes("adeel"))                       return "Adeel Hyder"
  if (n.includes("selena"))                      return "Selena Zyn"
  if (n.includes("ayna"))                        return "Ayna Ray"
  if (n.includes("kabeer"))                      return "Kabeer Ahmed"
  return (raw ?? "").trim()
}

// ─────────────────────────────────────────────
// DESIGN TOKENS — single source of truth
// ─────────────────────────────────────────────
const tokens = {
  glass: (dark) => ({
    background: dark ? "rgba(22,33,52,0.75)" : "rgba(255,255,255,0.78)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(148,163,184,0.22)",
    boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.35)" : "0 4px 24px rgba(148,163,184,0.14)",
  }),
  surface: (dark) => ({
    background: dark ? "rgba(30,45,68,0.6)" : "rgba(248,250,252,0.9)",
  }),
  divider: (dark) => ({ borderColor: dark ? "rgba(255,255,255,0.07)" : "rgba(148,163,184,0.16)" }),
  textPrimary:   (dark) => dark ? "#f1f5f9" : "#0f172a",
  textSecondary: (dark) => dark ? "#94a3b8" : "#64748b",
  textMuted:     (dark) => dark ? "#475569" : "#94a3b8",
  bg: (dark) => dark ? "#080f1e" : "#eef2fb",
  sidebar: (dark) => ({
    background: dark ? "rgba(10,17,30,0.96)" : "rgba(255,255,255,0.96)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRight: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.14)",
    boxShadow: "4px 0 32px rgba(0,0,0,0.08)",
  }),
  topnav: (dark) => ({
    background: dark ? "rgba(10,17,30,0.92)" : "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.14)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
  }),
}

// Color palette for KPI cards / icons
const PALETTE = {
  blue:    { grad: "linear-gradient(135deg,#3B82F6,#2563EB)", bg: "rgba(59,130,246,0.12)",   text: "#3B82F6" },
  cyan:    { grad: "linear-gradient(135deg,#06B6D4,#0284C7)", bg: "rgba(6,182,212,0.12)",    text: "#06B6D4" },
  purple:  { grad: "linear-gradient(135deg,#8B5CF6,#6D28D9)", bg: "rgba(139,92,246,0.12)",   text: "#8B5CF6" },
  amber:   { grad: "linear-gradient(135deg,#F59E0B,#D97706)", bg: "rgba(245,158,11,0.12)",   text: "#F59E0B" },
  emerald: { grad: "linear-gradient(135deg,#10B981,#059669)", bg: "rgba(16,185,129,0.12)",   text: "#10B981" },
  rose:    { grad: "linear-gradient(135deg,#F43F5E,#E11D48)", bg: "rgba(244,63,94,0.12)",    text: "#F43F5E" },
  pink:    { grad: "linear-gradient(135deg,#EC4899,#DB2777)", bg: "rgba(236,72,153,0.12)",   text: "#EC4899" },
}

// ─────────────────────────────────────────────
// REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────

const GlassCard = ({ children, className = "", style = {}, dark }) => (
  <div className={`rounded-2xl ${className}`} style={{ ...tokens.glass(dark), ...style }}>
    {children}
  </div>
)

const Badge = ({ label, variant = "default" }) => {
  const map = {
    success: { bg: "#d1fae5", text: "#065f46" },
    error:   { bg: "#fee2e2", text: "#991b1b" },
    warning: { bg: "#fef3c7", text: "#92400e" },
    info:    { bg: "#dbeafe", text: "#1e40af" },
    default: { bg: "#f1f5f9", text: "#475569" },
    high:    { bg: "#fee2e2", text: "#991b1b" },
    medium:  { bg: "#fef3c7", text: "#92400e" },
    low:     { bg: "#d1fae5", text: "#065f46" },
    pass:    { bg: "#d1fae5", text: "#065f46" },
    fail:    { bg: "#fee2e2", text: "#991b1b" },
  }
  const c = map[(variant ?? "default").toLowerCase()] || map.default
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  )
}

const Avatar = ({ name, size = "md" }) => {
  const safeName = name || "??"
  const initials = safeName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const colors   = ["#3B82F6","#10B981","#8B5CF6","#F59E0B","#F43F5E","#06B6D4","#EC4899"]
  const bg       = colors[safeName.charCodeAt(0) % colors.length]
  const s        = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-14 h-14 text-lg" }[size]
  return (
    <div className={`${s} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: bg }}>
      {initials}
    </div>
  )
}

const StatusDot = ({ status }) => {
  const map = { success: "#10B981", error: "#EF4444", warning: "#F59E0B", info: "#3B82F6" }
  const Icon = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info }[status] || Info
  return <Icon size={14} style={{ color: map[status] || map.info, flexShrink: 0 }} />
}

const FlickerNum = ({ loading = false, value, unit = "" }) => {
  const [flicker, setFlicker] = useState(0)
  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => setFlicker(Math.floor(Math.random() * 100)), 80)
    return () => clearInterval(id)
  }, [loading])
  return <>{loading ? flicker : value}{unit}</>
}

const KPICard = ({ label, value, unit, change, icon: Icon, color = "blue", dark, loading = false }) => {
  const pos = change >= 0
  const pal = PALETTE[color]
  const [flicker, setFlicker] = useState(0)
  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => setFlicker(Math.floor(Math.random() * 100)), 80)
    return () => clearInterval(id)
  }, [loading])
  return (
    <GlassCard dark={dark} className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: pal.grad }}>
          <Icon size={18} color="#fff" />
        </div>
        <span className="flex items-center gap-0.5 text-xs font-semibold"
          style={{ color: pos ? "#10B981" : "#EF4444" }}>
          {pos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(change)}
        </span>
      </div>
      <p className="text-2xl font-extrabold" style={{ color: tokens.textPrimary(dark), opacity: loading ? 0.6 : 1 }}>
        {loading ? flicker : value}{unit}
      </p>
      <p className="text-xs mt-0.5" style={{ color: tokens.textSecondary(dark) }}>{label}</p>
    </GlassCard>
  )
}

const SectionHeader = ({ title, subtitle, action, dark }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: tokens.textSecondary(dark) }}>{subtitle}</p>}
    </div>
    {action}
  </div>
)

const PageHeader = ({ title, subtitle, dark, actions }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-extrabold" style={{ color: tokens.textPrimary(dark) }}>{title}</h1>
      {subtitle && <p className="text-sm mt-1" style={{ color: tokens.textSecondary(dark) }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
  </div>
)

const Btn = ({ children, variant = "primary", onClick, icon: Icon, size = "md" }) => {
  const base = "flex items-center gap-2 font-medium rounded-xl transition-all cursor-pointer"
  const sz   = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
  const v    = {
    primary: { background: "linear-gradient(135deg,#3B82F6,#2563EB)", color: "#fff", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" },
    outline: { background: "transparent", color: "#3B82F6", border: "1px solid #3B82F6" },
    ghost:   { background: "rgba(59,130,246,0.08)", color: "#3B82F6" },
  }[variant]
  return (
    <button className={`${base} ${sz}`} style={v} onClick={onClick}>
      {Icon && <Icon size={14} />}{children}
    </button>
  )
}

const EmptyState = ({ title = "No data available", description = "Connect your API to load live data.", icon, action, dark = false }) => (
  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: dark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)" }}>
      {icon ?? <Info size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />}
    </div>
    <p className="text-sm font-semibold mb-1" style={{ color: dark ? "#e2e8f0" : "#374151" }}>{title}</p>
    <p className="text-xs max-w-xs leading-relaxed" style={{ color: dark ? "#64748b" : "#9ca3af" }}>{description}</p>
    {action && <div className="mt-3">{action}</div>}
  </div>
)

const PageFilterBar = ({ config, dark = false, onFilter, onReset, onExport, agentLock = null }) => {
  const [values, setValues] = useState(() => {
    const d = {}
    config?.fields?.forEach(f => { if (f.defaultValue) d[f.key] = f.defaultValue })
    return d
  })
  const [search, setSearch] = useState("")
  const set = (k, v) => {
    const next = { ...values, [k]: v }
    setValues(next)
    onFilter?.({ ...next, search })
  }
  const reset = () => {
    const d = {}
    config?.fields?.forEach(f => { if (f.defaultValue) d[f.key] = f.defaultValue })
    setValues(d); setSearch(""); onReset?.()
  }
  const glass = {
    background: dark ? "rgba(22,33,52,0.75)" : "rgba(255,255,255,0.82)",
    backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
    border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(148,163,184,0.22)",
    boxShadow: dark ? "0 2px 20px rgba(0,0,0,0.3)" : "0 2px 16px rgba(148,163,184,0.12)",
  }
  const inp = {
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
    border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.22)",
    color: dark ? "#e2e8f0" : "#0f172a",
  }
  const lc = dark ? "#94a3b8" : "#64748b"
  const renderField = (f) => {
    const lbl = <label key={f.key+"l"} className="block text-xs font-semibold mb-1.5" style={{ color: lc }}>{f.label}</label>
    if (f.type === "daterange") return (
      <div key={f.key}>
        {lbl}
        <input type="date" value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)}
          className="text-xs rounded-xl outline-none py-2 px-3" style={{ ...inp, width: 142 }} />
      </div>
    )
    if (f.type === "channel") {
      const cur = values[f.key] || "all"
      return (
        <div key={f.key}>
          {lbl}
          <div className="flex rounded-xl overflow-hidden"
            style={{ border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.22)" }}>
            {[{value:"all",label:"All"},{value:"email",label:"Email"},{value:"chat",label:"Chat"}].map(o => (
              <button key={o.value} onClick={() => set(f.key, o.value)}
                className="px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: cur===o.value ? "linear-gradient(135deg,#3B82F6,#2563EB)" : (dark?"rgba(255,255,255,0.04)":"rgba(15,23,42,0.03)"), color: cur===o.value ? "#fff" : lc }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )
    }
    if (f.options) return (
      <div key={f.key} className="relative">
        {lbl}
        <div className="relative">
          <select
            value={f.key === "agent" && agentLock ? agentLock : (values[f.key] || f.defaultValue || "")}
            onChange={e => { if (!(f.key === "agent" && agentLock)) set(f.key, e.target.value) }}
            disabled={f.key === "agent" && !!agentLock}
            className="text-xs rounded-xl outline-none py-2 pl-3 pr-7"
            style={{ ...inp, minWidth: 130, appearance:"none", WebkitAppearance:"none",
              cursor: f.key === "agent" && agentLock ? "default" : "pointer",
              opacity: f.key === "agent" && agentLock ? 0.65 : 1 }}>
            {f.options.map(o => (
              <option key={o.value} value={o.value} style={{ background: dark?"#1e293b":"#fff", color: dark?"#e2e8f0":"#0f172a" }}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: dark ? "#64748b" : "#94a3b8" }} />
        </div>
      </div>
    )
    return null
  }
  return (
    <div className="rounded-2xl px-4 py-3 mb-5" style={glass}>
      <div className="flex flex-wrap items-end gap-3">
        {config?.fields?.map(renderField)}
        {!config?.hideSearch && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: lc }}>Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onFilter?.({ ...values, search })}
              placeholder="Search records..."
              className="text-xs rounded-xl outline-none py-2 px-3"
              style={{ ...inp, minWidth: 160 }} />
          </div>
        )}
        <div className="flex items-center gap-2 pb-0.5">
          <button onClick={reset}
            style={{ background:"transparent", color: lc, border: dark?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(148,163,184,0.3)" }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl">
            <X size={11} />Reset
          </button>
          {config?.showExport && (
            <button onClick={onExport}
              style={{ background:"transparent", color:"#3B82F6", border:"1px solid #3B82F6" }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl">
              <Download size={11} />{config.exportLabel || "Export"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// RECHARTS SHARED STYLES
// ─────────────────────────────────────────────
const axisStyle = (dark) => ({ fontSize: 11, fill: dark ? "#475569" : "#94a3b8" })
const gridStyle = (dark) => ({ stroke: dark ? "rgba(255,255,255,0.04)" : "#f1f5f9" })

const ChartTooltip = ({ active, payload, label, dark }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{
      background: dark ? "#0f172a" : "#fff",
      border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.25)"}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
    }}>
      <p className="mb-1.5 font-semibold" style={{ color: tokens.textSecondary(dark) }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} className="font-bold" style={{ color: e.color }}>{e.name}: {e.value}</p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// CHART COMPONENTS
// ─────────────────────────────────────────────

const WeeklyPerfChart = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Weekly Performance" subtitle="Emails & Chats volume this week" dark={dark}
      action={<Badge label="This Week" variant="info" />} />
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" {...gridStyle(dark)} />
        <XAxis dataKey="day" tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="emails" name="Emails" fill="#3B82F6" radius={[5,5,0,0]} />
        <Bar dataKey="chats"  name="Chats"  fill="#06B6D4" radius={[5,5,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  </GlassCard>
)

const MonthlyKPIChart = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Monthly KPI vs Target" subtitle="KPI achievement year-to-date" dark={dark}
      action={<Badge label="2026" variant="info" />} />
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" {...gridStyle(dark)} />
        <XAxis dataKey="month" tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <YAxis domain={[70,100]} tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="kpi"    name="KPI %"    stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="target" name="Target %"  stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </GlassCard>
)

const EmailsVsChatsChart = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Emails vs Chats" subtitle="Volume comparison by week" dark={dark} />
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gEmail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gChat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" {...gridStyle(dark)} />
        <XAxis dataKey="week" tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="emails" name="Emails" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gEmail)" />
        <Area type="monotone" dataKey="chats"  name="Chats"  stroke="#06B6D4" strokeWidth={2.5} fill="url(#gChat)" />
      </AreaChart>
    </ResponsiveContainer>
  </GlassCard>
)

const CSATTrendChart = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="CSAT Trend" subtitle="Satisfaction score trend" dark={dark} />
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" {...gridStyle(dark)} />
        <XAxis dataKey="month" tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <YAxis domain={[0,100]} tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Line type="monotone" dataKey="csat" name="CSAT" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: "#10B981" }} />
      </LineChart>
    </ResponsiveContainer>
  </GlassCard>
)

const QATrendChart = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="QA Score Trend" subtitle="Quality assurance score trend" dark={dark} />
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gQA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" {...gridStyle(dark)} />
        <XAxis dataKey="month" tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <YAxis domain={[80,100]} tick={axisStyle(dark)} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip dark={dark} />} />
        <Area type="monotone" dataKey="qa" name="QA %" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#gQA)" />
      </AreaChart>
    </ResponsiveContainer>
  </GlassCard>
)

// ─────────────────────────────────────────────
// TABLE COMPONENTS
// ─────────────────────────────────────────────

const TH = ({ children, dark }) => (
  <th className="text-left text-xs font-semibold pb-3 pr-4"
    style={{ color: tokens.textMuted(dark) }}>{children}</th>
)

const RecentActivitiesTable = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Recent Activities" subtitle="Latest agent activities" dark={dark}
      action={<button className="text-xs font-semibold" style={{ color: "#3B82F6" }}>View All →</button>} />
    {!data || data.length === 0 ? (
      <EmptyState dark={dark} title="No records found" description="No data matches the selected filters." />
    ) : (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.id} className="flex items-center gap-3">
          <StatusDot status={item.status} />
          <Avatar name={item.agent} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: tokens.textPrimary(dark) }}>{item.agent}</p>
            <p className="text-xs truncate"               style={{ color: tokens.textSecondary(dark) }}>{item.action}</p>
          </div>
          {item.score && <Badge label={`${item.score}%`} variant={item.score >= 80 ? "success" : "error"} />}
          <span className="text-xs flex-shrink-0" style={{ color: tokens.textMuted(dark) }}>{item.time}</span>
        </div>
      ))}
    </div>
    )}
  </GlassCard>
)

const LatestAuditsTable = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Latest QA Audits" subtitle="Recent audit results" dark={dark}
      action={<button className="text-xs font-semibold" style={{ color: "#3B82F6" }}>View All →</button>} />
    {!data || data.length === 0 ? (
      <EmptyState dark={dark} title="No records found" description="No data matches the selected filters." />
    ) : (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {["Agent","Type","Score","Status","Date"].map(h => <TH key={h} dark={dark}>{h}</TH>)}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <Avatar name={row.agent} size="sm" />
                  <span className="text-sm font-medium" style={{ color: tokens.textPrimary(dark) }}>{row.agent}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4"><Badge label={row.type} variant="info" /></td>
              <td className="py-2.5 pr-4">
                <span className="text-sm font-bold" style={{ color: row.score >= 80 ? "#10B981" : "#EF4444" }}>
                  {row.score}%
                </span>
              </td>
              <td className="py-2.5 pr-4"><Badge
                label={row.status === "Pass" ? "Achieved" : row.status === "Fail" ? "Needs Attention" : row.status}
                variant={row.status.toLowerCase()} /></td>
              <td className="py-2.5 text-xs" style={{ color: tokens.textMuted(dark) }}>{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    )}
  </GlassCard>
)

const LeaderboardTable = ({ data, dark, onViewAll }) => {
  const medals = ["🥇","🥈","🥉","4","5"]
  return (
    <GlassCard dark={dark} className="p-5">
      <SectionHeader title="Leaderboard" subtitle="Top performers this month" dark={dark}
        action={<button className="text-xs font-semibold" style={{ color: "#3B82F6" }} onClick={onViewAll}>Full View →</button>} />
      {!data || data.length === 0 ? (
        <EmptyState dark={dark} title="No records found" description="No data matches the selected filters." />
      ) : (
      <div className="space-y-2">
        {data.map((row, i) => (
          <div key={row.rank} className="flex items-center gap-3 p-2.5 rounded-xl"
            style={i === 0 ? { background: dark ? "rgba(59,130,246,0.12)" : "rgba(239,246,255,1)", border: "1px solid rgba(59,130,246,0.2)" } : {}}>
            <span className="text-lg w-7 text-center flex-shrink-0">{medals[i]}</span>
            <Avatar name={row.agent} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: tokens.textPrimary(dark) }}>{row.agent}</p>
              <p className="text-xs" style={{ color: tokens.textSecondary(dark) }}>CSAT {row.csat}% · QA {row.qa}%</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-extrabold" style={{ color: "#3B82F6" }}>{row.kpi}%</p>
              <p className="text-xs" style={{ color: tokens.textMuted(dark) }}>KPI</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </GlassCard>
  )
}

const PendingTasksTable = ({ data, dark, onViewAll }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Pending Tasks" subtitle="Tasks requiring attention" dark={dark}
      action={<button className="text-xs font-semibold" style={{ color: "#3B82F6" }} onClick={onViewAll}>View All →</button>} />
    {!data || data.length === 0 ? (
      <EmptyState dark={dark} title="No records found" description="No data matches the selected filters." />
    ) : (
    <div className="space-y-2">
      {data.map(task => (
        <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl"
          style={tokens.surface(dark)}>
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: task.priority === "High" ? "#EF4444" : task.priority === "Medium" ? "#F59E0B" : "#10B981" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: tokens.textPrimary(dark) }}>{task.title}</p>
            <p className="text-xs mt-0.5" style={{ color: tokens.textSecondary(dark) }}>
              Due {task.due} · {task.assignee}
            </p>
          </div>
          <Badge label={task.priority} variant={task.priority.toLowerCase()} />
        </div>
      ))}
    </div>
    )}
  </GlassCard>
)

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
const Sidebar = ({ page, setPage, dark, collapsed, setCollapsed, currentUser }) => {
  const role      = currentUser?.role ?? "HEAD"
  const allowedNav = NAV_MAIN.filter(item => canAccessPage(role, item.id))
  const allowedBot = NAV_BOTTOM.filter(item => canAccessPage(role, item.id))
  return (
  <div className="h-screen flex-shrink-0 flex flex-col transition-all duration-300 relative"
    style={{ width: collapsed ? 68 : 240, ...tokens.sidebar(dark), zIndex: 40 }}>

    {/* Logo */}
    <div className="flex items-center h-16 px-4 flex-shrink-0"
      style={{ borderBottom: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.12)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", boxShadow: "0 4px 14px rgba(59,130,246,0.4)" }}>
        <BarChart2 size={17} color="#fff" />
      </div>
      {!collapsed && (
        <div className="ml-3 overflow-hidden">
          <p className="text-sm font-extrabold leading-tight" style={{ color: tokens.textPrimary(dark) }}>CSPMS</p>
          <p className="text-xs" style={{ color: tokens.textSecondary(dark) }}>Support Management</p>
        </div>
      )}
    </div>

    {/* Nav items */}
    <nav className="flex-1 py-4 px-2 overflow-y-auto">
      {!collapsed && (
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: tokens.textMuted(dark) }}>Main Menu</p>
      )}
      <div className="space-y-1">
        {allowedNav.map(item => {
          const active = page === item.id
          const Icon   = item.icon
          return (
            <button key={item.id} onClick={() => setPage(item.id)} title={collapsed ? item.label : ""}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={active
                ? { background: "linear-gradient(135deg,rgba(59,130,246,0.9),rgba(37,99,235,0.9))", color: "#fff", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }
                : { color: tokens.textSecondary(dark) }}>
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-5 pt-5 space-y-1"
        style={{ borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.12)" }}>
        {!collapsed && (
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: tokens.textMuted(dark) }}>Account</p>
        )}
        {allowedBot.map(item => {
          const active = page === item.id
          const Icon   = item.icon
          return (
            <button key={item.id} onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={active
                ? { background: "linear-gradient(135deg,rgba(59,130,246,0.9),rgba(37,99,235,0.9))", color: "#fff", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }
                : { color: tokens.textSecondary(dark) }}>
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          )
        })}
      </div>
    </nav>

    {/* Role badge */}
    {!collapsed && currentUser && (
      <div className="px-4 py-3" style={{ borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.12)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)" }}>
            {currentUser.initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate" style={{ color: tokens.textPrimary(dark) }}>{currentUser.name}</p>
            <p className="text-xs truncate" style={{ color: tokens.textMuted(dark) }}>{currentUser.role}</p>
          </div>
        </div>
      </div>
    )}

    {/* Collapse toggle */}
    <button onClick={() => setCollapsed(!collapsed)}
      className="absolute -right-3.5 top-20 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
      style={{ background: dark ? "#1e293b" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`, zIndex: 50 }}>
      {collapsed
        ? <ChevronRight size={13} style={{ color: tokens.textSecondary(dark) }} />
        : <ChevronLeft  size={13} style={{ color: tokens.textSecondary(dark) }} />}
    </button>
  </div>
  )
}

// ─────────────────────────────────────────────
// TOP NAV
// ─────────────────────────────────────────────
const PAGE_LABELS = {
  dashboard: "Dashboard", performance: "Performance", "qa-audits": "QA Audits",
  attendance: "Attendance", tasks: "Tasks", reports: "Reports",
  leaderboard: "Leaderboard", settings: "Settings", profile: "Profile",
}

// Real notifications built from live task data (no dummy items)
const buildNotifications = (user, tasks = [], isChampion = false) => {
  const list = []
  const isAgent = (user?.role ?? "") === "Agent"
  const mine = isAgent ? tasks.filter(t => agentSlug(t.assignee) === agentSlug(user?.name)) : tasks
  const today = todayISO()
  const dueDays = (due) => {
    const d = safeDate(due); if (!d) return null
    return Math.round((new Date(d) - new Date(today)) / 86400000)
  }
  mine.forEach(t => {
    if (t.status === "Completed") return
    const dd = dueDays(t.due)
    if (dd !== null && dd < 0) {
      list.push({ id: "ov-" + t.id, text: `Task overdue: ${t.title}`, time: `Due ${t.due}`, unread: true, page: "tasks" })
    } else if (dd !== null && dd <= 2) {
      list.push({ id: "due-" + t.id, text: `Task due soon: ${t.title}`, time: `Due ${t.due}`, unread: true, page: "tasks" })
    } else if (isAgent && t.status === "Pending") {
      list.push({ id: "new-" + t.id, text: `New task assigned: ${t.title}`, time: `Due ${t.due}`, unread: true, page: "tasks" })
    }
  })
  if (isAgent && isChampion) {
    list.push({ id: "champ", text: "You are the leaderboard champion 🏆", time: "This month", unread: true, page: "leaderboard" })
  }
  return list
}

const TopNav = ({ dark, setDark, page, setPage, currentUser, onLogout, tasks = [] }) => {
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [profilOpen, setProfilOpen] = useState(false)
  const [notifs,     setNotifs]     = useState([])
  const { tickets: nTickets, csat: nCsat, loaded: nLoaded, error: nError } = useLiveData()
  const notifRef  = useRef(null)
  const profilRef = useRef(null)
  const close = () => { setNotifOpen(false); setProfilOpen(false) }
  const role   = currentUser?.role ?? ""
  const initials = currentUser?.initials ?? "??"
  const userName  = currentUser?.name  ?? "User"

  // Is the logged-in agent currently ranked #1? (same aggregation as Leaderboard)
  const isChampion = (() => {
    if (role !== "Agent") return false
    if (!(nLoaded && !nError && nTickets !== null)) return false
    const from = monthStartISO(), to = todayISO()
    const byAgent = {}
    DASHBOARD_ALLOWED_AGENTS.forEach(name => { byAgent[name] = { agent: name, emails: 0, great: 0, total: 0 } })
    ;(nTickets ?? []).forEach(t => {
      const name = normAgentName(t.agent_name || t.agent || "")
      if (!DASHBOARD_ALLOWED_AGENTS.includes(name)) return
      const d = safeDate(t.date || t.created_at || ""); if (d && (d < from || d > to)) return
      byAgent[name].emails++
      const raw = (t.customer_rating || "").toString()
      if (csatIsValid(raw)) { byAgent[name].total++; if (csatIsGreat(raw)) byAgent[name].great++ }
    })
    ;(nCsat ?? []).forEach(c => {
      const name = normAgentName(c.agent_name || "")
      if (!DASHBOARD_ALLOWED_AGENTS.includes(name)) return
      if (!csatIsValid(c.rating)) return
      const d = safeDate(c.date || c.created_at || ""); if (d && (d < from || d > to)) return
      byAgent[name].total++; if (csatIsGreat(c.rating)) byAgent[name].great++
    })
    const rows = Object.values(byAgent)
      .map(a => ({ agent: a.agent, emails: a.emails, kpi: a.total ? a.great / a.total * 100 : 0 }))
      .sort((a, b) => b.kpi - a.kpi || b.emails - a.emails)
    return rows[0] && agentSlug(rows[0].agent) === agentSlug(userName)
  })()

  useEffect(() => {
    setNotifs(buildNotifications(currentUser, tasks, isChampion))
  }, [currentUser, tasks, isChampion])

  const hasUnread = notifs.some(n => n.unread)

  const handleNotifClick = (n) => {
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))
    setNotifOpen(false)
    if (n.page) setPage(n.page)
  }

  const handleMarkAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, unread: false })))

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [notifOpen])

  useEffect(() => {
    if (!profilOpen) return
    const handler = (e) => { if (profilRef.current && !profilRef.current.contains(e.target)) setProfilOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [profilOpen])

  const handleLogout = () => { close(); onLogout?.() }

  return (
    <div className="h-16 flex items-center px-6 gap-3 flex-shrink-0 relative" style={{ ...tokens.topnav(dark), zIndex: 50 }}>
      <p className="flex-1 text-base font-bold" style={{ color: tokens.textPrimary(dark) }}>
        {PAGE_LABELS[page] || "Dashboard"}
      </p>

      {/* Theme toggle */}
      <button onClick={() => { setDark(!dark); close() }}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}>
        {dark ? <Sun size={15} color="#F59E0B" /> : <Moon size={15} color="#475569" />}
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef} style={{ zIndex: 200 }}>
        <button onClick={() => { setNotifOpen(!notifOpen); setProfilOpen(false) }}
          className="w-9 h-9 rounded-xl flex items-center justify-center relative transition-all"
          style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}>
          <Bell size={15} style={{ color: tokens.textSecondary(dark) }} />
          {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white" style={{ background: "#EF4444" }} />}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl"
            style={{ background: dark ? "#111827" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.2)"}`, zIndex: 9999, overflow: "hidden" }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
              <p className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>Notifications</p>
              {hasUnread && (
                <button onClick={handleMarkAllRead}
                  className="text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "#3B82F6" }}>
                  Mark all as read
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: tokens.textMuted(dark) }}>No notifications</div>
            ) : notifs.map(n => (
              <button key={n.id} onClick={() => handleNotifClick(n)}
                className="w-full flex gap-3 px-4 py-3 text-left transition-all"
                style={{
                  background: n.unread ? (dark ? "rgba(59,130,246,0.08)" : "rgba(239,246,255,0.8)") : "transparent",
                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "#f8fafc"}`,
                  cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(241,245,249,1)" }}
                onMouseLeave={e => { e.currentTarget.style.background = n.unread ? (dark ? "rgba(59,130,246,0.08)" : "rgba(239,246,255,0.8)") : "transparent" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.unread ? "#3B82F6" : (dark ? "#4B5563" : "#CBD5E1") }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: tokens.textPrimary(dark) }}>{n.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: tokens.textMuted(dark) }}>{n.time}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative" ref={profilRef} style={{ zIndex: 200 }}>
        <button onClick={() => { setProfilOpen(!profilOpen); setNotifOpen(false) }}
          className="flex items-center gap-2 transition-all">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shadow-lg"
            style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)" }}>
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-tight" style={{ color: tokens.textPrimary(dark) }}>{userName}</p>
            <p className="text-xs leading-tight" style={{ color: tokens.textMuted(dark) }}>{role}</p>
          </div>
          <ChevronDown size={13} style={{ color: tokens.textSecondary(dark) }} />
        </button>
        {profilOpen && (
          <div className="absolute right-0 top-12 w-52 rounded-2xl shadow-2xl"
            style={{ background: dark ? "#111827" : "#fff", border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.2)"}`, zIndex: 9999, overflow: "hidden" }}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
              <p className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>{userName}</p>
              <p className="text-xs" style={{ color: tokens.textSecondary(dark) }}>{role}</p>
            </div>
            {[{ label: "View Profile", icon: User, pg: "profile" }, { label: "Settings", icon: Settings, pg: "settings" }].map(item => (
              <button key={item.label} onClick={() => { setPage(item.pg); close() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:opacity-80"
                style={{ color: tokens.textSecondary(dark) }}>
                <item.icon size={14} />{item.label}
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:opacity-80"
                style={{ color: "#EF4444" }}>
                <LogOut size={14} />Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// APP LAYOUT — shell wrapping Sidebar + TopNav
// ─────────────────────────────────────────────
const AppLayout = ({ dark, setDark, page, setPage, currentUser, onLogout, tasks = [], children }) => {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: dark ? "#0a0f1e" : "#f0f4f8", fontFamily: "'Inter',sans-serif" }}>
      <Sidebar page={page} setPage={setPage} dark={dark}
        collapsed={collapsed} setCollapsed={setCollapsed} currentUser={currentUser} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav dark={dark} setDark={setDark} page={page} setPage={setPage}
          currentUser={currentUser} onLogout={onLogout} tasks={tasks} />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────

// DASHBOARD ————————————————————————————————————
const DashboardPage = ({ dark, currentUser, onNavigate, tasks = [] }) => {
  const kpi    = useKPIData()
  const charts = useChartData()
  const tables = useTableData()
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)
  const { tickets: liveTickets, csat: liveCsat, agents: liveAgents, loaded: liveLoaded, error: liveError } = useLiveData()
  const activeAgent = effectiveFilters.agent && effectiveFilters.agent !== "all" ? effectiveFilters.agent : null
  const activeCh    = effectiveFilters.channel && effectiveFilters.channel !== "all" ? effectiveFilters.channel : null
  const hasActiveFilter = !!(activeAgent || effectiveFilters.from || effectiveFilters.to || activeCh)
  const liveAvailable = liveLoaded && !liveError && liveTickets !== null
  const liveHasData   = liveAvailable && ((liveTickets?.length ?? 0) > 0 || (liveCsat?.length ?? 0) > 0)

  // ── Build live activity rows from tickets (newest first) ──────────────
  const liveActivities = liveHasData ? (liveTickets ?? []).map(t => ({
    ...t,
    agent:   t.agent_name  || t.agent || "",
    action:  t.subject     || "Email ticket",
    score:   t.customer_rating ? parseFloat(t.customer_rating) : null,
    time:    t.date        || "",
    status:  (t.status || "").toLowerCase() === "resolved" ? "success"
           : (t.status || "").toLowerCase() === "pending"  ? "warning" : "info",
    date:    safeDate(t.date) || "",
    channel: "email",
  })).reverse() : null

  // ── Build live leaderboard (current month, 4 allowed agents) ────────
  const liveLeaderboard = (() => {
    // Date range: dashboard filter if set, otherwise current month → today
    const lbFrom = effectiveFilters.from || monthStartISO()
    const lbTo   = effectiveFilters.to   || todayISO()
    // Seed all 4 agents with zeros so they always appear
    const byAgent = {}
    DASHBOARD_ALLOWED_AGENTS.forEach(name => {
      byAgent[name] = { agent: name, emails: 0, csatGreat: 0, csatTotal: 0 }
    })
    if (liveAvailable) {
      ;(liveTickets ?? []).forEach(t => {
        const name = normAgentName(t.agent_name || t.agent || "")
        if (!DASHBOARD_ALLOWED_AGENTS.includes(name)) return
        const d = safeDate(t.date || t.created_at || "")
        if (d && (d < lbFrom || d > lbTo)) return
        byAgent[name].emails++
        const raw = (t.customer_rating || "").toString()
        if (csatIsValid(raw)) {
          byAgent[name].csatTotal++
          if (csatIsGreat(raw)) byAgent[name].csatGreat++
        }
      })
      ;(liveCsat ?? []).forEach(c => {
        const name = normAgentName(c.agent_name || "")
        if (!DASHBOARD_ALLOWED_AGENTS.includes(name)) return
        if (!csatIsValid(c.rating)) return
        const d = safeDate(c.date || c.created_at || "")
        if (d && (d < lbFrom || d > lbTo)) return
        byAgent[name].csatTotal++
        if (csatIsGreat(c.rating)) byAgent[name].csatGreat++
      })
    }
    return Object.values(byAgent)
      .map(a => {
        const csat = a.csatTotal ? +(a.csatGreat / a.csatTotal * 100).toFixed(1) : 0
        return { agent: a.agent, emails: a.emails, chats: 0, csat, qa: 0, kpi: csat, date: todayISO() }
      })
      .sort((a, b) => b.kpi - a.kpi || b.emails - a.emails)
      .map((a, i) => ({ ...a, rank: i + 1 }))
  })()

  const filtActivities  = applyFilters(liveAvailable ? (liveActivities ?? []) : tables.recentActivities, effectiveFilters)
  const filtAudits      = filterData(tables.latestAudits)
  const filtTasks       = applyFilters(
    canViewAllAgents(currentUser?.role)
      ? tasks
      : tasks.filter(t => agentSlug(t.assignee) === agentSlug(currentUser?.name)),
    effectiveFilters
  )
  // liveLeaderboard always returns an array (4 agents); dates already baked in — only apply agent filter here
  const filtLeaderboard = liveLeaderboard.filter(row =>
    agentLock || !effectiveFilters.agent || effectiveFilters.agent === "all" || agentSlug(row.agent) === effectiveFilters.agent
  )

  const allTableEmpty = filtLeaderboard.length === 0 && filtTasks.length === 0
  const hasFilters    = Object.values(effectiveFilters).some(v => v && v !== "all" && v !== "")

  // ── KPI card values ────────────────────────────────────────────────────────
  // Rules enforced here:
  //   • Chat = 0 always (Webbotify not connected)
  //   • Live data available → use live only, never mix with mock numbers
  //   • Filter active + no live data → show real 0s (not fake mock values)
  //   • No filter + no live data → show mock as a display default
  const chatZero = { ...kpi.chats, value: 0, change: 0 }
  const activeKpi = (() => {
    try {
      const zeros = {
        overallKPI: { ...kpi.overallKPI, value: 0, change: 0 },
        emails:     { ...kpi.emails,     value: 0, change: 0 },
        chats:      chatZero,
        csat:       { ...kpi.csat,       value: 0, change: 0 },
        qa:         { ...kpi.qa,         value: 0, change: 0 },
        attendance: { ...kpi.attendance, value: 0, change: 0 },
      }
      if (activeCh === "chat") return zeros
      if (liveAvailable) {
        if (!liveHasData) return zeros
        const lf = { from: effectiveFilters.from, to: effectiveFilters.to, agent: effectiveFilters.agent }
        const filtT = applyFilters(
          (liveTickets ?? []).map(t => ({
            ...t,
            agent: t.agent_name || t.agent || "",
            date:  safeDate(t.date) || "",
          })),
          lf
        )
       const filtC = applyFilters(
          (liveCsat ?? []).map(c => ({
            ...c,
            agent: c.agent_name || "",
            date:  safeDate(c.date) || "",
          })),
          lf
        )
        const avgNum = (rows, ...fields) => {
          for (const f of fields) {
            const vals = rows.map(r => parseFloat(r[f] ?? "") || 0).filter(v => v > 0)
            if (vals.length) return +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
          }
          return 0
        }
        const emailCount = filtT.length
        // Help Scout CSAT: (Great ÷ Total) × 100
        const avgCsat = csatCompute([
          ...filtC.map(r => r.rating),
          ...filtT.map(t => (t.customer_rating || "").toString()),
        ])
        const avgQa = avgNum(filtC, "qa_score", "qa") || avgNum(filtT, "qa_score", "qa")
        return {
          overallKPI: { ...kpi.overallKPI, value: avgQa || avgCsat || 0, change: 0 },
          emails:     { ...kpi.emails,     value: emailCount,             change: 0 },
          chats:      chatZero,
          csat:       { ...kpi.csat,       value: avgCsat || 0,           change: 0 },
          qa:         { ...kpi.qa,         value: avgQa   || 0,           change: 0 },
          attendance: { ...kpi.attendance, value: 0,                       change: 0 },
        }
      }
      // Still loading — never show mock while the API call is in-flight
      if (!liveLoaded) return zeros
      // API failed — fall back to mock; show zeros when a filter is active
      if (!hasActiveFilter) return { ...kpi, chats: chatZero }
      return zeros
    } catch {
      return { ...kpi, chats: chatZero }
    }
  })()
  // ── Live chart data computed from tickets + csat ─────────────────────
  const activeCharts = (() => {
    if (!liveHasData) return charts
    try {
      const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      // Selected-agent filter for charts (All Agents → unfiltered, identical to before)
      const chTickets = activeAgent ? (liveTickets ?? []).filter(t => agentSlug(t.agent_name || t.agent || "") === activeAgent) : (liveTickets ?? [])
      const chCsat    = activeAgent ? (liveCsat ?? []).filter(c => agentSlug(c.agent_name || "") === activeAgent) : (liveCsat ?? [])
      const wMap = {}
      DAYS.forEach(d => { wMap[d] = { day: d, emails: 0, chats: 0, qa: 0 } })
      ;(chTickets).forEach(t => {
        const d = safeDate(t.date); if (!d) return
        wMap[DAYS[new Date(d).getDay()]].emails++
      })
      const weeklyPerformance = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => wMap[d])
      const mKpi = {}
      ;(chCsat).forEach(c => {
        const d = safeDate(c.date); if (!d) return
        if (!csatIsValid(c.rating)) return
        const m = MONTHS[new Date(d).getMonth()]
        if (!mKpi[m]) mKpi[m] = { month: m, great: 0, total: 0, target: 85 }
        mKpi[m].total++
        if (csatIsGreat(c.rating)) mKpi[m].great++
      })
      const monthlyKPI = Object.values(mKpi).map(m => ({
        month: m.month, kpi: m.total ? +(m.great / m.total * 100).toFixed(1) : 0, target: m.target,
      }))
      const wkMap = {}
      ;(chTickets).forEach(t => {
        const d = safeDate(t.date); if (!d) return
        const wk = "W" + Math.ceil(new Date(d).getDate() / 7)
        if (!wkMap[wk]) wkMap[wk] = { week: wk, emails: 0, chats: 0 }
        wkMap[wk].emails++
      })
      const emailsVsChats = Object.values(wkMap).slice(-4)
      const csatM = {}
      ;(chCsat).forEach(c => {
        const d = safeDate(c.date); if (!d) return
        if (!csatIsValid(c.rating)) return
        const m = MONTHS[new Date(d).getMonth()]
        if (!csatM[m]) csatM[m] = { month: m, great: 0, total: 0 }
        csatM[m].total++
        if (csatIsGreat(c.rating)) csatM[m].great++
      })
      const csatTrend = Object.values(csatM).map(m => ({
        month: m.month, csat: m.total ? +(m.great / m.total * 100).toFixed(1) : 0,
      }))
      return {
        weeklyPerformance: weeklyPerformance.length ? weeklyPerformance : charts.weeklyPerformance,
        monthlyKPI:        monthlyKPI.length        ? monthlyKPI        : charts.monthlyKPI,
        emailsVsChats:     emailsVsChats.length     ? emailsVsChats     : charts.emailsVsChats,
        csatTrend:         csatTrend.length         ? csatTrend         : charts.csatTrend,
        qaTrend:           charts.qaTrend,
      }
    } catch { return charts }
  })()

  const cards = [
    { ...activeKpi.overallKPI, icon: Target,       color: "blue"    },
    { ...activeKpi.emails,     icon: Mail,          color: "cyan"    },
    { ...activeKpi.chats,      icon: MessageSquare, color: "purple"  },
    { ...activeKpi.csat,       icon: Star,          color: "amber"   },
    { ...activeKpi.qa,         icon: Shield,        color: "emerald" },
    { ...activeKpi.attendance, icon: UserCheck,     color: "rose"    },
  ]
  const showCharts = !hasActiveFilter || !allTableEmpty || !!agentLock
  return (
    <div>
      <PageHeader dark={dark} title="Dashboard"
        subtitle={`Welcome back, ${currentUser?.name ?? ""}! Here's your ${currentUser?.role === "Agent" ? "" : "team's "}performance overview.`} />
      <PageFilterBar
        config={FILTER_CONFIGS.dashboard}
        dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV([...filtActivities, ...filtAudits], "dashboard.csv")} />
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        {cards.map((c, i) => <KPICard key={i} {...c} dark={dark} loading={!liveLoaded} />)}
      </div>
      {/* Charts — live when API loaded, mock when no filter, hidden when filter + no live data */}
      {showCharts && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <WeeklyPerfChart data={activeCharts.weeklyPerformance} dark={dark} />
            <MonthlyKPIChart data={activeCharts.monthlyKPI}        dark={dark} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <EmailsVsChatsChart data={activeCharts.emailsVsChats} dark={dark} />
            <CSATTrendChart      data={activeCharts.csatTrend}     dark={dark} />
            <QATrendChart        data={activeCharts.qaTrend}        dark={dark} />
          </div>
        </>
      )}
      {hasFilters && allTableEmpty && !agentLock ? (
        <GlassCard dark={dark} className="p-5 mb-4">
          <EmptyState dark={dark} title="No records found for selected filters"
            description="Try adjusting your date range, agent, channel, or search term."
            icon={<Filter size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />} />
        </GlassCard>
      ) : (
        <>

          {/* Tables row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LeaderboardTable  data={filtLeaderboard} dark={dark} onViewAll={() => onNavigate?.("leaderboard")} />
            <PendingTasksTable data={filtTasks} dark={dark} onViewAll={() => onNavigate?.("tasks")} />
          </div>
        </>
      )}
    </div>
  )
}

// PERFORMANCE ——————————————————————————————————
const PerformancePage = ({ dark, currentUser }) => {
  const charts = useChartData()
  const { agentLock, effectiveFilters, handleFilter, handleReset } = usePageFilters(currentUser)
  const { tickets: liveTickets, csat: liveCsat, loaded: liveLoaded, error: liveError } = useLiveData()

  const liveAvailable = liveLoaded && !liveError && liveTickets !== null
  const activeCh      = effectiveFilters.channel && effectiveFilters.channel !== "all" ? effectiveFilters.channel : null

  // Apply Performance filters to live data — same logic as Dashboard
  const lf = { from: effectiveFilters.from, to: effectiveFilters.to, agent: effectiveFilters.agent }

  // Filter email_tickets by date + agent + channel
  const filtT = liveAvailable ? applyFilters(
    (liveTickets ?? []).map(t => ({
      ...t,
      agent:   t.agent_name || t.agent || "",
      date:    safeDate(t.date) || "",
      channel: t.channel || "email",
    })),
    { ...lf, channel: effectiveFilters.channel }
  ) : []

  // Filter csat by date + agent only (no channel column in csat tab)
  const filtC = liveAvailable ? applyFilters(
    (liveCsat ?? []).map(c => ({
      ...c,
      agent: c.agent_name || "",
      date:  safeDate(c.date) || "",
    })),
    lf
  ) : []

  // KPI calculations
  // • Loading or API failed → liveAvailable=false → filtT/filtC=[] → all values = 0
  // • API succeeded but filters return nothing → counts naturally = 0
  const emailCount = filtT.length
  const badCount   = filtC.filter(r => (r.rating ?? "").toString().trim().toLowerCase() === "bad").length
  const okayCount  = filtC.filter(r => (r.rating ?? "").toString().trim().toLowerCase() === "okay").length
  const greatCount = filtC.filter(r => (r.rating ?? "").toString().trim().toLowerCase() === "great").length
  const totalRated = greatCount + okayCount + badCount
  // Help Scout formula: CSAT% = Great / (Great + Okay + Bad) × 100
  const csatScore  = totalRated > 0 ? +(greatCount / totalRated * 100).toFixed(1) : 0

  const cards = [
    { label: "Emails Handled", value: emailCount, unit: "",  change: 0, icon: Mail,        color: "cyan"    },
    { label: "CSAT Score",     value: csatScore,  unit: "%", change: 0, icon: Star,        color: "amber"   },
    { label: "Bad",            value: badCount,   unit: "",  change: 0, icon: XCircle,     color: "rose"    },
    { label: "Okay",           value: okayCount,  unit: "",  change: 0, icon: CheckCircle, color: "emerald" },
  ]

  // Charts remain unchanged — zero out inactive channel series
  const perfChartData = charts.weeklyPerformance.map(row => ({
    ...row,
    emails: activeCh === "chat"  ? 0 : row.emails,
    chats:  activeCh === "email" ? 0 : row.chats,
  }))

  return (
    <div>
      <PageHeader dark={dark} title="Performance" subtitle="Detailed agent performance analysis and trends."
        actions={<Btn variant="primary" icon={Plus}>Add Metric</Btn>} />
      <PageFilterBar config={FILTER_CONFIGS.performance} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset} onExport={() => {}} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {cards.map((c, i) => <KPICard key={i} {...c} dark={dark} loading={!liveLoaded} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WeeklyPerfChart data={perfChartData} dark={dark} />
        <MonthlyKPIChart data={charts.monthlyKPI} dark={dark} />
      </div>
      <GlassCard dark={dark} className="p-5">
        <SectionHeader dark={dark} title="Agent Performance Breakdown"
          subtitle="Individual agent scores — connect API to populate" />
        <EmptyState dark={dark} title="No performance data"
          description="Connect your API to load live agent performance data"
          icon={<Activity size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />}
          action={<p className="text-xs font-mono mt-1" style={{ color: dark ? "#475569" : "#94a3b8" }}>useAgentPerformance(filters)</p>} />
      </GlassCard>
    </div>
  )
}
// QA AUDITS ————————————————————————————————————
const QAPage = ({ dark, currentUser }) => {
  const { latestAudits } = useTableData()
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)
  const qaFileRef  = useRef(null)
  const [qaToast, setQaToast] = useState("")

  // No real QA audit data source connected yet — show zeros until one is wired up
  const filtAudits = []
  const passCount  = 0
  const avgScore   = 0
  const passRate   = 0

  const stats = [
    { label: "Total Audits",   value: "0",  icon: ClipboardCheck, color: "#3B82F6" },
    { label: "Pass Rate",      value: "0%", icon: CheckCircle,    color: "#10B981" },
    { label: "Avg Score",      value: "0%", icon: Star,           color: "#F59E0B" },
    { label: "Pending Review", value: "0",  icon: Clock,          color: "#8B5CF6" },
  ]
  return (
    <div>
      {/* Hidden file input triggered by New Audit button */}
      <input
        ref={qaFileRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={e => {
          if (e.target.files?.[0]) {
            setQaToast("QA audit file selected successfully.")
            setTimeout(() => setQaToast(""), 4000)
          }
          e.target.value = ""  // reset so same file can be re-selected
        }}
      />
      {qaToast && (
        <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{ background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }}>
          <CheckCircle size={14} />{qaToast}
        </div>
      )}
      <PageHeader dark={dark} title="QA Audits" subtitle="Quality assurance audit management and tracking."
        actions={currentUser?.role === "HEAD" ? <Btn variant="primary" icon={Plus} onClick={() => qaFileRef.current?.click()}>New Audit</Btn> : null} />
      <PageFilterBar config={FILTER_CONFIGS["qa-audits"]} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV(filtAudits, "qa-audits.csv")} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {stats.map((s, i) => (
          <GlassCard key={i} dark={dark} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${s.color}18` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-extrabold" style={{ color: tokens.textPrimary(dark) }}>{s.value}</p>
                <p className="text-xs"                style={{ color: tokens.textSecondary(dark) }}>{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <LatestAuditsTable data={filtAudits} dark={dark} />
    </div>
  )
}

// ATTENDANCE ———————————————————————————————————
// Attendance upload — mock row shape (mirrors attendanceUploadService.ts)
const MOCK_ATT_ROWS = [
  { agentName: "Muhammad Junaid",  date: "2026-06-29", checkIn: "09:02", checkOut: "17:45", status: "Present"     },
  { agentName: "Anum Aziz",        date: "2026-06-29", checkIn: "09:15", checkOut: "17:30", status: "Short Leave"  },
  { agentName: "Sufiyan Merchant", date: "2026-06-29", checkIn: "10:35", checkOut: "17:45", status: "Late"         },
  { agentName: "Adeel Hyder",      date: "2026-06-29", checkIn: "09:00", checkOut: "16:30", status: "Half Day"     },
]
const ATT_STATUS_COLOR = {
  Present:      "#10B981",
  Late:         "#F59E0B",
  "Short Leave":"#8B5CF6",
  "Half Day":   "#EF4444",
  Absent:       "#EF4444",
}

const AttendancePage = ({ dark, currentUser }) => {
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)
  const [uploadedRows,  setUploadedRows]  = useState([])
  const [uploadStatus,  setUploadStatus]  = useState("idle")  // "idle"|"loading"|"done"|"error"
  const [uploadMsg,     setUploadMsg]     = useState("")
  const fileInputRef = { current: null }   // plain ref for file input

  const rows     = uploadedRows.length > 0 ? uploadedRows : []
  const filtRows = filterData(rows)

  // Derive summary stats from filtered rows (or defaults)
  const present   = filtRows.filter(r => r.status === "Present").length
  const late      = filtRows.filter(r => r.status === "Late").length
  const halfDay   = filtRows.filter(r => r.status === "Half Day" || r.status === "Short Leave").length
  const total     = filtRows.length || 4
  const statsData = [
    { label: "Present",      value: filtRows.length ? `${present}/${total}`  : "—",    icon: UserCheck, color: "#10B981" },
    { label: "Late",         value: filtRows.length ? String(late)            : "—",    icon: Clock,     color: "#F59E0B" },
    { label: "Half / Short", value: filtRows.length ? String(halfDay)         : "—",    icon: XCircle,   color: "#EF4444" },
    { label: "Upload Status",value: uploadStatus === "done" ? "Uploaded ✓"   : "Pending", icon: Activity, color: "#3B82F6" },
  ]

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus("loading")
    setUploadMsg("")
    // Mock parse — in production, call parseAttendanceFile(file) from attendanceUploadService.ts
    setTimeout(() => {
      setUploadedRows(MOCK_ATT_ROWS)
      setUploadStatus("done")
      setUploadMsg(`"${file.name}" processed — ${MOCK_ATT_ROWS.length} records loaded.`)
    }, 700)
    e.target.value = ""  // reset so same file can be re-uploaded
  }

  const triggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  return (
    <div>
      {/* hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx"
        style={{ display: "none" }} onChange={handleFileChange} />

      <PageHeader dark={dark} title="Attendance"
        subtitle="Monitor team attendance and punctuality records."
        actions={
          <div className="flex gap-2">
            <Btn variant="secondary" icon={Download} onClick={() => {}}>Export</Btn>
            <Btn variant="primary"   icon={Plus}     onClick={triggerUpload}
              disabled={uploadStatus === "loading"}>
              {uploadStatus === "loading" ? "Processing…" : "Upload Attendance"}
            </Btn>
          </div>
        } />

      {/* upload feedback */}
      {uploadMsg && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2"
          style={{
            background: dark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)", color: "#10B981",
          }}>
          <CheckCircle size={13} />
          {uploadMsg}
          <span style={{ color: tokens.textMuted(dark), marginLeft: 4 }}>
            (CSV / Excel accepted — see services/attendanceUploadService.ts)
          </span>
        </div>
      )}

      <PageFilterBar config={FILTER_CONFIGS.attendance} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV(filtRows, "attendance.csv")} />

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {statsData.map((s, i) => (
          <GlassCard key={i} dark={dark} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${s.color}18` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-extrabold" style={{ color: tokens.textPrimary(dark) }}>{s.value}</p>
                <p className="text-xs"                style={{ color: tokens.textSecondary(dark) }}>{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* attendance table */}
      <GlassCard dark={dark} className="p-5">
        <SectionHeader dark={dark} title="Attendance Log"
          subtitle={uploadedRows.length ? `${filtRows.length} of ${uploadedRows.length} records shown` : "Upload a CSV or Excel file to populate this table"} />
        {uploadedRows.length === 0 ? (
          <EmptyState dark={dark} title="No attendance records yet"
            description="Click Upload Attendance to load a CSV or Excel file"
            icon={<UserCheck size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />}
            action={
              <Btn variant="primary" icon={Plus} onClick={triggerUpload} size="sm">
                Upload Attendance
              </Btn>
            } />
        ) : filtRows.length === 0 ? (
          <EmptyState dark={dark} title="No records found for selected filters"
            description="Try adjusting your filters or clicking Reset."
            icon={<Filter size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {["Agent","Date","Check In","Check Out","Status"].map(h => (
                    <th key={h} className="text-left pb-3 pr-4 font-semibold"
                      style={{ color: tokens.textMuted(dark), borderBottom: `1px solid ${dark?"rgba(255,255,255,0.06)":"#f1f5f9"}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${dark?"rgba(255,255,255,0.04)":"#f8fafc"}` }}>
                    <td className="py-2.5 pr-4 font-semibold" style={{ color: tokens.textPrimary(dark) }}>{r.agentName}</td>
                    <td className="py-2.5 pr-4" style={{ color: tokens.textSecondary(dark) }}>{r.date}</td>
                    <td className="py-2.5 pr-4" style={{ color: tokens.textSecondary(dark) }}>{r.checkIn || "—"}</td>
                    <td className="py-2.5 pr-4" style={{ color: tokens.textSecondary(dark) }}>{r.checkOut || "—"}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: `${ATT_STATUS_COLOR[r.status] ?? "#94a3b8"}18`,
                          color:       ATT_STATUS_COLOR[r.status] ?? "#94a3b8",
                        }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// TASKS ————————————————————————————————————————
const TasksPage = ({ dark, currentUser, tasks = [], setTasks }) => {
  const { pendingTasks } = useTableData()
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)

  const role      = currentUser?.role ?? "Agent"
  const canCreate = role === "HEAD"

  // Role-based visibility: HEAD / Team Lead see all tasks; Agents see only their own
  const visibleTasks = canViewAllAgents(role)
    ? tasks
    : tasks.filter(t => agentSlug(t.assignee) === agentSlug(currentUser?.name))

  const allFiltered = filterData(visibleTasks)
  const byStatus = (s) => allFiltered.filter(t => t.status === s)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: "", assignee: "", priority: "Medium", due: "", status: "Pending" })
  const [completeFor, setCompleteFor] = useState(null)
  const [comment, setComment] = useState("")
  const [commentError, setCommentError] = useState("")

  const blankForm = { title: "", assignee: "", priority: "Medium", due: "", status: "Pending" }

  const openCreate = () => { setEditingId(null); setForm(blankForm); setShowModal(true) }
  const openEdit   = (task) => {
    setEditingId(task.id)
    setForm({ title: task.title, assignee: task.assignee, priority: task.priority, due: task.due, status: task.status || "Pending" })
    setShowModal(true)
  }
  const closeModal = () => { setEditingId(null); setForm(blankForm); setShowModal(false) }

  const saveTask = () => {
    if (!form.title.trim() || !form.assignee || !form.due) return
    if (editingId != null) {
      setTasks?.(prev => prev.map(t => t.id === editingId
        ? { ...t, title: form.title.trim(), assignee: form.assignee, priority: form.priority, due: form.due, status: form.status }
        : t))
    } else {
      const t = {
        id: Date.now(),
        title: form.title.trim(),
        assignee: form.assignee,
        priority: form.priority,
        due: form.due,
        status: form.status || "Pending",
        date: todayISO(),
      }
      setTasks?.(prev => [t, ...prev])
    }
    closeModal()
  }

  const deleteTask   = (id) => setTasks?.(prev => prev.filter(t => t.id !== id))
  const updateStatus = (id, status) => setTasks?.(prev => prev.map(t => t.id === id ? { ...t, status } : t))

  // Agent status change: a comment is required only when marking a task Completed
  const requestStatusChange = (task, next) => {
    if (next === "Completed") { setCompleteFor(task); setComment(""); setCommentError("") }
    else updateStatus(task.id, next)
  }
  const cancelComplete = () => { setCompleteFor(null); setComment(""); setCommentError("") }
  const confirmComplete = () => {
    if (!comment.trim()) {
      setCommentError("Please add a completion comment before marking this task as completed.")
      return
    }
    setTasks?.(prev => prev.map(t => t.id === completeFor.id ? { ...t, status: "Completed", completionComment: comment.trim() } : t))
    cancelComplete()
  }

  const modalInp = {
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
    border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.22)",
    color: dark ? "#e2e8f0" : "#0f172a",
  }

  const cols = [
    { label: "Pending",     color: "#F59E0B", tasks: byStatus("Pending")     },
    { label: "In Progress", color: "#3B82F6", tasks: byStatus("In Progress") },
    { label: "Completed",   color: "#10B981", tasks: byStatus("Completed")   },
  ]

  return (
    <div>
      <PageHeader dark={dark} title="Tasks" subtitle="Manage and track team tasks and assignments."
        actions={canCreate ? <Btn variant="primary" icon={Plus} onClick={openCreate}>New Task</Btn> : null} />
      <PageFilterBar config={FILTER_CONFIGS.tasks} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV(allFiltered, "tasks.csv")} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {cols.map((col, i) => (
          <GlassCard key={i} dark={dark} className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: col.color }} />
              <span className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>{col.label}</span>
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)", color: tokens.textSecondary(dark) }}>
                {col.tasks.length}
              </span>
            </div>
            {col.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8"
                style={{ color: tokens.textMuted(dark) }}>
                <CheckSquare size={24} style={{ opacity: 0.25, marginBottom: 6 }} />
                <p className="text-xs text-center">No {col.label.toLowerCase()} tasks</p>
              </div>
            ) : col.tasks.map(task => (
             <div key={task.id} className="p-3 rounded-xl mb-2"
                style={tokens.surface(dark)}>
                <p className="text-sm font-semibold mb-1" style={{ color: tokens.textPrimary(dark) }}>{task.title}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: tokens.textSecondary(dark) }}>Due {task.due} · {task.assignee}</p>
                  <Badge label={task.priority} variant={task.priority.toLowerCase()} />
                </div>
                {task.completionComment && (
                  <p className="text-xs mt-2 italic" style={{ color: tokens.textSecondary(dark) }}>
                    Completion note: {task.completionComment}
                  </p>
                )}
                {canCreate ? (
                  <div className="flex items-center gap-3 mt-2 pt-2"
                    style={{ borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.16)" }}>
                    <button onClick={() => openEdit(task)} className="text-xs font-semibold" style={{ color: "#3B82F6" }}>Edit</button>
                    <button onClick={() => deleteTask(task.id)} className="text-xs font-semibold" style={{ color: "#EF4444" }}>Delete</button>
                  </div>
                ) : (
                  <div className="mt-2 pt-2"
                    style={{ borderTop: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.16)" }}>
                    <select value={task.status} onChange={e => requestStatusChange(task, e.target.value)}
                      className="text-xs rounded-lg outline-none py-1 px-2" style={modalInp}>
                      {["Pending", "In Progress", "Completed"].map(s => (
                        <option key={s} value={s} style={{ background: dark ? "#1e293b" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </GlassCard>
        ))}
     </div>

      {canCreate && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          onClick={closeModal}>
          <div className="w-full" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <GlassCard dark={dark} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold" style={{ color: tokens.textPrimary(dark) }}>{editingId != null ? "Edit Task" : "New Task"}</h3>
                <button onClick={closeModal} style={{ color: tokens.textSecondary(dark) }}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textSecondary(dark) }}>Task Title</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Describe the task…"
                    className="w-full text-sm rounded-xl outline-none py-2 px-3" style={modalInp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textSecondary(dark) }}>Assign To</label>
                  <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}
                    className="w-full text-sm rounded-xl outline-none py-2 px-3" style={modalInp}>
                    <option value="">Select agent…</option>
                    {DASHBOARD_ALLOWED_AGENTS.map(a => (
                      <option key={a} value={a} style={{ background: dark ? "#1e293b" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textSecondary(dark) }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full text-sm rounded-xl outline-none py-2 px-3" style={modalInp}>
                    {["High", "Medium", "Low"].map(p => (
                      <option key={p} value={p} style={{ background: dark ? "#1e293b" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textSecondary(dark) }}>Due Date</label>
                  <input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })}
                    className="w-full text-sm rounded-xl outline-none py-2 px-3" style={modalInp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textSecondary(dark) }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full text-sm rounded-xl outline-none py-2 px-3" style={modalInp}>
                    {["Pending", "In Progress", "Completed"].map(s => (
                      <option key={s} value={s} style={{ background: dark ? "#1e293b" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button onClick={closeModal}
                  className="px-4 py-2 text-sm font-bold rounded-xl"
                  style={{ background: "transparent", color: tokens.textSecondary(dark), border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.3)" }}>
                  Cancel
                </button>
                <button onClick={saveTask}
                  className="px-4 py-2 text-sm font-bold rounded-xl"
                  style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)", color: "#fff", boxShadow: "0 4px 12px rgba(59,130,246,0.35)" }}>
                  {editingId != null ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {!canCreate && completeFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          onClick={cancelComplete}>
          <div className="w-full" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <GlassCard dark={dark} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold" style={{ color: tokens.textPrimary(dark) }}>Complete Task</h3>
                <button onClick={cancelComplete} style={{ color: tokens.textSecondary(dark) }}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: tokens.textSecondary(dark) }}>{completeFor.title}</p>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textSecondary(dark) }}>Completion Comment</label>
                <textarea value={comment} onChange={e => { setComment(e.target.value); if (commentError) setCommentError("") }}
                  rows={3} placeholder="Describe how this task was completed…"
                  className="w-full text-sm rounded-xl outline-none py-2 px-3" style={modalInp} />
              </div>
              {commentError && (
                <p className="text-xs mt-2" style={{ color: "#EF4444" }}>{commentError}</p>
              )}
              <div className="flex items-center justify-end gap-2 mt-5">
                <button onClick={cancelComplete}
                  className="px-4 py-2 text-sm font-bold rounded-xl"
                  style={{ background: "transparent", color: tokens.textSecondary(dark), border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.3)" }}>
                  Cancel
                </button>
                <button onClick={confirmComplete}
                  className="px-4 py-2 text-sm font-bold rounded-xl"
                  style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", boxShadow: "0 4px 12px rgba(16,185,129,0.35)" }}>
                  Mark Completed
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  )
}

// REPORTS ——————————————————————————————————————
const ReportsPage = ({ dark, currentUser }) => {
  const { agentLock, effectiveFilters, handleFilter, handleReset } = usePageFilters(currentUser)
  const allReports = [
    { title: "Monthly Performance", desc: "Comprehensive KPI report for June 2026",   icon: TrendingUp,    color: "#3B82F6", channel: "all",   date: "2026-06-01" },
    { title: "QA Audit Summary",    desc: "All QA audits and pass/fail breakdown",     icon: ClipboardCheck,color: "#10B981",  channel: "all",   date: "2026-06-01" },
    { title: "Attendance Report",   desc: "Team attendance and punctuality metrics",   icon: UserCheck,     color: "#F59E0B", channel: "all",   date: "2026-06-01" },
    { title: "CSAT Analysis",       desc: "Customer satisfaction trends and insights", icon: Star,          color: "#8B5CF6", channel: "all",   date: "2026-06-01" },
    { title: "Email Performance",   desc: "Email volume, response time, and quality",  icon: Mail,          color: "#06B6D4", channel: "email", date: "2026-06-01" },
    { title: "Chat Performance",    desc: "Chat volume, duration, and resolution",     icon: MessageSquare, color: "#EC4899", channel: "chat",  date: "2026-06-01" },
  ]
  const reports = applyFilters(allReports, {
    channel: effectiveFilters.channel,
    search:  effectiveFilters.search,
    from:    effectiveFilters.from,
    to:      effectiveFilters.to,
  })
  return (
    <div>
      <PageHeader dark={dark} title="Reports" subtitle="Generate and export comprehensive performance reports."
        actions={<Btn variant="primary" icon={Plus}>New Report</Btn>} />
      <PageFilterBar config={FILTER_CONFIGS.reports} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset} onExport={() => {}} />
      {reports.length === 0 ? (
        <GlassCard dark={dark} className="p-5">
          <EmptyState dark={dark} title="No reports found for selected filters"
            description="Try selecting a different channel or clearing your search."
            icon={<Filter size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />} />
        </GlassCard>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, i) => (
          <GlassCard key={i} dark={dark} className="p-5 cursor-pointer" style={{ transition: "transform 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${r.color}18` }}>
                <r.icon size={18} style={{ color: r.color }} />
              </div>
              <div>
                <p className="text-sm font-bold"  style={{ color: tokens.textPrimary(dark) }}>{r.title}</p>
                <p className="text-xs mt-0.5"     style={{ color: tokens.textSecondary(dark) }}>{r.desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge label="Jun 2026" variant="info" />
              <button className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#3B82F6" }}>
                <Download size={12} />Download
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
      )}
    </div>
  )
}

// LEADERBOARD ——————————————————————————————————
const LeaderboardPage = ({ dark, currentUser }) => {
  const { leaderboard } = useTableData()
  const { tickets: liveTickets, csat: liveCsat, loaded: liveLoaded, error: liveError } = useLiveData()
  const { agentLock, effectiveFilters, handleFilter, handleReset } = usePageFilters(currentUser)

  const liveAvailable = liveLoaded && !liveError && liveTickets !== null

  // ── Compute leaderboard — current month default, 4 allowed agents, no mock ──
  const computedLeaderboard = (() => {
    // Default date range: current month → today (user filter overrides)
    const lbFrom = effectiveFilters.from || monthStartISO()
    const lbTo   = effectiveFilters.to   || todayISO()

    // Seed all 4 allowed agents with zeros so they always appear
    const byAgent = {}
    DASHBOARD_ALLOWED_AGENTS.forEach(name => {
      byAgent[name] = { agent: name, emails: 0, csatGreat: 0, csatTotal: 0 }
    })

    if (liveAvailable) {
      ;(liveTickets ?? []).forEach(t => {
        const name = normAgentName(t.agent_name || t.agent || "")
        if (!DASHBOARD_ALLOWED_AGENTS.includes(name)) return
        const d = safeDate(t.date || t.created_at || "")
        if (d && (d < lbFrom || d > lbTo)) return
        // channel filter
        if (effectiveFilters.channel && effectiveFilters.channel !== "all") {
          const ch = (t.channel || "email").toLowerCase()
          if (ch !== effectiveFilters.channel.toLowerCase()) return
        }
        byAgent[name].emails++
        const raw = (t.customer_rating || "").toString()
        if (csatIsValid(raw)) {
          byAgent[name].csatTotal++
          if (csatIsGreat(raw)) byAgent[name].csatGreat++
        }
      })
      ;(liveCsat ?? []).forEach(c => {
        const name = normAgentName(c.agent_name || "")
        if (!DASHBOARD_ALLOWED_AGENTS.includes(name)) return
        if (!csatIsValid(c.rating)) return
        const d = safeDate(c.date || c.created_at || "")
        if (d && (d < lbFrom || d > lbTo)) return
        byAgent[name].csatTotal++
        if (csatIsGreat(c.rating)) byAgent[name].csatGreat++
      })
    }

    // Build rows — CSAT = Help Scout formula: great ÷ total × 100
    let rows = Object.values(byAgent)
      .map(a => {
        const csat = a.csatTotal ? +(a.csatGreat / a.csatTotal * 100).toFixed(1) : 0
        return { agent: a.agent, emails: a.emails, chats: 0, csat, qa: 0, kpi: csat,
                 date: todayISO() }
      })
      .sort((a, b) => b.kpi - a.kpi || b.emails - a.emails)
      .map((a, i) => ({ ...a, rank: i + 1 }))

    // Agent filter (skip for locked agent logins — they view the full ranking)
    if (!agentLock && effectiveFilters.agent && effectiveFilters.agent !== "all") {
      rows = rows.filter(r => agentSlug(r.agent) === effectiveFilters.agent)
    }
    // Search filter
    const q = (effectiveFilters.search || "").trim().toLowerCase()
    if (q) rows = rows.filter(r => r.agent.toLowerCase().includes(q))

    return rows
  })()
  const medals = ["🥇","🥈","🥉","4","5"]
  return (
    <div>
      <PageHeader dark={dark} title="Leaderboard" subtitle="Top performing agents ranked by overall KPI this month." />
      <PageFilterBar config={FILTER_CONFIGS.leaderboard} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV(computedLeaderboard, "leaderboard.csv")} />
      {computedLeaderboard.length === 0 ? (
        <GlassCard dark={dark} className="p-5 mb-4">
          <EmptyState dark={dark} title="No agents found for selected filters"
            description="Try adjusting your filters or clicking Reset."
            icon={<Filter size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />} />
        </GlassCard>
      ) : (<>
      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {computedLeaderboard.slice(0,3).map((agent, i) => (
          <GlassCard key={i} dark={dark} className="p-6 text-center"
            style={i === 0 ? { boxShadow: "0 0 0 2px #3B82F6, 0 8px 32px rgba(59,130,246,0.2)" } : {}}>
            <div className="text-3xl mb-3">{medals[i]}</div>
            <div className="flex justify-center mb-3"><Avatar name={agent.agent} size="lg" /></div>
            <p className="text-base font-extrabold mb-0.5" style={{ color: tokens.textPrimary(dark) }}>{agent.agent}</p>
            <p className="text-2xl font-black" style={{ color: "#3B82F6" }}><FlickerNum loading={!liveLoaded} value={agent.kpi} unit="%" /></p>
            <p className="text-xs mb-3" style={{ color: tokens.textSecondary(dark) }}>Overall KPI</p>
            <div className="flex justify-center gap-6">
              {[["CSAT", agent.csat, "%"], ["QA", agent.qa, "%"], ["Emails", agent.emails, ""]].map(([lbl, val, u]) => (
                <div key={lbl}>
                  <p className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}><FlickerNum loading={!liveLoaded} value={val} unit={u} /></p>
                  <p className="text-xs"           style={{ color: tokens.textMuted(dark) }}>{lbl}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
      {/* Full table */}
      <GlassCard dark={dark} className="p-5">
        <SectionHeader dark={dark} title="Full Rankings" subtitle="All agents this month" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["Rank","Agent","KPI","Emails","Chats","CSAT","QA Score"].map(h => <TH key={h} dark={dark}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {computedLeaderboard.map((row, i) => (
                <tr key={row.rank} style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
                  <td className="py-3 pr-4 text-lg">{medals[i]}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.agent} size="sm" />
                      <span className="text-sm font-semibold" style={{ color: tokens.textPrimary(dark) }}>{row.agent}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm font-extrabold" style={{ color: "#3B82F6" }}><FlickerNum loading={!liveLoaded} value={row.kpi} unit="%" /></span>
                  </td>
                  <td className="py-3 pr-4 text-sm" style={{ color: tokens.textSecondary(dark) }}><FlickerNum loading={!liveLoaded} value={row.emails} /></td>
                  <td className="py-3 pr-4 text-sm" style={{ color: tokens.textSecondary(dark) }}><FlickerNum loading={!liveLoaded} value={row.chats} /></td>
                  <td className="py-3 pr-4 text-sm" style={{ color: tokens.textSecondary(dark) }}><FlickerNum loading={!liveLoaded} value={row.csat} unit="%" /></td>
                  <td className="py-3 text-sm font-bold" style={{ color: row.qa >= 90 ? "#10B981" : "#F59E0B" }}><FlickerNum loading={!liveLoaded} value={row.qa} unit="%" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      </>)}
    </div>
  )
}

// SETTINGS — mock data (outside component to avoid re-creation on render)
const KPI_METRICS_CONFIG = [
  // Productivity 30%
  { id:  1, name: "Emails Solved",           weight: 12, target: "100",   warning: "90",   critical: "80",   enabled: true  },
  { id:  2, name: "Chats Handled",           weight: 10, target: "10",    warning: "8",    critical: "6",    enabled: true  },
  { id:  3, name: "Avg Handling Time (min)", weight: 8,  target: "20",    warning: "25",   critical: "30",   enabled: true  },
  // Quality 35%
  { id:  4, name: "QA Audit Score (%)",      weight: 20, target: "80%",   warning: "70%",  critical: "60%",  enabled: true  },
  { id:  5, name: "Grammar & Professional.", weight: 8,  target: "90%",   warning: "80%",  critical: "70%",  enabled: true  },
  { id:  6, name: "Policy Compliance (%)",   weight: 7,  target: "95%",   warning: "85%",  critical: "75%",  enabled: true  },
  // Customer Experience 20%
  { id:  7, name: "CSAT Rating",             weight: 15, target: "4.6",   warning: "4.3",  critical: "4.0",  enabled: true  },
  { id:  8, name: "Negative Reviews",        weight: 5,  target: "0",     warning: "2",    critical: "5",    enabled: true  },
  // Reliability 15%
  { id:  9, name: "Attendance (%)",          weight: 4,  target: "95%",   warning: "88%",  critical: "80%",  enabled: true  },
  { id: 10, name: "Schedule Adherence (%)",  weight: 4,  target: "95%",   warning: "85%",  critical: "75%",  enabled: true  },
  { id: 11, name: "Escalation Rate (%)",     weight: 3,  target: "5%",    warning: "10%",  critical: "15%",  enabled: true  },
  { id: 12, name: "Task Completion (%)",     weight: 4,  target: "95%",   warning: "85%",  critical: "75%",  enabled: true  },
]
const PERM_GROUPS = [
  { group: "Dashboard & Reports", permissions: [
    { key: "view_dashboard",   label: "View Dashboard"   },
    { key: "view_all_reports", label: "View All Reports" },
    { key: "view_own_reports", label: "View Own Reports" },
    { key: "export_data",      label: "Export Data"      },
  ]},
  { group: "Quality Management", permissions: [
    { key: "view_qa_scores",   label: "View QA Scores"      },
    { key: "conduct_audits",   label: "Conduct QA Audits"   },
    { key: "manage_templates", label: "Manage QA Templates" },
  ]},
  { group: "Team Management", permissions: [
    { key: "view_team",     label: "View Team Members"   },
    { key: "manage_agents", label: "Add / Remove Agents" },
    { key: "manage_roles",  label: "Manage Roles"        },
  ]},
  { group: "Configuration", permissions: [
    { key: "configure_kpi",       label: "Configure KPI Weights" },
    { key: "set_thresholds",      label: "Set Thresholds"        },
    { key: "access_settings",     label: "Access Settings"       },
    { key: "manage_integrations", label: "Manage Integrations"   },
  ]},
]
const INIT_PERMISSIONS = {
  Agent: {
    view_dashboard: true,  view_all_reports: false, view_own_reports: true,  export_data: false,
    view_qa_scores: true,  conduct_audits: false,   manage_templates: false,
    view_team: true,       manage_agents: false,    manage_roles: false,
    configure_kpi: false,  set_thresholds: false,   access_settings: false,  manage_integrations: false,
  },
  "Team Lead": {
    view_dashboard: true,  view_all_reports: true,  view_own_reports: true,  export_data: true,
    view_qa_scores: true,  conduct_audits: true,    manage_templates: false,
    view_team: true,       manage_agents: false,    manage_roles: false,
    configure_kpi: false,  set_thresholds: true,    access_settings: false,  manage_integrations: false,
  },
  HEAD: {
    view_dashboard: true,  view_all_reports: true,  view_own_reports: true,  export_data: true,
    view_qa_scores: true,  conduct_audits: true,    manage_templates: true,
    view_team: true,       manage_agents: true,     manage_roles: true,
    configure_kpi: true,   set_thresholds: true,    access_settings: true,   manage_integrations: true,
  },
}

const SettingsPage = ({ dark, currentUser, onChangePassword }) => {
  const [activeTab,   setActiveTab]   = useState("General")
  const [kpiMetrics,  setKpiMetrics]  = useState(KPI_METRICS_CONFIG)
  const [permissions, setPermissions] = useState(INIT_PERMISSIONS)
  // ── General settings controlled state ──────────────────────────────────────
  const [displayName, setDisplayName] = useState(currentUser?.name  ?? "")
  const [timezone,    setTimezone]    = useState("UTC+5 Karachi")
  const [language,    setLanguage]    = useState("English (US)")
  const [savedToast,  setSavedToast]  = useState("")
  const showToast = (msg) => { setSavedToast(msg); setTimeout(() => setSavedToast(""), 3000) }
  // ── change password state ──────────────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew,     setPwNew]     = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwError,   setPwError]   = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)
  const handleChangePw = async () => {
    setPwSuccess(false)
    if (!pwCurrent)          { setPwError("Current password is required."); return }
    if (pwNew.length < 8)    { setPwError("New password must be at least 8 characters."); return }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return }
    if (!currentUser?.email) { setPwError("No user session found."); return }
    setPwError("")
    try {
      await onChangePassword?.(currentUser.email, pwCurrent, pwNew)
      setPwCurrent(""); setPwNew(""); setPwConfirm("")
      setPwSuccess(true)
    } catch (err) {
      setPwError(err.message || "Failed to change password.")
    }
  }

  const SETTINGS_TABS = [
    "General","Notifications","Integrations",
    "KPI Configuration","Role Permissions",
    "Team & Roles","Security","Billing",
  ]
  const inputSt = {
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
    color: tokens.textPrimary(dark),
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.25)"}`,
  }
  const toggleKPI  = (id)         => setKpiMetrics(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
  const togglePerm = (role, key)  => setPermissions(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } }))

  const renderContent = () => {
    // ── KPI Configuration ──────────────────────────────────────────────────
    if (activeTab === "KPI Configuration") return (
      <GlassCard dark={dark} className="p-5">
        <SectionHeader dark={dark} title="KPI Configuration"
          subtitle="Configure metric weights, targets, and alert thresholds"
          action={<Btn variant="primary" size="sm" onClick={() => showToast("KPI configuration saved.")}>Save Configuration</Btn>} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["Metric","Weight (%)","Target","Warning","Critical","On"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold pb-3 pr-4 whitespace-nowrap"
                    style={{ color: tokens.textMuted(dark) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpiMetrics.map(m => (
                <tr key={m.id} style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
                  <td className="py-3 pr-4">
                    <p className="text-xs font-semibold" style={{ color: tokens.textPrimary(dark) }}>{m.name}</p>
                  </td>
                  {["weight","target","warning","critical"].map(k => (
                    <td key={k} className="py-3 pr-4">
                      <input
                        value={m[k]}
                        onChange={e => setKpiMetrics(prev => prev.map(x => x.id===m.id ? {...x,[k]:e.target.value} : x))}
                        className="text-xs rounded-lg outline-none px-2 py-1.5 w-20"
                        style={inputSt}
                      />
                    </td>
                  ))}
                  <td className="py-3">
                    <button onClick={() => toggleKPI(m.id)}
                      className="w-9 h-5 rounded-full relative transition-all"
                      style={{ background: m.enabled ? "#3B82F6" : (dark?"rgba(255,255,255,0.12)":"#e2e8f0") }}>
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: m.enabled ? "calc(100% - 18px)" : "2px" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    )

    // ── Role Permissions ──────────────────────────────────
    if (activeTab === "Role Permissions") return (
      <div className="space-y-4">
        <SectionHeader dark={dark} title="Role Permissions"
          subtitle="Control feature access for each role in your team"
          action={<Btn variant="primary" size="sm" onClick={() => showToast("Role permissions saved.")}>Save Permissions</Btn>} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Agent","Team Lead","HEAD"].map(role => (
            <GlassCard key={role} dark={dark} className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: role==="HEAD"?"linear-gradient(135deg,#8B5CF6,#7C3AED)":role==="Team Lead"?"linear-gradient(135deg,#3B82F6,#2563EB)":"linear-gradient(135deg,#10B981,#059669)" }}>
                  <Shield size={14} color="#fff" />
                </div>
                <p className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>{role}</p>
              </div>
              {PERM_GROUPS.map(g => (
                <div key={g.group} className="mb-4">
                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: tokens.textMuted(dark), letterSpacing:"0.06em" }}>{g.group}</p>
                  {g.permissions.map(p => (
                    <div key={p.key} className="flex items-center justify-between py-1.5">
                      <span className="text-xs" style={{ color: tokens.textSecondary(dark) }}>{p.label}</span>
                      <button onClick={() => togglePerm(role, p.key)}
                        className="w-8 h-4 rounded-full relative transition-all flex-shrink-0"
                        style={{ background: permissions[role]?.[p.key] ? "#3B82F6" : (dark?"rgba(255,255,255,0.1)":"#e2e8f0") }}>
                        <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm"
                          style={{ left: permissions[role]?.[p.key] ? "calc(100% - 14px)" : "2px" }} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </GlassCard>
          ))}
        </div>
      </div>
    )

    // ── Security — Change Password ───────────────────────────
    if (activeTab === "Security") return (
      <GlassCard dark={dark} className="p-5" style={{ maxWidth: 480 }}>
        <SectionHeader dark={dark} title="Change Password"
          subtitle="Update your account password. Minimum 8 characters." />
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Current Password</label>
            <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)}
              placeholder="Enter current password"
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>New Password</label>
            <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Confirm New Password</label>
            <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
          </div>
          {pwError && (
            <div className="rounded-xl px-4 py-2.5 text-xs"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="rounded-xl px-4 py-2.5 text-xs"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}>
              Password updated successfully.
            </div>
          )}
          <Btn variant="primary" onClick={handleChangePw}>Update Password</Btn>
        </div>
      </GlassCard>
    )

    // ── Integrations — auto-refresh placeholder ──────────────
    if (activeTab === "Integrations") return (
      <div className="space-y-4">
        <SectionHeader dark={dark} title="Integrations"
          subtitle="Connect live data sources. Make.com webhooks will be wired here." />
        {[
          {
            name: "Help Scout", status: "Not Connected", color: "#F59E0B",
            note: "POST /api/webhooks/helpscout — emails solved, avg handling time",
            refresh: "Every 15 min",
          },
          {
            name: "Webbotify",  status: "Not Connected", color: "#F59E0B",
            note: "POST /api/webhooks/webbotify — chats handled, CSAT, escalations",
            refresh: "Every 15 min",
          },
        ].map(srv => (
          <GlassCard key={srv.name} dark={dark} className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${srv.color}18` }}>
                  <Activity size={16} style={{ color: srv.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>{srv.name}</p>
                  <p className="text-xs" style={{ color: tokens.textMuted(dark) }}>{srv.note}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-lg font-semibold"
                  style={{ background: `${srv.color}15`, color: srv.color }}>
                  {srv.status}
                </span>
                <span className="text-xs" style={{ color: tokens.textMuted(dark) }}>
                  Auto-refresh: {srv.refresh}
                </span>
                <Btn variant="primary" size="sm">Connect</Btn>
              </div>
            </div>
          </GlassCard>
        ))}
        <GlassCard dark={dark} className="p-4">
          <p className="text-xs font-semibold mb-2" style={{ color: tokens.textMuted(dark) }}>
            Make.com Webhook Endpoints (to be activated)
          </p>
          {[
            "POST /api/webhooks/helpscout   → triggers email KPI refresh",
            "POST /api/webhooks/webbotify   → triggers chat/CSAT KPI refresh",
            "POST /api/attendance/upload    → bulk attendance JSON from Make.com",
          ].map(ep => (
            <p key={ep} className="text-xs font-mono py-1"
              style={{ color: tokens.textSecondary(dark) }}>
              {ep}
            </p>
          ))}
        </GlassCard>
      </div>
    )

    // ── General ───────────────────────────────────────────────────────────────
    if (activeTab === "General") return (
      <GlassCard dark={dark} className="p-5">
        <SectionHeader dark={dark} title="General Settings" subtitle="Update your workspace preferences"
          action={<Btn variant="primary" size="sm" onClick={() => showToast("General settings saved.")}>Save Changes</Btn>} />
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Email</label>
            <input value={currentUser?.email ?? ""} readOnly
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3"
              style={{ ...inputSt, opacity: 0.6, cursor: "default" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3"
              style={{ ...inputSt, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
              {["UTC+5 Karachi","UTC+0 London","UTC-5 New York","UTC+8 Singapore"].map(tz => (
                <option key={tz} value={tz} style={{ background: dark?"#1e293b":"#fff" }}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full text-xs rounded-xl outline-none py-2.5 px-3"
              style={{ ...inputSt, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
              {["English (US)","English (UK)","Urdu"].map(l => (
                <option key={l} value={l} style={{ background: dark?"#1e293b":"#fff" }}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>
    )

    // ── Placeholder for unconfigured tabs (Notifications, Team & Roles, Billing) ──
    return (
      <GlassCard dark={dark} className="p-8">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: dark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)" }}>
            <Settings size={22} style={{ color: dark ? "#475569" : "#94a3b8" }} />
          </div>
          <p className="text-sm font-bold mb-1" style={{ color: tokens.textPrimary(dark) }}>
            {activeTab}
          </p>
          <p className="text-xs mb-6" style={{ color: tokens.textMuted(dark) }}>
            This section is ready for configuration.
          </p>
          <Btn variant="outline" size="sm" onClick={() => showToast(`${activeTab} settings saved.`)}>
            Save Changes
          </Btn>
        </div>
      </GlassCard>
    )
  }

  return (
    <div>
      <PageHeader dark={dark} title="Settings" subtitle="Manage your workspace preferences and configurations."
        actions={<Btn variant="primary" icon={Shield} onClick={() => showToast("All settings saved.")}>Save All</Btn>} />
      {savedToast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
          style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", zIndex: 9999 }}>
          ✓ {savedToast}
        </div>
      )}
      <div className="flex gap-1 flex-wrap mb-5">
        {SETTINGS_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all"
            style={{
              background: activeTab===tab ? "linear-gradient(135deg,#3B82F6,#2563EB)" : (dark?"rgba(255,255,255,0.06)":"rgba(15,23,42,0.05)"),
              color: activeTab===tab ? "#fff" : tokens.textSecondary(dark),
              boxShadow: activeTab===tab ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
            }}>
            {tab}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  )
}

// ─────────────────────────────────────────────
// PROFILE PAGE
// ─────────────────────────────────────────────
const ProfilePage = ({ dark, currentUser, tasks = [] }) => {
  // ── editable state — persisted to localStorage (no Supabase touched) ────────
  const LS_KEY = "cspms_profile_prefs"
  const _saved = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") } catch { return {} } })()

  const [editing,    setEditing]    = useState(false)
  const [fullName,   setFullName]   = useState(_saved.fullName   ?? currentUser?.name ?? "")
  const [phone,      setPhone]      = useState(_saved.phone      ?? "+92 300 0000000")
  const [department, setDepartment] = useState(_saved.department ?? "Customer Support")
  const [location,   setLocation]   = useState(_saved.location   ?? "Karachi, PK")
  const [draft,      setDraft]      = useState({})
  const [toast,      setToast]      = useState("")

  const startEdit = () => {
    setDraft({ fullName, phone, department, location })
    setEditing(true)
  }
  const cancelEdit = () => {
    setFullName(draft.fullName); setPhone(draft.phone)
    setDepartment(draft.department); setLocation(draft.location)
    setEditing(false)
  }
  const saveEdit = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ fullName, phone, department, location })) } catch {}
    setEditing(false)
    setToast("Profile updated successfully.")
    setTimeout(() => setToast(""), 3000)
  }

  const inputSt = {
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
    color: tokens.textPrimary(dark),
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.25)"}`,
  }
  const readSt = { ...inputSt, opacity: 0.6, cursor: "default" }

  // Real activity derived from the logged-in user's tasks (agents see only their own)
  const isAgentProfile = currentUser?.role === "Agent"
  const myTasks = isAgentProfile
    ? tasks.filter(t => agentSlug(t.assignee) === agentSlug(currentUser?.name))
    : tasks
  const activities = myTasks.map(t => ({
    action: t.status === "Completed"
      ? `Completed task: ${t.title}${t.completionComment ? ` — "${t.completionComment}"` : ""}`
      : `Task ${t.status}: ${t.title}`,
    time: t.due ? `Due ${t.due}` : "",
    icon: CheckSquare,
  }))

  return (
    <div>
      <PageHeader dark={dark} title="My Profile" subtitle="Manage your personal information and preferences." />
      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
          style={{ background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff", zIndex:9999 }}>
          ✓ {toast}
        </div>
      )}
      <GlassCard dark={dark} className="p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#3B82F6,#2563EB)", boxShadow:"0 8px 24px rgba(59,130,246,0.4)" }}>
            {currentUser?.initials ?? "??"}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary(dark) }}>{fullName || currentUser?.name || "—"}</h2>
            <p className="text-sm" style={{ color:"#3B82F6" }}>{currentUser?.role ?? "—"} — {department}</p>
            <p className="text-xs mt-1" style={{ color: tokens.textMuted(dark) }}>{location}</p>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background:"rgba(16,185,129,0.12)", color:"#10B981" }}>Active</div>
        </div>
      </GlassCard>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GlassCard dark={dark} className="p-5">
          <SectionHeader dark={dark} title="Personal Information" subtitle="Your profile details"
            action={!editing && <Btn variant="outline" size="sm" onClick={startEdit}>Edit Profile</Btn>} />
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Full Name</label>
              {editing
                ? <input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
                : <input readOnly value={fullName}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={readSt} />}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Email</label>
              <input readOnly value={currentUser?.email ?? ""}
                className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={readSt} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Phone</label>
              {editing
                ? <input value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
                : <input readOnly value={phone}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={readSt} />}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Department</label>
              {editing
                ? <input value={department} onChange={e => setDepartment(e.target.value)}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
                : <input readOnly value={department}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={readSt} />}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>Location / Timezone</label>
              {editing
                ? <input value={location} onChange={e => setLocation(e.target.value)}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
                : <input readOnly value={location}
                    className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={readSt} />}
            </div>
            {editing && (
              <div className="flex gap-2 pt-1">
                <Btn variant="primary" size="sm" onClick={saveEdit}>Save</Btn>
                <Btn variant="outline" size="sm" onClick={cancelEdit}>Cancel</Btn>
              </div>
            )}
          </div>
        </GlassCard>
        <GlassCard dark={dark} className="p-5">
          <SectionHeader dark={dark} title="Recent Activity" subtitle="Your latest actions" />
          <div className="space-y-3 mt-4">
            {activities.length === 0 ? (
              <p className="text-xs" style={{ color: tokens.textMuted(dark) }}>No recent activity found.</p>
            ) : activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background:"rgba(59,130,246,0.1)" }}>
                  <a.icon size={13} style={{ color:"#3B82F6" }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: tokens.textSecondary(dark) }}>{a.action}</p>
                  <p className="text-xs mt-0.5" style={{ color: tokens.textMuted(dark) }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// AUTH UTILITIES — Supabase
// ─────────────────────────────────────────────

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())

const makeInitials = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || "AG"

/** Fetch the profiles row and return the currentUser shape expected by the app */
const fetchProfile = async (authUser) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, email, role, status")
    .eq("id", authUser.id)
    .single()
  if (error || !data) return null
  return {
    id:       authUser.id,
    email:    data.email,
    name:     data.name     || authUser.email,
    initials: makeInitials(data.name || authUser.email),
    role:     data.role     || "Agent",
    status:   data.status   || "active",
  }
}
// ─────────────────────────────────────────────
// ANIMATED LOGIN BACKGROUND
// ─────────────────────────────────────────────
const AnimatedLoginBackground = () => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animId
    let nodes = []

    const COLORS = [
      [99,179,237],[147,197,253],[103,232,249],
      [129,140,248],[165,180,252],[96,165,250],
    ]

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const init = () => {
      nodes = Array.from({ length: 75 }, () => {
        const depth = Math.random()                     // 0=far, 1=close
        const spd   = depth * 0.28 + 0.10              // closer = faster (parallax)
        return {
          x:     Math.random() * canvas.width,
          y:     Math.random() * canvas.height,
          vx:    (Math.random() - 0.5) * spd,
          vy:    (Math.random() - 0.5) * spd,
          r:     depth * 1.9 + 0.55,                   // closer = bigger
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: depth * 0.45 + 0.18,
          phase: Math.random() * Math.PI * 2,
          spd:   Math.random() * 0.016 + 0.003,
        }
      })
    }

    resize()
    init()

    const MAX_DIST = 148
    let t = 0

    const tick = () => {
      t += 1

      // dark trail fill — creates smooth motion blur
      ctx.fillStyle = "rgba(5,10,22,0.86)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // ── connections (drawn first, under nodes) ──────────
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < MAX_DIST) {
            const op = (1 - d / MAX_DIST) * 0.20
            const [r, g, bl] = a.color
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(${r},${g},${bl},${op})`
            ctx.lineWidth   = 0.55
            ctx.stroke()
          }
        }
      }

      // ── nodes ───────────────────────────────────────────
      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1

        const pulse = Math.sin(t * n.spd + n.phase) * 0.18 + 0.82
        const op    = Math.min(1, n.alpha * pulse)
        const [r, g, b] = n.color

        // soft glow halo
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5)
        grd.addColorStop(0, `rgba(${r},${g},${b},${(op * 0.30).toFixed(3)})`)
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // solid core
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${op.toFixed(3)})`
        ctx.fill()
      })

      animId = requestAnimationFrame(tick)
    }

    tick()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        display: "block", zIndex: 0, pointerEvents: "none",
      }}
    />
  )
}
// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)

  const clearMessages = () => { setError(""); setInfo("") }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setName("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    clearMessages()
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    clearMessages()

    if (!isValidEmail(email)) return setError("Please enter a valid email address.")
    if (!password) return setError("Please enter your password.")

    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(error.message || "Unable to sign in."); setLoading(false); return }
    const profile = await fetchProfile(data.user)
    if (!profile) { setError("Profile not found. Contact your administrator."); setLoading(false); return }
    onLogin(profile)
    setLoading(false)
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    clearMessages()

    if (!name.trim()) return setError("Please enter your full name.")
    if (!isValidEmail(email)) return setError("Please enter a valid email address.")
    if (password.length < 8) return setError("Password must be at least 8 characters.")
    if (password !== confirmPassword) return setError("Passwords do not match.")

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) { setError(error.message || "Unable to create account."); setLoading(false); return }
    if (data.session) {
      const profile = await fetchProfile(data.user)
      if (profile) { onLogin(profile); setLoading(false); return }
    }
    setInfo("Account created! Check your email to confirm your address, then sign in.")
    setLoading(false)
  }

  const handleForgotPassword = async (event) => {
    event.preventDefault()
    clearMessages()

    if (!isValidEmail(email)) return setError("Please enter a valid email address.")

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setInfo("Password reset email sent! Check your inbox and follow the link.")
    setLoading(false)
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
  }
  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#e2e8f0",
    outline: "none",
  }
  const labelStyle = { color: "#94a3b8" }
  const primaryStyle = {
    background: "linear-gradient(135deg,#3B82F6,#2563EB)",
    boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        position: "relative", overflow: "hidden",
        fontFamily: "'Inter','Segoe UI',Roboto,Arial,sans-serif",
        background: "radial-gradient(ellipse 90% 70% at 50% 10%, #1a3a5c 0%, #0c1829 52%, #060d18 100%)",
      }}>

      <AnimatedLoginBackground />
      <div className="w-full max-w-md" style={{ position:"relative", zIndex:1 }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)", boxShadow: "0 8px 32px rgba(59,130,246,0.5)" }}>
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28" aria-hidden="true">
              <rect x="2"  y="14" width="4.5" height="8"  rx="1" fill="white" fillOpacity="0.55"/>
              <rect x="9"  y="9"  width="4.5" height="13" rx="1" fill="white" fillOpacity="0.80"/>
              <rect x="16" y="4"  width="4.5" height="18" rx="1" fill="white"/>
              <path d="M4.25 14 L11.25 9 L18.25 4" stroke="white" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5"/>
              <circle cx="18.25" cy="4" r="1.8" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">CSPMS</h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Customer Support Performance Management System</p>
        </div>

        <div className="rounded-2xl p-8" style={cardStyle}>
          <h2 className="text-xl font-bold text-white mb-1">
            {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Forgot Password"}
          </h2>
          <p className="text-sm mb-6" style={labelStyle}>
            {mode === "login" && "Enter your credentials to continue"}
            {mode === "signup" && "Create your CSPMS account"}
            {mode === "forgot" && "Enter your email to request password reset"}
          </p>

          {error && (
            <div className="mb-4 rounded-xl px-4 py-2.5 text-xs"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-xl px-4 py-2.5 text-xs leading-relaxed"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#93c5fd" }}>
              {info}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" className="w-full rounded-xl py-3 px-4 text-sm" style={inputStyle} />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Your password" className="w-full rounded-xl py-3 px-4 pr-14 text-sm" style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "#94a3b8" }}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="flex justify-end mb-5">
                <button type="button" onClick={() => switchMode("forgot")}
                  className="text-xs font-semibold" style={{ color: "#60a5fa" }}>
                  Forgot Password?
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white mb-4 disabled:opacity-70" style={primaryStyle}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="text-center pt-1">
                <span className="text-sm" style={{ color: "#64748b" }}>Don&apos;t have an account? </span>
                <button type="button" onClick={() => switchMode("signup")}
                  className="text-sm font-semibold" style={{ color: "#60a5fa" }}>
                  Create Account
                </button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup}>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" className="w-full rounded-xl py-3 px-4 text-sm" style={inputStyle} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" className="w-full rounded-xl py-3 px-4 text-sm" style={inputStyle} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters" className="w-full rounded-xl py-3 px-4 text-sm" style={inputStyle} />
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" className="w-full rounded-xl py-3 px-4 text-sm" style={inputStyle} />
              </div>
              <div className="mb-5 rounded-xl px-4 py-3 text-xs leading-relaxed"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#86efac" }}>
                Account will be created immediately with Agent access. Higher roles can be added later through real authentication.
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3 disabled:opacity-70" style={primaryStyle}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
              <button type="button" onClick={() => switchMode("login")}
                className="w-full py-2 text-sm" style={{ color: "#94a3b8" }}>
                Back to Sign In
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword}>
              <div className="mb-5">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" className="w-full rounded-xl py-3 px-4 text-sm" style={inputStyle} />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3" style={primaryStyle}>
                Request Password Reset
              </button>
              <button type="button" onClick={() => switchMode("login")}
                className="w-full py-2 text-sm" style={{ color: "#94a3b8" }}>
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "#64748b" }}>
          Secured by Supabase Auth. All sessions are managed server-side.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard")
  const [dark, setDark] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    // Restore session on page load / refresh
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const profile = await fetchProfile(session.user)
        setCurrentUser(profile)
      }
      setAuthLoading(false)
    })
    // Keep session in sync: token refresh + logout from another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const profile = await fetchProfile(session.user)
        setCurrentUser(profile)
      } else {
        setCurrentUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = (profile) => {
    setCurrentUser(profile)
    setPage("dashboard")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setPage("dashboard")
  }

  const handleChangePassword = async (email, currentPassword, newPassword) => {
    // Re-authenticate first to verify the current password
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
    if (authErr) throw new Error("Current password is incorrect.")
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    if (updateErr) throw new Error(updateErr.message)
  }

  const role = currentUser?.role ?? "Agent"

  const navigateTo = (pg) => {
    if (canAccessPage(role, pg)) setPage(pg)
  }

  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)" }}>
      <p style={{ color: "#94a3b8", fontFamily: "'Inter',sans-serif", fontSize: 14 }}>Loading…</p>
    </div>
  )
  if (!currentUser) return <LoginPage onLogin={handleLogin} />

  return (
    <AppLayout dark={dark} setDark={setDark} page={page} setPage={navigateTo}
      currentUser={currentUser} onLogout={handleLogout} tasks={tasks}>
      {page === "dashboard"   && <DashboardPage   dark={dark} currentUser={currentUser} onNavigate={navigateTo} tasks={tasks} />}
      {page === "performance" && <PerformancePage  dark={dark} currentUser={currentUser} />}
      {page === "qa-audits"   && <QAPage           dark={dark} currentUser={currentUser} />}
      {page === "attendance"  && <AttendancePage   dark={dark} currentUser={currentUser} />}
      {page === "tasks"       && <TasksPage        dark={dark} currentUser={currentUser} tasks={tasks} setTasks={setTasks} />}
      {page === "reports"     && <ReportsPage      dark={dark} currentUser={currentUser} />}
      {page === "leaderboard" && <LeaderboardPage  dark={dark} currentUser={currentUser} />}
      {page === "settings"    && <SettingsPage     dark={dark} currentUser={currentUser} onChangePassword={handleChangePassword} />}
      {page === "profile"     && <ProfilePage      dark={dark} currentUser={currentUser} tasks={tasks} />}
    </AppLayout>
  )
}
