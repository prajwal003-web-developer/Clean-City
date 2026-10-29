import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Home, LogOut, Map as MapIcon, MapPin, Plus, User } from "lucide-react";
import Logo from "./Logo";
import Avatar from "../common/Avatar";
import { buttonClasses } from "../common/Button";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../features/auth/authStore";
import { useReportStore } from "../../features/reports/reportStore";
import { formatCoords } from "../../utils/formatters";

const NAV = [{ to: "/", label: "Home", icon: Home, end: true }, { to: "/map", label: "Explore map", icon: MapIcon }];
const linkClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-900" : "text-muted hover:text-ink"}`;

/** Avatar dropdown with profile link and sign out. Closes on outside click and Escape. */
function ProfileMenu() {
  const { user } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-slate-100">
        <Avatar user={user} size={32} /><ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" /><span className="sr-only">Account menu</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-xl">
            <p className="truncate px-3 py-2 text-sm font-medium">{user?.name || user?.email}</p>
            <button role="menuitem" onClick={() => { setOpen(false); navigate("/profile"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><User className="h-4 w-4" />Profile</button>
            <button role="menuitem" onClick={() => { setOpen(false); logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Top bar (desktop + mobile header). */
function Navbar() {
  const userLocation = useReportStore((s) => s.userLocation);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="CleanCity home"><Logo /></Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>{n.label}</NavLink>)}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {userLocation && (
            <span className="hidden items-center gap-1.5 rounded-full bg-aqua-50 px-3 py-1.5 text-xs font-medium text-aqua-700 lg:flex" title="Your selected area">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />{userLocation.source === "device" ? "Near you" : "Chosen area"} · {formatCoords(userLocation)}
            </span>
          )}
          <Link to="/reports/new" className={`${buttonClasses("primary", "sm")} hidden md:inline-flex`}><Plus className="h-4 w-4" aria-hidden="true" />Report a spot</Link>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

/** Compact bottom navigation for small screens with a prominent create action. */
function MobileNavigation() {
  const item = ({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${isActive ? "text-brand-900" : "text-muted"}`;
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-safe md:hidden">
      <div className="mx-auto flex max-w-md items-end px-2">
        <NavLink to="/" end className={item}><Home className="h-5 w-5" />Home</NavLink>
        <div className="flex flex-1 justify-center">
          <Link to="/reports/new" aria-label="Report a spot" className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg ring-4 ring-white"><Plus className="h-7 w-7" /></Link>
        </div>
        <NavLink to="/map" className={item}><MapIcon className="h-5 w-5" />Map</NavLink>
        <NavLink to="/profile" className={item}><User className="h-5 w-5" />Profile</NavLink>
      </div>
    </nav>
  );
}

/** Shell for authenticated pages: navigation, page transition, footer. */
export default function AppLayout() {
  const location = useLocation();
  const navigation = useNavigation();
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {navigation.state === "loading" && <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-aqua-500" role="progressbar" aria-label="Loading page" />}
      <Navbar />
      <motion.main id="main" key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-12">
        <Outlet />
      </motion.main>
      <footer className="hidden border-t border-line py-6 text-center text-xs text-muted md:block">CleanCity · Map data © OpenStreetMap contributors</footer>
      <MobileNavigation />
    </div>
  );
}
