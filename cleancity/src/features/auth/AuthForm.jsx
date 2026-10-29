import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "../../components/common/Button";
import { Input } from "../../components/common/Field";
import { useAuthStore } from "./authStore";
import { validateCredentials } from "../../utils/validators";

export default function AuthForm({ mode, onSuccess }) {
  const isRegister = mode === "register";
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const set = (field) => (e) => {
    const value = e.target.value;

    setValues((v) => ({ ...v, [field]: value }));

    if (error) clearError();

    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    const found = validateCredentials(values, { isRegister });
    setErrors(found);

    if (Object.keys(found).length) return;

    const payload = isRegister
      ? {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
          role: values.role,
        }
      : {
          email: values.email.trim(),
          password: values.password,
        };

    const ok = await (isRegister ? register(payload) : login(payload));

    if (ok) onSuccess();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {isRegister && (
        <>
          <Input
            label="Name"
            autoComplete="name"
            value={values.name}
            onChange={set("name")}
            error={errors.name}
          />

          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={set("phone")}
            error={errors.phone}
          />
        </>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={set("email")}
        error={errors.email}
      />

      {isRegister && (
        <div className="space-y-2">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-ink"
          >
            Register as
          </label>

          <select
            id="role"
            name="role"
            value={values.role}
            onChange={set("role")}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="user">User</option>
            <option value="ngo">NGO</option>
          </select>
        </div>
      )}

      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete={isRegister ? "new-password" : "current-password"}
        value={values.password}
        onChange={set("password")}
        error={errors.password}
        hint={isRegister ? "At least 8 characters." : undefined}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="rounded-lg p-2 text-muted hover:text-ink"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={isLoading}
      >
        {isRegister ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}