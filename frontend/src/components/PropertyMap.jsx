import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// VITE FIX: Manually point Leaflet to the correct marker images
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function PropertyMap() {
  // Mock data - later this will come from your PostgreSQL backend
  const properties = [
    { id: 1, title: 'Luxury Apt in Gulshan', lat: 23.7925, lng: 90.4078, price: '৳ 80,000', beds: 3 },
    { id: 2, title: 'Cozy Flat in Dhanmondi', lat: 23.7461, lng: 90.3742, price: '৳ 45,000', beds: 2 },
    { id: 3, title: 'Studio in Banani', lat: 23.7940, lng: 90.4043, price: '৳ 35,000', beds: 1 },
  ];

  // Center the map on Dhaka
  const dhakaCenter = [23.777176, 90.399452];

  return (
    /* 
      z-0: Crucial Tailwind class. Without it, the map will overlap your Navbar!
      h-[500px]: Leaflet REQUIRES a defined height to render.
    */
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-lg border border-gray-200 z-0 relative">
      <MapContainer 
        center={dhakaCenter} 
        zoom={12} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        {/* The OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Loop through properties and plot markers */}
        {properties.map((property) => (
          <Marker key={property.id} position={[property.lat, property.lng]}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-gray-900 text-base m-0">{property.title}</h3>
                <p className="text-blue-600 font-semibold mt-1 mb-2 m-0">{property.price}/month</p>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  {property.beds} Beds
                </span>
                <button className="mt-3 w-full bg-blue-600 text-white py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition-colors">
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}