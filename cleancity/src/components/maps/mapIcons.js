import L from "leaflet";
import { STATUS_META } from "../../utils/constants";

const GLYPHS = {
  pending: '<circle cx="16" cy="15.5" r="4" fill="#fff"/>',
  "in-progress": '<circle cx="16" cy="15.5" r="5" fill="none" stroke="#fff" stroke-width="2"/>',
  resolved: '<path d="M11.5 15.5l3.2 3.2 6-6.4" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};
const cache = new Map();

/** Status-coloured pin. divIcon avoids Leaflet's default-icon asset problems under Vite. */
export function getPinIcon(status, active) {
  const key = `${status}:${active}`;
  if (!cache.has(key)) {
    const color = STATUS_META[status].pin;
    cache.set(key, L.divIcon({
      className: "",
      html: `<div class="cc-pin ${active ? "is-active" : ""}"><svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="M16 39C16 39 28 25.5 28 15.5C28 8.6 22.6 3 16 3S4 8.6 4 15.5C4 25.5 16 39 16 39Z" fill="${color}" stroke="#fff" stroke-width="2"/>${GLYPHS[status]}</svg></div>`,
      iconSize: [32, 40], iconAnchor: [16, 39], popupAnchor: [0, -36],
    }));
  }
  return cache.get(key);
}

export const userIcon = L.divIcon({ className: "", html: '<span class="cc-user"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
