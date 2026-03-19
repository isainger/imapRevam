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

  useEffect(() => {
    if (!editor) return;

    const html = value || `<p>${startingLine}</p>`;

    if (editor.getHTML() !== html && !editor.isFocused) {
      editor.commands.setContent(html);
    }
  }, [value, editor, startingLine]);

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
    onChange?.(aiSuggestion);
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
        shadow="sm"
        radius="md"
        withBorder
        w="100%"
        p={0}
        className="custom-input"
        style={{
          flexShrink: 0,
          minHeight: 220,
          border: "1.5px solid #e2e8f0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Top bar: AI button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "8px 12px 4px",
            borderBottom: "1px solid #f1f5f9",
            background: "#fafbfc",
          }}
        >
          <button
            type="button"
            onClick={handleImproveWithAI}
            className={`imap-ai-btn${aiLoading ? " imap-ai-btn-loading" : ""}`}
          >
            {aiLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "11px" }} />
                <span>Improving…</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: "13px" }}>✨</span>
                <span>Improve with AI</span>
              </>
            )}
          </button>
        </div>

        {/* AI suggestion panel */}
        {aiOpen && (
          <div
            style={{
              border: "1px solid #e0e7ff",
              borderRadius: "8px",
              padding: "12px",
              margin: "10px",
              background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
            }}
          >
            <Text size="sm" fw={600} mb={6} c="#4f46e5">
              ✨ AI Suggested Improvement
            </Text>

            <div
              style={{
                fontSize: 13,
                color: "#111827",
                marginBottom: 12,
                lineHeight: 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: aiSuggestion }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={applyAiSuggestion}
                style={{
                  padding: "6px 14px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "white",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                }}
              >
                Apply
              </button>

              <button
                type="button"
                onClick={() => setAiOpen(false)}
                style={{
                  padding: "6px 14px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <Stack>
          <RichTextEditor editor={editor} radius="md">
            <RichTextEditor.Toolbar bg="transparent" style={{ borderBottom: "1px solid #f1f5f9" }}>
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
        <Text size="sm" c="red" mt="xs" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {error}
        </Text>
      )}
    </>
  );
};

export default IncidentTxtBox;
