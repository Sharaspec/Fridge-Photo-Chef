import { useRef } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
  /** In compact mode: true once the user has their own photo ("Retake"), false for samples/typed lists. */
  hasPhoto?: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export function PhotoPicker({ onFile, disabled, compact, hasPhoto }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (file) onFile(file);
  }

  return (
    <div className={compact ? "picker picker--compact" : "picker"}>
      <button type="button" className={compact ? "btn btn--secondary" : "btn btn--sunny"} disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <CameraIcon /> {compact ? (hasPhoto ? "Retake photo" : "Snap my fridge") : "Take photo"}
      </button>
      <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => uploadRef.current?.click()}>
        <UploadIcon /> {compact && hasPhoto ? "Upload another" : "Upload photo"}
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={uploadRef} type="file" accept={ACCEPT} hidden onChange={handle} />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}
