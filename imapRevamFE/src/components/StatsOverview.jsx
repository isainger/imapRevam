import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AnimatedNumber = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!value || value <= 0) {
      setDisplay(0);
      return;
    }
    let start = 0;
    const stepTime = Math.max(Math.floor(duration / value), 20);

    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);

      if (start >= value) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
};

const StatCard = ({ label, value, color, icon }) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center gap-2 transition hover:shadow-lg"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="text-2xl text-slate-500">{icon}</div>

      <div className="text-4xl font-bold text-slate-900">
        <AnimatedNumber value={value} />
      </div>

      <div className="text-sm text-slate-600 font-medium">{label}</div>
    </div>
  );
};

const StatsOverview = ({ incidents }) => {
  const [showOngoingTooltip, setShowOngoingTooltip] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ongoingRef = useRef(null);
  let hideTimeout = useRef(null);

  const resolvedStatuses = ["Resolved", "Resolved with RCA"];
  const ongoingStatuses = ["Ongoing", "Suspected"];

  const incidentsMap = {};

  const showOngoing = () => {
    clearTimeout(hideTimeout.current);

    const rect = ongoingRef.current.getBoundingClientRect();

    setCoords({
      top: rect.top + window.scrollY - 12, // slightly above card
      left: rect.left + window.scrollX + rect.width / 2, // center
    });

    setShowOngoingTooltip(true);
  };

  const hideOngoing = () => {
    hideTimeout.current = setTimeout(() => {
      setShowOngoingTooltip(false);
    }, 100);
  };

  incidents.forEach(({ incident_number, status, subject }) => {
    if (!incidentsMap[incident_number]) {
      incidentsMap[incident_number] = {
        subject,
        hasOngoing: false,
        hasResolved: false,
      };
    }

    if (resolvedStatuses.includes(status)) {
      incidentsMap[incident_number].hasResolved = true;
    }
    if (ongoingStatuses.includes(status)) {
      incidentsMap[incident_number].hasOngoing = true;
    }
  });

  const totalIncidents = Object.keys(incidentsMap).length;

  let ongoingCounter = 0;
  let resolvedCounter = 0;

  Object.values(incidentsMap).forEach(({ hasOngoing, hasResolved }) => {
    if (hasResolved) resolvedCounter++;
    else if (hasOngoing) ongoingCounter++;
  });

  const openIncidentSubjects = Object.values(incidentsMap)
    .filter((i) => i.hasOngoing && !i.hasResolved)
    .map((i) => i.subject);

  // const totalFormsFilled = incidents.length;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 w-full max-w-6xl mx-auto">
      <StatCard
        label="Total Incidents"
        value={totalIncidents}
        color="#6366f1"
        icon={<i className="fa-solid fa-database" />}
      />

      <div
        ref={ongoingRef}
        className="inline-block"
        onMouseEnter={showOngoing}
        onMouseLeave={hideOngoing}
      >
        <StatCard
          label="Ongoing Incidents"
          value={ongoingCounter}
          color="#ef4444"
          icon={<i className="fa-solid fa-circle-notch" />}
        />
      </div>

      <StatCard
        label="Resolved Incidents"
        value={resolvedCounter}
        color="#22c55e"
        icon={<i className="fa-solid fa-circle-check" />}
      />

      {showOngoingTooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)", // ← KEY LINE
              width: 300,
              maxHeight: 280,
              background: "#f0f4f8",
              border: "1px solid #d4d4d4",
              padding: 12,
              zIndex: 9999999, // higher
              borderRadius: 12,
              overflowY: "auto",
              boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
              pointerEvents: "auto",
            }}
            onMouseEnter={() => clearTimeout(hideTimeout.current)}
            onMouseLeave={hideOngoing}
          >
            <p className="font-semibold text-slate-900 mb-3">Open Incidents</p>

            <div className="flex flex-col gap-2">
              {openIncidentSubjects.length === 0 ? (
                <p className="text-sm text-slate-500">No open incidents</p>
              ) : (
                openIncidentSubjects.map((subject, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-300 rounded-lg p-2 text-sm font-medium text-black"
                  >
                    {subject}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}

      {/* <StatCard
        label="Forms Submitted"
        value={totalFormsFilled}
        color="#3b82f6"
        icon={<i className="fa-solid fa-pen-to-square" />}
      /> */}
    </div>
  );
};

export default StatsOverview;
