import { Modal } from "@mantine/core";

/* ── Inject keyframes once ── */
const STYLE_ID = "confirm-modal-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes cmFadeUp   { from { opacity:0; transform:translateY(14px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }
    @keyframes cmSpin     { to   { transform: rotate(360deg) } }
    @keyframes cmPulse    { 0%,100% { transform:scale(.92); opacity:.5 } 50% { transform:scale(1.08); opacity:.15 } }
    @keyframes cmPopIn    { 0% { transform:scale(.4); opacity:0 } 70% { transform:scale(1.18) } 100% { transform:scale(1); opacity:1 } }
    @keyframes cmShimmer  { 0% { background-position:-200% center } 100% { background-position:200% center } }
    @keyframes cmFloatUp  { from { opacity:0; transform:translateY(7px) } to { opacity:1; transform:translateY(0) } }
    @keyframes cmCheckDraw {
      0%   { stroke-dashoffset: 50 }
      100% { stroke-dashoffset: 0  }
    }
  `;
  document.head.appendChild(s);
}

/* ── Tokens ── */
const F = "'Poppins', 'Inter', Arial, sans-serif";
const C = {
  blue:   { solid:"#2563EB", grad:"#3B82F6", light:"#EFF6FF", ring:"#BFDBFE", text:"#1D4ED8" },
  orange: { solid:"#F59E0B", grad:"#FBBF24", light:"#FFFBEB", ring:"#FDE68A", text:"#B45309" },
  red:    { solid:"#EF4444", grad:"#F87171", light:"#FEF2F2", ring:"#FECACA", text:"#B91C1C" },
  green:  { solid:"#16A34A", grad:"#4ADE80", light:"#F0FDF4", ring:"#BBF7D0", text:"#15803D" },
};

/* ── Primitive helpers ── */

/** Full-bleed animated entry wrapper */
const Panel = ({ children, delay = 0 }) => (
  <div style={{
    fontFamily: F,
    animation: `cmFadeUp 0.28s ${delay}s cubic-bezier(.22,.68,0,1.2) both`,
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 18, paddingBlock: 24, paddingInline: 4,
  }}>
    {children}
  </div>
);

/** Pulsing icon halo */
const Halo = ({ color, pulse, size = 72, children }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {pulse && (
      <div style={{
        position: "absolute", inset: -4, borderRadius: "50%",
        background: color.ring,
        animation: "cmPulse 2.2s ease-in-out infinite",
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
    animation: `cmFloatUp .3s ${delay} ease both`, opacity: 0,
  }}>
    {children}
  </div>
);

const Caption = ({ children, delay = "0.14s" }) => (
  <div style={{
    fontSize: 13, color: "#94A3B8", textAlign: "center",
    lineHeight: 1.65, maxWidth: 260, margin: "0 auto",
    animation: `cmFloatUp .3s ${delay} ease both`, opacity: 0,
  }}>
    {children}
  </div>
);

const Hr = () => (
  <div style={{ width: "100%", height: 1, background: "#F1F5F9", margin: "2px 0" }} />
);

/* Sleek button — no ActionBtn dependency needed */
const Btn = ({ label, onClick, primary = false, color = C.blue }) => {
  const base = {
    fontFamily: F, fontSize: 13, fontWeight: 600,
    padding: "9px 26px", borderRadius: 8, cursor: "pointer",
    transition: "transform .15s, box-shadow .15s",
    outline: "none", letterSpacing: "0.15px",
  };
  return primary
    ? <button
        style={{
          ...base,
          background: `linear-gradient(135deg, ${color.solid}, ${color.grad})`,
          color: "#fff", border: "none",
          boxShadow: `0 4px 14px -2px ${color.ring}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 7px 20px -2px ${color.ring}`; }}
        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";   e.currentTarget.style.boxShadow=`0 4px 14px -2px ${color.ring}`; }}
        onClick={onClick}
      >{label}</button>
    : <button
        style={{
          ...base,
          background: "#fff", color: "#64748B",
          border: "1.5px solid #E2E8F0",
        }}
        onMouseEnter={e => { e.currentTarget.style.background="#F8FAFC"; e.currentTarget.style.borderColor="#CBD5E1"; }}
        onMouseLeave={e => { e.currentTarget.style.background="#fff";    e.currentTarget.style.borderColor="#E2E8F0"; }}
        onClick={onClick}
      >{label}</button>;
};

/* ══════════════════════════════════════════════════════════ */

const ConfirmSubmitModal = ({ opened, stage, submitProgress, purpose, onCancel, onConfirm }) => {
  const isExit = purpose === "exit";

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
      size={380}
      overlayProps={{ blur: 5, opacity: 0.3 }}
      styles={{
        content: {
          fontFamily: F,
          boxShadow: "0 28px 64px -8px rgba(15,23,42,.18), 0 0 0 1px #E2E8F0",
          overflow: "hidden",
        },
      }}
    >

      {/* ── FETCHING ── */}
      {stage === "fetching" && (
        <Panel>
          {/* Dual-ring spinner */}
          <div style={{ position: "relative", width: 68, height: 68 }}>
            <svg width="68" height="68" style={{ position: "absolute", inset: 0 }}>
              <circle cx="34" cy="34" r="28" fill="none" stroke={C.blue.ring} strokeWidth="4" />
            </svg>
            <svg width="68" height="68" style={{ position: "absolute", inset: 0, animation: "cmSpin .75s linear infinite" }}>
              <circle cx="34" cy="34" r="28" fill="none" stroke={C.blue.solid}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray="44 132" />
            </svg>
            <div style={{
              position: "absolute", inset: 14, borderRadius: "50%",
              background: C.blue.light,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="fa-solid fa-database" style={{ color: C.blue.solid, fontSize: 16 }} />
            </div>
          </div>
          <Title>Fetching Incident</Title>
          <Caption>Retrieving the latest data — hang tight…</Caption>
        </Panel>
      )}

      {/* ── FETCH ERROR ── */}
      {stage === "fetch-error" && (
        <Panel>
          <Halo color={C.red} pulse size={72}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: C.red.solid, fontSize: 22 }} />
          </Halo>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title color={C.red.text}>Something Went Wrong</Title>
            <Caption>We couldn't retrieve the incident. Check your connection and try again.</Caption>
          </div>
          <Btn label="↺  Retry" onClick={onCancel} primary color={C.red} />
        </Panel>
      )}

      {/* ── NOT FOUND ── */}
      {stage === "fetch-not-found" && (
        <Panel>
          <Halo color={C.orange} size={72}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: C.orange.solid, fontSize: 20 }} />
          </Halo>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title color={C.orange.text}>Incident Not Found</Title>
            <Caption>No incident exists with this ID or link. Please double-check and try again.</Caption>
          </div>
          <Btn label="Try Again" onClick={onCancel} primary color={C.orange} />
        </Panel>
      )}

      {/* ── SUBMITTING ── */}
      {stage === "submitting" && (
        <Panel>
          {/* SVG circular progress */}
          <div style={{ position: "relative", width: 86, height: 86 }}>
            <svg width="86" height="86" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="43" cy="43" r="36" fill="none" stroke={C.blue.ring} strokeWidth="5" />
              <circle
                cx="43" cy="43" r="36" fill="none"
                stroke={`url(#blueArc)`} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - (submitProgress || 0) / 100)}`}
                style={{ transition: "stroke-dashoffset 0.35s ease" }}
              />
              <defs>
                <linearGradient id="blueArc" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={C.blue.solid} />
                  <stop offset="100%" stopColor={C.blue.grad} />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 700, color: C.blue.text,
            }}>
              {submitProgress ?? 0}%
            </div>
          </div>

          <div style={{ width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>
              Submitting Incident
            </div>

            {/* Shimmer track */}
            <div style={{ width: "100%", height: 5, background: C.blue.ring, borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${submitProgress ?? 0}%`,
                borderRadius: 99,
                background: `linear-gradient(90deg, ${C.blue.solid} 0%, ${C.blue.grad} 50%, ${C.blue.solid} 100%)`,
                backgroundSize: "200% auto",
                animation: "cmShimmer 1.4s linear infinite",
                transition: "width 0.35s ease",
              }} />
            </div>

            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8, letterSpacing: "0.5px" }}>
              Do not close this window
            </div>
          </div>
        </Panel>
      )}

      {/* ── CONFIRM ── */}
      {stage === "confirm" && (
        <Panel>
          <Halo color={isExit ? C.orange : C.blue} pulse={!isExit} size={72}>
            <i
              className={isExit ? "fa-solid fa-arrow-right-from-bracket" : "fa-solid fa-paper-plane"}
              style={{ color: isExit ? C.orange.solid : C.blue.solid, fontSize: 20 }}
            />
          </Halo>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title>{isExit ? "Unsaved Changes" : "Ready to Submit?"}</Title>
            <Caption>
              {isExit
                ? "You have unsaved changes that will be lost if you leave now. Are you sure?"
                : "Please confirm all details are correct before submitting the incident."}
            </Caption>
          </div>

          <Hr />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn label="Cancel" onClick={onCancel} />
            <Btn
              label={isExit ? "Yes, discard" : "Submit"}
              onClick={onConfirm}
              primary
              color={isExit ? C.orange : C.blue}
            />
          </div>
        </Panel>
      )}

      {/* ── SUCCESS ── */}
      {stage === "success" && (
        <Panel>
          {/* Animated check with SVG tick */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              background: C.green.ring,
              animation: "cmPulse 2s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.green.grad}, ${C.green.solid})`,
              boxShadow: `0 8px 24px -4px ${C.green.ring}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "cmPopIn .5s cubic-bezier(.34,1.56,.64,1) both",
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path
                  d="M8 18 L15 25 L28 11"
                  stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="50" strokeDashoffset="50"
                  style={{ animation: "cmCheckDraw .4s .3s ease forwards" }}
                />
              </svg>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title color={C.green.text} delay="0.1s">Submitted Successfully!</Title>
            <Caption delay="0.18s">Your incident has been saved and notifications dispatched.</Caption>
          </div>

          {/* Status chip */}
          <div style={{
            background: C.green.light,
            border: `1px solid ${C.green.ring}`,
            borderRadius: 20,
            padding: "7px 18px",
            fontSize: 12, fontWeight: 600,
            color: C.green.text,
            display: "flex", alignItems: "center", gap: 7,
            animation: "cmFloatUp .35s .28s ease both", opacity: 0,
          }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} />
            Incident saved · Email sent
          </div>

          <Caption delay="0.36s" style={{ marginTop: -4 }}>Redirecting you back in a moment…</Caption>
        </Panel>
      )}

    </Modal>
  );
};

export default ConfirmSubmitModal;
