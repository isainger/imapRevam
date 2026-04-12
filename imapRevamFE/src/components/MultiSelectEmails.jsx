import React from "react";
import { Stack, TagsInput } from '@mantine/core';

const MultiSelectEmails = (props) => {
  const { options, value, onChange, title } = props;

  const groupedOptions = options.map((group) => ({
    group: group.group,
    items: group.emails.map((email) => ({
      value: email,
      label: email,
    })),
  }));

  return (
    <Stack gap="xs" w="100%">
      <label className="imap-field-label">
        {title.replace(/:\s*$/, '')}
        <span className="imap-required">*</span>
      </label>
      <TagsInput
        data={groupedOptions}
        classNames={{ input: "custom-input" }}
        value={value}
        onChange={onChange}
        placeholder="Add or select emails"
        searchable="true"
        comboboxProps={{
          position: "bottom",
          middlewares: { flip: false, shift: false },
          offset: 0,
        }}
        styles={{
          dropdown: {
            backgroundColor: "var(--imap-dropdown-bg)",
            border: "1px solid var(--imap-dropdown-border)",
            borderRadius: 10,
          },
          option: {
            color: "var(--imap-dropdown-option)",
          },
          input: {
            borderRadius: "10px",
            fontSize: "13px",
            fontFamily: "'Poppins', sans-serif",
            minHeight: 52,
            padding: "8px 10px",
            alignItems: "center",
          },
          pillsList: {
            gap: 8,
            rowGap: 8,
            alignItems: "center",
          },
          pill: {
            fontSize: "13px",
            lineHeight: 1.35,
            minHeight: 32,
            paddingInline: 12,
          },
          inputField: {
            fontSize: "13px",
            minHeight: 30,
          },
        }}
      />
    </Stack>
  );
};

export default MultiSelectEmails;
