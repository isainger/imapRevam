import React from "react";

const DEPT_META = {
  Advertiser: {
    code: "AD",
    icon: "fa-bullhorn",
    desc: "Manage advertiser-related incidents and campaign-impacting issues.",
  },
  General: {
    code: "GE",
    icon: "fa-user-tie",
    desc: "Handle general support, cross-team coordination, and internal tooling.",
  },
  Publisher: {
    code: "PU",
    icon: "fa-newspaper",
    desc: "Address publisher network incidents and inventory or feed issues.",
  },
};

/** design-mockup-form-v2.html — .f-dept-card-light */
const DepartmentCard = ({ title, active, onClick, disabled }) => {
  const meta = DEPT_META[title] || {
    code: title.slice(0, 2).toUpperCase(),
    icon: "fa-layer-group",
    desc: "",
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={!disabled ? onClick : undefined}
        disabled={disabled}
        className={`f-dept-card-light${active ? " active" : ""}${disabled && !active ? " opacity-50 grayscale" : ""}`}
      >
        <span className="f-dept-check" aria-hidden>
          <i className="fa-solid fa-check" />
        </span>
        <span className="f-dept-code">{meta.code}</span>
        <div className="f-dept-card-icon-lg">
          <i className={`fa-solid ${meta.icon}`} />
        </div>
        <div className="f-dept-name-lg">{title}</div>
        {meta.desc ? (
          <div className="f-dept-desc-lg">{meta.desc}</div>
        ) : null}
      </button>

      {disabled && !active ? (
        <p className="mt-2 text-center text-xs text-slate-500">
          Department change locked
        </p>
      ) : null}
    </div>
  );
};

export default DepartmentCard;
