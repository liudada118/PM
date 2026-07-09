import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createGuestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Admin User");
  });

  it("returns null when unauthenticated", async () => {
    const ctx = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("auth.logout", () => {
  it("returns success and clears cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...createAdminCtx(),
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

describe("wiki procedures (protected)", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wiki.list()).rejects.toThrow();
  });
});

describe("issues procedures (protected)", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.issues.list()).rejects.toThrow();
  });
});

describe("cycles procedures (protected)", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cycles.list()).rejects.toThrow();
  });
});

describe("feedback procedures (protected)", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.feedback.list()).rejects.toThrow();
  });
});

describe("featureRequests procedures (protected)", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.featureRequests.list()).rejects.toThrow();
  });
});
