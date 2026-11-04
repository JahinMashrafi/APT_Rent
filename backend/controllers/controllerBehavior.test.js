const query = vi.fn();

vi.mock("../config/db.js", () => ({ query }));
vi.mock("../utils/notify.js", () => ({ notify: vi.fn() }));
vi.mock("../utils/socket.js", () => ({ emitToUser: vi.fn(), isUserOnline: vi.fn(() => false) }));
vi.mock("../utils/storage.js", () => ({ uploadToBucket: vi.fn(), deleteFromBucket: vi.fn() }));
vi.mock("../utils/signFields.js", () => ({
  signFields: vi.fn((value) => value),
  USER_SIGNED_FIELDS: [],
  PAYMENT_SIGNED_FIELDS: [],
  CONTRACT_SIGNED_FIELDS: [],
}));
vi.mock("../utils/reviewEligibility.js", () => ({
  getReviewEligibility: vi.fn(async () => ({ eligible: false })),
  REASONS: {},
}));
vi.mock("../utils/receipt.js", () => ({ generateReceipt: vi.fn(async () => Buffer.from("receipt")) }));
vi.mock("../utils/signature.js", () => ({ saveBase64Signature: vi.fn(async () => "signature.png") }));
vi.mock("../utils/contractPdf.js", () => ({ buildContractPdfBuffer: vi.fn(async () => Buffer.from("pdf")) }));
vi.mock("../services/appointmentLifecycle.js", () => ({ expirePastAppointments: vi.fn(async () => {}) }));
vi.mock("../utils/appointmentTime.js", () => ({
  APP_TIMEZONE: "Asia/Dhaka",
  MAX_DAYS_AHEAD: 90,
  normalizeDate: vi.fn((value) => value),
  normalizeTime: vi.fn((value) => value),
}));
vi.mock("../utils/leaseDefaults.js", () => ({
  addMonths: vi.fn((date) => date),
  monthsBetween: vi.fn(() => 1),
  buildDefaultTerms: vi.fn(() => ({})),
  todayYmd: vi.fn(() => "2026-01-01"),
  formatDuration: vi.fn(() => "1 month"),
}));
vi.mock("bcrypt", () => ({ hash: vi.fn(async () => "hash"), compare: vi.fn(async () => false) }));

// CommonJS controllers retain the cached database module, so replace its query
// method explicitly in addition to the Vitest module mock.
const pool = require("../config/db.js");
pool.query = query;

const response = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn((body) => body);
  res.cookie = vi.fn();
  res.clearCookie = vi.fn();
  return res;
};
const request = (extra = {}) => ({
  user: { user_id: 7, is_tenant: true, is_landlord: false, is_admin: false },
  query: {},
  params: {},
  body: {},
  ...extra,
});
const load = (name) => require(`./${name}.js`);

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue({ rows: [] });
});

describe("controller handler behavior", () => {
  it("lists units and separates vacant properties", async () => {
    query.mockResolvedValueOnce({ rows: [{ property_id: 1, address: "A", availability_status: "available", listing_rate: 100, is_hidden: false }] });
    const res = response();
    await load("unitsController").getUnits(request(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { occupied: [], vacant: [expect.objectContaining({ property_id: 1, rent: 100 })] } });
  });

  it("returns notification data and unread count", async () => {
    query.mockResolvedValueOnce({ rows: [{ notification_id: 2 }] }).mockResolvedValueOnce({ rows: [{ count: 3 }] });
    const res = response();
    await load("notificationController").getNotifications(request({ query: { limit: "200" } }), res);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("LIMIT $2"), [7, 100]);
    expect(res.json).toHaveBeenCalledWith({ unread_count: 3, data: [{ notification_id: 2 }] });
  });

  it("maps history rows for the current user", async () => {
    query.mockResolvedValueOnce({ rows: [{ history_id: 1, billing_month: "2026-01-01", payment_status: "due" }] });
    const res = response();
    await load("historyController").getHistory(request(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data[0]).toMatchObject({ history_id: 1, payment_status: "due", month: expect.any(String) });
  });

  it("reports a tenant pending lease when no active lease exists", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ contract_id: 4, status: "draft", address: "A" }] });
    const res = response();
    await load("tenantDashboardController").getTenantDashboard(request(), res);
    expect(res.json).toHaveBeenCalledWith({ data: null, pending_lease: { contract_id: 4, status: "draft", address: "A" } });
  });

  it("rejects malformed registration before touching the database", async () => {
    const res = response();
    await load("authController").registerUser(request(), res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(query).not.toHaveBeenCalled();
  });

  const listCases = [
    ["adminController", "getAdminStats", { user: { user_id: 1, is_admin: true } }],
    ["applicationController", "listApplications", {}],
    ["appointmentController", "listAppointments", {}],
    ["appointmentRescheduleController", "getAppointment", { params: { id: 1 } }],
    ["contractActionsController", "activateContract", { params: { id: 1 } }],
    ["contractController", "listContracts", {}],
    ["conversationController", "listConversations", {}],
    ["disputeController", "listDisputes", {}],
    ["landlordController", "getLandlordProperties", {}],
    ["leaseSummaryController", "defaultTerms", {}],
    ["maintenanceController", "listMaintenance", {}],
    ["messageController", "getConversations", {}],
    ["paymentController", "createPayment", {}],
    ["propertyController", "getProperties", {}],
    ["rentController", "getCurrentRent", {}],
    ["reviewController", "getUserReviews", {}],
    ["savedController", "listSaved", {}],
    ["userController", "getUsers", { user: { user_id: 1, is_admin: true }, query: {} }],
  ];

  it.each(listCases)("executes %s.%s and returns an HTTP response", async (moduleName, handlerName, extra) => {
    if (moduleName === "appointmentRescheduleController") {
      await expect(load(moduleName)[handlerName](request(extra), response())).rejects.toMatchObject({
        message: "Appointment not found",
      });
      return;
    }
    const res = response();
    await load(moduleName)[handlerName](request(extra), res);
    expect(res.status).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});
