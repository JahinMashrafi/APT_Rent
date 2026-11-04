import { createRequire } from "node:module";
import { vi } from "vitest";

const require = createRequire(import.meta.url);
const pool = require("../config/db.js");
const jwtService = require("../config/JWT.js");
const {
  requireAdmin,
  requireAuth,
  requireLandlord,
  requireTenant,
} = require("./authMiddleware.js");

const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe("authentication middleware", () => {
  const verifyToken = vi.spyOn(jwtService, "verifyToken");
  const query = vi.spyOn(pool, "query");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing and invalid tokens", async () => {
    const missingResponse = response();
    await requireAuth({ cookies: {} }, missingResponse, vi.fn());
    expect(missingResponse.status).toHaveBeenCalledWith(401);

    verifyToken.mockRejectedValueOnce(new Error("expired"));
    const invalidResponse = response();
    await requireAuth({ cookies: { accessToken: "bad" } }, invalidResponse, vi.fn());
    expect(invalidResponse.status).toHaveBeenCalledWith(403);
  });

  it("stores decoded users and enforces landlord and tenant roles", async () => {
    verifyToken.mockResolvedValueOnce({ user_id: 7, is_landlord: true });
    const request = { cookies: { accessToken: "valid" } };
    const next = vi.fn();
    await requireAuth(request, response(), next);
    expect(request.user).toMatchObject({ user_id: 7 });
    expect(next).toHaveBeenCalled();

    const landlordNext = vi.fn();
    requireLandlord({ user: { is_landlord: true } }, response(), landlordNext);
    expect(landlordNext).toHaveBeenCalled();
    const tenantResponse = response();
    requireTenant({ user: { is_tenant: false } }, tenantResponse, vi.fn());
    expect(tenantResponse.status).toHaveBeenCalledWith(403);
  });

  it("checks admin status in the database and forwards query errors", async () => {
    const missingResponse = response();
    await requireAdmin({}, missingResponse, vi.fn());
    expect(missingResponse.status).toHaveBeenCalledWith(403);

    query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
    const next = vi.fn();
    await requireAdmin({ user: { user_id: 2 } }, response(), next);
    expect(next).toHaveBeenCalled();

    query.mockRejectedValueOnce(new Error("database down"));
    const errorNext = vi.fn();
    await requireAdmin({ user: { user_id: 2 } }, response(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
