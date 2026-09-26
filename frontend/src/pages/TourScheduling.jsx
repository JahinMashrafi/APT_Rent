import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockProperties } from '../data/mockData.js';
import AppNavbar from '../components/AppNavbar.jsx';
import { Calendar, Clock, CheckCircle, ArrowRightLeft, X, Plus } from 'lucide-react';
import api from '../services/api';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

export default function TourScheduling() {
  const { propertyId } = useParams();
  const property = mockProperties.find(p => p.id === propertyId) || mockProperties[1];

  const [viewAs, setViewAs] = useState('landlord');
  const [step, setStep] = useState(1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [confirmedSlot, setConfirmedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  
  // Date generation
  const today = new Date('2026-09-05T00:00:00');
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  
  const timeOptions = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

  const toggleViewAs = () => {
    if (viewAs === 'landlord') {
      setViewAs('tenant');
      setStep(2);
    } else {
      setViewAs('landlord');
      setStep(1);
    }
  };

  const handleDayClick = (d) => {
    setSelectedDay(d.toISOString());
  };

  const handleTimeClick = (time) => {
    if (!selectedDay) return;
    const isSelected = selectedSlots.some(s => s.date === selectedDay && s.time === time);
    if (isSelected) return;
    
    if (selectedSlots.length < 3) {
      setSelectedSlots([...selectedSlots, { date: selectedDay, time }]);
    }
  };

  const removeSlot = (index) => {
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index));
  };

  const handleSendSlots = () => {
    // POST /appointments — best-effort; the simulator keeps working locally
    // either way, so this is safe to fire without blocking the UI.
    api.appointments
      .propose({
        property_id: property?.id,
        tenant_id: null,
        slots: selectedSlots.map((slot) => ({
          appointment_date: slot.date.slice(0, 10),
          appointment_time: slot.time,
        })),
      })
      .catch(() => {});
    setStep(2);
    setViewAs('tenant');
  };

  const handleConfirmSlot = () => {
    // PATCH /appointments/:id/confirm
    api.appointments.confirm(property?.id, confirmedSlot).catch(() => {});
    setConfirmed(true);
  };
  
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };
  
  const getShortDay = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
  const getDateNum = (d) => d.getDate();

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main" style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
        <button className="demo-toggle" onClick={toggleViewAs} style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid var(--color-line)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          <ArrowRightLeft size={14} /> Viewing as: {viewAs}
        </button>

        {confirmed ? (
          <div className="success-screen">
            <div className="success-icon"><CheckCircle size={36} /></div>
            <h2 className="module-title">Tour Confirmed!</h2>
            <p>{formatDate(confirmedSlot.date)} at {confirmedSlot.time}</p>
            <p>{property?.title} - {property?.location}</p>
            <div className="action-btns" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <a href="#" className="btn btn-ghost">Add to Calendar</a>
              <Link to={`/property/${property?.id}`} className="btn btn-ghost">Back to Property</Link>
              <Link to="/inbox" className="btn btn-primary">Go to Inbox</Link>
            </div>
          </div>
        ) : step === 1 ? (
          <>
            <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 1 of 2</span>
            <h1 className="module-title">Select Tour Time Options</h1>
            <p className="module-subtitle">Choose 3 different date and time slots for the tenant to pick from</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
              <div>
                <h3 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                  <Calendar size={18} /> Choose a Date
                </h3>
                <div className="tour-day-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                  {days.map((d, i) => {
                    const iso = d.toISOString();
                    const isSelected = selectedDay === iso;
                    return (
                      <button 
                        key={i} 
                        className={`tour-day-btn ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleDayClick(d)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--color-ink)' : 'var(--color-paper)', color: isSelected ? 'white' : 'var(--color-ink)', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{getShortDay(d)}</span>
                        <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-stencil)' }}>{getDateNum(d)}</span>
                      </button>
                    )
                  })}
                </div>

                {selectedDay && (
                  <div style={{ marginTop: '2rem' }}>
                    <h3 className="section-heading" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                      Choose a Time for {formatDate(selectedDay)}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {timeOptions.map(time => {
                        const isSelected = selectedSlots.some(s => s.date === selectedDay && s.time === time);
                        return (
                          <button
                            key={time}
                            className={`tour-time-btn ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleTimeClick(time)}
                            style={{ padding: '0.5rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--color-blueprint)' : 'var(--color-paper)', color: isSelected ? 'white' : 'var(--color-ink)', fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                  <Clock size={18} /> Your Selected Slots ({selectedSlots.length}/3)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[0, 1, 2].map(i => {
                    const slot = selectedSlots[i];
                    if (slot) {
                      return (
                        <div key={i} className="mod-card mod-card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-blueprint)', borderRadius: 'var(--radius-sm)', background: 'var(--color-paper-dim)' }}>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-blueprint)' }}>{formatDate(slot.date)}</div>
                            <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-stencil)', color: 'var(--color-ink)' }}>{slot.time}</div>
                          </div>
                          <button onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}><X size={20} /></button>
                        </div>
                      );
                    } else {
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px dashed var(--color-line-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--color-charcoal)' }}>
                          <Plus size={20} style={{ opacity: 0.5 }} />
                          <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Slot {i + 1}</span>
                        </div>
                      );
                    }
                  })}
                </div>
                
                <div style={{ marginTop: '2rem' }}>
                  {selectedSlots.length < 3 && selectedSlots.length > 0 && (
                    <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1rem' }}>Please select 3 slots to continue.</p>
                  )}
                  <button 
                    className="btn btn-primary btn-block" 
                    disabled={selectedSlots.length !== 3}
                    onClick={handleSendSlots}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: selectedSlots.length === 3 ? 'var(--color-brass)' : 'var(--color-line)', color: selectedSlots.length === 3 ? '#fff' : 'var(--color-charcoal)', cursor: selectedSlots.length === 3 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                  >
                    Send Options to Tenant
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow" style={{ color: 'var(--color-blueprint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 2 of 2</span>
            <h1 className="module-title">Choose Your Tour Time</h1>
            <p className="module-subtitle">The landlord has offered 3 time slots. Pick the one that works best for you.</p>
            
            <div className="mod-card mod-card-pad" style={{ padding: '1rem', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', background: 'var(--color-paper-dim)' }}>
              <strong style={{ display: 'block', color: 'var(--color-ink)' }}>{property?.title}</strong>
              <span style={{ color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>{property?.location}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {selectedSlots.length === 0 ? (
                <p>No slots selected by landlord yet. (Switch to Landlord view to add slots).</p>
              ) : (
                selectedSlots.map((slot, i) => {
                  const isSelected = confirmedSlot === slot;
                  return (
                    <button
                      key={i}
                      className={`tour-slot-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setConfirmedSlot(slot)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', width: '100%', border: isSelected ? '2px solid var(--color-brass)' : '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--color-paper-dim)' : 'var(--color-paper)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-blueprint)', textTransform: 'uppercase' }}>{new Date(slot.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                      <span style={{ fontSize: '1rem', color: 'var(--color-charcoal)', marginBottom: '0.5rem' }}>{formatDate(slot.date)}</span>
                      <span style={{ fontSize: '2rem', fontFamily: 'var(--font-stencil)', color: 'var(--color-ink)' }}>{slot.time}</span>
                    </button>
                  )
                })
              )}
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={!confirmedSlot}
              onClick={handleConfirmSlot}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: confirmedSlot ? 'var(--color-brass)' : 'var(--color-line)', color: confirmedSlot ? '#fff' : 'var(--color-charcoal)', cursor: confirmedSlot ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              Confirm Tour
            </button>
          </>
        )}
      </main>
    </div>
  );
}
