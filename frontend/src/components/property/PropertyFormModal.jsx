import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import PhotoUploader from './PhotoUploader.jsx';
import LocationPicker from './LocationPicker.jsx';
import api from '../../services/api';
import { adaptProperty } from '../../services/adapters';

/**
 * One form for both "Add New Property" and "Edit".
 *
 * These used to be separate code paths, which is how they drifted. Edit
 * reuses this component with `mode="edit"`, pre-filled from the listing,
 * so a field added here is editable everywhere at once.
 *
 * Photo handling differs by mode and that asymmetry is the whole reason
 * this is one component rather than two:
 *   create — the property_id doesn't exist until the form is submitted,
 *            so files can only be uploaded after the POST succeeds.
 *   edit   — the property exists, so removals and additions are applied
 *            against a known id, deletions first so a re-add of the same
 *            file can't collide with a row we're about to drop.
 */

const EMPTY_FORM = {
  address: '',
  latitude: '',
  longitude: '',
  rate: '',
  deposit: '',
  bedroom: '',
  bathroom: '',
  size_sqft: '',
  property_type: 'apartment',
  furnish_type: 'unfurnished',
};

const NUMERIC = ['latitude', 'longitude', 'rate', 'deposit', 'bedroom', 'bathroom', 'size_sqft'];

// Postgres rejects '' for an integer column, and an empty <input> hands
// us exactly that. Blank means "don't send this field", not "set to 0".
const toPayload = (form) => {
  const payload = {};
  for (const [key, value] of Object.entries(form)) {
    if (NUMERIC.includes(key)) {
      if (value === '' || value === null) continue;
      payload[key] = Number(value);
      continue;
    }
    if (value !== '') payload[key] = value;
  }
  return payload;
};

export default function PropertyFormModal({
  isOpen,
  mode = 'create',
  property = null,
  existingPhotos = [],
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit' && Boolean(property);

  // State is seeded from props once, at mount. The caller renders this
  // component only while the dialog is open (and gives it a key), so a
  // cancelled edit can't leak into the next one — and doing it here
  // instead of in an effect avoids the extra render pass that resetting
  // on open would cost.
  const initialForm = () => {
    if (!isEdit) return EMPTY_FORM;
    return {
      address: property.address ?? '',
      latitude: property.latitude ?? property.lat ?? '',
      longitude: property.longitude ?? property.lng ?? '',
      rate: property.rate ?? '',
      deposit: property.deposit ?? '',
      bedroom: property.bedroom ?? '',
      bathroom: property.bathroom ?? '',
      size_sqft: property.size_sqft ?? '',
      property_type: property.property_type ?? 'apartment',
      furnish_type: property.furnish_type ?? 'unfurnished',
    };
  };

  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const uploadFiles = async (propertyId) => {
    if (files.length === 0) return null;
    const body = new FormData();
    files.forEach((file) => body.append('photos', file));
    return api.properties.uploadPhotos(propertyId, body);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError('');

    try {
      let saved;

      if (isEdit) {
        saved = await api.properties.update(property.id, toPayload(form));

        // Removals first: the bucket objects are keyed independently of
        // the rows, so order doesn't matter there, but doing deletions
        // before the POST keeps the final state unambiguous if an
        // upload fails and the landlord retries.
        for (const photoId of removedIds) {
          await api.properties
            .deletePhoto(property.id, photoId)
            .catch(() => {}); // a stale photo_id shouldn't sink the whole save
        }
        await uploadFiles(property.id);
      } else {
        saved = await api.properties.create(toPayload(form));
        await uploadFiles(saved.property_id);
      }

      // Re-read so the card reflects the photos that actually landed,
      // not the ones we hoped to upload. Cheap, and it's the only way
      // to be truthful about partial failure.
      const fresh = await api.properties.getById(saved.property_id).catch(() => saved);
      onSaved?.(adaptProperty(fresh), fresh);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || 'Could not save this listing.');
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={isEdit ? 'Edit Listing' : 'Add New Property'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="property-form">
        <label className="field">
          <span>Address</span>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="House 32, Road 4, Dhanmondi, Dhaka"
            required
          />
        </label>

        <div className="property-form-row">
          <label className="field">
            <span>Monthly Rate (BDT)</span>
            <input type="number" name="rate" value={form.rate} onChange={handleChange} required min="0" />
          </label>
          <label className="field">
            <span>Deposit (BDT)</span>
            <input type="number" name="deposit" value={form.deposit} onChange={handleChange} required min="0" />
          </label>
        </div>

        <div className="property-form-row property-form-row-3">
          <label className="field">
            <span>Bedrooms</span>
            <input type="number" name="bedroom" value={form.bedroom} onChange={handleChange} required min="0" />
          </label>
          <label className="field">
            <span>Bathrooms</span>
            <input type="number" name="bathroom" value={form.bathroom} onChange={handleChange} required min="0" />
          </label>
          <label className="field">
            <span>Size (sqft)</span>
            <input type="number" name="size_sqft" value={form.size_sqft} onChange={handleChange} required min="0" />
          </label>
        </div>
          <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          address={form.address}
          onChange={(latitude, longitude) => setForm((prev) => ({ ...prev, latitude, longitude }))}
          disabled={isSaving}
        />


        <div className="property-form-row">
          <label className="field">
            <span>Property Type</span>
            <select name="property_type" value={form.property_type} onChange={handleChange}>
              <option value="apartment">Apartment</option>
              <option value="studio">Studio</option>
              <option value="duplex">Duplex</option>
              <option value="house">House</option>
            </select>
          </label>
          <label className="field">
            <span>Furnishing</span>
            <select name="furnish_type" value={form.furnish_type} onChange={handleChange}>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </label>
        </div>

        <PhotoUploader
          files={files}
          removedIds={removedIds}
          existingPhotos={existingPhotos}
          onFilesChange={setFiles}
          onRemoveExisting={(photoId) =>
            setRemovedIds((prev) => (prev.includes(photoId) ? prev : [...prev, photoId]))
          }
          onRestoreExisting={(photoId) =>
            setRemovedIds((prev) => prev.filter((id) => id !== photoId))
          }
          disabled={isSaving}
        />

        {error && (
          <p role="alert" className="property-form-error">
            {error}
          </p>
        )}

        <div className="property-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Listing'}
          </button>
        </div>
      </form>
    </Modal>
  );
}