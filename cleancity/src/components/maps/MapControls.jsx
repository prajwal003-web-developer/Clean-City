import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { Expand, LocateFixed } from "lucide-react";

/** Recenter and fit-all buttons rendered above the map. Must be a child of MapContainer. */
export default function MapControls({ userLocation, onFit }) {
  const map = useMap();
  const ref = useRef(null);
  useEffect(() => { if (ref.current) L.DomEvent.disableClickPropagation(ref.current); }, []);
  const btn = "flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink shadow-card ring-1 ring-line transition hover:bg-slate-50 disabled:opacity-40";
  return (
    <div ref={ref} className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <button type="button" className={btn} disabled={!userLocation} aria-label="Centre on my location" onClick={() => map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 14))}>
        <LocateFixed className="h-5 w-5" />
      </button>
      <button type="button" className={btn} aria-label="Show all reports" onClick={onFit}>
        <Expand className="h-5 w-5" />
      </button>
    </div>
  );
}
