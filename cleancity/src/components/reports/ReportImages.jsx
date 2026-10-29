import { useState } from "react";
import { ImageOff } from "lucide-react";
import { motion } from "motion/react";
import { getReportImages } from "../../utils/formatters";

/** Image that falls back to a neutral placeholder if the file can't be loaded. */
function SafeImage({ src, alt = "", className = "", eager = false }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}><ImageOff className="h-6 w-6" aria-label="Image unavailable" /></div>;
  }
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} onError={() => setFailed(true)} className={className} />;
}

/**
 * Card layout: 1 image = wide, 2 = split, 3 = one large + two stacked.
 * Hovering the group gently scales images (disabled for reduced motion via motion-safe).
 */
export function ReportImageGrid({ report, className = "h-56" }) {
  const images = getReportImages(report);
  if (images.length === 0) {
    return <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-aqua-50 to-brand-50 text-sm text-muted ${className}`}>No photos added</div>;
  }
  const img = "h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover/img:scale-105";
  const cell = "group/img overflow-hidden";
  return (
    <div className={`grid gap-1 overflow-hidden rounded-2xl ${className} ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      <div className={`${cell} ${images.length === 3 ? "row-span-2" : ""}`}><SafeImage src={images[0].url} className={img} /></div>
      {images[1] && <div className={cell}><SafeImage src={images[1].url} className={img} /></div>}
      {images[2] && <div className={cell}><SafeImage src={images[2].url} className={img} /></div>}
    </div>
  );
}

/** Detail gallery: large image plus selectable thumbnails. */
export function ReportGallery({ report }) {
  const images = getReportImages(report);
  const [index, setIndex] = useState(0);
  if (images.length === 0) return <ReportImageGrid report={report} className="h-72" />;
  const current = images[Math.min(index, images.length - 1)];
  return (
    <div className="space-y-2">
      <motion.div key={current.url} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-3xl bg-slate-100">
        <SafeImage src={current.url} alt={`Photo ${index + 1} of ${images.length} for ${report.title}`} eager className="aspect-[4/3] w-full object-cover" />
      </motion.div>
      {images.length > 1 && (
        <div className="flex gap-2" role="group" aria-label="Report photos">
          {images.map((image, i) => (
            <button key={image.url} type="button" onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === index}
              className={`h-16 w-20 overflow-hidden rounded-xl ring-2 transition ${i === index ? "ring-brand-500" : "ring-transparent opacity-70 hover:opacity-100"}`}>
              <SafeImage src={image.url} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
