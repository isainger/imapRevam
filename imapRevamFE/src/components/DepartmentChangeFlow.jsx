import { Modal } from "@mantine/core";
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
  blue:   { solid:"#2563EB", grad:"#3B82F6", light:"#EFF6FF", ring:"#BFDBFE", text:"#1D4ED8" },
  orange: { solid:"#F59E0B", grad:"#FBBF24", light:"#FFFBEB", ring:"#FDE68A", text:"#B45309" },
  red:    { solid:"#EF4444", grad:"#F87171", light:"#FEF2F2", ring:"#FECACA", text:"#B91C1C" },
  green:  { solid:"#16A34A", grad:"#4ADE80", light:"#F0FDF4", ring:"#BBF7D0", text:"#15803D" },
  slate:  { border:"#E2E8F0", muted:"#94A3B8", soft:"#F8FAFC" },
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

const Halo = ({ color, pulse, size = 68, children }) => (
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
      background: `linear-gradient(145deg, ${color.light} 0%, #fff 100%)`,
      border: `1.5px solid ${color.ring}`,
      boxShadow: `0 6px 22px -4px ${color.ring}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {children}
    </div>
  </div>
);

const Title = ({ children, color, delay = "0.08s" }) => (
  <div style={{
    fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px",
    color: color || "#0F172A", textAlign: "center",
    animation: `dcFloat .3s ${delay} ease both`, opacity: 0,
  }}>
    {children}
  </div>
);

const Caption = ({ children, delay = "0.14s" }) => (
  <div style={{
    fontSize: 13, color: C.slate.muted, textAlign: "center",
    lineHeight: 1.65, maxWidth: 300, margin: "0 auto",
    animation: `dcFloat .3s ${delay} ease both`, opacity: 0,
  }}>
    {children}
  </div>
);

const Hr = () => (
  <div style={{ width: "100%", height: 1, background: C.slate.border, margin: "2px 0" }} />
);

const Btn = ({ label, onClick, primary = false, color = C.blue, disabled = false }) => {
  const base = {
    fontFamily: F, fontSize: 13, fontWeight: 600,
    padding: "9px 22px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    transition: "transform .15s, box-shadow .15s, background .15s",
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
          background: "#fff", color: "#64748B",
          border: "1.5px solid #E2E8F0",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#CBD5E1"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
        onClick={onClick}
      >{label}</button>;
};

/* ── Department arrow pill ── */
const DeptFlow = ({ from, to }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    background: C.slate.soft, border: `1px solid ${C.slate.border}`,
    borderRadius: 12, padding: "10px 18px",
    animation: "dcSlideIn .35s .1s ease both", opacity: 0,
  }}>
    <div style={{
      background: C.orange.light, border: `1px solid ${C.orange.ring}`,
      borderRadius: 7, padding: "5px 14px",
      fontSize: 13, fontWeight: 600, color: C.orange.text,
    }}>
      {from}
    </div>
    <div style={{ animation: "dcArrow 1.4s ease-in-out infinite" }}>
      <i className="fa-solid fa-arrow-right" style={{ color: C.slate.muted, fontSize: 13 }} />
    </div>
    <div style={{
      background: C.blue.light, border: `1px solid ${C.blue.ring}`,
      borderRadius: 7, padding: "5px 14px",
      fontSize: 13, fontWeight: 600, color: C.blue.text,
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
    border: `1.5px solid ${checked ? C.blue.ring : C.slate.border}`,
    background: checked ? C.blue.light : "#fff",
    transition: "all .2s ease",
    fontSize: 13, fontWeight: 500,
    color: checked ? C.blue.text : "#475569",
    animation: "dcFloat .3s .22s ease both", opacity: 0,
  }}>
    {/* Custom checkbox */}
    <div style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      border: `2px solid ${checked ? C.blue.solid : "#CBD5E1"}`,
      background: checked ? C.blue.solid : "#fff",
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
      overlayProps={{ blur: 5, opacity: 0.3 }}
      styles={{
        content: {
          fontFamily: F,
          boxShadow: "0 28px 64px -8px rgba(15,23,42,.18), 0 0 0 1px #E2E8F0",
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
            fontSize: 12, color: C.red.text, fontWeight: 500,
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
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 16, borderBottom: `1px solid ${C.slate.border}` }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
              background: C.blue.light, border: `1.5px solid ${C.blue.ring}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="fa-solid fa-envelope" style={{ color: C.blue.solid, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.2px" }}>
                Notify Stakeholders
              </div>
              <div style={{ fontSize: 12, color: C.slate.muted, marginTop: 2 }}>
                Compose the message for the department change notification
              </div>
            </div>
            {/* From → To badge inline */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.orange.text, background: C.orange.light, border: `1px solid ${C.orange.ring}`, borderRadius: 6, padding: "3px 10px" }}>
                {fromDepartment}
              </span>
              <i className="fa-solid fa-arrow-right" style={{ color: C.slate.muted, fontSize: 11 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.blue.text, background: C.blue.light, border: `1px solid ${C.blue.ring}`, borderRadius: 6, padding: "3px 10px" }}>
                {toDepartment}
              </span>
            </div>
          </div>

          {/* Rich text editor */}
          <IncidentTxtBox
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
            paddingTop: 14, borderTop: `1px solid ${C.slate.border}`,
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
              fontSize: 14, fontWeight: 700, color: C.blue.text,
            }}>
              {progress}%
            </div>
          </div>

          <div style={{ width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>
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

            <div style={{ fontSize: 11, color: C.slate.muted, marginTop: 8, letterSpacing: "0.5px" }}>
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
            <Title color={C.green.text} delay="0.1s">Department Changed!</Title>
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
              fontSize: 12, fontWeight: 600, color: C.green.text,
            }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} />
              Incident updated · Stakeholders notified
            </div>

            {/* From → To summary */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: C.slate.soft, border: `1px solid ${C.slate.border}`,
              borderRadius: 10, padding: "8px 16px",
              fontSize: 12, color: C.slate.muted,
            }}>
              <span style={{ fontWeight: 600, color: C.orange.text }}>{fromDepartment}</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} />
              <span style={{ fontWeight: 600, color: C.blue.text }}>{toDepartment}</span>
            </div>
          </div>

          <Caption delay="0.38s">Redirecting you back in a moment…</Caption>
        </Panel>
      )}

    </Modal>
  );
};

export default DepartmentChangeFlow;
