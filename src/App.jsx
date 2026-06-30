"use client"
import { useState, useRef, useEffect } from "react"
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
// MOCK AUTH — users, roles, permissions
// ─────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: "Admin User",       initials: "AU", role: "HEAD",      email: "usamaahmed.esire@gmail.com", password: "Admin123"  },
  { id: 2, name: "Team Lead User",   initials: "TL", role: "Team Lead", email: "lead@cspms.com",             password: "Lead123"   },
  { id: 3, name: "Muhammad Junaid",  initials: "MJ", role: "Agent",     email: "hm.junaid.esire@gmail.com",  password: "Agent123"  },
  { id: 4, name: "Anum Aziz",        initials: "AA", role: "Agent",     email: "anum.esire@gmail.com",       password: "Agent123"  },
  { id: 5, name: "Sufiyan Merchant", initials: "SM", role: "Agent",     email: "sufiyan.esire@gmail.com",    password: "Agent123"  },
  { id: 6, name: "Adeel Hyder",      initials: "AH", role: "Agent",     email: "adeel.esire@gmail.com",      password: "Agent123"  },
]

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
    pages:            ["dashboard","performance","qa-audits","attendance","tasks","profile"],
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
  csat:        { value: 4.7,  change: +0.3,  unit: "/5", label: "CSAT Score"      },
  qa:          { value: 92.1, change: +1.8,  unit: "%",  label: "QA Score"        },
  attendance:  { value: 96.5, change: -0.5,  unit: "%",  label: "Attendance Rate" },
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
    { month: "Jan", csat: 4.2 }, { month: "Feb", csat: 4.3 },
    { month: "Mar", csat: 4.4 }, { month: "Apr", csat: 4.5 },
    { month: "May", csat: 4.4 }, { month: "Jun", csat: 4.7 },
  ]
  const qaTrend = [
    { month: "Jan", qa: 88 }, { month: "Feb", qa: 86 },
    { month: "Mar", qa: 89 }, { month: "Apr", qa: 91 },
    { month: "May", qa: 90 }, { month: "Jun", qa: 92 },
  ]
  return { weeklyPerformance, monthlyKPI, emailsVsChats, csatTrend, qaTrend }
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
    { rank: 1, agent: "Muhammad Junaid",  kpi: 87.4, emails: 112, chats: 14, csat: 4.8, qa: 94, date: "2026-06-29" },
    { rank: 2, agent: "Anum Aziz",        kpi: 82.1, emails: 98,  chats: 11, csat: 4.7, qa: 88, date: "2026-06-29" },
    { rank: 3, agent: "Sufiyan Merchant", kpi: 79.6, emails: 105, chats: 12, csat: 4.6, qa: 85, date: "2026-06-29" },
    { rank: 4, agent: "Adeel Hyder",      kpi: 74.3, emails: 88,  chats:  9, csat: 4.5, qa: 80, date: "2026-06-29" },
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
  dashboard:   { showExport:true,  exportLabel:"Export Report",    fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Agent",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"channel",label:"Channel",type:"channel" }] },
  performance: { showExport:true,  exportLabel:"Export",           fields:[{ key:"from",label:"From",type:"daterange" },{ key:"to",label:"To",type:"daterange" },{ key:"agent",label:"Agent",type:"select",options:FC_AGENTS,defaultValue:"all" },{ key:"kpiType",label:"KPI Type",type:"select",options:FC_KPI_TYPES,defaultValue:"all" },{ key:"channel",label:"Channel",type:"channel" }] },
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
const applyFilters = (items, filters) => {
  if (!items || !items.length) return items
  const { from, to, agent, channel, status, priority, search } = filters || {}
  const norm = (s) => (s ?? "").toLowerCase().replace(/[-\s]+/g, "-")

  return items.filter(item => {
    const itemDate = item.date || item.due || ""
    if (from && itemDate && itemDate < from) return false
    if (to   && itemDate && itemDate > to)   return false

    if (agent && agent !== "all") {
      const nameField = item.agent || item.agentName || item.assignee || ""
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
  const c = map[variant.toLowerCase()] || map.default
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  )
}

const Avatar = ({ name, size = "md" }) => {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const colors   = ["#3B82F6","#10B981","#8B5CF6","#F59E0B","#F43F5E","#06B6D4","#EC4899"]
  const bg       = colors[name.charCodeAt(0) % colors.length]
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

const KPICard = ({ label, value, unit, change, icon: Icon, color = "blue", dark }) => {
  const pos = change >= 0
  const pal = PALETTE[color]
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
      <p className="text-2xl font-extrabold" style={{ color: tokens.textPrimary(dark) }}>
        {value}{unit}
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
  const set   = (k, v) => setValues(p => ({ ...p, [k]: v }))
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
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: lc }}>Search</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onFilter?.({ ...values, search })}
            placeholder="Search records..."
            className="text-xs rounded-xl outline-none py-2 px-3"
            style={{ ...inp, minWidth: 160 }} />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button onClick={() => onFilter?.({ ...values, search })}
            style={{ background:"linear-gradient(135deg,#3B82F6,#2563EB)", color:"#fff", boxShadow:"0 4px 12px rgba(59,130,246,0.35)" }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl">
            <Filter size={11} />Filter
          </button>
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
        <YAxis domain={[3.5,5]} tick={axisStyle(dark)} axisLine={false} tickLine={false} />
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
              <td className="py-2.5 pr-4"><Badge label={row.status} variant={row.status.toLowerCase()} /></td>
              <td className="py-2.5 text-xs" style={{ color: tokens.textMuted(dark) }}>{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    )}
  </GlassCard>
)

const LeaderboardTable = ({ data, dark }) => {
  const medals = ["🥇","🥈","🥉","4","5"]
  return (
    <GlassCard dark={dark} className="p-5">
      <SectionHeader title="Leaderboard" subtitle="Top performers this month" dark={dark}
        action={<button className="text-xs font-semibold" style={{ color: "#3B82F6" }}>Full View →</button>} />
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
              <p className="text-xs" style={{ color: tokens.textSecondary(dark) }}>CSAT {row.csat} · QA {row.qa}%</p>
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

const PendingTasksTable = ({ data, dark }) => (
  <GlassCard dark={dark} className="p-5">
    <SectionHeader title="Pending Tasks" subtitle="Tasks requiring attention" dark={dark}
      action={<button className="text-xs font-semibold" style={{ color: "#3B82F6" }}>View All →</button>} />
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

const NOTIFICATIONS = [
  { id: 1, text: "QA Audit completed — Muhammad Junaid scored 94%",  time: "5m ago",  unread: true,  page: "qa-audits"   },
  { id: 2, text: "Sufiyan Merchant QA score below threshold (62%)",  time: "1h ago",  unread: true,  page: "performance" },
  { id: 3, text: "Monthly performance report is ready to review",    time: "3h ago",  unread: false, page: "reports"     },
]

const TopNav = ({ dark, setDark, page, setPage, currentUser, onLogout }) => {
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [profilOpen, setProfilOpen] = useState(false)
  const [notifs,     setNotifs]     = useState(NOTIFICATIONS)
  const notifRef = useRef(null)
  const close = () => { setNotifOpen(false); setProfilOpen(false) }
  const role   = currentUser?.role ?? ""
  const initials = currentUser?.initials ?? "??"
  const userName  = currentUser?.name  ?? "User"

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

  const handleLogout = () => { close(); onLogout?.() }

  return (
    <div className="h-16 flex items-center px-6 gap-3 flex-shrink-0 relative" style={{ ...tokens.topnav(dark), zIndex: 50 }}>
      <p className="flex-1 text-base font-bold" style={{ color: tokens.textPrimary(dark) }}>
        {PAGE_LABELS[page] || "Dashboard"}
      </p>

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search size={13} className="absolute left-3" style={{ color: tokens.textMuted(dark) }} />
        <input placeholder="Search agents, audits, tasks…"
          className="pl-9 pr-4 py-2 text-sm rounded-xl outline-none w-56"
          style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)", color: tokens.textPrimary(dark) }} />
      </div>

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
            {notifs.map(n => (
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
      <div className="relative" style={{ zIndex: 200 }}>
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
const AppLayout = ({ dark, setDark, page, setPage, currentUser, onLogout, children }) => {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: dark ? "#0a0f1e" : "#f0f4f8", fontFamily: "'Inter',sans-serif" }}>
      <Sidebar page={page} setPage={setPage} dark={dark}
        collapsed={collapsed} setCollapsed={setCollapsed} currentUser={currentUser} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav dark={dark} setDark={setDark} page={page} setPage={setPage}
          currentUser={currentUser} onLogout={onLogout} />
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
const DashboardPage = ({ dark, currentUser }) => {
  const kpi    = useKPIData()
  const charts = useChartData()
  const tables = useTableData()
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)

  const activeAgent = effectiveFilters.agent && effectiveFilters.agent !== "all" ? effectiveFilters.agent : null
  const agentKpi    = activeAgent ? AGENT_KPI_MOCK[activeAgent] : null

  const cards = [
    { ...(agentKpi?.overallKPI ?? kpi.overallKPI), icon: Target,       color: "blue"    },
    { ...(agentKpi?.emails     ?? kpi.emails),     icon: Mail,          color: "cyan"    },
    { ...(agentKpi?.chats      ?? kpi.chats),      icon: MessageSquare, color: "purple"  },
    { ...(agentKpi?.csat       ?? kpi.csat),       icon: Star,          color: "amber"   },
    { ...(agentKpi?.qa         ?? kpi.qa),         icon: Shield,        color: "emerald" },
    { ...(agentKpi?.attendance ?? kpi.attendance), icon: UserCheck,     color: "rose"    },
  ]

  const filtActivities  = filterData(tables.recentActivities)
  const filtAudits      = filterData(tables.latestAudits)
  const filtLeaderboard = filterData(tables.leaderboard)
  const filtTasks       = filterData(tables.pendingTasks)
  const allEmpty        = filtActivities.length === 0 && filtAudits.length === 0 && filtLeaderboard.length === 0 && filtTasks.length === 0
  const hasFilters      = Object.values(effectiveFilters).some(v => v && v !== "all" && v !== "")

  return (
    <div>
      <PageHeader dark={dark} title="Dashboard"
        subtitle={`Welcome back, ${currentUser?.name ?? ""}! Here's your team's performance overview.`}
        actions={<Btn variant="primary" icon={Download} onClick={() => downloadCSV([...filtActivities, ...filtAudits], "dashboard.csv")}>Export</Btn>} />

      <PageFilterBar config={FILTER_CONFIGS.dashboard} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV([...filtActivities, ...filtAudits], "dashboard.csv")} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        {cards.map((c, i) => <KPICard key={i} {...c} dark={dark} />)}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WeeklyPerfChart data={charts.weeklyPerformance} dark={dark} />
        <MonthlyKPIChart data={charts.monthlyKPI}        dark={dark} />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <EmailsVsChatsChart data={charts.emailsVsChats} dark={dark} />
        <CSATTrendChart      data={charts.csatTrend}     dark={dark} />
        <QATrendChart        data={charts.qaTrend}        dark={dark} />
      </div>

      {hasFilters && allEmpty ? (
        <GlassCard dark={dark} className="p-5 mb-4">
          <EmptyState dark={dark} title="No records found for selected filters"
            description="Try adjusting your date range, agent, channel, or search term."
            icon={<Filter size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />} />
        </GlassCard>
      ) : (
        <>
          {/* Tables row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <RecentActivitiesTable data={filtActivities} dark={dark} />
            <LatestAuditsTable     data={filtAudits}     dark={dark} />
          </div>

          {/* Tables row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LeaderboardTable  data={filtLeaderboard} dark={dark} />
            <PendingTasksTable data={filtTasks}        dark={dark} />
          </div>
        </>
      )}
    </div>
  )
}

// PERFORMANCE ——————————————————————————————————
const PerformancePage = ({ dark, currentUser }) => {
  const charts = useChartData()
  const kpi    = useKPIData()
  const { agentLock, effectiveFilters, handleFilter, handleReset } = usePageFilters(currentUser)

  const activeAgent = effectiveFilters.agent && effectiveFilters.agent !== "all" ? effectiveFilters.agent : null
  const agentKpi    = activeAgent ? AGENT_KPI_MOCK[activeAgent] : null

  const cards = [
    { ...(agentKpi?.overallKPI ?? kpi.overallKPI), icon: Target, color: "blue"    },
    { ...(agentKpi?.emails     ?? kpi.emails),     icon: Mail,   color: "cyan"    },
    { ...(agentKpi?.csat       ?? kpi.csat),       icon: Star,   color: "amber"   },
    { ...(agentKpi?.qa         ?? kpi.qa),         icon: Shield, color: "emerald" },
  ]
  return (
    <div>
      <PageHeader dark={dark} title="Performance" subtitle="Detailed agent performance analysis and trends."
        actions={<Btn variant="primary" icon={Plus}>Add Metric</Btn>} />
      <PageFilterBar config={FILTER_CONFIGS.performance} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset} onExport={() => {}} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {cards.map((c, i) => <KPICard key={i} {...c} dark={dark} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <WeeklyPerfChart data={charts.weeklyPerformance} dark={dark} />
        <MonthlyKPIChart data={charts.monthlyKPI}        dark={dark} />
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

  const filtAudits = filterData(latestAudits)
  const passCount  = filtAudits.filter(a => a.status === "Pass").length
  const avgScore   = filtAudits.length ? Math.round(filtAudits.reduce((s,a) => s + a.score, 0) / filtAudits.length * 10) / 10 : 88.2
  const passRate   = filtAudits.length ? Math.round(passCount / filtAudits.length * 100) : 87

  const stats = [
    { label: "Total Audits",   value: filtAudits.length ? String(filtAudits.length) : "142", icon: ClipboardCheck, color: "#3B82F6" },
    { label: "Pass Rate",      value: `${passRate}%`,  icon: CheckCircle,    color: "#10B981" },
    { label: "Avg Score",      value: `${avgScore}%`,  icon: Star,           color: "#F59E0B" },
    { label: "Pending Review", value: "14",            icon: Clock,          color: "#8B5CF6" },
  ]
  return (
    <div>
      <PageHeader dark={dark} title="QA Audits" subtitle="Quality assurance audit management and tracking."
        actions={<Btn variant="primary" icon={Plus}>New Audit</Btn>} />
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
const TasksPage = ({ dark, currentUser }) => {
  const { pendingTasks } = useTableData()
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)

  const allFiltered = filterData(pendingTasks)
  const byStatus = (s) => allFiltered.filter(t => t.status === s)

  const cols = [
    { label: "Pending",     color: "#F59E0B", tasks: byStatus("Pending")     },
    { label: "In Progress", color: "#3B82F6", tasks: byStatus("In Progress") },
    { label: "Completed",   color: "#10B981", tasks: byStatus("Completed")   },
  ]

  return (
    <div>
      <PageHeader dark={dark} title="Tasks" subtitle="Manage and track team tasks and assignments."
        actions={<Btn variant="primary" icon={Plus}>New Task</Btn>} />
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
              </div>
            ))}
          </GlassCard>
        ))}
      </div>
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
  const { agentLock, effectiveFilters, handleFilter, handleReset, filterData } = usePageFilters(currentUser)
  const filtLeaderboard = filterData(leaderboard)
  const medals = ["🥇","🥈","🥉","4","5"]
  return (
    <div>
      <PageHeader dark={dark} title="Leaderboard" subtitle="Top performing agents ranked by overall KPI this month." />
      <PageFilterBar config={FILTER_CONFIGS.leaderboard} dark={dark} agentLock={agentLock}
        onFilter={handleFilter} onReset={handleReset}
        onExport={() => downloadCSV(filtLeaderboard, "leaderboard.csv")} />
      {filtLeaderboard.length === 0 ? (
        <GlassCard dark={dark} className="p-5 mb-4">
          <EmptyState dark={dark} title="No agents found for selected filters"
            description="Try adjusting your filters or clicking Reset."
            icon={<Filter size={24} style={{ color: dark ? "#475569" : "#94a3b8" }} />} />
        </GlassCard>
      ) : (<>
      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {filtLeaderboard.slice(0,3).map((agent, i) => (
          <GlassCard key={i} dark={dark} className="p-6 text-center"
            style={i === 0 ? { boxShadow: "0 0 0 2px #3B82F6, 0 8px 32px rgba(59,130,246,0.2)" } : {}}>
            <div className="text-3xl mb-3">{medals[i]}</div>
            <div className="flex justify-center mb-3"><Avatar name={agent.agent} size="lg" /></div>
            <p className="text-base font-extrabold mb-0.5" style={{ color: tokens.textPrimary(dark) }}>{agent.agent}</p>
            <p className="text-2xl font-black" style={{ color: "#3B82F6" }}>{agent.kpi}%</p>
            <p className="text-xs mb-3" style={{ color: tokens.textSecondary(dark) }}>Overall KPI</p>
            <div className="flex justify-center gap-6">
              {[["CSAT", agent.csat], ["QA", `${agent.qa}%`], ["Emails", agent.emails]].map(([lbl, val]) => (
                <div key={lbl}>
                  <p className="text-sm font-bold" style={{ color: tokens.textPrimary(dark) }}>{val}</p>
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
              {filtLeaderboard.map((row, i) => (
                <tr key={row.rank} style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"}` }}>
                  <td className="py-3 pr-4 text-lg">{medals[i]}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.agent} size="sm" />
                      <span className="text-sm font-semibold" style={{ color: tokens.textPrimary(dark) }}>{row.agent}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm font-extrabold" style={{ color: "#3B82F6" }}>{row.kpi}%</span>
                  </td>
                  <td className="py-3 pr-4 text-sm" style={{ color: tokens.textSecondary(dark) }}>{row.emails}</td>
                  <td className="py-3 pr-4 text-sm" style={{ color: tokens.textSecondary(dark) }}>{row.chats}</td>
                  <td className="py-3 pr-4 text-sm" style={{ color: tokens.textSecondary(dark) }}>{row.csat}</td>
                  <td className="py-3 text-sm font-bold" style={{ color: row.qa >= 90 ? "#10B981" : "#F59E0B" }}>{row.qa}%</td>
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
  const [activeTab, setActiveTab]     = useState("General")
  const [kpiMetrics, setKpiMetrics]   = useState(KPI_METRICS_CONFIG)
  const [permissions, setPermissions] = useState(INIT_PERMISSIONS)
  // ── change password state ──────────────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew,     setPwNew]     = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwError,   setPwError]   = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)
  const handleChangePw = () => {
    setPwSuccess(false)
    if (!pwCurrent)                   { setPwError("Current password is required."); return }
    if (pwNew.length < 8)             { setPwError("New password must be at least 8 characters."); return }
    if (pwNew !== pwConfirm)          { setPwError("Passwords do not match."); return }
    if (!currentUser?.email)          { setPwError("No user session found."); return }
    if (pwCurrent !== currentUser.password) { setPwError("Current password is incorrect."); return }
    setPwError("")
    onChangePassword?.(currentUser.email, pwCurrent, pwNew)
    setPwCurrent(""); setPwNew(""); setPwConfirm("")
    setPwSuccess(true)
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
          action={<Btn variant="primary" size="sm">Save Configuration</Btn>} />
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
          action={<Btn variant="primary" size="sm">Save Permissions</Btn>} />
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

    // ── General / fallback placeholder ────────────────────
    return (
      <GlassCard dark={dark} className="p-5">
        <SectionHeader dark={dark} title={activeTab} subtitle={`Configure ${activeTab.toLowerCase()} settings`}
          action={<Btn variant="primary" size="sm">Save Changes</Btn>} />
        <div className="space-y-4 mt-4">
          {[
            ["Display Name", currentUser?.name  ?? "Admin User"],
            ["Email",        currentUser?.email ?? ""],
            ["Timezone",     "UTC+5 Karachi"],
            ["Language",     "English (US)"],
          ].map(([lbl,val]) => (
            <div key={lbl}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>{lbl}</label>
              <input defaultValue={val} className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  return (
    <div>
      <PageHeader dark={dark} title="Settings" subtitle="Manage your workspace preferences and configurations."
        actions={<Btn variant="primary" icon={Shield}>Save All</Btn>} />
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
const ProfilePage = ({ dark, currentUser }) => {
  const stats = [
    { label:"QA Score",    value:"91.2%", icon:Star,         color:"#F59E0B" },
    { label:"Audits Done", value:"148",   icon:ClipboardCheck,color:"#3B82F6" },
    { label:"Attendance",  value:"96%",   icon:UserCheck,    color:"#10B981" },
    { label:"Tasks Done",  value:"243",   icon:CheckSquare,  color:"#8B5CF6" },
  ]
  const activities = [
    { action:"Completed QA audit — Muhammad Junaid scored 94%", time:"2h ago", icon:ClipboardCheck },
    { action:"Updated KPI configuration",            time:"5h ago", icon:Settings       },
    { action:"Reviewed 12 email tickets",            time:"1d ago", icon:Mail           },
    { action:"Team meeting — performance review",    time:"2d ago", icon:Star           },
  ]
  const inputSt = {
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
    color: tokens.textPrimary(dark),
    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.25)"}`,
  }
  return (
    <div>
      <PageHeader dark={dark} title="My Profile" subtitle="Manage your personal information and preferences."
        actions={<Btn variant="primary" icon={User}>Save Profile</Btn>} />
      <GlassCard dark={dark} className="p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#3B82F6,#2563EB)", boxShadow:"0 8px 24px rgba(59,130,246,0.4)" }}>
            {currentUser?.initials ?? "??"}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary(dark) }}>{currentUser?.name ?? "—"}</h2>
            <p className="text-sm" style={{ color:"#3B82F6" }}>{currentUser?.role ?? "—"} — Customer Support</p>
            <p className="text-xs mt-1" style={{ color: tokens.textMuted(dark) }}>Karachi, PK</p>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background:"rgba(16,185,129,0.12)", color:"#10B981" }}>Active</div>
        </div>
      </GlassCard>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <GlassCard key={s.label} dark={dark} className="p-4 text-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ background:`${s.color}20` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <p className="text-lg font-bold" style={{ color: tokens.textPrimary(dark) }}>{s.value}</p>
            <p className="text-xs" style={{ color: tokens.textMuted(dark) }}>{s.label}</p>
          </GlassCard>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GlassCard dark={dark} className="p-5">
          <SectionHeader dark={dark} title="Personal Information" subtitle="Update your profile details" />
          <div className="space-y-4 mt-4">
            {[
              ["Full Name",  currentUser?.name  ?? ""],
              ["Email",      currentUser?.email ?? ""],
              ["Phone",      "+92 300 0000000"],
              ["Department", "Customer Support"],
            ].map(([lbl,val]) => (
              <div key={lbl}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.textMuted(dark) }}>{lbl}</label>
                <input defaultValue={val} className="w-full text-xs rounded-xl outline-none py-2.5 px-3" style={inputSt} />
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard dark={dark} className="p-5">
          <SectionHeader dark={dark} title="Recent Activity" subtitle="Your latest actions" />
          <div className="space-y-3 mt-4">
            {activities.map((a, i) => (
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
// LOGIN PAGE
// ─────────────────────────────────────────────
// ─── LoginShell — defined OUTSIDE LoginPage to prevent remount on re-render ───
const LoginShell = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)" }}>
    <div className="w-full max-w-md px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)", boxShadow: "0 8px 32px rgba(59,130,246,0.5)" }}>
          <BarChart2 size={28} color="#fff" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">CSPMS</h1>
        <p className="text-sm" style={{ color: "#94a3b8" }}>Customer Support Performance Management</p>
      </div>
      {children}
    </div>
  </div>
)

const LoginPage = ({ onLogin, onSignUp, users = MOCK_USERS }) => {
  // ── mode: "login" | "signup" | "done" ──────────────────────────────────────
  const [mode,          setMode]          = useState("login")

  // ── login fields ────────────────────────────────────────────────────────────
  const [loginEmail,    setLoginEmail]    = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError,    setLoginError]    = useState("")
  const [showDemo,      setShowDemo]      = useState(false)

  // ── signup fields — separate state vars to prevent focus loss ───────────────
  const [signupName,     setSignupName]     = useState("")
  const [signupEmail,    setSignupEmail]    = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirm,  setSignupConfirm]  = useState("")
  const [signupError,    setSignupError]    = useState("")
  // ── forgot password fields ───────────────────────────────────────────────────
  const [forgotEmail,    setForgotEmail]    = useState("")
  const [forgotSent,     setForgotSent]     = useState(false)

  // ── shared styles ────────────────────────────────────────────────────────────
  const cardStyle = { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" }
  const inpStyle  = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", outline: "none" }
  const lblStyle  = { color: "#94a3b8" }
  const btnPrimary = { background: "linear-gradient(135deg,#3B82F6,#2563EB)", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }

  // ── login handler ────────────────────────────────────────────────────────────
  const handleLogin = () => {
    const match = users.find(
      u => u.email.toLowerCase() === loginEmail.trim().toLowerCase() && u.password === loginPassword
    )
    if (!match) { setLoginError("Invalid email or password."); return }
    setLoginError("")
    onLogin?.(match)
  }

  const handleDemoLogin = (role) => {
    const user = MOCK_USERS.find(u => u.role === role)
    if (user) onLogin?.(user)
  }

  // ── signup handler ───────────────────────────────────────────────────────────
  const handleSignUp = () => {
    if (!signupName.trim())               { setSignupError("Full name is required."); return }
    if (!signupEmail.trim())              { setSignupError("Email is required."); return }
    if (!signupPassword)                  { setSignupError("Password is required."); return }
    if (signupPassword.length < 6)        { setSignupError("Password must be at least 6 characters."); return }
    if (signupPassword !== signupConfirm) { setSignupError("Passwords do not match."); return }
    setSignupError("")
    const parts    = signupName.trim().split(" ")
    const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "AG"
    onSignUp?.({ id: Date.now(), name: signupName.trim(), initials, role: "Agent", email: signupEmail.trim(), status: "pending" })
    setMode("done")
  }

  // ── forgot password — done screen ───────────────────────────────────────────
  if (mode === "forgot-done") return (
    <LoginShell>
      <div className="rounded-2xl p-8 text-center" style={cardStyle}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(59,130,246,0.12)" }}>
          <Mail size={26} color="#3B82F6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check Your Email</h2>
        <div className="rounded-xl px-4 py-3 my-4 text-sm"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#93c5fd" }}>
          If this email exists, password reset instructions have been sent.
        </div>
        <button type="button"
          onClick={() => { setMode("login"); setForgotEmail(""); setForgotSent(false) }}
          className="w-full py-3 rounded-xl text-sm font-bold text-white" style={btnPrimary}>
          Back to Sign In
        </button>
      </div>
    </LoginShell>
  )

  // ── forgot password — form ────────────────────────────────────────────────────
  if (mode === "forgot") return (
    <LoginShell>
      <div className="rounded-2xl p-8" style={cardStyle}>
        <h2 className="text-xl font-bold text-white mb-1">Forgot Password</h2>
        <p className="text-sm mb-6" style={lblStyle}>Enter your email and we&apos;ll send reset instructions.</p>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Email Address</label>
          <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
            placeholder="you@cspms.com"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle}
            onKeyDown={e => e.key === "Enter" && (setMode("forgot-done"))} />
        </div>

        <button type="button" onClick={() => setMode("forgot-done")}
          className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3" style={btnPrimary}>
          Send Reset Instructions
        </button>
        <button type="button" onClick={() => { setMode("login"); setForgotEmail("") }}
          className="w-full py-2 text-sm" style={{ color: "#94a3b8" }}>
          ← Back to Sign In
        </button>
      </div>
    </LoginShell>
  )

  // ── success screen ───────────────────────────────────────────────────────────
  if (mode === "done") return (
    <LoginShell>
      <div className="rounded-2xl p-8 text-center" style={cardStyle}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(16,185,129,0.15)" }}>
          <CheckCircle size={28} color="#10B981" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Account Requested</h2>
        <div className="rounded-xl px-4 py-3 my-4 text-sm"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#93c5fd" }}>
          Account created. Admin approval is required before access.
        </div>
        <button type="button"
          onClick={() => { setMode("login"); setSignupName(""); setSignupEmail(""); setSignupPassword(""); setSignupConfirm("") }}
          className="w-full py-3 rounded-xl text-sm font-bold text-white" style={btnPrimary}>
          Back to Sign In
        </button>
      </div>
    </LoginShell>
  )

  // ── signup form ──────────────────────────────────────────────────────────────
  if (mode === "signup") return (
    <LoginShell>
      <div className="rounded-2xl p-8" style={cardStyle}>
        <h2 className="text-xl font-bold text-white mb-1">Create Account</h2>
        <p className="text-sm mb-6" style={lblStyle}>New accounts are assigned Agent role by default.</p>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Full Name</label>
          <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)}
            placeholder="Muhammad Junaid"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle} />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Email</label>
          <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle} />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Password</label>
          <input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle} />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Confirm Password</label>
          <input type="password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)}
            placeholder="Re-enter password"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle} />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Role Request</label>
          <div className="w-full rounded-xl py-3 px-4 text-sm flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.7 }}>
            <Shield size={14} color="#94a3b8" />
            <span style={{ color: "#94a3b8" }}>Agent — HEAD assigns higher roles</span>
          </div>
        </div>

        {signupError && (
          <div className="mb-4 rounded-xl px-4 py-2.5 text-xs"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            {signupError}
          </div>
        )}

        <button type="button" onClick={handleSignUp}
          className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3" style={btnPrimary}>
          Create Account
        </button>
        <button type="button" onClick={() => { setMode("login"); setSignupError("") }}
          className="w-full py-2 text-sm" style={{ color: "#94a3b8" }}>
          ← Back to Sign In
        </button>
      </div>
    </LoginShell>
  )

  // ── login screen ─────────────────────────────────────────────────────────────
  return (
    <LoginShell>
      <div className="rounded-2xl p-8" style={cardStyle}>
        <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
        <p className="text-sm mb-6" style={lblStyle}>Enter your credentials to continue</p>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Email</label>
          <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
            placeholder="you@cspms.com"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div className="mb-2">
          <label className="block text-xs font-semibold mb-1.5" style={lblStyle}>Password</label>
          <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
            placeholder="Your password"
            className="w-full rounded-xl py-3 px-4 text-sm" style={inpStyle}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div className="flex justify-end mb-5">
          <button type="button" onClick={() => { setMode("forgot"); setLoginError("") }}
            className="text-xs font-semibold" style={{ color: "#3B82F6" }}>
            Forgot Password?
          </button>
        </div>

        {loginError && (
          <div className="mb-4 rounded-xl px-4 py-2.5 text-xs"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            {loginError}
          </div>
        )}

        <button type="button" onClick={handleLogin}
          className="w-full py-3 rounded-xl text-sm font-bold text-white mb-4" style={btnPrimary}>
          Sign In
        </button>

        {/* Demo login — hidden by default */}
        <div className="mb-4">
          <button type="button" onClick={() => setShowDemo(d => !d)}
            className="w-full py-2 text-xs rounded-xl transition-all"
            style={{ color: "#64748b", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
            {showDemo ? "Hide Demo Login ↑" : "Use Demo Login ↓"}
          </button>
          {showDemo && (
            <div className="mt-2 space-y-2">
              {[
                { label: "HEAD Demo",      role: "HEAD" },
                { label: "Team Lead Demo", role: "Team Lead" },
                { label: "Agent Demo",     role: "Agent"     },
              ].map(d => (
                <button key={d.role} type="button" onClick={() => handleDemoLogin(d.role)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-left transition-all"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", color: "#93c5fd" }}>
                  <span className="font-semibold">{d.label}</span>
                  <span className="text-xs" style={{ color: "#64748b" }}>{d.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center pt-1">
          <span className="text-sm" style={{ color: "#64748b" }}>Don&apos;t have an account? </span>
          <button type="button" onClick={() => { setMode("signup"); setLoginError("") }}
            className="text-sm font-semibold" style={{ color: "#3B82F6" }}>
            Create Account
          </button>
        </div>
      </div>
    </LoginShell>
  )
}
// ─────────────────────────────────────────────
// ROOT APP — standalone preview (state routing)
// ─────────────────────────────────────────────
export default function App() {
  const [page,         setPage]         = useState("dashboard")
  const [dark,         setDark]         = useState(false)
  const [currentUser,  setCurrentUser]  = useState(null)
  const [pendingUsers, setPendingUsers] = useState([])
  const [userStore,    setUserStore]    = useState([...MOCK_USERS])  // mutable auth store

  const handleLogin   = (user) => { setCurrentUser(user); setPage("dashboard") }
  const handleLogout  = ()     => { setCurrentUser(null); setPage("dashboard") }
  const handleSignUp  = (newUser) => setPendingUsers(prev => [...prev, newUser])
  const handleChangePassword = (email, currentPwd, newPwd) => {
    setUserStore(prev => prev.map(u =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === currentPwd
        ? { ...u, password: newPwd } : u
    ))
    setCurrentUser(prev =>
      prev?.email.toLowerCase() === email.toLowerCase() ? { ...prev, password: newPwd } : prev
    )
  }

  const role = currentUser?.role ?? "HEAD"

  const navigateTo = (pg) => {
    if (canAccessPage(role, pg)) setPage(pg)
  }

  if (!currentUser) return <LoginPage onLogin={handleLogin} onSignUp={handleSignUp} users={userStore} />

  return (
    <AppLayout dark={dark} setDark={setDark} page={page} setPage={navigateTo}
      currentUser={currentUser} onLogout={handleLogout}>
      {page === "dashboard"   && <DashboardPage   dark={dark} currentUser={currentUser} />}
      {page === "performance" && <PerformancePage  dark={dark} currentUser={currentUser} />}
      {page === "qa-audits"   && <QAPage           dark={dark} currentUser={currentUser} />}
      {page === "attendance"  && <AttendancePage   dark={dark} currentUser={currentUser} />}
      {page === "tasks"       && <TasksPage        dark={dark} currentUser={currentUser} />}
      {page === "reports"     && <ReportsPage      dark={dark} currentUser={currentUser} />}
      {page === "leaderboard" && <LeaderboardPage  dark={dark} currentUser={currentUser} />}
      {page === "settings"    && <SettingsPage     dark={dark} currentUser={currentUser} onChangePassword={handleChangePassword} />}
      {page === "profile"     && <ProfilePage      dark={dark} currentUser={currentUser} />}
    </AppLayout>
  )
}

// ─────────────────────────────────────────────
// NAMED EXPORTS — for Next.js App Router pages
// ─────────────────────────────────────────────
export {
  useKPIData, useChartData, useTableData,
  AppLayout, Sidebar, TopNav,
  LoginPage,
  DashboardPage, PerformancePage, QAPage,
  AttendancePage, TasksPage, ReportsPage, LeaderboardPage,
  SettingsPage, ProfilePage,
}
