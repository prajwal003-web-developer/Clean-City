import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../AuthShell";
import AuthForm from "../AuthForm";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from ? `${location.state.from.pathname}${location.state.from.search || ""}` : "/";
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see what needs cleaning near you."
      footer={<>New to CleanCity? <Link to="/register" state={location.state} className="font-semibold text-brand-700 underline underline-offset-2">Create an account</Link></>}>
      <AuthForm mode="login" onSuccess={() => navigate(destination, { replace: true })} />
    </AuthShell>
  );
}
