import { afterEach, beforeEach, vi } from "vitest";
import { configureCore, type OutgoingEmail } from "../src/config";

// Fakes for everything outside our process: email, logging, provider HTTP (testing-strategy.md §4).

export const sentEmails: OutgoingEmail[] = [];

type FetchHandler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;
let fetchHandler: FetchHandler = () => {
  throw new Error("Unexpected provider HTTP call. Use mockProvider() in this test.");
};

/** Routes provider HTTP calls to `handler` for the current test. */
export function mockProvider(handler: FetchHandler) {
  fetchHandler = handler;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const TEST_ESEWA = {
  productCode: "EPAYTEST",
  secretKey: "8gBm/:&EnhH.1/q",
  formUrl: "https://rc-epay.esewa.com.np",
  statusUrl: "https://rc.esewa.com.np",
};

beforeEach(() => {
  sentEmails.length = 0;
  fetchHandler = () => {
    throw new Error("Unexpected provider HTTP call. Use mockProvider() in this test.");
  };
  configureCore({
    siteUrl: "https://virzeen.test",
    ownerAlertEmail: "owner@virzeen.test",
    mailer: {
      async send(message) {
        sentEmails.push(message);
      },
    },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    esewa: TEST_ESEWA,
    khalti: { secretKey: "test_secret_key", baseUrl: "https://dev.khalti.com/api/v2" },
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      return fetchHandler(url, init);
    }) as typeof fetch,
  });
});

afterEach(() => {
  vi.useRealTimers();
});
