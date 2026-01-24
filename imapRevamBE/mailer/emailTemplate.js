const React = require("react");
const flowImages = require("./statusFlow"); // <-- correct import
const { formatDate } = require("../utils/formatDate");
const bannerFlow = require("./bannerFlow");

/* STATUS COLOR MAP (unchanged) */
const COLOR_MAP = {
  suspected: {
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  ongoing: {
    color: "#EF4444",
    bgColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  resolved: {
    color: "#10B981",
    bgColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  "resolved with rca": {
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
};

/* NORMALIZATION FIX — exact flowImages key format */
const normalizeForKey = (s = "") => s.toLowerCase().trim();

const EmailTemplate = ({ data }) => {
  /* REMAINING STATUS */
  const remaining = data.remainingStatus || [];

  const firstStatus = remaining.length > 0 ? remaining[0].statusName : "";

  const currentStatus = data.showStatus || data.status;

  /* KNOWN ISSUE second image logic */
  const knownIssue = String(data.known_issue).toLowerCase() === "yes" ? 1 : 0;

  /* TIMELINE IMAGE LOOKUP */
  let imageSrc = null;
  if (firstStatus && currentStatus) {
    const key = `${normalizeForKey(firstStatus)}|${normalizeForKey(
      currentStatus
    )}`;
    const images = flowImages[key];
    if (images) {
      imageSrc = images[knownIssue] || images[0];
    }
  }
  let bannerImageSrc = null;

  if (currentStatus) {
    const key = `Banner|${currentStatus}`;
    const images = bannerFlow[key];
    if (images) {
      bannerImageSrc = images[0];
    }
  }
  // console.log(bannerImageSrc);

  // const BASE_URL = process.env.PUBLIC_BASE_URL;

  // const headerUrl =
  // `${BASE_URL}/email/header` +
  // `?id=${data.display_id}` +
  // `&status=${encodeURIComponent(data.showStatus)}` +
  // `&v=${Date.now()}`;

  // History from DB (older updates only)
  const history = Array.isArray(data.history) ? data.history : [];

  // Latest update comes ONLY from submitted form
  const latestStatusUpdate =
    typeof data.status_update_details === "string"
      ? data.status_update_details.trim()
      : null;
      const previousStatusUpdates = [];
      const seenTexts = new Set();
      
      for (const h of history) {
        const text = (h.status_update_details || "").trim();
        if (!text) continue;
      
        const oldStatus = normalizeForKey(h.status || "");
        const currentStatus = normalizeForKey(data.status);
      
        if (oldStatus !== currentStatus) continue;
      
        // exclude latest form update
        if (latestStatusUpdate && text === latestStatusUpdate) continue;
      
        // normalize text for comparison
        const normalizedText = text
          .replace(/<[^>]*>/g, "") // strip HTML
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      
        // ✅ skip duplicates
        if (seenTexts.has(normalizedText)) continue;
      
        seenTexts.add(normalizedText);
      
        previousStatusUpdates.push({
          text,
          updatedAt: h.updated_at,
        });
      }
      
  const injectUpdateTime = (text, updatedAt) => {
    if (!text || !updatedAt) return text || "";

    // prevent double injection
    if (/\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}/.test(text)) {
      return text;
    }

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

    // Remove any leading HTML wrappers
    const cleaned = text.replace(/^<[^>]+>/, "").replace(/<\/[^>]+>$/, "");

    return `Status Update : ${formatted} - ${cleaned}`;
  };

  /* STATUS BADGE COLOR */
  const normalized = normalizeForKey(currentStatus);
  const cfg = COLOR_MAP[normalized] || {
    color: "#6B7280",
    bgColor: "#E5E7EB",
    borderColor: "#D1D5DB",
  };

  return React.createElement(
    "div",
    {
      style: {
        width: "650px",
        margin: "0 auto",
        border: "1px solid #D1D5DB",
        backgroundColor: "#FFFFFF",
        fontFamily: '"Poppins", Arial, sans-serif',
        colorScheme: "light",
        supportedColorSchemes: "light",
      },
    },

    /* HEADER */
    // React.createElement(
    //   "table",
    //   {
    //     style: {
    //       width: "100%",
    //       background: "#7bcdff",
    //     },
    //   },
    //   React.createElement(
    //     "tbody",
    //     null,
    //     React.createElement(
    //       "tr",
    //       null,
    //       React.createElement(
    //         "td",
    //         { style: { padding: "32px 28px" } },

    //         React.createElement(
    //           "div",
    //           { style: { fontSize: "24px", color: "#0056f0" } },
    //           "Incident Notification"
    //         ),

    //         // React.createElement(
    //         //   "div",
    //         //   {
    //         //     style: { fontSize: "13px", color: "#0056f0", marginTop: "4px" },
    //         //   },
    //         //   React.createElement(
    //         //     "span",
    //         //     { style: { color: "#0056f0"} },
    //         //     "Incident ID: "
    //         //   ),
    //         //     data.display_id || data.incident_number
    //         // ),

    //         React.createElement(
    //           "div",
    //           {
    //             style: {
    //               marginTop: "14px",
    //               display: "inline-block",
    //               // backgroundColor: cfg.bgColor,
    //               color: "#ffffff",
    //               border: `2px solid ${cfg.borderColor}`,
    //               padding: "6px 14px",
    //               borderRadius: "5px",
    //               fontWeight: "700",
    //               fontSize: "14px",
    //             },
    //           },
    //           currentStatus.toUpperCase()
    //         )
    //       )
    //     )
    //   )
    // ),
    bannerImageSrc &&
      React.createElement(
        "table",
        {
          width: "100%",
          cellPadding: "0",
          cellSpacing: "0",
          style: { borderCollapse: "collapse" },
        },
        React.createElement(
          "tbody",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement(
              "td",
              null,
              React.createElement("img", {
                src: bannerImageSrc,
                alt: "Incident Banner",
                width: "650",
                style: {
                  display: "block",
                  width: "100%",
                  maxWidth: "650px",
                  height: "auto",
                },
              })
            )
          )
        )
      ),

    //    React.createElement(
    //   "table",
    //   {
    //     style: {
    //       width: "100%",
    //       background: "linear-gradient(135deg,#1E3A8A,#3B82F6)",
    //     },
    //   },
    //   React.createElement(
    //     "tbody",
    //     null,
    //     React.createElement(
    //       "tr",
    //       null,
    //       React.createElement(
    //         "td",
    //         { style: { padding: "32px 28px" } },

    //         React.createElement("img", {
    //           src: headerUrl,
    //           width: "650",
    //           height: "140",
    //           style: {
    //             display: "block",
    //             width: "100%",
    //             maxWidth: "650px",
    //             height: "auto",
    //           },
    //           alt: "Incident Header",
    //         })
    //       )
    //     )
    //   )
    // ),
    /* INSERTED FLOW IMAGE */
    data.status != "Not an Issue" &&
      imageSrc &&
      React.createElement(
        "table",
        {
          width: "100%",
          style: { textAlign: "center", borderBottom: "1px solid #E5E7EB" },
        },
        React.createElement(
          "tbody",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement(
              "td",
              { style: { padding: "4px 0" } },
              React.createElement("img", {
                src: imageSrc,
                alt: "timeline",
                style: { width: "100%", display: "block", margin: "0 auto" },
              })
            )
          )
        )
      ),
    /* Latest Status Update */
    latestStatusUpdate &&
      infoRowWithLabel(
        "LATEST UPDATE",
        `Latest Update: ${inlineLatestUpdateHtml(latestStatusUpdate)}`,
        "#ECFDF5",
        "#10B981"
      ),

    /* DESCRIPTION */
    row1("DESCRIPTION", data.incident_details),

    /* Previous Status Update */
    previousStatusUpdates.length > 0 &&
      React.createElement(
        React.Fragment,
        null,

        // Label (no padding)
        row1("PREVIOUS UPDATE"),

        // Each update wrapped with padding
        ...previousStatusUpdates.map((item, idx) =>
          React.createElement(
            "div",
            {
              key: idx,
              style: { padding: "0 28px 0 28px" },
            },
            infoBlock(
              injectUpdateTime(item.text, item.updatedAt),
              "#FEF3C7",
              "#F59E0B",
              { marginTop: idx === 0 ? "0.5rem" : "1rem" }
            )
          )
        )
      ),
    /* STARTED + DISCOVERED */
    row2(
      "STARTED ON (UTC)",
      formatDate(data.start_time) || "-",
      "DISCOVERED ON (UTC)",
      formatDate(data.discovered_time) || "-"
    ),

    (normalized === "resolved" || normalized === "resolved with rca") &&
      row1(
        "RESOLVED ON (UTC)",
        val(formatDate(data.resolved_time), { color: "#059669" })
      ),
    /* SEVERITY & PRODUCT */
    row2(
      "SEVERITY",
      severity(data.severity),
      "AFFECTED PRODUCT",
      data.affected_product
    ),

    /* LEVEL & REGION */
    row2(
      "LEVEL OF IMPACT",
      data.service_impacted,
      "REGION IMPACTED",
      data.region_impacted
    ),

    /* REVENUE + NEXT UPDATE (SIDE BY SIDE WHEN AVAILABLE) */
    ["suspected", "ongoing", "resolved", "resolved with rca"].includes(
      normalized
    ) &&
      row2(
        "REVENUE IMPACT",
        data.revenue_impact_details || "Not yet calculated",
        data.next_update === "Yes" ? "NEXT UPDATE" : null,
        data.next_update === "Yes" ? formatDate(data.next_update_time) : null
      ),

    // /* NEXT UPDATE */
    // data.next_update === "Yes" &&
    //   data.next_update_time &&
    //   row1("NEXT UPDATE", data.next_update_time),

    // data.next_update === "No" &&
    //   infoRowWithLabel(
    //     "NEXT UPDATE",
    //     "Updates will be shared as progress continues.",
    //     "#FEF3C7",
    //     "#F59E0B"
    //   ),

    // /* AFFECTED ACCOUNTS */
    // (normalized === "resolved" || normalized === "resolved with rca") &&
    //   data.affected_accounts &&
    //   row1("AFFECTED ACCOUNTS", data.affected_accounts),

    // workaround
    data.workaround === "Yes" &&
      infoRowWithLabel(
        "WORKAROUND PROVIDED",
        data.workaround_details,
        "#ECFDF5",
        "#10B981"
      ),

    /* RESOLUTION DETAILS */
    (normalized === "resolved" || normalized === "resolved with rca") &&
      data.resolved_details &&
      infoRowWithLabel(
        "RESOLVED DETAILS",
        data.resolved_details,
        "#ECFDF5",
        "#10B981"
      ),

    /* RCA DETAILS */
    normalized === "resolved with rca" &&
      data.resolved_with_rca_details &&
      infoRowWithLabel(
        "RESOLVED WITH RCA",
        data.resolved_with_rca_details,
        "#DBEAFE",
        "#3B82F6"
      ),

    /* FOOTER */
    React.createElement(
      "table",
      {
        style: {
          width: "100%",
          backgroundColor: "#F9FAFB",
          borderTop: "1px solid #E5E7EB",
          marginTop: "32px",
        },
      },
      React.createElement(
        "tbody",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement(
            "td",
            { style: { padding: "28px" } },
            React.createElement(
              "div",
              { style: { fontWeight: "600", color: "#1F2937" } },
              "The Taboola Incident Management Team"
            ),
            React.createElement(
              "div",
              { style: { fontSize: "12px", color: "#6B7280" } },
              "support@taboola.com"
            )
          ),
          React.createElement(
            "td",
            { style: { textAlign: "end", paddingRight: "10px" } },
            React.createElement("div", {
              style: { fontSize: "13px", fontWeight: "600", color: "#1F2937" },
            }),
            React.createElement(
              "span",
              { style: { color: "#6B7280", marginRight: "6px" } },
              "Incident ID:"
            ),
            incidentLinkEl(data.incident_number, data.incident_link)
          )
        )
      )
    )
  );
};

