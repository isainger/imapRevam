import { Select, Stack, Title } from "@mantine/core";
import React from "react";

const DropdownBtn = (props) => {
  const { title, data,grouped = false , inputProps} = props;

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
      <Title order={5} ta="left">
        {title} <span style={{ color: "red" }}>* </span>
      </Title>
      <Select
      classNames={{ input: "custom-input" }}
        data={options}
        searchable
        autoSelectOnBlur
        nothingFoundMessage="No Options"
        comboboxProps={{ position: 'bottom', middlewares: { flip: false, shift: false }, offset: 0 }}
        {...inputProps}
      />
    </Stack>
  );
};

export default DropdownBtn;

