import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { endpoints } from "../services/api";
import logo from "../assets/logo.png";
import ThemeToggle from "./ThemeToggle.jsx";

const RecipientList = () => {
  const { incidentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const res = await fetch(endpoints.FETCH_RECIPIENTS_API(incidentId));
        if (!res.ok) throw new Error("Incident not found");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipients();
  }, [incidentId]);

  if (loading) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.card}>
          <div style={styles.loadingDot}>
            <div style={styles.spinner} />
            <p style={{ color: "var(--imap-text-muted)", fontFamily: "'Poppins', sans-serif", marginTop: "16px" }}>
              Loading recipients...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>!</div>
            <h2 style={{ ...styles.title, color: "#ef4444" }}>Not Found</h2>
            <p style={{ color: "var(--imap-text-muted)", fontFamily: "'Poppins', sans-serif" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        {/* Header — dark bg so white logo is visible */}
        <div style={styles.header}>
          <img src={logo} alt="Taboola" style={{ height: "24px" }} />
          <div style={styles.headerDivider} />
          <span style={styles.headerLabel}>INCIDENT MANAGEMENT</span>
          <div style={{ flex: 1 }} />
          <ThemeToggle />
        </div>

        {/* Incident Info Bar */}
        <div style={styles.infoBar}>
          <div style={styles.incidentBadge}>{data.display_id}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.subject}>{data.incident_subject}</p>
            <span style={styles.statusBadge(data.incident_status)}>
              {data.incident_status}
            </span>
          </div>
        </div>

        {/* Recipients Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--imap-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span style={styles.sectionTitle}>
              Notification Recipients ({data.recipients.length})
            </span>
          </div>

          <div style={styles.recipientGrid}>
            {data.recipients.length === 0 ? (
              <p style={{ color: "var(--imap-text-muted)", fontFamily: "'Poppins', sans-serif", textAlign: "center", padding: "24px" }}>
                No recipients found for this incident.
              </p>
            ) : (
              data.recipients.map((email, idx) => (
                <div key={idx} style={{
                  ...styles.recipientRow,
                  borderBottom: idx === data.recipients.length - 1 ? "none" : "1px solid #f1f5f9",
                }}>
                  <div style={styles.avatar}>
                    {email.charAt(0).toUpperCase()}
                  </div>
                  <span style={styles.email}>{email}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span>Taboola Incident Management Team</span>
        </div>
      </div>
    </div>
  );
};

/* ---------- STATUS COLOR HELPER ---------- */
const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "suspected") return { bg: "#FEF3C7", color: "#D97706", border: "#F59E0B" };
  if (s === "ongoing") return { bg: "#FEE2E2", color: "#DC2626", border: "#EF4444" };
  if (s === "resolved") return { bg: "#D1FAE5", color: "#059669", border: "#10B981" };
  if (s === "resolved with rca") return { bg: "#DBEAFE", color: "#2563EB", border: "#3B82F6" };
  return { bg: "#F1F5F9", color: "#475569", border: "#94A3B8" };
};

/* ---------- STYLES ---------- */
const styles = {
  backdrop: {
    minHeight: "100vh",
    width: "100%",
    background: "var(--imap-recipient-backdrop)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 24px",
    fontFamily: "'Poppins', Arial, sans-serif",
    overflowY: "auto",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    background: "var(--imap-recipient-card)",
    borderRadius: "16px",
    boxShadow:
      "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--imap-recipient-card-border)",
    overflow: "visible",
    marginBottom: "40px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "18px 24px",
    background: "var(--imap-header-bg)",
    borderBottom: "1px solid var(--imap-header-border)",
    borderRadius: "16px 16px 0 0",
  },
  headerDivider: {
    width: "1px",
    height: "20px",
    background: "var(--imap-chrome-divider)",
  },
  headerLabel: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "var(--imap-brand)",
    fontFamily: "'Poppins', sans-serif",
  },
  infoBar: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px 24px",
    background: "var(--imap-recipient-info-bg)",
    borderBottom: "1px solid var(--imap-recipient-info-border)",
  },
  incidentBadge: {
    padding: "6px 12px",
    background: "var(--imap-brand)",
    color: "#fff",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    fontFamily: "'Poppins', sans-serif",
    whiteSpace: "nowrap",
  },
  subject: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--imap-text-bright)",
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.4,
  },
  statusBadge: (status) => {
    const c = getStatusColor(status);
    return {
      display: "inline-block",
      marginTop: "6px",
      padding: "3px 10px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      fontFamily: "'Poppins', sans-serif",
      textTransform: "capitalize",
    };
  },
  section: {
    padding: "24px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--imap-recipient-section-title)",
    letterSpacing: "0.3px",
    fontFamily: "'Poppins', sans-serif",
  },
  recipientGrid: {
    border: "1.5px solid var(--imap-recipient-grid-border)",
    borderRadius: "12px",
    maxHeight: "480px",
    overflowY: "auto",
  },
  recipientRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderBottom: "1px solid var(--imap-recipient-row-border)",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--imap-brand), #3b82f6)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  email: {
    fontSize: "13px",
    color: "var(--imap-recipient-email)",
    fontFamily: "'Poppins', sans-serif",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footer: {
    padding: "16px 24px",
    textAlign: "center",
    borderTop: "1px solid var(--imap-recipient-footer-border)",
    fontSize: "11px",
    color: "var(--imap-recipient-footer-text)",
    fontFamily: "'Poppins', sans-serif",
  },
  loadingDot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--imap-recipient-spinner-track)",
    borderTopColor: "var(--imap-brand)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

export default RecipientList;
