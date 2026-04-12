import React, { useEffect, useRef } from "react";
import { Modal, useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";

/** Clipboard API needs https or localhost; fallback works more places. */
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

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
    @keyframes cmCountPulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.18) } }
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

const Halo = ({ color, pulse, size = 72, children }) => {
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: false });
  const light = scheme === "light";
  return (
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
    animation: `cmFloatUp .3s ${delay} ease both`,
    animationFillMode: "both",
  }}>
    {children}
  </div>
);

const Caption = ({ children, delay = "0.14s" }) => (
  <div style={{
    fontSize: 13, color: "var(--imap-text-primary)", textAlign: "center",
    lineHeight: 1.65, maxWidth: 260, margin: "0 auto",
    animation: `cmFloatUp .3s ${delay} ease both`,
    animationFillMode: "both",
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
    padding: "9px 26px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    transition: "transform .15s, box-shadow .15s",
    outline: "none", letterSpacing: "0.15px",
    opacity: disabled ? 0.55 : 1,
  };
  return primary
    ? <button
        style={{
          ...base,
          background: `linear-gradient(135deg, ${color.solid}, ${color.grad})`,
          color: "#fff", border: "none",
          boxShadow: `0 4px 14px -2px ${color.ring}`,
        }}
        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 7px 20px -2px ${color.ring}`; }}}
        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=`0 4px 14px -2px ${color.ring}`; }}
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
        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background="var(--imap-glass-1)"; e.currentTarget.style.borderColor="var(--imap-brand)"; }}}
        onMouseLeave={e => { e.currentTarget.style.background="var(--imap-glass-08)"; e.currentTarget.style.borderColor="var(--imap-border-strong)"; }}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
      >{label}</button>;
};

/* ── Dual-ring spinner (reused in fetching + sf-creating) ── */
const DualRingSpinner = ({ color, icon, size = 68 }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
      <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke={color.ring} strokeWidth="4" />
    </svg>
    <svg width={size} height={size} style={{ position: "absolute", inset: 0, animation: "cmSpin .75s linear infinite" }}>
      <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke={color.solid}
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray="44 132" />
    </svg>
    <div style={{
      position: "absolute", inset: 14, borderRadius: "50%",
      background: `${color.solid}26`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={icon} style={{ color: color.solid, fontSize: 16 }} />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════ */

const ConfirmSubmitModal = ({
  opened, stage, submitProgress, purpose,
  onCancel, onConfirm,
  /* SF props */
  sfCaseMode,
  sfCaseUrl,
  sfCountdown,
  sfError,
  onSfSubmitNow,
  onSfSubmitAnyway,
}) => {
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: false });
  const lightUi = scheme === "light";
  const isExit = purpose === "exit";
  const isSwitchFlow = purpose === "switchFlow";
  const isDiscardPrompt = isExit || isSwitchFlow;

  const copyBtnRef = useRef(null);

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
          background: "var(--imap-modal-surface)",
          color: "var(--imap-form-text)",
          boxShadow:
            "0 28px 64px -8px rgba(0,0,0,.22), 0 0 0 1px var(--imap-glass-line)",
          overflow: "hidden",
        },
      }}
    >

      {/* ── FETCHING ── */}
      {stage === "fetching" && (
        <Panel>
          <DualRingSpinner color={C.blue} icon="fa-solid fa-database" />
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
            <Title color="#f87171">Something Went Wrong</Title>
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
            <Title color="#fdba74">Incident Not Found</Title>
            <Caption>No incident exists with this ID or link. Please double-check and try again.</Caption>
          </div>
          <Btn label="Try Again" onClick={onCancel} primary color={C.orange} />
        </Panel>
      )}

      {/* ── SUBMITTING ── */}
      {stage === "submitting" && (
        <Panel>
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
              fontSize: 15, fontWeight: 700, color: "var(--imap-brand)",
            }}>
              {submitProgress ?? 0}%
            </div>
          </div>

          <div style={{ width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--imap-text-bright)", marginBottom: 12 }}>
              Submitting Incident
            </div>
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
            <div style={{ fontSize: 11, color: "var(--imap-text-muted)", marginTop: 8, letterSpacing: "0.5px" }}>
              Do not close this window
            </div>
          </div>
        </Panel>
      )}

      {/* ── CONFIRM ── */}
      {stage === "confirm" && (
        <Panel>
          <Halo color={isDiscardPrompt ? C.orange : C.blue} pulse={!isDiscardPrompt} size={72}>
            <i
              className={
                isExit
                  ? "fa-solid fa-arrow-right-from-bracket"
                  : isSwitchFlow
                    ? "fa-solid fa-shuffle"
                    : "fa-solid fa-paper-plane"
              }
              style={{
                color: isDiscardPrompt ? C.orange.solid : C.blue.solid,
                fontSize: 20,
              }}
            />
          </Halo>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title>
              {isExit
                ? "Unsaved Changes"
                : isSwitchFlow
                  ? "Switch workflow?"
                  : "Ready to Submit?"}
            </Title>
            <Caption>
              {isExit
                ? "You have unsaved changes that will be lost if you leave now. Are you sure?"
                : isSwitchFlow
                  ? "Your current draft or loaded incident will be discarded. Continue?"
                  : sfCaseMode
                    ? "A Salesforce case will be created automatically, then the incident will be submitted. Please confirm all details are correct."
                    : "Please confirm all details are correct before submitting the incident."}
            </Caption>
          </div>

          {/* SF badge when auto-create is on */}
          {sfCaseMode && !isDiscardPrompt && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: lightUi ? "rgba(22,163,74,0.1)" : "rgba(74,222,128,0.1)",
              border: lightUi ? "1px solid rgba(22,163,74,0.35)" : "1px solid rgba(74,222,128,0.3)",
              borderRadius: 20, padding: "5px 14px",
              fontSize: 12, fontWeight: 600,
              color: lightUi ? C.green.text : "#4ade80",
              animation: "cmFloatUp .3s .18s ease both",
            }}>
              <i className="fa-solid fa-cloud" style={{ fontSize: 11 }} />
              Salesforce case will be created first
            </div>
          )}

          <Hr />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn label="Cancel" onClick={onCancel} />
            <Btn
              label={isDiscardPrompt ? "Yes, discard" : "Submit"}
              onClick={onConfirm}
              primary
              color={isDiscardPrompt ? C.orange : C.blue}
            />
          </div>
        </Panel>
      )}

      {/* ── SF CREATING ── */}
      {stage === "sf-creating" && (
        <Panel>
          <DualRingSpinner color={C.green} icon="fa-solid fa-cloud" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title>Creating Salesforce Case</Title>
            <Caption>Connecting to Salesforce — this may take a moment…</Caption>
          </div>
        </Panel>
      )}

      {/* ── SF SUCCESS ── */}
      {stage === "sf-success" && (
        <Panel>
          {/* Green halo */}
          <div style={{ position: "relative", width: 68, height: 68 }}>
            <div style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              background: C.green.ring,
              animation: "cmPulse 2.2s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.green.grad}, ${C.green.solid})`,
              boxShadow: `0 8px 24px -4px ${C.green.ring}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "cmPopIn .45s cubic-bezier(.34,1.56,.64,1) both",
            }}>
              <i className="fa-solid fa-circle-check" style={{ color: "#fff", fontSize: 28 }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Title color={lightUi ? C.green.text : "#4ade80"} delay="0.1s">
              Salesforce Case Created!
            </Title>
            <Caption delay="0.16s">Copy the case link below, then submit the incident.</Caption>
          </div>

          {/* Case URL row */}
          {sfCaseUrl && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--imap-glass-08)",
              border: "1px solid var(--imap-border-strong)",
              borderRadius: 8, padding: "8px 12px",
              width: "100%", boxSizing: "border-box",
              animation: "cmFloatUp .3s .22s ease both",
            }}>
              <a
                href={sfCaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, fontSize: 12, fontWeight: 600,
                  color: "var(--imap-brand)",
                  textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title={sfCaseUrl}
              >
                {sfCaseUrl.match(/\/Case\/([^/]+)\//)?.[1] ?? sfCaseUrl}
              </a>
              <button
                ref={copyBtnRef}
                type="button"
                title="Copy link"
                onClick={async () => {
                  const ok = await copyToClipboard(sfCaseUrl);
                  if (ok) {
                    notifications.show({
                      title: "Copied",
                      message: "Salesforce case link is on your clipboard.",
                      color: "teal",
                    });
                    if (copyBtnRef.current) {
                      copyBtnRef.current.style.color = C.green.solid;
                      setTimeout(() => {
                        if (copyBtnRef.current) copyBtnRef.current.style.color = "";
                      }, 1200);
                    }
                  } else {
                    notifications.show({
                      title: "Could not copy",
                      message:
                        "Use a secure URL (https) or select the link and copy manually (Ctrl/Cmd+C).",
                      color: "orange",
                    });
                  }
                }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--imap-text-primary)", padding: "3px 5px",
                  borderRadius: 4, flexShrink: 0,
                  transition: "color .2s",
                }}
              >
                <i className="fa-solid fa-copy" style={{ fontSize: 14 }} />
              </button>
            </div>
          )}

          {/* Countdown */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: "var(--imap-text-primary)",
            animation: "cmFloatUp .3s .28s ease both",
          }}>
            <span>Submitting in</span>
            <span style={{
              fontWeight: 800, fontSize: 20, color: "var(--imap-brand)",
              minWidth: 24, textAlign: "center",
              animation: sfCountdown > 0 ? "cmCountPulse .9s ease-in-out infinite" : "none",
            }}>
              {sfCountdown}
            </span>
            <span>s…</span>
          </div>

          <Btn label="Submit Now" onClick={onSfSubmitNow} primary color={C.blue} />
        </Panel>
      )}

      {/* ── SF ERROR ── */}
      {stage === "sf-error" && (
        <Panel>
          <Halo color={C.red} pulse size={72}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: C.red.solid, fontSize: 22 }} />
          </Halo>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Title color="#f87171">Case Creation Failed</Title>
            <Caption>
              {sfError
                ? sfError.length > 90 ? sfError.slice(0, 87) + "…" : sfError
                : "Could not create the Salesforce case."}
            </Caption>
          </div>

          <Hr />

          <div style={{
            display: "flex", flexDirection: "column", gap: 8,
            width: "100%", alignItems: "center",
          }}>
            {/* Retry */}
            <Btn label="↺  Retry Case Creation" onClick={onConfirm} primary color={C.blue} />

            {/* Open SF manually */}
            <button
              type="button"
              onClick={() => window.open("https://taboola.lightning.force.com/lightning/o/Case/new", "_blank")}
              style={{
                fontFamily: F, fontSize: 13, fontWeight: 600,
                padding: "9px 26px", borderRadius: 8, cursor: "pointer",
                background: "var(--imap-glass-08)",
                color: "var(--imap-form-text)",
                border: "1.5px solid var(--imap-border-strong)",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11 }} />
              Open Salesforce Manually
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              style={{
                fontFamily: F, fontSize: 12, fontWeight: 500,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--imap-text-muted)",
                padding: "4px 8px",
              }}
            >
              Cancel
            </button>
          </div>
        </Panel>
      )}

      {/* ── SUCCESS ── */}
      {stage === "success" && (
        <Panel>
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
            <Title color="var(--imap-accent-green-fg)" delay="0.1s">Submitted Successfully!</Title>
            <Caption delay="0.18s">Your incident has been saved and notifications dispatched.</Caption>
          </div>

          <div style={{
            background: lightUi ? "rgba(22, 163, 74, 0.14)" : "rgba(52,211,153,0.12)",
            border: lightUi
              ? "1px solid rgba(22, 163, 74, 0.4)"
              : "1px solid rgba(52,211,153,0.35)",
            borderRadius: 20,
            padding: "7px 18px",
            fontSize: 12, fontWeight: 600,
            color: lightUi ? C.green.text : "#6ee7b7",
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
