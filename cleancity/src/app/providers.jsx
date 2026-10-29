import { MotionConfig } from "motion/react";
import { Toaster } from "react-hot-toast";

/** App-wide providers. `reducedMotion="user"` makes Framer Motion respect the OS setting. */
export default function Providers({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 3500, style: { borderRadius: "14px", color: "#0F172A" } }} />
    </MotionConfig>
  );
}
