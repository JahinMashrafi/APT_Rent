import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import '../../css/modules.css';
import '../../css/global.css';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function PropertyLocation({ lat, lng, title, address }) {
  const { t } = useLanguage();
  const position = [lat || 23.8103, lng || 90.4125];

  return (
    <div style={{ marginTop: '32px' }}>
      <h2 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MapPin size={24} color="var(--color-text-strong)" />
        {t('propertyDetails.locationTitle')}
      </h2>
      
      <div style={{ 
        borderRadius: 'var(--radius-md)', 
        height: '260px', 
        border: '1px solid var(--color-line)', 
        overflow: 'hidden', 
        position: 'relative', 
        zIndex: 0,
        marginTop: '16px'
      }}>
        <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>
              <div style={{ color: 'var(--color-text-strong)', fontFamily: 'var(--font-body)' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>{title}</strong>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-blueprint)' }}>{address}</span>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div style={{ 
        fontFamily: 'var(--font-mono)', 
        fontSize: '0.85rem', 
        color: 'var(--color-blueprint)',
        marginTop: '12px'
      }}>
        {address}
      </div>
    </div>
  );
}