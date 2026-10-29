import { useCallback, useEffect, useState } from "react";

/**
 * Wraps the browser Geolocation API. Nothing is requested until `requestLocation()` is called,
 * so the permission prompt always follows a user action (or an already-granted permission).
 * status: idle | loading | granted | denied | unavailable
 */
export function useGeolocation() {
  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [state, setState] = useState({ status: isSupported ? "idle" : "unavailable", coords: null, error: null });
  const [permission, setPermission] = useState("unknown"); // granted | prompt | denied | unknown

  useEffect(() => {
    if (!navigator.permissions?.query) return undefined;
    let result;
    navigator.permissions.query({ name: "geolocation" }).then((p) => {
      result = p;
      setPermission(p.state);
      p.onchange = () => setPermission(p.state);
    }).catch(() => {});
    return () => { if (result) result.onchange = null; };
  }, []);

  const requestLocation = useCallback(() => new Promise((resolve) => {
    if (!isSupported) {
      setState({ status: "unavailable", coords: null, error: "This browser can't share your location." });
      resolve(null);
      return;
    }
    setState((s) => ({ ...s, status: "loading", error: null }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const result = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
        setState({ status: "granted", coords: result, error: null });
        resolve(result);
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState({
          status: denied ? "denied" : "unavailable",
          coords: null,
          error: denied ? "Location access is blocked for this site." : "Your location couldn't be determined right now.",
        });
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }), [isSupported]);

  return { ...state, permission, isSupported, requestLocation };
}
