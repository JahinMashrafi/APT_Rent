import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar.jsx';
import Modal from '../components/ui/Modal.jsx';
import PaymentGateway from '../components/lease/PaymentGateway.jsx';
import { FileText, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { adaptProperty } from '../services/adapters';
import { useApp } from '../context/AppContext.jsx';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

export default function LeaseDeposit() {
  const { propertyId } = useParams();
  const { currentUser } = useApp();
  const [property, setProperty] = useState(null);
  const [approvedTenant, setApprovedTenant] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [existingContract, setExistingContract] = useState(null);

  useEffect(() => {
    // adaptProperty, not the raw row: ownership is read off
    // property.landlord.id, which only the adapter exposes.
    api.properties
      .getById(propertyId)
      .then((data) => setProperty(adaptProperty(data)))
      .catch(() => setProperty(null));
    api.applications.list()
      .then((data) => setApprovedTenant(
        (data?.data ?? []).find(
          (application) =>
            application.status === 'approved' &&
            String(application.property_id) === String(propertyId),
        ) ?? null,
      ))
      .catch(() => setApprovedTenant(null));
    api.contracts
      .list()
      .then((data) => {
        const contract = (data?.data ?? []).find(
          (item) => String(item.property_id) === String(propertyId),
        );
        setExistingContract(contract ?? null);
        if (contract) setContractId(contract.contract_id);
      })
      .catch(() => setExistingContract(null));
  }, [propertyId]);

  // Which side of this lease you're on is a fact about the account,
  // not a preference. A "Viewing as" pill let anyone flip to the
  // landlord's offer screen on someone else's flat; ownership decides.
  // Falls back to the tenant side until the property loads, so the
  // owner never sees the tenant screen flash first.
  const isOwner =
    property?.landlord?.id != null &&
    currentUser?.id != null &&
    String(property.landlord.id) === String(currentUser.id);
  const viewAs = isOwner ? 'landlord' : 'tenant';
  const [offerSent, setOfferSent] = useState(false);
  const [expandedClause, setExpandedClause] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDeposit, setAgreedToDeposit] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [offerError, setOfferError] = useState("");

  const handleSendOffer = async () => {
    const tenantId =
      approvedTenant?.tenant?.user_id ??
      approvedTenant?.tenant_id ??
      approvedTenant?.tenantId;
    if (!tenantId) {
      setOfferError("No approved tenant was found for this property.");
      return;
    }

    setOfferError("");
    api.contracts
      .create({
        property_id: property?.id ?? propertyId,
        tenant_id: tenantId,
        rate: property?.pricePerMonth,
        deposit: property?.securityDeposit ?? 0,
        start_date: '2026-10-01',
        end_date: '2027-09-30',
        terms_and_conditions: accordionItems.map((c) => c.content).join(' '),
      })
      .then((created) => {
        setContractId(created?.contract_id ?? null);
        setOfferSent(true);
      })
      .catch((error) => {
        setOfferError(error.response?.data?.message || error.message || "Could not send the lease offer.");
      });
  };

  const handlePaymentSuccess = (details) => {
    setShowPaymentModal(false);
    setPaymentComplete(true);
    setPaymentDetails(details);

    if (contractId) {
      // PATCH /contracts/:id/sign then POST /contracts/:id/deposit
      api.contracts.sign(contractId, details?.signatureImageBase64 ?? '').catch(() => {});
      api.contracts
        .payDeposit(contractId, {
          amount: property?.securityDeposit,
          payment_method: details?.method ?? 'bkash',
          transaction_reference: details?.reference ?? '',
        })
        .catch(() => {});
    }
  };

  const accordionItems = [
    { id: 'terms', title: 'Rental Terms', content: 'Rent amount is fixed for the duration of the lease. Start date: October 1, 2026. End date: September 30, 2027. Payment due 1st–5th of each month.' },
    { id: 'maintenance', title: 'Maintenance & Repairs', content: 'Tenant responsible for minor repairs under ৳2,000; landlord is responsible for structural and major repairs.' },
    { id: 'rules', title: 'House Rules', content: 'No subletting. No structural modifications. Pets allowed with prior written permission only.' },
    { id: 'termination', title: 'Termination Clause', content: '30 days written notice required for termination. Security deposit will be forfeited if vacated early without notice.' },
    { id: 'deposit', title: 'Security Deposit', content: `Security deposit of ৳${(property?.securityDeposit || 90000).toLocaleString('en-BD')} returned within 15 days of move-out if no damage is found.` }
  ];

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main" style={{ maxWidth: '760px', margin: '0 auto', position: 'relative' }}>
        {viewAs === 'landlord' ? (
          <>
            <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lease Management</span>
            <h1 className="module-title">Offer Lease to Tenant</h1>

            {!offerSent ? (
              <div className="mod-card mod-card-pad-lg" style={{ padding: '2rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)', background: 'var(--color-paper)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-ink)', marginBottom: '1.5rem' }}>Lease Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Property', value: `${property?.title} - ${property?.location}` },
                    { label: 'Tenant', value: approvedTenant ? `${approvedTenant.tenantName ?? approvedTenant.tenant?.name ?? 'Unknown'} (${approvedTenant.tenantEmail ?? approvedTenant.tenant?.email ?? 'No email'})` : 'No approved tenant found' },
                    { label: 'Start Date', value: 'October 1, 2026' },
                    { label: 'Duration', value: '12 months' },
                    { label: 'Monthly Rent', value: `৳${(property?.price || 45000).toLocaleString('en-BD')}` },
                    { label: 'Security Deposit', value: `৳${(property?.securityDeposit || 90000).toLocaleString('en-BD')}` },
                    { label: 'Payment Due', value: 'Between 1st–5th of each month' }
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-blueprint)' }}>{item.label}</span>
                      <span style={{ color: 'var(--color-charcoal)', fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-line)', marginBottom: '2rem' }} />
                <button className="btn btn-primary" onClick={handleSendOffer} style={{ padding: '0.75rem 1.5rem', background: 'var(--color-brass)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
                  <FileText size={20} /> Send Lease Offer
                </button>
                {offerError && (
                  <p role="alert" style={{ color: 'var(--color-error)', marginTop: '1rem', fontSize: '0.9rem' }}>
                    {offerError}
                  </p>
                )}
              </div>
            ) : (
              <div className="success-screen" style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--color-paper)', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)' }}>
                <div className="success-icon" style={{ display: 'inline-flex', padding: '1rem', borderRadius: 'var(--radius-pill)', background: 'var(--color-success)', color: '#fff', marginBottom: '1.5rem' }}>
                  <CheckCircle size={36} />
                </div>
                <h2 className="module-title" style={{ marginBottom: '1rem' }}>Lease Offer Sent!</h2>
                <p style={{ color: 'var(--color-charcoal)', marginBottom: '2rem' }}>{approvedTenant?.tenantName ?? approvedTenant?.tenant?.name ?? 'The tenant'} has been notified and can now review and accept the lease.</p>
                <Link to="/landlord" className="btn btn-ghost" style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: 'var(--color-ink)', border: '1px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', display: 'inline-block', fontWeight: 'bold' }}>
                  Return to Dashboard
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Lease Offer</span>
            <h1 className="module-title">Review Your Lease Agreement</h1>

            {existingContract && (
              <div className="mod-card mod-card-pad" style={{ marginBottom: "1.5rem", border: "1px solid var(--color-line)", background: "var(--color-paper-dim)" }}>
                <strong style={{ color: "var(--color-ink)" }}>You have a lease offer for this property.</strong>
                <p style={{ color: "var(--color-charcoal)", margin: "0.5rem 0 1rem" }}>
                  Open the contract to review the landlord&apos;s terms, bargain the rent or deposit, and accept the offer.
                </p>
                <Link to="/contracts" className="btn btn-primary">Open contract</Link>
              </div>
            )}

            {!paymentComplete ? (
              <>
                <div className="mod-card mod-card-pad" style={{ padding: '1rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', background: 'var(--color-paper-dim)' }}>
                  <strong style={{ display: 'block', color: 'var(--color-ink)' }}>{property?.title}</strong>
                  <span style={{ color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>{property?.location}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                  {accordionItems.map(item => {
                    const isExpanded = expandedClause === item.id;
                    return (
                      <div key={item.id} className="lease-accordion-item" style={{ border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <button 
                          className="lease-accordion-trigger" 
                          onClick={() => setExpandedClause(isExpanded ? null : item.id)}
                          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: isExpanded ? 'var(--color-paper-dim)' : 'var(--color-paper)', border: 'none', cursor: 'pointer', color: 'var(--color-ink)', fontWeight: 600, textAlign: 'left' }}
                        >
                          {item.title}
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        {isExpanded && (
                          <div className="lease-accordion-body" style={{ padding: '1rem', background: 'var(--color-paper)', color: 'var(--color-charcoal)', borderTop: '1px solid var(--color-line)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            {item.content}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <label className="field-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                    <span style={{ color: 'var(--color-charcoal)', fontSize: '0.95rem' }}>I have read and agree to all lease terms and conditions</span>
                  </label>
                  <label className="field-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={agreedToDeposit} onChange={e => setAgreedToDeposit(e.target.checked)} style={{ marginTop: '0.25rem' }} />
                    <span style={{ color: 'var(--color-charcoal)', fontSize: '0.95rem' }}>I understand the security deposit conditions</span>
                  </label>
                </div>

                <button 
                  className="btn btn-primary btn-block" 
                  disabled={!agreedToTerms || !agreedToDeposit}
                  onClick={() => setShowPaymentModal(true)}
                  style={{ width: '100%', padding: '0.75rem', background: (agreedToTerms && agreedToDeposit) ? 'var(--color-brass)' : 'var(--color-line)', color: (agreedToTerms && agreedToDeposit) ? '#fff' : 'var(--color-charcoal)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: (agreedToTerms && agreedToDeposit) ? 'pointer' : 'not-allowed', fontSize: '1rem' }}
                >
                  Accept Lease & Pay Security Deposit
                </button>
                
                <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pay Security Deposit" size="lg">
                  <PaymentGateway
                    amount={property?.securityDeposit || 90000}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setShowPaymentModal(false)}
                  />
                </Modal>
              </>
            ) : (
              <div className="success-screen" style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--color-paper)', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)' }}>
                <div className="success-icon" style={{ display: 'inline-flex', padding: '1rem', borderRadius: 'var(--radius-pill)', background: 'var(--color-success)', color: '#fff', marginBottom: '1.5rem' }}>
                  <CheckCircle size={36} />
                </div>
                <h2 className="module-title" style={{ marginBottom: '1rem' }}>Lease Accepted & Deposit Paid!</h2>
                <div style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: 'var(--color-paper-dim)', color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
                  TXN ID: {paymentDetails?.transactionId}
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: 'var(--color-ink)', border: '1px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer' }}>
                    Download Receipt
                  </button>
                  <Link to="/inbox" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--color-brass)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontWeight: 'bold' }}>
                    Go to Inbox
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
