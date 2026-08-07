// Assessment video helpers: filenames, gallery saving (where supported), downloads.

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export function extForMime(mime: string): string {
  return mime.includes("mp4") ? "mp4" : "webm";
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9]+/g, "").slice(0, 32) || "Athlete";
}

function stamp(at: number): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** NSRC_[AthleteName]_[AssessmentType]_[DateTime].mp4 */
export function buildVideoFilename(athleteName: string, assessmentLabel: string, at: number, ext = "mp4") {
  return `NSRC_${sanitize(athleteName)}_${sanitize(assessmentLabel)}_${stamp(at)}.${ext}`;
}

export type GalleryResult = "saved" | "cancelled" | "unsupported";

/**
 * On the web there is no Photos/Gallery API. The Web Share API (mobile browsers)
 * is the only user-permissioned path into the device gallery — the OS share sheet
 * acts as the permission prompt. Everywhere else we report "unsupported"
 * instead of pretending the video reached the gallery.
 */
export async function saveToGallery(blob: Blob, filename: string): Promise<GalleryResult> {
  try {
    const nav = navigator as Navigator & {
      canShare?: (d: unknown) => boolean;
      share?: (d: unknown) => Promise<void>;
    };
    if (!nav.share || !nav.canShare) return "unsupported";
    const file = new File([blob], filename, { type: blob.type || "video/mp4" });
    if (!nav.canShare({ files: [file] })) return "unsupported";
    await nav.share({ files: [file], title: filename });
    return "saved";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

export function galleryCapable(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  try {
    return !!nav.canShare?.({ files: [new File([new Blob()], "a.mp4", { type: "video/mp4" })] });
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function formatBytes(n: number): string {
  if (!n) return "0 KB";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
