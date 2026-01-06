import React, { useEffect, useState } from "react";
import { Card, Stack, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import { Global } from "@mantine/styles";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";

const IncidentTxtBox = ({ inputProps, startingLine }) => {
  const { value, onChange, error, ...rest } = inputProps;
  const [version, setVersion] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: true, history: true }),
      Superscript,
      Subscript,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value ? `<p>${value}</p>` : `<p>${startingLine}</p>`,
    onUpdate: ({ editor }) => onChange?.(editor.getText()),
  });
  // ✅ Keep editor in sync when `value` changes externally
  useEffect(() => {
    if (!editor) return;

    const html = value ? `<p>${value}</p>` : `<p>${startingLine}</p>`;

    // Only set content if different AND editor is not focused
    if (editor.getHTML() !== html && !editor.isFocused) {
      editor.commands.setContent(html);
    }
  }, [value, editor, startingLine]);

  // Force rerender on editor state change to properly enable/disable Undo/Redo
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => setVersion((v) => v + 1);
    editor.on("update", updateHandler);
    editor.on("selectionUpdate", updateHandler);

    return () => {
      editor.off("update", updateHandler);
      editor.off("selectionUpdate", updateHandler);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      <Global
        styles={{
          ".mantine-RichTextEditor-content ul": {
            listStyleType: "disc",
            paddingLeft: "1.5rem",
          },
          ".mantine-RichTextEditor-content ol": {
            listStyleType: "decimal",
            paddingLeft: "1.5rem",
          },
          ".mantine-RichTextEditor-content li": {
            marginTop: "4px",
            marginBottom: "4px",
          },
        }}
      />

      <Card
        shadow="md"
        radius="md"
        withBorder
        w="100%"
        p={0}
        className="custom-input"
        style={{
          flexShrink: 0, // 🔥 prevents collapse
          minHeight: 220, // 🔥 guarantees editor space
        }}
      >
        <Stack>
          <RichTextEditor editor={editor} radius="md">
            <RichTextEditor.Toolbar bg="transparent">
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Undo />
                <RichTextEditor.Redo />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Bold />
                <RichTextEditor.Italic />
                <RichTextEditor.Underline />
                <RichTextEditor.Strikethrough />
                <RichTextEditor.ClearFormatting />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Blockquote />
                <RichTextEditor.CodeBlock />
                <RichTextEditor.Link />
                <RichTextEditor.Unlink />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
                <RichTextEditor.Subscript />
                <RichTextEditor.Superscript />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.AlignLeft />
                <RichTextEditor.AlignCenter />
                <RichTextEditor.AlignRight />
                <RichTextEditor.AlignJustify />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.ColorPicker
                  colors={[
                    "#25262b",
                    "#868e96",
                    "#fa5252",
                    "#e64980",
                    "#be4bdb",
                    "#7950f2",
                    "#4c6ef5",
                    "#228be6",
                    "#15aabf",
                    "#12b886",
                    "#40c057",
                    "#82c91e",
                    "#fab005",
                    "#fd7e14",
                  ]}
                />
              </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>

            <RichTextEditor.Content
              ta="left"
              bg="transparent"
              style={{
                minHeight: 200,
                height: "auto",
                overflowY: "auto",
              }}
            />
          </RichTextEditor>
        </Stack>
      </Card>
      {error && (
        <Text size="sm" c="red" mt="xs">
          {error}
        </Text>
      )}
    </>
  );
};

export default IncidentTxtBox;
