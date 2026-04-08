import React, { useState } from "react";
import { formatDate } from "./formatDate";
import incidentLogo from "../assets/incidentLogo.png";
import RecipientsPreviewModal from "../components/RecipientsPreviewModal";

/* ── STATUS COLORS (header badge, labels) ── */
const STATUS_COLORS = {
  suspected: "#F59E0B",
  ongoing: "#EF4444",
  resolved: "#22C55E",
  "resolved-rca": "#15803D",
};

/* Same URLs as imapRevamBE/mailer/statusFlow.js — matches sent email timeline PNG */
const FLOW_TIMELINE_BASE =
  "https://cdn.taboola.com/images_incident_management/progress-timeline";

const FLOW_TIMELINE_IMAGES = {
  "suspected|suspected": [`${FLOW_TIMELINE_BASE}/suspected-rca-1.png`],
  "suspected|ongoing": [`${FLOW_TIMELINE_BASE}/suspected-rca-2.png`],
  "suspected|resolved": [`${FLOW_TIMELINE_BASE}/suspected-rca-3.png`],
  "suspected|resolved with rca": [`${FLOW_TIMELINE_BASE}/suspected-rca-4.png`],
  "ongoing|ongoing": [
    `${FLOW_TIMELINE_BASE}/ongoing-rca-1.png`,
    `${FLOW_TIMELINE_BASE}/ongoing-resolved-1.png`,
  ],
  "ongoing|resolved": [
    `${FLOW_TIMELINE_BASE}/ongoing-rca-2.png`,
    `${FLOW_TIMELINE_BASE}/ongoing-resolved-2.png`,
  ],
  "ongoing|resolved with rca": [`${FLOW_TIMELINE_BASE}/ongoing-rca-3.png`],
  "resolved|resolved": [
    `${FLOW_TIMELINE_BASE}/resolved-rca-1.png`,
    `${FLOW_TIMELINE_BASE}/resolved-2.png`,
  ],
  "resolved|resolved with rca": [`${FLOW_TIMELINE_BASE}/resolved-rca-1.png`],
  "resolved with rca|resolved with rca": [
    `${FLOW_TIMELINE_BASE}/Resolved-%20RCA-2.png`,
  ],
};

const normalizeForFlowKey = (s = "") => String(s).toLowerCase().trim();

/* Same URLs as imapRevamBE/mailer/bannerFlow.js — key: `${department}|${status}` */
const BANNER_BASE = "https://cdn.taboola.com/images_incident_management";
const BANNER_FLOW = {
  "Publisher|Suspected": [`${BANNER_BASE}/suspected-publisher.png`],
  "Publisher|Ongoing": [`${BANNER_BASE}/ongoing-publisher.png`],
  "Publisher|Resolved": [`${BANNER_BASE}/resolved-publisher.png`],
  "Publisher|Resolved with RCA": [`${BANNER_BASE}/resolved-with-rca-publisher.png`],
  "Publisher|Not an Issue": [`${BANNER_BASE}/not-an-issue-publisher.png`],
  "Advertiser|Suspected": [`${BANNER_BASE}/suspected-advertiser.png`],
  "Advertiser|Ongoing": [`${BANNER_BASE}/ongoing-advertiser.png`],
  "Advertiser|Resolved": [`${BANNER_BASE}/resolved-advertiser.png`],
  "Advertiser|Resolved with RCA": [`${BANNER_BASE}/resolved-with-rca-advertiser.png`],
  "Advertiser|Not an Issue": [`${BANNER_BASE}/not-an-issue-advertiser.png`],
  "General|Suspected": [`${BANNER_BASE}/suspected-general.png`],
  "General|Ongoing": [`${BANNER_BASE}/ongoing-general.png`],
  "General|Resolved": [`${BANNER_BASE}/resolved-general.png`],
  "General|Resolved with RCA": [`${BANNER_BASE}/resolved-with-rca-general.png`],
  "General|Not an Issue": [`${BANNER_BASE}/not-an-issue-general.png`],
};

/** Circle / connector colors when CDN image is unavailable (closer to Taboola assets) */
const TIMELINE_NODE = {
  suspected: { fill: "#F59E0B", line: "#F59E0B", label: "#D97706" },
  ongoing: { fill: "#EF4444", line: "#EF4444", label: "#DC2626" },
  resolved: { fill: "#22C55E", line: "#22C55E", label: "#16A34A" },
  "resolved-rca": { fill: "#166534", line: "#22C55E", label: "#15803D" },
};

