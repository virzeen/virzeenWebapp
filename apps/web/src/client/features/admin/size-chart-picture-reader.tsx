"use client";

import { Alert, Button, cn, Dialog, DialogContent, DialogTrigger, toast } from "@virzeen/ui";
import type { SizeChart, SizeGuideFormValues } from "@virzeen/validators";
import { SIZE_CHART_PICTURE_TYPES } from "@virzeen/validators/limits";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { messageFor } from "@/client/lib/error-messages";
import { shrinkForReading } from "@/client/lib/shrink-image";
import type { ActionError } from "@/server/actions/result";
import { readSizeChartPictureAction } from "@/server/actions/admin/size-chart-reading";
import { keepFocusOnPress } from "./form-focus";
import { pastedPicture } from "./size-chart-picture-paste";
import { READING_COPY, readingNotice } from "./size-chart-reading-notice";
import type { ReplaceTableRequest } from "./size-chart-replace-dialog";

type Reading = Extract<Awaited<ReturnType<typeof readSizeChartPictureAction>>, { ok: true }>["data"];

const ACCEPT = SIZE_CHART_PICTURE_TYPES.join(",");

// Our own wording for these two (the admin's friendly messages come from the server); the shared `messageFor`
// would replace them with its generic ones.
const errorFor = (error: Pick<ActionError, "code" | "message">) =>
  error.code === "RATE_LIMITED" || error.code === "INTERNAL" ? error.message : messageFor(error);

const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

type SizeChartPictureReaderProps = {
  /** Puts the read table in the grid (every box new). */
  fill: (chart: SizeChart) => void;
  /** Nothing typed yet: the table goes straight in, without asking. */
  blank: boolean;
  askReplace: (request: ReplaceTableRequest) => void;
  /** The first value box of the filled table: where focus goes. */
  firstBox: () => HTMLElement | null | undefined;
};

/**
 * "Fill from a picture" (specs/size-chart-from-picture.md): the admin chooses or drops a supplier's size chart
 * picture; the browser shrinks it, a Server Action has it read, and the English table goes into the grid (after
 * asking when something is typed). The picture is shown from the browser's own copy and never uploaded or stored.
 * Nothing is saved here: the admin checks the table against the picture and saves the guide as usual.
 */
