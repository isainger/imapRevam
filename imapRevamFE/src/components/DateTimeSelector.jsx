import React, { useEffect, useState } from "react";
import { DateTimePicker } from "@mantine/dates";
import { Box, Group, Text, Title } from "@mantine/core";

const DateTimeSelector = (props) => {
  const { label, value, onChange, utcValue, checkBox, inputProps } = props;
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // ✅ Format UTC nicely
  const formatUTCDate = (utcDateString) => {
    if (!utcDateString) return "";

    const utcDate = new Date(utcDateString);

    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(utcDate);

    const date = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(utcDate);

    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(utcDate);

    return `${day} ${date} at ${time} (UTC)`;
  };

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

    // ✅ Always commit both date + time when user changes (don’t block 00:00)
    onChange?.(newDate);
  };

  return (
    <Group spacing="lg" w="100%" justify="space-between">
      <Title order={5} ta="left" w="24%">
        {label} <span style={{ color: "red" }}>* </span>
      </Title>
      <Box w="72%" display="flex" style={{ justifyContent: "space-evenly" }}>
        <DateTimePicker
          classNames={{ input: "custom-input" }}
          placeholder="Pick date and time"
          value={tempValue}
          onChange={handleTempChange}
          radius="md"
          w="50%"
          size="md"
          clearable
          withSeconds={false}
          error={inputProps?.error}
        />
        <Box display="flex" style={{ alignItems: "center" }} w="40%">
          {utcValue && <Text size="sm">{formatUTCDate(utcValue)}</Text>}
        </Box>
      </Box>
      {checkBox}
    </Group>
  );
};

export default DateTimeSelector;
