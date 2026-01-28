const TOKEN_KEY = "token";
const ORG_ID_KEY = "org_id";
const ORG_NAME_KEY = "org_name";

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(v) {
    if (!v) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, v);
  },

  getOrgId() {
    return localStorage.getItem(ORG_ID_KEY);
  },
  setOrgId(v) {
    if (!v) localStorage.removeItem(ORG_ID_KEY);
    else localStorage.setItem(ORG_ID_KEY, v);
  },

  getOrgName() {
    return localStorage.getItem(ORG_NAME_KEY);
  },
  setOrgName(v) {
    if (!v) localStorage.removeItem(ORG_NAME_KEY);
    else localStorage.setItem(ORG_NAME_KEY, v);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ORG_ID_KEY);
    localStorage.removeItem(ORG_NAME_KEY);
  },
};
