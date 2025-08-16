import React from "react";
import { DateTimePicker } from "@mantine/dates";
import { Box, Group, Text, Title } from "@mantine/core";

const DateTimeSelector = (props) => {
  const { label, value, onChange, utcValue, checkBox } = props;

  // ✅ Format UTC date string like: Tue 05 August 2025 at 18:30 (UTC)
  const formatUTCDate = (utcDateString) => {
    if (!utcDateString) return "";

    const utcDate = new Date(utcDateString);

    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(utcDate); // Tue

    const date = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(utcDate); // 05 August 2025

    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(utcDate); // 18:30

    return `${day} ${date} at ${time} (UTC)`;
  };

  return (
    <Group spacing="lg" w="100%" justify="space-between">
      <Title order={5} ta="left" w="24%">
        {label}
      </Title>
      <Box w="72%" display="flex" style={{ justifyContent: "space-evenly" }}>
        <DateTimePicker
         classNames={{input:"custom-input"}}
          placeholder="Pick date and time"
          value={value}
          onChange={onChange}
          radius="md"
          w="50%"
          size="md"
          clearable
          withSeconds
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
