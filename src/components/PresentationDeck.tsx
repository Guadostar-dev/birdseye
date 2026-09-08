"use client";

import { useEffect, useState } from "react";
import type { AttachmentMeta, Slide } from "@/lib/types";

type Props = {
  projectId: string;
  slides: Slide[];
  attachments: AttachmentMeta[];
  onSlidesChange: (slides: Slide[]) => void;
  onAttachmentsChange: (attachments: AttachmentMeta[]) => void;
};

export function PresentationDeck({
  projectId,
  slides,
  attachments,
  onSlidesChange,
  onAttachmentsChange,
}: Props) {
  const [active, setActive] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const slide = slides[active] ?? slides[0];

  useEffect(() => {
    if (active >= slides.length) setActive(Math.max(0, slides.length - 1));
  }, [active, slides.length]);

  useEffect(() => {
    if (!presenting) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight") setActive((i) => Math.min(slides.length - 1, i + 1));
      if (event.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, slides.length]);

  function patchSlide(next: Partial<Slide>) {
    if (!slide) return;
    onSlidesChange(slides.map((item, index) => (index === active ? { ...item, ...next } : item)));
  }

  function addSlide() {
    const created: Slide = {
      id: crypto.randomUUID(),
      title: `Slide ${slides.length + 1}`,
      body: "",
      notes: "",
    };
    onSlidesChange([...slides, created]);
    setActive(slides.length);
  }

  function removeSlide(index: number) {
    if (slides.length === 0) return;
    const next = slides.filter((_, i) => i !== index);
    onSlidesChange(next);
    setActive(Math.max(0, index - 1));
  }

  async function uploadFile(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/projects/${projectId}/attachments`, { method: "POST", body: form });
      const data = (await response.json()) as { attachment?: AttachmentMeta; error?: string };
      if (!response.ok || !data.attachment) {
        setUploadError(data.error || "Upload failed.");
        return;
      }
      onAttachmentsChange([...attachments, data.attachment]);
    } catch {
      setUploadError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(fileId: string) {
    await fetch(`/api/projects/${projectId}/attachments/${fileId}`, { method: "DELETE" });
    onAttachmentsChange(attachments.filter((item) => item.id !== fileId));
  }

  return (
    <section className="rounded-2xl border border-be-ice bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-be-navy">Presentation</h2>
          <p className="mt-1 text-sm text-be-navy/70">Build slides in the portal, or attach a PowerPoint / PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addSlide} className="rounded-xl border border-be-ice px-3 py-2 text-xs font-semibold hover:bg-be-frost">
            Add slide
          </button>
          <button
            type="button"
            onClick={() => slides.length && setPresenting(true)}
            className="rounded-xl bg-be-red px-3 py-2 text-xs font-bold text-white hover:bg-be-red-deep"
          >
            Present
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[13rem_1fr]">
        <ul className="space-y-2">
          {slides.length === 0 ? (
            <li className="rounded-xl border border-dashed border-be-mist px-3 py-6 text-center text-xs text-be-navy/60">
              No slides yet
            </li>
          ) : (
            slides.map((item, index) => (
              <li key={item.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={`flex-1 rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                    index === active ? "bg-be-red text-white" : "bg-be-frost text-be-navy hover:bg-be-ice"
                  }`}
                >
                  {index + 1}. {item.title || "Untitled"}
                </button>
                <button type="button" onClick={() => removeSlide(index)} className="px-1 text-be-navy/40 hover:text-be-red">
                  ×
                </button>
              </li>
            ))
          )}
        </ul>

        {slide ? (
          <div className="space-y-3">
            <input
              value={slide.title}
              onChange={(e) => patchSlide({ title: e.target.value })}
              className="w-full rounded-xl border border-be-mist px-3 py-2 text-sm font-semibold outline-none focus:border-be-red"
              placeholder="Slide title"
            />
            <textarea
              value={slide.body}
              onChange={(e) => patchSlide({ body: e.target.value })}
              rows={8}
              className="w-full rounded-xl border border-be-mist px-3 py-2 text-sm leading-6 outline-none focus:border-be-red"
              placeholder="Talking points for this slide"
            />
            <textarea
              value={slide.notes}
              onChange={(e) => patchSlide({ notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-be-mist px-3 py-2 text-sm outline-none focus:border-be-red"
              placeholder="Presenter notes (only you see these while presenting)"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 border-t border-be-ice pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-be-navy">Attached files</h3>
          <label className="cursor-pointer rounded-xl bg-be-navy px-3 py-2 text-xs font-semibold text-white hover:bg-be-blue">
            {uploading ? "Uploading…" : "Upload PPT / PDF"}
            <input
              type="file"
              accept=".pptx,.ppt,.pdf,.key"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError ? <p className="mt-2 text-sm text-be-red">{uploadError}</p> : null}
        {attachments.length === 0 ? (
          <p className="mt-3 text-sm text-be-navy/60">No files attached yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {attachments.map((file) => (
              <li key={file.id} className="flex items-center justify-between rounded-xl bg-be-frost px-3 py-2 text-sm">
                <a href={`/api/projects/${projectId}/attachments/${file.id}`} className="font-semibold text-be-blue hover:underline">
                  {file.fileName}
                </a>
                <button type="button" onClick={() => removeFile(file.id)} className="text-xs font-semibold text-be-red">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {presenting && slide ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-be-navy text-white">
          <div className="flex items-center justify-between px-6 py-4 text-sm">
            <span>
              {active + 1} / {slides.length}
            </span>
            <button type="button" onClick={() => setPresenting(false)} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold">
              Close
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
            <h2 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl">{slide.title}</h2>
            <p className="mt-8 max-w-3xl whitespace-pre-wrap text-lg leading-8 text-white/85">{slide.body}</p>
          </div>
          {slide.notes ? (
            <div className="border-t border-white/10 px-6 py-4 text-sm text-be-gold-soft">
              <span className="font-bold">Notes: </span>
              {slide.notes}
            </div>
          ) : null}
          <div className="flex justify-between px-6 py-4">
            <button type="button" onClick={() => setActive((i) => Math.max(0, i - 1))} className="rounded-lg bg-white/10 px-4 py-2">
              Previous
            </button>
            <button
              type="button"
              onClick={() => setActive((i) => Math.min(slides.length - 1, i + 1))}
              className="rounded-lg bg-be-red px-4 py-2 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
