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

export default function RentCollection() {
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
        <span className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Rent & Billing</span>
        <h1 className="module-title" style={{ marginBottom: '2rem' }}>Pay Your Rent</h1>
        
        <div className="mod-card mod-card-pad-lg" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: 'var(--color-brass)', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: '1.1rem' }}>{property?.title || 'No active rental found'}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-blueprint)' }}>{property?.address || 'Rental details will appear here after the API responds.'}</div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: '4px' }}>September 2026</div>
              <div style={{ fontFamily: 'var(--font-stencil)', fontSize: '2rem', color: 'var(--color-ink)', marginBottom: '8px' }}>
                ৳45,000
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <span className="badge badge-warn">Due</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}>Due by September 5, 2026</span>
              </div>
              {paymentSuccess ? (
                <div style={{ backgroundColor: 'rgba(76,122,93,0.1)', border: '1px solid var(--color-success)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <CheckCircle size={20} />
                  <span>Paid for September 2026 — TXN #{paymentDetails?.transactionId}</span>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => setActiveTab('online')}>Pay Now</button>
              )}
            </div>
          </div>
        </div>

        <div className="pill-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button className={`pill-tab ${activeTab === 'online' ? 'is-active' : ''}`} onClick={() => setActiveTab('online')}>
             Pay Online
          </button>
          <button className={`pill-tab ${activeTab === 'cash' ? 'is-active' : ''}`} onClick={() => setActiveTab('cash')}>
             Pay with Cash
          </button>
        </div>

        {activeTab === 'online' && (
          <div className="mod-card mod-card-pad" style={{ marginBottom: '2.5rem' }}>
            <p style={{ color: 'var(--color-blueprint)', marginBottom: '1.5rem' }}>Select an online payment method to securely pay your rent.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="mod-card mod-card-pad" style={{ cursor: 'pointer', border: selectedMethod === 'card' ? '2px solid var(--color-brass)' : '1px solid var(--color-line-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} onClick={() => setSelectedMethod('card')}>
                <CreditCard size={32} color="var(--color-ink)" />
                <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Credit/Debit Card</span>
              </div>
              <div className="mod-card mod-card-pad" style={{ cursor: 'pointer', border: selectedMethod === 'bkash' ? '2px solid var(--color-brass)' : '1px solid var(--color-line-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} onClick={() => setSelectedMethod('bkash')}>
                <Smartphone size={32} color="var(--color-ink)" />
                <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>bKash</span>
              </div>
            </div>
            <button className="btn btn-primary btn-block" disabled={!selectedMethod} onClick={() => setShowPaymentModal(true)}>Proceed to Payment</button>
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pay Rent — September 2026" size="lg">
              <PaymentGateway amount={45000} onSuccess={handlePaymentSuccess} onCancel={() => setShowPaymentModal(false)} />
            </Modal>
          </div>
        )}

        {activeTab === 'cash' && (
          <div className="mod-card mod-card-pad" style={{ marginBottom: '2.5rem' }}>
            {cashScheduled ? (
              <div className="success-screen" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle className="success-icon" size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-ink)', marginBottom: '0.5rem' }}>Cash Payment Scheduled!</h3>
                <p style={{ color: 'var(--color-ink)', marginBottom: '1.5rem' }}>Your pickup is scheduled for September {selectedCashDate}, 2026 during the {selectedTimeSlot}.</p>
                <button className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Add to Calendar
                </button>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(200,155,60,0.1)', borderLeft: '3px solid var(--color-brass)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', color: 'var(--color-ink)' }}>
                  Cash payments must be scheduled between the 1st and 5th of each month.
                </div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-ink)', marginBottom: '1rem' }}>Select a date for cash handover</h3>
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
                        Sep {day}
                      </button>
                    )
                  })}
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="mod-label">Time preference</label>
                  <select className="mod-select" value={selectedTimeSlot} onChange={(e) => setSelectedTimeSlot(e.target.value)}>
                    <option value="Morning (9AM–12PM)">Morning (9AM–12PM)</option>
                    <option value="Afternoon (12PM–5PM)">Afternoon (12PM–5PM)</option>
                    <option value="Evening (5PM–8PM)">Evening (5PM–8PM)</option>
                  </select>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#8a8f85', marginBottom: '1.5rem' }}>The landlord will contact you to confirm the pickup location.</p>
                <button className="btn btn-primary btn-block" disabled={!selectedCashDate} onClick={handleCashSchedule}>
                  Schedule Cash Payment
                </button>
              </>
            )}
          </div>
        )}

        <h2 className="section-heading" style={{ marginBottom: '1rem' }}>Payment History</h2>
        
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
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>Month</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>Method</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>Amount</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>Date Paid</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-blueprint)' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-line)', background: item.status === 'overdue' ? 'rgba(181,83,60,0.04)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.month}</td>
                    <td style={{ padding: '12px 16px' }}>{item.method}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>৳{item.amount.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'overdue' ? 'badge-error' : 'badge-warn'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{item.datePaid || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.status === 'paid' && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }} title="Download Receipt">
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
                 <div style={{ fontWeight: 600 }}>{item.month}</div>
                 <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'overdue' ? 'badge-error' : 'badge-warn'}`}>
                    {item.status}
                 </span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#8a8f85', marginBottom: '8px' }}>
                 <span>{item.method}</span>
                 <span style={{ fontFamily: 'var(--font-mono)' }}>৳{item.amount.toLocaleString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: '0.85rem' }}>Paid: {item.datePaid || '-'}</span>
                 {item.status === 'paid' && <Download size={18} color="var(--color-ink)" />}
                 {item.status === 'overdue' && <AlertCircle size={18} color="var(--color-error)" />}
               </div>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
}
