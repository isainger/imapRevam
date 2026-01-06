import React, { useEffect, useState } from "react";
import { DateTimePicker } from "@mantine/dates";
import { Box, Group, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { formatDate } from "../utils/formatDate";

const DateTimeSelector = (props) => {
  const { label, value, onChange, utcValue, checkBox, inputProps } = props;
  const [tempValue, setTempValue] = useState(value);

  // Detect mobile
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
    <Group
      spacing="lg"
      w="100%"
      justify="space-between"
      direction={isMobile ? "column" : "row"}
      align={isMobile ? "flex-start" : "center"}
    >
      {/* Label */}
      <Title
        order={5}
        ta="left"
        w={isMobile ? "100%" : "24%"}
      >
        {label} <span style={{ color: "red" }}>*</span>
      </Title>

      {/* Date + UTC Section */}
      <Box
        w={isMobile ? "100%" : "72%"}
        display="flex"
        style={{
          flexDirection: isMobile ? "column" : "row",
          justifyContent: isMobile ? "flex-start" : "space-evenly",
          gap: isMobile ? "12px" : "0",
        }}
      >
        <DateTimePicker
          classNames={{ input: "custom-input" }}
          placeholder="Pick date and time"
          value={tempValue}
          onChange={handleTempChange}
          radius="md"
          w={isMobile ? "100%" : "50%"}
          size="md"
          clearable
          withSeconds={false}
          error={inputProps?.error}
        />

        <Box
          display="flex"
          style={{
            alignItems: isMobile ? "flex-start" : "center",
          }}
          w={isMobile ? "100%" : "40%"}
        >
          {utcValue && (
            <Text size="sm">
              {formatDate(utcValue)}
            </Text>
          )}
        </Box>
      </Box>

      {checkBox}
    </Group>
  );
};

export default DateTimeSelector;
