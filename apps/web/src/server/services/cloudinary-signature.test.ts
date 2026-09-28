import { describe, expect, it } from "vitest";
import { cloudinarySignature } from "./cloudinary-signature";

describe("cloudinarySignature", () => {
  it("matches the worked example in Cloudinary's signed-upload docs", () => {
    const params = {
      timestamp: "1315060510",
      public_id: "sample_image",
      eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
    };
    expect(cloudinarySignature(params, "abcd")).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
});
