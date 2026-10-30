import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar.jsx';
import { CheckCircle, Hourglass, XCircle } from 'lucide-react';
import api from '../services/api';
import { adaptProperty } from '../services/adapters.js';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import useTourNegotiation from '../hooks/useTourNegotiation.js';
import {
  formatDateLong,
  formatTime,
} from '../utils/tour.js';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

// =============================================================================
// TourScheduling — request a viewing of one property, then respond to the
// times the landlord offers back.
//
// The flow, end to end:
//   1. Tenant requests a viewing.                 POST /appointments/request
//   2. Landlord is notified, and offers 3 times. POST /appointments
//   3. Tenant picks one,                         PATCH /:id/confirm
//      or rejects all 3,                         PATCH /:id/reject
//      which sends the landlord back to step 2.
//
// This page previously faked both sides with a "Viewing as" toggle and a
// hardcoded date. It now talks to the API and polls so each side sees the
// other's step without a refresh.
// =============================================================================

export default function TourScheduling() {
  const { propertyId } = useParams();
  const { currentUser } = useApp();
  const { showToast } = useToast();

  const [property, setProperty] = useState(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);

  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isRebooking, setIsRebooking] = useState(false);

  const { isLoading, openRequest, currentProposals, confirmed, reload } =
    useTourNegotiation({ propertyId });

  useEffect(() => {
    let cancelled = false;
    api.properties
      .getById(propertyId)
      .then((data) => {
        if (!cancelled) setProperty(adaptProperty(data));
      })
      .catch(() => {
        if (!cancelled) setProperty(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProperty(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const handleRequest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError("");
    try {
      await api.appointments.request({
        property_id: propertyId,
        note: note.trim() || undefined,
      });
      setNote("");
      setIsRebooking(false);
      await reload();
      showToast({ message: "Tour requested. The landlord has been notified.", type: "success" });
    } catch (error) {
      setActionError(error.message || "Could not request a tour.");
      showToast({ message: error.message || "Could not request a tour.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (appointmentId) => {
    setIsSubmitting(true);
    setActionError("");
    try {
      await api.appointments.confirm(appointmentId, appointmentId);
      await reload();
      showToast({ message: "Tour confirmed.", type: "success" });
    } catch (error) {
      setActionError(error.message || "Could not confirm the tour.");
      showToast({ message: error.message || "Could not confirm the tour.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // One click turns down the whole set. Passing any of the three is
  // enough — the backend cancels every pending proposal in the batch.
  const handleReject = async (appointmentId) => {
    setIsSubmitting(true);
    setActionError("");
    try {
      await api.appointments.reject(appointmentId, "None of these times work for me");
      await reload();
      showToast({ message: "Times rejected. The landlord can now suggest others.", type: "info" });
    } catch (error) {
      setActionError(error.message || "Could not reject these times.");
      showToast({ message: error.message || "Could not reject these times.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Distinct from rejecting: this withdraws the request itself, closing
  // the negotiation. Rejecting leaves the request open for another round.
  const handleCancelRequest = async (appointmentId) => {
    setIsSubmitting(true);
    setActionError("");
    try {
      await api.appointments.cancel(appointmentId, "Cancelled by tenant");
      await reload();
      showToast({ message: "Tour request cancelled.", type: "info" });
    } catch (error) {
      setActionError(error.message || "Could not cancel the request.");
      showToast({ message: error.message || "Could not cancel the request.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner =
    property?.landlord?.id != null &&
    currentUser?.id != null &&
    String(property.landlord.id) === String(currentUser.id);
  const confirmedDateTime = confirmed
    ? new Date(`${String(confirmed.appointment_date).slice(0, 10)}T${confirmed.appointment_time}`)
    : null;
  const confirmedPast = confirmedDateTime && confirmedDateTime < new Date();

  // ------------------------------------------------------------------ states

  let content;

  if (isLoadingProperty || isLoading) {
    content = <p className="module-subtitle">Loading…</p>;
  } else if (!property) {
    content = (
      <>
        <h1 className="module-title">Property not found</h1>
        <p className="module-subtitle">This listing is no longer available.</p>
      </>
    );
  } else if (isOwner) {
    // Landlords don't request tours of their own flats; they answer them
    // from the requests page.
    content = (
      <>
        <h1 className="module-title">This is your property</h1>
        <p className="module-subtitle">
          Tour requests from tenants are answered on your requests page.
        </p>
        <Link to="/tour-requests" className="btn btn-primary">Go to Tour Requests</Link>
      </>
    );
  } else if (confirmed && !isRebooking && !openRequest) {
    content = (
      <div className="success-screen">
        <div className="success-icon"><CheckCircle size={36} /></div>
        <h2 className="module-title">Tour Confirmed!</h2>
        <p>{formatDateLong(confirmed.appointment_date)} at {formatTime(confirmed.appointment_time)}</p>
        <p>{property.title} — {property.address}</p>
        <div className="action-btns" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
          {confirmedPast && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsRebooking(true)}
            >
              Request a new tour
            </button>
          )}
          <Link to={`/property/${property.id}`} className="btn btn-ghost">Back to Property</Link>
          <Link to="/inbox" className="btn btn-primary">Go to Inbox</Link>
        </div>
      </div>
    );
  } else if (currentProposals.length > 0) {
    content = (
      <>
        <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Turn</span>
        <h1 className="module-title">Choose Your Tour Time</h1>
        <p className="module-subtitle">
          The landlord offered 3 times. Pick the one that works best, or reject them all if none do.
        </p>

        <div className="mod-card mod-card-pad" style={{ padding: '1rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', margin: '1.5rem 0 2rem', background: 'var(--color-paper-dim)' }}>
          <strong style={{ display: 'block', color: 'var(--color-text-strong)' }}>{property.title}</strong>
          <span style={{ color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>{property.address}</span>
          {openRequest && (
            <span style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-charcoal)', fontSize: '0.85rem' }}>
              You asked to view this property. The landlord will offer 3 available times.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {currentProposals.map((proposal) => (
            <div
              key={proposal.appointment_id}
              className="tour-slot-card"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem', padding: '1.5rem', width: '100%', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: 'var(--color-paper)' }}
            >
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-blueprint)', textTransform: 'uppercase' }}>{formatDateLong(proposal.appointment_date)}</span>
              <span style={{ fontSize: '2rem', fontFamily: 'var(--font-stencil)', color: 'var(--color-text-strong)' }}>{formatTime(proposal.appointment_time)}</span>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  onClick={() => handleConfirm(proposal.appointment_id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-brass)', color: '#fff', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  <CheckCircle size={16} /> Confirm this time
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={isSubmitting}
                  onClick={() => handleReject(proposal.appointment_id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-line-strong)', background: 'none', color: 'var(--color-text-strong)', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  <XCircle size={16} /> Reject all 3
                </button>
              </div>
            </div>
          ))}
        </div>

        {actionError && (
          <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{actionError}</p>
        )}
      </>
    );
  } else if (openRequest) {
    // Request is live but the landlord hasn't answered this round yet.
    content = (
      <>
        <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiting on Landlord</span>
        <h1 className="module-title">Request Sent</h1>
        <p className="module-subtitle">
          {openRequest.is_date_less ? (
            <>
              You asked to view {property.title}. The landlord has been notified and will offer 3
              times to choose from.
            </>
          ) : (
            <>
              You asked to view {property.title} on {formatDateLong(openRequest.appointment_date)} at{" "}
              {formatTime(openRequest.appointment_time)}. The landlord has been notified and will
              offer 3 times to choose from.
            </>
          )}
        </p>

        <div className="mod-card mod-card-pad" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', marginTop: '2rem', background: 'var(--color-paper-dim)' }}>
          <Hourglass size={20} style={{ color: 'var(--color-blueprint)', flexShrink: 0 }} />
          <span style={{ color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>
            This page updates on its own — you&apos;ll see the times here as soon as they arrive.
          </span>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isSubmitting}
            onClick={() => handleCancelRequest(openRequest.appointment_id)}
            style={{ padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-line-strong)', background: 'none', color: 'var(--color-text-strong)', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            Cancel this request
          </button>
          {actionError && (
            <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '1rem' }}>{actionError}</p>
          )}
        </div>
      </>
    );
  } else {
    // No live request (or a past confirmed tour being rebooked): show the ask form.
    const canSubmit = !isSubmitting;
    content = (
      <>
        <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 1 of 2</span>
        <h1 className="module-title">{isRebooking ? "Request a New Tour" : "Request a Tour"}</h1>
        <p className="module-subtitle">
          Send a viewing request with an optional note. The landlord will reply with 3 available times
          for you to choose from.
        </p>

        <div className="mod-card mod-card-pad" style={{ padding: '1rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', margin: '1.5rem 0 2rem', background: 'var(--color-paper-dim)' }}>
          <strong style={{ display: 'block', color: 'var(--color-text-strong)' }}>{property.title}</strong>
          <span style={{ color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>{property.address}</span>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <label htmlFor="tour-note" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-strong)' }}>
            Note for the landlord <span style={{ opacity: 0.6 }}>(optional)</span>
          </label>
          <textarea
            id="tour-note"
            rows={3}
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. I can come any weekday evening."
            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: 'var(--color-paper)', color: 'var(--color-text-strong)', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!canSubmit}
            onClick={handleRequest}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: canSubmit ? 'var(--color-brass)' : 'var(--color-line)', color: canSubmit ? '#fff' : 'var(--color-charcoal)', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
          >
            {isSubmitting ? "Sending…" : "Request Tour"}
          </button>
          {actionError && (
            <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '1rem' }}>{actionError}</p>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main" style={{ maxWidth: '700px', margin: '0 auto' }}>
        {content}
      </main>
    </div>
  );
}