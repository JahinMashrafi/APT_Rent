import { useState } from 'react';
import { MapPin, Bed, Bath, Maximize2, Building2, ShieldCheck, Check, ArrowUpDown } from 'lucide-react';
import StarRating from '../ui/StarRating.jsx';
import '../../css/modules.css';
import '../../css/global.css';

export default function PropertyInfo({ property }) {
  const [expanded, setExpanded] = useState(false);
  const desc = property?.description || '';
  const isLong = desc.length > 180;
  const displayDesc = expanded ? desc : (isLong ? desc.slice(0, 180) + '...' : desc);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontSize: '1.7rem', margin: '0 0 8px 0' }}>
          {property?.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-blueprint)', fontSize: '0.9rem' }}>
          <MapPin size={16} />
          <span>{property?.location?.address || property?.address}</span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontFamily: 'var(--font-stencil)', fontSize: '2.4rem', color: 'var(--color-ink)' }}>
            ৳{property?.pricePerMonth?.toLocaleString('en-BD')}
          </span>
          <span style={{ color: 'var(--color-line-strong)' }}>/month</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-line-strong)', marginTop: '4px' }}>
          Security Deposit: ৳{property?.securityDeposit?.toLocaleString('en-BD')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
        <div className="mod-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Bed size={20} color="var(--color-blueprint)" />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink)' }}>{property?.bedrooms} Beds</div>
        </div>
        <div className="mod-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Bath size={20} color="var(--color-blueprint)" />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink)' }}>{property?.bathrooms} Baths</div>
        </div>
        <div className="mod-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Maximize2 size={20} color="var(--color-blueprint)" />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink)' }}>{property?.size} sqft</div>
        </div>
        <div className="mod-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="var(--color-blueprint)" />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink)' }}>Floor {property?.floor}</div>
        </div>
        <div
  className="mod-card"
  title="Lift"
  style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: property?.hasLift ? 1 : 0.55 }}
>
  <ArrowUpDown size={20} color={property?.hasLift ? 'var(--color-blueprint)' : 'var(--color-line-strong)'} />
  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink)' }}>
    {property?.hasLift ? 'Lift available' : 'No lift'}
  </div>
</div>
      </div>

      <div>
        <h2 className="section-heading">Amenities</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {property?.amenities?.map((amenity, idx) => (
            <div key={idx} className="amenity-chip" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} color="var(--color-success)" />
              {amenity}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="section-heading">Description</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-charcoal)', lineHeight: '1.6', marginTop: '12px', whiteSpace: 'pre-wrap' }}>
          {displayDesc}
        </p>
        {isLong && (
          <button 
            onClick={() => setExpanded(!expanded)}
            style={{ 
              background: 'none', border: 'none', color: 'var(--color-blueprint)', 
              fontFamily: 'var(--font-mono)', fontSize: '0.9rem', cursor: 'pointer',
              padding: '8px 0', fontWeight: 'bold'
            }}
          >
            {expanded ? '[Read less]' : '[Read more]'}
          </button>
        )}
      </div>

      <div>
        <h2 className="section-heading">About the Landlord</h2>
        <div className="landlord-card" style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div className="landlord-avatar" style={{ 
              border: property?.landlord?.isVerified ? '2px solid var(--color-brass)' : 'none' 
            }}>
              {property?.landlord?.name?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-ink)', fontWeight: 'bold' }}>
                  {property?.landlord?.name}
                </span>
                {property?.landlord?.isVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    <ShieldCheck size={14} />
                    Verified Landlord
                  </div>
                )}
              </div>
              <StarRating rating={property?.landlord?.rating} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-line-strong)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Response time: {property?.landlord?.responseTime || 'Within a day'}</div>
                <div>Member since: {property?.landlord?.memberSince || '2023'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
