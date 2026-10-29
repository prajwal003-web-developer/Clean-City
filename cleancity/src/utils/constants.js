import { Trash2, Recycle, Hammer, Droplets, TriangleAlert, Ellipsis } from "lucide-react";

const env = import.meta.env;

export const API_URL = env.VITE_API_URL || "http://localhost:5000/api";
/** Backend origin (no /api). Static uploads live here, e.g. http://localhost:5000/uploads/... */
export const API_ORIGIN = new URL(API_URL, window.location.origin).origin;
export const AUTH_MODE = env.VITE_AUTH_MODE === "bearer" ? "bearer" : "cookie";

/** Auth endpoints and payload shape. Verify against the backend auth routes. */
export const AUTH_ENDPOINTS = { login: "/user/login", register: "/user/register", logout: "/user/logout", me: "/user/me" };

/** Query contract for GET /reports/nearby. Verify against the backend controller. */
export const NEARBY = {
  latParam: env.VITE_NEARBY_LAT_PARAM || "lat",
  lngParam: env.VITE_NEARBY_LNG_PARAM || "lng",
  distanceParam: env.VITE_NEARBY_DISTANCE_PARAM || "distance",
  distanceUnit: env.VITE_NEARBY_DISTANCE_UNIT === "km" ? "km" : "meters",
};

export const DEFAULT_RADIUS_KM = 10;
export const RADIUS_OPTIONS_KM = [1, 3, 5, 10, 20, 50];

export const LIMITS = {
  titleMax: 150,
  descriptionMax: 1000,
  maxImages: 3,
  maxImageBytes: 5 * 1024 * 1024,
  imageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

/** Centralised category list. Values must match the backend's accepted categories. */
export const CATEGORIES = [
  { value: "garbage", label: "Garbage pile", icon: Trash2 },
  { value: "plastic", label: "Plastic waste", icon: Recycle },
  { value: "construction", label: "Construction debris", icon: Hammer },
  { value: "water", label: "Water pollution", icon: Droplets },
  { value: "hazardous", label: "Hazardous waste", icon: TriangleAlert },
  { value: "other", label: "Other", icon: Ellipsis },
];

export const STATUS = { PENDING: "pending", IN_PROGRESS: "in-progress", RESOLVED: "resolved" };

export const STATUS_META = {
  pending: { label: "Pending", dot: "bg-warn", chip: "bg-amber-50 text-amber-800 ring-amber-200", pin: "#F59E0B" },
  "in-progress": { label: "In progress", dot: "bg-aqua-500", chip: "bg-aqua-50 text-aqua-700 ring-cyan-200", pin: "#06B6D4" },
  resolved: { label: "Resolved", dot: "bg-brand-500", chip: "bg-brand-50 text-brand-900 ring-green-200", pin: "#16A34A" },
};

export const SORT_OPTIONS = [
  { value: "recent", label: "Most recent" },
  { value: "nearest", label: "Nearest" },
  { value: "participants", label: "Most participants" },
];

export const MAP_DEFAULT = { center: [20, 0], zoom: 2 };
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
