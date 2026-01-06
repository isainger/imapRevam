import React from "react";
import getIncidentLabel from "./utils/getIncidentLabel";
import { formatDate } from "./utils/formatDate";

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
  "resolved-rca": {
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
};

const normalizeStatus = (status) => {
  if (!status) return "";
  const s = status.toLowerCase().trim();
  if (s === "resolved with rca") return "resolved-rca";
  return s;
};

// const extractIncidentNumber = (url) => {
//   if (!url) return "";
//   const match = url.match(/\/Case\/([a-zA-Z0-9]+)/i);
//   return match ? match[1] : "";
// };

const EmailTemplateLayout = ({ data }) => {
  console.log(data);

  const normalizedStatus = normalizeStatus(data.radio.status);
  const colorCfg = COLOR_MAP[normalizedStatus] || {
    color: "#6B7280",
    bgColor: "#E5E7EB",
    borderColor: "#D1D5DB",
  };
  const remainingStatus = data.radio.remainingStatus || [];
  const currentIndex = remainingStatus.findIndex(
    (s) => normalizeStatus(s.statusName) === normalizedStatus
  );

  const incidentNumber = getIncidentLabel(data);

  const history = data.history || [];

  // Latest update ONLY from form input
  const latestStatusUpdate = data.textArea?.statusUpdateDetails?.trim() || null;

  // Previous updates ONLY from DB
  const previousStatusUpdates = [];
  let lastSeen = null;

  for (const h of history) {
    const text = (h.status_update_details || "").trim();

    if (!text) continue;

    // skip duplicates
    if (text === lastSeen) continue;

    previousStatusUpdates.push({
      text,
      updatedAt: h.updated_at,
    });
    lastSeen = text;
  }

  const injectUpdateTime = (text, updatedAt) => {
    if (!text) return "";

    // avoid double processing
    if (/\[.*?\]/.test(text)) return text;

    if (!text.startsWith("Status Update:")) return text;

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

    const clean = text.replace(/^Status Update:\s*/, "");

    return `Status Update : ${formatted} - ${clean}`;
  };

  return (
    <div
      style={{
        width: "650px",
        margin: "0 auto",
        backgroundColor: "#FFFFFF",
        fontFamily: "Arial, sans-serif",
        border: "1px solid #D1D5DB",
      }}
    >
      {/* HEADER */}
      <table
        style={{
          width: "100%",
          background: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "32px 28px" }}>
              <div style={{ fontSize: "24px", color: "#FFFFFF" }}>
                Incident Notification
              </div>

              <div
                style={{ fontSize: "13px", color: "#E0E7FF", marginTop: "4px" }}
              >
                <span style={{ color: "#BFDBFE" }}>Incident ID:</span>{" "}
                {incidentNumber}
              </div>

              <div
                style={{
                  marginTop: "14px",
                  display: "inline-block",
                  // backgroundColor: colorCfg.bgColor,
                  color: "#fff",
                  border: `2px solid ${colorCfg.borderColor}`,
                  padding: "6px 14px",
                  borderRadius: "5px",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                {normalizedStatus.toUpperCase()}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* TIMELINE */}
      {data.radio.status != "Not an Issue" && (
        <table style={{ width: "100%", borderBottom: "1px solid #E5E7EB" }}>
          <tbody>
            <tr>
              <td style={{ padding: "32px 28px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "16px",
                  }}
                >
                  Incident Progress Timeline
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      {remainingStatus.map((step, index) => {
                        const key = normalizeStatus(step.statusName);
                        const cfg = COLOR_MAP[key];
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                          <td
                            key={index}
                            style={{
                              width: `${100 / remainingStatus.length}%`,
                              textAlign: "center",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: isCompleted
                                  ? "rgb(16, 185, 129)"
                                  : isCurrent
                                    ? cfg.color
                                    : "#E5E7EB",
                                border: isCurrent
                                  ? `3px solid ${cfg.borderColor}`
                                  : "none",
                                margin: "0 auto 6px",
                                color: "#FFFFFF",
                                fontSize: "14px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              {isCompleted ? "✓" : ""}
                            </div>

                            <div
                              style={{
                                fontSize: "13px",
                                color: isCompleted
                                  ? "#059669"
                                  : isCurrent
                                    ? cfg.color
                                    : "#9CA3AF",
                                fontWeight:
                                  isCompleted || isCurrent ? "700" : "400",
                              }}
                            >
                              {step.statusName}
                            </div>

                            {index < remainingStatus.length - 1 && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "12px",
                                  left: "60%",
                                  width: "calc(100% - 32px)",
                                  height: "2px",
                                  backgroundColor: isCompleted
                                    ? "#059669"
                                    : "#E5E7EB",
                                }}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {/* LATEST STATUS UPDATE (GREEN) */}
      {latestStatusUpdate && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  LATEST UPDATE
                </div>

                <div
                  style={{
                    backgroundColor: "#ECFDF5",
                    borderLeft: "3px solid #10B981",
                    padding: "12px",
                    borderRadius: "4px",
                    fontSize: "14px",
                    color: "#1F2937",
                  }}
                >
                  {latestStatusUpdate}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* DESCRIPTION */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "32px 28px 12px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#68718b",
                  marginBottom: "10px",
                  letterSpacing: "0.5px",
                }}
              >
                DESCRIPTION
              </div>
              <div
                style={{ fontSize: "14px", color: "#1F2937", marginTop: "6px" }}
              >
                {data.textArea.incidentDetails}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* PREVIOUS STATUS UPDATES (YELLOW) */}
      {previousStatusUpdates.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  PREVIOUS UPDATE
                </div>
                {previousStatusUpdates.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: "#FEF3C7",
                      borderLeft: "3px solid #F59E0B",
                      padding: "12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: "#1F2937",
                      marginBottom: "1rem",
                    }}
                  >
                    {injectUpdateTime(item.text, item.updatedAt)}
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* DETAILS */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          padding: "0 28px",
        }}
      >
        <tbody>
          {/* FIRST ROW */}
          <tr>
            <td
              style={{
                width: "50%",
                padding: "24px 16px 0 28px",
                verticalAlign: "top",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "10px",
                  letterSpacing: "0.5px",
                }}
              >
                STARTED ON (UTC)
              </div>
              <div
                style={{ fontSize: "14px", color: "#1F2937", marginTop: "6px" }}
              >
                {formatDate(data.dateTime.startTime?.utc)}
              </div>
            </td>

            {["ongoing", "resolved", "resolved-rca"].includes(
              normalizedStatus
            ) && (
              <td
                style={{
                  width: "50%",
                  padding: "24px 28px 0 16px",
                  verticalAlign: "top",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  DISCOVERED ON (UTC)
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#1F2937",
                    marginTop: "6px",
                  }}
                >
                  {formatDate(data.dateTime.discoveredTime?.utc)}
                </div>
              </td>
            )}
          </tr>

          {/* RESOLVED ROW */}
          {["resolved", "resolved-rca"].includes(normalizedStatus) && (
            <tr>
              <td
                colSpan="2"
                style={{
                  padding: "24px 28px 0 28px",
                  verticalAlign: "top",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  RESOLVED ON (UTC)
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#059669",
                    marginTop: "6px",
                  }}
                >
                  {formatDate(data.dateTime.resolvedTime?.utc)}
                </div>
              </td>
            </tr>
          )}

          {/* SEVERITY & PRODUCT */}
          <tr>
            <td
              style={{
                width: "50%",
                padding: "24px 16px 0 28px",
                verticalAlign: "top",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  letterSpacing: "0.5px",
                }}
              >
                SEVERITY
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: "7px 14px",
                  borderRadius: "5px",
                  backgroundColor: "rgb(254, 226, 226)",
                  color: "rgb(220, 38, 38)",
                  border: "1px solid #FECACA",
                  fontSize: "14px",
                }}
              >
                {data.dropDown.severity}
              </div>
            </td>

            <td
              style={{
                width: "50%",
                padding: "24px 28px 0 16px",
                verticalAlign: "top",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "10px",
                  letterSpacing: "0.5px",
                }}
              >
                AFFECTED PRODUCT
              </div>
              <div
                style={{ fontSize: "14px", color: "#1F2937", marginTop: "6px" }}
              >
                {data.dropDown.affectedProduct}
              </div>
            </td>
          </tr>

          {/* LEVEL & REGION */}
          <tr>
            <td
              style={{
                width: "50%",
                padding: "24px 16px 0 28px",
                verticalAlign: "top",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "10px",
                  letterSpacing: "0.5px",
                }}
              >
                LEVEL OF IMPACT
              </div>
              <div
                style={{ fontSize: "14px", color: "#1F2937", marginTop: "6px" }}
              >
                {data.radio.incidentType}
              </div>
            </td>

            <td
              style={{
                width: "50%",
                padding: "24px 28px 0 16px",
                verticalAlign: "top",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "10px",
                  letterSpacing: "0.5px",
                }}
              >
                REGION IMPACTED
              </div>
              <div
                style={{ fontSize: "14px", color: "#1F2937", marginTop: "6px" }}
              >
                {data.dropDown.regionImpacted}
              </div>
            </td>
          </tr>

          {/* REVENUE */}
          {["suspected", "ongoing", "resolved", "resolved-rca"].includes(
            normalizedStatus
          ) && (
            <tr>
              <td
                style={{
                  width: "50%",
                  padding: "24px 16px 0 28px",
                  verticalAlign: "top",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  REVENUE IMPACT
                </div>
                <div style={{ fontSize: "14px", color: "#1F2937" }}>
                  {data.inputBox.revenueImpactDetails
                    ? data.inputBox.revenueImpactDetails
                    : "Not yet Calculated"}
                </div>
              </td>
              {/* NEXT UPDATE */}
              {data.radio?.nextUpdate === "Yes" &&
                data.dateTime?.nextUpdateTime?.utc && (
                  <td
                    style={{
                      width: "50%",
                      padding: "24px 28px 0 16px",
                      verticalAlign: "top",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6B7280",
                        marginBottom: "10px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      NEXT UPDATE
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#1F2937",
                        marginTop: "6px",
                      }}
                    >
                      {formatDate(data.dateTime.nextUpdateTime?.utc)}
                    </div>
                  </td>
                )}
            </tr>
          )}

          {/* {normalizedStatus === "ongoing" &&
            data.textArea.nextUpdateDetails && (
              <tr>
                <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                  <div
                    style={{
                      backgroundColor: "#FEF3C7",
                      borderLeft: "3px solid #F59E0B",
                      padding: "12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: "#1F2937",
                    }}
                  >
                    {data.textArea.nextUpdateDetails}
                  </div>
                </td>
              </tr>
            )} */}

          {/* AFFECTED ACCOUNTS
          {["resolved", "resolved-rca"].includes(normalizedStatus) &&
            data.textArea.affectedAccounts && (
              <tr>
                <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                      marginBottom: "10px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    AFFECTED ACCOUNTS
                  </div>
                  <div style={{ fontSize: "14px", color: "#1F2937" }}>
                    {data.textArea.affectedAccounts}
                  </div>
                </td>
              </tr>
            )} */}

          {/* RESOLUTION DETAILS */}
          {data.radio?.nextUpdate !== "Yes" && (
            <tr>
              <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6B7280",
                    marginBottom: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  NEXT UPDATE
                </div>
                <div
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderLeft: "3px solid #F59E0B",
                    padding: "12px",
                    borderRadius: "4px",
                    fontSize: "14px",
                    color: "#1F2937",
                  }}
                >
                  Updates will be shared as progress continues.
                </div>
              </td>
            </tr>
          )}
          {/* WORKAROUND (only when YES) */}
          {data.radio?.workaround === "Yes" &&
            data.textArea?.workaroundDetails && (
              <tr>
                <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                      marginBottom: "10px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    WORKAROUND PROVIDED
                  </div>

                  <div
                    style={{
                      backgroundColor: "#ECFDF5",
                      borderLeft: "3px solid #10B981",
                      padding: "12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: "#1F2937",
                    }}
                  >
                    {data.textArea.workaroundDetails}
                  </div>
                </td>
              </tr>
            )}

          {/* RESOLUTION DETAILS */}
          {["resolved", "resolved-rca"].includes(normalizedStatus) &&
            data.textArea.resolvedDetails && (
              <tr>
                <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                      marginBottom: "10px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    RESOLVED DETAILS
                  </div>
                  <div
                    style={{
                      backgroundColor: "#ECFDF5",
                      borderLeft: "3px solid #10B981",
                      padding: "12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: "#1F2937",
                    }}
                  >
                    {data.textArea.resolvedDetails}
                  </div>
                </td>
              </tr>
            )}

          {/* RCA ONLY */}
          {normalizedStatus === "resolved-rca" &&
            data.textArea.resolvedwithRcaDetails && (
              <tr>
                <td colSpan="2" style={{ padding: "24px 28px 0 28px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                      marginBottom: "10px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    RESOLVED WITH RCA DETAILS
                  </div>
                  <div
                    style={{
                      backgroundColor: "#DBEAFE",
                      borderLeft: "3px solid #3B82F6",
                      padding: "12px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: "#1F2937",
                    }}
                  >
                    {data.textArea.resolvedwithRcaDetails}
                  </div>
                </td>
              </tr>
            )}
        </tbody>
      </table>

      {/* FOOTER */}
      <table
        style={{
          width: "100%",
          backgroundColor: "#F9FAFB",
          borderTop: "1px solid #E5E7EB",
          marginTop: "32px",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "28px" }}>
              <div style={{ fontWeight: "600", color: "#1F2937" }}>
                The Taboola Incident Management Team
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>
                support@taboola.com
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmailTemplateLayout;
