import { useState } from "react";
import { getInitials, resolveFileUrl } from "../../utils/formatters";

/** User avatar: image when available, initials otherwise. */
export default function Avatar({ user, size = 32, className = "" }) {
  const [failed, setFailed] = useState(false);
  const name = user?.name || user?.username || "";
  const src = resolveFileUrl(user?.avatar || user?.profilePicture || user?.image);
  const style = { width: size, height: size, fontSize: size * 0.38 };
  return src && !failed ? (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span style={style} aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-900 font-semibold text-white ${className}`}>{getInitials(name)}</span>
  );
}
