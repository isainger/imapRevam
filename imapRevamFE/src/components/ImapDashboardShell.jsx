import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ThemeToggle from "./ThemeToggle.jsx";
import { fetchDashboardInsights } from "../services/api";
import { fetchIncidentByNumber } from "../services/incidentOperations";

/* ─── Dashboard (design from design-mockup-form-v2.html) — helpers ─── */
function dedupeLatestRows(rows) {
  const map = {};
  for (const inc of rows || []) {
    const key = inc.incident_number;
    if (!key) continue;
    const t = new Date(inc.created_at || inc.updated_at || 0).getTime();
    const ex = map[key];
    const exT = ex
      ? new Date(ex.created_at || ex.updated_at || 0).getTime()
      : 0;
    if (!ex || t >= exT) map[key] = inc;
  }
  return Object.values(map);
}

function normalizeDashStatus(status) {
  if (!status) return "ignore";
  const s = String(status).toLowerCase().trim();
  if (["resolved", "resolved with rca"].includes(s)) return "resolved";
  if (["ongoing", "suspected"].includes(s)) return "ongoing";
  if (s === "not an issue") return "ignore";
  return "ignore";
}

function dashIsKnownIssueYes(raw) {
  return String(raw?.known_issue ?? "")
    .trim()
    .toLowerCase() === "yes";
}

/** Mean hours from start/discovered → resolved (only rows with both timestamps). */
function dashAvgResolveFromRows(rows) {
  const hourSamples = [];
  for (const r of rows || []) {
    if (normalizeDashStatus(r.incident_status) !== "resolved") continue;
    const endRaw = r.resolved_with_rca_time || r.resolved_time;
    const startRaw = r.discovered_time || r.start_time || r.created_at;
    if (!endRaw || !startRaw) continue;
    const end = new Date(endRaw).getTime();
    const start = new Date(startRaw).getTime();
    if (Number.isNaN(end) || Number.isNaN(start) || end <= start) continue;
    hourSamples.push((end - start) / 3600000);
  }
  if (hourSamples.length === 0) return { label: null, samples: 0 };
  const avg =
    hourSamples.reduce((a, b) => a + b, 0) / hourSamples.length;
  let label;
  if (avg < 1) label = `${Math.max(1, Math.round(avg * 60))}m`;
  else if (avg < 72) {
    const h = avg >= 12 ? Math.round(avg) : Math.round(avg * 10) / 10;
    label = `${String(h).replace(/\.0$/, "")}h`;
  } else {
    const d = avg / 24;
    const dv = d >= 10 ? Math.round(d) : Math.round(d * 10) / 10;
    label = `${String(dv).replace(/\.0$/, "")}d`;
  }
  return { label, samples: hourSamples.length };
}

function dashSeverityKey(sev) {
  const x = String(sev || "")
    .toLowerCase()
    .trim();
  if (x === "emergency" || x === "critical") return "emergency";
  if (x === "high") return "high";
  if (x === "standard" || x === "medium") return "standard";
  return "other";
}

function dashSeverityLabel(sev) {
  if (!sev) return "—";
  const x = String(sev).trim();
  if (/^emergency$/i.test(x)) return "Emergency";
  if (/^high$/i.test(x)) return "High";
  if (/^standard$/i.test(x)) return "Standard";
  return x;
}

