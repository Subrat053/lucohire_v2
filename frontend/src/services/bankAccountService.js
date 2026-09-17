import { AUTH_API, ADMIN_API } from "./api";

const bankAccountService = {
  // Manager/Partner functions
  getManagerBankAccount: () => AUTH_API.get("/manager/bank-account"),
  createManagerBankAccount: (data) => AUTH_API.post("/manager/bank-account", data),
  updateManagerBankAccount: (data) => AUTH_API.put("/manager/bank-account", data),
  deleteManagerBankAccount: () => AUTH_API.delete("/manager/bank-account"),

  // Admin functions
  getAdminManagerBankAccounts: (params) => ADMIN_API.get("/admin/manager-bank-accounts", { params }),
  getAdminManagerBankAccountById: (id) => ADMIN_API.get(`/admin/manager-bank-accounts/${id}`),
  verifyManagerBankAccount: (id, data) => ADMIN_API.patch(`/admin/manager-bank-accounts/${id}/verify`, data),

  // Partner Payout functions
  getAdminPartnerPayouts: (params) => ADMIN_API.get("/admin/partners/payouts/all", { params }),
  approvePartnerPayout: (id, data) => ADMIN_API.patch(`/admin/partners/payouts/${id}/approve`, data),
  rejectPartnerPayout: (id, data) => ADMIN_API.patch(`/admin/partners/payouts/${id}/reject`, data),
};

export default bankAccountService;
