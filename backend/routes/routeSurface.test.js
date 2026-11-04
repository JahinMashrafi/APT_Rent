const routeModules = [
  "adminRoutes", "applicationRoutes", "appointmentRescheduleRoutes",
  "appointmentRoutes", "authRoutes", "contractActionRoutes", "contractRoutes",
  "conversationRoutes", "disputeRoutes", "historyRoutes", "landlordRoutes",
  "leaseSummaryRoutes", "maintenanceRoutes", "messageRoutes", "notificationRoutes",
  "paymentRoutes", "propertyRoutes", "rentRoutes", "reviewRoutes", "savedRoutes",
  "tenantRoutes", "unitsRoutes", "userRoutes",
];

describe("backend route surface", () => {
  for (const routeModule of routeModules) {
    it(`${routeModule} registers an Express router`, () => {
      const router = require(`./${routeModule}.js`);
      expect(router).toEqual(expect.objectContaining({ stack: expect.any(Array) }));
      expect(router.stack.length).toBeGreaterThan(0);
    });
  }
});
