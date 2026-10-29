import { forwardRef } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-brand-700 text-white hover:bg-brand-900",
  secondary: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-slate-50",
  soft: "bg-brand-50 text-brand-900 hover:bg-brand-100",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const SIZES = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "h-10 w-10" };

/** Class string shared by <Button> and router <Link>s that should look like buttons. */
export const buttonClasses = (variant = "primary", size = "md", extra = "") =>
  `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

/**
 * Button with press feedback.
 * @param {"primary"|"secondary"|"soft"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"|"icon"} size
 * @param {boolean} loading shows a spinner and disables the button
 */
const Button = forwardRef(function Button({ variant = "primary", size = "md", loading = false, disabled, className = "", children, type = "button", ...rest }, ref) {
  return (
    <motion.button ref={ref} type={type} whileTap={{ scale: 0.97 }} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, size, className)} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  );
});
export default Button;