export function SizeChartPictureReader({ fill, blank, askReplace, firstBox }: SizeChartPictureReaderProps) {
  const form = useFormContext<SizeGuideFormValues>();
  const fileInput = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const urlRef = useRef<string | null>(null);
  // The shrunk picture, for "Try again"; and which reading the screen is waiting for (an older one is ignored).
  const keptRef = useRef<File | null>(null);
  const latestRef = useRef(0);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [notice, setNotice] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);

  // `offer` runs seconds after the picture was chosen: it must see whether the table is blank *now*, so that typing
  // while the picture is read still gets the "Replace the table?" question.
  const blankRef = useRef(blank);
  useEffect(() => {
    blankRef.current = blank;
  }, [blank]);

  // Ctrl+V anywhere on the page: a picture on the clipboard (a screenshot, "Copy image") is read straight away. The
  // handler reads the latest `choose`, so it is added once.
  const chooseRef = useRef(choose);
  useEffect(() => {
    chooseRef.current = choose;
  });
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const picture = event.clipboardData ? pastedPicture(event.clipboardData) : null;
      if (!picture) return;
      event.preventDefault();
      void chooseRef.current([picture]);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  useEffect(
    () => () => {
      // Leaving the page: a reply that arrives later is ignored, and the picture's address is released.
      latestRef.current += 1;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function showPicture(file: File) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setPictureUrl(urlRef.current);
  }

  function offer(result: Reading) {
    function put() {
      fill(result.chart);
      // The chart's own footnote goes in Fit tips only when that box is empty: typed text is never replaced.
      const addNote = result.note !== "" && (form.getValues("fitTips") ?? "").trim() === "";
      if (addNote) {
        form.setValue("fitTips", result.note, {
          shouldDirty: true,
          shouldValidate: form.formState.isSubmitted,
        });
      }
      setNotice(readingNotice(result, addNote));
      toast.success(READING_COPY.filled);
    }
    if (blankRef.current) {
      put();
      requestAnimationFrame(() => firstBox()?.focus());
      return;
    }
    askReplace({
      title: "Replace the table with the one from the picture?",
      description: "What's in the table now is replaced.",
      replace: put,
      focusAfterReplace: firstBox,
      focusAfterKeep: () => buttonRef.current,
    });
  }

  async function read(file: File, mine: number) {
    setReading(true);
    setError(null);
    const data = new FormData();
    data.set("picture", file);
    let result: Awaited<ReturnType<typeof readSizeChartPictureAction>>;
    try {
      result = await readSizeChartPictureAction(data);
    } catch {
      // The request itself failed (offline, or Next refused a body over its limit).
      if (mine !== latestRef.current) return;
      setReading(false);
      setRetryable(true);
      setError(READING_COPY.couldntRead);
      return;
    }
    if (mine !== latestRef.current) return;
    setReading(false);
    if (!result.ok) {
      setRetryable(true);
      setError(errorFor(result.error));
      return;
    }
    offer(result.data);
  }

  async function choose(files: File[]) {
    const file = files[0];
    if (!file) return;
    const mine = ++latestRef.current;
    setError(null);
    setRetryable(false);
    setNotice(null);
    setReading(true);
    const shrunk = await shrinkForReading(file);
    if (mine !== latestRef.current) return;
    if (!shrunk.ok) {
      setReading(false);
      setError(shrunk.reason === "too-big" ? READING_COPY.tooBig : READING_COPY.wrongType);
      return;
    }
    keptRef.current = shrunk.file;
    showPicture(shrunk.file);
    await read(shrunk.file, mine);
  }

  function retry() {
    const file = keptRef.current;
    if (!file) return;
    setNotice(null);
    void read(file, ++latestRef.current);
  }

  function remove() {
    latestRef.current += 1;
    keptRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPictureUrl(null);
    setReading(false);
    setError(null);
    setRetryable(false);
    setNotice(null);
    // The picture's button is gone: focus goes back to the one that chose it.
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  return (
    <div
      data-picture-reader
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        void choose(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-md border border-dashed border-line-strong p-6 text-center transition-colors duration-150 ease-standard",
        dragging && "border-ink bg-surface",
      )}
    >
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          void choose(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <Button
        ref={buttonRef}
        variant="secondary"
        size="sm"
        shape="pill"
        loading={reading}
        onMouseDown={keepFocusOnPress}
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
        Fill from a picture
      </Button>
      <p aria-live="polite" className="text-small text-ink-muted">
        {reading ? "Reading the picture…" : "Ctrl+V to paste, or drop a picture here"}
      </p>
      {pictureUrl && (
        <div className="flex flex-col items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                aria-label="Open your picture larger"
                className="h-auto max-w-full rounded-md border border-line p-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a picture that is never uploaded */}
                <img /* ui-allow: a local preview of a picture that is never uploaded (specs/size-chart-from-picture.md) */
                  src={pictureUrl}
                  alt="Size chart picture you chose"
                  className="max-h-80 w-auto max-w-full rounded-md object-contain"
                />
              </Button>
            </DialogTrigger>
            <DialogContent size="lg" title="Your picture" hideTitle>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a picture that is never uploaded */}
              <img /* ui-allow: a local preview of a picture that is never uploaded (specs/size-chart-from-picture.md) */
                src={pictureUrl}
                alt="Size chart picture you chose, larger"
                className="w-full"
              />
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" shape="pill" onMouseDown={keepFocusOnPress} onClick={remove}>
            Remove picture
          </Button>
        </div>
      )}
      {error && (
        <Alert
          variant="danger"
          action={
            retryable ? (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onMouseDown={keepFocusOnPress}
                onClick={retry}
              >
                Try again
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}
      {notice && (
        <Alert title="Before you save">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {notice.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}
