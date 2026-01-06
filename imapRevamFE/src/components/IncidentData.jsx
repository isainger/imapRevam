import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

const IncidentData = ({ incidentData }) => {
  const [timeline, setTimeline] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const itemRefs = useRef([]);
  const hideTimeout = useRef(null); // <<< ADDED
  // console.log(incidentData);
  

  useEffect(() => {
    if (!incidentData || incidentData.length === 0) return;

    const rawRemaining = incidentData[0]?.remaining_status;

   const statusSequence =
  rawRemaining.length > 0
    ? rawRemaining.map((s) => s.statusName)
    : [incidentData[0].status];

    const finalList = statusSequence
      .map((status) => incidentData.find((i) => i.status === status))
      .filter(Boolean);

    setTimeline(finalList);
  }, [incidentData]);

  const showTooltip = (index) => {
    clearTimeout(hideTimeout.current); // <<< IMPORTANT

    const el = itemRefs.current[index];
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setCoords({
      top: rect.top + window.scrollY - 5,
      left: rect.right + window.scrollX + 20,
    });

    setActiveIndex(index);
  };

  const hideTooltip = () => {
    hideTimeout.current = setTimeout(() => {
      setActiveIndex(null);
    }, 100); // 1 second delay
  };

  return (
    <div className="text-sm font-semibold">

    <h1 className="text-lg font-extrabold mb-4">Current Incident Status</h1>
    <div className="relative flex flex-col items-start gap-10 mb-12 overflow-visible">
      <div className="absolute left-[12px] top-0 bottom-0 border-l-2 border-dotted border-slate-300"></div>

      {timeline.map((item, index) => {
        const isCompleted = index !== timeline.length - 1;
        const allEntries = incidentData.filter((entry) => entry.status === item.status);

        return (
          <div key={index} className="relative flex gap-4 justify-center items-center">

            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                ${isCompleted ? "bg-green-600" : "bg-blue-600 animate-pulse"}
              `}
            >
              {isCompleted ? <i className="fa-solid fa-check"></i> : index + 1}
            </div>

            <p
              ref={(el) => (itemRefs.current[index] = el)}
              className="font-semibold text-slate-800 cursor-pointer"
              onMouseEnter={() => showTooltip(index)}
              onMouseLeave={hideTooltip}
            >
              {item.status}
            </p>

            {activeIndex === index &&
              createPortal(
                <div
                  ref={(node) => {
                    if (node) {
                      const rect = node.getBoundingClientRect();
                      const overflowRight = rect.right > window.innerWidth;
                      const overflowBottom = rect.bottom > window.innerHeight;

                      if (overflowRight) {
                        node.style.left = rect.left - node.offsetWidth - 10 + "px";
                      }
                      if (overflowBottom) {
                        node.style.top = rect.top - node.offsetHeight - 10 + "px";
                      }
                    }
                  }}
                  style={{
                    position: "fixed",
                    top: coords.top - 5,
                    left: coords.left + 8,
                    width: 320,
                    maxHeight: 330,
                    background: "#f0f4f8",
                    border: "1px solid #d4d4d4",
                    padding: 12,
                    zIndex: 999999999,
                    borderRadius: 12,
                    overflowY: "auto",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={() => clearTimeout(hideTimeout.current)}
                  onMouseLeave={hideTooltip}
                >
                  <p className="font-semibold text-slate-900 mb-3">
                    All Updates for: {item.status}
                  </p>

                  <div className="flex flex-col gap-2">
                    {allEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "white",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "8px",
                        }}
                      >
                        <p style={{ fontSize: "11px", color: "#555" }}>
                          {entry.updated_at
                            ? `Updated: ${new Date(entry.updated_at).toLocaleString()}`
                            : `Created: ${new Date(entry.created_at).toLocaleString()}`}
                        </p>

                        <p style={{ fontWeight: "600", marginTop: 4 }}>
                          {entry.subject}
                        </p>

                        {entry.incident_details && (
                          <p style={{ marginTop: 4 }}>{entry.incident_details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
              )}
          </div>
        );
      })}
    </div>
    </div>
  );
};

export default React.memo(IncidentData);
