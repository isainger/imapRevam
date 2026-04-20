import React, { useState } from "react";
import { Stack, TagsInput, Text } from '@mantine/core';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MultiSelectEmails = (props) => {
  const { options, value, onChange, title, error } = props;
  const [rejected, setRejected] = useState([]);

  const groupedOptions = options.map((group) => ({
    group: group.group,
    items: group.emails.map((email) => ({
      value: email,
      label: email,
    })),
  }));

  const handleChange = (next) => {
    const seen = new Set();
    const accepted = [];
    const bad = [];
    for (const raw of next) {
      const tag = String(raw).trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (EMAIL_RE.test(tag)) {
        accepted.push(tag);
      } else {
        bad.push(tag);
      }
    }
    setRejected(bad);
    onChange(accepted);
  };

  return (
    <Stack gap={4} w="100%">
      <label className="imap-field-label">
        {title.replace(/:\s*$/, '')}
        <span className="imap-required">*</span>
      </label>
      <TagsInput
        data={groupedOptions}
        classNames={{
          input: "custom-input",
          pill: "imap-email-pill",
        }}
        value={value}
        onChange={handleChange}
        error={error || undefined}
        splitChars={[",", " ", ";"]}
        placeholder="Add or select emails"
        searchable
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
            lineHeight: 1.2,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 30,
            paddingTop: 4,
            paddingBottom: 4,
            paddingInline: 10,
          },
          inputField: {
            fontSize: "13px",
            minHeight: 30,
          },
        }}
      />
      {rejected.length > 0 && (
        <Text size="xs" c="red">
          Invalid email{rejected.length > 1 ? "s" : ""} ignored:{" "}
          {rejected.join(", ")}
        </Text>
      )}
    </Stack>
  );
};

export default MultiSelectEmails;
