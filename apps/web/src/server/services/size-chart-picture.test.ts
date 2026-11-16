import { SIZE_CHART_PICTURE_SERVER_MAX_BYTES } from "@virzeen/validators/limits";
import { describe, expect, it } from "vitest";
import { checkChartPicture, PICTURE_MESSAGES, sniffPictureType } from "./size-chart-picture";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];
const EXE = [0x4d, 0x5a, 0x90, 0x00];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

const file = (bytes: number[], name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

describe("sniffPictureType", () => {
  it("knows JPEG, PNG and WebP from their first bytes", () => {
    expect(sniffPictureType(new Uint8Array(JPEG))).toBe("image/jpeg");
    expect(sniffPictureType(new Uint8Array(PNG))).toBe("image/png");
    expect(sniffPictureType(new Uint8Array(WEBP))).toBe("image/webp");
  });

  it("refuses anything else, and a RIFF file that isn't WebP", () => {
    for (const bytes of [PDF, EXE, GIF, [], [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56, 0x49, 0x20]]) {
      expect(sniffPictureType(new Uint8Array(bytes))).toBeNull();
    }
  });
});

describe("checkChartPicture", () => {
  it("accepts a JPEG even when the browser called it a PNG, and returns what it really is", async () => {
    const picture = await checkChartPicture(file(JPEG, "chart.png", "image/png"));
    expect(picture.mimeType).toBe("image/jpeg");
    expect([...picture.bytes]).toEqual(JPEG);
  });

  it("refuses a program or a PDF renamed to look like a picture", async () => {
    await expect(checkChartPicture(file(EXE, "chart.jpg", "image/jpeg"))).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: PICTURE_MESSAGES.wrongType,
    });
    await expect(checkChartPicture(file(PDF, "chart.png", "image/png"))).rejects.toMatchObject({
      message: PICTURE_MESSAGES.wrongType,
    });
  });

  it("refuses a missing, empty or text entry", async () => {
    for (const entry of [null, "chart.jpg", file([], "empty.jpg", "image/jpeg")]) {
      await expect(checkChartPicture(entry)).rejects.toMatchObject({
        code: "VALIDATION_FAILED",
        message: PICTURE_MESSAGES.wrongType,
      });
    }
  });

  it("refuses a picture over the limit before reading it", async () => {
    const big = new File([new Uint8Array(SIZE_CHART_PICTURE_SERVER_MAX_BYTES + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    await expect(checkChartPicture(big)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: PICTURE_MESSAGES.tooBig,
    });
  });
});
