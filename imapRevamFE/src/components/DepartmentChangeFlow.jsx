import React from "react";
import { Modal, useComputedColorScheme } from "@mantine/core";
import IncidentTxtBox from "./IncidentTxtBox";

/* ── Inject keyframes once (shared with ConfirmSubmitModal if present) ── */
const STYLE_ID = "dept-modal-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes dcFadeUp  { from { opacity:0; transform:translateY(14px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }
    @keyframes dcSpin    { to { transform:rotate(360deg) } }
    @keyframes dcPulse   { 0%,100% { transform:scale(.92); opacity:.5 } 50% { transform:scale(1.1); opacity:.15 } }
    @keyframes dcPopIn   { 0% { transform:scale(.4); opacity:0 } 70% { transform:scale(1.18) } 100% { transform:scale(1); opacity:1 } }
    @keyframes dcShimmer { 0% { background-position:-200% center } 100% { background-position:200% center } }
    @keyframes dcFloat   { from { opacity:0; transform:translateY(7px) } to { opacity:1; transform:translateY(0) } }
    @keyframes dcCheckDraw { 0% { stroke-dashoffset:50 } 100% { stroke-dashoffset:0 } }
    @keyframes dcSlideIn { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
    @keyframes dcArrow   { 0%,100% { transform:translateX(0) } 50% { transform:translateX(4px) } }
  `;
  document.head.appendChild(s);
}

/* ── Design tokens ── */
const F = "'Poppins', 'Inter', Arial, sans-serif";
const C = {
  blue:   { solid:"#2563EB", grad:"#3B82F6", light:"rgba(59,130,246,0.14)", ring:"rgba(96,165,250,0.45)", text:"#93c5fd" },
  orange: { solid:"#F59E0B", grad:"#FBBF24", light:"rgba(251,191,36,0.14)", ring:"rgba(253,224,71,0.35)", text:"#fcd34d" },
  red:    { solid:"#EF4444", grad:"#F87171", light:"rgba(248,113,113,0.12)", ring:"rgba(252,165,165,0.4)", text:"#fca5a5" },
  green:  { solid:"#16A34A", grad:"#4ADE80", light:"rgba(52,211,153,0.12)", ring:"rgba(52,211,153,0.35)", text:"#6ee7b7" },
};

/* ── Shared primitives ── */
const Panel = ({ children }) => (
  <div style={{
    fontFamily: F,
    animation: "dcFadeUp 0.28s cubic-bezier(.22,.68,0,1.2) both",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 18, paddingBlock: 20, paddingInline: 4,
  }}>
    {children}
  </div>
);

const Halo = ({ color, pulse, size = 68, children }) => {
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: false });
  const light = scheme === "light";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {pulse && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          background: color.ring,
          animation: "dcPulse 2.2s ease-in-out infinite",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: light
          ? `linear-gradient(145deg, #ffffff 0%, #e2e8f0 55%, #f8fafc 100%)`
          : `linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(7,15,26,0.92) 100%)`,
        border: light
          ? `1.5px solid ${color.ring}`
          : `1.5px solid rgba(255,255,255,0.14)`,
        boxShadow: light
          ? `0 8px 24px -6px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)`
          : `0 6px 22px -4px ${color.ring}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {children}
      </div>
    </div>
  );
};

const Title = ({ children, color, delay = "0.08s" }) => (
  <div style={{
    fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px",
    color: color || "var(--imap-form-text)", textAlign: "center",
    animation: `dcFloat .3s ${delay} ease both`, opacity: 0,
  }}>
    {children}
  </div>
);

const Caption = ({ children, delay = "0.14s" }) => (
  <div style={{
    fontSize: 13, color: "var(--imap-text-primary)", textAlign: "center",
    lineHeight: 1.65, maxWidth: 300, margin: "0 auto",
    animation: `dcFloat .3s ${delay} ease both`, opacity: 0,
  }}>
    {children}
  </div>
);

const Hr = () => (
  <div style={{ width: "100%", height: 1, background: "var(--imap-border-strong)", margin: "8px 0" }} />
);

const Btn = ({ label, onClick, primary = false, color = C.blue, disabled = false }) => {
  const base = {
    fontFamily: F, fontSize: 13, fontWeight: 600,
    padding: "9px 22px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    transition: "transform .15s, box-shadow .15s, background .15s, border-color .15s",
    outline: "none", letterSpacing: "0.15px", opacity: disabled ? 0.5 : 1,
    border: "none",
  };
  return primary
    ? <button
        style={{
          ...base,
          background: `linear-gradient(135deg, ${color.solid}, ${color.grad})`,
          color: "#fff",
          boxShadow: `0 4px 14px -2px ${color.ring}`,
        }}
        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 7px 20px -2px ${color.ring}`; }}}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 14px -2px ${color.ring}`; }}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
      >{label}</button>
    : <button
        style={{
          ...base,
          background: "var(--imap-glass-08)",
          color: "var(--imap-form-text)",
          border: "1.5px solid var(--imap-border-strong)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--imap-glass-1)"; e.currentTarget.style.borderColor = "var(--imap-brand)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--imap-glass-08)"; e.currentTarget.style.borderColor = "var(--imap-border-strong)"; }}
        onClick={onClick}
      >{label}</button>;
};

/* ── Department arrow pill ── */
const DeptFlow = ({ from, to }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    background: "var(--imap-surface-glass)",
    border: "1px solid var(--imap-border-default)",
    borderRadius: 12, padding: "10px 18px",
    animation: "dcSlideIn .35s .1s ease both", opacity: 0,
  }}>
    <div style={{
      background: "var(--imap-accent-amber-bg)",
      border: "1px solid rgba(251, 191, 36, 0.45)",
      borderRadius: 7, padding: "5px 14px",
      fontSize: 13, fontWeight: 600, color: "var(--imap-accent-amber-fg)",
    }}>
      {from}
    </div>
    <div style={{ animation: "dcArrow 1.4s ease-in-out infinite" }}>
      <i className="fa-solid fa-arrow-right" style={{ color: "var(--imap-text-muted)", fontSize: 13 }} />
    </div>
    <div style={{
      background: "var(--imap-brand-dim)",
      border: "1px solid var(--imap-border-accent)",
      borderRadius: 7, padding: "5px 14px",
      fontSize: 13, fontWeight: 600, color: "var(--imap-brand)",
    }}>
      {to}
    </div>
  </div>
);

/* ── Sleek checkbox ── */
const Toggle = ({ checked, onChange, label }) => (
  <label style={{
    display: "flex", alignItems: "center", gap: 10,
    cursor: "pointer", userSelect: "none",
    padding: "10px 16px", borderRadius: 10,
    border: checked ? "1.5px solid rgba(37, 99, 235, 0.45)" : "1.5px solid var(--imap-border-strong)",
    background: checked ? "var(--imap-brand-dim)" : "var(--imap-glass-04)",
    transition: "all .2s ease",
    fontSize: 13, fontWeight: 600,
    color: checked ? "var(--imap-brand)" : "var(--imap-text-primary)",
    animation: "dcFloat .3s .22s ease both", opacity: 0,
  }}>
    {/* Custom checkbox */}
    <div style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      border: `2px solid ${checked ? C.blue.solid : "var(--imap-border-strong)"}`,
      background: checked ? C.blue.solid : "var(--imap-surface-0)",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all .18s ease",
    }}>
      {checked && <i className="fa-solid fa-check" style={{ color: "#fff", fontSize: 9 }} />}
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
    {label}
  </label>
);

/* ══════════════════════════════════════════════════════════ */

const DepartmentChangeFlow = ({
  opened,
  step,
  progress = 0,
  fromDepartment,
  toDepartment,
  notifyStakeholders,
  setNotifyStakeholders,
  emailValue,
  onEmailChange,
  onCancel,
  onConfirmDirect,
  onNext,
  onSend,
}) => {
  const colorScheme = useComputedColorScheme("dark", { getInitialValueInEffect: false });
  const lightChrome = colorScheme === "light";

  if (!toDepartment && step === "confirm") return null;

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      centered
      radius="xl"
      padding="xl"
      size={step === "compose" ? "min(90vw, 860px)" : 400}
      overlayProps={{ blur: 5, opacity: lightChrome ? 0.22 : 0.3 }}
      styles={{
        content: {
          fontFamily: F,
          background: "var(--imap-modal-surface)",
          boxShadow: lightChrome
            ? "0 24px 48px -12px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.08)"
            : "0 28px 64px -8px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,0.06)",
          overflow: "hidden",
          transition: "width .25s ease",
        },
      }}
    >

      {/* ═══ STEP 1 — CONFIRM ═══ */}
      {step === "confirm" && (
        <Panel>
          <Halo color={C.orange} pulse size={68}>
            <i className="fa-solid fa-arrows-left-right" style={{ color: C.orange.solid, fontSize: 20 }} />
          </Halo>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title>Department Change</Title>
            <Caption>You are about to reassign this incident to a different department.</Caption>
          </div>

          {/* From → To pill */}
          <DeptFlow from={fromDepartment} to={toDepartment} />

          {/* Warning note */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 9,
            background: C.red.light, border: `1px solid ${C.red.ring}`,
            borderRadius: 9, padding: "9px 14px",
            fontSize: 12, color: "var(--imap-accent-rose-fg)", fontWeight: 600,
            width: "100%", boxSizing: "border-box",
            animation: "dcFloat .3s .18s ease both", opacity: 0,
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginTop: 1, flexShrink: 0 }} />
            Department can only be changed once per incident update.
          </div>

          {/* Notify toggle */}
          <Toggle
            checked={notifyStakeholders}
            onChange={(e) => setNotifyStakeholders(e.target.checked)}
            label="Notify stakeholders about this change"
          />

          <Hr />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn label="Cancel" onClick={onCancel} />
            {!notifyStakeholders
              ? <Btn label="Confirm Change" onClick={onConfirmDirect} primary color={C.orange} />
              : <Btn label="Next →" onClick={onNext} primary color={C.blue} />
            }
          </div>
        </Panel>
      )}

      {/* ═══ STEP 2 — COMPOSE ═══ */}
      {step === "compose" && (
        <div style={{
          fontFamily: F,
          animation: "dcFadeUp 0.28s cubic-bezier(.22,.68,0,1.2) both",
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          <div style={{
            paddingBottom: 16,
            borderBottom: "1px solid var(--imap-glass-line)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: "var(--imap-brand-dim)",
                border: "1.5px solid var(--imap-border-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="fa-solid fa-envelope" style={{ color: "var(--imap-brand)", fontSize: 16 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--imap-form-text)", letterSpacing: "-0.2px" }}>
                  Notify Stakeholders
                </div>
                <div style={{ fontSize: 12, color: "var(--imap-text-muted)", marginTop: 2, fontWeight: 500 }}>
                  Compose the message for the department change notification
                </div>
              </div>
            </div>
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <DeptFlow from={fromDepartment} to={toDepartment} />
            </div>
          </div>

          <IncidentTxtBox
            surface="auto"
            startingLine=""
            context="department_change"
            inputProps={{
              value: emailValue,
              onChange: onEmailChange,
            }}
          />

          {/* Actions */}
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 10,
            paddingTop: 14, borderTop: "1px solid var(--imap-glass-line)",
          }}>
            <Btn label="← Back" onClick={onCancel} />
            <Btn label="Send & Change Department" onClick={onSend} primary color={C.blue} />
          </div>
        </div>
      )}

      {/* ═══ STEP 3 — SUBMITTING ═══ */}
      {step === "submitting" && (
        <Panel>
          {/* Dual-ring spinner */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="40" cy="40" r="33" fill="none" stroke={C.blue.ring} strokeWidth="5" />
              <circle
                cx="40" cy="40" r="33" fill="none"
                stroke="url(#dcArc)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 33}`}
                strokeDashoffset={`${2 * Math.PI * 33 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.35s ease" }}
              />
              <defs>
                <linearGradient id="dcArc" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={C.blue.solid} />
                  <stop offset="100%" stopColor={C.blue.grad} />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "var(--imap-brand)",
            }}>
              {progress}%
            </div>
          </div>

          <div style={{ width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--imap-text-bright)", marginBottom: 12 }}>
              Notifying Stakeholders
            </div>

            {/* Shimmer bar */}
            <div style={{ width: "100%", height: 5, background: C.blue.ring, borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${progress}%`, borderRadius: 99,
                background: `linear-gradient(90deg, ${C.blue.solid} 0%, ${C.blue.grad} 50%, ${C.blue.solid} 100%)`,
                backgroundSize: "200% auto",
                animation: "dcShimmer 1.4s linear infinite",
                transition: "width 0.35s ease",
              }} />
            </div>

            <div style={{ fontSize: 11, color: "var(--imap-text-muted)", marginTop: 8, letterSpacing: "0.5px" }}>
              Sending notifications and updating the incident
            </div>
          </div>
        </Panel>
      )}

      {/* ═══ STEP 4 — SUCCESS ═══ */}
      {step === "success" && (
        <Panel>
          {/* Animated check */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              background: C.green.ring,
              animation: "dcPulse 2s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.green.grad}, ${C.green.solid})`,
              boxShadow: `0 8px 24px -4px ${C.green.ring}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "dcPopIn .5s cubic-bezier(.34,1.56,.64,1) both",
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path
                  d="M8 18 L15 25 L28 11"
                  stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="50" strokeDashoffset="50"
                  style={{ animation: "dcCheckDraw .4s .3s ease forwards" }}
                />
              </svg>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title color="var(--imap-accent-green-fg)" delay="0.1s">Department Changed!</Title>
            <Caption delay="0.18s">
              The incident has been updated and all stakeholders have been notified.
            </Caption>
          </div>

          {/* Status chips */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 8, width: "100%",
            animation: "dcFloat .35s .28s ease both", opacity: 0,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: C.green.light, border: `1px solid ${C.green.ring}`,
              borderRadius: 10, padding: "9px 18px",
              fontSize: 12, fontWeight: 600, color: "var(--imap-accent-green-fg)",
            }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} />
              Incident updated · Stakeholders notified
            </div>

            {/* From → To summary */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "var(--imap-surface-glass)",
              border: "1px solid var(--imap-border-default)",
              borderRadius: 10, padding: "8px 16px",
              fontSize: 12, color: "var(--imap-text-muted)",
            }}>
              <span style={{ fontWeight: 600, color: "var(--imap-accent-amber-fg)" }}>{fromDepartment}</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} />
              <span style={{ fontWeight: 600, color: "var(--imap-brand)" }}>{toDepartment}</span>
            </div>
          </div>

          <Caption delay="0.38s">Redirecting you back in a moment…</Caption>
        </Panel>
      )}

    </Modal>
  );
};

export default DepartmentChangeFlow;
