import { memo, useEffect, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { getPinIcon } from "./mapIcons";
import { StatusBadge } from "../reports/ReportStatus";
import { getCategory, getReportImages, normalizeStatus } from "../../utils/formatters";

/**
 * Report marker with a popup summary. When `active`, the popup opens and the pin is enlarged.
 * Memoised so unrelated feed updates don't re-create markers.
 */
function MapMarker({ report, position, active, onSelect }) {
  const ref = useRef(null);
  const status = normalizeStatus(report.status);
  const image = getReportImages(report)[0];

  useEffect(() => {
    if (active) ref.current?.openPopup();
  }, [active]);

  return (
    <Marker ref={ref} position={[position.lat, position.lng]} icon={getPinIcon(status, active)} zIndexOffset={active ? 1000 : 0} eventHandlers={{ click: () => onSelect?.(report._id) }}>
      <Popup closeButton={false} autoPanPadding={[24, 24]}>
        {image && <img src={image.url} alt="" loading="lazy" className="h-28 w-full object-cover" />}
        <div className="space-y-2 p-3">
          <StatusBadge status={status} />
          <p className="font-display text-base font-semibold leading-snug">{report.title}</p>
          <p className="text-xs text-muted">{getCategory(report.category).label}</p>
          <Link to={`/reports/${report._id}`} className="inline-block text-sm font-semibold text-brand-700 underline underline-offset-2">View details</Link>
        </div>
      </Popup>
    </Marker>
  );
}
export default memo(MapMarker);
