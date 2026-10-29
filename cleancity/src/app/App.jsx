import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import Providers from "./providers";
import { PageLoader } from "../components/common/States";
import { useAuthStore } from "../features/auth/authStore";

/** Root component: restores the session once, then renders the router. */
export default function App() {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);
  return (
    <Providers>
      <RouterProvider router={router} fallbackElement={<PageLoader />} />
    </Providers>
  );
}
