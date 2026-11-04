const { expirePastAppointments } = require("./appointmentLifecycle.js");

describe("appointment lifecycle", () => {
  it("expires appointments and reports affected rows", async () => {
    const db = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 3 }),
    };
    await expect(expirePastAppointments(db)).resolves.toEqual({
      expired: 3,
      completed: 0,
    });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("returns a safe result when the sweep query fails", async () => {
    const db = {
      query: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };
    await expect(expirePastAppointments(db)).resolves.toMatchObject({
      expired: 0,
      completed: 0,
      error: "database unavailable",
    });
  });
});
