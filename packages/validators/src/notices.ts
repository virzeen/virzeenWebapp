import { z } from "zod";
import { idSchema } from "./common";

// Top notice bar (docs/specs/top-notice-bar.md). Who sees a notice is the same three levels the price rules use.

export const NOTICE_AUDIENCES = ["GUEST", "MEMBER", "PASS"] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export const NOTICE_AUDIENCE_LABELS: Record<NoticeAudience, string> = {
  GUEST: "Visitors (not signed in)",
  MEMBER: "MONO Members",
  PASS: "Monochrome Pass members",
};

export const NOTICE_TEXT_MAX = 90;
export const NOTICE_LINK_LABEL_MAX = 30;

/** A link stays on the site ("/membership") or goes to a secure address; nothing else (no `javascript:`). */
export function isSafeNoticeHref(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  return /^https:\/\/[^\s/$.?#][^\s]*$/i.test(value);
}

const HREF_ERROR = "Use a page on this site, like /membership, or a link starting with https://";

/** The admin "Add a notice" form. Dates are Nepal calendar days (YYYY-MM-DD); blank means no start / no end. */
export const siteNoticeSchema = z
  .strictObject({
    id: idSchema.optional(),
    text: z
      .string({ error: "Enter the notice" })
      .trim()
      .min(1, { error: "Enter the notice" })
      .max(NOTICE_TEXT_MAX, { error: `Keep it under ${NOTICE_TEXT_MAX} characters` }),
    linkLabel: z
      .string()
      .trim()
      .max(NOTICE_LINK_LABEL_MAX, { error: `Keep it under ${NOTICE_LINK_LABEL_MAX} characters` })
      .optional()
      .or(z.literal("")),
    linkHref: z
      .string()
      .trim()
      .max(300, { error: "Keep the link shorter" })
      .refine((value) => value === "" || isSafeNoticeHref(value), { error: HREF_ERROR })
      .optional(),
    audiences: z
      .array(z.enum(NOTICE_AUDIENCES))
      .min(1, { error: "Choose who sees it" })
      .max(NOTICE_AUDIENCES.length),
    startsOn: z.iso.date({ error: "Choose a date" }).optional().or(z.literal("")),
    endsOn: z.iso.date({ error: "Choose a date" }).optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const hasLabel = Boolean(value.linkLabel);
    const hasHref = Boolean(value.linkHref);
    if (hasLabel && !hasHref)
      ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Add the link this should open" });
    if (hasHref && !hasLabel)
      ctx.addIssue({ code: "custom", path: ["linkLabel"], message: "Add the words people tap" });
    if (value.startsOn && value.endsOn && value.endsOn < value.startsOn)
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "Choose a date after the start" });
  });
export type SiteNoticeInput = z.infer<typeof siteNoticeSchema>;

/** Moving a notice up or down in the list. */
export const moveNoticeSchema = z.strictObject({
  id: idSchema,
  direction: z.enum(["up", "down"]),
});
export type MoveNoticeInput = z.infer<typeof moveNoticeSchema>;

export const deleteNoticeSchema = z.strictObject({ id: idSchema });
