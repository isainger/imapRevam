import { Group, Stack, TextInput, Title } from '@mantine/core'
import React from 'react'
import ActionBtn from './ActionBtn'

const InputBtn = (props) => {
    const {horizontalLayout,title, width, placeholder,isBtn, inputProps, onClick} = props
    const Layout = horizontalLayout ? Group : Stack
  return (
    <Layout w={width}>
    <Title order={5} ta="left">{title} <span style={{ color: "red" }}>* </span></Title>
    <TextInput
    classNames={{ input: "custom-input" }}
      placeholder={placeholder}
      size="md"
      {...inputProps}
    />
    {isBtn &&
        <ActionBtn
  btnText="Submit"
  fullWidth={false}
  onClick={onClick}
/>
}
  </Layout>
  )
}

export default InputBtn
