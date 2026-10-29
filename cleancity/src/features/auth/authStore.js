import { create } from "zustand";
import { authAPI, setUnauthorizedHandler, tokenStorage } from "../../services/api";
import { AUTH_MODE } from "../../utils/constants";

let sessionRequest = null;

/**
 * Session state. `isInitialized` flips once the first session check finishes, so protected
 * routes never flash before we know who the user is. Passwords are never stored.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  async login(credentials) {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authAPI.login(credentials);
      return get()._startSession(user, token);
    } catch (error) {
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  async register(values) {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authAPI.register(values);
      return get()._startSession(user, token);
    } catch (error) {
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  /** Registration may not return a user/token; fall back to asking the server who we are. */
  async _startSession(user, token) {
    if (AUTH_MODE === "bearer" && token) tokenStorage.set(token);
    let current = user && (user._id || user.id) ? user : null;
    if (!current) {
      try { current = await authAPI.getMe(); } catch { current = null; }
    }
    if (!current) {
      set({ isLoading: false, error: "Signed in, but the server did not confirm your session." });
      return false;
    }
    set({ user: current, isAuthenticated: true, isLoading: false, isInitialized: true });
    return true;
  },

  async logout() {
    try { await authAPI.logout(); } catch { /* the local session is cleared regardless */ }
    get().handleUnauthorized();
  },

  /** Restores the session on app load. Concurrent calls share one request. */
  fetchCurrentUser() {
    if (sessionRequest) return sessionRequest;
    sessionRequest = authAPI.getMe()
      .then((user) => set({ user, isAuthenticated: Boolean(user), isInitialized: true }))
      .catch(() => { tokenStorage.clear(); set({ user: null, isAuthenticated: false, isInitialized: true }); })
      .finally(() => { sessionRequest = null; });
    return sessionRequest;
  },

  handleUnauthorized() {
    tokenStorage.clear();
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },

  clearError: () => set({ error: null }),
}));

setUnauthorizedHandler(() => useAuthStore.getState().handleUnauthorized());
