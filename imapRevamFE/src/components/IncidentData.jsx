import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useComputedColorScheme } from "@mantine/core";

const normStatus = (s) => String(s || "").trim().toLowerCase();

/** First non-empty string among alternate API keys (snake_case / camelCase). */
function pickStr(obj, ...keys) {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

const IncidentData = ({ incidentData }) => {
  const colorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: false,
  });
  const lightTooltip = colorScheme === "light";

  const [timeline, setTimeline] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const itemRefs = useRef([]);
  const hideTimeout = useRef(null); // <<< ADDED
  // console.log(incidentData);

  useEffect(() => {
    if (!incidentData || incidentData.length === 0) return;

    const rawRemaining = incidentData[0]?.remaining_status;

    const statusSequence =
      rawRemaining.length > 0
        ? rawRemaining.map((s) => s.statusName)
        : [incidentData[0].incident_status];

    const finalList = statusSequence
      .map((status) =>
        incidentData.find(
          (i) => normStatus(i.incident_status) === normStatus(status),
        ),
      )
      .filter(Boolean);

    setTimeline(finalList);
  }, [incidentData]);

  const showTooltip = (index) => {
    clearTimeout(hideTimeout.current); // <<< IMPORTANT

    const el = itemRefs.current[index];
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setCoords({
      top: rect.top + window.scrollY - 5,
      left: rect.right + window.scrollX + 20,
    });

    setActiveIndex(index);
  };

  const hideTooltip = () => {
    hideTimeout.current = setTimeout(() => {
      setActiveIndex(null);
    }, 100); // 1 second delay
  };

  const sanitizeInlineHtml = (input) => {
    if (!input) return "";

    if (typeof input !== "string") return String(input);

    return (
      input
        // remove block wrappers
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "")
        .replace(/<div[^>]*>/gi, "")
        .replace(/<\/div>/gi, "")
        // normalize strong styling
        .replace(/<strong>/gi, "<strong>")
        // ensure links are safe
        .replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ')
    );
  };

  return (
    <div className="shrink-0">
      <h2
        className="mb-3 text-xs font-medium uppercase tracking-[0.18em]"
        style={{ color: "var(--imap-form-brand)" }}
      >
        Current incident status
      </h2>
      <div className="space-y-3">
        {timeline.map((item, index) => {
          const isCompleted = index !== timeline.length - 1;
          const isCurrent = index === timeline.length - 1;
          const allEntries = incidentData.filter(
            (entry) =>
              normStatus(entry.incident_status) === normStatus(item.incident_status),
          );

          return (
            <div key={index} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="relative w-8 h-8">
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-[#0056f0] animate-ping opacity-40" />
                  )}
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-[#00f0d2]"
                        : "bg-[#0056f0]"
                    }`}
                  >
                    {isCompleted ? (
                      <i className="fa-solid fa-check text-[#002852] text-xs" style={{ fontWeight: 900 }} />
                    ) : (
                      <span className="text-xs font-medium text-white">
                        {index + 1}
                      </span>
                    )}
                  </div>
                </div>
                {index < timeline.length - 1 && (
                  <div
                    className="mt-1 h-5 w-px"
                    style={{
                      background: isCompleted ? "#34d399" : "var(--imap-border-strong)",
                    }}
                  />
                )}
              </div>
              <div className="pt-1">
                <p
                  ref={(el) => (itemRefs.current[index] = el)}
                  className="imap-incident-status-link cursor-pointer text-sm font-bold transition-colors"
                  style={{
                    color: isCompleted ? "var(--imap-brand)" : "var(--imap-text-bright)",
                  }}
                  onMouseEnter={() => showTooltip(index)}
                  onMouseLeave={hideTooltip}
                >
                  {item.incident_status}
                </p>
              </div>

              {activeIndex === index &&
                createPortal(
                  <div
                    ref={(node) => {
                      if (node) {
                        const rect = node.getBoundingClientRect();
                        const overflowRight = rect.right > window.innerWidth;
                        const overflowBottom = rect.bottom > window.innerHeight;

                        if (overflowRight) {
                          node.style.left =
                            rect.left - node.offsetWidth - 10 + "px";
                        }
                        if (overflowBottom) {
                          node.style.top =
                            rect.top - node.offsetHeight - 10 + "px";
                        }
                      }
                    }}
                    style={{
                      position: "fixed",
                      top: coords.top - 5,
                      left: coords.left + 8,
                      width: 340,
                      maxHeight: 360,
                      background: lightTooltip
                        ? "#ffffff"
                        : "linear-gradient(135deg, #002852 0%, #003f7f 100%)",
                      border: lightTooltip
                        ? "1px solid rgba(15, 23, 42, 0.12)"
                        : "1px solid rgba(255,255,255,0.1)",
                      padding: 0,
                      zIndex: 999999999,
                      borderRadius: 12,
                      overflowY: "auto",
                      boxShadow: lightTooltip
                        ? "0 16px 48px rgba(15, 23, 42, 0.14)"
                        : "0 12px 40px rgba(0,20,50,0.5)",
                    }}
                    onMouseEnter={() => clearTimeout(hideTimeout.current)}
                    onMouseLeave={hideTooltip}
                  >
                    {/* Header */}
                    <div style={{
                      padding: "12px 16px",
                      borderBottom: lightTooltip
                        ? "1px solid #e2e8f0"
                        : "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: isCompleted ? "#34d399" : "#2563eb",
                        display: "inline-block",
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: lightTooltip ? "#64748b" : "rgba(255,255,255,0.5)",
                        fontWeight: 600,
                        fontFamily: "'Poppins', sans-serif",
                      }}>
                        Updates for
                      </span>
                      <span style={{
                        fontSize: "12px",
                        color: lightTooltip ? "#0f172a" : "#fff",
                        fontWeight: 700,
                        fontFamily: "'Poppins', sans-serif",
                      }}>
                        {item.incident_status}
                      </span>
                    </div>

                    {/* Entries */}
                    <div style={{ padding: "8px" }}>
                      {allEntries.map((entry, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: lightTooltip
                              ? "#f8fafc"
                              : "rgba(255,255,255,0.06)",
                            border: lightTooltip
                              ? "1px solid #e2e8f0"
                              : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            padding: "10px 12px",
                            marginBottom: idx < allEntries.length - 1 ? "6px" : 0,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = lightTooltip
                              ? "#f1f5f9"
                              : "rgba(255,255,255,0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = lightTooltip
                              ? "#f8fafc"
                              : "rgba(255,255,255,0.06)";
                          }}
                        >
                          {(() => {
                            const st = normStatus(entry.incident_status);
                            const isRca = st === "resolved with rca";
                            const isResolvedOnly = st === "resolved";
                            const isResolvedFlow = isResolvedOnly || isRca;
                            const isSimpleTimeline = !isResolvedFlow;

                            const statusUpdate = pickStr(
                              entry,
                              "status_update_details",
                              "statusUpdateDetails",
                            );
                            const resolvedDet = pickStr(
                              entry,
                              "resolved_details",
                              "resolvedDetails",
                            );
                            const rcaDet = pickStr(
                              entry,
                              "resolved_with_rca_details",
                              "resolvedWithRcaDetails",
                              "resolvedwithRcaDetails",
                            );
                            const incidentNarrative = pickStr(
                              entry,
                              "incident_details",
                              "incidentDetails",
                            );

                            const tsLabel = entry.updated_at
                              ? `Updated: ${new Date(entry.updated_at).toLocaleString()}`
                              : entry.created_at
                                ? `Created: ${new Date(entry.created_at).toLocaleString()}`
                                : "";

                            const sectionLabel = {
                              fontSize: "9px",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              fontWeight: 600,
                              color: lightTooltip
                                ? "#64748b"
                                : "rgba(255,255,255,0.45)",
                              fontFamily: "'Poppins', sans-serif",
                              marginBottom: "4px",
                            };
                            const bodyStyle = {
                              fontSize: "12px",
                              fontWeight: 500,
                              color: lightTooltip
                                ? "#0f172a"
                                : "rgba(255,255,255,0.92)",
                              fontFamily: "'Poppins', sans-serif",
                              lineHeight: 1.55,
                              marginBottom: "0",
                            };
                            const sep = {
                              marginTop: "10px",
                              paddingTop: "10px",
                              borderTop: lightTooltip
                                ? "1px solid #e2e8f0"
                                : "1px solid rgba(255,255,255,0.1)",
                            };
                            const headingRow = {
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "baseline",
                              justifyContent: "space-between",
                              gap: "8px",
                              marginBottom: "8px",
                            };
                            const suHeading = {
                              fontSize: "11px",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              fontWeight: 700,
                              color: lightTooltip ? "#0f172a" : "#ffffff",
                              fontFamily: "'Poppins', sans-serif",
                            };
                            const timeInline = {
                              fontSize: "10px",
                              fontWeight: 500,
                              color: lightTooltip ? "#64748b" : "rgba(255,255,255,0.5)",
                              fontFamily: "'Poppins', sans-serif",
                            };

                            // Suspected / Ongoing: status text or incident narrative fallback.
                            // Resolved: same fallback so the card matches the "Resolved" layout.
                            // Resolved + RCA: only explicit status_update (RCA narrative stays in RCA section);
                            // if missing, show a placeholder block so layout matches Resolved (body → divider → details).
                            let updateBody = "";
                            if (isSimpleTimeline) {
                              updateBody = statusUpdate || incidentNarrative;
                            } else if (isResolvedOnly) {
                              updateBody = statusUpdate || incidentNarrative;
                            } else if (isRca) {
                              updateBody = statusUpdate;
                            }

                            const emptySuPlaceholder = {
                              fontSize: "11px",
                              fontStyle: "italic",
                              fontWeight: 500,
                              lineHeight: 1.55,
                              color: lightTooltip
                                ? "#94a3b8"
                                : "rgba(255,255,255,0.45)",
                              fontFamily: "'Poppins', sans-serif",
                              margin: "0 0 10px 0",
                            };

                            return (
                              <>
                                <div style={headingRow}>
                                  <span style={suHeading}>Status update</span>
                                  {tsLabel ? (
                                    <span style={timeInline}>{tsLabel}</span>
                                  ) : null}
                                </div>

                                {updateBody ? (
                                  <div
                                    style={{ ...bodyStyle, marginBottom: "10px" }}
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeInlineHtml(updateBody),
                                    }}
                                  />
                                ) : isResolvedFlow ? (
                                  <p style={emptySuPlaceholder}>
                                    No status update text for this snapshot.
                                  </p>
                                ) : (
                                  <p style={{ ...emptySuPlaceholder, margin: "0 0 8px 0" }}>
                                    No status update text for this snapshot.
                                  </p>
                                )}

                                {isResolvedOnly && resolvedDet ? (
                                  <div style={sep}>
                                    <div style={sectionLabel}>Resolved details</div>
                                    <div
                                      style={bodyStyle}
                                      dangerouslySetInnerHTML={{
                                        __html: sanitizeInlineHtml(resolvedDet),
                                      }}
                                    />
                                  </div>
                                ) : null}

                                {isRca && rcaDet ? (
                                  <div style={sep}>
                                    <div style={sectionLabel}>RCA details</div>
                                    <div
                                      style={bodyStyle}
                                      dangerouslySetInnerHTML={{
                                        __html: sanitizeInlineHtml(rcaDet),
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(IncidentData);
