import { Group, Stack, TextInput } from '@mantine/core'
import React from 'react'
import ActionBtn from './ActionBtn'

const InputBtn = (props) => {
    const { horizontalLayout, title, width, placeholder, isBtn, inputProps, onClick } = props
    const Layout = horizontalLayout ? Group : Stack

  return (
    <Layout w={width} gap={horizontalLayout ? "sm" : "xs"}>
      <label className="imap-field-label">
        {title.replace(/:\s*$/, '')}
        <span className="imap-required">*</span>
      </label>
      <TextInput
        classNames={{ input: "custom-input" }}
        placeholder={placeholder}
        size="md"
        styles={{
          input: {
            borderRadius: "10px",
            fontSize: "13px",
            fontFamily: "'Poppins', sans-serif",
          },
        }}
        {...inputProps}
      />
      {isBtn && (
        <ActionBtn
          btnText="Submit"
          fullWidth={false}
          onClick={onClick}
        />
      )}
    </Layout>
  )
}

export default InputBtn
