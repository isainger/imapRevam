import { useState, useEffect } from "react";
import { Modal } from "@mantine/core";
import logo from "../assets/logo.png";
import { endpoints } from "../services/api";

/* ── Status color helper ── */
const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "suspected")         return { bg: "#FEF3C7", color: "#D97706", border: "#F59E0B" };
  if (s === "ongoing")           return { bg: "#FEE2E2", color: "#DC2626", border: "#EF4444" };
  if (s === "resolved")          return { bg: "#D1FAE5", color: "#059669", border: "#10B981" };
  if (s === "resolved with rca") return { bg: "#DBEAFE", color: "#2563EB", border: "#3B82F6" };
  return { bg: "#F1F5F9", color: "#475569", border: "#94A3B8" };
};

/* ── Keyframe injected once ── */
const SPIN_STYLE_ID = "rpm-spin-kf";
if (typeof document !== "undefined" && !document.getElementById(SPIN_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = SPIN_STYLE_ID;
  s.textContent = `@keyframes rpmSpin { to { transform: rotate(360deg) } }`;
  document.head.appendChild(s);
}

const F = "'Poppins', Arial, sans-serif";

/* ── Reusable recipient row ── */
const RecipientRow = ({ email, idx, total, isNew = false, isRemoved = false }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 16px",
    borderBottom: idx === total - 1 ? "none" : "1px solid #f1f5f9",
    background: isNew ? "#F0FDF4" : isRemoved ? "#FEF2F2" : "transparent",
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
      background: isNew
        ? "linear-gradient(135deg, #16A34A, #4ADE80)"
        : isRemoved
          ? "linear-gradient(135deg, #EF4444, #F87171)"
          : "linear-gradient(135deg, #0056f0, #3b82f6)",
      color: "#fff", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, fontFamily: F,
    }}>
      {email.charAt(0).toUpperCase()}
    </div>
    <span style={{
      flex: 1, fontSize: 13, fontFamily: F,
      color: isRemoved ? "#9CA3AF" : "#334155",
      textDecoration: isRemoved ? "line-through" : "none",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {email}
    </span>
    {isNew && (
      <span style={{
        fontSize: 10, fontWeight: 700, color: "#16A34A",
        background: "#DCFCE7", border: "1px solid #BBF7D0",
        borderRadius: 4, padding: "2px 6px", flexShrink: 0, fontFamily: F,
      }}>
        NEW
      </span>
    )}
    {isRemoved && (
      <span style={{
        fontSize: 10, fontWeight: 700, color: "#EF4444",
        background: "#FEE2E2", border: "1px solid #FECACA",
        borderRadius: 4, padding: "2px 6px", flexShrink: 0, fontFamily: F,
      }}>
        REMOVED
      </span>
    )}
  </div>
);

/* ── Section header ── */
const SectionLabel = ({ icon, label, count, badge, badgeColor }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
    <span style={{ fontSize: 14 }}>{icon}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", fontFamily: F, letterSpacing: "0.3px" }}>
      {label} ({count})
    </span>
    {badge && (
      <span style={{
        marginLeft: "auto", fontSize: 10, fontWeight: 600, fontFamily: F,
        background: badgeColor?.bg || "#F1F5F9",
        color: badgeColor?.text || "#475569",
        border: `1px solid ${badgeColor?.border || "#E2E8F0"}`,
        borderRadius: 5, padding: "2px 8px",
      }}>
        {badge}
      </span>
    )}
  </div>
);

/* ════════════════════════════════════════════════ */

const RecipientsPreviewModal = ({
  opened,
  onClose,
  displayId,        // "INC-0001" for existing, null for new
  localRecipients,  // current form state (always passed)
  incidentSubject,
  incidentStatus,
}) => {
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [subject, setSubject] = useState("");
  const [status,  setStatus]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!opened) return;
    setSavedRecipients([]);

    if (displayId) {
      setLoading(true);
      setError(null);
      fetch(endpoints.FETCH_RECIPIENTS_API(displayId))
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch recipients");
          return res.json();
        })
        .then((data) => {
          setSavedRecipients(data.recipients || []);
          setSubject(data.incident_subject || incidentSubject || "");
          setStatus(data.incident_status  || incidentStatus  || "");
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setSubject(incidentSubject || "");
      setStatus(incidentStatus   || "");
    }
  }, [opened, displayId]);

  const local  = localRecipients || [];
  const saved  = savedRecipients;

  /* Diff: what changed between saved ↔ local */
  const savedSet = new Set(saved);
  const localSet = new Set(local);
  const added    = local.filter((e) => !savedSet.has(e));
  const removed  = saved.filter((e) => !localSet.has(e));
  const unchanged = local.filter((e) => savedSet.has(e));
  const hasDiff  = displayId && (added.length > 0 || removed.length > 0);

  /* Merged view for existing incidents: unchanged + new + removed */
  const mergedList = displayId
    ? [
        ...unchanged.map((e) => ({ email: e, state: "unchanged" })),
        ...added.map((e)     => ({ email: e, state: "new"       })),
        ...removed.map((e)   => ({ email: e, state: "removed"   })),
      ]
    : local.map((e) => ({ email: e, state: "unchanged" }));

  const statusColors = getStatusColor(status || incidentStatus);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      radius="xl"
      padding={0}
      size={540}
      overlayProps={{ blur: 4, opacity: 0.25 }}
      styles={{
        content: {
          fontFamily: F,
          boxShadow: "0 24px 60px rgba(0,0,0,0.14), 0 0 0 1px #E2E8F0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        },
        body: { padding: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 24px", background: "#0f172a",
        borderRadius: "12px 12px 0 0",
      }}>
        <img src={logo} alt="Taboola" style={{ height: 22 }} />
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)" }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", color: "#60a5fa", fontFamily: F, textTransform: "uppercase" }}>
          Incident Management
        </span>
        <button onClick={onClose} style={{
          marginLeft: "auto", background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
          width: 28, height: 28, cursor: "pointer", color: "#94a3b8",
          fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{
            width: 32, height: 32, margin: "0 auto 14px",
            border: "3px solid #E2E8F0", borderTopColor: "#0056f0",
            borderRadius: "50%", animation: "rpmSpin 0.8s linear infinite",
          }} />
          <p style={{ color: "#64748b", fontFamily: F, fontSize: 13, margin: 0 }}>Loading recipients…</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {!loading && error && (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: "#ef4444", fontFamily: F, fontWeight: 600, margin: "0 0 6px" }}>Could not load recipients</p>
          <p style={{ color: "#64748b", fontFamily: F, fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── CONTENT ── */}
      {!loading && !error && (
        <>
          {/* Scrollable zone: info bar + lists */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

          {/* Info bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 24px", background: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
            position: "sticky", top: 0, zIndex: 2,
          }}>
            <div style={{
              padding: "5px 12px",
              background: displayId ? "#0056f0" : "#F59E0B",
              color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.5px", fontFamily: F, whiteSpace: "nowrap",
            }}>
              {displayId || "Preview"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b", fontFamily: F,
                lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {subject || incidentSubject || "Untitled Incident"}
              </p>
              {(status || incidentStatus) && (
                <span style={{
                  display: "inline-block", marginTop: 5, padding: "2px 10px",
                  borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: F,
                  background: statusColors.bg, color: statusColors.color,
                  border: `1px solid ${statusColors.border}`, textTransform: "capitalize",
                }}>
                  {status || incidentStatus}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── EXISTING INCIDENT: show merged diff view ── */}
            {displayId && (
              <>
                {hasDiff && (
                  /* Diff banner */
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#FFFBEB", border: "1px solid #FDE68A",
                    borderRadius: 8, padding: "10px 14px",
                  }}>
                    <span style={{ fontSize: 15 }}>⚠️</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#B45309", fontFamily: F }}>
                        Unsaved changes detected
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#92400E", fontFamily: F }}>
                        {added.length > 0 && `${added.length} added`}
                        {added.length > 0 && removed.length > 0 && " · "}
                        {removed.length > 0 && `${removed.length} removed`}
                        {" — these will take effect after saving."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Merged recipient list */}
                <div>
                  <SectionLabel
                    icon="👥"
                    label={hasDiff ? "Recipients after save" : "Current Recipients"}
                    count={mergedList.filter(r => r.state !== "removed").length}
                    badge={hasDiff ? "Pending save" : null}
                    badgeColor={{ bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" }}
                  />
                  <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                    {mergedList.length === 0 ? (
                      <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontFamily: F, fontSize: 13 }}>
                        No recipients added yet.
                      </div>
                    ) : (
                      mergedList.map(({ email, state }, idx) => (
                        <RecipientRow
                          key={idx}
                          email={email}
                          idx={idx}
                          total={mergedList.length}
                          isNew={state === "new"}
                          isRemoved={state === "removed"}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Saved (original) list — only shown when there's a diff */}
                {hasDiff && (
                  <div>
                    <SectionLabel
                      icon="💾"
                      label="Currently saved in DB"
                      count={saved.length}
                      badge="Saved"
                      badgeColor={{ bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" }}
                    />
                    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                      {saved.length === 0 ? (
                        <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontFamily: F, fontSize: 13 }}>
                          No recipients saved yet.
                        </div>
                      ) : (
                        saved.map((email, idx) => (
                          <RecipientRow key={idx} email={email} idx={idx} total={saved.length} />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── NEW INCIDENT: just show local form state ── */}
            {!displayId && (
              <div>
                <SectionLabel
                  icon="👥"
                  label="Notification Recipients"
                  count={local.length}
                  badge="Unsaved preview"
                  badgeColor={{ bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" }}
                />
                <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  {local.length === 0 ? (
                    <div style={{ padding: "24px 20px", textAlign: "center", color: "#94a3b8", fontFamily: F, fontSize: 13 }}>
                      No recipients added yet.
                    </div>
                  ) : (
                    local.map((email, idx) => (
                      <RecipientRow key={idx} email={email} idx={idx} total={local.length} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          </div>{/* end scrollable zone */}

          {/* Footer — pinned at bottom */}
          <div style={{
            padding: "12px 24px", borderTop: "1px solid #f1f5f9",
            textAlign: "center", fontSize: 11, color: "#94a3b8", fontFamily: F,
            flexShrink: 0,
          }}>
            Taboola Incident Management Team
          </div>
        </>
      )}
    </Modal>
  );
};

export default RecipientsPreviewModal;
