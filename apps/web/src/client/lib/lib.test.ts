import { describe, expect, it, vi } from "vitest";
import { addToBagMessage, messageFor } from "./error-messages";
import { formatDate, formatDateTime } from "./format";
import imageLoader from "./image-loader";
import { orderStatus, timelineLabel } from "./order-labels";

describe("formatDate / formatDateTime", () => {
  it("formats in Nepal time with fixed month names (content-style.md)", () => {
    // 18:30 UTC on the 27th is 00:15 on the 28th in Kathmandu (UTC+5:45).
    expect(formatDate(new Date("2026-09-27T18:30:00Z"))).toBe("28 Sep 2026");
    expect(formatDateTime("2026-09-28T09:15:00Z")).toBe("28 Sep 2026, 3:00 PM");
  });
});

describe("messageFor", () => {
  it("uses the content-style copy for known codes", () => {
    expect(messageFor({ code: "RATE_LIMITED", message: "x" })).toBe(
      "Too many attempts. Please wait a few minutes and try again.",
    );
    expect(messageFor({ code: "PRICE_CHANGED", message: "x" })).toBe(
      "A price changed since you added this item. Please review your bag.",
    );
  });

  it("never shows internal error text", () => {
    expect(messageFor({ code: "INTERNAL", message: "TypeError: boom at line 3" })).toBe(
      "Something went wrong on our side. Please try again.",
    );
  });

  it("shows the precise stock message when adding to the bag", () => {
    expect(addToBagMessage({ code: "OUT_OF_STOCK", message: "Only 2 left" })).toBe("Only 2 left");
  });
});

describe("imageLoader", () => {
  it("serves local assets as-is with a width hint", () => {
    expect(imageLoader({ src: "/placeholder/product-01.jpg", width: 800 })).toBe(
      "/placeholder/product-01.jpg?w=800",
    );
  });

  it("serves uploaded Cloudinary images resized with automatic format and quality", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    vi.resetModules();
    const { default: loader } = await import("./image-loader");
    expect(loader({ src: "virzeen/products/p1/tee-front", width: 800 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/virzeen/products/p1/tee-front",
    );
    vi.unstubAllEnvs();
  });
});

describe("order labels", () => {
  it("names the first timeline event 'Order placed' whatever the payment method", () => {
    expect(timelineLabel("PENDING")).toBe("Order placed");
    expect(orderStatus("PENDING").label).toBe("Awaiting payment");
  });
});
