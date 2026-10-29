import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import Button from "../common/Button";
import { Input, Textarea } from "../common/Field";
import LocationPicker from "../maps/LocationPicker";
import { CATEGORIES, LIMITS } from "../../utils/constants";
import { getFileId, resolveFileUrl } from "../../utils/formatters";
import { validateImageFile, validateReportDetails } from "../../utils/validators";

const STEPS = ["Details", "Photos", "Location"];

/**
 * Shared create/edit form in three animated steps.
 * Creation sends: title, category, description, coordinates (JSON [lng, lat]) and up to 3 `files`.
 * Editing also sends `removeFileIds` (JSON array) for existing images the user removed.
 *
 * @param {object} [initial] existing report when editing
 * @param {(formData: FormData, opts: {onUploadProgress: Function}) => Promise<void>} onSubmit throws on failure
 * @param {{lat:number,lng:number}|null} fallbackCenter map start when no pin is set yet
 */
export default function ReportForm({ initial, onSubmit, submitLabel, fallbackCenter }) {
  const isEdit = Boolean(initial);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ title: initial?.title ?? "", category: initial?.category ?? "", description: initial?.description ?? "" });
  const [errors, setErrors] = useState({});
  const [existing, setExisting] = useState(() => (initial?.files || []).map((f) => ({ id: getFileId(f), url: resolveFileUrl(f) })).filter((f) => f.id && f.url));
  const [removedIds, setRemovedIds] = useState([]);
  const [newImages, setNewImages] = useState([]); // [{ key, file, url }] url = object URL preview
  const [imageError, setImageError] = useState("");
  const [location, setLocation] = useState(() => {
    const c = initial?.location?.coordinates;
    return Array.isArray(c) && c.length >= 2 ? { lat: Number(c[1]), lng: Number(c[0]) } : null;
  });
  const [locationError, setLocationError] = useState("");
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const previewsRef = useRef(newImages);
  previewsRef.current = newImages;

  // Release object URLs when the form unmounts.
  useEffect(() => () => previewsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const remaining = LIMITS.maxImages - existing.length - newImages.length;
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const addFiles = (fileList) => {
    const accepted = [];
    let problem = "";
    for (const file of Array.from(fileList)) {
      const invalid = validateImageFile(file);
      if (invalid) { problem = invalid; continue; }
      if (accepted.length >= remaining) { problem = `You can attach up to ${LIMITS.maxImages} photos.`; break; }
      accepted.push({ key: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) });
    }
    setImageError(problem);
    if (accepted.length) setNewImages((prev) => [...prev, ...accepted]);
  };
  const removeNew = (key) => setNewImages((prev) => {
    prev.filter((i) => i.key === key).forEach((i) => URL.revokeObjectURL(i.url));
    return prev.filter((i) => i.key !== key);
  });
  const markExistingRemoved = (img) => { setExisting((e) => e.filter((x) => x.id !== img.id)); setRemovedIds((r) => [...r, img.id]); setImageError(""); };
  const undoRemoval = (id) => {
    if (remaining <= 0) { setImageError("Remove a photo first to make room."); return; }
    const original = (initial.files || []).find((f) => getFileId(f) === id);
    setRemovedIds((r) => r.filter((x) => x !== id));
    setExisting((e) => [...e, { id, url: resolveFileUrl(original) }]);
  };

  const next = () => {
    if (step === 0) {
      const found = validateReportDetails(values);
      setErrors(found);
      if (Object.keys(found).length) return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) { next(); return; }
    if (submitting) return; // guards double submits
    const found = validateReportDetails(values);
    setErrors(found);
    if (Object.keys(found).length) { setStep(0); return; }
    if (!location) { setLocationError("Pick the spot on the map before submitting."); return; }

    const formData = new FormData();
    formData.append("title", values.title.trim());
    formData.append("category", values.category);
    formData.append("description", values.description.trim());
    formData.append("coordinates", JSON.stringify([location.lng, location.lat])); // [longitude, latitude]
    newImages.forEach((img) => formData.append("files", img.file)); // field name must be `files`
    if (isEdit) formData.append("removeFileIds", JSON.stringify(removedIds));

    setSubmitting(true); setServerError(""); setProgress(0);
    try {
      await onSubmit(formData, { onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)) });
    } catch (error) {
      setServerError(error.message);
      toast.error(error.message);
      // Field-level server errors send the user back to the step that owns them; state is untouched.
      if (error.fieldErrors?.title || error.fieldErrors?.category || error.fieldErrors?.description) { setErrors(error.fieldErrors); setStep(0); }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocation = useCallback((loc) => { setLocation(loc); setLocationError(""); }, []);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <ol className="flex gap-2" aria-label="Form steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <button type="button" onClick={() => (i <= step ? setStep(i) : undefined)} aria-current={i === step ? "step" : undefined}
              className={`w-full border-t-4 pt-2 text-left text-sm font-medium transition-colors ${i <= step ? "border-brand-500 text-ink" : "border-line text-muted"}`}>{label}</button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="space-y-5">
          {step === 0 && (
            <>
              <Input label="Title" value={values.title} onChange={set("title")} error={errors.title} counter={`${values.title.length}/${LIMITS.titleMax}`} maxLength={LIMITS.titleMax} placeholder="e.g. Overflowing bins behind the market" />
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Category</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map(({ value, label, icon: Icon }) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-aqua-700 ${values.category === value ? "border-brand-500 bg-brand-50 font-medium text-brand-900" : "border-line bg-white hover:bg-slate-50"}`}>
                      <input type="radio" name="category" value={value} checked={values.category === value} onChange={set("category")} className="sr-only" />
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
                    </label>
                  ))}
                </div>
                {errors.category && <p role="alert" className="mt-1.5 text-sm text-red-600">{errors.category}</p>}
              </fieldset>
              <Textarea label="Description" value={values.description} onChange={set("description")} error={errors.description} counter={`${values.description.length}/${LIMITS.descriptionMax}`} maxLength={LIMITS.descriptionMax} placeholder="What's there, how big is it, and how can people reach it?" />
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Add up to {LIMITS.maxImages} photos (JPEG, PNG, WEBP or GIF, 5 MB each). Clear photos help neighbours decide to join.</p>
              <div className="grid grid-cols-3 gap-3">
                {existing.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-2xl">
                    <img src={img.url} alt="Existing report photo" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => markExistingRemoved(img)} aria-label="Remove this photo" className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-1.5 text-white hover:bg-ink"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                {newImages.map((img) => (
                  <div key={img.key} className="relative aspect-square overflow-hidden rounded-2xl ring-2 ring-brand-500/40">
                    <img src={img.url} alt={`Preview of ${img.file.name}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeNew(img.key)} aria-label={`Remove ${img.file.name}`} className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-1.5 text-white hover:bg-ink"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                {remaining > 0 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 text-sm text-muted transition-colors focus-within:ring-2 focus-within:ring-aqua-700 hover:border-aqua-500 hover:text-aqua-700">
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />Add photo
                    <input type="file" accept={LIMITS.imageTypes.join(",")} multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              {removedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {removedIds.map((id) => <button key={id} type="button" onClick={() => undoRemoval(id)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200"><RotateCcw className="h-3.5 w-3.5" />Restore removed photo</button>)}
                </div>
              )}
              {imageError && <p role="alert" className="text-sm text-red-600">{imageError}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Click the map or drag the pin to the exact spot. You can also use your device location.</p>
              <LocationPicker value={location} onChange={handleLocation} fallbackCenter={fallbackCenter} heightClass="h-80" />
              {locationError && <p role="alert" className="text-sm text-red-600">{locationError}</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {serverError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>}
      {submitting && newImages.length > 0 && (
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress" className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>Back</Button>
        {step < STEPS.length - 1
          ? <Button onClick={next}>Continue</Button>
          : <Button type="submit" loading={submitting}>{submitLabel}</Button>}
      </div>
    </form>
  );
}
