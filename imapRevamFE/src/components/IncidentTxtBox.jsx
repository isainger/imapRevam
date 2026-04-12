import React, { useEffect, useState } from "react";
import { Card, Stack, Text, useComputedColorScheme } from "@mantine/core";
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

const IncidentTxtBox = ({
  inputProps,
  startingLine,
  context,
  surface = "auto",
}) => {
  const colorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: false,
  });
  const dark =
    surface === "light"
      ? false
      : surface === "dark"
        ? true
        : colorScheme === "dark";
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
          ...(dark
            ? {
                ".imap-rte-surface-dark .mantine-RichTextEditor-content .ProseMirror":
                  {
                    color: "#e2e8f0",
                  },
                ".imap-rte-surface-dark .mantine-RichTextEditor-control": {
                  color: "#e2e8f0 !important",
                  backgroundColor: "rgba(255,255,255,0.1) !important",
                  border: "1px solid rgba(255,255,255,0.14) !important",
                },
                ".imap-rte-surface-dark .mantine-RichTextEditor-control:hover": {
                  backgroundColor: "rgba(255,255,255,0.16) !important",
                },
                ".imap-rte-surface-dark .mantine-RichTextEditor-control[data-active]":
                  {
                    backgroundColor: "rgba(0,102,255,0.25) !important",
                    borderColor: "rgba(0,102,255,0.45) !important",
                  },
                ".imap-rte-surface-dark .mantine-RichTextEditor-control svg": {
                  color: "inherit !important",
                },
              }
            : {
                ".imap-rte-surface-light .mantine-RichTextEditor-content .ProseMirror":
                  {
                    color: "#1e293b",
                  },
                ".imap-rte-surface-light .mantine-RichTextEditor-control": {
                  color: "#0f172a !important",
                  backgroundColor: "#ffffff !important",
                  border: "1px solid #cbd5e1 !important",
                },
                ".imap-rte-surface-light .mantine-RichTextEditor-control:hover": {
                  backgroundColor: "#f1f5f9 !important",
                  borderColor: "#94a3b8 !important",
                },
                ".imap-rte-surface-light .mantine-RichTextEditor-control svg": {
                  color: "inherit !important",
                },
              }),
        }}
      />

      <Card
        shadow="sm"
        radius="md"
        withBorder
        w="100%"
        p={0}
        className={`custom-input${dark ? " imap-rte-surface-dark" : " imap-rte-surface-light"}`}
        style={{
          flexShrink: 0,
          minHeight: 220,
          border: dark
            ? "1px solid rgba(255,255,255,0.1)"
            : "1.5px solid #e2e8f0",
          borderRadius: "12px",
          overflow: "hidden",
          background: dark ? "rgba(255,255,255,0.03)" : undefined,
        }}
      >
        {/* Top bar: AI button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "8px 12px 4px",
            borderBottom: dark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid #f1f5f9",
            background: dark ? "rgba(15,23,42,0.6)" : "#fafbfc",
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
              border: dark
                ? "1px solid rgba(129,140,248,0.35)"
                : "1px solid #e0e7ff",
              borderRadius: "8px",
              padding: "12px",
              margin: "10px",
              background: dark
                ? "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.12) 100%)"
                : "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
            }}
          >
            <Text size="sm" fw={600} mb={6} c={dark ? "#a5b4fc" : "#4f46e5"}>
              ✨ AI Suggested Improvement
            </Text>

            <div
              style={{
                fontSize: 13,
                color: dark ? "#e2e8f0" : "#111827",
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
                  background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                  color: dark ? "#cbd5e1" : "#64748b",
                  borderRadius: "8px",
                  border: dark
                    ? "1px solid rgba(255,255,255,0.12)"
                    : "1px solid #e2e8f0",
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
          <RichTextEditor
            editor={editor}
            radius="md"
            styles={{
              toolbar: {
                backgroundColor: dark
                  ? "rgba(15,23,42,0.95)"
                  : "var(--imap-form-overlay-bg)",
                borderBottom: dark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid var(--imap-glass-line)",
              },
              control: dark
                ? {
                    color: "#e2e8f0",
                    backgroundColor: "transparent",
                    border: "none",
                  }
                : {
                    color: "#0f172a",
                    backgroundColor: "transparent",
                    border: "none",
                  },
            }}
          >
            <RichTextEditor.Toolbar
              bg={
                dark ? "rgba(15,23,42,0.95)" : "var(--imap-form-overlay-bg)"
              }
              style={{
                borderBottom: dark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid var(--imap-glass-line)",
              }}
            >
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
                backgroundColor: dark ? "rgba(7,15,26,0.5)" : undefined,
                color: dark ? "#e2e8f0" : undefined,
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
