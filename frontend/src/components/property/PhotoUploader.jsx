
import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, X, RotateCcw, Plus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

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
  const { t, digits } = useLanguage();
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');


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

  const kept = existingPhotos.filter(
    (photo) => !removedIds.includes(photo.photo_id),
  );
  const room = MAX_PHOTOS - (kept.length + files.length);

  const handleSelect = (event) => {

    const picked = Array.from(event.target.files ?? []);
    
    event.target.value = '';

    if (picked.length === 0) return;

    const rejected = picked.filter(
      (file) => !ACCEPTED.includes(file.type) || file.size > MAX_BYTES,
    );

    const acceptable = picked.filter(
      (file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES,
    );

    if (rejected.length > 0) {
      setError(t('photos.skipped', { count: rejected.length }));
    } else {
      setError('');
    }

    if (acceptable.length === 0) return;

    const taking = acceptable.slice(0, Math.max(room, 0));

    if (acceptable.length > taking.length) {
      setError(
        t('photos.maxPhotos', {
          max: MAX_PHOTOS,
          added: taking.length,
        }),
      );
    }

    setPreviews((prev) => [
      ...prev,
      ...taking.map((file) => URL.createObjectURL(file)),
    ]);

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
        <span className="photo-uploader-label">
          {t('photos.label')}
        </span>

        <span className="photo-uploader-count">
          {digits(kept.length + files.length)}/{digits(MAX_PHOTOS)}
        </span>
      </div>

      <div className="photo-uploader-grid">
        {kept.map((photo, index) => (
          <div className="photo-thumb" key={photo.photo_id}>
            <img
              src={photo.photo_url}
              alt={t('photos.photoAlt', { n: index + 1 })}
            />

            {index === 0 && kept.length + files.length > 0 && (
              <span className="photo-thumb-cover">
                {t('photos.cover')}
              </span>
            )}

            <button
              type="button"
              className="photo-thumb-btn"
              onClick={() => onRemoveExisting(photo.photo_id)}
              disabled={disabled}
              aria-label={t('photos.removeAria', { n: index + 1 })}
              title={t('photos.removeTitle')}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {previews.map((url, index) => (
          <div className="photo-thumb is-new" key={url}>
            <img
              src={url}
              alt={t('photos.selectedAlt', { n: index + 1 })}
            />

            <span className="photo-thumb-cover is-new">
              {t('photos.new')}
            </span>

            <button
              type="button"
              className="photo-thumb-btn"
              onClick={() => handleRemoveSelected(index)}
              disabled={disabled}
              aria-label={t('photos.removeSelectedAria', {
                n: index + 1,
              })}
              title={t('photos.removeTitle')}
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
            <span>{t('photos.add')}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        onChange={handleSelect}
        style={{ display: 'none' }}
      />

      {removedIds.length > 0 && (
        <p className="photo-uploader-note">
          {t('photos.willDelete', { count: removedIds.length })}

          <button
            type="button"
            className="link-btn"
            onClick={() => onRestoreExisting(removedIds[0])}
            disabled={disabled}
          >
            <RotateCcw size={12} /> {t('photos.undo')}
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
          <ImageIcon size={13} /> {t('photos.hint')}
        </p>
      )}
    </div>
  );
}
