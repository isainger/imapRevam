import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

const IncidentData = ({ incidentData }) => {
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
      .map((status) => incidentData.find((i) => i.incident_status === status))
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
      <h2 className="text-xs font-medium text-[#7bcdff] mb-3 uppercase tracking-wider">
        Current Incident Status
      </h2>
      <div className="space-y-3">
        {timeline.map((item, index) => {
          const isCompleted = index !== timeline.length - 1;
          const isCurrent = index === timeline.length - 1;
          const allEntries = incidentData.filter(
            (entry) => entry.incident_status === item.incident_status
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
                  <div className={`w-px h-5 mt-1 ${isCompleted ? "bg-[#00f0d2]" : "bg-white/20"}`} />
                )}
              </div>
              <div className="pt-1">
                <p
                  ref={(el) => (itemRefs.current[index] = el)}
                  className={`text-sm font-bold cursor-pointer transition-colors ${
                    isCompleted ? "text-[#7bcdff]" : "text-white"
                  } hover:text-white`}
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
                      background: "linear-gradient(135deg, #002852 0%, #003f7f 100%)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: 0,
                      zIndex: 999999999,
                      borderRadius: 12,
                      overflowY: "auto",
                      boxShadow: "0 12px 40px rgba(0,20,50,0.5)",
                    }}
                    onMouseEnter={() => clearTimeout(hideTimeout.current)}
                    onMouseLeave={hideTooltip}
                  >
                    {/* Header */}
                    <div style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: isCompleted ? "#00f0d2" : "#0056f0",
                        display: "inline-block",
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 600,
                        fontFamily: "'Poppins', sans-serif",
                      }}>
                        Updates for
                      </span>
                      <span style={{
                        fontSize: "12px",
                        color: "#fff",
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
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            padding: "10px 12px",
                            marginBottom: idx < allEntries.length - 1 ? "6px" : 0,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        >
                          <p style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.4)",
                            fontFamily: "'Poppins', sans-serif",
                            marginBottom: "4px",
                          }}>
                            {entry.updated_at
                              ? `Updated: ${new Date(entry.updated_at).toLocaleString()}`
                              : `Created: ${new Date(entry.created_at).toLocaleString()}`}
                          </p>

                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#fff",
                              fontFamily: "'Poppins', sans-serif",
                              lineHeight: 1.5,
                            }}
                            dangerouslySetInnerHTML={{
                              __html: sanitizeInlineHtml(entry.status_update_details),
                            }}
                          />

                          {entry.incident_details && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "12px",
                                color: "rgba(255,255,255,0.6)",
                                fontFamily: "'Poppins', sans-serif",
                                lineHeight: 1.5,
                              }}
                              dangerouslySetInnerHTML={{
                                __html: sanitizeInlineHtml(
                                  entry.incident_details
                                ),
                              }}
                            />
                          )}
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
