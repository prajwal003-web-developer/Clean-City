import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../AuthShell";
import AuthForm from "../AuthForm";

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from?.pathname || "/";
  return (
    <AuthShell title="Join your neighbours" subtitle="Create an account to report problems and join cleanups."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-semibold text-brand-700 underline underline-offset-2">Sign in</Link></>}>
      <AuthForm mode="register" onSuccess={() => navigate(destination, { replace: true })} />
    </AuthShell>
  );
}
