describe("JWT service", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "1h";
  });

  it("generates and verifies tokens", async () => {
    const jwtService = require("./JWT.js");
    const token = await jwtService.generateToken({ user_id: 7 });
    await expect(jwtService.verifyToken(token)).resolves.toMatchObject({ user_id: 7 });
  });

  it("rejects malformed tokens", async () => {
    const jwtService = require("./JWT.js");
    await expect(jwtService.verifyToken("not-a-token")).rejects.toBeInstanceOf(Error);
  });
});
