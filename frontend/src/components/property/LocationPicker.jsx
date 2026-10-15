import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite doesn't resolve Leaflet's default marker images on its own.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const DHAKA = [23.777176, 90.399452];

// The DB column is numeric(9,6): six decimals is the most it will keep.
const round6 = (n) => Math.round(n * 1e6) / 1e6;

const isValid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

// Click anywhere on the map to drop / move the pin.
function ClickToPlace({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Re-centre the map when the pin is moved from outside (search, GPS, typing).
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export default function LocationPicker({ latitude, longitude, address, onChange, disabled }) {
  const lat = latitude === '' || latitude == null ? NaN : Number(latitude);
  const lng = longitude === '' || longitude == null ? NaN : Number(longitude);
  const hasPin = isValid(lat, lng);

  const [flyTarget, setFlyTarget] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const setPin = (la, ln, { fly = false } = {}) => {
    const p = [round6(la), round6(ln)];
    onChange(p[0], p[1]);
    if (fly) setFlyTarget(p);
  };

  const handlePick = (la, ln) => {
    if (disabled) return;
    setStatus('');
    setPin(la, ln);
  };

  const findAddress = async () => {
    const q = (address || '').trim();
    if (!q) return setStatus('Type the address above first.');
    setBusy(true);
    setStatus('Searching…');
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=bd&q=' +
        encodeURIComponent(q);
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (!data.length) {
        setStatus('Address not found — click the map to place the pin instead.');
      } else {
        setPin(parseFloat(data[0].lat), parseFloat(data[0].lon), { fly: true });
        setStatus('Pin placed. Drag it or click the map to fine-tune.');
      }
    } catch {
      setStatus('Search failed — click the map to place the pin instead.');
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setStatus('Geolocation is not supported by this browser.');
    setBusy(true);
    setStatus('Getting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin(pos.coords.latitude, pos.coords.longitude, { fly: true });
        setStatus('Pin placed at your current location.');
        setBusy(false);
      },
      () => {
        setStatus('Could not get your location (permission denied?).');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Typing coordinates by hand: update the fields, and move the map once both are valid.
  const handleManual = (which, raw) => {
    const nextLat = which === 'lat' ? raw : latitude;
    const nextLng = which === 'lng' ? raw : longitude;
    onChange(nextLat, nextLng);
    const la = nextLat === '' ? NaN : Number(nextLat);
    const ln = nextLng === '' ? NaN : Number(nextLng);
    if (isValid(la, ln)) setFlyTarget([la, ln]);
  };

  return (
    <div className="field">
      <span>Location on map</span>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0' }}>
        <button type="button" className="btn btn-ghost" onClick={findAddress} disabled={disabled || busy}>
          <Search size={14} /> Find address on map
        </button>
        <button type="button" className="btn btn-ghost" onClick={useMyLocation} disabled={disabled || busy}>
          <Crosshair size={14} /> Use my location
        </button>
        {hasPin && (
          <button type="button" className="btn btn-ghost" onClick={() => onChange('', '')} disabled={disabled}>
            Clear pin
          </button>
        )}
      </div>

      {/* isolate + z-0: Leaflet panes use z-index up to 1000 and would paint over the modal header. */}
      <div
        style={{
          height: 280,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          position: 'relative',
          zIndex: 0,
          isolation: 'isolate',
        }}
      >
        <MapContainer
          center={hasPin ? [lat, lng] : DHAKA}
          zoom={hasPin ? 16 : 12}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPick={handlePick} />
          <FlyTo target={flyTarget} />
          {hasPin && (
            <Marker
              position={[lat, lng]}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  handlePick(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="property-form-row" style={{ marginTop: 8 }}>
        <label className="field">
          <span>Latitude</span>
          <input
            type="number" step="any" min="-90" max="90"
            value={latitude ?? ''}
            onChange={(e) => handleManual('lat', e.target.value)}
            placeholder="23.777176"
            disabled={disabled}
          />
        </label>
        <label className="field">
          <span>Longitude</span>
          <input
            type="number" step="any" min="-180" max="180"
            value={longitude ?? ''}
            onChange={(e) => handleManual('lng', e.target.value)}
            placeholder="90.399452"
            disabled={disabled}
          />
        </label>
      </div>

      <small style={{ color: '#64748b' }}>
        {status || 'Click the map to drop a pin, drag it to adjust, or type the coordinates.'}
      </small>
    </div>
  );
}