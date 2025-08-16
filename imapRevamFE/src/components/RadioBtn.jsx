import React from 'react'
import {Title, Stack, Radio, Group } from "@mantine/core";

const RadioBtn = (props) => {
    const {data, radioValue ,onChange, radioHead, horizontal} = props;
    const Wrapper = horizontal ? Group : Stack;
  return (
    <>
       <Stack gap="xs">
            <Title order={5} ta="left">{radioHead}:</Title>
            <Radio.Group
              value={radioValue}
              onChange={onChange}
              name={radioHead.replace(/\s+/g, '-').toLowerCase()}
              orientation="horizontal"
            >
              <Wrapper>
                {data.map((item, index) => (
                  <Radio key={index} value={item} label={item} color='#32035e'/>
                ))}
              </Wrapper>
            </Radio.Group>
          </Stack>
    </>
  )
}

export default RadioBtn
// UL4ZZHpiemYKMtI9