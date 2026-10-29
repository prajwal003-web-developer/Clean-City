import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/map.css";
import { LocateFixed, MapPin } from "lucide-react";
import Button from "../common/Button";
import { getPinIcon } from "./mapIcons";
import { useGeolocation } from "../../hooks/useGeolocation";
import { formatCoords } from "../../utils/formatters";
import { MAP_DEFAULT, TILE_ATTRIBUTION, TILE_URL } from "../../utils/constants";

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Moves the viewport when the chosen point changes from outside the map (e.g. GPS). */
function Follow({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15), { animate: true });
    // only when the point itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);
  return null;
}

/**
 * Pick a location by clicking the map, dragging the pin, or using the device location.
 * @param {{lat:number,lng:number}|null} value
 * @param {(v:{lat:number,lng:number}) => void} onChange
 */
export default function LocationPicker({ value, onChange, fallbackCenter, heightClass = "h-72" }) {
  const geo = useGeolocation();
  const markerRef = useRef(null);
  const handlers = useMemo(() => ({
    dragend() {
      const ll = markerRef.current?.getLatLng();
      if (ll) onChange({ lat: ll.lat, lng: ll.lng });
    },
  }), [onChange]);

  const useMyLocation = async () => {
    const coords = await geo.requestLocation();
    if (coords) onChange({ lat: coords.lat, lng: coords.lng });
  };
  const start = value || fallbackCenter;

  return (
    <div className="space-y-3">
      <div className={`relative isolate overflow-hidden rounded-2xl border border-line ${heightClass}`}>
        <MapContainer center={start ? [start.lat, start.lng] : MAP_DEFAULT.center} zoom={start ? 14 : MAP_DEFAULT.zoom} className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <ClickToPick onPick={onChange} />
          <Follow value={value} />
          {value && <Marker ref={markerRef} draggable position={[value.lat, value.lng]} icon={getPinIcon("pending", true)} eventHandlers={handlers} />}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
          <MapPin className="h-4 w-4 text-aqua-700" aria-hidden="true" />
          {value ? <span>Selected: <span className="font-medium tabular-nums text-ink">{formatCoords(value)}</span></span> : "Click the map to drop a pin"}
        </p>
        <Button variant="secondary" size="sm" onClick={useMyLocation} loading={geo.status === "loading"}>
          <LocateFixed className="h-4 w-4" aria-hidden="true" />Use my location
        </Button>
      </div>
      {geo.error && <p role="alert" className="text-sm text-red-600">{geo.error} You can still click the map to choose a spot.</p>}
    </div>
  );
}
