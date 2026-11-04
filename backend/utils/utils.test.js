const { normalizeDate, normalizeTime } = require("./appointmentTime.js");
const { contractPermissions, deriveNegotiationState, toDateOnly } = require("./contractState.js");
const { monthLabel, isoDate } = require("./dateFormat.js");
const { detectImageType } = require("./imageType.js");
const { addMonths, buildDefaultTerms, formatDuration, monthsBetween } = require("./leaseDefaults.js");
const AppError = require("./AppError.js");
const { buildContractPdfBuffer } = require("./contractPdf.js");
const { saveBase64Signature } = require("./signature.js");
const {
  buildEnvelope, classifyError, normalizeLegacy,
} = require("../middleware/errorEnvelope.js");

describe("appointment time helpers", () => {
  it("validates calendar dates and normalizes times", () => {
    expect(normalizeDate("2026-02-28")).toBe("2026-02-28");
    expect(normalizeDate("2026-02-29")).toBeNull();
    expect(normalizeTime("9:00 AM")).toBe("09:00");
    expect(normalizeTime("14:30:00")).toBe("14:30");
    expect(normalizeTime("25:00")).toBeNull();
  });
});

describe("contract state helpers", () => {
  it("derives negotiation state and party permissions", () => {
    expect(deriveNegotiationState({ negotiation_status: "tenant_proposed" }))
      .toBe("TENANT_PROPOSAL_SENT");
    expect(contractPermissions({
      owner_id: 1, tenant_id: 2, status: "draft", negotiation_status: "tenant_proposed",
    }, 1)).toMatchObject({
      viewer_role: "owner",
      can_accept: true,
      can_counter: true,
    });
    expect(contractPermissions({
      owner_id: 1, tenant_id: 2, status: "draft", negotiation_status: "tenant_proposed",
    }, 2)).toMatchObject({ awaiting_other_party: true, can_accept: false });
    expect(toDateOnly(new Date(2026, 9, 5))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("lease and date helpers", () => {
  it("handles month arithmetic, dates, terms, and durations", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(monthsBetween("2026-01-01", "2026-07-01")).toBe(6);
    expect(formatDuration(25)).toBe("2 years 1 month");
    expect(buildDefaultTerms({ startDate: "2026-01-01", endDate: "2027-01-01", deposit: 5000 }))
      .toContain("Security deposit of ৳5000.00");
    expect(monthLabel(new Date(2026, 0, 1))).toBe("January 2026");
    expect(isoDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });
});

describe("image and application errors", () => {
  it("detects supported image signatures", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, ...new Array(9).fill(0)])))
      .toMatchObject({ ext: "jpg", mime: "image/jpeg" });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(4).fill(0)]);
    expect(detectImageType(png)).toMatchObject({ ext: "png", mime: "image/png" });
    expect(detectImageType(Buffer.alloc(12))).toBeNull();
  });

  it("creates typed errors with details", () => {
    const error = AppError.validation("Invalid name", [{ field: "name" }]);
    expect(error).toMatchObject({
      name: "AppError",
      status: 400,
      code: "VALIDATION_ERROR",
      details: [{ field: "name" }],
    });
  });
});

describe("error envelope helpers", () => {
    it("normalizes legacy validation and business-rule responses", () => {
      expect(normalizeLegacy(422, { message: "rating is required" })).toMatchObject({
        status: 400,
        envelope: { error: { code: "VALIDATION_ERROR", details: [{ field: "rating" }] } },
      });
      expect(normalizeLegacy(422, { message: "You cannot review yourself" }).status).toBe(422);
      expect(normalizeLegacy(400, { errors: [{ field: "email", message: "Invalid email" }] }))
        .toMatchObject({
          status: 400,
          envelope: { error: { details: [{ field: "email", issue: "Invalid email" }] } },
        });
      expect(buildEnvelope("NOT_FOUND", "Missing")).toMatchObject({
        error: { code: "NOT_FOUND", message: "Missing", details: [] },
      });
    });

    it("classifies common framework, database, and auth errors", () => {
      expect(classifyError({ name: "TokenExpiredError" })).toMatchObject({ status: 401 });
      expect(classifyError({ type: "entity.too.large" })).toMatchObject({ status: 400 });
      expect(classifyError({ name: "MulterError", field: "avatar", message: "too large" }))
        .toMatchObject({ status: 400, details: [{ field: "avatar" }] });
      expect(classifyError({ code: "23505", constraint: "users_email_key" })).toMatchObject({ status: 409 });
      expect(classifyError(new Error("unexpected"))).toMatchObject({ status: 500 });
    });
});

describe("contract PDF generation", () => {
    it("returns a PDF buffer containing the contract metadata", async () => {
      const buffer = await buildContractPdfBuffer({
        landlordName: "Landlord",
        tenantName: "Tenant",
        tenantEmail: "tenant@example.com",
        propertyAddress: "1 Main Street",
        rate: 25000,
        depositAmount: 50000,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        contractId: 42,
        termsAndConditions: "Custom terms with ৳500",
        durationLabel: "1 year",
});
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buffer.length).toBeGreaterThan(1000);
    });
  });

  describe("signature input validation", () => {
    it("rejects malformed or unsupported data URLs", async () => {
      await expect(saveBase64Signature("not-an-image", "sig")).rejects.toThrow(
        "signature_image_base64",
      );
      await expect(saveBase64Signature("data:image/gif;base64,abc", "sig")).rejects.toThrow(
        "signature_image_base64",
      );
    });
  });
