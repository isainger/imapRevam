import { Check, Users, Megaphone, FileText } from "lucide-react";
import React from "react";

const DepartmentCard = ({ title, active, onClick, disabled }) => {
  const getIcon = () => {
    switch (initials) {
      case "GE":
        return <Users className="w-10 h-10" strokeWidth={1.5} />;
      case "AD":
        return <Megaphone className="w-10 h-10" strokeWidth={1.5} />;
      case "PU":
        return <FileText className="w-10 h-10" strokeWidth={1.5} />;
      default:
        return <Users className="w-10 h-10" strokeWidth={1.5} />;
    }
  };

  const getColor = () => {
    switch (initials) {
      case "GE":
        return "#7bcdff"; // Light Blue
      case "AD":
        return "#bb61ff"; // Purple
      case "PU":
        return "#00f0d2"; // Turquoise
      default:
        return "#7bcdff";
    }
  };

  const initials =
    title.split(" ").length === 1
      ? title.slice(0, 2).toUpperCase()
      : title
          .split(" ")
          .map((word) => word[0])
          .join("")
          .toUpperCase();

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={!disabled ? onClick : undefined}
        className={`
                  group relative
        rounded-2xl p-12
        border-2 transition-all duration-300
        active:scale-[0.97]
                  ${
                    active
                      ? "bg-white border-[#0056f0] shadow-lg"
                      : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                  }
                  ${disabled && !active ? "opacity-50 cursor-not-allowed grayscale" : ""}
                `}
      >
        {/* Icon */}
        <div
          className="mb-6 transition-colors duration-300 flex items-center justify-center"
          style={{ color: active ? "#0056f0" : getColor() }}
        >
          {getIcon()}
        </div>

        {/* Content */}
        <div
          className={`text-lg font-semibold mb-2 transition-colors duration-300 ${active ? "text-[#002852]" : "text-[#002852]"}`}
        >
          {title}
        </div>

        <div
          className="text-md font-medium mb-4 transition-colors duration-300"
          style={{ color: active ? "#0056f0" : getColor() }}
        >
          {initials}
        </div>

        <p className="text-lg text-gray-600 leading-relaxed line-clamp-2">
          {initials === "GE" && "Handle general support and inquiries"}
          {initials === "AD" && "Manage advertiser-related incidents"}
          {initials === "PU" && "Address publisher support requests"}
        </p>

        {/* Checkmark */}
        {active && (
          <div className="absolute top-6 right-6">
            <div className="w-6 h-6 rounded-full bg-[#0056f0] flex items-center justify-center shadow-lg">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </div>
        )}

        {/* Accent bar on bottom */}
        {active && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
            style={{ backgroundColor: "#0056f0" }}
          />
        )}
      </button>

      {/* Label below (kept from your logic) */}
      <p className="text-md font-semibold text-slate-700 text-center mt-2">
        {title}
      </p>

      {/* Disabled message */}
      {disabled && !active && (
        <p className="text-xs text-slate-400 text-center">
          Department change locked
        </p>
      )}
    </div>
  );
};

export default DepartmentCard;
