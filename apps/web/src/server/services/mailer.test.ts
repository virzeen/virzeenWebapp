import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMailer } from "./mailer";

// The providers (Resend SDK, Mailpit's HTTP API) are faked; the From/Reply-To mapping is under test
// (docs/specs/email-senders.md). Fake values only.

const env = vi.hoisted(() => ({
  EMAIL_TRANSPORT: "resend",
  RESEND_API_KEY: "fake-resend-key",
  EMAIL_FROM: "Virzeen <no-reply@example.com>",
  EMAIL_FROM_AUTH: "Virzeen <verify@example.com>",
  EMAIL_REPLY_TO: "sales@example.com" as string | undefined,
  MAILPIT_URL: "http://mailpit.test",
}));
const resendSend = vi.hoisted(() =>
  vi.fn<(options: { from: string; replyTo?: string }) => Promise<{ error: null }>>(async () => ({
    error: null,
  })),
);

vi.mock("@/server/env", () => ({ env }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

const signInCode = {
  to: "customer@example.com",
  subject: "Code",
  html: "<p>1</p>",
  text: "1",
  sender: "auth" as const,
};
const orderEmail = { to: "customer@example.com", subject: "Order", html: "<p>2</p>", text: "2" };

beforeEach(() => {
  env.EMAIL_REPLY_TO = "sales@example.com";
});

describe("mailer with Resend", () => {
  beforeEach(() => {
    env.EMAIL_TRANSPORT = "resend";
    resendSend.mockClear();
  });

  it("sends sign-in codes from the sign-in sender without Reply-To, and order emails from the default one replying to sales", async () => {
    const mailer = createMailer();
    await mailer.send(signInCode);
    await mailer.send(orderEmail);
    expect(resendSend.mock.calls.map(([options]) => [options.from, options.replyTo])).toEqual([
      ["Virzeen <verify@example.com>", undefined],
      ["Virzeen <no-reply@example.com>", "sales@example.com"],
    ]);
  });
});

describe("mailer with Mailpit", () => {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response("{}", { status: 200 }),
  );
  const sentBodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));

  beforeEach(() => {
    env.EMAIL_TRANSPORT = "mailpit";
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits the sender into name and address and sets Reply-To on order emails", async () => {
    await createMailer().send(orderEmail);
    expect(sentBodies()[0]).toMatchObject({
      From: { Name: "Virzeen", Email: "no-reply@example.com" },
      ReplyTo: [{ Email: "sales@example.com" }],
    });
  });

  it("never sets Reply-To on sign-in codes, so a reply can't carry a live code to the shared inbox", async () => {
    await createMailer().send(signInCode);
    expect(sentBodies()[0].From).toEqual({ Name: "Virzeen", Email: "verify@example.com" });
    expect(sentBodies()[0]).not.toHaveProperty("ReplyTo");
  });

  it("leaves Reply-To out when none is configured", async () => {
    env.EMAIL_REPLY_TO = undefined;
    await createMailer().send(orderEmail);
    expect(sentBodies()[0].From).toEqual({ Name: "Virzeen", Email: "no-reply@example.com" });
    expect(sentBodies()[0]).not.toHaveProperty("ReplyTo");
  });
});
