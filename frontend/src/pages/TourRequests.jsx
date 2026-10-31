import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar.jsx';
import SlotPicker from '../components/tour/SlotPicker.jsx';
import { Calendar, CheckCircle, Clock, Inbox as InboxIcon } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/ui/Toast.jsx';
import useTourNegotiation from '../hooks/useTourNegotiation.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { formatDateLong, formatTime } from '../utils/tour.js';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';




export default function TourRequests() {
  const { showToast } = useToast();
  const { t, lang, digits } = useLanguage();

  const {
    isLoading,
    requests,
    currentProposals,
    appointments,
    confirmed,
    reload,
  } = useTourNegotiation();

  const [activeRequestId, setActiveRequestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openRequests = requests.filter((row) => row.status === 'pending');
  const pastRequests = requests.filter((row) => row.status !== 'pending');

  const activeRequest =
    openRequests.find(
      (row) => String(row.appointment_id) === String(activeRequestId),
    ) ?? null;

  const confirmedByBatch = new Map(
    appointments
      .filter((row) => row.status === 'confirmed' && !row.is_request)
      .map((row) => [row.appointment_batch_id, row]),
  );

  const handlePropose = async (slots) => {
    if (!activeRequest || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await api.appointments.propose({
        property_id: activeRequest.property_id,
        request_id: activeRequest.appointment_id,
        slots,
      });

      await reload();
      setActiveRequestId(null);

      showToast({
        message: t('tours.sentToast'),
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: error.message || t('tours.sendFailed'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatus = (request) => {
    const confirmedSlot = confirmedByBatch.get(
      request.appointment_batch_id,
    );

    if (request.status === 'confirmed' || confirmedSlot) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--color-success, #2f7d5d)',
            fontSize: '0.8rem',
          }}
        >
          <CheckCircle size={14} /> {t('tours.confirmed')}
        </span>
      );
    }

    if (request.status === 'cancelled') {
      return (
        <span
          style={{
            color: 'var(--color-charcoal)',
            fontSize: '0.8rem',
          }}
        >
          {t('tours.cancelled')}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="module-shell">
      <AppNavbar />

      <main
        className="module-main"
        style={{ maxWidth: '760px', margin: '0 auto' }}
      >
        <span
          className="eyebrow"
          style={{
            color: 'var(--color-blueprint)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {t('tours.eyebrow')}
        </span>

        <h1 className="module-title">{t('tours.title')}</h1>

        <p className="module-subtitle">
          {t('tours.subtitle')}
        </p>

        {isLoading ? (
          <p
            className="module-subtitle"
            style={{ marginTop: '2rem' }}
          >
            {t('common.loading')}
          </p>
        ) : (
          <>
            <section style={{ marginTop: '2rem' }}>
              <h2
                className="section-heading"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-text-strong)',
                }}
              >
                <InboxIcon size={18} />{' '}
                {t('tours.waiting', { count: openRequests.length })}
              </h2>

              {openRequests.length === 0 ? (
                <div
                  className="mod-card mod-card-pad"
                  style={{
                    padding: '2rem',
                    border: '1px dashed var(--color-line-strong)',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    color: 'var(--color-charcoal)',
                  }}
                >
                  {t('tours.empty')}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {openRequests.map((request) => {
                    const proposals = currentProposals.filter(
                      (row) =>
                        row.appointment_batch_id ===
                        request.appointment_batch_id,
                    );

                    const isAnswering =
                      String(activeRequestId) ===
                      String(request.appointment_id);

                    return (
                      <div
                        key={request.appointment_id}
                        className="mod-card mod-card-pad"
                        style={{
                          padding: '1.25rem',
                          border: '1px solid var(--color-line)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-paper)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '1rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <Link
                              to={`/property/${request.property_id}`}
                              style={{
                                fontSize: '1.05rem',
                                fontFamily: 'var(--font-display)',
                                color: 'var(--color-text-strong)',
                                textDecoration: 'none',
                              }}
                            >
                              {request.address ||
                                t('tours.propertyNum', {
                                  id: digits(request.property_id),
                                })}
                            </Link>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginTop: '0.75rem',
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background: 'var(--color-blueprint)',
                                  color: '#fff',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                }}
                              >
                                {(request.counterpart_name || '?')
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <span
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                }}
                              >
                                <strong
                                  style={{
                                    color: 'var(--color-text-strong)',
                                    fontSize: '0.95rem',
                                  }}
                                >
                                  {request.counterpart_name ||
                                    t('tours.unknownTenant')}
                                </strong>

                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    color: 'var(--color-charcoal)',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <Calendar size={13} />

                                  {request.is_date_less
                                    ? t('tours.noDateYet')
                                    : t('tours.askedFor', {
                                      date: formatDateLong(
                                        request.appointment_date,
                                        lang,
                                      ),
                                      time: formatTime(
                                        request.appointment_time,
                                        lang,
                                      ),
                                    })}
                                </span>
                              </span>
                            </div>

                            {proposals.length > 0 && (
                              <div
                                style={{
                                  marginTop: '0.5rem',
                                  color: 'var(--color-blueprint)',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {t('tours.waitingTenant', {
                                  count: proposals.length,
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() =>
                              setActiveRequestId(
                                isAnswering
                                  ? null
                                  : request.appointment_id,
                              )
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 1.1rem',
                              borderRadius: 'var(--radius-sm)',
                              border: 'none',
                              background: 'var(--color-brass)',
                              color: '#fff',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Clock size={15} />

                            {isAnswering
                              ? t('common.close')
                              : proposals.length > 0
                                ? t('tours.offerMore')
                                : t('tours.offer')}
                          </button>
                        </div>

                        {isAnswering && (
                          <div
                            style={{
                              marginTop: '1.5rem',
                              paddingTop: '1.5rem',
                              borderTop: '1px solid var(--color-line)',
                            }}
                          >
                            <SlotPicker
                              onSubmit={handlePropose}
                              submitting={isSubmitting}
                              submitLabel={
                                proposals.length > 0
                                  ? t('tours.replaceTimes')
                                  : t('tours.sendTimes')
                              }
                              excludedSlots={
                                request.is_date_less
                                  ? []
                                  : [
                                    `${String(
                                      request.appointment_date,
                                    ).slice(0, 10)}|${String(
                                      request.appointment_time,
                                    ).slice(0, 5)}`,
                                  ]
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {(pastRequests.length > 0 || confirmed) && (
              <section style={{ marginTop: '3rem' }}>
                <h2
                  className="section-heading"
                  style={{
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text-strong)',
                  }}
                >
                  {t('tours.history')}
                </h2>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {pastRequests.map((request) => (
                    <div
                      key={request.appointment_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.85rem 1rem',
                        border: '1px solid var(--color-line)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-paper-dim)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--color-text-strong)',
                          fontSize: '0.9rem',
                        }}
                      >
                        {request.counterpart_name} —{' '}
                        {request.address ||
                          t('tours.propertyNum', {
                            id: digits(request.property_id),
                          })}
                      </span>

                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--color-charcoal)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {(() => {
                            const slot = confirmedByBatch.get(request.appointment_batch_id);
                            if (slot) {
                              return `${formatDateLong(slot.appointment_date, lang)} · ${formatTime(slot.appointment_time, lang)}`;
                            }
                            return request.is_date_less
                              ? t('tours.noDate')
                              : formatDateLong(request.appointment_date, lang);
                          })()}
                        </span>

                        {renderStatus(request)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}