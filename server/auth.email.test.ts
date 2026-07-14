import { describe, expect, it } from "vitest";
import { emailLoginInputSchema } from "./routers";

describe("auth.loginWithEmail input", () => {
  it("normalizes copied email addresses before validation", () => {
    const input = emailLoginInputSchema.parse({
      email: "  TEAM.Member@Example.COM  ",
    });

    expect(input.email).toBe("team.member@example.com");
  });

  it("rejects non-email input", () => {
    expect(() => emailLoginInputSchema.parse({ email: "not-an-email" })).toThrow();
  });
});
