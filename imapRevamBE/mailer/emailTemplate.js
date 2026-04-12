const React = require("react");
const flowImages = require("./statusFlow");
const { formatDate } = require("../utils/formatDate");
const bannerFlow = require("./bannerFlow");

/* ── STATUS COLORS (matching frontend) ── */
const STATUS_COLORS = {
  suspected: "#F59E0B",
  ongoing: "#EF4444",
  resolved: "#16A34A",
  "resolved with rca": "#16A34A",
};

const severity_colorMap = {
  Standard: { color: "#1D4ED8", bgColor: "#DBEAFE", borderColor: "#BFDBFE" },
  High: { color: "#C2410C", bgColor: "#FFEDD5", borderColor: "#FED7AA" },
  Emergency: { color: "#DC2626", bgColor: "#FEE2E2", borderColor: "#FECACA" },
};

const normalizeForKey = (s = "") => s.toLowerCase().trim();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* ── Shared inline styles (EXACTLY matching frontend) ── */
const FONT = '"Poppins", Arial, sans-serif';
const labelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#9CA3AF",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: "4px",
  fontFamily: FONT,
};
const valueStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#111827",
  fontFamily: FONT,
};

const DISPLAY_INCIDENT_LABEL = /^INC-\d+$/i;

/** Footer must show Salesforce Case id (e.g. 500Rg…), not platform display INC-#### */
function resolveSalesforceCaseId(data) {
  const primary = data?.incident_number;
  if (
    primary != null &&
    String(primary).trim() !== "" &&
    !DISPLAY_INCIDENT_LABEL.test(String(primary).trim())
  ) {
    return String(primary).trim();
  }
  const hist = Array.isArray(data?.history) ? data.history : [];
  for (let i = 0; i < hist.length; i++) {
    const id = hist[i]?.incident_number;
    if (
      id != null &&
      String(id).trim() !== "" &&
      !DISPLAY_INCIDENT_LABEL.test(String(id).trim())
    ) {
      return String(id).trim();
    }
  }
  if (primary != null && String(primary).trim() !== "") {
    return String(primary).trim();
  }
  return "—";
}

