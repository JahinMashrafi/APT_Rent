const controllerExports = {
  adminController: ["getAdminStats", "getVerificationQueue", "approveVerification", "rejectVerification", "getUsers", "createUserByAdmin", "toggleAdminRole", "toggleBanUser", "getDisputes", "resolveDispute"],
  applicationController: ["createApplication", "listApplications", "updateApplicationStatus"],
  appointmentController: ["requestTour", "createAppointmentBatch", "confirmAppointment", "rejectProposalSlots", "listAppointments", "cancelAppointment"],
  appointmentRescheduleController: ["rescheduleAppointment", "getAppointment"],
  authController: ["loginUser", "registerUser", "getCurrentUser", "logoutUser"],
  contractActionsController: ["activateContract", "terminateContract"],
  contractController: ["createContract", "listContracts", "getContractById", "signContract", "payDeposit", "negotiateContract", "acceptContract"],
  conversationController: ["listConversations", "startConversation", "getMessages", "sendMessage", "markRead"],
  disputeController: ["listDisputes", "getDispute", "createDispute"],
  historyController: ["getHistory"],
  landlordController: ["getLandlordLedger", "getLandlordStats", "getLandlordProperties"],
  leaseSummaryController: ["defaultTerms", "previewSummary", "getSummary", "updateSummary"],
  maintenanceController: ["listMaintenance", "getMaintenance", "createMaintenance", "updateMaintenanceStatus"],
  messageController: ["getConversations", "createConversation", "getConversationMessages", "postMessage", "markConversationRead"],
  notificationController: ["getNotifications", "markNotificationRead", "markAllNotificationsRead"],
  paymentController: ["createPayment"],
  propertyController: ["getProperties", "getPropertyById", "createProperty", "updateProperty", "deleteProperty", "setPropertyVisibility", "uploadPropertyPhotos", "deletePropertyPhoto", "updatePropertyVisibility"],
  rentController: ["getCurrentRent", "scheduleCashPickup"],
  reviewController: ["getUserReviews", "createReview"],
  savedController: ["listSaved", "listSavedIds", "saveProperty", "unsaveProperty"],
  tenantDashboardController: ["getTenantDashboard"],
  unitsController: ["getUnits"],
  userController: ["getUsers", "updateUser", "deleteUser", "getMe", "updateMe", "uploadDocuments", "uploadAvatarImage", "removeAvatar", "getProfileDetail", "getPublicProfile"],
};

describe("backend controller export surface", () => {
  for (const [moduleName, functions] of Object.entries(controllerExports)) {
    it(`${moduleName} exports every controller handler`, () => {
      const controller = require(`./${moduleName}.js`);
      for (const functionName of functions) {
        expect(controller[functionName], `${moduleName}.${functionName}`).toEqual(expect.any(Function));
      }
    });
  }
});
