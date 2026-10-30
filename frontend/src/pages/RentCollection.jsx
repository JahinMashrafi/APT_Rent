import { useEffect, useState } from 'react';
import AppNavbar from '../components/AppNavbar.jsx';
import Modal from '../components/ui/Modal.jsx';
import PaymentGateway from '../components/lease/PaymentGateway.jsx';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Download, Building2, Smartphone } from 'lucide-react';
import api from '../services/api';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// API/time-slot values stay English (they are sent to the backend); only labels are translated.
const SLOT_KEYS = {
  'Morning (9AM–12PM)': 'morning',
  'Afternoon (12PM–5PM)': 'afternoon',
  'Evening (5PM–8PM)': 'evening',
};

export default function RentCollection() {
  const { t, tx, digits, formatCurrency, formatDate } = useLanguage();
  const billingMonth = formatDate(new Date(2026, 8, 1), 'monthYear');   // "September 2026" / "সেপ্টেম্বর ২০২৬"
  const slotLabel = (value) => t(`rent.slot.${SLOT_KEYS[value] ?? 'morning'}`);
  const showDate = (value) => {
    if (!value) return '-';
    return Number.isNaN(new Date(value).getTime()) ? digits(value) : formatDate(value, 'medium');
  };
  const [activeTab, setActiveTab] = useState('online');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [selectedCashDate, setSelectedCashDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Morning (9AM–12PM)');
  const [cashScheduled, setCashScheduled] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [property] = useState(null);

  useEffect(() => {
    api.rent
      .history()
      .then((data) => {
        setPaymentHistory(data?.data ?? []);
      })
      .catch(() => {});
  }, []);

  const handleCashSchedule = () => {
    if (!selectedCashDate) return;
    // POST /rent/cash-schedule — best-effort; UI still confirms locally.
    api.rent
      .scheduleCashPickup({
        contract_id: property?.contractId,
        collection_date: selectedCashDate,
        time_preference: selectedTimeSlot,
      })
      .catch(() => {});
    setCashScheduled(true);
  };

  const handlePaymentSuccess = (details) => {
    setShowPaymentModal(false);
    setPaymentSuccess(true);
    setPaymentDetails(details);
    // POST /payments
    api.rent.payments
      .create({
        contract_id: property?.contractId,
        property_id: property?.id,
        owner_id: property?.landlord?.id,
        amount: 45000,
        payment_method: details?.method ?? 'bkash',
        transaction_ref: details?.reference ?? '',
      })
      .catch(() => {});
  };

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main">
        <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>{t('rent.eyebrow')}</span>
        <h1 className="module-title" style={{ marginBottom: '2rem' }}>{t('rent.title')}</h1>
        
        <div className="mod-card mod-card-pad-lg" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: 'var(--color-brass)', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-strong)' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-text-strong)', fontSize: '1.1rem' }}>{property?.title || t('rent.noActive')}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-blueprint)' }}>{property?.address || t('rent.noActiveHint')}</div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-text-strong)', fontWeight: 600, marginBottom: '4px' }}>{billingMonth}</div>
              <div style={{ fontFamily: 'var(--font-stencil)', fontSize: '2rem', color: 'var(--color-text-strong)', marginBottom: '8px' }}>
                {formatCurrency(45000)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <span className="badge badge-warn">{t('rent.due')}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}>{t('rent.dueBy', { date: formatDate(new Date(2026, 8, 5), 'long') })}</span>
              </div>
              {paymentSuccess ? (
                <div style={{ backgroundColor: 'rgba(76,122,93,0.1)', border: '1px solid var(--color-success)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <CheckCircle size={20} />
                  <span>{t('rent.paidFor', { month: billingMonth, txn: paymentDetails?.transactionId ?? '' })}</span>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => setActiveTab('online')}>{t('rent.payNow')}</button>
              )}
            </div>
          </div>
        </div>

        <div className="pill-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button className={`pill-tab ${activeTab === 'online' ? 'is-active' : ''}`} onClick={() => setActiveTab('online')}>
             {t('rent.tabOnline')}
          </button>
          <button className={`pill-tab ${activeTab === 'cash' ? 'is-active' : ''}`} onClick={() => setActiveTab('cash')}>
             {t('rent.tabCash')}
          </button>
        </div>

        {activeTab === 'online' && (
          <div className="mod-card mod-card-pad" style={{ marginBottom: '2.5rem' }}>
            <p style={{ color: 'var(--color-blueprint)', marginBottom: '1.5rem' }}>{t('rent.selectMethod')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="mod-card mod-card-pad" style={{ cursor: 'pointer', border: selectedMethod === 'card' ? '2px solid var(--color-brass)' : '1px solid var(--color-line-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} onClick={() => setSelectedMethod('card')}>
                <CreditCard size={32} color="var(--color-text-strong)" />
                <span style={{ fontWeight: 600, color: 'var(--color-text-strong)' }}>{t('rent.card')}</span>
              </div>
              <div className="mod-card mod-card-pad" style={{ cursor: 'pointer', border: selectedMethod === 'bkash' ? '2px solid var(--color-brass)' : '1px solid var(--color-line-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} onClick={() => setSelectedMethod('bkash')}>
                <Smartphone size={32} color="var(--color-text-strong)" />
                <span style={{ fontWeight: 600, color: 'var(--color-text-strong)' }}>{t('rent.bkash')}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-block" disabled={!selectedMethod} onClick={() => setShowPaymentModal(true)}>{t('rent.proceed')}</button>
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={t('rent.modalTitle', { month: billingMonth })} size="lg">
              <PaymentGateway amount={45000} onSuccess={handlePaymentSuccess} onCancel={() => setShowPaymentModal(false)} />
            </Modal>
          </div>
        )}

        {activeTab === 'cash' && (
          <div className="mod-card mod-card-pad" style={{ marginBottom: '2.5rem' }}>
            {cashScheduled ? (
              <div className="success-screen" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle className="success-icon" size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-strong)', marginBottom: '0.5rem' }}>{t('rent.cashScheduled')}</h3>
                <p style={{ color: 'var(--color-text-strong)', marginBottom: '1.5rem' }}>{t('rent.cashScheduledDetail', { date: formatDate(new Date(2026, 8, selectedCashDate), 'long'), slot: slotLabel(selectedTimeSlot) })}</p>
                <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> {t('rent.addToCalendar')}
                </button>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(200,155,60,0.1)', borderLeft: '3px solid var(--color-brass)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', color: 'var(--color-text-strong)' }}>
                  {t('rent.cashNotice')}
                </div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-strong)', marginBottom: '1rem' }}>{t('rent.selectDate')}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {[1, 2, 3, 4, 5].map(day => {
                    const isDisabled = day < 5;
                    const isActive = selectedCashDate === day;
                    return (
                      <button
                        key={day}
                        disabled={isDisabled}
                        onClick={() => setSelectedCashDate(day)}
                        style={{
                          border: '1.5px solid var(--color-line-strong)',
                          borderRadius: 'var(--radius-pill)',
                          padding: '8px 18px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                          background: isActive ? 'var(--color-ink)' : 'transparent',
                          color: isActive ? 'var(--color-paper)' : isDisabled ? 'var(--color-line-strong)' : 'var(--color-ink)',
                          opacity: isDisabled ? 0.5 : 1
                        }}
                      >
                        {formatDate(new Date(2026, 8, day), 'short')}
                      </button>
                    )
                  })}
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="mod-label">{t('rent.timePreference')}</label>
                  <select className="mod-select" value={selectedTimeSlot} onChange={(e) => setSelectedTimeSlot(e.target.value)}>
                    <option value="Morning (9AM–12PM)">{t('rent.slot.morning')}</option>
                    <option value="Afternoon (12PM–5PM)">{t('rent.slot.afternoon')}</option>
                    <option value="Evening (5PM–8PM)">{t('rent.slot.evening')}</option>
                  </select>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#8a8f85', marginBottom: '1.5rem' }}>{t('rent.landlordWillContact')}</p>
                <button className="btn btn-primary btn-block" disabled={!selectedCashDate} onClick={handleCashSchedule}>
                  {t('rent.scheduleCash')}
                </button>
              </>
            )}
          </div>
        )}

        <h2 className="section-heading" style={{ marginBottom: '1rem' }}>{t('rent.history')}</h2>
        
        {/* Desktop View */}
        <div className="mod-card desktop-table-view">
          <style>{`
             @media (max-width: 639px) { .desktop-table-view { display: none !important; } }
             @media (min-width: 640px) { .mobile-only-history { display: none !important; } }
          `}</style>
          <div style={{ overflowX: 'auto' }}>
            <table className="mod-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-line-strong)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>{t('rent.colMonth')}</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>{t('rent.colMethod')}</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>{t('rent.colAmount')}</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>{t('rent.colStatus')}</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>{t('rent.colDatePaid')}</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>{t('rent.colReceipt')}</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-line)', background: item.status === 'overdue' ? 'rgba(181,83,60,0.04)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{digits(item.month)}</td>
                    <td style={{ padding: '12px 16px' }}>{tx('rent.method', String(item.method ?? '').toLowerCase(), item.method)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{formatCurrency(item.amount)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'overdue' ? 'badge-error' : 'badge-warn'}`}>
                        {tx('status', item.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{showDate(item.datePaid)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.status === 'paid' && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-strong)' }} title={t('rent.downloadReceipt')}>
                          <Download size={18} />
                        </button>
                      )}
                      {item.status === 'overdue' && (
                        <AlertCircle size={18} color="var(--color-error)" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="mobile-only-history">
           {paymentHistory.map((item, idx) => (
             <div key={idx} className="mod-card mod-card-pad" style={{ background: item.status === 'overdue' ? 'rgba(181,83,60,0.04)' : 'var(--color-paper)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <div style={{ fontWeight: 600 }}>{digits(item.month)}</div>
                 <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'overdue' ? 'badge-error' : 'badge-warn'}`}>
                    {tx('status', item.status)}
                 </span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#8a8f85', marginBottom: '8px' }}>
                 <span>{tx('rent.method', String(item.method ?? '').toLowerCase(), item.method)}</span>
                 <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(item.amount)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '0.85rem' }}>{t('rent.paidOn', { date: showDate(item.datePaid) })}</span>
                 {item.status === 'paid' && <Download size={18} color="var(--color-text-strong)" />}
                 {item.status === 'overdue' && <AlertCircle size={18} color="var(--color-error)" />}
               </div>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
}