import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { uploadMedia } from "@/lib/media";

export function RichEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  folder = "blog",
  minHeight = 320,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  folder?: string;
  minHeight?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: "rounded-2xl my-4" } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline decoration-burgundy underline-offset-4" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-plum max-w-none focus:outline-none px-6 py-5 min-h-[--min-h] [--min-h:20rem]",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === "" ? "empty" : "set"]);

  if (!editor) return null;

  const btn =
    "grid h-9 w-9 place-items-center rounded-full border border-transparent text-plum/70 hover:border-plum/15 hover:bg-plum/5 hover:text-plum";
  const active = "border-plum/20 bg-plum/8 text-plum";

  async function uploadImage(f: File) {
    const url = await uploadMedia(f, folder);
    editor?.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div
      className="rounded-3xl border border-plum/15 bg-ivory soft-shadow"
      style={{ ["--min-h" as string]: `${minHeight}px` }}
    >
      <div className="flex items-center gap-1 overflow-x-auto rounded-t-3xl border-b border-plum/10 bg-bone/40 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
        <button
          type="button"
          className={`${btn} ${editor.isActive("bold") ? active : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${editor.isActive("italic") ? active : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-plum/15" />
        <button
          type="button"
          className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bulleted list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${editor.isActive("blockquote") ? active : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-plum/15" />
        <button
          type="button"
          className={`${btn} ${editor.isActive("link") ? active : ""}`}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => fileRef.current?.click()}
          title="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            e.target.value = "";
          }}
        />
        <span className="mx-1 h-5 w-px bg-plum/15" />
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
