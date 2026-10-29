import { useCallback, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/map.css";
import MapMarker from "./MapMarker";
import MapControls from "./MapControls";
import { userIcon } from "./mapIcons";
import { getReportCoords } from "../../utils/formatters";
import { MAP_DEFAULT, TILE_ATTRIBUTION, TILE_URL } from "../../utils/constants";

/** Fits the viewport to markers (and the user) whenever `fitKey` changes. */
function FitToPoints({ points, userLocation, fitKey, registerFit }) {
  const map = useMap();
  const fit = useCallback(() => {
    const all = [...points.map((p) => [p.lat, p.lng]), ...(userLocation ? [[userLocation.lat, userLocation.lng]] : [])];
    if (all.length === 0) return;
    if (all.length === 1) map.setView(all[0], 15);
    else map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 16, animate: true });
  }, [map, points, userLocation]);
  useEffect(() => { registerFit(fit); }, [fit, registerFit]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fit(); }, [fitKey]);
  return null;
}

/** Pans to the selected report when selection changes. */
function FlyToActive({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [target, map]);
  return null;
}

/**
 * Leaflet map showing report markers, the user's position and controls.
 * @param {object[]} reports reports with GeoJSON `location`; invalid ones are skipped
 * @param {string|null} activeId highlighted report id
 * @param {(id: string) => void} onSelect called when a marker is clicked
 * @param {{lat:number,lng:number}|null} userLocation
 * @param {string} fitKey change this to re-fit the viewport (e.g. after a new fetch)
 */
export default function InteractiveMap({ reports, activeId, onSelect, userLocation, fitKey, className = "" }) {
  const items = useMemo(() => reports.map((report) => ({ report, position: getReportCoords(report) })).filter((i) => i.position), [reports]);
  const points = useMemo(() => items.map((i) => i.position), [items]);
  const activePosition = useMemo(() => items.find((i) => i.report._id === activeId)?.position ?? null, [items, activeId]);
  const fitRef = useRef(() => {});
  const registerFit = useCallback((fn) => { fitRef.current = fn; }, []);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <MapContainer center={userLocation ? [userLocation.lat, userLocation.lng] : MAP_DEFAULT.center} zoom={userLocation ? 13 : MAP_DEFAULT.zoom} zoomControl={false} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <ZoomControl position="bottomright" />
        <FitToPoints points={points} userLocation={userLocation} fitKey={fitKey} registerFit={registerFit} />
        <FlyToActive target={activePosition} />
        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} interactive={false} keyboard={false} />}
        {items.map(({ report, position }) => (
          <MapMarker key={report._id} report={report} position={position} active={report._id === activeId} onSelect={onSelect} />
        ))}
        <MapControls userLocation={userLocation} onFit={() => fitRef.current()} />
      </MapContainer>
    </div>
  );
}