const severity_colorMap = {
  Standard: { color: "#1D4ED8", bgColor: "#DBEAFE", borderColor: "#BFDBFE" },
  High: { color: "#C2410C", bgColor: "#FFEDD5", borderColor: "#FED7AA" },
  Emergency: { color: "#DC2626", bgColor: "#FEE2E2", borderColor: "#FECACA" },
};

const normalizeStatus = (status) => {
  if (!status) return "";
  const s = status.toLowerCase().trim();
  if (s === "resolved with rca") return "resolved-rca";
  return s;
};

const EmailTemplateLayout = ({ data }) => {
  // console.log(data);
  
  const [recipientsModalOpen, setRecipientsModalOpen] = useState(false);
  const normalizedStatus = normalizeStatus(data.radio.status);

  const extractPlainText = (html = "") =>
    html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const statusColor = STATUS_COLORS[normalizedStatus] || "#6B7280";

  const remainingStatus = data.radio.remainingStatus || [];
  const currentIndex = remainingStatus.findIndex(
    (s) => normalizeStatus(s.statusName) === normalizedStatus
  );

  const flowTimelineImageSrc = (() => {
    const first = remainingStatus[0]?.statusName;
    const cur = data.radio.status;
    if (!first || !cur || cur === "Not an Issue") return null;
    const key = `${normalizeForFlowKey(first)}|${normalizeForFlowKey(cur)}`;
    const urls = FLOW_TIMELINE_IMAGES[key];
    if (!urls?.length) return null;
    const knownIdx = data.radio.known_issue === "Yes" ? 1 : 0;
    return urls[knownIdx] || urls[0];
  })();

  const bannerImageSrc = (() => {
    const dept = data.departmentName;
    const st = data.radio.status;
    if (!dept || !st) return null;
    const key = `${dept}|${st}`;
    const urls = BANNER_FLOW[key];
    return urls?.[0] ?? null;
  })();

  const timelineNodePalette = (stepKey) =>
    TIMELINE_NODE[stepKey] || {
      fill: "#D1D5DB",
      line: "#E5E7EB",
      label: "#9CA3AF",
    };

  const InlineHtml = ({ html }) => (
    <span dangerouslySetInnerHTML={{ __html: (html || "").replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "").replace(/<div[^>]*>/gi, "").replace(/<\/div>/gi, "") }} />
  );

  const HtmlBlock = ({ html, style = {} }) => (
    <div style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7", ...style }} dangerouslySetInnerHTML={{ __html: html || "" }} />
  );

  const incidentNumber =
    data.history.length > 0 && data.history[0].incident_number
      ? data.history[0].incident_number
      : data.inputBox.inputNumber;

  const history = data.history || [];
  const rawLatestUpdate = data.textArea?.statusUpdateDetails || "";
  const latestStatusUpdate = extractPlainText(rawLatestUpdate);

  const previousStatusUpdates = [];
  const seenTexts = new Set();
  for (const h of history) {
    const rawText = h.status_update_details || "";
    const text = extractPlainText(rawText);
    if (!text) continue;
    const oldStatus = normalizeStatus(h.incident_status || "");
    const curStatus = normalizeStatus(data.radio.status);
    if (oldStatus !== curStatus) continue;
    const normalizedLatest = extractPlainText(rawLatestUpdate).toLowerCase();
    const normalizedText = text.toLowerCase();
    if (normalizedLatest && normalizedText === normalizedLatest) continue;
    if (seenTexts.has(normalizedText)) continue;
    seenTexts.add(normalizedText);
    previousStatusUpdates.push({ text: rawText, updatedAt: h.updated_at });
  }

  const injectUpdateTime = (text, updatedAt) => {
    if (!text || !updatedAt) return text || "";
    if (/\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}/.test(text)) return text;
    const d = new Date(updatedAt);
    const fmt = d.toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    const cleaned = text.replace(/^<[^>]+>/, "").replace(/<\/[^>]+>$/, "");
    return `${fmt} — ${cleaned}`;
  };

  /* ── Shared styles ── */
  const labelStyle = {
    fontSize: "11px", fontWeight: "600", color: "#9CA3AF",
    letterSpacing: "0.5px", textTransform: "uppercase",
    marginBottom: "4px", fontFamily: "'Poppins', Arial, sans-serif",
  };
  const valueStyle = {
    fontSize: "14px", fontWeight: "500", color: "#111827",
    fontFamily: "'Poppins', Arial, sans-serif",
  };

  const showResolvedOnRow = ["resolved", "resolved-rca"].includes(normalizedStatus);
  const incidentTypeDisplay =
    (data.radio.incidentType != null && String(data.radio.incidentType).trim() !== "")
      ? String(data.radio.incidentType).trim()
      : "—";

  const emailPreview = (
    <div style={{
      width: "650px", margin: "0 auto", backgroundColor: "#FFFFFF",
      fontFamily: "'Poppins', Arial, sans-serif",
      border: "1px solid #E5E7EB",
    }}>

      {/* ═══ HEADER — CDN banner matches backend emailTemplate (bannerFlow) ═══ */}
      {bannerImageSrc ? (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: 0, lineHeight: 0 }}>
                <img
                  src={bannerImageSrc}
                  alt="Incident banner"
                  width="650"
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: "650px",
                    height: "auto",
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse", background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)" }}>
          <tbody>
            <tr>
              <td style={{ padding: "28px 36px" }}>
                <table width="100%" cellPadding="0" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td valign="top">
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "#FFFFFF", fontFamily: "'Poppins', Arial, sans-serif" }}>
                          Incident Notification
                        </div>
                      </td>
                      <td align="right" valign="top" style={{ fontSize: "16px", fontWeight: "700", color: "#E0E7FF", textAlign: "right", fontFamily: "'Poppins', Arial, sans-serif" }}>
                        {data.departmentName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingTop: "14px" }}>
                        <div style={{
                          display: "inline-block",
                          color: "#FFFFFF",
                          border: `2px solid ${statusColor}`,
                          padding: "6px 14px",
                          borderRadius: "5px",
                          fontWeight: "700",
                          fontSize: "12px",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          fontFamily: "'Poppins', Arial, sans-serif",
                        }}>
                          {data.radio.status || "UNKNOWN"}
                        </div>
                      </td>
                      <td align="right" style={{ paddingTop: "14px" }}>
                        <img src={incidentLogo} alt="Taboola" width="95" style={{ display: "block", border: "0" }} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* ═══ TIMELINE — CDN image matches backend (PNG already includes title); fallback draws title + nodes ═══ */}
      {data.radio.status !== "Not an Issue" &&
        (flowTimelineImageSrc || remainingStatus.length > 0) && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse", borderBottom: "1px solid #E5E7EB" }}>
          <tbody>
            <tr>
              <td
                style={{
                  padding: flowTimelineImageSrc ? "4px 0" : "20px 36px 18px 36px",
                }}
              >
                {!flowTimelineImageSrc && (
                  <div style={{
                    fontSize: "11px", fontWeight: "700", color: "#4B5563",
                    letterSpacing: "1.2px", marginBottom: "16px",
                    fontFamily: "'Poppins', Arial, sans-serif",
                    textTransform: "uppercase",
                  }}>
                    Incident Progress Timeline
                  </div>
                )}
                {flowTimelineImageSrc ? (
                  <img
                    src={flowTimelineImageSrc}
                    alt="Incident progress timeline"
                    style={{
                      width: "100%",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                ) : (
                <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      {remainingStatus.map((step, index) => {
                        const key = normalizeStatus(step.statusName);
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isPast = isCompleted || isCurrent;
                        const pal = timelineNodePalette(key);

                        const circleColor = isPast ? pal.fill : "#E5E7EB";
                        const showTick = isCurrent && key === "resolved-rca";

                        const segFrom = normalizeStatus(
                          remainingStatus[index]?.statusName
                        );
                        const segPal = timelineNodePalette(segFrom);
                        const connectorColor = isCompleted ? segPal.line : "#E5E7EB";

                        const dot = 44;
                        const r = dot / 2;

                        return (
                          <td key={index} style={{
                            width: `${100 / remainingStatus.length}%`,
                            textAlign: "center", verticalAlign: "top",
                            position: "relative",
                          }}>
                            <div style={{
                              width: `${dot}px`, height: `${dot}px`, borderRadius: "50%",
                              backgroundColor: circleColor,
                              margin: "0 auto 10px",
                              lineHeight: `${dot}px`, textAlign: "center",
                              fontSize: showTick ? "20px" : "14px",
                              fontWeight: "700",
                              color: isPast ? "#FFFFFF" : "#9CA3AF",
                              boxShadow: isCurrent ? "0 0 0 3px rgba(255,255,255,1), 0 0 0 5px rgba(0,0,0,0.06)" : "none",
                            }}>
                              {showTick ? "✓" : ""}
                            </div>
                            <div style={{
                              fontSize: "13px",
                              fontWeight: isPast ? "700" : "500",
                              color: isPast ? pal.label : "#9CA3AF",
                              fontFamily: "'Poppins', Arial, sans-serif",
                              lineHeight: "1.35",
                            }}>
                              {step.statusName}
                            </div>
                            {index < remainingStatus.length - 1 && (
                              <div style={{
                                position: "absolute", top: `${r - 2}px`,
                                left: `calc(50% + ${r}px)`,
                                width: `calc(100% - ${dot}px)`,
                                height: "4px", borderRadius: "2px",
                                backgroundColor: connectorColor,
                              }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* ═══ LATEST UPDATE ═══ */}
      {data.statusUpdate === true && latestStatusUpdate?.length > 0 && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
          <tbody><tr><td style={{ padding: "24px 36px 0 36px" }}>
            <div style={{ ...labelStyle, marginBottom: "10px" }}>Latest Update</div>
            <div style={{
              backgroundColor: "#F0FDF4", borderLeft: "3px solid #16A34A",
              padding: "14px 16px", fontSize: "14px", color: "#374151", lineHeight: "1.6",
              fontFamily: "'Poppins', Arial, sans-serif",
            }}>
              <strong style={{ fontWeight: "600" }}>Latest Update:</strong>{" "}
              <InlineHtml html={rawLatestUpdate} />
            </div>
          </td></tr></tbody>
        </table>
      )}

      {/* ═══ DESCRIPTION ═══ */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
        <tbody><tr><td style={{ padding: "24px 36px 0 36px" }}>
          <div style={{ ...labelStyle, marginBottom: "10px" }}>Description</div>
          <HtmlBlock html={data.textArea.incidentDetails} />
        </td></tr></tbody>
      </table>

      {/* ═══ PREVIOUS UPDATES ═══ */}
      {previousStatusUpdates.length > 0 && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
          <tbody><tr><td style={{ padding: "24px 36px 0 36px" }}>
            <div style={{ ...labelStyle, marginBottom: "10px" }}>Previous Updates</div>
            {previousStatusUpdates.map((item, index) => (
              <div key={index} style={{
                backgroundColor: "#FFFBEB", borderLeft: "3px solid #F59E0B",
                padding: "12px 16px", fontSize: "14px", color: "#1F2937", lineHeight: "1.6",
                marginBottom: index < previousStatusUpdates.length - 1 ? "8px" : "0",
                fontFamily: "'Poppins', Arial, sans-serif",
              }}>
                <HtmlBlock html={injectUpdateTime(item.text, item.updatedAt)} />
              </div>
            ))}
          </td></tr></tbody>
        </table>
      )}

      {/* ═══ KEY DETAILS (clean 2-col grid with subtle dividers) ═══ */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td colSpan="2" style={{ padding: "28px 36px 0 36px" }}>
              <div style={{ ...labelStyle, marginBottom: "16px", fontSize: "11px", letterSpacing: "1px" }}>Key Details</div>
            </td>
          </tr>
          {/* Dates row */}
          <tr>
            <td style={{ width: "50%", padding: "0 16px 16px 36px", verticalAlign: "top" }}>
              <div style={labelStyle}>Started On (UTC)</div>
              <div style={valueStyle}>{formatDate(data.dateTime.startTime?.utc) || "—"}</div>
            </td>
            <td style={{ width: "50%", padding: "0 36px 16px 16px", verticalAlign: "top", borderLeft: "1px solid #F3F4F6" }}>
              <div style={labelStyle}>Discovered On (UTC)</div>
              <div style={valueStyle}>{formatDate(data.dateTime.discoveredTime?.utc) || "—"}</div>
            </td>
          </tr>

          {/* Resolved on (when resolved) + Incident type: full-width type row if unresolved; 2-col Resolved | Type if resolved */}
          {showResolvedOnRow ? (
            <tr>
              <td style={{ width: "50%", padding: "0 16px 16px 36px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", verticalAlign: "top" }}>
                <div style={labelStyle}>Resolved On (UTC)</div>
                <div style={{ ...valueStyle, color: "#16A34A" }}>{formatDate(data.dateTime.resolvedTime?.utc) || "—"}</div>
              </td>
              <td style={{ width: "50%", padding: "0 36px 16px 16px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", borderLeft: "1px solid #F3F4F6", verticalAlign: "top" }}>
                <div style={labelStyle}>Incident Type</div>
                <div style={valueStyle}>{incidentTypeDisplay}</div>
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan="2" style={{ padding: "0 36px 16px 36px", borderTop: "1px solid #F3F4F6", paddingTop: "16px" }}>
                <div style={labelStyle}>Incident Type</div>
                <div style={valueStyle}>{incidentTypeDisplay}</div>
              </td>
            </tr>
          )}

          {/* Severity + Product */}
          <tr>
            <td style={{ width: "50%", padding: "0 16px 16px 36px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", verticalAlign: "top" }}>
              <div style={{ ...labelStyle, marginBottom: "6px" }}>Severity</div>
              <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: "4px",
                backgroundColor: severity_colorMap[data.dropDown.severity]?.bgColor || "#F3F4F6",
                color: severity_colorMap[data.dropDown.severity]?.color || "#374151",
                border: `1px solid ${severity_colorMap[data.dropDown.severity]?.borderColor || "#E5E7EB"}`,
                fontSize: "13px", fontWeight: "600", fontFamily: "'Poppins', Arial, sans-serif",
              }}>
                {data.dropDown.severity}
              </div>
            </td>
            <td style={{ width: "50%", padding: "0 36px 16px 16px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", borderLeft: "1px solid #F3F4F6", verticalAlign: "top" }}>
              <div style={labelStyle}>Affected Product</div>
              <div style={valueStyle}>{data.dropDown.affectedProduct || "—"}</div>
            </td>
          </tr>

          {/* Level + Region */}
          <tr>
            <td style={{ width: "50%", padding: "0 16px 16px 36px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", verticalAlign: "top" }}>
              <div style={labelStyle}>Level of Impact</div>
              <div style={valueStyle}>{data.dropDown.serviceImpacted || "—"}</div>
            </td>
            <td style={{ width: "50%", padding: "0 36px 16px 16px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", borderLeft: "1px solid #F3F4F6", verticalAlign: "top" }}>
              <div style={labelStyle}>Region Impacted</div>
              <div style={valueStyle}>{data.dropDown.regionImpacted || "—"}</div>
            </td>
          </tr>

          {/* Revenue + Next Update */}
          {["suspected", "ongoing", "resolved", "resolved-rca"].includes(normalizedStatus) && (
            <tr>
              <td style={{ width: "50%", padding: "0 16px 16px 36px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", verticalAlign: "top" }}>
                <div style={labelStyle}>Revenue Impact</div>
                <div style={valueStyle}>{data.inputBox.revenueImpactDetails || "Not yet calculated"}</div>
              </td>
              {data.radio?.nextUpdate === "Yes" && data.dateTime?.nextUpdateTime?.utc ? (
                <td style={{ width: "50%", padding: "0 36px 16px 16px", borderTop: "1px solid #F3F4F6", paddingTop: "16px", borderLeft: "1px solid #F3F4F6", verticalAlign: "top" }}>
                  <div style={labelStyle}>Next Update</div>
                  <div style={valueStyle}>{formatDate(data.dateTime.nextUpdateTime?.utc)}</div>
                </td>
              ) : <td style={{ width: "50%", borderTop: "1px solid #F3F4F6" }} />}
            </tr>
          )}
        </tbody>
      </table>

      {/* ═══ WORKAROUND ═══ */}
      {data.radio?.workaround === "Yes" && data.textArea?.workaroundDetails && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
          <tbody><tr><td style={{ padding: "24px 36px 0 36px" }}>
            <div style={{ ...labelStyle, marginBottom: "10px" }}>Workaround Provided</div>
            <div style={{ backgroundColor: "#F0FDF4", borderLeft: "3px solid #16A34A", padding: "14px 16px", fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
              <HtmlBlock html={data.textArea.workaroundDetails} />
            </div>
          </td></tr></tbody>
        </table>
      )}

      {/* ═══ RESOLVED DETAILS ═══ */}
      {["resolved", "resolved-rca"].includes(normalizedStatus) && data.textArea.resolvedDetails && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
          <tbody><tr><td style={{ padding: "24px 36px 0 36px" }}>
            <div style={{ ...labelStyle, marginBottom: "10px" }}>Resolution Details</div>
            <div style={{ backgroundColor: "#F0FDF4", borderLeft: "3px solid #16A34A", padding: "14px 16px", fontSize: "14px", color: "#374151", lineHeight: "1.6" }}>
              <HtmlBlock html={data.textArea.resolvedDetails} />
            </div>
          </td></tr></tbody>
        </table>
      )}

      {/* ═══ RCA DETAILS ═══ */}
      {normalizedStatus === "resolved-rca" && data.textArea.resolvedwithRcaDetails && (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
          <tbody><tr><td style={{ padding: "24px 36px 0 36px" }}>
            <div style={{ ...labelStyle, marginBottom: "10px" }}>Root Cause Analysis</div>
            <div style={{ backgroundColor: "#EFF6FF", borderLeft: "3px solid #2563EB", padding: "14px 16px", fontSize: "14px", color: "#1F2937", lineHeight: "1.6" }}>
              <HtmlBlock html={data.textArea.resolvedwithRcaDetails} />
            </div>
          </td></tr></tbody>
        </table>
      )}

      {/* ═══ FOOTER ═══ */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse", marginTop: "28px" }}>
        <tbody>
          <tr><td colSpan="2" style={{ height: "2px", backgroundColor: "#2563EB" }} /></tr>

          {/* Action buttons */}
          <tr>
            <td colSpan="2" style={{ backgroundColor: "#F9FAFB", padding: "18px 36px", textAlign: "center" }}>
              <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto", borderCollapse: "collapse" }}>
                <tbody><tr>
                  <td style={{ paddingRight: "8px" }}>
                    <a href={data.inputBox?.incidentLink || "#"} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-block", padding: "9px 22px", backgroundColor: "#2563EB",
                      color: "#FFFFFF", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                      textDecoration: "none", fontFamily: "'Poppins', Arial, sans-serif",
                    }}>
                      <span style={{ marginRight: "6px" }}>🔗</span>View Incident
                    </a>
                  </td>
                  <td style={{ paddingLeft: "8px" }}>
                    <button
                      onClick={() => setRecipientsModalOpen(true)}
                      style={{
                        display: "inline-block", padding: "9px 22px", backgroundColor: "#FFFFFF",
                        border: "1px solid #D1D5DB", color: "#374151", borderRadius: "6px",
                        fontSize: "12px", fontWeight: "600", cursor: "pointer",
                        fontFamily: "'Poppins', Arial, sans-serif",
                      }}
                    >
                      <span style={{ marginRight: "6px" }}>👥</span>View Recipients
                    </button>
                  </td>
                </tr></tbody>
              </table>
            </td>
          </tr>

          {/* Team + ID */}
          <tr>
            <td style={{ backgroundColor: "#F9FAFB", padding: "0 36px 18px 36px", verticalAlign: "middle" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827", fontFamily: "'Poppins', Arial, sans-serif" }}>Taboola Incident Management</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px", fontFamily: "'Poppins', Arial, sans-serif" }}>IncidentManagement@taboola.com</div>
            </td>
            <td style={{ backgroundColor: "#F9FAFB", padding: "0 36px 18px 36px", textAlign: "right", verticalAlign: "middle" }}>
              <div style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px", fontFamily: "'Poppins', Arial, sans-serif" }}>Incident ID</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", fontFamily: "'Poppins', Arial, sans-serif" }}>{incidentNumber}</div>
            </td>
          </tr>

          <tr>
            <td colSpan="2" style={{ backgroundColor: "#F3F4F6", padding: "12px 36px", textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "#9CA3AF", fontFamily: "'Poppins', Arial, sans-serif" }}>
                This is an incident notification from Taboola Incident Management Platform
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const rawId = data.history?.[0]?.display_id;
  const recipientsDisplayId = rawId
    ? `INC-${String(rawId).padStart(4, "0")}`
    : null;

  return (
    <>
      {emailPreview}
      <RecipientsPreviewModal
        opened={recipientsModalOpen}
        onClose={() => setRecipientsModalOpen(false)}
        displayId={recipientsDisplayId}
        localRecipients={data.dropDown?.notificationMails || []}
        incidentSubject={data.inputBox?.subject || ""}
        incidentStatus={data.radio?.status || ""}
      />
    </>
  );
};

export default EmailTemplateLayout;
