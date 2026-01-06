import { useEffect, useState } from "react";

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

      <div className="text-sm text-slate-600 font-medium">
        {label}
      </div>
    </div>
  );
};

const StatsOverview = ({ incidents }) => {  
  
  const resolvedStatuses = ["Resolved", "Resolved with RCA"];

const totalIncidents = new Set(
  incidents
    .map(i => i.incident_number)
    .filter(Boolean)
).size;

  const totalResolved = incidents.filter(i =>
    resolvedStatuses.includes(i.status)
  ).length;

  const totalOngoing = incidents.filter(
  i => i.status === "Ongoing"
).length;

  const totalFormsFilled = incidents.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10 w-full max-w-6xl mx-auto">
      <StatCard
        label="Total Incidents"
        value={totalIncidents}
        color="#6366f1"
        icon={<i className="fa-solid fa-database" />}
      />

      <StatCard
        label="Ongoing Incidents"
        value={totalOngoing}
        color="#ef4444"
        icon={<i className="fa-solid fa-circle-notch" />}
      />

      <StatCard
        label="Resolved Incidents"
        value={totalResolved}
        color="#22c55e"
        icon={<i className="fa-solid fa-circle-check" />}
      />

      <StatCard
        label="Forms Submitted"
        value={totalFormsFilled}
        color="#3b82f6"
        icon={<i className="fa-solid fa-pen-to-square" />}
      />
    </div>
  );
};

export default StatsOverview;
