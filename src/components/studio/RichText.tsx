/**
 * Rich text for stories and long descriptions (TipTap), on the studio's
 * field style. The toolbar is plain labelled buttons with aria-pressed; a
 * link is typed into a labelled field, never a browser prompt. Images go
 * through the media library, so they get their variants like any other.
 */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { ACCEPT, uploadToLibrary, variantUrl } from "@/lib/media-upload";
import { FormAlert } from "./kit";
import { errorText } from "./format";

type Tool = {
  label: string;
  active: (e: Editor) => boolean;
  run: (e: Editor) => void;
};

const TOOLS: Tool[] = [
  {
    label: "Bold",
    active: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    label: "Italic",
    active: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    label: "Heading",
    active: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Subheading",
    active: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "List",
    active: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered",
    active: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Quote",
    active: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
];

export function RichText({
  label,
  value,
  onChange,
  lang,
  hint,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  lang?: string;
  hint?: string;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, rerender] = useState(0);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image, Link.configure({ openOnClick: false })],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rt-body prose",
        "aria-labelledby": `${id}-label`,
        ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
        "aria-multiline": "true",
        role: "textbox",
        ...(lang ? { lang } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: () => rerender((n) => n + 1),
  });

  // Follow a value replaced from outside (another item opened).
  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  async function insertImage(file: File | undefined) {
    if (!file || !editor) return;
    setError(null);
    try {
      const row = await uploadToLibrary(file);
      editor
        .chain()
        .focus()
        .setImage({ src: variantUrl(row, 960), alt: row.alt ?? "" })
        .run();
    } catch (e) {
      setError(errorText(e, "The image didn't upload. Try again."));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyLink() {
    if (!editor) return;
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else if (/^(https:\/\/|\/|mailto:)/.test(url)) chain.setLink({ href: url }).run();
    else return setError("Links start with https://, / or mailto:.");
    setError(null);
    setLinking(false);
  }

  return (
    <div className="field rt" lang={lang}>
      <p className="field-label" id={`${id}-label`}>
        {label}
      </p>
      <div className="rt-frame">
        <div className="rt-tools" role="group" aria-label={`${label} formatting`}>
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className="rt-tool"
              aria-pressed={editor ? tool.active(editor) : false}
              onClick={() => editor && tool.run(editor)}
            >
              {tool.label}
            </button>
          ))}
          <button
            type="button"
            className="rt-tool"
            aria-pressed={editor?.isActive("link") ?? false}
            aria-expanded={linking}
            onClick={() => {
              setHref((editor?.getAttributes("link").href as string | undefined) ?? "");
              setLinking((v) => !v);
            }}
          >
            Link
          </button>
          <button type="button" className="rt-tool" onClick={() => fileRef.current?.click()}>
            Image
          </button>
          <span className="rt-sep" aria-hidden="true" />
          <button
            type="button"
            className="icon-btn"
            aria-label="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Icon name="redo" />
          </button>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept={ACCEPT.image}
            onChange={(e) => insertImage(e.target.files?.[0])}
          />
        </div>
        {linking && (
          <div className="rt-link">
            <label htmlFor={`${id}-href`}>Link address</label>
            <input
              id={`${id}-href`}
              type="url"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
            <button className="btn btn-quiet btn-sm" type="button" onClick={applyLink}>
              {href.trim() ? "Apply" : "Remove link"}
            </button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
