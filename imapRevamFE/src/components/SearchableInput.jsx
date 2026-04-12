import { Autocomplete, Stack } from "@mantine/core";
import React, { useState } from "react";

const SearchableInput = (props) => {
  const { title, width, placeholder, data, inputProps } = props;
  const [opened, setOpened] = useState(false);

  const options = data.map((item) => ({
    value: item.email,
    label: `${item.name} (${item.email})`,
  }));

  return (
    <Stack w={width} gap="xs">
      <label className="imap-field-label">
        {title.replace(/:\s*$/, '')}
        <span className="imap-required">*</span>
      </label>
      <Autocomplete
        classNames={{ input: "custom-input" }}
        placeholder={placeholder}
        data={options}
        size="md"
        dropdownOpened={opened && inputProps.value?.length > 0}
        onFocusCapture={() => setOpened(true)}
        onOptionSubmit={() => setOpened(false)}
        styles={{
          input: {
            borderRadius: "10px",
            fontSize: "13px",
            fontFamily: "'Poppins', sans-serif",
          },
          dropdown: {
            backgroundColor: "var(--imap-dropdown-bg)",
            border: "1px solid var(--imap-dropdown-border)",
            borderRadius: 10,
          },
          option: {
            color: "var(--imap-dropdown-option)",
          },
        }}
        {...inputProps}
      />
    </Stack>
  );
};

export default SearchableInput;
