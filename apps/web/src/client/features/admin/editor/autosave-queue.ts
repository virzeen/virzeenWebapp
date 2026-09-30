// The on-page product editor saves by itself after every finished edit (specs/product-editor-on-page.md
// "Autosave"). This is the queue behind it, without React: one save at a time, and edits made while a save is
// running end in exactly one more save, which reads the latest values, so the latest edit wins.

export type SaveState =
  /** Every edit is saved; `savedAt` is the last save's time (ISO). */
  | { status: "saved"; savedAt: string }
  | { status: "saving" }
  /** The server refused or couldn't be reached; Try again sends the latest values again. */
  | { status: "error"; message: string }
  /** A field fails the product's checks: nothing is sent until it's fixed. `message` is the first problem. */
  | { status: "invalid"; message: string };

export type SaveQueue = {
  /** Asks for a save. Resolves once the queue is idle again (this save and any queued after it are done). */
  commit: () => Promise<void>;
  /** True from the first commit until the last queued save has finished. */
  readonly busy: boolean;
};

/**
 * `run` does one save (validate, send, merge the answer back) and reports its own errors. A commit while `run` is
 * waiting to start joins it; a commit while it runs queues one more run (never more than one); commits after the
 * queue went idle start a new round. `run` starts on a microtask, so several form changes made in the same event
 * handler (a style renamed in the rows, its photos and its entry) are saved together.
 */
export function createSaveQueue(run: () => Promise<void>): SaveQueue {
  let phase: "idle" | "scheduled" | "running" = "idle";
  let again = false;
  let idle: Promise<void> = Promise.resolve();
  let resolveIdle = () => {};

  async function drain() {
    do {
      again = false;
      phase = "running";
      try {
        await run();
      } catch {
        // `run` reports its own failures; a throw here must not leave the queue stuck as busy.
      }
    } while (again);
    phase = "idle";
    resolveIdle();
  }

  function commit() {
    if (phase === "idle") {
      phase = "scheduled";
      idle = new Promise<void>((resolve) => {
        resolveIdle = resolve;
      });
      queueMicrotask(() => void drain());
    } else if (phase === "running") {
      again = true;
    }
    return idle;
  }

  return {
    commit,
    get busy() {
      return phase !== "idle";
    },
  };
}
