
import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import PhotoUploader from './PhotoUploader.jsx';
import LocationPicker from './LocationPicker.jsx';
import api from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { adaptProperty, LIFT_REGEX } from '../../services/adapters';



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
  has_lift: false,
};

const NUMERIC = [
  'latitude',
  'longitude',
  'rate',
  'deposit',
  'bedroom',
  'bathroom',
  'size_sqft',
];


const buildFacilities = (existingFacilities, hasLift) => {
  const others = (existingFacilities ?? []).filter(
    (f) => !LIFT_REGEX.test(f)
  );

  return hasLift ? [...others, 'lift'] : others;
};

const toPayload = (form, existingFacilities = []) => {
  const payload = {};

  for (const [key, value] of Object.entries(form)) {
    if (key === 'has_lift') continue;

    if (NUMERIC.includes(key)) {
      if (value === '' || value === null) continue;

      payload[key] = Number(value);
      continue;
    }

    if (value !== '') payload[key] = value;
  }

  payload.facilities = buildFacilities(
    existingFacilities,
    form.has_lift
  );

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
  const { t } = useLanguage();
  const isEdit = mode === 'edit' && Boolean(property);


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
      has_lift: Boolean(property.hasLift),
    };
  };

  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
        saved = await api.properties.update(
          property.id,
          toPayload(form, property.amenities)
        );

        
        for (const photoId of removedIds) {
          await api.properties
            .deletePhoto(property.id, photoId)
            .catch(() => {});
        }

        await uploadFiles(property.id);
      } else {
        saved = await api.properties.create(toPayload(form));

        await uploadFiles(saved.property_id);
      }

      const fresh = await api.properties
        .getById(saved.property_id)
        .catch(() => saved);

      onSaved?.(adaptProperty(fresh), fresh);
      onClose?.();
    } catch (submitError) {
      setError(
        submitError.message || t('addProperty.saveError')
      );

      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={
        isEdit
          ? t('addProperty.titleEdit')
          : t('addProperty.titleNew')
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="property-form">
        <label className="field">
          <span>{t('addProperty.address')}</span>

          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder={t('addProperty.addressPlaceholder')}
            required
          />
        </label>

        <div className="property-form-row">
          <label className="field">
            <span>{t('addProperty.monthlyRate')}</span>

            <input
              type="number"
              name="rate"
              value={form.rate}
              onChange={handleChange}
              required
              min="0"
            />
          </label>

          <label className="field">
            <span>{t('addProperty.deposit')}</span>

            <input
              type="number"
              name="deposit"
              value={form.deposit}
              onChange={handleChange}
              required
              min="0"
            />
          </label>
        </div>

        <div className="property-form-row property-form-row-3">
          <label className="field">
            <span>{t('addProperty.bedrooms')}</span>

            <input
              type="number"
              name="bedroom"
              value={form.bedroom}
              onChange={handleChange}
              required
              min="0"
            />
          </label>

          <label className="field">
            <span>{t('addProperty.bathrooms')}</span>

            <input
              type="number"
              name="bathroom"
              value={form.bathroom}
              onChange={handleChange}
              required
              min="0"
            />
          </label>

          <label className="field">
            <span>{t('addProperty.sizeSqft')}</span>

            <input
              type="number"
              name="size_sqft"
              value={form.size_sqft}
              onChange={handleChange}
              required
              min="0"
            />
          </label>
        </div>

        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          address={form.address}
          onChange={(latitude, longitude) =>
            setForm((prev) => ({
              ...prev,
              latitude,
              longitude,
            }))
          }
          disabled={isSaving}
        />


        <div className="property-form-row">
          <label className="field">
            <span>{t('addProperty.propertyType')}</span>

            <select
              name="property_type"
              value={form.property_type}
              onChange={handleChange}
            >
              <option value="apartment">
                {t('addProperty.apartment')}
              </option>

              <option value="studio">
                {t('addProperty.studio')}
              </option>

              <option value="duplex">
                {t('addProperty.duplex')}
              </option>

              <option value="house">
                {t('addProperty.house')}
              </option>
            </select>
          </label>

          <label className="field">
            <span>{t('addProperty.furnishing')}</span>

            <select
              name="furnish_type"
              value={form.furnish_type}
              onChange={handleChange}
            >
              <option value="unfurnished">
                {t('addProperty.unfurnished')}
              </option>

              <option value="semi-furnished">
                {t('addProperty.semiFurnished')}
              </option>

              <option value="furnished">
                {t('addProperty.furnished')}
              </option>
            </select>
          </label>
        </div>

        <label
          className="field field-checkbox"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <input
            type="checkbox"
            name="has_lift"
            checked={form.has_lift}
            onChange={handleChange}
            disabled={isSaving}
          />

          <span>{t('addProperty.hasLift')}</span>
        </label>

        <PhotoUploader
          files={files}
          removedIds={removedIds}
          existingPhotos={existingPhotos}
          onFilesChange={setFiles}
          onRemoveExisting={(photoId) =>
            setRemovedIds((prev) =>
              prev.includes(photoId) ? prev : [...prev, photoId]
            )
          }
          onRestoreExisting={(photoId) =>
            setRemovedIds((prev) =>
              prev.filter((id) => id !== photoId)
            )
          }
          disabled={isSaving}
        />

        {error && (
          <p role="alert" className="property-form-error">
            {error}
          </p>
        )}

        <div className="property-form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving
              ? t('addProperty.saving')
              : isEdit
                ? t('addProperty.saveChanges')
                : t('addProperty.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
