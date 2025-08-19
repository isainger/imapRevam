import { Autocomplete, Stack, Title } from "@mantine/core";
import React, { useEffect, useState } from "react";

const SearchableInput = (props) => {
  const { title, width, placeholder, data, inputProps } = props;
  const [opened, setOpened] = useState(false);
  const options = data.map((item) => ({
    value: item.email,
    label: `${item.name} (${item.email})`, // optional, what user sees
  }));
  return (
    <Stack w={width}>
      <Title order={5} ta="left">
        {title} <span style={{ color: "red" }}>* </span>
      </Title>
      <Autocomplete
        classNames={{ input: "custom-input" }}
        placeholder={placeholder}
        data={options}
        size="md"
        dropdownOpened={opened && inputProps.value?.length > 0}
        onFocusCapture={() => setOpened(true)}
        onOptionSubmit={() => setOpened(false)}
        {...inputProps}
      />
    </Stack>
  );
};

export default SearchableInput;
