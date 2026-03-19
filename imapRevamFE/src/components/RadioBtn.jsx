import React from "react";

const RadioBtn = (props) => {
  const { data, radioHead, horizontal, inputProps, isDisabled } = props;
  const { value, onChange, error } = inputProps;

  return (
    <div className="imap-radio-field">
      {/* Label */}
      <label className="imap-field-label">
        {radioHead}
        <span className="imap-required">*</span>
      </label>

      {/* Pill options */}
      <div className={`imap-radio-group${horizontal === false ? " vertical" : ""}`}>
        {data.map((item, index) => {
          const disabled = isDisabled ? isDisabled(item) : false;
          const selected = value === item;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  onChange?.(item);
                }
              }}
              className={`imap-radio-pill${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
            >
              {selected && (
                <span className="imap-radio-check">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M1.5 5L4 7.5L8.5 2.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              {item}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && <p className="imap-radio-error">{error}</p>}
    </div>
  );
};

export default RadioBtn;
