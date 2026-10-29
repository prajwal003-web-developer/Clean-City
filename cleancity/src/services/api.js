import axios from "axios";
import { API_URL, AUTH_ENDPOINTS, AUTH_MODE, NEARBY } from "../utils/constants";

/**
 * Centralised API layer. Every backend request in the app goes through here.
 * Response envelopes vary between backends, so `payloadOf` / `listOf` / `entityOf`
 * normalise the shapes `{ data }`, `{ reports }`, `{ report }` and bare values.
 */

const TOKEN_KEY = "cleancity.token";
/** Only used when VITE_AUTH_MODE=bearer. Cookie mode never touches storage. */
export const tokenStorage = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (token) => { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

// const client = axios.create({ baseURL: API_URL, timeout: 20000, withCredentials: AUTH_MODE === "bearer" });

const client = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

let unauthorizedHandler = null;
/** Registered by the auth store so a 401 clears the session without a circular import. */
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

client.interceptors.request.use((config) => {
  if (AUTH_MODE === "bearer") {
    const token = tokenStorage.get();

    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Turns any Axios failure into an Error with `status` and `fieldErrors`. */
function toApiError(error) {
  const res = error.response;
  const data = res?.data;
  const list = Array.isArray(data?.errors) ? data.errors : null;
  const firstFromList = list?.[0]?.message || list?.[0]?.msg || (typeof list?.[0] === "string" ? list[0] : null);
  let message = data?.message || data?.error || firstFromList;
  if (!message) {
    if (error.code === "ECONNABORTED") message = "The server took too long to respond. Try again.";
    else if (!res) message = "Can't reach the server. Check your connection and the API URL.";
    else message = `Request failed (${res.status}).`;
  }
  const apiError = new Error(message);
  apiError.status = res?.status ?? 0;
  apiError.fieldErrors = !Array.isArray(data?.errors) && typeof data?.errors === "object" ? data.errors : {};
  return apiError;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    if (apiError.status === 401 && !error.config?.skipUnauthorizedHandler) unauthorizedHandler?.();
    return Promise.reject(apiError);
  }
);

const payloadOf = (res) => res.data?.data ?? res.data;
const listOf = (res) => {
  const p = payloadOf(res);
  return Array.isArray(p) ? p : p?.reports ?? p?.data ?? [];
};
const entityOf = (res, key) => {
  const p = payloadOf(res);
  return p?.[key] ?? p;
};

export const authAPI = {
  async login(credentials) {
    const res = await client.post(AUTH_ENDPOINTS.login, credentials, { skipUnauthorizedHandler: true });
    console.log(res.data.token);
    return { user: entityOf(res, "user"), token: res.data?.token ?? res.data?.data?.token ?? res.data?.accessToken };
  },
  async register(values) {
    const res = await client.post(AUTH_ENDPOINTS.register, values, { skipUnauthorizedHandler: true });
    return { user: entityOf(res, "user"), token: res.data?.token ?? res.data?.data?.token ?? res.data?.accessToken };
  },
  logout: () => client.post(AUTH_ENDPOINTS.logout, null, { skipUnauthorizedHandler: true }),
  async getMe() {
    const res = await client.get(AUTH_ENDPOINTS.me, { skipUnauthorizedHandler: true });
    return entityOf(res, "user");
  },
};

export const reportAPI = {
  async getAll(params) { return listOf(await client.get("/reports", { params })); },
  async getNearby({ lat, lng, radiusKm }) {
    const distance = NEARBY.distanceUnit === "meters" ? radiusKm * 1000 : radiusKm;
    const params = { [NEARBY.latParam]: lat, [NEARBY.lngParam]: lng, [NEARBY.distanceParam]: distance };
    return listOf(await client.get("/reports/nearby", { params }));
  },
  async getMine() { return listOf(await client.get("/reports/my-reports")); },
  async getById(id) { return entityOf(await client.get(`/reports/${id}`), "report"); },
  getJoined: async () => {
    const response = await client.get("/reports/joined");
    return entityOf(response, "reports");
  },

  updateStatus: async (id, status) => {
    return client.patch(`/reports/${id}/status`, { status });
  },
  /** `formData` must use the field name `files` for images; see ReportForm. */
  async create(formData, { onUploadProgress } = {}) {
    return entityOf(
      await client.post("/reports", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
        timeout: 60000,
      }),
      "report"
    );
  },
  async update(id, formData, { onUploadProgress } = {}) {
    return entityOf(await client.patch(`/reports/${id}`, formData, { onUploadProgress, timeout: 60000 }), "report");
  },
  delete: (id) => client.delete(`/reports/${id}`),
  async joinCleanup(id) { return payloadOf(await client.post(`/reports/${id}/join`)); },
  async leaveCleanup(id) { return payloadOf(await client.post(`/reports/${id}/leave`)); },
  async updateStatus(id, status) { return payloadOf(await client.patch(`/reports/${id}/status`, { status })); },
};