/* ----------- helpers (UNMODIFIED) ----------- */

const label = (text) =>
  React.createElement(
    "div",
    {
      style: {
        fontSize: "12px",
        color: "#6B7280",
        marginBottom: "10px",
        letterSpacing: "0.5px",
      },
    },
    text
  );

const val = (content, style = {}) => {
  // ✅ React element → render directly
  if (React.isValidElement(content)) {
    return React.createElement(
      "div",
      {
        style: {
          fontFamily: '"Poppins", Arial, sans-serif',
          fontSize: "14px",
          marginTop: "6px",
          ...style,
        },
      },
      content
    );
  }

  // ✅ String / number / boolean → sanitize
  return React.createElement("div", {
    style: {
      fontFamily: '"Poppins", Arial, sans-serif',
      fontSize: "14px",
      color: "#1F2937",
      marginTop: "6px",
      ...style,
    },
    dangerouslySetInnerHTML: {
      __html: sanitizeEmailHtml(content),
    },
  });
};

const severity = (text) =>
  React.createElement(
    "div",
    {
      style: {
        display: "inline-block",
        padding: "7px 14px",
        borderRadius: "5px",
        backgroundColor: "#FEE2E2",
        color: "#DC2626",
        border: "1px solid #FECACA",
        fontSize: "14px",
      },
    },
    text
  );

