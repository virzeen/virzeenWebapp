import { describe, expect, it } from "vitest";
import { createSaveQueue } from "./autosave-queue";

/** A run that waits until the test lets it finish, and counts how many ran. */
function controlledRun() {
  const releases: (() => void)[] = [];
  let started = 0;
  const run = () =>
    new Promise<void>((resolve) => {
      started += 1;
      releases.push(resolve);
    });
  return {
    run,
    started: () => started,
    finish: async () => {
      releases.shift()?.();
      // Let the queue see the run end and start the next one.
      for (let i = 0; i < 5; i++) await Promise.resolve();
    },
  };
}

const tick = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("save queue", () => {
  it("starts one save on a microtask, so changes made in the same handler go together", async () => {
    const saves = controlledRun();
    const queue = createSaveQueue(saves.run);
    void queue.commit();
    void queue.commit();
    expect(saves.started()).toBe(0);
    await tick();
    expect(saves.started()).toBe(1);
    expect(queue.busy).toBe(true);
    await saves.finish();
    expect(queue.busy).toBe(false);
    expect(saves.started()).toBe(1);
  });

  it("keeps one save in flight and queues exactly one more for any number of commits meanwhile", async () => {
    const saves = controlledRun();
    const queue = createSaveQueue(saves.run);
    void queue.commit();
    await tick();
    void queue.commit();
    void queue.commit();
    void queue.commit();
    expect(saves.started()).toBe(1);
    await saves.finish();
    expect(saves.started()).toBe(2);
    await saves.finish();
    expect(saves.started()).toBe(2);
    expect(queue.busy).toBe(false);
  });

  it("resolves every commit once the queue is idle again", async () => {
    const saves = controlledRun();
    const queue = createSaveQueue(saves.run);
    let firstDone = false;
    void queue.commit().then(() => (firstDone = true));
    await tick();
    const second = queue.commit();
    await saves.finish();
    expect(firstDone).toBe(false); // the queued save is still to run
    await saves.finish();
    await second;
    expect(firstDone).toBe(true);
  });

  it("starts a new round after going idle", async () => {
    const saves = controlledRun();
    const queue = createSaveQueue(saves.run);
    void queue.commit();
    await tick();
    await saves.finish();
    void queue.commit();
    await tick();
    expect(saves.started()).toBe(2);
    await saves.finish();
    expect(queue.busy).toBe(false);
  });

  it("isn't left busy when a save throws", async () => {
    let calls = 0;
    const queue = createSaveQueue(async () => {
      calls += 1;
      throw new Error("offline");
    });
    await queue.commit();
    expect(queue.busy).toBe(false);
    await queue.commit();
    expect(calls).toBe(2);
  });
});