const EmailTemplate = ({ data }) => {
  const salesforceCaseId = resolveSalesforceCaseId(data);

  const remaining = data.remainingStatus || [];
  const firstStatus = remaining.length > 0 ? remaining[0].statusName : "";
  const currentStatus = data.showStatus || data.incident_status;
  const knownIssue = String(data.known_issue).toLowerCase() === "yes" ? 1 : 0;
  const normalized = normalizeForKey(currentStatus);
  const statusColor = STATUS_COLORS[normalized] || "#6B7280";

  const showResolvedOnRow =
    normalized === "resolved" || normalized === "resolved with rca";
  const incidentTypeRaw = data.incident_type;
  const incidentTypeDisplay =
    incidentTypeRaw != null && String(incidentTypeRaw).trim() !== ""
      ? String(incidentTypeRaw).trim()
      : "—";

  /* Timeline image lookup */
  let imageSrc = null;
  if (firstStatus && currentStatus) {
    const key = `${normalizeForKey(firstStatus)}|${normalizeForKey(currentStatus)}`;
    const images = flowImages[key];
    if (images) imageSrc = images[knownIssue] || images[0];
  }

  /* Banner image lookup */
  let bannerImageSrc = null;
  if (currentStatus) {
    const key = `${data.departmentName}|${currentStatus}`;
    const images = bannerFlow[key];
    if (images) bannerImageSrc = images[0];
  }
  console.log(bannerImageSrc);

  /* History / updates */
  const history = Array.isArray(data.history) ? data.history : [];
  const latestStatusUpdate =
    typeof data.status_update_details === "string"
      ? data.status_update_details.trim()
      : null;

  const previousStatusUpdates = [];
  const seenTexts = new Set();
  for (const h of history) {
    const text = (h.status_update_details || "").trim();
    if (!text) continue;
    if (
      normalizeForKey(h.incident_status || "") !==
      normalizeForKey(data.incident_status)
    )
      continue;
    if (latestStatusUpdate && text === latestStatusUpdate) continue;
    const norm = text
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (seenTexts.has(norm)) continue;
    seenTexts.add(norm);
    previousStatusUpdates.push({ text, updatedAt: h.updated_at });
  }

  const injectUpdateTime = (text, updatedAt) => {
    if (!text || !updatedAt) return text || "";
    if (/\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}/.test(text)) return text;
    const date = new Date(updatedAt);
    const formatted = date.toLocaleString("en-GB", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const cleaned = text.replace(/^<[^>]+>/, "").replace(/<\/[^>]+>$/, "");
    return `${formatted} — ${cleaned}`;
  };

  const el = React.createElement;

  return el(
    "div",
    {
      style: {
        width: "650px",
        margin: "0 auto",
        backgroundColor: "#FFFFFF",
        fontFamily: FONT,
        border: "1px solid #E5E7EB",
        colorScheme: "light",
      },
    },

    /* ═══ BANNER IMAGE (has logo + department + status baked in) ═══ */
    bannerImageSrc &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              null,
              el("img", {
                src: bannerImageSrc,
                alt: "Incident Banner",
                width: "650",
                style: {
                  display: "block",
                  width: "100%",
                  maxWidth: "650px",
                  height: "auto",
                },
              }),
            ),
          ),
        ),
      ),

    /* ═══ FLOW IMAGE (timeline status dots) ═══ */
    data.incident_status !== "Not an Issue" &&
      imageSrc &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: {
            borderCollapse: "collapse",
            borderBottom: "1px solid #E5E7EB",
          },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              { style: { padding: "4px 0" } },
              el("img", {
                src: imageSrc,
                alt: "timeline",
                style: { width: "100%", display: "block", margin: "0 auto" },
              }),
            ),
          ),
        ),
      ),

    /* ═══ LATEST UPDATE ═══ */
    latestStatusUpdate &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              { style: { padding: "24px 36px 0 36px" } },
              el(
                "div",
                { style: { ...labelStyle, marginBottom: "10px" } },
                "Latest Update",
              ),
              el("div", {
                style: {
                  backgroundColor: "#F0FDF4",
                  borderLeft: "3px solid #16A34A",
                  padding: "14px 16px",
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: "1.6",
                  fontFamily: FONT,
                },
                dangerouslySetInnerHTML: {
                  __html: `<strong style="font-weight:600;">Latest Update:</strong> ${inlineLatestUpdateHtml(latestStatusUpdate)}`,
                },
              }),
            ),
          ),
        ),
      ),

    /* ═══ DESCRIPTION ═══ */
    el(
      "table",
      {
        width: "100%",
        cellPadding: "0",
        cellSpacing: "0",
        style: { borderCollapse: "collapse" },
      },
      el(
        "tbody",
        null,
        el(
          "tr",
          null,
          el(
            "td",
            { style: { padding: "24px 36px 0 36px" } },
            el(
              "div",
              { style: { ...labelStyle, marginBottom: "10px" } },
              "Description",
            ),
            el("div", {
              style: {
                fontSize: "14px",
                color: "#374151",
                lineHeight: "1.7",
                fontFamily: FONT,
              },
              dangerouslySetInnerHTML: {
                __html: sanitizeEmailHtml(data.incident_details),
              },
            }),
          ),
        ),
      ),
    ),

    /* ═══ PREVIOUS UPDATES ═══ */
    previousStatusUpdates.length > 0 &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              { style: { padding: "24px 36px 0 36px" } },
              el(
                "div",
                { style: { ...labelStyle, marginBottom: "10px" } },
                "Previous Updates",
              ),
              ...previousStatusUpdates.map((item, idx) =>
                el("div", {
                  key: idx,
                  style: {
                    backgroundColor: "#FFFBEB",
                    borderLeft: "3px solid #F59E0B",
                    padding: "12px 16px",
                    fontSize: "14px",
                    color: "#1F2937",
                    lineHeight: "1.6",
                    fontFamily: FONT,
                    marginBottom:
                      idx < previousStatusUpdates.length - 1 ? "8px" : "0",
                  },
                  dangerouslySetInnerHTML: {
                    __html: sanitizeEmailHtml(
                      injectUpdateTime(item.text, item.updatedAt),
                    ),
                  },
                }),
              ),
            ),
          ),
        ),
      ),

    /* ═══ KEY DETAILS ═══ */
    el(
      "table",
      {
        width: "100%",
        cellPadding: "0",
        cellSpacing: "0",
        style: { borderCollapse: "collapse" },
      },
      el(
        "tbody",
        null,
        /* Section header */
        el(
          "tr",
          null,
          el(
            "td",
            { colSpan: "2", style: { padding: "28px 36px 0 36px" } },
            el(
              "div",
              {
                style: {
                  ...labelStyle,
                  marginBottom: "16px",
                  fontSize: "11px",
                  letterSpacing: "1px",
                },
              },
              "Key Details",
            ),
          ),
        ),

        /* Started + Discovered */
        el(
          "tr",
          null,
          el(
            "td",
            {
              style: {
                width: "50%",
                padding: "0 16px 16px 36px",
                verticalAlign: "top",
              },
            },
            el("div", { style: labelStyle }, "Started On (UTC)"),
            el(
              "div",
              { style: valueStyle },
              formatDate(data.start_time) || "—",
            ),
          ),
          el(
            "td",
            {
              style: {
                width: "50%",
                padding: "0 36px 16px 16px",
                verticalAlign: "top",
                borderLeft: "1px solid #F3F4F6",
              },
            },
            el("div", { style: labelStyle }, "Discovered On (UTC)"),
            el(
              "div",
              { style: valueStyle },
              formatDate(data.discovered_time) || "—",
            ),
          ),
        ),

        /* Resolved on + Incident type (2-col when resolved; full-width type otherwise) */
        showResolvedOnRow
          ? el(
              "tr",
              null,
              el(
                "td",
                {
                  style: {
                    width: "50%",
                    padding: "0 16px 16px 36px",
                    borderTop: "1px solid #F3F4F6",
                    paddingTop: "16px",
                    verticalAlign: "top",
                  },
                },
                el("div", { style: labelStyle }, "Resolved On (UTC)"),
                el(
                  "div",
                  { style: { ...valueStyle, color: "#16A34A" } },
                  formatDate(data.resolved_time) || "—",
                ),
              ),
              el(
                "td",
                {
                  style: {
                    width: "50%",
                    padding: "0 36px 16px 16px",
                    borderTop: "1px solid #F3F4F6",
                    paddingTop: "16px",
                    borderLeft: "1px solid #F3F4F6",
                    verticalAlign: "top",
                  },
                },
                el("div", { style: labelStyle }, "Incident Type"),
                el("div", { style: valueStyle }, incidentTypeDisplay),
              ),
            )
          : el(
              "tr",
              null,
              el(
                "td",
                {
                  colSpan: "2",
                  style: {
                    padding: "0 36px 16px 36px",
                    borderTop: "1px solid #F3F4F6",
                    paddingTop: "16px",
                  },
                },
                el("div", { style: labelStyle }, "Incident Type"),
                el("div", { style: valueStyle }, incidentTypeDisplay),
              ),
            ),

        /* Severity + Product */
        el(
          "tr",
          null,
          el(
            "td",
            {
              style: {
                width: "50%",
                padding: "0 16px 16px 36px",
                borderTop: "1px solid #F3F4F6",
                paddingTop: "16px",
                verticalAlign: "top",
              },
            },
            el(
              "div",
              { style: { ...labelStyle, marginBottom: "6px" } },
              "Severity",
            ),
            el(
              "div",
              {
                style: {
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "4px",
                  backgroundColor:
                    (severity_colorMap[data.severity] || {}).bgColor ||
                    "#F3F4F6",
                  color:
                    (severity_colorMap[data.severity] || {}).color || "#374151",
                  border: `1px solid ${(severity_colorMap[data.severity] || {}).borderColor || "#E5E7EB"}`,
                  fontSize: "13px",
                  fontWeight: "600",
                  fontFamily: FONT,
                },
              },
              data.severity,
            ),
          ),
          el(
            "td",
            {
              style: {
                width: "50%",
                padding: "0 36px 16px 16px",
                borderTop: "1px solid #F3F4F6",
                paddingTop: "16px",
                borderLeft: "1px solid #F3F4F6",
                verticalAlign: "top",
              },
            },
            el("div", { style: labelStyle }, "Affected Product"),
            el("div", { style: valueStyle }, data.affected_product || "—"),
          ),
        ),

        /* Level + Region */
        el(
          "tr",
          null,
          el(
            "td",
            {
              style: {
                width: "50%",
                padding: "0 16px 16px 36px",
                borderTop: "1px solid #F3F4F6",
                paddingTop: "16px",
                verticalAlign: "top",
              },
            },
            el("div", { style: labelStyle }, "Level of Impact"),
            el("div", { style: valueStyle }, data.service_impacted || "—"),
          ),
          el(
            "td",
            {
              style: {
                width: "50%",
                padding: "0 36px 16px 16px",
                borderTop: "1px solid #F3F4F6",
                paddingTop: "16px",
                borderLeft: "1px solid #F3F4F6",
                verticalAlign: "top",
              },
            },
            el("div", { style: labelStyle }, "Region Impacted"),
            el("div", { style: valueStyle }, data.region_impacted || "—"),
          ),
        ),

        /* Revenue + Next Update */
        ["suspected", "ongoing", "resolved", "resolved with rca"].includes(
          normalized,
        ) &&
          el(
            "tr",
            null,
            el(
              "td",
              {
                style: {
                  width: "50%",
                  padding: "0 16px 16px 36px",
                  borderTop: "1px solid #F3F4F6",
                  paddingTop: "16px",
                  verticalAlign: "top",
                },
              },
              el("div", { style: labelStyle }, "Revenue Impact"),
              el(
                "div",
                { style: valueStyle },
                data.revenue_impact_details || "Not yet calculated",
              ),
            ),
            data.next_update === "Yes"
              ? el(
                  "td",
                  {
                    style: {
                      width: "50%",
                      padding: "0 36px 16px 16px",
                      borderTop: "1px solid #F3F4F6",
                      paddingTop: "16px",
                      borderLeft: "1px solid #F3F4F6",
                      verticalAlign: "top",
                    },
                  },
                  el("div", { style: labelStyle }, "Next Update"),
                  el(
                    "div",
                    { style: valueStyle },
                    formatDate(data.next_update_time),
                  ),
                )
              : el("td", {
                  style: { width: "50%", borderTop: "1px solid #F3F4F6" },
                }),
          ),
      ),
    ),

    /* ═══ WORKAROUND ═══ */
    data.workaround === "Yes" &&
      data.workaround_details &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              { style: { padding: "24px 36px 0 36px" } },
              el(
                "div",
                { style: { ...labelStyle, marginBottom: "10px" } },
                "Workaround Provided",
              ),
              el("div", {
                style: {
                  backgroundColor: "#F0FDF4",
                  borderLeft: "3px solid #16A34A",
                  padding: "14px 16px",
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: "1.6",
                  fontFamily: FONT,
                },
                dangerouslySetInnerHTML: {
                  __html: sanitizeEmailHtml(data.workaround_details),
                },
              }),
            ),
          ),
        ),
      ),

    /* ═══ RESOLVED DETAILS ═══ */
    (normalized === "resolved" || normalized === "resolved with rca") &&
      data.resolved_details &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              { style: { padding: "24px 36px 0 36px" } },
              el(
                "div",
                { style: { ...labelStyle, marginBottom: "10px" } },
                "Resolution Details",
              ),
              el("div", {
                style: {
                  backgroundColor: "#F0FDF4",
                  borderLeft: "3px solid #16A34A",
                  padding: "14px 16px",
                  fontSize: "14px",
                  color: "#374151",
                  lineHeight: "1.6",
                  fontFamily: FONT,
                },
                dangerouslySetInnerHTML: {
                  __html: sanitizeEmailHtml(data.resolved_details),
                },
              }),
            ),
          ),
        ),
      ),

    /* ═══ RCA DETAILS ═══ */
    normalized === "resolved with rca" &&
      data.resolved_with_rca_details &&
      el(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        el(
          "tbody",
          null,
          el(
            "tr",
            null,
            el(
              "td",
              { style: { padding: "24px 36px 0 36px" } },
              el(
                "div",
                { style: { ...labelStyle, marginBottom: "10px" } },
                "Root Cause Analysis",
              ),
              el("div", {
                style: {
                  backgroundColor: "#EFF6FF",
                  borderLeft: "3px solid #2563EB",
                  padding: "14px 16px",
                  fontSize: "14px",
                  color: "#1F2937",
                  lineHeight: "1.6",
                  fontFamily: FONT,
                },
                dangerouslySetInnerHTML: {
                  __html: sanitizeEmailHtml(data.resolved_with_rca_details),
                },
              }),
            ),
          ),
        ),
      ),

    /* ═══ FOOTER ═══ */
    el(
      "table",
      {
        width: "100%",
        cellPadding: "0",
        cellSpacing: "0",
        style: { borderCollapse: "collapse", marginTop: "28px" },
      },
      el(
        "tbody",
        null,
        /* Accent line */
        el(
          "tr",
          null,
          el("td", {
            colSpan: "2",
            style: { height: "2px", backgroundColor: "#2563EB" },
          }),
        ),

        /* Action buttons */
        el(
          "tr",
          null,
          el(
            "td",
            {
              colSpan: "2",
              style: {
                backgroundColor: "#F9FAFB",
                padding: "18px 36px",
                textAlign: "center",
              },
            },
            el(
              "table",
              {
                cellPadding: "0",
                cellSpacing: "0",
                style: { margin: "0 auto", borderCollapse: "collapse" },
              },
              el(
                "tbody",
                null,
                el(
                  "tr",
                  null,
                  el(
                    "td",
                    { style: { paddingRight: "8px" } },
                    el(
                      "a",
                      {
                        href: data.incident_link || "#",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        style: {
                          display: "inline-block",
                          padding: "9px 22px",
                          backgroundColor: "#2563EB",
                          color: "#FFFFFF",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none",
                          fontFamily: FONT,
                        },
                      },
                      el("span", { style: { marginRight: "6px" } }, "🔗"),
                      "View Incident",
                    ),
                  ),
                  el(
                    "td",
                    { style: { paddingLeft: "8px" } },
                    el(
                      "a",
                      {
                        href: `${FRONTEND_URL}/recipients/${data.display_id}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        style: {
                          display: "inline-block",
                          padding: "9px 22px",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #D1D5DB",
                          color: "#374151",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none",
                          fontFamily: FONT,
                        },
                      },
                      el("span", { style: { marginRight: "6px" } }, "👥"),
                      "View Recipients",
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),

        /* Team + ID */
        el(
          "tr",
          null,
          el(
            "td",
            {
              style: {
                backgroundColor: "#F9FAFB",
                padding: "0 36px 18px 36px",
                verticalAlign: "middle",
              },
            },
            el(
              "div",
              {
                style: {
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#111827",
                  fontFamily: FONT,
                },
              },
              "Taboola Incident Management",
            ),
            el(
              "div",
              {
                style: {
                  fontSize: "11px",
                  color: "#9CA3AF",
                  marginTop: "2px",
                  fontFamily: FONT,
                },
              },
              "IncidentManagement@taboola.com",
            ),
          ),
          el(
            "td",
            {
              style: {
                backgroundColor: "#F9FAFB",
                padding: "0 36px 18px 36px",
                textAlign: "right",
                verticalAlign: "middle",
              },
            },
            el(
              "div",
              {
                style: {
                  fontSize: "10px",
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "2px",
                  fontFamily: FONT,
                },
              },
              "Salesforce Case ID",
            ),
            el(
              "div",
              {
                style: {
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#111827",
                  fontFamily: FONT,
                },
              },
              salesforceCaseId,
            ),
          ),
        ),

        /* Disclaimer */
        el(
          "tr",
          null,
          el(
            "td",
            {
              colSpan: "2",
              style: {
                backgroundColor: "#F3F4F6",
                padding: "12px 36px",
                textAlign: "center",
              },
            },
            el(
              "div",
              {
                style: { fontSize: "10px", color: "#9CA3AF", fontFamily: FONT },
              },
              "This is an incident notification from Taboola Incident Management Platform",
            ),
          ),
        ),
      ),
    ),
  );
};

/* ── Helpers ── */
const sanitizeEmailHtml = (input) => {
  if (input === null || input === undefined) return "";
  if (typeof input === "string") {
    return input
      .replace(/<p>/gi, '<div style="margin:0;padding:0;">')
      .replace(/<\/p>/gi, "</div>")
      .replace(/<strong>/gi, '<strong style="font-weight:600;">');
  }
  if (typeof input === "number" || typeof input === "boolean")
    return String(input);
  return "";
};

const inlineLatestUpdateHtml = (input) => {
  if (!input) return "";
  if (typeof input !== "string") return String(input);
  return input
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<strong>/gi, '<strong style="font-weight:600;">');
};

module.exports = EmailTemplate;
