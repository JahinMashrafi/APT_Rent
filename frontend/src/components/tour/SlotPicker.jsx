import { useState } from 'react';
import { Calendar, Clock, X, Plus } from 'lucide-react';
import {
  TIME_OPTIONS,
  formatDateLong,
  formatTime,
  shortWeekday,
  toDateString,
  upcomingDays,
} from '../../utils/tour.js';

// =============================================================================
// SlotPicker — pick exactly 3 date/time combinations
//
// Used by the landlord both to answer a tenant's request and to send an
// unprompted batch. Keeping it separate means the tenant page and the
// dedicated requests page stay thin, and the two can't drift apart.
//
// The visual design is carried over from the original TourScheduling
// simulator; only the data source changed.
// =============================================================================

const REQUIRED_SLOTS = 3;

export default function SlotPicker({
  onSubmit,
  submitting = false,
  submitLabel = "Send Options to Tenant",
  // "YYYY-MM-DD|HH:MM" keys the caller already has on the table — the
  // times the tenant suggested — so the landlord doesn't re-offer them.
  excludedSlots = [],
  emptyState = "No times available.",
}) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);

  const days = upcomingDays();
  const excluded = new Set(excludedSlots);

  const handleDayClick = (day) => {
    setSelectedDay(toDateString(day));
  };

  const handleTimeClick = (time) => {
    if (!selectedDay) return;
    const key = `${selectedDay}|${time}`;
    if (selectedSlots.some((slot) => slot.key === key)) return;
    if (excluded.has(key)) return;
    if (selectedSlots.length >= REQUIRED_SLOTS) return;
    setSelectedSlots([...selectedSlots, { key, date: selectedDay, time }]);
  };

  const removeSlot = (index) => {
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selectedSlots.length !== REQUIRED_SLOTS || submitting) return;
    onSubmit(
      selectedSlots.map((slot) => ({
        appointment_date: slot.date,
        appointment_time: slot.time,
      })),
    );
  };

  const isComplete = selectedSlots.length === REQUIRED_SLOTS;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      <div>
        <h3 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          <Calendar size={18} /> Choose a Date
        </h3>
        <div className="tour-day-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {days.map((day) => {
            const dateString = toDateString(day);
            const isSelected = selectedDay === dateString;
            return (
              <button
                key={dateString}
                type="button"
                aria-pressed={isSelected}
                className={`tour-day-btn ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleDayClick(day)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--color-ink)' : 'var(--color-paper)', color: isSelected ? 'white' : 'var(--color-ink)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{shortWeekday(day)}</span>
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-stencil)' }}>{day.getDate()}</span>
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div style={{ marginTop: '2rem' }}>
            <h3 className="section-heading" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-ink)' }}>
              Choose a Time for {formatDateLong(selectedDay)}
            </h3>
            {TIME_OPTIONS.every((time) => excluded.has(`${selectedDay}|${time}`)) ? (
              <p style={{ color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>{emptyState}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {TIME_OPTIONS.map((time) => {
                  const key = `${selectedDay}|${time}`;
                  const isSelected = selectedSlots.some((slot) => slot.key === key);
                  // The tenant already named this time; offering it back
                  // reads as not having read their request.
                  const isExcluded = excluded.has(key);
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isExcluded}
                      aria-pressed={isSelected}
                      className={`tour-time-btn ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleTimeClick(time)}
                      style={{ padding: '0.5rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--color-blueprint)' : 'var(--color-paper)', color: isSelected ? 'white' : 'var(--color-ink)', fontSize: '0.85rem', cursor: isExcluded ? 'not-allowed' : 'pointer', opacity: isExcluded ? 0.35 : 1, textDecoration: isExcluded ? 'line-through' : 'none' }}
                    >
                      {formatTime(time)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          <Clock size={18} /> Your Selected Slots ({selectedSlots.length}/{REQUIRED_SLOTS})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: REQUIRED_SLOTS }, (_, i) => {
            const slot = selectedSlots[i];
            if (slot) {
              return (
                <div key={slot.key} className="mod-card mod-card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-blueprint)', borderRadius: 'var(--radius-sm)', background: 'var(--color-paper-dim)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-blueprint)' }}>{formatDateLong(slot.date)}</div>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-stencil)', color: 'var(--color-ink)' }}>{formatTime(slot.time)}</div>
                  </div>
                  <button type="button" onClick={() => removeSlot(i)} aria-label={`Remove slot ${i + 1}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}>
                    <X size={20} />
                  </button>
                </div>
              );
            }
            return (
              <div key={`empty-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px dashed var(--color-line-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--color-charcoal)' }}>
                <Plus size={20} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Slot {i + 1}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '2rem' }}>
          {selectedSlots.length < REQUIRED_SLOTS && selectedSlots.length > 0 && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1rem' }}>Please select {REQUIRED_SLOTS} slots to continue.</p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!isComplete || submitting}
            onClick={handleSubmit}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: isComplete && !submitting ? 'var(--color-brass)' : 'var(--color-line)', color: isComplete && !submitting ? '#fff' : 'var(--color-charcoal)', cursor: isComplete && !submitting ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
          >
            {submitting ? "Sending…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
