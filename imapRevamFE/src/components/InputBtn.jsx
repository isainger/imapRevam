import { Group, Stack, TextInput, Title } from '@mantine/core'
import React from 'react'
import ActionBtn from './ActionBtn'

const InputBtn = (props) => {
    const {horizontalLayout,title, width, placeholder,isBtn,onChange,value} = props
    const Layout = horizontalLayout ? Group : Stack
  return (
    <Layout w={width}>
    <Title order={5} ta="left">{title}</Title>
    <TextInput
    classNames={{ input: "custom-input" }}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      size="md"
    />
    {isBtn &&
        <ActionBtn
  btnText="Submit"
  fullWidth={false}
/>
}
  </Layout>
  )
}

export default InputBtn
