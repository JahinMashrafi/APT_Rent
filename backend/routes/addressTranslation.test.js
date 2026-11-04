process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

const cacheRows = [];
const queryBuilder = {
  select: vi.fn(() => queryBuilder),
  in: vi.fn(async () => ({ data: cacheRows, error: null })),
  upsert: vi.fn(async () => ({ error: null })),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => queryBuilder),
  })),
}));

const router = require("./addressTranslation.js");

const postLayer = router.stack.find(
  (layer) => layer.route?.path === "/addresses" && layer.route.methods.post,
);
const handler = postLayer.route.stack[postLayer.route.stack.length - 1].handle;

const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe("address translation route validation", () => {
  it("rejects malformed, oversized, and non-string address lists", async () => {
    const invalid = response();
    await handler({ body: {} }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);

    const tooMany = response();
    await handler({ body: { addresses: Array.from({ length: 21 }, () => "A") } }, tooMany);
    expect(tooMany.status).toHaveBeenCalledWith(400);

    const nonString = response();
    await handler({ body: { addresses: [42] } }, nonString);
    expect(nonString.status).toHaveBeenCalledWith(400);
  });

  it("returns empty results without calling the translation provider", async () => {
    const result = response();
    await handler({ body: { addresses: ["", "বাংলা Road", "বাংলা Road"] } }, result);
    expect(result.status).toHaveBeenCalledWith(200);
    expect(result.json).toHaveBeenCalledWith({
      translations: [
        { source: "বাংলা Road", translated: "বাংলা Road", cached: false },
        { source: "বাংলা Road", translated: "বাংলা Road", cached: false },
      ],
    });
  });
});
