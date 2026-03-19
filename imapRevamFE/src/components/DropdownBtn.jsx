import { Select, Stack } from "@mantine/core";
import React from "react";

const DropdownBtn = (props) => {
  const { title, data, grouped = false, inputProps } = props;

  const options = grouped
    ? data.flatMap((group) =>
        group.items.map((item) => ({
          label: item,
          value: item,
          group: group.group,
        }))
      )
    : data;

  return (
    <Stack gap="xs" w="100%">
      <label className="imap-field-label">
        {title.replace(/:\s*$/, '')}
        <span className="imap-required">*</span>
      </label>
      <Select
        classNames={{ input: "custom-input" }}
        data={options}
        searchable
        autoSelectOnBlur
        nothingFoundMessage="No Options"
        comboboxProps={{
          position: "bottom",
          middlewares: { flip: false, shift: false },
          offset: 0,
        }}
        styles={{
          input: {
            borderRadius: "10px",
            fontSize: "13px",
            fontFamily: "'Poppins', sans-serif",
          },
        }}
        {...inputProps}
      />
    </Stack>
  );
};

export default DropdownBtn;
