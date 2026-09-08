"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { writeupToHtml } from "@/lib/writeup";

type Props = {
  projectId: string;
  initialHtml: string;
  onChange: (html: string) => void;
};

const COLORS = [
  { label: "Navy", value: "#1A2B4A" },
  { label: "Red", value: "#CC2131" },
  { label: "Blue", value: "#2B55A2" },
  { label: "Gold", value: "#D8B059" },
  { label: "Black", value: "#111827" },
  { label: "Grey", value: "#6B7280" },
];

const HIGHLIGHTS = [
  { label: "Gold", value: "#F6E3A1" },
  { label: "Blue", value: "#D7E4F8" },
  { label: "Green", value: "#DCEFCE" },
  { label: "Pink", value: "#F8D4D8" },
];

export function WriteupEditor({ projectId, initialHtml, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const uploadImage = useCallback(async (file: File, current: Editor) => {
      setError("");
      setBusy(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`/api/projects/${projectId}/images`, { method: "POST", body: form });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          setError(data.error || "Could not insert that image.");
          return;
        }
        editorRef.current = current;
        current.chain().focus().setImage({ src: data.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
      } catch {
        setError("Could not insert that image.");
      } finally {
        setBusy(false);
      }
    },
    [projectId],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TextStyleKit.configure({
        fontFamily: false,
        lineHeight: false,
        backgroundColor: false,
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "writeup-image" },
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      Placeholder.configure({
        placeholder:
          "Write a professional brief: context, problem, approach, evidence, and next steps. Use headings, lists, tables, and images.",
      }),
    ],
    content: writeupToHtml(initialHtml),
    onCreate: ({ editor: current }) => {
      editorRef.current = current;
    },
    editorProps: {
      attributes: {
        class: "writeup-prose",
        "aria-label": "Project write-up",
      },
      handlePaste: (_view, event) => {
        const current = editorRef.current;
        const files = [
          ...Array.from(event.clipboardData?.files || []),
          ...Array.from(event.clipboardData?.items || [])
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file)),
        ];
        const image = files.find((file) => file.type.startsWith("image/"));
        if (!image || !current) return false;
        event.preventDefault();
        void uploadImage(image, current);
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const current = editorRef.current;
        const image = Array.from(event.dataTransfer?.files || []).find((file) => file.type.startsWith("image/"));
        if (!image || !current) return false;
        event.preventDefault();
        void uploadImage(image, current);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  function applyLink() {
    if (!editor) return;
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const withProtocol = /^(https?:|mailto:|\/)/i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: withProtocol }).run();
    }
    setLinkOpen(false);
  }

  if (!editor) {
    return <div className="min-h-72 rounded-xl border border-be-mist bg-be-frost/60" />;
  }

  const inTable = editor.isActive("table");

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-be-mist focus-within:border-be-red focus-within:ring-4 focus-within:ring-be-red/15">
      <div className="flex flex-wrap items-center gap-1 border-b border-be-ice bg-be-frost/80 px-2 py-2">
        <ToolButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          Undo
        </ToolButton>
        <ToolButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          Redo
        </ToolButton>
        <Divider />
        <select
          className="h-8 rounded-lg border border-be-mist bg-white px-2 text-xs font-semibold text-be-navy"
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
                ? "h2"
                : editor.isActive("heading", { level: 3 })
                  ? "h3"
                  : "p"
          }
          onChange={(event) => {
            const value = event.target.value;
            if (value === "p") editor.chain().focus().setParagraph().run();
            if (value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select
          className="h-8 rounded-lg border border-be-mist bg-white px-2 text-xs font-semibold text-be-navy"
          value={editor.getAttributes("textStyle").fontSize || ""}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(value).run();
          }}
        >
          <option value="">Body size</option>
          <option value="13px">Small</option>
          <option value="16px">Normal</option>
          <option value="18px">Large</option>
          <option value="22px">Title</option>
        </select>
        <Divider />
        <ToolButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-extrabold">B</span>
        </ToolButton>
        <ToolButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolButton>
        <ToolButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolButton>
        <ToolButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolButton>
        <label className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-be-navy/80" title="Text colour">
          Colour
          <input
            type="color"
            className="h-5 w-5 cursor-pointer rounded border border-be-mist bg-white"
            value={editor.getAttributes("textStyle").color || "#1A2B4A"}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
        </label>
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            onClick={() => editor.chain().focus().setColor(color.value).run()}
            className="h-5 w-5 rounded-full border border-black/10"
            style={{ background: color.value }}
          />
        ))}
        <ToolButton title="Clear colour" onClick={() => editor.chain().focus().unsetColor().run()}>
          Aa
        </ToolButton>
        <Divider />
        {HIGHLIGHTS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={`Highlight ${color.label}`}
            onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
            className={`h-5 w-5 rounded-sm border ${editor.isActive("highlight", { color: color.value }) ? "border-be-navy" : "border-black/10"}`}
            style={{ background: color.value }}
          />
        ))}
        <Divider />
        <ToolButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          Left
        </ToolButton>
        <ToolButton
          title="Align centre"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          Centre
        </ToolButton>
        <ToolButton
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          Right
        </ToolButton>
        <ToolButton
          title="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          Justify
        </ToolButton>
        <Divider />
        <ToolButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolButton>
        <ToolButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolButton>
        <ToolButton title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Quote
        </ToolButton>
        <ToolButton title="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          Line
        </ToolButton>
        <Divider />
        <ToolButton
          title="Insert or edit link"
          active={editor.isActive("link")}
          onClick={() => {
            setLinkValue(editor.getAttributes("link").href || "");
            setLinkOpen((open) => !open);
          }}
        >
          Link
        </ToolButton>
        <ToolButton title="Insert image" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : "Image"}
        </ToolButton>
        <ToolButton title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          Table
        </ToolButton>
        {inTable ? (
          <>
            <ToolButton title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
              + Row
            </ToolButton>
            <ToolButton title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              + Col
            </ToolButton>
            <ToolButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              Del table
            </ToolButton>
          </>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file, editor);
            event.target.value = "";
          }}
        />
      </div>

      {linkOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-be-ice bg-white px-3 py-2">
          <input
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https:// or paste a URL"
            className="min-w-56 flex-1 rounded-lg border border-be-mist px-3 py-1.5 text-sm outline-none focus:border-be-red"
          />
          <button type="button" onClick={applyLink} className="rounded-lg bg-be-navy px-3 py-1.5 text-xs font-semibold text-white">
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-be-red"
          >
            Remove
          </button>
        </div>
      ) : null}

      {error ? <p className="border-b border-be-red/20 bg-be-red/5 px-3 py-2 text-sm text-be-red">{error}</p> : null}

      <EditorContent editor={editor} />
      <p className="border-t border-be-ice bg-be-frost/50 px-3 py-2 text-[11px] text-be-navy/55">
        Drag an image in, paste a screenshot, or use Image. Changes autosave with the rest of the write-up.
      </p>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-5 w-px bg-be-mist sm:block" />;
}

function ToolButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 rounded-lg px-2 text-[11px] font-semibold disabled:opacity-50 ${
        active ? "bg-white text-be-red shadow-sm" : "text-be-navy/80 hover:bg-white hover:text-be-navy"
      }`}
    >
      {children}
    </button>
  );
}
