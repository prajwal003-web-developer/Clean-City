import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { PageLoader } from "../components/common/States";
import { useAuth } from "../hooks/useAuth";

const page = (loader) => ({ lazy: async () => ({ Component: (await loader()).default }) });

/** Blocks protected pages until the session check finishes; remembers where the user was going. */
function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();
  if (!isInitialized) return <PageLoader label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Sends signed-in users away from login/register. */
function GuestRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();
  if (!isInitialized) return <PageLoader label="Loading" />;
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || "/"} replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", ...page(() => import("../features/auth/pages/LoginPage")) },
      { path: "/register", ...page(() => import("../features/auth/pages/RegisterPage")) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, ...page(() => import("../features/home/HomePage")) },
          { path: "reports/new", ...page(() => import("../features/reports/pages/CreateReportPage")) },
          { path: "reports/:id", ...page(() => import("../features/reports/pages/ReportDetailsPage")) },
          { path: "reports/:id/edit", ...page(() => import("../features/reports/pages/EditReportPage")) },
          { path: "map", ...page(() => import("../features/map/MapPage")) },
          { path: "profile", ...page(() => import("../features/profile/ProfilePage")) },
        ],
      },
    ],
  },
  { path: "*", ...page(() => import("../features/not-found/NotFoundPage")) },
]);
