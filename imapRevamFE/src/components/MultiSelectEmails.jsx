import {Stack, TagsInput, Title } from '@mantine/core';

const MultiSelectEmails = (props) => {
    const {options,value,onChange, title} = props;
    const groupedOptions = options.map((group) => ({
    group: group.group,
    items: group.emails.map((email) => ({
      value: email,
      label: email,
    })),
  }));
  return (
     <Stack gap="xs" w="100%">
          <Title order={5} ta="left">
            {title} <span style={{ color: "red" }}>* </span>
          </Title>
          <TagsInput
          data={groupedOptions}
          classNames={{ input: "custom-input" }}
          value={value}
          onChange={onChange}
          placeholder="Add or select emails"
          searchable="true"
          comboboxProps={{ position: 'bottom', middlewares: { flip: false, shift: false }, offset: 0 }}
          />
          </Stack>
  )
}

export default MultiSelectEmails
