const { vi } = globalThis;

describe("storage helpers", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubGlobal("fetch", vi.fn());
    vi.resetModules();
  });

  it("uploads public and private objects with the correct response shape", async () => {
    fetch.mockResolvedValue({ ok: true, text: vi.fn() });
    const { uploadToBucket } = require("./storage.js");
    await expect(uploadToBucket("avatars", "user/a.png", Buffer.from("a"), "image/png"))
      .resolves.toEqual({
        path: "user/a.png",
        url: "https://example.supabase.co/storage/v1/object/public/avatars/user/a.png",
      });
    await expect(uploadToBucket("signatures", "contract/a.png", Buffer.from("a"), "image/png"))
      .resolves.toEqual({ path: "contract/a.png", url: null });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("signs paths, skips empty paths, and deletes objects", async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ signedURL: "/object/sign/x" }) })
      .mockResolvedValueOnce({ ok: true });
    const { getSignedUrl, deleteFromBucket } = require("./storage.js");
    await expect(getSignedUrl("signatures", "contract/a.png", 60))
      .resolves.toBe("https://example.supabase.co/storage/v1/object/sign/x");
    await expect(getSignedUrl("signatures", null)).resolves.toBeNull();
    await expect(deleteFromBucket("signatures", "contract/a.png")).resolves.toBeUndefined();
    await expect(deleteFromBucket("signatures", null)).resolves.toBeUndefined();
  });

  it("surfaces storage HTTP failures", async () => {
    fetch.mockResolvedValue({ ok: false, text: vi.fn().mockResolvedValue("nope") });
    const { uploadToBucket, getSignedUrl, deleteFromBucket } = require("./storage.js");
    await expect(uploadToBucket("x", "a", Buffer.from("a"), "text/plain")).rejects.toThrow("Upload failed: nope");
    await expect(getSignedUrl("x", "a")).rejects.toThrow("Sign failed: nope");
    await expect(deleteFromBucket("x", "a")).rejects.toThrow("Delete failed: nope");
  });
});

describe("notification, review, and field-signing helpers", () => {
  it("writes notifications and propagates database failures", async () => {
    const db = require("../config/db.js");
    const query = vi.spyOn(db, "query").mockRejectedValueOnce(new Error("database down"));
    const { notify } = require("./notify.js");
    await expect(notify({ userId: 3, type: "message", title: "Hi", message: "Body" })).rejects.toThrow("database down");
    expect(query).toHaveBeenCalled();
    query.mockRestore();
  });

  it("evaluates review eligibility rules", async () => {
    const { getReviewEligibility, REASONS } = require("./reviewEligibility.js");
    expect(await getReviewEligibility("x", 2, { query: vi.fn() })).toEqual({
      canReview: false,
      reason: REASONS.NO_CONTRACT,
    });
    expect(await getReviewEligibility(2, 2, { query: vi.fn() })).toEqual({
      canReview: false,
      reason: REASONS.SELF,
    });
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ contract_id: 9, owner_id: 1, tenant_id: 2 }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    await expect(getReviewEligibility(1, 2, db)).resolves.toMatchObject({
      canReview: true,
      reason: REASONS.OK,
      contractId: 9,
      reviewerRole: "landlord",
    });
  });

  it("signs only fields present on a row", async () => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ signedURL: "/signed/r" }),
    }));
    const { signFields } = require("./signFields.js");
    await expect(signFields({ receipt_url: "r", untouched: true }, {
      receipt_url: "receipts",
      missing: "bucket",
    })).resolves.toEqual({
      receipt_url: "https://example.supabase.co/storage/v1/signed/r",
      untouched: true,
    });
    await expect(signFields(null, { receipt_url: "receipts" })).resolves.toBeNull();
  });
});

describe("socket helpers", () => {
  it("reports initialization state and safely emits before initialization", () => {
    vi.resetModules();
    const { getIO, isUserOnline, emitToUser } = require("./socket.js");
    expect(() => getIO()).toThrow("Socket.IO not initialized");
    expect(isUserOnline(99)).toBe(false);
    expect(() => emitToUser(99, "message", {})).not.toThrow();
  });
});
