import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar.jsx';
import Modal from '../components/ui/Modal.jsx';
import { TrendingUp, Users, Wrench, Edit3, Eye, EyeOff, Trash2, ChevronRight, Building2, DollarSign, AlertTriangle, Calendar, User, FileText, MessageSquare } from 'lucide-react';
import PropertyFormModal from '../components/property/PropertyFormModal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import api from '../services/api';
import { adaptProperty, adaptApplication, flattenApplication } from '../services/adapters';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

// The listing form's defaults live in PropertyFormModal now, so add and
// edit can't end up with different empty states.

export default function LandlordDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [properties, setProperties] = useState([]);
  const [applications, setApplications] = useState([]);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  // Edit reuses the same modal as Add, so the form lives in one place
  // instead of drifting between two copies. editTarget holds the raw
  // property row because photo_id is needed to delete a photo and the
  // adapter keeps only URLs.
  const [editTarget, setEditTarget] = useState(null);
  const [editPhotos, setEditPhotos] = useState([]);
  
  const [appFilter, setAppFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    api.landlord
      .properties()
      .then((data) => {
        if (cancelled) return;
        const items = (data?.data ?? []).map(adaptProperty);
        setProperties(items);
      })
      .catch(() => setProperties([]));

    api.applications
      .list()
      .then((data) => {
        if (cancelled) return;
        const items = (data?.data ?? []).map(adaptApplication).map(flattenApplication);
        setApplications(items);
      })
      .catch(() => setApplications([]));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteClick = (prop) => {
    setPropertyToDelete(prop);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    // DELETE /properties/:id — best-effort; the listing already updates
    // locally so the UI stays responsive even before a backend exists.
    api.properties.remove(propertyToDelete.id).catch(() => {});
    setProperties(properties.filter(p => p.id !== propertyToDelete.id));
    setShowDeleteModal(false);
    setPropertyToDelete(null);
  };

  const toggleVisibility = (id) => {
    const current = properties.find((p) => p.id === id);
    if (!current) return;
    const next = !current.isHidden;
    // Optimistic, but rolled back if the server disagrees — this used to
    // fire-and-forget against a route that didn't exist, so the UI could
    // claim a listing was hidden while nothing had actually changed.
    setProperties(properties.map(p => (p.id === id ? { ...p, isHidden: next } : p)));
    api.properties
      .setVisibility(id, next)
      .then(() => showToast({ message: next ? 'Listing hidden from search.' : 'Listing is visible again.', type: 'success' }))
      .catch((error) => {
        setProperties(properties.map(p => (p.id === id ? { ...p, isHidden: current.isHidden } : p)));
        showToast({ message: error.message || 'Could not change visibility.', type: 'error' });
      });
  };

  const handleEditClick = async (property) => {
    // Fetch the full row before opening rather than reusing the list
    // entry: the list query returns photos as bare URLs, and removing
    // one needs its photo_id. Opening after the fetch avoids the dialog
    // flashing an empty gallery before the images arrive.
    let photos = [];
    try {
      const full = await api.properties.getById(property.id);
      photos = full?.photos ?? [];
    } catch {
      // Photos failing to load shouldn't block editing the listing.
    }
    setEditPhotos(photos);
    setEditTarget(property);
  };

  const handlePropertySaved = (saved) => {
    if (!saved) return;
    setProperties((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  };

  const handleReviewProfile = (app) => {
    setSelectedApplicant(app);
    setShowProfileModal(true);
  };

  const handleApproveApplicant = () => {
    if (selectedApplicant) {
      // PATCH /applications/:id/status
      api.applications.updateStatus(selectedApplicant.id, 'approved').catch(() => {});
      setApplications(applications.map(app => 
        app.id === selectedApplicant.id ? { ...app, status: 'approved' } : app
      ));
      setShowProfileModal(false);
    }
  };

  const handleMessageApplicant = () => {
    // flattenApplication spreads the adapted application, so the nested
    // tenant object (and its id) survives onto selectedApplicant.
    const tenantId = selectedApplicant?.tenant?.id;
    if (!tenantId) return;
    setShowProfileModal(false);
    navigate(`/inbox?contact=${tenantId}&property=${selectedApplicant.propertyId}`);
  };

  const filteredApps = appFilter === 'All' 
    ? applications 
    : applications.filter(a => a.status.toLowerCase() === appFilter.toLowerCase());

  return (
    <div className="module-shell">
      <AppNavbar />
      
      <main className="module-main-wide">
        {/* Page header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="eyebrow">Landlord Portal</span>
          <h1 className="module-title">Dashboard</h1>
        </div>

        {/* Tab nav */}
        <div className="pill-tabs" style={{ marginBottom: '2rem' }}>
          <button
            className={`pill-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Home Overview
          </button>
          <button
            className={`pill-tab ${activeTab === 'properties' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            My Properties ({properties.length})
          </button>
          <button
            className={`pill-tab ${activeTab === 'applications' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications ({applications.length})
          </button>
        </div>

        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(200,155,60,0.12)', color: 'var(--color-brass)' }}>
                  <TrendingUp size={24} />
                </div>
                <p className="stat-card-label">Monthly Revenue</p>
                <h3 className="stat-card-num">৳1,60,000</h3>
                <p className="stat-card-sub">+8% vs last month</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(76,122,93,0.12)', color: 'var(--color-success)' }}>
                  <DollarSign size={24} />
                </div>
                <p className="stat-card-label">Occupied Units</p>
                <h3 className="stat-card-num">2 / 3</h3>
                <p className="stat-card-sub">67% occupancy rate</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(47,93,138,0.1)', color: 'var(--color-blueprint)' }}>
                  <Building2 size={24} />
                </div>
                <p className="stat-card-label">Vacant Units</p>
                <h3 className="stat-card-num">1</h3>
                <p className="stat-card-sub">Dhanmondi flat</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(181,83,60,0.1)', color: 'var(--color-error)' }}>
                  <Wrench size={24} />
                </div>
                <p className="stat-card-label">Maintenance Requests</p>
                <h3 className="stat-card-num">2</h3>
                <p className="stat-card-sub">Needs attention</p>
              </div>
            </div>

            <h2 className="section-heading" style={{ marginTop: '2rem' }}>Action Needed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                className="mod-card mod-card-pad" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setActiveTab('applications')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Users size={20} color="#f59e0b" />
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>2 new tenant applications awaiting review</span>
                </div>
                <ChevronRight size={20} color="var(--color-line-strong)" />
              </div>
              <div 
                className="mod-card mod-card-pad" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Wrench size={20} color="var(--color-error)" />
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>2 maintenance requests pending</span>
                </div>
                <ChevronRight size={20} color="var(--color-line-strong)" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Property</button>
              <button className="btn btn-ghost" onClick={() => setActiveTab('applications')}>View Applications</button>
              <button className="btn btn-ghost" onClick={() => navigate('/inbox')}>Go to Inbox</button>
            </div>
          </div>
        )}

        {/* TAB: Properties */}
        {activeTab === 'properties' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-heading" style={{ margin: 0 }}>My Properties ({properties.length})</h2>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add New Property</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {properties.map(property => (
                <div key={property.id} className="mod-card" style={{ overflow: 'hidden' }}>
                  <div style={{ height: '180px', position: 'relative' }}>
                    <img 
                      src={property.photos && property.photos[0] ? property.photos[0] : ''} 
                      alt={property.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x180?text=No+Image'; }}
                    />
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      {property.status === 'occupied' ? (
                        <span className="badge badge-success">Occupied</span>
                      ) : (
                        <span className="badge badge-warn">Vacant</span>
                      )}
                    </div>
                    {property.isHidden && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <EyeOff size={32} style={{ marginBottom: '8px' }} />
                        <span style={{ fontWeight: 600 }}>Hidden</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mod-card-pad">
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)', fontWeight: 700, margin: '0 0 4px 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {property.title}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-blueprint)', fontSize: '0.85rem', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {property.address}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-stencil)', fontSize: '1.3rem', color: 'var(--color-ink)' }}>৳{(property.pricePerMonth ?? 0).toLocaleString()}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>/month</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{property.bedrooms} Bed • {property.bathrooms} Bath</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', paddingTop: '0.75rem', borderTop: '1px solid var(--color-line)', justifyContent: 'flex-end' }}>
                      <button
                        className="icon-action-btn"
                        title="Edit"
                        onClick={() => handleEditClick(property)}
                      >
                        <Edit3 size={18} /> Edit
                      </button>
                      <button 
                        className="icon-action-btn" 
                        title={property.isHidden ? "Show" : "Hide"}
                        onClick={() => toggleVisibility(property.id)}
                      >
                        {property.isHidden ? <Eye size={18} /> : <EyeOff size={18} />} {property.isHidden ? "Show" : "Hide"}
                      </button>
                      <button 
                        className="icon-action-btn danger" 
                        title="Delete"
                        onClick={() => handleDeleteClick(property)}
                      >
                        <Trash2 size={18} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Applications */}
        {activeTab === 'applications' && (
          <div>
            <h2 className="section-heading">Tenant Applications</h2>
            <div className="pill-tabs" style={{ marginBottom: '1rem' }}>
              {['All', 'Pending', 'Reviewed', 'Approved'].map(f => (
                <button
                  key={f}
                  className={`pill-tab ${appFilter === f ? 'is-active' : ''}`}
                  onClick={() => setAppFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredApps.map(app => (
                <div key={app.id} className="mod-card mod-card-pad" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 200px' }}>
                    <div className="landlord-avatar" style={{ width: '44px', height: '44px', fontSize: '1.2rem' }}>
                      {app.tenantName?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{app.tenantName || 'Unknown Tenant'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{app.occupation || 'Professional'}</div>
                    </div>
                  </div>
                  
                  <div style={{ flex: '1 1 150px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-blueprint)' }}>{app.propertyTitle || 'Dhanmondi 2BR'}</div>
                  </div>

                  <div style={{ flex: '0 0 auto' }}>
                    <span className={`badge ${
                      app.status === 'approved' ? 'badge-success' :
                      app.status === 'reviewed' ? 'badge-ink' : 'badge-warn'
                    }`}>
                      {app.status || 'pending'}
                    </span>
                  </div>

                  <div style={{ flex: '0 0 auto', fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>
                    {app.appliedAt || '2h ago'}
                  </div>

                  <div className="action-btns" style={{ flex: '0 0 auto' }}>
                    <button className="icon-action-btn" onClick={() => handleReviewProfile(app)}>
                      <User size={18} /> Review Profile
                    </button>
                    {/* Tour times are offered from the dedicated requests
                        page, which is tenant-initiated. Sending a landlord
                        to /tour/:propertyId landed them on a page that
                        correctly refuses to let them request their own flat. */}
                    <button className="icon-action-btn" onClick={() => navigate('/tour-requests')}>
                      <Calendar size={18} /> Tour Requests
                    </button>
                    <button 
                      className="icon-action-btn primary" 
                      onClick={() => navigate(`/lease/${app.propertyId}`)}
                      style={app.status !== 'approved' ? { opacity: 0.4, pointerEvents: 'none' } : {}}
                    >
                      <FileText size={18} /> Offer Lease
                    </button>
                  </div>
                </div>
              ))}
              {filteredApps.length === 0 && (
                <div className="mod-card mod-card-pad" style={{ textAlign: 'center', color: 'var(--color-charcoal)' }}>
                  No applications found.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Listing" size="sm">
          <div className="success-screen" style={{ paddingTop: '1rem', paddingBottom: '0.5rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(181,83,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', margin: '0 auto 1rem' }}>
              <AlertTriangle size={24} />
            </div>
            <p style={{ color: 'var(--color-charcoal)', fontSize: '0.95rem', textAlign: 'center' }}>
              Are you sure you want to delete <strong>{propertyToDelete?.title}</strong>?
            </p>
            <p style={{ color: '#8a8f85', fontSize: '0.82rem', textAlign: 'center', marginBottom: '1.5rem' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-dark" style={{ flex: 1, background: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={confirmDelete}>Delete Listing</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedApplicant && (
        <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Applicant Profile" size="lg">
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div className="landlord-avatar" style={{ width: '64px', height: '64px', background: 'var(--color-ink)', color: '#fff', border: '2px solid var(--color-brass)', fontSize: '1.8rem' }}>
              {selectedApplicant.tenantName?.charAt(0) || 'T'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                {selectedApplicant.tenantName || 'Tahmina B.'}
              </h2>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-blueprint)' }}>
                {selectedApplicant.email || 'tahmina@example.com'} • {selectedApplicant.phone || '01712345678'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="mod-card mod-card-pad">
              <span className="mod-label">Occupation & Income</span>
              <div style={{ fontWeight: 500, color: 'var(--color-ink)', marginTop: '4px' }}>
                {selectedApplicant.occupation || 'Software Engineer'} • ৳{selectedApplicant.monthlyIncome?.toLocaleString() || '55,000'}/mo
              </div>
            </div>
            <div className="mod-card mod-card-pad">
              <span className="mod-label">Family Size</span>
              <div style={{ fontWeight: 500, color: 'var(--color-ink)', marginTop: '4px' }}>
                {selectedApplicant.familySize || 2} members
              </div>
            </div>
          </div>

          <span className="mod-label">Cover Letter</span>
          <blockquote style={{ background: 'var(--color-paper-dim)', borderLeft: '3px solid var(--color-brass)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontStyle: 'italic', color: 'var(--color-charcoal)', fontSize: '0.9rem', margin: '0.5rem 0 1.5rem 0' }}>
            {selectedApplicant.message || 'I am very interested in this apartment. We are a small, quiet family and have stable income. We can move in by next month.'}
          </blockquote>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-line)' }}>
            <button className="btn btn-ghost" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => setShowProfileModal(false)}>Decline</button>
            <button
              className="btn btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleMessageApplicant}
            >
              <MessageSquare size={15} />
              Message
            </button>
            <button className="btn btn-primary" onClick={handleApproveApplicant}>Approve Applicant</button>
          </div>
        </Modal>
      )}

      {showAddModal && (
        <PropertyFormModal
          isOpen
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSaved={handlePropertySaved}
        />
      )}

      {editTarget && (
        <PropertyFormModal
          key={editTarget.id}
          isOpen
          mode="edit"
          property={editTarget}
          existingPhotos={editPhotos}
          onClose={() => setEditTarget(null)}
          onSaved={handlePropertySaved}
        />
      )}
    </div>
  );
}
