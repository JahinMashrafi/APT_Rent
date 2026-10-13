import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, X, RotateCcw, Plus } from 'lucide-react';

/**
 * Photo picker for a listing.
 *
 * Deliberately controlled: the parent form owns `files` and `removedIds`
 * because both survive across the modal's open/close and are submitted
 * in one go — uploading as soon as a file is picked would mean an orphan
 * in the bucket every time the landlord pressed Cancel.
 *
 * Limits mirror backend/middleware/upload.js so an oversized or
 * mistyped file is refused here rather than after a round trip. The
 * server also allows PDF (other callers upload documents); a PDF has no
 * thumbnail, so it is not offered here.
 */

const MAX_PHOTOS = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export default function PhotoUploader({
  files,
  removedIds,
  existingPhotos = [],
  onFilesChange,
  onRemoveExisting,
  onRestoreExisting,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');

  // Object URLs pin their blob in memory until revoked, so every preview
  // is revoked the moment it's removed from the list. `files` and
  // `previews` are kept index-aligned and only ever change together, in
  // event handlers below — deriving previews in an effect instead would
  // mean a render pass per selection and re-creating URLs the user
  // already has on screen.
  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  });
  useEffect(
    () => () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const kept = existingPhotos.filter((photo) => !removedIds.includes(photo.photo_id));
  const room = MAX_PHOTOS - (kept.length + files.length);

  const handleSelect = (event) => {
    const picked = Array.from(event.target.files ?? []);
    // Reset first: re-picking the same file won't fire change otherwise.
    event.target.value = '';

    if (picked.length === 0) return;

    const rejected = picked.filter(
      (file) => !ACCEPTED.includes(file.type) || file.size > MAX_BYTES,
    );
    const acceptable = picked.filter(
      (file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES,
    );

    if (rejected.length > 0) {
      setError(
        `Skipped ${rejected.length} file${rejected.length > 1 ? 's' : ''} — JPG, PNG or WEBP under 5MB only.`,
      );
    } else {
      setError('');
    }

    if (acceptable.length === 0) return;

    const taking = acceptable.slice(0, Math.max(room, 0));
    if (acceptable.length > taking.length) {
      setError(`Only ${MAX_PHOTOS} photos per listing — added the first ${taking.length}.`);
    }

    setPreviews((prev) => [...prev, ...taking.map((file) => URL.createObjectURL(file))]);
    onFilesChange([...files, ...taking]);
  };

  const handleRemoveSelected = (index) => {
    const url = previews[index];
    if (url) URL.revokeObjectURL(url);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="photo-uploader">
      <div className="photo-uploader-head">
        <span className="photo-uploader-label">Photos</span>
        <span className="photo-uploader-count">
          {kept.length + files.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div className="photo-uploader-grid">
        {kept.map((photo, index) => (
          <div className="photo-thumb" key={photo.photo_id}>
            <img src={photo.photo_url} alt={`Photo ${index + 1}`} />
            {index === 0 && kept.length + files.length > 0 && (
              <span className="photo-thumb-cover">Cover</span>
            )}
            <button
              type="button"
              className="photo-thumb-btn"
              onClick={() => onRemoveExisting(photo.photo_id)}
              disabled={disabled}
              aria-label={`Remove photo ${index + 1}`}
              title="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {previews.map((url, index) => (
          <div className="photo-thumb is-new" key={url}>
            <img src={url} alt={`Selected photo ${index + 1}`} />
            <span className="photo-thumb-cover is-new">New</span>
            <button
              type="button"
              className="photo-thumb-btn"
              onClick={() => handleRemoveSelected(index)}
              disabled={disabled}
              aria-label={`Remove selected photo ${index + 1}`}
              title="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {room > 0 && (
          <button
            type="button"
            className="photo-upload-tile"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Plus size={20} />
            <span>Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        onChange={handleSelect}
        style={{ display: 'none' }}
      />

      {removedIds.length > 0 && (
        <p className="photo-uploader-note">
          {removedIds.length} photo{removedIds.length > 1 ? 's' : ''} will be deleted when you save.
          <button
            type="button"
            className="link-btn"
            onClick={() => onRestoreExisting(removedIds[0])}
            disabled={disabled}
          >
            <RotateCcw size={12} /> Undo
          </button>
        </p>
      )}

      {error && (
        <p role="alert" className="photo-uploader-error">
          {error}
        </p>
      )}

      {!existingPhotos.length && !files.length && !error && (
        <p className="photo-uploader-hint">
          <ImageIcon size={13} /> A listing with photos gets far more interest.
        </p>
      )}
    </div>
  );
}