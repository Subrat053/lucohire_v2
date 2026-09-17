import API from "./api";

const partnerApi = {
  getDashboard: () => API.get("/v1/partner/dashboard"),
  getReferralLink: () => API.get("/v1/partner/referral-link"),
  getReferrals: (params = {}) => API.get("/v1/partner/referrals", { params }),
  createProvider: (data) => API.post("/v1/partner/referrals/provider", data),
  createRecruiter: (data) => API.post("/v1/partner/referrals/recruiter", data),
  requestPayout: (data) => API.post("/v1/partner/payout-request", data),
  getPayouts: () => API.get("/v1/partner/payouts"),
};

export default partnerApi;