import { AppError, PICTURE_READING_MESSAGES } from "@virzeen/core";
import { SIZE_CHART_PICTURE_SERVER_MAX_BYTES } from "@virzeen/validators/limits";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rateLimit: vi.fn(),
  readSizeChartPicture: vi.fn(),
  features: { pictureReading: true },
}));

vi.mock("@/server/bootstrap", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/server/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/server/env", () => ({
  env: {
    GEMINI_API_KEY: "fake-key",
    GEMINI_MODEL: "gemini-3.8-flash",
    GEMINI_API_URL: "https://generativelanguage.googleapis.com",
  },
  features: mocks.features,
}));
vi.mock("@/server/auth/session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/server/security/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/server/services/gemini", () => ({ readSizeChartPicture: mocks.readSizeChartPicture }));

import { readSizeChartPictureAction } from "./size-chart-reading";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const READING = {
  readable: true,
  unit: "cm",
  multipleTables: false,
  columns: ["Chest", "Weight"],
  rows: [{ size: "M", values: ["114", "1.320"] }],
  skipped: [],
  note: "",
};

function form(picture: File | string | null) {
  const data = new FormData();
  if (picture !== null) data.set("picture", picture);
  return data;
}
const jpeg = (bytes: number[] = JPEG) =>
  new File([new Uint8Array(bytes)], "chart.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.features.pictureReading = true;
  mocks.requireAdmin.mockResolvedValue({ id: "admin1" });
  mocks.rateLimit.mockResolvedValue(undefined);
  mocks.readSizeChartPicture.mockResolvedValue(READING);
});

describe("readSizeChartPictureAction", () => {
  it("gives the table the picture would make, asking Google once with the configured key and model", async () => {
    const result = await readSizeChartPictureAction(form(jpeg()));
    expect(result).toMatchObject({ ok: true, data: { unitUnknown: false } });
    if (!result.ok) throw new Error("expected a table");
    expect(result.data.chart.columns).toEqual(["Chest", "Weight"]);
    expect(mocks.readSizeChartPicture).toHaveBeenCalledTimes(1);
    expect(mocks.readSizeChartPicture).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "fake-key",
        model: "gemini-3.8-flash",
        baseUrl: "https://generativelanguage.googleapis.com",
        picture: expect.objectContaining({ mimeType: "image/jpeg" }),
      }),
    );
  });

  it("refuses a visitor, a customer and an admin without the authenticator step-up before doing anything", async () => {
    for (const code of ["UNAUTHENTICATED", "FORBIDDEN"] as const) {
      mocks.requireAdmin.mockRejectedValueOnce(new AppError(code, "No"));
      expect(await readSizeChartPictureAction(form(jpeg()))).toMatchObject({ ok: false, error: { code } });
    }
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.readSizeChartPicture).not.toHaveBeenCalled();
  });

  it("counts every reading against the admin's own 10-minute and daily limits, after the shared admin limit", async () => {
    await readSizeChartPictureAction(form(jpeg()));
    expect(mocks.rateLimit.mock.calls).toEqual([
      ["admin", "admin:admin1"],
      ["admin:ai", "admin:admin1"],
      ["admin:ai-day", "admin:admin1"],
    ]);
  });

  it.each(["admin:ai", "admin:ai-day"])("stops at the %s limit without calling Google", async (bucket) => {
    mocks.rateLimit.mockImplementation(async (name: string) => {
      if (name === bucket) throw new AppError("RATE_LIMITED", "Too many attempts.");
    });
    expect(await readSizeChartPictureAction(form(jpeg()))).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
    expect(mocks.readSizeChartPicture).not.toHaveBeenCalled();
  });

  it("refuses a wrong, missing or oversize picture before any call to Google", async () => {
    const big = new File([new Uint8Array(SIZE_CHART_PICTURE_SERVER_MAX_BYTES + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    for (const entry of [form(null), form("chart.jpg"), form(jpeg([0x4d, 0x5a, 0x90])), form(big)]) {
      expect(await readSizeChartPictureAction(entry)).toMatchObject({
        ok: false,
        error: { code: "VALIDATION_FAILED" },
      });
    }
    expect(mocks.readSizeChartPicture).not.toHaveBeenCalled();
  });

  it("tells the admin when the chart is in inches and gives no table", async () => {
    mocks.readSizeChartPicture.mockResolvedValue({ ...READING, unit: "in" });
    expect(await readSizeChartPictureAction(form(jpeg()))).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED", message: PICTURE_READING_MESSAGES.inches },
    });
  });

  it("passes Google's busy answer on as RATE_LIMITED", async () => {
    mocks.readSizeChartPicture.mockRejectedValue(new AppError("RATE_LIMITED", PICTURE_READING_MESSAGES.busy));
    expect(await readSizeChartPictureAction(form(jpeg()))).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED", message: PICTURE_READING_MESSAGES.busy },
    });
  });

  it("does nothing without a key, and says it couldn't read the picture", async () => {
    mocks.features.pictureReading = false;
    expect(await readSizeChartPictureAction(form(jpeg()))).toMatchObject({
      ok: false,
      error: { code: "INTERNAL", message: PICTURE_READING_MESSAGES.couldntRead },
    });
    expect(mocks.readSizeChartPicture).not.toHaveBeenCalled();
  });
});
