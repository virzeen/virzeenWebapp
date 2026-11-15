import { db } from "@virzeen/db";
import type { SiteNoticeInput } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDatabase } from "../../test/factories";
import { defaultNotices, noticeService } from "./notice.service";

// The top notice bar against the test database (docs/specs/top-notice-bar.md).

const NOW = new Date("2026-11-11T06:00:00Z");

const base: SiteNoticeInput = {
  text: "11.11 offers are live.",
  linkLabel: "Shop now",
  linkHref: "/shop",
  audiences: ["GUEST", "MEMBER", "PASS"],
  startsOn: "",
  endsOn: "",
  isActive: true,
};

async function admin() {
  return (await createUser({ role: "ADMIN" })).id;
}

describe("notice bar", () => {
  beforeEach(resetDatabase);

  it("shows the built-in notice for the visitor's level when none is written", async () => {
    expect(await noticeService.listFor("GUEST", NOW)).toEqual(defaultNotices("GUEST"));
    const guest = defaultNotices("GUEST")[0];
    expect(guest?.linkLabel).toBe("Join MONO Member");
    expect(guest?.linkHref).toBe("/signup");
    expect(defaultNotices("MEMBER")[0]?.linkLabel).toBe("Join Monochrome Pass");
  });

  it("shows written notices in the owners' order instead of the built-in ones", async () => {
    const actor = await admin();
    await noticeService.save(actor, base);
    await noticeService.save(actor, { ...base, text: "Free returns for the Pass." });
    const shown = await noticeService.listFor("GUEST", NOW);
    expect(shown.map((n) => n.text)).toEqual(["11.11 offers are live.", "Free returns for the Pass."]);
  });

  it("keeps a members-only notice away from visitors", async () => {
    const actor = await admin();
    await noticeService.save(actor, {
      ...base,
      text: "Members only: early access.",
      audiences: ["MEMBER", "PASS"],
    });
    expect((await noticeService.listFor("GUEST", NOW)).map((n) => n.id)).toEqual([
      "default-guest",
      "default-new-guest",
    ]);
    expect((await noticeService.listFor("MEMBER", NOW)).map((n) => n.text)).toEqual([
      "Members only: early access.",
    ]);
  });

  it("hides a notice that is off, not started or ended", async () => {
    const actor = await admin();
    await noticeService.save(actor, { ...base, text: "Off", isActive: false });
    await noticeService.save(actor, { ...base, text: "Later", startsOn: "2026-11-12" });
    await noticeService.save(actor, { ...base, text: "Over", endsOn: "2026-11-10" });
    await noticeService.save(actor, { ...base, text: "Today", startsOn: "2026-11-11", endsOn: "2026-11-11" });
    expect((await noticeService.listFor("GUEST", NOW)).map((n) => n.text)).toEqual(["Today"]);
    const statuses = (await noticeService.listForAdmin(NOW)).map((row) => [row.text, row.status]);
    expect(statuses).toEqual([
      ["Off", "OFF"],
      ["Later", "SCHEDULED"],
      ["Over", "ENDED"],
      ["Today", "LIVE"],
    ]);
  });

  it("moves a notice, deletes one, and audits every change", async () => {
    const actor = await admin();
    const first = await noticeService.save(actor, base);
    const second = await noticeService.save(actor, { ...base, text: "Second" });
    await noticeService.move(actor, second.id, "up");
    expect((await noticeService.listForAdmin(NOW)).map((row) => row.text)).toEqual(["Second", base.text]);
    await noticeService.remove(actor, first.id);
    expect(await db.siteNotice.count()).toBe(1);
    const actions = (await db.auditLog.findMany({ select: { action: true } }))
      .map((row) => row.action)
      .sort();
    expect(actions).toEqual(["notice.create", "notice.create", "notice.delete", "notice.move"]);
  });

  it("drops a link that has only half its parts", async () => {
    const actor = await admin();
    const saved = await noticeService.save(actor, { ...base, linkHref: "" });
    const row = await db.siteNotice.findUnique({ where: { id: saved.id } });
    expect(row?.linkLabel).toBeNull();
    expect(row?.linkHref).toBeNull();
  });
});
