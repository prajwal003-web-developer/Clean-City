import { useState } from "react";
import { MapPin } from "lucide-react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import LocationPicker from "../../components/maps/LocationPicker";
import { useGeolocation } from "../../hooks/useGeolocation";

/**
 * Asks for a location before the nearby feed can load. The browser prompt only appears after
 * the user presses the button; a manual map choice is always available.
 */
export function LocationGate({ onSelect }) {
  const geo = useGeolocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const useDevice = async () => {
    const coords = await geo.requestLocation();
    if (coords) onSelect({ lat: coords.lat, lng: coords.lng, source: "device" });
  };
  return (
    <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card sm:p-12">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua-50 text-aqua-700"><MapPin className="h-7 w-7" aria-hidden="true" /></div>
      <h2 className="text-2xl font-semibold">Where should we look?</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">CleanCity shows reports within 10 km of a point you choose. Your location is only used to find nearby reports and measure distances.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={useDevice} loading={geo.status === "loading"}>Use my current location</Button>
        <Button variant="secondary" onClick={() => setPickerOpen(true)}>Choose on the map</Button>
      </div>
      {geo.error && <p role="alert" className="mt-4 text-sm text-red-600">{geo.error} Choose a place on the map instead.</p>}
      <LocationModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onSelect} />
    </div>
  );
}

/** Modal map for choosing (or changing) the feed location manually. */
export function LocationModal({ open, onClose, onSelect, initial }) {
  const [draft, setDraft] = useState(initial ? { lat: initial.lat, lng: initial.lng } : null);
  return (
    <Modal open={open} onClose={onClose} title="Choose your area" size="lg">
      <LocationPicker value={draft} onChange={setDraft} fallbackCenter={initial} />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!draft} onClick={() => { onSelect({ ...draft, source: "manual" }); onClose(); }}>Use this area</Button>
      </div>
    </Modal>
  );
}
