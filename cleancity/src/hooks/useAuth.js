import { useAuthStore } from "../features/auth/authStore";

/** Convenience selector for the current session. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  return { user, isAuthenticated, isInitialized, userId: user?._id ?? user?.id ?? null, isAdmin: user?.role === "admin" };
}
