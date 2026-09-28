import type { OutgoingEmail } from "@virzeen/core";
import type { Env } from "../env-schema";

/**
 * The From address for an email (docs/specs/email-senders.md): sign-in codes use EMAIL_FROM_AUTH when it is
 * set, everything else EMAIL_FROM.
 */
export function senderFor(
  message: Pick<OutgoingEmail, "sender">,
  senders: Pick<Env, "EMAIL_FROM" | "EMAIL_FROM_AUTH">,
): string {
  return (message.sender === "auth" && senders.EMAIL_FROM_AUTH) || senders.EMAIL_FROM;
}

/**
 * The Reply-To for an email: EMAIL_REPLY_TO, except on sign-in codes. A reply or auto-reply to a code email
 * quotes the live code, and it must not land in the partners' shared inbox.
 */
export function replyToFor(
  message: Pick<OutgoingEmail, "sender">,
  settings: Pick<Env, "EMAIL_REPLY_TO">,
): string | undefined {
  return message.sender === "auth" ? undefined : settings.EMAIL_REPLY_TO;
}
