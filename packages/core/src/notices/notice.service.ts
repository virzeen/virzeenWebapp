import "server-only";
import { db, type Prisma } from "@virzeen/db";
import type { NoticeAudience, SiteNoticeInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";
import { endOfNepalDay, nepalDateOf, startOfNepalDay } from "../pricing/discounts";

// The bar above the shop header (docs/specs/top-notice-bar.md). The owners write notices in /admin/notices; with
// none active for a visitor, the site shows built-in notices for their level.

/** What the bar needs to draw one notice. */
export type NoticeView = { id: string; text: string; linkLabel: string | null; linkHref: string | null };

/** The most notices the bar rotates through. */
export const NOTICES_SHOWN = 6;
/** How many notices the admin list shows. */
export const ADMIN_NOTICES_SHOWN = 100;

const NEW_AND_FEATURED = (id: string): NoticeView => ({
  id,
  text: "New this week.",
  linkLabel: "Shop New and Featured",
  linkHref: "/shop",
});

/**
 * Built-in notices, two per level (owner, 2026-11-14): a visitor is asked to join as a MONO Member first, because the
 * Pass is bought only inside a member account; a member is asked to join the Pass; a Pass member sees their own
 * benefits.
 */
export function defaultNotices(audience: NoticeAudience): NoticeView[] {
  switch (audience) {
    case "GUEST":
      return [
        {
          id: "default-guest",
          text: "Enjoy free delivery.",
          linkLabel: "Join MONO Member",
          linkHref: "/signup",
        },
        NEW_AND_FEATURED("default-new-guest"),
      ];
    case "MEMBER":
      return [
        {
          id: "default-member",
          text: "Enjoy free delivery.",
          linkLabel: "Join Monochrome Pass",
          linkHref: "/account/membership",
        },
        NEW_AND_FEATURED("default-new-member"),
      ];
    case "PASS":
      return [
        {
          id: "default-pass",
          text: "Your Pass: free delivery and 10% off every order.",
          linkLabel: "See your benefits",
          linkHref: "/account/membership",
        },
        NEW_AND_FEATURED("default-new-pass"),
      ];
  }
}

const noticeSelect = {
  id: true,
  text: true,
  linkLabel: true,
  linkHref: true,
  audiences: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  sortOrder: true,
} satisfies Prisma.SiteNoticeSelect;

export type NoticeStatus = "LIVE" | "OFF" | "SCHEDULED" | "ENDED";

export type AdminNoticeRow = {
  id: string;
  text: string;
  linkLabel: string | null;
  linkHref: string | null;
  audiences: NoticeAudience[];
  /** Nepal dates, "YYYY-MM-DD", or null. */
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  status: NoticeStatus;
};

function statusOf(
  row: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): NoticeStatus {
  if (!row.isActive) return "OFF";
  if (row.endsAt && row.endsAt.getTime() < now.getTime()) return "ENDED";
  if (row.startsAt && row.startsAt.getTime() > now.getTime()) return "SCHEDULED";
  return "LIVE";
}

/** The fields a save writes: no link without both its words and its address. */
function dataOf(input: SiteNoticeInput) {
  const hasLink = Boolean(input.linkLabel && input.linkHref);
  return {
    text: input.text,
    linkLabel: hasLink ? input.linkLabel || null : null,
    linkHref: hasLink ? input.linkHref || null : null,
    audiences: input.audiences,
    startsAt: input.startsOn ? startOfNepalDay(input.startsOn) : null,
    endsAt: input.endsOn ? endOfNepalDay(input.endsOn) : null,
    isActive: input.isActive,
  };
}

export const noticeService = {
  /** The notices this visitor sees now, in the owners' order; the built-in ones when there are none. */
  async listFor(audience: NoticeAudience, now = new Date()): Promise<NoticeView[]> {
    const rows = await db.siteNotice.findMany({
      where: {
        isActive: true,
        audiences: { has: audience },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: NOTICES_SHOWN,
      select: { id: true, text: true, linkLabel: true, linkHref: true },
    });
    return rows.length > 0 ? rows : defaultNotices(audience);
  },

  /** Every notice for /admin/notices, in display order. */
  async listForAdmin(now = new Date()): Promise<AdminNoticeRow[]> {
    const rows = await db.siteNotice.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: ADMIN_NOTICES_SHOWN,
      select: noticeSelect,
    });
    return rows.map(({ startsAt, endsAt, sortOrder: _order, ...row }) => ({
      ...row,
      startsOn: startsAt ? nepalDateOf(startsAt) : null,
      endsOn: endsAt ? nepalDateOf(endsAt) : null,
      status: statusOf({ isActive: row.isActive, startsAt, endsAt }, now),
    }));
  },

  /** Adds a notice (last in the list) or edits one. Audited in the same transaction. */
  async save(actorId: string, input: SiteNoticeInput): Promise<{ id: string }> {
    const data = dataOf(input);
    return db.$transaction(async (tx) => {
      let saved: { id: string };
      if (input.id) {
        const existing = await tx.siteNotice.findUnique({ where: { id: input.id }, select: { id: true } });
        if (!existing) throw new AppError("NOT_FOUND", "Notice not found.");
        saved = await tx.siteNotice.update({ where: { id: input.id }, data, select: { id: true } });
      } else {
        const last = await tx.siteNotice.aggregate({ _max: { sortOrder: true } });
        saved = await tx.siteNotice.create({
          data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
          select: { id: true },
        });
      }
      await recordAudit(tx, {
        actorId,
        action: input.id ? "notice.update" : "notice.create",
        entity: "SiteNotice",
        entityId: saved.id,
        diff: {
          ...data,
          startsAt: data.startsAt?.toISOString() ?? null,
          endsAt: data.endsAt?.toISOString() ?? null,
        },
      });
      return saved;
    });
  },

  /** Swaps a notice with its neighbour. Positions are renumbered 0..n so equal sort orders can't stick. */
  async move(actorId: string, id: string, direction: "up" | "down"): Promise<void> {
    await db.$transaction(async (tx) => {
      const rows = await tx.siteNotice.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      const from = rows.findIndex((row) => row.id === id);
      if (from === -1) throw new AppError("NOT_FOUND", "Notice not found.");
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= rows.length) return;
      const order = rows.map((row) => row.id);
      [order[from], order[to]] = [order[to]!, order[from]!];
      await Promise.all(
        order.map((noticeId, index) =>
          tx.siteNotice.update({ where: { id: noticeId }, data: { sortOrder: index }, select: { id: true } }),
        ),
      );
      await recordAudit(tx, {
        actorId,
        action: "notice.move",
        entity: "SiteNotice",
        entityId: id,
        diff: { direction, position: to },
      });
    });
  },

  /** Removes a notice for good (it holds no customer data). Audited. */
  async remove(actorId: string, id: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const gone = await tx.siteNotice.deleteMany({ where: { id } });
      if (gone.count === 0) throw new AppError("NOT_FOUND", "Notice not found.");
      await recordAudit(tx, { actorId, action: "notice.delete", entity: "SiteNotice", entityId: id });
    });
  },
};
