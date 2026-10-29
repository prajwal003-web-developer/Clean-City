import { API_ORIGIN, CATEGORIES, STATUS } from "./constants";

/** Absolute URL for a file object/path returned by the API. Never prefixes /api. */
export function resolveFileUrl(file) {
  const raw = typeof file === "string" ? file : file?.path || file?.url;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  let path = raw.replace(/\\/g, "/"); // multer on Windows stores backslashes
  const uploadsAt = path.indexOf("uploads/");
  if (uploadsAt > 0) path = path.slice(uploadsAt); // drop "public/" style prefixes
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
}

/** Identifier used when asking the backend to remove an existing file. */
export const getFileId = (file) => file?._id ?? file?.id ?? file?.fileID ?? null;

/** Images of a report as [{ id, url }]; skips entries that cannot be resolved. */
export function getReportImages(report) {
  return (report?.files || [])
    .map((file) => ({ id: getFileId(file), url: resolveFileUrl(file) }))
    .filter((img) => img.url);
}

/** Accepts "in_progress", "In Progress", etc. and returns a known status value. */
export function normalizeStatus(status) {
  const value = String(status || "").toLowerCase().trim().replace(/[\s_]+/g, "-");
  return Object.values(STATUS).includes(value) ? value : STATUS.PENDING;
}

/** Report coordinates as { lat, lng } from GeoJSON [lng, lat], or null when invalid. */
export function getReportCoords(report) {
  const coords = report?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords.map(Number);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return valid ? { lat, lng } : null;
}

export const getUserId = (user) => (user && typeof user === "object" ? user._id ?? user.id : user) ?? null;
export const getReportOwnerId = (report) => getUserId(report?.user);
export const getParticipantIds = (report) => (report?.cleanedBy || []).map(getUserId).filter(Boolean);
export const getCategory = (value) => CATEGORIES.find((c) => c.value === value) || { value, label: value || "Uncategorised", icon: CATEGORIES.at(-1).icon };

export function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function timeAgo(value) {
  if (!value) return "";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const steps = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  return "just now";
}

export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m away` : `${km.toFixed(1)} km away`;
}

export const formatCoords = (loc) => (loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "");