const infoRowWithLabel = (title, content, bg, border) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "24px 28px 0 28px",
      },
    },
    label(title),
    infoBlock(content, bg, border)
  );

const infoBlock = (html, bg, border, options = {}) =>
  React.createElement("div", {
    style: {
      backgroundColor: bg,
      borderLeft: `3px solid ${border}`,
      padding: "12px",
      borderRadius: "4px",
      marginTop: options.marginTop ?? "1rem",
      fontSize: "14px",
      color: "#1F2937",
    },
    dangerouslySetInnerHTML: {
      __html: sanitizeEmailHtml(html) || "",
    },
  });

const row2 = (l1, v1, l2, v2) =>
  React.createElement(
    "table",
    { style: { width: "100%", borderCollapse: "collapse" } },
    React.createElement(
      "tbody",
      null,
      React.createElement(
        "tr",
        null,
        React.createElement(
          "td",
          { style: { width: "50%", padding: "24px 16px 0 28px" } },
          label(l1),
          val(v1)
        ),
        l2 &&
          React.createElement(
            "td",
            { style: { width: "50%", padding: "24px 28px 0 16px" } },
            label(l2),
            val(v2)
          )
      )
    )
  );

const row1 = (l, v) =>
  React.createElement(
    "table",
    { style: { width: "100%", borderCollapse: "collapse" } },
    React.createElement(
      "tbody",
      null,
      React.createElement(
        "tr",
        null,
        React.createElement(
          "td",
          { colSpan: "2", style: { padding: "24px 28px 0 28px" } },
          label(l),
          val(v)
        )
      )
    )
  );

