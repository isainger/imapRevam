import React from "react";
import { Title, Stack, Radio, Group } from "@mantine/core";

const RadioBtn = (props) => {
  const { data, radioHead, horizontal, inputProps, isDisabled } = props;
  const Wrapper = horizontal ? Group : Stack;

  return (
    <>
      <Stack gap="xs">
        <Title order={5} ta="left">
          {radioHead}: <span style={{ color: "red" }}>* </span>
        </Title>
        <Radio.Group
          name={radioHead.replace(/\s+/g, "-").toLowerCase()}
          orientation="horizontal"
          {...inputProps}
        >
          <Wrapper>
            {data.map((item, index) => (
              <Radio
                key={index}
                value={item}
                label={item}
                color="#155dfc"
                disabled={isDisabled ? isDisabled(item) : false} // ✅ Here!
              />
            ))}
          </Wrapper>
        </Radio.Group>
      </Stack>
    </>
  );
};

export default RadioBtn;
// UL4ZZHpiemYKMtI9