/** `timeTick` bumps on an interval so callers can recompute “Xm ago” labels. */
function dashFormatRelative(iso, timeTick = 0) {
  if (!iso) return "—";
  void timeTick;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dashFormatDetailDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DashAttentionDetail({ raw }) {
  const displayId =
    raw.display_id != null && raw.display_id !== ""
      ? `INC-${String(raw.display_id).padStart(4, "0")}`
      : "—";
  const pairs = [
    ["Display ID", displayId],
    [
      "Salesforce #",
      raw.incident_number != null ? String(raw.incident_number) : "—",
    ],
    ["Subject", raw.incident_subject || "—"],
    ["Department", raw.departmentName || "—"],
    ["Severity", dashSeverityLabel(raw.severity)],
    ["Status", raw.incident_status || "—"],
    ["Performer", raw.performer ? String(raw.performer).trim() : "—"],
    ["Updated", dashFormatDetailDateTime(raw.updated_at)],
    ["Created", dashFormatDetailDateTime(raw.created_at)],
  ];
  return (
    <div
      className="mt-2 rounded-[10px] border border-[var(--imap-sidebar-border)] bg-[var(--imap-surface-1)] px-3 py-2"
      role="region"
      aria-label="Incident details"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--imap-text-muted)]">
        <i className="fa-solid fa-rectangle-list text-[9px]" />
        Snapshot
      </div>
      <div className="flex flex-col">
        {pairs.map(([k, v]) => (
          <div
            key={k}
            className="flex gap-2 border-b border-[var(--imap-border-muted)] py-1.5 text-[11px] last:border-0"
          >
            <span className="w-[88px] shrink-0 text-[var(--imap-text-muted)]">{k}</span>
            <span className="min-w-0 flex-1 break-words text-right font-medium text-[var(--imap-text-primary)]">
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Value for GET /incidents/:id (Salesforce id, INC-####, or numeric display id). */
function dashIncidentFetchKey(raw) {
  if (!raw) return "";
  if (raw.incident_number != null && String(raw.incident_number).trim() !== "") {
    return String(raw.incident_number).trim();
  }
  if (raw.display_id != null && raw.display_id !== "") {
    return `INC-${String(raw.display_id).padStart(4, "0")}`;
  }
  return "";
}

const DASH_DETAIL_KEY_ORDER = [
  "display_id",
  "incident_number",
  "incident_subject",
  "departmentName",
  "severity",
  "incident_status",
  "performer",
  "incident_link",
  "known_issue",
  "incident_type",
  "reported_by",
  "revenue_impact",
  "revenue_impact_details",
  "affected_product",
  "region_impacted",
  "service_impacted",
  "next_update",
  "workaround",
  "start_time",
  "discovered_time",
  "next_update_time",
  "resolved_time",
  "resolved_with_rca_time",
  "incident_details",
  "status_update_details",
  "workaround_details",
  "resolved_details",
  "resolved_with_rca_details",
  "notification_mails",
  "status_update",
  "created_at",
  "updated_at",
];

/** Never surface in the view modal (internal / noisy). */
const DASH_DETAIL_KEYS_HIDDEN = new Set(["remaining_status", "id"]);

function dashHumanizeDetailKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function dashStripHtmlToText(html) {
  if (typeof html !== "string") return "";
  const t = html.trim();
  if (!t) return "";
  try {
    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(t, "text/html");
      return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
    }
  } catch {
    /* fall through */
  }
  return t.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function dashIsDetailValueEmpty(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === "boolean") return false;
  if (typeof val === "number") return !Number.isFinite(val);
  if (typeof val === "string") {
    const plain = /<[a-z][\s\S]*>/i.test(val)
      ? dashStripHtmlToText(val)
      : val.trim();
    const norm = plain.replace(/\s+/g, " ").trim();
    return norm === "" || norm === "—" || norm === "-" || norm === "–";
  }
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
}

function dashFormatDetailEntry(val) {
  if (val === null || val === undefined) return { text: null, multiline: false };
  if (typeof val === "boolean") {
    return { text: val ? "Yes" : "No", multiline: false };
  }
  if (typeof val === "number" && Number.isFinite(val)) {
    return { text: String(val), multiline: false };
  }
  if (val instanceof Date) {
    return {
      text: dashFormatDetailDateTime(val.toISOString()),
      multiline: false,
    };
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return { text: null, multiline: false };
    if (val.every((x) => typeof x === "string" || typeof x === "number")) {
      const joined = val.map(String).join(", ");
      return {
        text: joined,
        multiline: joined.length > 100 || joined.includes("\n"),
      };
    }
    const lines = val.map((item) => {
      if (item && typeof item === "object" && item.statusName != null) {
        return String(item.statusName);
      }
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });
    const text = lines.join("\n");
    return { text, multiline: lines.length > 1 || text.length > 100 };
  }
  if (typeof val === "object") {
    try {
      const s = JSON.stringify(val, null, 2);
      return { text: s, multiline: s.includes("\n") };
    } catch {
      return { text: String(val), multiline: false };
    }
  }
  const raw = String(val);
  let out = /<[a-z][\s\S]*>/i.test(raw)
    ? dashStripHtmlToText(raw)
    : raw.trim();
  out = out.replace(/\s+/g, " ").trim();
  if (out === "" || out === "—" || out === "-") return { text: null, multiline: false };
  if (/^\d{4}-\d{2}-\d{2}/.test(out) && out.length >= 10) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      out = dashFormatDetailDateTime(raw);
    }
  }
  const multiline = out.includes("\n") || out.length > 120;
  return { text: out, multiline };
}

function dashBuildIncidentDetailEntries(record) {
  if (!record || typeof record !== "object") return [];
  const done = new Set();
  const out = [];

  const pushEntry = (k, val) => {
    if (DASH_DETAIL_KEYS_HIDDEN.has(k)) return;
    if (dashIsDetailValueEmpty(val)) return;
    const { text, multiline } = dashFormatDetailEntry(val);
    if (text == null || String(text).trim() === "") return;
    out.push({
      key: k,
      label: dashHumanizeDetailKey(k),
      value: text,
      multiline,
    });
  };

  for (const k of DASH_DETAIL_KEY_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(record, k)) continue;
    done.add(k);
    pushEntry(k, record[k]);
  }
  const rest = Object.keys(record).filter((x) => !done.has(x)).sort();
  for (const k of rest) {
    pushEntry(k, record[k]);
  }
  return out;
}

function dashDeptPillClass(dept) {
  const d = String(dept || "");
  if (d === "Advertiser")
    return "rounded-[5px] px-2 py-0.5 text-[11px] font-medium bg-[var(--imap-accent-amber-bg)] text-[var(--imap-accent-amber-fg)]";
  if (d === "Publisher")
    return "rounded-[5px] px-2 py-0.5 text-[11px] font-medium bg-[var(--imap-accent-cyan-bg)] text-[var(--imap-accent-cyan-fg)]";
  return "rounded-[5px] px-2 py-0.5 text-[11px] font-medium bg-[var(--imap-accent-violet-bg)] text-[var(--imap-accent-violet-fg)]";
}

function dashSevPillClass(key) {
  if (key === "emergency")
    return "rounded-[5px] border-l-2 border-[#fb7185] px-[9px] py-0.5 text-[11px] font-semibold tracking-wide bg-[var(--imap-accent-rose-bg)] text-[var(--imap-accent-rose-fg)]";
  if (key === "high")
    return "rounded-[5px] border-l-2 border-[#fbbf24] px-[9px] py-0.5 text-[11px] font-semibold tracking-wide bg-[var(--imap-accent-amber-bg)] text-[var(--imap-accent-amber-fg)]";
  if (key === "standard")
    return "rounded-[5px] border-l-2 border-[#0066ff] bg-[rgba(0,102,255,0.1)] px-[9px] py-0.5 text-[11px] font-semibold tracking-wide text-[var(--imap-brand)]";
  return "rounded-[5px] border-l-2 border-[#334155] bg-[rgba(71,85,105,0.1)] px-[9px] py-0.5 text-[11px] font-semibold text-[var(--imap-text-dim)]";
}

function dashStatusPillClass(st) {
  const s = String(st || "");
  if (s === "Ongoing")
    return "rounded-full border border-[rgba(251,191,36,0.35)] px-[9px] py-[3px] text-[11px] font-semibold bg-[var(--imap-accent-amber-bg)] text-[var(--imap-accent-amber-fg)]";
  if (s === "Suspected")
    return "rounded-full border border-[rgba(0,102,255,0.25)] bg-[rgba(0,102,255,0.1)] px-[9px] py-[3px] text-[11px] font-semibold text-[var(--imap-brand)]";
  if (s === "Resolved")
    return "rounded-full border border-[rgba(52,211,153,0.35)] px-[9px] py-[3px] text-[11px] font-semibold bg-[var(--imap-accent-green-bg)] text-[var(--imap-accent-green-fg)]";
  if (s === "Resolved with RCA")
    return "rounded-full border border-[rgba(167,139,250,0.35)] px-[9px] py-[3px] text-[11px] font-semibold bg-[var(--imap-accent-violet-bg)] text-[var(--imap-accent-violet-fg)]";
  return "rounded-full border border-[rgba(71,85,105,0.2)] bg-[rgba(71,85,105,0.18)] px-[9px] py-[3px] text-[11px] font-semibold text-[var(--imap-text-muted)]";
}

const DASH_DONUT_R = 46;
const DASH_DONUT_C = 2 * Math.PI * DASH_DONUT_R;

function DashDonutSvg({ adv, pub, gen }) {
  const t = adv + pub + gen;
  const lenAdv = t ? (adv / t) * DASH_DONUT_C : 0;
  const lenPub = t ? (pub / t) * DASH_DONUT_C : 0;
  const lenGen = t ? (gen / t) * DASH_DONUT_C : 0;
  const pct = (n) => (t ? Math.round((n / t) * 100) : 0);
  return (
    <svg
      className="shrink-0 cursor-pointer"
      width="112"
      height="112"
      viewBox="0 0 120 120"
    >
      <title>{`Total ${t}: Advertiser ${pct(adv)}%, Publisher ${pct(pub)}%, General ${pct(gen)}%`}</title>
      <circle
        cx="60"
        cy="60"
        r={DASH_DONUT_R}
        fill="none"
        stroke="var(--imap-glass-line-strong)"
        strokeWidth="16"
      />
      {t > 0 && lenAdv > 0 && (
        <circle
          cx="60"
          cy="60"
          r={DASH_DONUT_R}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="16"
          strokeDasharray={`${lenAdv} ${DASH_DONUT_C}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-width 0.2s ease" }}
        />
      )}
      {t > 0 && lenPub > 0 && (
        <circle
          cx="60"
          cy="60"
          r={DASH_DONUT_R}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="16"
          strokeDasharray={`${lenPub} ${DASH_DONUT_C}`}
          strokeDashoffset={-lenAdv}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-width 0.2s" }}
        />
      )}
      {t > 0 && lenGen > 0 && (
        <circle
          cx="60"
          cy="60"
          r={DASH_DONUT_R}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="16"
          strokeDasharray={`${lenGen} ${DASH_DONUT_C}`}
          strokeDashoffset={-(lenAdv + lenPub)}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-width 0.2s" }}
        />
      )}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fill="#f1f5f9"
        style={{ fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 800 }}
      >
        {t}
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fill="#64748b"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "9px",
          letterSpacing: "0.5px",
        }}
      >
        TOTAL
      </text>
    </svg>
  );
}

const DASH_HERO_SPK_BLUE = (
  <svg width="72" height="40" viewBox="0 0 72 40" className="opacity-[0.85]">
    <defs>
      <linearGradient id="barSpk1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0066ff" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,34 L8,29 L16,31 L24,20 L32,24 L40,15 L48,18 L56,9 L64,11 L72,4"
      fill="none"
      stroke="#0066ff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0,34 L8,29 L16,31 L24,20 L32,24 L40,15 L48,18 L56,9 L64,11 L72,4 L72,40 L0,40Z"
      fill="url(#barSpk1)"
    />
  </svg>
);
const DASH_HERO_SPK_AMBER = (
  <svg width="72" height="40" viewBox="0 0 72 40" className="opacity-[0.85]">
    <defs>
      <linearGradient id="barSpk2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,22 L8,25 L16,19 L24,27 L32,17 L40,22 L48,13 L56,19 L64,11 L72,15"
      fill="none"
      stroke="#fbbf24"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0,22 L8,25 L16,19 L24,27 L32,17 L40,22 L48,13 L56,19 L64,11 L72,15 L72,40 L0,40Z"
      fill="url(#barSpk2)"
    />
  </svg>
);
const DASH_HERO_SPK_GREEN = (
  <svg width="72" height="40" viewBox="0 0 72 40" className="opacity-[0.85]">
    <defs>
      <linearGradient id="barSpk3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,30 L8,26 L16,22 L24,24 L32,15 L40,18 L48,11 L56,13 L64,7 L72,9"
      fill="none"
      stroke="#34d399"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0,30 L8,26 L16,22 L24,24 L32,15 L40,18 L48,11 L56,13 L64,7 L72,9 L72,40 L0,40Z"
      fill="url(#barSpk3)"
    />
  </svg>
);
const DASH_HERO_SPK_VIOLET = (
  <svg width="72" height="40" viewBox="0 0 72 40" className="opacity-[0.85]">
    <defs>
      <linearGradient id="barSpk4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,13 L8,17 L16,11 L24,15 L32,9 L40,13 L48,7 L56,11 L64,9 L72,5"
      fill="none"
      stroke="#a78bfa"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0,13 L8,17 L16,11 L24,15 L32,9 L40,13 L48,7 L56,11 L64,9 L72,5 L72,40 L0,40Z"
      fill="url(#barSpk4)"
    />
  </svg>
);

const DASH_FILTERS = [
  { id: "all", label: "All" },
  { id: "advertiser", label: "Advertiser" },
  { id: "publisher", label: "Publisher" },
  { id: "general", label: "General" },
  { id: "critical", label: "Emergency" },
  { id: "high", label: "High" },
  { id: "ongoing", label: "Ongoing" },
  { id: "resolved", label: "Resolved" },
];

const DASH_COLS = [
  { key: "id", label: "ID" },
  { key: "incident", label: "Incident" },
  { key: "dept", label: "Dept" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "updated", label: "Updated" },
];

function dashDeptFilterKey(dept) {
  const d = String(dept || "").trim();
  if (d === "Advertiser") return "advertiser";
  if (d === "Publisher") return "publisher";
  return "general";
}

const ImapDashboardShell = forwardRef(function ImapDashboardShell(
  {
    incidents,
    onCreate,
    onUpdate,
    /** Open update flow with incident / display id prefilled (step 1 fetch field). */
    onEditIncident,
    /** When true: left column shows workflow only; dashboard main hidden; form overlay shown. */
    formOpen = false,
    sidebarWorkflow = null,
    formOverlay = null,
    /**
     * Invoked when the user clicks the header brand while a create/update form is open.
     * Parent should run the same discard guard as switching New ↔ Update (`beginFlowSwitch`).
     */
    onBrandClickWhileFormOpen,
  },
  ref,
) {
  /** Multi-select filter pill ids; empty = no extra filters (dashboard shows active-only; All Incidents shows all). */
  const [dashFilterIds, setDashFilterIds] = useState([]);
  /** Pill filters under Active Incidents — shown only after Filters is toggled. */
  const [dashFiltersOpen, setDashFiltersOpen] = useState(false);
  /** Which Monitor nav item is active (drives highlight + scroll actions). */
  const [dashNav, setDashNav] = useState("dashboard");
  const [dashSortCol, setDashSortCol] = useState(null);
  const [dashSortDir, setDashSortDir] = useState(1);
  const [dashPaletteOpen, setDashPaletteOpen] = useState(false);
  const [dashPaletteQ, setDashPaletteQ] = useState("");
  const [dashAiOpen, setDashAiOpen] = useState(false);
  /** Selected incident (Salesforce #) for Needs attention + table highlight (mockup: card expands with data). */
  const [dashAttentionKey, setDashAttentionKey] = useState(null);
  const [dashViewRaw, setDashViewRaw] = useState(null);
  const [dashViewDetail, setDashViewDetail] = useState(null);
  const [dashViewLoading, setDashViewLoading] = useState(false);
  const [dashViewError, setDashViewError] = useState(null);
  const [aiInsightText, setAiInsightText] = useState("");
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightErr, setAiInsightErr] = useState(null);
  const [aiInsightUnconfigured, setAiInsightUnconfigured] = useState(false);
  const [aiInsightDataKey, setAiInsightDataKey] = useState("");
  const [aiInsightTick, setAiInsightTick] = useState(0);
  const [dashTimeTick, setDashTimeTick] = useState(0);
  const forceAiInsightRefreshRef = useRef(false);
  const dashPaletteInputRef = useRef(null);
  const dashScrollAreaRef = useRef(null);
  const dashActiveIncidentsRef = useRef(null);
  const dashAnalyticsRef = useRef(null);

  // Tick every 30 s so relative timestamps ("2m ago") stay live
  useEffect(() => {
    const id = setInterval(() => setDashTimeTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const dashUniqueRaw = useMemo(() => dedupeLatestRows(incidents), [incidents]);

  const dashKnownIssueCount = useMemo(
    () => dashUniqueRaw.filter((r) => dashIsKnownIssueYes(r)).length,
    [dashUniqueRaw],
  );

  const dashAvgResolve = useMemo(
    () => dashAvgResolveFromRows(dashUniqueRaw),
    [dashUniqueRaw],
  );

  const dashDisplayRows = useMemo(() => {
    return dashUniqueRaw.map((r) => {
      const id =
        r.display_id != null
          ? `INC-${String(r.display_id).padStart(4, "0")}`
          : r.incident_number || "—";
      const dept = r.departmentName || "General";
      const sk = dashSeverityKey(r.severity);
      return {
        raw: r,
        id,
        title: r.incident_subject || "(No subject)",
        dept,
        sevKey: sk,
        sev: dashSeverityLabel(r.severity),
        status: r.incident_status || "—",
        updated: dashFormatRelative(r.updated_at || r.created_at, dashTimeTick),
      };
    });
  }, [dashUniqueRaw, dashTimeTick]);

  const dashFiltered = useMemo(() => {
    const ids = dashFilterIds;
    const hasFilters = ids.length > 0;
    const isAll = ids.includes("all");

    let rows = dashDisplayRows;

    // Active-only pre-filter: only when no chips are selected and nav isn't "all_incidents".
    // When any chip is active the chip logic itself decides what statuses are visible.
    if (!hasFilters && dashNav !== "all_incidents") {
      rows = rows.filter((x) => {
        const st = String(x.status || "").trim();
        return st === "Ongoing" || st === "Suspected";
      });
    }

    // "All" chip → no further filtering
    if (!isAll && hasFilters) {
      // Dept: OR within group (Advertiser | Publisher | General)
      const depts = ids.filter((id) =>
        ["advertiser", "publisher", "general"].includes(id),
      );
      if (depts.length > 0) {
        rows = rows.filter((x) => depts.includes(dashDeptFilterKey(x.dept)));
      }

      // Severity: OR within group (Emergency | High)
      const wantsEmergency = ids.includes("critical");
      const wantsHigh = ids.includes("high");
      if (wantsEmergency || wantsHigh) {
        rows = rows.filter(
          (x) =>
            (wantsEmergency && x.sevKey === "emergency") ||
            (wantsHigh && x.sevKey === "high"),
        );
      }

      // Status: OR within group (Ongoing | Resolved) — always applies when chip is active
      const wantOngoing = ids.includes("ongoing");
      const wantResolved = ids.includes("resolved");
      if (wantOngoing || wantResolved) {
        rows = rows.filter((x) => {
          const st = String(x.status || "").trim();
          const ongoingRow = st === "Ongoing" || st === "Suspected";
          const resRow = st.startsWith("Resolved");
          return (wantOngoing && ongoingRow) || (wantResolved && resRow);
        });
      }

      // Known issue: AND with everything else
      if (ids.includes("known_issue")) {
        rows = rows.filter((x) => dashIsKnownIssueYes(x.raw));
      }
    }

    if (dashSortCol) {
      const map = {
        id: "id",
        incident: "title",
        dept: "dept",
        severity: "sev",
        status: "status",
        updated: "updated",
      };
      const k = map[dashSortCol];
      if (k) {
        rows = [...rows].sort(
          (a, b) => String(a[k]).localeCompare(String(b[k])) * dashSortDir,
        );
      }
    }
    return rows;
  }, [dashDisplayRows, dashFilterIds, dashNav, dashSortCol, dashSortDir]);

  const dashStats = useMemo(() => {
    const classified = dashUniqueRaw.map((i) => ({
      ...i,
      ns: normalizeDashStatus(i.incident_status),
    }));
    const valid = classified.filter((i) => i.ns !== "ignore");
    const ongoing = valid.filter((i) => i.ns === "ongoing");
    const resolved = valid.filter((i) => i.ns === "resolved");
    return { total: valid.length, ongoing, resolved };
  }, [dashUniqueRaw]);

  const dashDeptMix = useMemo(() => {
    const t = dashUniqueRaw.length || 1;
    let adv = 0,
      pub = 0,
      gen = 0;
    dashUniqueRaw.forEach((r) => {
      const d = r.departmentName || "General";
      if (d === "Advertiser") adv++;
      else if (d === "Publisher") pub++;
      else gen++;
    });
    const pctAdv = Math.round((adv / t) * 100);
    const pctPub = Math.round((pub / t) * 100);
    return {
      adv: pctAdv,
      pub: pctPub,
      counts: { adv, pub, gen },
    };
  }, [dashUniqueRaw]);

  const dashSevCounts = useMemo(() => {
    const c = { emergency: 0, high: 0, standard: 0, other: 0 };
    dashUniqueRaw.forEach((r) => {
      const k = dashSeverityKey(r.severity);
      if (k === "emergency") c.emergency++;
      else if (k === "high") c.high++;
      else if (k === "standard") c.standard++;
      else c.other++;
    });
    return c;
  }, [dashUniqueRaw]);

  const dashNeedsAttention = useMemo(() => {
    return dashUniqueRaw
      .filter((r) => {
        const st = String(r.incident_status || "");
        const active = st === "Ongoing" || st === "Suspected";
        const sk = dashSeverityKey(r.severity);
        return active && (sk === "emergency" || sk === "high");
      })
      .slice(0, 8);
  }, [dashUniqueRaw]);

  const dashPerformers = useMemo(() => {
    /** Latest activity time per performer + incident count (for display). */
    const latestMs = {};
    const count = {};
    dashUniqueRaw.forEach((r) => {
      const p = r.performer ? String(r.performer).split("(")[0].trim() : "";
      if (!p) return;
      const t = new Date(r.updated_at || r.created_at || 0).getTime();
      if (!Number.isFinite(t)) return;
      count[p] = (count[p] || 0) + 1;
      if (!latestMs[p] || t > latestMs[p]) latestMs[p] = t;
    });
    return Object.keys(latestMs)
      .sort((a, b) => latestMs[b] - latestMs[a])
      .slice(0, 5)
      .map((name) => [name, count[name]]);
  }, [dashUniqueRaw]);

  const dashActivity = useMemo(() => {
    const now = Date.now();
    const windowMs = 48 * 60 * 60 * 1000;
    return [...dashUniqueRaw]
      .filter((r) => {
        const t = new Date(r.updated_at || r.created_at || 0).getTime();
        return Number.isFinite(t) && now - t <= windowMs;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0),
      )
      .slice(0, 15);
  }, [dashUniqueRaw]);

  const dashAiCacheKey = useMemo(() => {
    return dashUniqueRaw
      .map(
        (r) =>
          `${r.incident_number}|${r.updated_at || r.created_at}|${r.incident_status}|${r.severity}`,
      )
      .sort()
      .join(";");
  }, [dashUniqueRaw]);

  const dashAiSnapshot = useMemo(() => {
    const { counts } = dashDeptMix;
    return {
      generatedAt: new Date().toISOString(),
      totals: {
        total: dashStats.total,
        ongoing: dashStats.ongoing.length,
        resolved: dashStats.resolved.length,
      },
      byDepartment: {
        Advertiser: counts.adv,
        Publisher: counts.pub,
        General: counts.gen,
      },
      bySeverity: dashSevCounts,
      needsAttention: dashNeedsAttention.slice(0, 6).map((r) => ({
        id:
          r.display_id != null
            ? `INC-${String(r.display_id).padStart(4, "0")}`
            : String(r.incident_number || ""),
        subject: String(r.incident_subject || "").slice(0, 96),
        department: r.departmentName || "General",
        severity: dashSeverityLabel(r.severity),
        status: r.incident_status || "",
      })),
      performerLoad: dashPerformers.slice(0, 5).map(([name, count]) => ({
        name,
        count,
      })),
      incidents: dashUniqueRaw.slice(0, 22).map((r) => ({
        id:
          r.display_id != null
            ? `INC-${String(r.display_id).padStart(4, "0")}`
            : String(r.incident_number || ""),
        subject: String(r.incident_subject || "(no subject)").slice(0, 80),
        department: r.departmentName || "General",
        severity: dashSeverityLabel(r.severity),
        status: r.incident_status || "",
        performer: r.performer
          ? String(r.performer).split("(")[0].trim()
          : "",
        updatedRelative: dashFormatRelative(
          r.updated_at || r.created_at,
          dashTimeTick,
        ),
      })),
    };
  }, [
    dashUniqueRaw,
    dashStats,
    dashDeptMix,
    dashSevCounts,
    dashNeedsAttention,
    dashPerformers,
    dashTimeTick,
  ]);

  const refreshAiInsights = useCallback(() => {
    forceAiInsightRefreshRef.current = true;
    setAiInsightTick((n) => n + 1);
  }, []);

  const scrollDashEl = useCallback((el) => {
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    if (!dashAiOpen) return;
    const forced = forceAiInsightRefreshRef.current;
    forceAiInsightRefreshRef.current = false;

    if (
      !forced &&
      dashAiCacheKey === aiInsightDataKey &&
      aiInsightText.length > 0
    ) {
      return;
    }

    const ac = new AbortController();
    (async () => {
      setAiInsightLoading(true);
      setAiInsightErr(null);
      setAiInsightUnconfigured(false);
      try {
        const result = await fetchDashboardInsights(dashAiSnapshot, {
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!result.ok) {
          setAiInsightUnconfigured(!result.configured);
          setAiInsightErr(result.error || "Could not load insights");
          setAiInsightText("");
          return;
        }
        setAiInsightText(result.insights || "");
        setAiInsightDataKey(dashAiCacheKey);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setAiInsightErr(e?.message || "Could not load insights");
        setAiInsightText("");
      } finally {
        if (!ac.signal.aborted) setAiInsightLoading(false);
      }
    })();
    return () => ac.abort();
  }, [
    dashAiOpen,
    dashAiCacheKey,
    dashAiSnapshot,
    aiInsightTick,
    aiInsightDataKey,
    aiInsightText,
  ]);

  const dashPaletteRows = useMemo(() => {
    const q = dashPaletteQ.trim().toLowerCase();
    let rows = dashDisplayRows.slice(0, 8);
    if (q) {
      rows = dashDisplayRows
        .filter(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q) ||
            String(r.raw.performer || "")
              .toLowerCase()
              .includes(q),
        )
        .slice(0, 8);
    }
    return rows;
  }, [dashDisplayRows, dashPaletteQ]);

  const dashDonutLegendPct = useMemo(() => {
    const { adv, pub, gen } = dashDeptMix.counts;
    const t = adv + pub + gen;
    const p = (n) => (t ? Math.round((n / t) * 100) : 0);
    return { adv: p(adv), pub: p(pub), gen: p(gen) };
  }, [dashDeptMix.counts]);

  const dashOnSort = (col) => {
    if (dashSortCol === col) setDashSortDir((d) => -d);
    else {
      setDashSortCol(col);
      setDashSortDir(1);
    }
  };

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setDashPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (dashAttentionKey == null) return;
    const id = requestAnimationFrame(() => {
      const sel = String(dashAttentionKey);
      const el = document.querySelector(
        `[data-dash-incident-row="${CSS.escape(sel)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [dashAttentionKey, dashFiltered]);

  useEffect(() => {
    if (!dashPaletteOpen) return;
    const t = requestAnimationFrame(() => dashPaletteInputRef.current?.focus());
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDashPaletteOpen(false);
        setDashPaletteQ("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [dashPaletteOpen]);

  const closeDashIncidentView = useCallback(() => {
    setDashViewRaw(null);
    setDashViewDetail(null);
    setDashViewLoading(false);
    setDashViewError(null);
  }, []);

  const resetToDefaultDashboard = useCallback(() => {
    closeDashIncidentView();
    setDashNav("dashboard");
    setDashFilterIds([]);
    setDashFiltersOpen(false);
    setDashPaletteOpen(false);
    setDashPaletteQ("");
    setDashAttentionKey(null);
    setDashAiOpen(false);
    requestAnimationFrame(() => {
      dashScrollAreaRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, [closeDashIncidentView]);

  useImperativeHandle(
    ref,
    () => ({
      resetToDefaultDashboard,
    }),
    [resetToDefaultDashboard],
  );

  const handleBrandClick = useCallback(() => {
    if (formOpen && typeof onBrandClickWhileFormOpen === "function") {
      onBrandClickWhileFormOpen();
      return;
    }
    resetToDefaultDashboard();
  }, [formOpen, onBrandClickWhileFormOpen, resetToDefaultDashboard]);

  useEffect(() => {
    if (!dashViewRaw) return;
    const key = dashIncidentFetchKey(dashViewRaw);
    if (!key) {
      setDashViewDetail(dashViewRaw);
      setDashViewLoading(false);
      setDashViewError("Missing incident reference");
      return;
    }
    let cancelled = false;
    setDashViewLoading(true);
    setDashViewError(null);
    setDashViewDetail(null);
    (async () => {
      try {
        const data = await fetchIncidentByNumber(key);
        if (cancelled) return;
        const row = Array.isArray(data) && data[0] ? data[0] : null;
        setDashViewDetail(row || dashViewRaw);
        setDashViewError(row ? null : "Not found — showing list snapshot");
      } catch {
        if (cancelled) return;
        setDashViewDetail(dashViewRaw);
        setDashViewError("Could not refresh — showing list snapshot");
      } finally {
        if (!cancelled) setDashViewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dashViewRaw]);

  useEffect(() => {
    if (!dashViewRaw) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDashIncidentView();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dashViewRaw, closeDashIncidentView]);

  useEffect(() => {
    if (dashKnownIssueCount === 0 && dashNav === "known_issues") {
      setDashNav("dashboard");
    }
  }, [dashKnownIssueCount, dashNav]);

  const dashDTop = new Date();
  const dashTzDate = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  const dashTzTime = { hour: "numeric", minute: "2-digit", hour12: true };
  const dashTopDate = `${dashDTop.toLocaleDateString("en-US", { ...dashTzDate, timeZone: "Asia/Kolkata" })} · ${dashDTop.toLocaleTimeString("en-US", { ...dashTzTime, timeZone: "Asia/Kolkata" })} IST (${dashDTop.toLocaleTimeString("en-US", { ...dashTzTime, timeZone: "UTC" })} UTC)`;
  const dashTotalForBar = dashUniqueRaw.length || 1;
  const dashSeg = (n) =>
    `${Math.max((n / dashTotalForBar) * 100, n ? 0.5 : 0)}%`;

return (
    <div className="imap-mock-shell fixed inset-0 z-[30] overflow-hidden bg-[var(--imap-page-bg)] text-[var(--imap-text-primary)]">
          <div
            className="imap-mesh-bg pointer-events-none fixed inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 10% 20%, rgba(0,102,255,0.09) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(167,139,250,0.07) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 90%, rgba(34,211,238,0.05) 0%, transparent 50%), radial-gradient(ellipse 40% 40% at 90% 10%, rgba(251,113,133,0.04) 0%, transparent 50%)",
            }}
          />
          <div
            className="pointer-events-none fixed inset-0 z-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(var(--imap-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--imap-grid-line) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />

          <header className="fixed top-0 left-0 right-0 z-[200] flex h-16 items-center border-b border-[var(--imap-header-border)] bg-[var(--imap-header-bg)] shadow-[var(--imap-header-shadow)]">
            <div className="flex h-full w-[264px] shrink-0 items-center border-r border-[var(--imap-glass-1)] pl-6 pr-5">
              <button
                type="button"
                onClick={handleBrandClick}
                className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-[var(--imap-chrome-text)] shadow-none outline-none ring-0 transition-none hover:bg-transparent hover:shadow-none focus:bg-transparent focus:shadow-none focus:outline-none focus:ring-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 active:bg-transparent active:shadow-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Go to dashboard"
              >
                <span
                  className="shrink-0 select-none whitespace-nowrap text-[18px] font-extrabold leading-none tracking-[-0.03em] text-[var(--imap-chrome-text)]"
                  style={{ fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif' }}
                >
                  Taboola
                </span>
                <div
                  className="h-[22px] w-px shrink-0 bg-[var(--imap-chrome-divider)]"
                  aria-hidden
                />
                <span className="select-none text-[10px] font-semibold uppercase leading-[1.15] tracking-[0.15em] text-[var(--imap-chrome-text-soft)]">
                  <span className="block">Incident</span>
                  <span className="block">Management</span>
                </span>
              </button>
            </div>
            <div className="flex min-w-0 flex-1 items-center px-6">
              <button
                type="button"
                onClick={() => setDashPaletteOpen(true)}
                className="imap-search-mock imap-search-mock--in-header flex h-[38px] w-full max-w-[min(440px,100%)] cursor-pointer items-center gap-2.5 rounded-lg border px-4 text-left text-[14px] text-[var(--imap-text-primary)]"
              >
                <i className="fa-solid fa-magnifying-glass text-sm text-[var(--imap-chrome-muted)]" />
                <span className="min-w-0 flex-1 truncate text-[var(--imap-text-search)]">
                  Search incidents, performers…
                </span>
                <span className="imap-mono shrink-0 rounded border border-[var(--imap-border-strong)] bg-[var(--imap-glass-06)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--imap-chrome-kbd-fg)]">
                  Ctrl+K
                </span>
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-3.5 pr-6 pl-2">
              <span className="whitespace-nowrap text-sm font-medium tracking-wide text-[var(--imap-chrome-date)]">
                {dashTopDate}
              </span>
              <ThemeToggle />
              <button
                type="button"
                onClick={onUpdate}
                className="inline-flex items-center gap-[7px] rounded-md border border-[var(--imap-border-strong)] bg-[var(--imap-glass-05)] px-4 py-[7px] text-[12.5px] font-semibold text-[var(--imap-text-bright)] transition-all duration-150 hover:border-[var(--imap-border-accent)] hover:bg-[var(--imap-glass-09)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
              >
                <i className="fa-solid fa-pen-to-square text-[11px] text-[#22d3ee]" />
                Update Incident
              </button>
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center gap-[7px] rounded-md border border-[var(--imap-border-default)] bg-[var(--imap-brand)] px-[18px] py-[7px] text-[12.5px] font-bold text-white shadow-[0_4px_16px_rgba(0,102,255,0.3)] transition-all duration-150 hover:-translate-y-px hover:bg-[var(--imap-brand-hover)] hover:shadow-[0_6px_24px_rgba(0,102,255,0.45)] active:translate-y-0 active:scale-[0.98]"
              >
                <i className="fa-solid fa-plus text-[11px]" />
                New Incident
              </button>
            </div>
          </header>

          <aside
            className={`imap-sidebar-shell fixed bottom-0 left-0 top-16 z-[100] flex w-[264px] flex-col overflow-y-auto border-r border-[var(--imap-sidebar-border)] bg-gradient-to-b from-[var(--imap-sidebar-from)] to-[var(--imap-sidebar-to)] py-5 pb-4 backdrop-blur-[20px] ${formOpen ? "imap-sidebar-shell--form-open" : ""}`}
          >
            {formOpen && sidebarWorkflow != null ? (
              <div className="imap-sidebar-workflow">{sidebarWorkflow}</div>
            ) : null}
            <div
              className={`imap-sidebar-main flex min-h-0 flex-1 flex-col ${formOpen ? "hidden" : ""}`}
            >
            <div className="px-[18px] pb-2 pt-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--imap-text-muted)]">
              Monitor
            </div>
            <button
              type="button"
              onClick={() => {
                setDashNav("dashboard");
                setDashFilterIds([]);
                setDashFiltersOpen(false);
                requestAnimationFrame(() => {
                  dashScrollAreaRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                });
              }}
              className={`relative flex w-full cursor-pointer select-none items-center gap-2.5 border-0 py-2.5 pl-[18px] pr-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-[var(--imap-glass-025)] hover:text-[var(--imap-text-bright)] ${
                dashNav === "dashboard"
                  ? "bg-[rgba(0,102,255,0.08)] text-[var(--imap-text-bright)]"
                  : "bg-transparent text-[var(--imap-text-primary)]"
              }`}
            >
              {dashNav === "dashboard" ? (
                <span
                  className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-[3px] bg-[var(--imap-brand)] shadow-[0_0_10px_rgba(0,102,255,0.55)]"
                  aria-hidden
                />
              ) : null}
              <i className="fa-solid fa-chart-tree-map w-4 shrink-0 text-center text-[13px]" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setDashNav("all_incidents");
                setDashFilterIds([]);
                setDashFiltersOpen(true);
                scrollDashEl(dashActiveIncidentsRef.current);
              }}
              className={`relative flex w-full cursor-pointer select-none items-center gap-2.5 border-0 py-2.5 pl-[18px] pr-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-[var(--imap-glass-025)] hover:text-[var(--imap-text-bright)] ${
                dashNav === "all_incidents"
                  ? "bg-[rgba(0,102,255,0.08)] text-[var(--imap-text-bright)]"
                  : "bg-transparent text-[var(--imap-text-primary)]"
              }`}
            >
              {dashNav === "all_incidents" ? (
                <span
                  className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-[3px] bg-[var(--imap-brand)] shadow-[0_0_10px_rgba(0,102,255,0.55)]"
                  aria-hidden
                />
              ) : null}
              <i className="fa-solid fa-triangle-exclamation w-4 shrink-0 text-center text-[13px]" />
              All Incidents
            </button>
            {dashKnownIssueCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setDashNav("known_issues");
                  setDashFilterIds(["known_issue"]);
                  setDashFiltersOpen(false);
                  scrollDashEl(dashActiveIncidentsRef.current);
                }}
                className={`relative flex w-full cursor-pointer select-none items-center gap-2.5 border-0 py-2.5 pl-[18px] pr-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-[var(--imap-glass-025)] hover:text-[var(--imap-text-bright)] ${
                  dashNav === "known_issues"
                    ? "bg-[rgba(0,102,255,0.08)] text-[var(--imap-text-bright)]"
                    : "bg-transparent text-[var(--imap-text-primary)]"
                }`}
              >
                {dashNav === "known_issues" ? (
                  <span
                    className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-[3px] bg-[var(--imap-brand)] shadow-[0_0_10px_rgba(0,102,255,0.55)]"
                    aria-hidden
                  />
                ) : null}
                <i className="fa-solid fa-bookmark w-4 shrink-0 text-center text-[13px]" />
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="leading-tight">Known issues</span>
                  <span className="text-[10px] font-normal leading-tight text-[var(--imap-text-dim)]">
                    {dashKnownIssueCount} in list · table filter
                  </span>
                </span>
              </button>
            ) : null}
            <button
              type="button"
              title="Scroll to department volume and severity charts"
              onClick={() => {
                setDashNav("analytics");
                setDashFiltersOpen(false);
                scrollDashEl(dashAnalyticsRef.current);
              }}
              className={`relative flex w-full cursor-pointer select-none items-start gap-2.5 border-0 py-2.5 pl-[18px] pr-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-[var(--imap-glass-025)] hover:text-[var(--imap-text-bright)] ${
                dashNav === "analytics"
                  ? "bg-[rgba(0,102,255,0.08)] text-[var(--imap-text-bright)]"
                  : "bg-transparent text-[var(--imap-text-primary)]"
              }`}
            >
              {dashNav === "analytics" ? (
                <span
                  className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-[3px] bg-[var(--imap-brand)] shadow-[0_0_10px_rgba(0,102,255,0.55)]"
                  aria-hidden
                />
              ) : null}
              <i className="fa-solid fa-chart-line mt-0.5 w-4 shrink-0 text-center text-[13px]" />
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span className="leading-tight">Analytics</span>
                <span className="text-[10px] font-normal leading-tight text-[var(--imap-text-dim)]">
                  Dept volume · severity mix
                </span>
              </span>
            </button>

            <div className="mt-4 px-[18px] pb-2 pt-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--imap-text-muted)]">
              Departments
            </div>
            {[
              ["Advertiser", "fa-bullhorn", "#fbbf24", "advertiser"],
              ["Publisher", "fa-rss", "#22d3ee", "publisher"],
              ["General", "fa-layer-group", "#a78bfa", "general"],
            ].map(([label, icon, color, filterId]) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  setDashNav("all_incidents");
                  setDashFilterIds((prev) =>
                    prev.includes(filterId)
                      ? prev.filter((x) => x !== filterId)
                      : [...prev, filterId],
                  );
                }}
                className={`flex w-full cursor-pointer select-none items-center gap-2.5 border-0 bg-transparent py-2.5 pl-[18px] pr-4 text-left text-sm font-medium transition-colors duration-150 hover:bg-[var(--imap-glass-025)] hover:text-[var(--imap-text-bright)] ${
                  dashFilterIds.includes(filterId)
                    ? "text-[var(--imap-text-bright)]"
                    : "text-[var(--imap-text-primary)]"
                }`}
              >
                <i
                  className={`fa-solid ${icon} w-4 shrink-0 text-center text-[13px] text-[var(--imap-text-muted)]`}
                />
                {label}
                <span
                  className="ml-auto h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
              </button>
            ))}

            <div className="min-h-4 flex-1" />

            <div
              className={`mx-3 mb-4 overflow-hidden rounded-md border border-[var(--imap-glass-line-strong)] bg-[var(--imap-accent-violet-bg)] transition-[box-shadow] duration-300 ${dashAiOpen ? "shadow-[0_1px_3px_rgba(15,23,42,0.06)]" : ""}`}
            >
              <button
                type="button"
                onClick={() => setDashAiOpen(!dashAiOpen)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--imap-accent-violet-fg)] select-none hover:opacity-90"
              >
                <i className="fa-solid fa-brain imap-ai-brain text-xs" />
                <span>AI insights</span>
                <i
                  className={`fa-solid fa-chevron-up ml-auto text-[10px] text-[var(--imap-accent-violet-fg)] opacity-70 transition-transform duration-150 ${dashAiOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dashAiOpen && (
                <div className="px-2.5 pb-2.5">
                  <div className="rounded-md border border-[var(--imap-border-default)] bg-[var(--imap-surface-0)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--imap-text-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="text-xs font-semibold text-[var(--imap-accent-violet-fg)]">
                        <i className="fa-solid fa-wand-magic-sparkles mr-1 text-[10px]" />
                        Copilot read
                      </div>
                      <button
                        type="button"
                        onClick={refreshAiInsights}
                        disabled={aiInsightLoading}
                        className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--imap-accent-violet-fg)] transition-colors hover:bg-[var(--imap-accent-violet-bg)] disabled:opacity-40"
                        title="Regenerate from current table data"
                      >
                        {aiInsightLoading ? (
                          <i className="fa-solid fa-spinner fa-spin" />
                        ) : (
                          <>
                            <i className="fa-solid fa-rotate-right mr-1" />
                            Refresh
                          </>
                        )}
                      </button>
                    </div>
                    {aiInsightLoading && !aiInsightText ? (
                      <p className="m-0 text-[12px] text-[var(--imap-text-muted)]">
                        <i className="fa-solid fa-circle-notch fa-spin mr-1.5" />
                        Scanning your snapshot…
                      </p>
                    ) : null}
                    {aiInsightUnconfigured ? (
                      <p className="m-0 text-[12px] text-[var(--imap-text-muted)]">
                        AI is off until{" "}
                        <span className="imap-mono text-[var(--imap-text-secondary)]">
                          OPENAI_API_KEY
                        </span>{" "}
                        is set on the API server. Charts and tables stay live
                        without it.
                      </p>
                    ) : null}
                    {aiInsightErr && !aiInsightUnconfigured ? (
                      <p className="m-0 text-[12px] text-[#f87171]">
                        {aiInsightErr}{" "}
                        <button
                          type="button"
                          onClick={refreshAiInsights}
                          className="border-0 bg-transparent p-0 text-[12px] text-[var(--imap-accent-violet-fg)] underline cursor-pointer"
                        >
                          Retry
                        </button>
                      </p>
                    ) : null}
                    {aiInsightText ? (
                      <div className="whitespace-pre-wrap text-[12px] leading-[1.55] text-[var(--imap-text-primary)]">
                        {aiInsightText}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            </div>
          </aside>

          <main
            className={`relative z-[1] ml-[264px] mt-16 flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden ${formOpen ? "hidden" : ""}`}
          >
            <>
            <div className="mb-5 shrink-0 flex border-b border-[var(--imap-glass-line)] bg-gradient-to-b from-[var(--imap-tabbar-grad-from)] to-[var(--imap-tabbar-grad-to)] px-1 pb-1 pt-2 backdrop-blur-[10px]">
              {[
                {
                  label: "Total Incidents",
                  value: dashStats.total,
                  sub: (
                    <>
                      <i className="fa-solid fa-calendar-week text-[9px]" />
                      <span>This month</span>
                    </>
                  ),
                  icon: "fa-layer-group",
                  color: "#0066ff",
                  bg: "rgba(0,102,255,0.14)",
                  glow: "blue",
                  spark: DASH_HERO_SPK_BLUE,
                },
                {
                  label: "Ongoing",
                  value: dashStats.ongoing.length,
                  sub: <span className="text-[var(--imap-text-muted)]">Suspected + Ongoing</span>,
                  icon: "fa-bolt",
                  color: "#fbbf24",
                  bg: "rgba(251,191,36,0.12)",
                  pulse: true,
                  glow: "amber",
                  spark: DASH_HERO_SPK_AMBER,
                },
                {
                  label: "Resolved",
                  value: dashStats.resolved.length,
                  sub: (
                    <span className="text-[var(--imap-text-muted)]">Resolved / RCA in list</span>
                  ),
                  icon: "fa-circle-check",
                  color: "#34d399",
                  bg: "rgba(52,211,153,0.12)",
                  glow: "green",
                  spark: DASH_HERO_SPK_GREEN,
                },
                {
                  label: "Avg Resolve Time",
                  value: dashAvgResolve.label ?? "—",
                  sub:
                    dashAvgResolve.samples > 0 ? (
                      <span className="text-[var(--imap-text-muted)]">
                        Mean discover → resolve · {dashAvgResolve.samples}{" "}
                        case{dashAvgResolve.samples === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-[var(--imap-text-dim)]">
                        Needs discovered + resolved timestamps
                      </span>
                    ),
                  icon: "fa-clock",
                  color: "#a78bfa",
                  bg: "rgba(167,139,250,0.12)",
                  isText: true,
                  glow: "violet",
                  spark: DASH_HERO_SPK_VIOLET,
                },
              ].map((h) => (
                <div
                  key={h.label}
                  className={`group relative flex min-h-[108px] flex-1 cursor-default items-center gap-4 overflow-hidden border-r border-[var(--imap-glass-line)] px-7 py-3 transition-colors duration-150 last:border-r-0 hover:bg-[var(--imap-glass-025)] after:pointer-events-none after:absolute after:-right-5 after:-top-8 after:h-[100px] after:w-[100px] after:rounded-full after:opacity-0 after:blur-[30px] after:transition-opacity after:duration-300 group-hover:after:opacity-[0.12] ${
                    h.glow === "blue"
                      ? "after:bg-[var(--imap-brand)]"
                      : h.glow === "amber"
                        ? "after:bg-[#fbbf24]"
                        : h.glow === "green"
                          ? "after:bg-[#34d399]"
                          : "after:bg-[#a78bfa]"
                  }`}
                >
                  <div
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] text-base transition duration-300 group-hover:scale-110 group-hover:-rotate-[4deg]"
                    style={{ background: h.bg }}
                  >
                    <i className={`fa-solid ${h.icon}`} style={{ color: h.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--imap-text-muted)]">
                      {h.label}
                    </div>
                    <div
                      className="flex items-center gap-2 text-[32px] font-extrabold leading-none tracking-[-1px] [font-variant-numeric:tabular-nums]"
                      style={{ color: h.color }}
                    >
                      {h.isText ? (
                        <span className="text-2xl font-bold opacity-80">{h.value}</span>
                      ) : (
                        h.value
                      )}
                      {h.pulse && (
                        <span
                          className="imap-hero-pulse inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                          style={{ background: h.color, color: h.color }}
                        />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--imap-text-muted)]">
                      {h.sub}
                    </div>
                  </div>
                  <div className="shrink-0 opacity-[0.85] transition-opacity duration-150 group-hover:opacity-100">
                    {h.spark}
                  </div>
                </div>
              ))}
            </div>

            <div
              ref={dashScrollAreaRef}
              className="flex min-h-0 flex-1 items-start gap-4 overflow-y-auto overflow-x-hidden p-[18px] pb-6"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
                <div
                  ref={dashActiveIncidentsRef}
                  className="imap-glass-card overflow-hidden rounded-[14px] border border-[var(--imap-glass-line)] bg-[var(--imap-glass-03)] backdrop-blur-[14px]"
                >
                  <div className="mb-3.5 flex flex-wrap items-center gap-2.5 px-5 pt-4">
                    <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--imap-text-bright)]">
                      Active Incidents
                    </span>
                    <span className="rounded-full border border-[rgba(251,191,36,0.35)] bg-[var(--imap-accent-amber-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--imap-accent-amber-fg)]">
                      {dashStats.ongoing.length} ongoing
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        aria-expanded={dashFiltersOpen}
                        onClick={() =>
                          setDashFiltersOpen((open) => !open)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                          dashFiltersOpen
                            ? "border-[rgba(0,102,255,0.45)] bg-[rgba(0,102,255,0.16)] text-[var(--imap-brand)] shadow-[0_0_0_1px_rgba(0,102,255,0.12)]"
                            : "border-[var(--imap-glass-line)] bg-[var(--imap-glass-05)] text-[var(--imap-text-primary)] hover:bg-[var(--imap-glass-09)] hover:text-[var(--imap-text-bright)]"
                        }`}
                      >
                        <i className="fa-solid fa-sliders text-[10px]" />
                        Filters
                      </button>
                    </div>
                  </div>
                  {dashFiltersOpen ? (
                  <div className="flex flex-wrap gap-1.5 px-5 pb-3.5">
                    {DASH_FILTERS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={dashFilterIds.includes(c.id)}
                        onClick={() => {
                          if (c.id === "all") {
                            if (dashFilterIds.includes("all")) {
                              setDashFilterIds([]);
                              setDashNav("dashboard");
                            } else {
                              setDashFilterIds(["all"]);
                              setDashNav("all_incidents");
                            }
                            return;
                          }
                          const willAdd = !dashFilterIds.includes(c.id);
                          const without = dashFilterIds.filter((x) => x !== c.id && x !== "all");
                          const next = willAdd ? [...without, c.id] : without;
                          setDashFilterIds(next);
                          if (next.length === 0) {
                            // All chips cleared — go back to active-only view
                            setDashNav("dashboard");
                          } else if (willAdd && (c.id === "resolved" || c.id === "ongoing")) {
                            // Status chips need all statuses visible
                            setDashNav("all_incidents");
                          }
                        }}
                        className={`rounded-full border px-3.5 py-[5px] text-[13px] font-medium transition-colors duration-150 ${
                          dashFilterIds.includes(c.id)
                            ? "border-[rgba(0,102,255,0.35)] bg-[rgba(0,102,255,0.14)] text-[var(--imap-brand)]"
                            : "border-[var(--imap-glass-line)] bg-transparent text-[var(--imap-text-primary)] hover:border-[var(--imap-border-strong)] hover:text-[var(--imap-text-bright)]"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {DASH_COLS.map((c) => (
                            <th
                              key={c.key}
                              className={`cursor-pointer select-none whitespace-nowrap border-b border-[var(--imap-glass-line)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--imap-text-muted)] first:pl-5 last:pr-4 transition-colors duration-150 hover:text-[var(--imap-text-primary)] ${dashSortCol === c.key ? "text-[var(--imap-brand)]" : ""}`}
                              onClick={() => dashOnSort(c.key)}
                            >
                              {c.label}{" "}
                              <i
                                className={`fa-solid fa-sort ml-1 text-[9px] opacity-40 ${dashSortCol === c.key ? "text-[var(--imap-brand)] opacity-100" : ""}`}
                              />
                            </th>
                          ))}
                          <th className="w-[72px] border-b border-[var(--imap-glass-line)] pr-4" />
                        </tr>
                      </thead>
                      <tbody>
                        {dashFiltered.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-5 py-10 text-center text-sm text-slate-500"
                            >
                              No incidents match this filter.
                            </td>
                          </tr>
                        ) : (
                          dashFiltered.map((row) => {
                            const rowKey = String(row.raw.incident_number ?? "");
                            const rowSelected = dashAttentionKey === rowKey;
                            return (
                            <tr
                              key={row.raw.incident_number + row.status}
                              data-dash-incident-row={rowKey || undefined}
                              onClick={() =>
                                setDashAttentionKey((prev) =>
                                  prev === rowKey ? null : rowKey,
                                )
                              }
                              className={`group cursor-pointer border-b border-[var(--imap-glass-line)] transition-colors duration-150 hover:bg-[var(--imap-glass-028)] last:border-0 ${
                                rowSelected
                                  ? "bg-[rgba(0,102,255,0.1)] shadow-[inset_3px_0_0_0_#0066ff]"
                                  : ""
                              }`}
                            >
                              <td className="relative px-3.5 py-3.5 pl-5 align-middle">
                                <span
                                  className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-[2px]"
                                  style={{
                                    background:
                                      row.sevKey === "emergency"
                                        ? "#fb7185"
                                        : row.sevKey === "high"
                                          ? "#fbbf24"
                                          : row.sevKey === "standard"
                                            ? "#0066ff"
                                            : "#334155",
                                  }}
                                />
                                <span className="imap-mono text-[11.5px] font-semibold tracking-wide text-[var(--imap-brand)]">
                                  {row.id}
                                </span>
                              </td>
                              <td className="max-w-[420px] truncate px-3.5 py-3.5 align-middle text-sm font-medium text-[var(--imap-text-bright)]">
                                {row.title}
                              </td>
                              <td className="px-3.5 py-3.5 align-middle">
                                <span className={`whitespace-nowrap ${dashDeptPillClass(row.dept)}`}>
                                  {row.dept}
                                </span>
                              </td>
                              <td className="px-3.5 py-3.5 align-middle">
                                <span className={`whitespace-nowrap ${dashSevPillClass(row.sevKey)}`}>
                                  {row.sev}
                                </span>
                              </td>
                              <td className="px-3.5 py-3.5 align-middle">
                                <span
                                  className={`inline-flex items-center gap-1.5 ${dashStatusPillClass(row.status)}`}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3.5 py-3.5 align-middle text-xs text-[var(--imap-text-primary)]">
                                {row.updated}
                              </td>
                              <td className="px-2 pr-4 align-middle">
                                <div className="flex items-center justify-end gap-1.5 opacity-90 transition-opacity duration-150 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[var(--imap-glass-line)] bg-[var(--imap-glass-04)] text-[11px] text-[var(--imap-text-muted)] transition-colors duration-150 hover:bg-[var(--imap-glass-1)] hover:text-[var(--imap-text-bright)]"
                                    aria-label="View full incident details"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDashViewRaw(row.raw);
                                    }}
                                  >
                                    <i className="fa-solid fa-eye" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[var(--imap-glass-line)] bg-[var(--imap-glass-04)] text-[11px] text-[var(--imap-text-muted)] transition-colors duration-150 hover:bg-[var(--imap-glass-1)] hover:text-[var(--imap-text-bright)]"
                                    aria-label="Edit incident in form"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const k = dashIncidentFetchKey(row.raw);
                                      if (k && onEditIncident) {
                                        onEditIncident({ incidentNumber: k });
                                      } else {
                                        onUpdate?.();
                                      }
                                    }}
                                  >
                                    <i className="fa-solid fa-pen" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  ref={dashAnalyticsRef}
                  className="grid grid-cols-1 gap-[14px] lg:grid-cols-2"
                >
                  <div className="imap-glass-card overflow-hidden rounded-[14px] border border-[var(--imap-glass-line)] bg-[var(--imap-glass-03)] backdrop-blur-[14px]">
                    <div className="mb-0 flex items-center px-5 pt-4">
                      <span className="text-[15px] font-semibold text-[var(--imap-text-bright)]">
                        Volume by department
                      </span>
                      <span className="ml-auto text-[11px] text-[var(--imap-text-muted)]">
                        Latest row per case
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-5 px-5 pb-[18px] pt-3.5">
                      <DashDonutSvg
                        adv={dashDeptMix.counts.adv}
                        pub={dashDeptMix.counts.pub}
                        gen={dashDeptMix.counts.gen}
                      />
                      <div className="flex min-w-[140px] flex-col gap-2.5 text-[13px]">
                        {[
                          ["Advertiser", dashDonutLegendPct.adv, "#fbbf24"],
                          ["Publisher", dashDonutLegendPct.pub, "#22d3ee"],
                          ["General", dashDonutLegendPct.gen, "#a78bfa"],
                        ].map(([lab, pct, col]) => (
                          <div
                            key={lab}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const id =
                                lab === "Advertiser"
                                  ? "advertiser"
                                  : lab === "Publisher"
                                    ? "publisher"
                                    : "general";
                              setDashNav("all_incidents");
                              setDashFilterIds((prev) =>
                                prev.includes(id)
                                  ? prev.filter((x) => x !== id)
                                  : [...prev, id],
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                const id =
                                  lab === "Advertiser"
                                    ? "advertiser"
                                    : lab === "Publisher"
                                      ? "publisher"
                                      : "general";
                                setDashNav("all_incidents");
                                setDashFilterIds((prev) =>
                                  prev.includes(id)
                                    ? prev.filter((x) => x !== id)
                                    : [...prev, id],
                                );
                              }
                            }}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition-opacity duration-150 hover:bg-[var(--imap-glass-06)] hover:opacity-100"
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-[2px]"
                              style={{ background: col }}
                            />
                            <span className="flex-1 font-medium text-[var(--imap-text-primary)]">{lab}</span>
                            <span
                              className="imap-mono pl-3.5 text-xs font-bold"
                              style={{ color: col }}
                            >
                              {pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="imap-glass-card overflow-hidden rounded-[14px] border border-[var(--imap-glass-line)] bg-[var(--imap-glass-03)] backdrop-blur-[14px]">
                    <div className="px-5 pt-4">
                      <span className="text-[15px] font-semibold text-[var(--imap-text-bright)]">
                        Severity mix
                      </span>
                    </div>
                    <div className="px-5 pb-[18px] pt-0">
                      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--imap-text-muted)]">
                        {dashUniqueRaw.length} incident{dashUniqueRaw.length === 1 ? "" : "s"}
                      </div>
                      <div className="mb-2.5 flex h-2.5 gap-0.5 overflow-hidden rounded-md bg-[var(--imap-glass-04)]">
                        <div
                          className="h-full cursor-pointer rounded-l-md bg-[#fb7185] transition-[filter] duration-150 hover:brightness-[1.35]"
                          style={{
                            width: dashSeg(dashSevCounts.emergency),
                            minWidth: dashSevCounts.emergency ? "2px" : 0,
                          }}
                          title={`Emergency: ${dashSevCounts.emergency}`}
                        />
                        <div
                          className="h-full cursor-pointer bg-[#fbbf24] transition-[filter] duration-150 hover:brightness-[1.35]"
                          style={{
                            width: dashSeg(dashSevCounts.high),
                            minWidth: dashSevCounts.high ? "2px" : 0,
                          }}
                          title={`High: ${dashSevCounts.high}`}
                        />
                        <div
                          className="h-full cursor-pointer bg-[var(--imap-brand)] transition-[filter] duration-150 hover:brightness-[1.35]"
                          style={{
                            width: dashSeg(dashSevCounts.standard),
                            minWidth: dashSevCounts.standard ? "2px" : 0,
                          }}
                          title={`Standard: ${dashSevCounts.standard}`}
                        />
                        <div
                          className="h-full cursor-pointer rounded-r-md bg-[#334155] transition-[filter] duration-150 hover:brightness-[1.35]"
                          style={{
                            width: dashSeg(dashSevCounts.other),
                            minWidth: dashSevCounts.other ? "2px" : 0,
                          }}
                          title={`Other: ${dashSevCounts.other}`}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2.5 text-[11px] text-[var(--imap-text-primary)]">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#fb7185]" />
                          Emergency{" "}
                          <strong className="text-[var(--imap-text-bright)]">{dashSevCounts.emergency}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#fbbf24]" />
                          High{" "}
                          <strong className="text-[var(--imap-text-bright)]">{dashSevCounts.high}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--imap-brand)]" />
                          Standard{" "}
                          <strong className="text-[var(--imap-text-bright)]">{dashSevCounts.standard}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#334155]" />
                          Other{" "}
                          <strong className="text-[var(--imap-text-bright)]">{dashSevCounts.other}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-[min(100%,380px)] shrink-0 flex-col gap-[14px] lg:w-[340px]">
                <div className="imap-glass-card overflow-hidden rounded-[14px] border border-[var(--imap-glass-line)] bg-[var(--imap-glass-03)] backdrop-blur-[14px]">
                  <div className="mb-3.5 flex flex-wrap items-center gap-2.5 px-5 pt-4">
                    <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--imap-text-bright)]">
                      Needs attention
                    </span>
                    <span className="rounded-full border border-[rgba(251,113,133,0.2)] bg-[rgba(251,113,133,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[#fb7185]">
                      Emergency / High · active
                    </span>
                  </div>
                  <div className="px-4 pb-4">
                    {dashNeedsAttention.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-[var(--imap-text-muted)]">
                        No Emergency or High incidents in Suspected/Ongoing.
                      </p>
                    ) : (
                      dashNeedsAttention.map((r) => {
                        const attnKey = String(r.incident_number ?? "");
                        const id =
                          r.display_id != null
                            ? `INC-${String(r.display_id).padStart(4, "0")}`
                            : r.incident_number;
                        const expanded = dashAttentionKey === attnKey;
                        return (
                          <div key={attnKey || id} className="mb-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDashAttentionKey((prev) =>
                                  prev === attnKey ? null : attnKey,
                                );
                              }}
                              className={`flex w-full gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-[border-color,box-shadow,background] duration-150 ${
                                expanded
                                  ? "border-[rgba(0,102,255,0.35)] bg-[rgba(0,102,255,0.08)] shadow-[0_0_0_1px_rgba(0,102,255,0.12)]"
                                  : "border-[rgba(251,113,133,0.12)] bg-[rgba(251,113,133,0.06)] hover:border-[rgba(251,113,133,0.22)] hover:bg-[rgba(251,113,133,0.09)]"
                              }`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(251,113,133,0.15)] text-[#fb7185]">
                                <i className="fa-solid fa-triangle-exclamation text-xs" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="truncate text-xs font-semibold text-[var(--imap-text-bright)]">
                                    {id} · {(r.incident_subject || "").slice(0, 40)}
                                  </div>
                                  <i
                                    className={`fa-solid fa-chevron-down mt-0.5 shrink-0 text-[9px] text-[var(--imap-text-muted)] transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                                    aria-hidden
                                  />
                                </div>
                                <div className="text-[10px] text-[var(--imap-text-muted)]">
                                  {dashSeverityLabel(r.severity)} ·{" "}
                                  {r.departmentName} · {r.incident_status}
                                </div>
                              </div>
                            </button>
                            {expanded ? <DashAttentionDetail raw={r} /> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="imap-glass-card overflow-hidden rounded-[14px] border border-[var(--imap-glass-line)] bg-[var(--imap-glass-03)] backdrop-blur-[14px]">
                  <div className="mb-3.5 flex items-center px-5 pt-4">
                    <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--imap-text-bright)]">
                      Who&apos;s on the cases
                    </span>
                    <span className="ml-auto text-[11px] text-[var(--imap-text-muted)]">
                      Performer · count
                    </span>
                  </div>
                  <div className="px-4 pb-4">
                    {dashPerformers.length === 0 ? (
                      <p className="text-xs text-[var(--imap-text-muted)]">No performer field yet.</p>
                    ) : (
                      dashPerformers.map(([name, n]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between border-b border-[var(--imap-border-muted)] py-2 text-sm last:border-0"
                        >
                          <span className="truncate font-medium text-[var(--imap-text-primary)]">
                            {name.length > 36 ? `${name.slice(0, 33)}…` : name}
                          </span>
                          <span className="imap-mono text-xs text-[var(--imap-text-muted)]">{n}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="imap-glass-card flex flex-col overflow-hidden rounded-[14px] border border-[var(--imap-glass-line)] bg-[var(--imap-glass-03)] backdrop-blur-[14px]">
                  <div className="mb-3.5 flex items-center gap-2 px-5 pt-4">
                    <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--imap-text-bright)]">
                      Recent updates
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[#34d399]">
                      <span className="imap-hero-pulse h-[5px] w-[5px] rounded-full bg-[#34d399] text-[#34d399]" />
                      Synced
                    </span>
                  </div>
                  <div className="flex flex-col gap-px px-3.5 pb-3.5">
                    {dashActivity.length === 0 ? (
                      <p className="px-2 text-xs text-[var(--imap-text-muted)]">No incidents loaded.</p>
                    ) : (
                      dashActivity.map((r, i) => {
                        const id =
                          r.display_id != null
                            ? `INC-${String(r.display_id).padStart(4, "0")}`
                            : r.incident_number;
                        const icons = [
                          "fa-pen-to-square",
                          "fa-circle-check",
                          "fa-bolt",
                          "fa-file-lines",
                        ];
                        const ic = icons[i % 4];
                        return (
                          <div
                            key={`${r.incident_number}-${i}`}
                            className="flex gap-2.5 rounded-md px-1.5 py-2 transition-colors duration-150 hover:bg-[var(--imap-glass-025)]"
                          >
                            <div className="mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--imap-glass-06)]">
                              <i className={`fa-solid ${ic} text-sm text-[var(--imap-text-muted)]`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm leading-snug text-[var(--imap-text-bright)]">
                                <strong className="font-semibold">{id}</strong> ·{" "}
                                {(r.incident_subject || "Update").slice(0, 72)}
                              </div>
                              <div className="mt-1 text-xs text-[var(--imap-text-muted)]">
                                {dashFormatRelative(
                                  r.updated_at || r.created_at,
                                  dashTimeTick,
                                )}
                                {r.performer
                                  ? ` · ${String(r.performer).split("(")[0].trim()}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
            </>
          </main>

          {formOpen && formOverlay != null ? (
            <div className="imap-form-overlay imap-form-overlay--visible">
              <div className="form-body">{formOverlay}</div>
            </div>
          ) : null}

          {dashPaletteOpen && (
            <div
              className="imap-palette-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default border-0 bg-transparent"
                aria-label="Close palette"
                onClick={() => {
                  setDashPaletteOpen(false);
                  setDashPaletteQ("");
                }}
              />
              <div
                className="imap-palette-panel relative z-[1]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 border-b border-[var(--imap-glass-line)] px-[18px] py-3.5">
                  <i className="fa-solid fa-magnifying-glass text-sm text-[var(--imap-text-primary)]" />
                  <input
                    ref={dashPaletteInputRef}
                    type="search"
                    placeholder="Search incidents, performers…"
                    value={dashPaletteQ}
                    onChange={(e) => setDashPaletteQ(e.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent font-[inherit] text-[15px] text-[var(--imap-text-bright)] caret-[#0066ff] outline-none placeholder:text-[var(--imap-text-muted)]"
                  />
                  <span className="imap-mono shrink-0 rounded border border-[var(--imap-glass-line)] bg-[var(--imap-glass-06)] px-1.5 py-0.5 text-[10px] text-[var(--imap-text-muted)]">
                    ESC
                  </span>
                </div>
                <div className="px-[18px] pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--imap-text-muted)]">
                  Recent incidents
                </div>
                <div className="max-h-48 overflow-y-auto px-2">
                  {dashPaletteRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-none px-[18px] py-2.5 text-left transition-colors duration-150 hover:bg-[rgba(0,102,255,0.09)]"
                      onClick={() => {
                        setDashPaletteOpen(false);
                        setDashPaletteQ("");
                        setDashViewRaw(row.raw);
                      }}
                    >
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[rgba(251,191,36,0.15)] text-[#fbbf24]">
                        <i className="fa-solid fa-bolt text-xs" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--imap-text-bright)]">
                          {row.id} · {row.title.slice(0, 40)}
                        </div>
                        <div className="mt-px text-[11px] text-[var(--imap-text-primary)]">
                          {row.sev} · {row.dept} · {row.status}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-[18px] pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--imap-text-muted)]">
                  Quick actions
                </div>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 px-[18px] py-2.5 text-left transition-colors duration-150 hover:bg-[rgba(0,102,255,0.09)]"
                  onClick={() => {
                    setDashPaletteOpen(false);
                    setDashPaletteQ("");
                    onCreate?.();
                  }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(0,102,255,0.15)] text-[var(--imap-brand)]">
                    <i className="fa-solid fa-plus text-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--imap-text-bright)]">New Incident</div>
                    <div className="mt-px text-[11px] text-[var(--imap-text-primary)]">
                      Starts at Known Issue (step 1)
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 px-[18px] py-2.5 text-left transition-colors duration-150 hover:bg-[rgba(0,102,255,0.09)]"
                  onClick={() => {
                    setDashPaletteOpen(false);
                    setDashPaletteQ("");
                    onUpdate?.();
                  }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(34,211,238,0.15)] text-[#22d3ee]">
                    <i className="fa-solid fa-pen-to-square text-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--imap-text-bright)]">Update Incident</div>
                    <div className="mt-px text-[11px] text-[var(--imap-text-primary)]">
                      Starts at enter incident number (step 1)
                    </div>
                  </div>
                </button>
                <div className="flex gap-3.5 border-t border-[var(--imap-glass-line)] bg-[var(--imap-glass-012)] px-[18px] py-2 text-[11px] text-[var(--imap-text-muted)]">
                  <span className="flex items-center gap-1">
                    <kbd className="imap-mono rounded border border-[var(--imap-glass-line)] bg-[var(--imap-glass-06)] px-1 py-px text-[9px]">
                      ↑↓
                    </kbd>{" "}
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="imap-mono rounded border border-[var(--imap-glass-line)] bg-[var(--imap-glass-06)] px-1 py-px text-[9px]">
                      ↵
                    </kbd>{" "}
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="imap-mono rounded border border-[var(--imap-glass-line)] bg-[var(--imap-glass-06)] px-1 py-px text-[9px]">
                      ESC
                    </kbd>{" "}
                    Close
                  </span>
                </div>
              </div>
            </div>
          )}

          {dashViewRaw ? (
            <div
              className="fixed inset-0 z-[550] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dash-incident-view-title"
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default border-0 bg-transparent"
                aria-label="Close dialog"
                onClick={closeDashIncidentView}
              />
              <div
                className="relative z-[1] flex max-h-[min(85vh,720px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border border-[var(--imap-glass-1)] bg-[var(--imap-command-panel-bg)] shadow-[0_28px_80px_rgba(0,0,0,0.75),0_0_0_1px_rgba(0,102,255,0.1)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--imap-sidebar-border)] px-6 py-5">
                  <div className="min-w-0 pr-2">
                    {(() => {
                      const rec = dashViewDetail || dashViewRaw;
                      const disp =
                        rec?.display_id != null && rec.display_id !== ""
                          ? `INC-${String(rec.display_id).padStart(4, "0")}`
                          : "—";
                      const subj = rec?.incident_subject
                        ? String(rec.incident_subject)
                        : "";
                      return (
                        <>
                          <h2
                            id="dash-incident-view-title"
                            className="text-base font-semibold tracking-tight text-[var(--imap-text-bright)]"
                          >
                            {disp}
                            {rec?.incident_number != null &&
                            String(rec.incident_number).trim() !== "" ? (
                              <span className="ml-2 text-xs font-normal text-[var(--imap-text-muted)]">
                                · SF{" "}
                                <span className="imap-mono text-[var(--imap-text-secondary)]">
                                  {String(rec.incident_number)}
                                </span>
                              </span>
                            ) : null}
                          </h2>
                          {subj ? (
                            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-[var(--imap-text-secondary)]">
                              {subj}
                            </p>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={closeDashIncidentView}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--imap-sidebar-border)] bg-[var(--imap-glass-04)] text-[var(--imap-text-muted)] transition-colors hover:bg-[var(--imap-glass-08)] hover:text-[var(--imap-text-bright)]"
                    aria-label="Close"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  {dashViewError ? (
                    <p
                      className="mb-4 rounded-lg border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.1)] px-3 py-2 text-xs leading-snug text-[#fcd34d]"
                      role="status"
                    >
                      <i className="fa-solid fa-triangle-exclamation mr-2" />
                      {dashViewError}
                    </p>
                  ) : null}
                  {dashViewLoading && !dashViewDetail ? (
                    <p className="text-sm text-[var(--imap-text-muted)]">
                      <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                      Loading incident…
                    </p>
                  ) : (
                    <dl className="m-0 space-y-0">
                      {dashBuildIncidentDetailEntries(
                        dashViewDetail || dashViewRaw,
                      ).map(({ key, label, value, multiline }) => (
                        <div
                          key={key}
                          className="border-b border-[var(--imap-glass-line-soft)] py-3.5 last:border-0"
                        >
                          <dt className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--imap-text-dim)]">
                            {label}
                          </dt>
                          <dd className="m-0 text-[13px] text-[var(--imap-text-primary)]">
                            {multiline ? (
                              <pre className="imap-mono mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--imap-glass-line-soft)] bg-[var(--imap-code-block-bg)] p-3 text-[11px] leading-relaxed text-[var(--imap-text-secondary)]">
                                {value}
                              </pre>
                            ) : (
                              <span className="break-words">{value}</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--imap-sidebar-border)] px-6 py-4">
                  <button
                    type="button"
                    onClick={closeDashIncidentView}
                    className="rounded-lg border border-[var(--imap-glass-line-strong)] bg-[var(--imap-glass-04)] px-4 py-2 text-xs font-semibold text-[var(--imap-text-primary)] transition-colors hover:bg-[var(--imap-glass-08)]"
                  >
                    Close
                  </button>
                  {onEditIncident ? (
                    <button
                      type="button"
                      onClick={() => {
                        const k = dashIncidentFetchKey(
                          dashViewDetail || dashViewRaw,
                        );
                        if (k) onEditIncident({ incidentNumber: k });
                        closeDashIncidentView();
                      }}
                      className="rounded-lg border border-transparent bg-[var(--imap-brand)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:brightness-110"
                    >
                      Edit in form
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
  );
});

export default ImapDashboardShell;
