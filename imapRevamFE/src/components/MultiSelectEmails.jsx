import { MultiSelect, Stack, Title } from '@mantine/core';
import React from 'react'

const MultiSelectEmails = (props) => {
    const {options,value,onChange, title} = props;
   

  return (
     <Stack gap="xs" w="100%">
          <Title order={5} ta="left">
            {title}
          </Title>
          <MultiSelect
          data={options}
          classNames={{ input: "custom-input" }}
          value={value}
          onChange={onChange}
          placeholder="Add or select emails"
          searchable
          comboboxProps={{ position: 'bottom', middlewares: { flip: false, shift: false }, offset: 0 }}
          />
          </Stack>
  )
}

export default MultiSelectEmails
