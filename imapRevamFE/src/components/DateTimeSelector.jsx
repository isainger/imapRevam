import React, { useEffect, useState } from "react";
import { DateTimePicker } from "@mantine/dates";
import { Box, Group, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { formatDate } from "../utils/formatDate";

const DateTimeSelector = (props) => {
  const { label, value, onChange, utcValue, checkBox, inputProps } = props;
  const [tempValue, setTempValue] = useState(value);

  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleTempChange = (newValue) => {
    if (!newValue) {
      setTempValue(null);
      onChange?.(null);
      return;
    }

    const newDate =
      typeof newValue === "string" ? new Date(newValue) : newValue;

    if (!(newDate instanceof Date) || isNaN(newDate)) return;

    setTempValue(newDate);
    onChange?.(newDate);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Label */}
      <label className="imap-field-label" style={{ marginBottom: "7px" }}>
        {label.replace(/\s*\(UTC\)\s*:?\s*$/, "").replace(/:\s*$/, "")}
        {" "}
        <span
          style={{
            fontSize: "10px",
            fontWeight: 500,
            textTransform: "none",
            letterSpacing: 0,
            color: "var(--imap-utc-label)",
          }}
        >
          (UTC)
        </span>
        <span className="imap-required">*</span>
      </label>

      {/* Picker row */}
      <Group
        spacing="lg"
        w="100%"
        justify="space-between"
        direction={isMobile ? "column" : "row"}
        align={isMobile ? "flex-start" : "center"}
      >
        <Box
          w={isMobile ? "100%" : "100%"}
          display="flex"
          style={{
            flexDirection: isMobile ? "column" : "row",
            justifyContent: isMobile ? "flex-start" : "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "10px" : "16px",
          }}
        >
          <DateTimePicker
            classNames={{ input: "custom-input" }}
            placeholder="Pick date and time"
            value={tempValue}
            onChange={handleTempChange}
            radius="md"
            w={isMobile ? "100%" : "52%"}
            size="md"
            clearable
            withSeconds={false}
            error={inputProps?.error}
            styles={{
              input: {
                borderRadius: "10px",
                fontSize: "13px",
                fontFamily: "'Poppins', sans-serif",
              },
            }}
          />

          {utcValue && (
            <Box
              display="flex"
              style={{
                alignItems: "center",
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--imap-utc-chip-bg)",
                  border: "1.5px solid var(--imap-utc-chip-border)",
                  borderRadius: "10px",
                  padding: "8px 14px",
                }}
              >
                <i
                  className="fa-regular fa-clock"
                  style={{
                    color: "var(--imap-utc-chip-icon)",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                />
                <Text
                  size="sm"
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    lineHeight: 1.4,
                    color: "var(--imap-utc-label)",
                    fontWeight: 500,
                    fontSize: "13px",
                  }}
                >
                  {formatDate(utcValue)}
                </Text>
              </div>
            </Box>
          )}
        </Box>

        {checkBox}
      </Group>
    </div>
  );
};

export default DateTimeSelector;
