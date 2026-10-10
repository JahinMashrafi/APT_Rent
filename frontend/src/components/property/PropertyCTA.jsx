import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../context/AppContext.jsx';
import '../../css/modules.css';
import '../../css/global.css';

export default function PropertyCTA({ propertyId, ownerId, pricePerMonth, onContactLandlord, mobileOnly }) {
  const navigate = useNavigate();
  const { currentUser, authReady } = useApp();
  const [applyState, setApplyState] = useState('idle'); // idle | sending | sent | error
  const [applyError, setApplyError] = useState(null);

  // The apply endpoint is tenant-only (requireTenant), so a landlord
  // never has a working Apply button. Owners would get a 403 on their
  // own flat even as dual-role accounts, so they're hidden too.
  const canApply = Boolean(
    currentUser &&
    !currentUser.isLandlord &&
    (ownerId == null || String(ownerId) !== String(currentUser.id)),
  );

  // Both actions below hit authenticated endpoints. Asking for a sign-in
  // on click, rather than letting RequireAuth bounce off the destination,
  // means the visitor never fills in a form they can't submit. The
  // intended URL rides along so Login returns them to it.
  const requireLogin = (pathname) => {
    if (authReady && !currentUser) {
      navigate('/login', { state: { from: { pathname } } });
      return true;
    }
    return false;
  };

  const handleRequestTour = () => {
    const path = `/tour/${propertyId}`;
    if (requireLogin(path)) return;
    navigate(path);
  };

  const handleApply = async () => {
    if (requireLogin(`/property/${propertyId}`)) return;
    try {
      setApplyState('sending');
      setApplyError(null);
      // POST /applications — tenant-only per the spec.
      await api.applications.create({ property_id: propertyId });
      setApplyState('sent');
    } catch (err) {
      // The api client normalizes the backend envelope into err.message;
      // showing it beats a generic "try again" that hides the real cause.
      setApplyError(err?.message || "Couldn't send your application — try again in a moment.");
      setApplyState('error');
    }
  };

  const applyLabel =
    applyState === 'sent' ? 'Application sent' : applyState === 'sending' ? 'Sending…' : 'Apply to rent';

  if (mobileOnly) {
    return (
      <div className="cta-mobile-bar">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-stencil)', fontSize: '1.5rem', color: 'var(--color-ink)', lineHeight: 1 }}>
            ৳{pricePerMonth?.toLocaleString('en-BD')}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-line-strong)' }}>/month</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-ghost" 
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: 'transparent' }}
            onClick={onContactLandlord}
          >
            <MessageSquare size={18} />
          </button>
          <button 
            className="btn-primary" 
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', background: 'var(--color-ink)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)' }}
            onClick={handleRequestTour}
          >
            <Calendar size={16} />
            Tour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cta-card cta-desktop">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span className="cta-price" style={{ fontFamily: 'var(--font-stencil)', fontSize: '2rem', color: 'var(--color-ink)' }}>
          ৳{pricePerMonth?.toLocaleString('en-BD')}
        </span>
        <span style={{ color: 'var(--color-line-strong)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>/month</span>
      </div>
      
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-line-strong)', marginBottom: '24px' }}>
        Security deposit: ৳{(pricePerMonth * 2)?.toLocaleString('en-BD')}
      </div>
      
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '0 0 24px 0' }} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {canApply && (
          <button
            className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--color-brass)', color: 'var(--color-ink)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: applyState === 'sent' ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 'bold', opacity: applyState === 'sending' ? 0.7 : 1 }}
            onClick={handleApply}
            disabled={applyState === 'sending' || applyState === 'sent'}
          >
            <FileText size={18} />
            {applyLabel}
          </button>
        )}

        <button 
          className="btn-primary" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--color-ink)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 'bold' }}
          onClick={handleRequestTour}
        >
          <Calendar size={18} />
          Request a Tour
        </button>
        
        <button 
          className="btn-ghost" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', color: 'var(--color-ink)', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 'bold' }}
          onClick={onContactLandlord}
        >
          <MessageSquare size={18} />
          Contact Landlord
        </button>
        {applyState === 'error' && applyError && (
          <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', margin: 0 }}>
            {applyError}
          </p>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', margin: '24px 0' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-blueprint)' }}>
        <ShieldCheck size={16} />
        Secure & verified platform
      </div>
    </div>
  );
}
