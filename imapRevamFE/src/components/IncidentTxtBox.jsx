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
import { improveWithAI } from "../services/incidentOperations";

const IncidentTxtBox = ({ inputProps, startingLine, context }) => {
  const { value, onChange, error, ...rest } = inputProps;
  const [version, setVersion] = useState(0);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: true, history: true }),
      Superscript,
      Subscript,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || `<p>${startingLine}</p>`,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });
  // ✅ Keep editor in sync when `value` changes externally
  useEffect(() => {
    if (!editor) return;

    const html = value || `<p>${startingLine}</p>`;

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

  const extractTextFromHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // const getAiInstruction = (context) => {
  //   switch (context) {
  //     case "incident_details":
  //       return "Rewrite clearly and professionally. Describe what happened, impact, and affected systems.";
  //     case "status_update":
  //       return "Rewrite as a short, clear status update with timeline awareness.";
  //     case "resolution":
  //       return "Rewrite confidently. Focus on final resolution and confirmation of fix.";
  //     case "workaround":
  //       return "Rewrite as clear step-by-step workaround instructions.";
  //     case "resolutionRca":
  //       return "Rewrite analytically. Explain cause and prevention.";
  //     default:
  //       return "Rewrite clearly and professionally.";
  //   }
  // };

  const handleImproveWithAI = async () => {
    try {
      setAiLoading(true);

      const improvedHtml = await improveWithAI({
        html: value || `<p>${startingLine}</p>`,
        context,
      });

      setAiSuggestion(improvedHtml);
      setAiOpen(true);
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    onChange?.(aiSuggestion); // ✅ already valid HTML
    setAiOpen(false);
  };

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
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}
        >
          <button
            type="button"
            onClick={handleImproveWithAI}
            style={{
              fontSize: "16px",
              color: "#2563eb",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              paddingRight: "1rem",
              paddingBottom: "0.5rem",
            }}
          >
            ✨ Improve with AI
          </button>
        </div>
        {aiOpen && (
          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: 12,
              margin: "8px",
              background: "#f9fafb",
            }}
          >
            <Text size="sm" fw={600} mb={6}>
              AI Suggested Improvement
            </Text>

            <div
              style={{
                fontSize: 16,
                color: "#111827",
                marginBottom: 10,
              }}
              dangerouslySetInnerHTML={{ __html: aiSuggestion }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={applyAiSuggestion}
                style={{
                  padding: "6px 12px",
                  background: "#2563eb",
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Apply
              </button>

              <button
                type="button"
                onClick={() => setAiOpen(false)}
                style={{
                  padding: "6px 12px",
                  background: "#e5e7eb",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
