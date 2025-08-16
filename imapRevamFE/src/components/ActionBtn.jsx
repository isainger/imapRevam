import { Box, Button } from "@mantine/core";
import React from "react";

const ActionBtn = (props) => {
  const { btnText, mt, boxWidth, onClick, btnFont, btnStyle, btnHeight } = props;
  return (
    <Button
    className="btnStyle"
      onClick={onClick}
      w={boxWidth}
      mt={mt}
      style={btnStyle}
      h={btnHeight}
      leftSection={<Box className="material-symbols-outlined">{btnFont}</Box>}
    >
      {btnText}
    </Button>
  );
};

export default ActionBtn;
