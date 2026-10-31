import { useState } from 'react';
import { CreditCard, Smartphone, Banknote, Loader2 } from 'lucide-react';
import '../../css/modules.css';
import '../../css/global.css';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function PaymentGateway({ amount, onSuccess, onCancel }) {
  const { t, formatCurrency } = useLanguage();

  const [activeTab, setActiveTab] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [errors, setErrors] = useState({});
  const [bkashPhone, setBkashPhone] = useState('');
  const [bkashOtp, setBkashOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleCardNumber = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.replace(/(.{4})/g, '$1 ').trim();
    setCardData({ ...cardData, number: val.substring(0, 19) });
  };

  const handleExpiry = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setCardData({ ...cardData, expiry: val });
  };

  const processPayment = (method) => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      if (onSuccess) {
        onSuccess({ method, transactionId: 'TXN-' + Date.now() });
      }
    }, 2000);
  };

  const submitCard = () => {
    const err = {};

    if (cardData.number.length < 19) {
      err.number = t('payment.errNumber');
    }
    if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      err.expiry = t('payment.errExpiry');
    }
    if (cardData.cvv.length < 3) {
      err.cvv = t('payment.errCvv');
    }
    if (!cardData.name.trim()) {
      err.name = t('payment.errName');
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    setErrors({});
    processPayment('card');
  };

  return (
    <div
      className="mod-card mod-card-pad-lg"
      style={{
        background: 'var(--color-paper)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          padding: '1rem',
          background: 'var(--color-paper-dim)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--color-blueprint)',
          }}
        >
          {t('payment.amount')}
        </span>

        <div
          style={{
            fontFamily: 'var(--font-stencil)',
            fontSize: '2rem',
            color: 'var(--color-text-strong)',
          }}
        >
          {formatCurrency(amount)}
        </div>
      </div>

      <div
        className="payment-tabs"
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <button
          className={`payment-tab ${activeTab === 'card' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('card')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'card'
                ? '2px solid var(--color-brass)'
                : '2px solid transparent',
            color:
              activeTab === 'card'
                ? 'var(--color-ink)'
                : 'var(--color-charcoal)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: activeTab === 'card' ? 'bold' : 'normal',
          }}
        >
          <CreditCard size={18} /> {t('payment.tabCard')}
        </button>

        <button
          className={`payment-tab ${activeTab === 'bkash' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('bkash')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'bkash'
                ? '2px solid var(--color-brass)'
                : '2px solid transparent',
            color:
              activeTab === 'bkash'
                ? 'var(--color-ink)'
                : 'var(--color-charcoal)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: activeTab === 'bkash' ? 'bold' : 'normal',
          }}
        >
          <Smartphone size={18} /> {t('payment.tabBkash')}
        </button>

        <button
          className={`payment-tab ${activeTab === 'cash' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('cash')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'cash'
                ? '2px solid var(--color-brass)'
                : '2px solid transparent',
            color:
              activeTab === 'cash'
                ? 'var(--color-ink)'
                : 'var(--color-charcoal)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: activeTab === 'cash' ? 'bold' : 'normal',
          }}
        >
          <Banknote size={18} /> {t('payment.tabCash')}
        </button>
      </div>

      <div style={{ minHeight: '250px' }}>
        {activeTab === 'card' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div className="mod-field">
              <label
                className="mod-label"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.25rem',
                  color: 'var(--color-text-strong)',
                }}
              >
                {t('payment.cardNumber')}
              </label>

              <input
                type="text"
                className={`mod-input ${errors.number ? 'has-error' : ''}`}
                value={cardData.number}
                onChange={handleCardNumber}
                placeholder="XXXX XXXX XXXX XXXX"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.number
                    ? '1px solid var(--color-error)'
                    : '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />

              {errors.number && (
                <div
                  className="mod-error"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                  }}
                >
                  {errors.number}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
              }}
            >
              <div className="mod-field">
                <label
                  className="mod-label"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    marginBottom: '0.25rem',
                    color: 'var(--color-text-strong)',
                  }}
                >
                  {t('payment.expiry')}
                </label>

                <input
                  type="text"
                  className={`mod-input ${errors.expiry ? 'has-error' : ''}`}
                  value={cardData.expiry}
                  onChange={handleExpiry}
                  placeholder={t('payment.expiryPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.expiry
                      ? '1px solid var(--color-error)'
                      : '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />

                {errors.expiry && (
                  <div
                    className="mod-error"
                    style={{
                      color: 'var(--color-error)',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    {errors.expiry}
                  </div>
                )}
              </div>

              <div className="mod-field">
                <label
                  className="mod-label"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    marginBottom: '0.25rem',
                    color: 'var(--color-text-strong)',
                  }}
                >
                  {t('payment.cvv')}
                </label>

                <input
                  type="password"
                  maxLength={3}
                  className={`mod-input ${errors.cvv ? 'has-error' : ''}`}
                  value={cardData.cvv}
                  onChange={(e) =>
                    setCardData({
                      ...cardData,
                      cvv: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  placeholder="123"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.cvv
                      ? '1px solid var(--color-error)'
                      : '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />

                {errors.cvv && (
                  <div
                    className="mod-error"
                    style={{
                      color: 'var(--color-error)',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    {errors.cvv}
                  </div>
                )}
              </div>
            </div>

            <div className="mod-field">
              <label
                className="mod-label"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: '0.25rem',
                  color: 'var(--color-text-strong)',
                }}
              >
                {t('payment.cardholder')}
              </label>

              <input
                type="text"
                className={`mod-input ${errors.name ? 'has-error' : ''}`}
                value={cardData.name}
                onChange={(e) =>
                  setCardData({ ...cardData, name: e.target.value })
                }
                placeholder={t('payment.cardholderPlaceholder')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.name
                    ? '1px solid var(--color-error)'
                    : '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />

              {errors.name && (
                <div
                  className="mod-error"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                  }}
                >
                  {errors.name}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={submitCard}
              disabled={processing}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginTop: '1rem',
                background: 'var(--color-brass)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              {processing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                t('payment.payNow')
              )}
            </button>
          </div>
        )}

        {activeTab === 'bkash' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            {!otpSent ? (
              <>
                <div className="mod-field" style={{ width: '100%' }}>
                  <label
                    className="mod-label"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      marginBottom: '0.25rem',
                      color: 'var(--color-text-strong)',
                    }}
                  >
                    {t('payment.bkashAccount')}
                  </label>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-line)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        padding: '0.75rem',
                        background: 'var(--color-paper-dim)',
                        borderRight: '1px solid var(--color-line)',
                        color: 'var(--color-charcoal)',
                      }}
                    >
                      +88
                    </span>

                    <input
                      type="text"
                      className="mod-input"
                      value={bkashPhone}
                      onChange={(e) => setBkashPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-ghost"
                  onClick={() => setOtpSent(true)}
                  disabled={bkashPhone.length < 11}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    background: 'transparent',
                    color: 'var(--color-text-strong)',
                    border: '1px solid var(--color-ink)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 'bold',
                    cursor:
                      bkashPhone.length < 11 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {t('payment.sendOtp')}
                </button>
              </>
            ) : (
              <>
                <div className="mod-field" style={{ width: '100%' }}>
                  <label
                    className="mod-label"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      marginBottom: '0.25rem',
                      color: 'var(--color-text-strong)',
                    }}
                  >
                    {t('payment.enterOtp')}
                  </label>

                  <input
                    type="text"
                    maxLength={6}
                    className="mod-input"
                    value={bkashOtp}
                    onChange={(e) =>
                      setBkashOtp(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="XXXXXX"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--color-line)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                      letterSpacing: '0.25em',
                      fontSize: '1.25rem',
                    }}
                  />
                </div>

                <button
                  className="btn btn-primary btn-block"
                  onClick={() => processPayment('bkash')}
                  disabled={bkashOtp.length < 6 || processing}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    background: 'var(--color-brass)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor:
                      bkashOtp.length < 6 || processing
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {processing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    t('payment.verifyPay')
                  )}
                </button>
              </>
            )}

            <div
              style={{
                color: 'var(--color-brass)',
                fontSize: '0.75rem',
                marginTop: '1rem',
              }}
            >
              {t('payment.poweredBy')}
            </div>
          </div>
        )}

        {activeTab === 'cash' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <div
              className="mod-card mod-card-pad"
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '1rem',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-paper-dim)',
              }}
            >
              <Banknote
                size={24}
                color="var(--color-text-strong)"
                style={{ flexShrink: 0 }}
              />

              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: 'var(--color-charcoal)',
                  lineHeight: 1.5,
                }}
              >
                {t('payment.cashInfo')}
              </p>
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={() => processPayment('cash')}
              disabled={processing}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--color-brass)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              {processing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                t('payment.confirmCash')
              )}
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-blueprint)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {t('payment.cancel')}
        </button>
      </div>
    </div>
  );
}