const sanitizeEmailHtml = (input) => {
  if (input === null || input === undefined) return "";

  // If already a string → sanitize
  if (typeof input === "string") {
    return input
      .replace(/<p>/gi, '<div style="margin:0;padding:0;">')
      .replace(/<\/p>/gi, "</div>")
      .replace(/<strong>/gi, '<strong style="font-weight:600;">');
  }

  // If number / boolean → convert safely
  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }

  // Anything else (React elements, objects) → DO NOT sanitize
  return "";
};

const inlineLatestUpdateHtml = (input) => {
  if (!input) return "";

  if (typeof input !== "string") return String(input);

  return (
    input
      // remove block wrappers completely
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/p>/gi, "")
      .replace(/<div[^>]*>/gi, "")
      .replace(/<\/div>/gi, "")
      // keep strong / em inline
      .replace(/<strong>/gi, '<strong style="font-weight:600;">')
  );
};
const incidentLinkEl = (incidentNumber, incidentLink) => {
  if (!incidentLink) return incidentNumber;

  return React.createElement(
    "a",
    {
      href: incidentLink,
      target: "_blank",
      rel: "noopener noreferrer",
      style: {
        color: "#2563eb",
        textDecoration: "underline",
        fontWeight: "600",
      },
    },
    incidentNumber
  );
};

module.exports = EmailTemplate;
