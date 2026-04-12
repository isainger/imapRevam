import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* ── Animated counter ── */
const AnimatedNumber = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span>{display}</span>;
};

/* ── Single stat card ── */
const StatCard = ({ icon, label, value, accent, glowColor, pulse }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-5 px-7 py-5 rounded-2xl transition-all duration-300 cursor-default select-none flex-1 min-w-[180px]"
      style={{
        background: hovered
          ? "rgba(255,255,255,0.14)"
          : "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 12px 32px ${glowColor || "rgba(0,86,240,0.3)"}`
          : "0 2px 10px rgba(0,0,0,0.2)",
      }}
    >
      {/* Icon badge */}
      <div
        className="relative flex items-center justify-center w-14 h-14 rounded-xl transition-transform duration-300"
        style={{
          background: `linear-gradient(135deg, ${accent}40, ${accent}20)`,
          border: `1px solid ${accent}55`,
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
      >
        <i className={`${icon} text-xl`} style={{ color: accent }} />
        {pulse && (
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full"
            style={{ background: accent }}
          >
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: accent, opacity: 0.5 }}
            />
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider text-white/45 font-semibold leading-none mb-2">
          {label}
        </span>
        <span
          className="text-4xl font-extrabold leading-none transition-colors duration-300"
          style={{ color: accent }}
        >
          <AnimatedNumber value={value} />
        </span>
      </div>
    </div>
  );
};

/* ── Ongoing‐incidents tooltip (portal) ── */
const OngoingTooltip = ({ incidents, anchorRef }) => {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ bottom: window.innerHeight - rect.top + 12, left: rect.left });
  }, [incidents]);

  if (!pos || !incidents.length) return null;

  return createPortal(
    <div
      className="fixed z-[9999] w-80 rounded-xl shadow-2xl border border-white/10 overflow-hidden"
      style={{
        bottom: pos.bottom,
        left: pos.left,
        background: "linear-gradient(135deg, #002852 0%, #003f7f 100%)",
      }}
    >
      <div className="px-4 py-3 border-b border-white/10">
        <span className="text-xs uppercase tracking-wider text-white/50 font-semibold">
          Active Incidents
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {incidents.map((inc, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {inc.incident_number || "N/A"}
              </p>
              <p className="text-xs text-white/40 truncate">
                {inc.incident_subject|| "No title"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};

/* ── Main component ── */
const StatsOverview = ({ incidents }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const ongoingRef = useRef(null);

  // Deduplicate by incident_number
  const latestIncidentsMap = incidents.reduce((acc, inc) => {
    const key = inc.incident_number;
    if (!key) return acc;
  
    const existing = acc[key];
  
    // Decide "latest" using timestamp
    const currentTime = new Date(inc.created_at ||  inc.updated_at ||  0).getTime();
    const existingTime = existing
      ? new Date(existing.created_at || existing.updated_at || 0).getTime()
      : 0;
  
    if (!existing || currentTime > existingTime) {
      acc[key] = inc;
    }
  
    return acc;
  }, {});
  
  const unique = Object.values(latestIncidentsMap);

  const normalizeStatus = (status) => {
    
    if (!status) return "ignore";
  
    const s = status.toLowerCase().trim();
    
    if (["resolved", "resolved with rca"].includes(s)) return "resolved";
    if (["ongoing", "suspected"].includes(s)) return "ongoing";
    if (s === "not an issue") return "ignore";
  
    return "ignore";
  };
  
  // classify
  const classified = unique.map((i) => ({
    ...i,
    normalizedStatus: normalizeStatus(i.incident_status),
  }));
  
  // remove ignored ones
  const validIncidents = classified.filter(
    (i) => i.normalizedStatus !== "ignore"
  );
  
  // split
  const ongoing = validIncidents.filter(
    (i) => i.normalizedStatus === "ongoing"
  );
  
  const resolved = validIncidents.filter(
    (i) => i.normalizedStatus === "resolved"
  );
  
  // final count
  const total = validIncidents.length;

  return (
    <div
      className="rounded-2xl px-5 py-4 transition-all duration-500"
      style={{
        background: "linear-gradient(135deg, #001e3d 0%, #002852 50%, #003052 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow:
          "0 -6px 40px rgba(0,40,82,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-5">
        {/* Brand mark */}
        <div className="flex items-center gap-3 pl-2 shrink-0">
          <div
            className="w-2 h-12 rounded-full"
            style={{
              background: "linear-gradient(180deg, #0056f0, #00f0d2)",
            }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-semibold">
              Live
            </span>
            <span className="text-sm uppercase tracking-[0.15em] text-white/60 font-bold">
              Stats
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-14 bg-white/10 shrink-0" />

        {/* Cards row */}
        <div className="flex items-center gap-4 flex-1">
          <StatCard
            icon="fa-solid fa-layer-group"
            label="Total Incidents"
            value={total}
            accent="#0056f0"
            glowColor="rgba(0,86,240,0.25)"
          />

          <div
            ref={ongoingRef}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="flex-1"
          >
            <StatCard
              icon="fa-solid fa-bolt"
              label="Ongoing"
              value={ongoing.length}
              accent="#f59e0b"
              glowColor="rgba(245,158,11,0.25)"
              pulse
            />
          </div>

          <StatCard
            icon="fa-solid fa-circle-check"
            label="Resolved"
            value={resolved.length}
            accent="#00f0d2"
            glowColor="rgba(0,240,210,0.25)"
          />
        </div>
      </div>

      {/* Tooltip portal */}
      {showTooltip && ongoing.length > 0 && (
        <OngoingTooltip incidents={ongoing} anchorRef={ongoingRef} />
      )}
    </div>
  );
};

export default StatsOverview;