import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import api from '../../services/api';
import { useApp } from '../../context/AppContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import '../../css/modules.css';
import '../../css/global.css';

export default function PropertyCTA({
  propertyId,
  ownerId,
  pricePerMonth,
  onContactLandlord,
  mobileOnly,
}) {
  const navigate = useNavigate();
  const { currentUser, authReady } = useApp();
  const { t, formatCurrency } = useLanguage();

  const [applyState, setApplyState] = useState('idle');
  const [applyError, setApplyError] = useState(null);
  const [coverMessage, setCoverMessage] = useState('');

  // Only tenants can apply, and owners cannot apply to their own property.
  const canApply = Boolean(
    currentUser &&
    !currentUser.isLandlord &&
    (ownerId == null || String(ownerId) !== String(currentUser.id))
  );

  // Redirect signed-out users to login with the intended destination.
  const requireLogin = (pathname) => {
    if (authReady && !currentUser) {
      navigate('/login', {
        state: {
          from: {
            pathname,
          },
        },
      });
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

      await api.applications.create({
        property_id: propertyId,
        message: coverMessage.trim() || undefined,
      });

      setApplyState('sent');
    } catch (err) {
      setApplyError(
        err?.message || t('propertyDetails.applyFailed')
      );
      setApplyState('error');
    }
  };

  const applyLabel =
    applyState === 'sent'
      ? t('propertyDetails.applicationSent')
      : applyState === 'sending'
        ? t('propertyDetails.sending')
        : t('propertyDetails.applyToRent');

  if (mobileOnly) {
    return (
      <div className="cta-mobile-bar">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-stencil)',
              fontSize: '1.5rem',
              color: 'var(--color-text-strong)',
              lineHeight: 1,
            }}
          >
            {formatCurrency(pricePerMonth)}
          </span>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--color-line-strong)',
            }}
          >
            {t('propertyDetails.perMonth')}
          </span>

        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            className="btn-ghost"
            style={{
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
            }}
            onClick={onContactLandlord}
          >
            <MessageSquare size={18} />
          </button>

          <button
            className="btn-primary"
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              background: 'var(--color-ink)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
            }}
            onClick={handleRequestTour}
          >
            <Calendar size={16} />
            {t('propertyDetails.tourShort')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cta-card cta-desktop">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        }}
      >
        <span
          className="cta-price"
          style={{
            fontFamily: 'var(--font-stencil)',
            fontSize: '2rem',
            color: 'var(--color-text-strong)',
          }}
        >
          {formatCurrency(pricePerMonth)}
        </span>

        <span
          style={{
            color: 'var(--color-line-strong)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
          }}
        >
          {t('propertyDetails.perMonth')}
        </span>
        
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-line-strong)',
          marginBottom: '24px',
        }}
      >
        {t('propertyDetails.securityDeposit', {
          amount: formatCurrency(pricePerMonth * 2),
        })}
      </div>

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--color-line)',
          margin: '0 0 24px 0',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {canApply && applyState !== 'sent' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-charcoal)' }}>
              {t('propertyDetails.coverLetterLabel')}
            </span>
            <textarea
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              disabled={applyState === 'sending'}
              placeholder={t('propertyDetails.coverLetterPlaceholder')}
              style={{
                width: '100%',
                resize: 'vertical',
                padding: '10px',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-paper)',
                color: 'var(--color-text-strong)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            />
          </label>
        )}
        {canApply && (
          <button
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'var(--color-brass)',
              color: 'var(--color-text-strong)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: applyState === 'sent' ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              opacity: applyState === 'sending' ? 0.7 : 1,
            }}
            onClick={handleApply}
            disabled={
              applyState === 'sending' ||
              applyState === 'sent'
            }
          >
            <FileText size={18} />
            {applyLabel}
          </button>
        )}

        <button
          className="btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'var(--color-ink)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 'bold',
          }}
          onClick={handleRequestTour}
        >
          <Calendar size={18} />
          {t('propertyDetails.requestTour')}
        </button>

        <button
          className="btn-ghost"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'transparent',
            color: 'var(--color-text-strong)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 'bold',
          }}
          onClick={onContactLandlord}
        >
          <MessageSquare size={18} />
          {t('propertyDetails.contactLandlord')}
        </button>

        {applyState === 'error' && applyError && (
          <p
            style={{
              color: 'var(--color-error)',
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            {applyError}
          </p>
        )}
      </div>

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--color-line)',
          margin: '24px 0',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-blueprint)',
        }}
      >
        <ShieldCheck size={16} />
        {t('propertyDetails.secureVerified')}
      </div>
    </div>
  );
}