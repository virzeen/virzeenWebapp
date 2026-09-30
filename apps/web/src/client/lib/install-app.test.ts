import { describe, expect, it } from "vitest";
import { installMode } from "./install-app";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const env = (userAgent: string, overrides: Partial<Parameters<typeof installMode>[0]> = {}) => ({
  userAgent,
  maxTouchPoints: 5,
  standalone: false,
  canPrompt: false,
  ...overrides,
});

describe("installMode", () => {
  it("uses the browser's install panel on Android when it offers one", () => {
    expect(installMode(env(ANDROID, { canPrompt: true }))).toBe("prompt");
  });

  it("shows the Android guide when there's no offer (Firefox, or the offer was already used)", () => {
    expect(installMode(env(ANDROID))).toBe("android");
  });

  it("shows the iPhone guide on iPhone and on iPads that report themselves as a Mac", () => {
    expect(installMode(env(IPHONE))).toBe("ios");
    expect(installMode(env(IPAD_AS_MAC))).toBe("ios");
  });

  it("hides the button on computers, even when Chrome offers to install", () => {
    expect(installMode(env(WINDOWS, { canPrompt: true, maxTouchPoints: 0 }))).toBe("none");
    expect(installMode(env(IPAD_AS_MAC, { maxTouchPoints: 0 }))).toBe("none");
  });

  it("hides the button inside the installed app", () => {
    expect(installMode(env(ANDROID, { standalone: true, canPrompt: true }))).toBe("none");
    expect(installMode(env(IPHONE, { standalone: true }))).toBe("none");
  });
});
