import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}

type TextCase = "upper" | "lower" | "title" | "sentence";

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "'Times New Roman', serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];

const SIZE_OPTIONS = ["12px", "14px", "16px", "18px", "24px", "32px"];
const SPACING_OPTIONS = ["1", "1.15", "1.5", "2"];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write here...",
  minHeightClass = "min-h-[140px]",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [fontColor, setFontColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#fff59d");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showFormattingPanel, setShowFormattingPanel] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const toolbarButtonClass = useMemo(
    () => "px-2 py-1 text-xs rounded border border-transparent hover:bg-muted hover:border-border",
    [],
  );

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    savedRange.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRange.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  };

  const syncValue = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
    restoreSelection();
  };

  const runCommand = (command: string, arg?: string) => {
    focusEditor();
    document.execCommand(command, false, arg);
    saveSelection();
    syncValue();
  };

  const insertHtml = (html: string) => {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    saveSelection();
    syncValue();
  };

  const runWithMouseDown = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    handler();
  };

  const applyFontSize = (size: string) => {
    focusEditor();
    document.execCommand("fontSize", false, "7");
    const root = editorRef.current;
    if (root) {
      const fonts = root.querySelectorAll('font[size="7"]');
      fonts.forEach((fontEl) => {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.innerHTML = fontEl.innerHTML;
        fontEl.replaceWith(span);
      });
    }
    saveSelection();
    syncValue();
  };

  const applyLineSpacing = (lineHeight: string) => {
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const anchor = selection.getRangeAt(0).startContainer;
    let el = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement;
    while (el && el !== editorRef.current) {
      const tag = el.tagName?.toLowerCase();
      if (["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(tag)) {
        el.style.lineHeight = lineHeight;
        break;
      }
      el = el.parentElement;
    }
    if (el === editorRef.current && editorRef.current) {
      editorRef.current.style.lineHeight = lineHeight;
    }
    saveSelection();
    syncValue();
  };

  const transformCase = (mode: TextCase) => {
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text) return;

    let next = text;
    if (mode === "upper") next = text.toUpperCase();
    if (mode === "lower") next = text.toLowerCase();
    if (mode === "title") {
      next = text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (mode === "sentence") {
      const trimmed = text.toLowerCase();
      next = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    document.execCommand("insertText", false, next);
    saveSelection();
    syncValue();
  };

  const handleInsertTable = () => {
    const rowsRaw = window.prompt("Rows", "3");
    const colsRaw = window.prompt("Columns", "3");
    const rows = Math.max(1, Math.min(10, Number(rowsRaw || 3)));
    const cols = Math.max(1, Math.min(10, Number(colsRaw || 3)));
    if (Number.isNaN(rows) || Number.isNaN(cols)) return;
    const tbody = Array.from({ length: rows })
      .map(
        () =>
          `<tr>${Array.from({ length: cols })
            .map(() => "<td style='border:1px solid #d1d5db;padding:6px;min-width:80px;'>&nbsp;</td>")
            .join("")}</tr>`,
      )
      .join("");
    insertHtml(`<table style="border-collapse:collapse;width:100%;margin:10px 0;"><tbody>${tbody}</tbody></table><p></p>`);
  };

  const handleInsertFigure = () => {
    const imageUrl = window.prompt("Figure image URL");
    if (!imageUrl) return;
    const caption = window.prompt("Figure caption", "") || "";
    insertHtml(
      `<figure style="margin:12px 0;"><img src="${imageUrl}" alt="${caption || "Figure"}" style="max-width:100%;height:auto;border-radius:8px;" />${
        caption ? `<figcaption style="font-size:12px;color:#6b7280;margin-top:6px;">${caption}</figcaption>` : ""
      }</figure><p></p>`,
    );
  };

  const handleInsertLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    const text = window.getSelection()?.toString() || window.prompt("Link text", "Open link") || "Open link";
    insertHtml(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
  };

  const handlePickImage = () => {
    saveSelection();
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      insertHtml(`<img src="${data.url}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;" />`);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border border-input rounded-lg bg-background overflow-hidden">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,.svg"
        className="hidden"
        onChange={(e) => void handleImageUpload(e)}
      />
      <div className="p-2 border-b border-border bg-muted/40 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onMouseDown={runWithMouseDown(() => setShowFormattingPanel((prev) => !prev))}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted"
          >
            Formatting
            {showFormattingPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
        <select
          className="h-7 px-2 text-xs rounded border border-border bg-background"
          defaultValue={FONT_OPTIONS[0].value}
          onChange={(e) => runCommand("fontName", e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          className="h-7 px-2 text-xs rounded border border-border bg-background"
          defaultValue="14px"
          onChange={(e) => applyFontSize(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <button type="button" title="Bold" aria-label="Bold" onMouseDown={runWithMouseDown(() => runCommand("bold"))} className={toolbarButtonClass}>
          <b>B</b>
        </button>
        <button type="button" title="Italic" aria-label="Italic" onMouseDown={runWithMouseDown(() => runCommand("italic"))} className={toolbarButtonClass}>
          <i>/</i>
        </button>
        <button type="button" title="Underline" aria-label="Underline" onMouseDown={runWithMouseDown(() => runCommand("underline"))} className={toolbarButtonClass}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <button
          type="button"
          title="Strikethrough"
          aria-label="Strikethrough"
          onMouseDown={runWithMouseDown(() => runCommand("strikeThrough"))}
          className={toolbarButtonClass}
        >
          <span style={{ textDecoration: "line-through" }}>abc</span>
        </button>
        <button
          type="button"
          title="Subscript"
          aria-label="Subscript"
          onMouseDown={runWithMouseDown(() => runCommand("subscript"))}
          className={toolbarButtonClass}
        >
          x₂
        </button>
        <button
          type="button"
          title="Superscript"
          aria-label="Superscript"
          onMouseDown={runWithMouseDown(() => runCommand("superscript"))}
          className={toolbarButtonClass}
        >
          x²
        </button>
        <button
          type="button"
          title="Bulleted List"
          aria-label="Bulleted List"
          onMouseDown={runWithMouseDown(() => runCommand("insertUnorderedList"))}
          className={toolbarButtonClass}
        >
          •
        </button>
        <button
          type="button"
          title="Numbered List"
          aria-label="Numbered List"
          onMouseDown={runWithMouseDown(() => runCommand("insertOrderedList"))}
          className={toolbarButtonClass}
        >
          1.
        </button>
        </div>

        {showFormattingPanel && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              title="Heading 2"
              aria-label="Heading 2"
              onMouseDown={runWithMouseDown(() => runCommand("formatBlock", "<h2>"))}
              className={toolbarButtonClass}
            >
              H2
            </button>
            <button
              type="button"
              title="Paragraph"
              aria-label="Paragraph"
              onMouseDown={runWithMouseDown(() => runCommand("formatBlock", "<p>"))}
              className={toolbarButtonClass}
            >
              P
            </button>
            <button type="button" title="Indent" aria-label="Indent" onMouseDown={runWithMouseDown(() => runCommand("indent"))} className={toolbarButtonClass}>
              ⇥
            </button>
            <button type="button" title="Outdent" aria-label="Outdent" onMouseDown={runWithMouseDown(() => runCommand("outdent"))} className={toolbarButtonClass}>
              ⇤
            </button>

            <button
              type="button"
              title="Align Left"
              aria-label="Align Left"
              onMouseDown={runWithMouseDown(() => runCommand("justifyLeft"))}
              className={toolbarButtonClass}
            >
              ≡L
            </button>
            <button
              type="button"
              title="Align Center"
              aria-label="Align Center"
              onMouseDown={runWithMouseDown(() => runCommand("justifyCenter"))}
              className={toolbarButtonClass}
            >
              ≡C
            </button>
            <button
              type="button"
              title="Align Right"
              aria-label="Align Right"
              onMouseDown={runWithMouseDown(() => runCommand("justifyRight"))}
              className={toolbarButtonClass}
            >
              ≡R
            </button>

            <label className="flex items-center gap-1 text-xs px-2">
              A
              <input
                type="color"
                value={fontColor}
                className="h-6 w-6 p-0 border-0 bg-transparent cursor-pointer"
                onChange={(e) => {
                  setFontColor(e.target.value);
                  runCommand("foreColor", e.target.value);
                }}
              />
            </label>
            <label className="flex items-center gap-1 text-xs px-2">
              Bg
              <input
                type="color"
                value={highlightColor}
                className="h-6 w-6 p-0 border-0 bg-transparent cursor-pointer"
                onChange={(e) => {
                  setHighlightColor(e.target.value);
                  runCommand("hiliteColor", e.target.value);
                }}
              />
            </label>

            <select
              className="h-7 px-2 text-xs rounded border border-border bg-background"
              defaultValue="1.15"
              onChange={(e) => applyLineSpacing(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {SPACING_OPTIONS.map((space) => (
                <option key={space} value={space}>
                  Space {space}
                </option>
              ))}
            </select>

            <button type="button" title="Uppercase" aria-label="Uppercase" onMouseDown={runWithMouseDown(() => transformCase("upper"))} className={toolbarButtonClass}>
              UPPER
            </button>
            <button type="button" title="Lowercase" aria-label="Lowercase" onMouseDown={runWithMouseDown(() => transformCase("lower"))} className={toolbarButtonClass}>
              lower
            </button>
            <button type="button" title="Title Case" aria-label="Title Case" onMouseDown={runWithMouseDown(() => transformCase("title"))} className={toolbarButtonClass}>
              Title
            </button>
            <button
              type="button"
              title="Horizontal Rule"
              aria-label="Horizontal Rule"
              onMouseDown={runWithMouseDown(() => runCommand("insertHorizontalRule"))}
              className={toolbarButtonClass}
            >
              HR
            </button>
            <button type="button" title="Insert Table" aria-label="Insert Table" onMouseDown={runWithMouseDown(handleInsertTable)} className={toolbarButtonClass}>
              Tbl
            </button>
            <button type="button" title="Insert Figure" aria-label="Insert Figure" onMouseDown={runWithMouseDown(handleInsertFigure)} className={toolbarButtonClass}>
              Fig
            </button>
            <button type="button" title="Insert Link" aria-label="Insert Link" onMouseDown={runWithMouseDown(handleInsertLink)} className={toolbarButtonClass}>
              Link
            </button>
            <button type="button" title="Insert Image" aria-label="Insert Image" onMouseDown={runWithMouseDown(handlePickImage)} className={toolbarButtonClass}>
              {isUploadingImage ? "..." : "Img"}
            </button>
            <button
              type="button"
              title="Clear Formatting"
              aria-label="Clear Formatting"
              onMouseDown={runWithMouseDown(() => runCommand("removeFormat"))}
              className={toolbarButtonClass}
            >
              Clr
            </button>
          </div>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        className={`p-3 text-sm outline-none ${minHeightClass}`}
        data-placeholder={placeholder}
        onInput={syncValue}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default RichTextEditor;
