import "server-only";
import type { Mailer } from "@virzeen/core";
import { Resend } from "resend";
import { env } from "@/server/env";

// Production sends through Resend; local development sends to Mailpit (http://localhost:8025).

function resendMailer(apiKey: string): Mailer {
  const resend = new Resend(apiKey);
  return {
    async send(message) {
      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (error) throw new Error(`Resend: ${error.name}`);
    },
  };
}

function mailpitMailer(baseUrl: string): Mailer {
  const from = /^(.*)<(.+)>$/.exec(env.EMAIL_FROM);
  return {
    async send(message) {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: from ? { Name: from[1]?.trim(), Email: from[2]?.trim() } : { Email: env.EMAIL_FROM },
          To: [{ Email: message.to }],
          Subject: message.subject,
          HTML: message.html,
          Text: message.text,
        }),
      });
      if (!response.ok) throw new Error(`Mailpit HTTP ${response.status}`);
    },
  };
}

export function createMailer(): Mailer {
  if (env.EMAIL_TRANSPORT === "resend" && env.RESEND_API_KEY) return resendMailer(env.RESEND_API_KEY);
  return mailpitMailer(env.MAILPIT_URL);
}
