export const storage = {
  getToken() {
    return localStorage.getItem("cf_token");
  },
  setToken(token) {
    if (!token) localStorage.removeItem("cf_token");
    else localStorage.setItem("cf_token", token);
  },
  getOrgId() {
    return localStorage.getItem("cf_orgId");
  },
  setOrgId(orgId) {
    if (!orgId) localStorage.removeItem("cf_orgId");
    else localStorage.setItem("cf_orgId", orgId);
  },
};
