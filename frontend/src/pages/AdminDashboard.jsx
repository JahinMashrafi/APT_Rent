import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { mockAdminUsers, mockVerificationQueue, mockPlatformStats } from '../data/mockData.js';
import AppNavbar from '../components/AppNavbar.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Users, Building2, TrendingUp, CheckCircle, XCircle, AlertTriangle, Eye, Ban, FileText, Search, Lock } from 'lucide-react';
import api from '../services/api';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

export default function AdminDashboard() {
  const { role } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== 'admin') navigate('/');
  }, [role, navigate]);

  const [activeTab, setActiveTab] = useState('overview');
  const [verificationQueue, setVerificationQueue] = useState(mockVerificationQueue || []);
  const [usersList, setUsersList] = useState(mockAdminUsers || []);
  const [platformStats, setPlatformStats] = useState(mockPlatformStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeUser, setDisputeUser] = useState(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [disputeError, setDisputeError] = useState('');

  useEffect(() => {
    if (role !== 'admin') return;
    // GET /admin/stats and GET /admin/verifications — fall back to mocks.
    api.admin.stats().then((data) => data && setPlatformStats(data)).catch(() => {});
    api.admin
      .verifications()
      .then((data) => {
        if (data?.data?.length) setVerificationQueue(data.data);
      })
      .catch(() => {});
  }, [role]);

  if (role !== 'admin') return null;

  const handleApproveDocs = (item) => {
    // PATCH /admin/verifications/:id/approve
    api.admin.approveVerification(item.id).catch(() => {});
    setVerificationQueue(q => q.map(i => i.id === item.id ? { ...i, nidStatus: 'approved', deedStatus: 'approved' } : i));
  };

  const handleRejectClick = (item) => {
    setRejectItem(item);
    setRejectReason('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectReason.trim().length < 20) {
      setRejectError('Rejection reason must be at least 20 characters.');
      return;
    }
    // PATCH /admin/verifications/:id/reject
    api.admin.rejectVerification(rejectItem.id, rejectReason.trim()).catch(() => {});
    setVerificationQueue(q => q.map(i => i.id === rejectItem.id ? { ...i, nidStatus: 'rejected', deedStatus: 'rejected' } : i));
    setShowRejectModal(false);
    setRejectItem(null);
  };

  const toggleBanStatus = (u) => {
    setUsersList(usersList.map(user => 
      user.id === u.id ? { ...user, status: user.status === 'banned' ? 'active' : 'banned' } : user
    ));
  };

  const handleDisputeClick = (u) => {
    setDisputeUser(u);
    setDisputeNote('');
    setDisputeError('');
    setShowDisputeModal(true);
  };

  const handleResolveDispute = (action) => {
    if (!disputeNote.trim() && action === 'resolve') {
      setDisputeError('Admin note is required to resolve.');
      return;
    }
    
    if (action === 'ban') {
      setUsersList(usersList.map(u => 
        u.id === disputeUser.id ? { ...u, status: 'banned' } : u
      ));
    } else {
      // PATCH /admin/disputes/:id/resolve
      if (disputeUser?.disputeId) {
        api.admin.resolveDispute(disputeUser.disputeId, disputeNote.trim()).catch(() => {});
      }
      setUsersList(usersList.map(u => 
        u.id === disputeUser.id ? { ...u, reports: 0 } : u
      ));
    }
    setShowDisputeModal(false);
    setDisputeUser(null);
  };

  const filteredUsers = usersList.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchRole = roleFilter === 'All' ? true 
                    : roleFilter === 'Banned' ? u.status === 'banned' 
                    : u.role === roleFilter.toLowerCase().slice(0, -1); // e.g., 'Tenants' -> 'tenant'
    return matchSearch && matchRole;
  });

  const pendingQueueLength = verificationQueue.filter(v => v.nidStatus === 'pending' || v.deedStatus === 'pending').length;

  return (
    <div className="module-shell">
      <AppNavbar />
      
      <div className="admin-alert-bar">
        <Lock size={13} style={{ marginRight: '6px' }} />
        ADMIN CONTROL PANEL — INTERNAL USE ONLY — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
      
      <main className="module-main-wide">
        <div style={{ marginBottom: '2rem' }}>
          <span className="eyebrow" style={{ color: 'var(--color-blueprint)' }}>Superuser Access</span>
          <h1 className="module-title">Admin Dashboard</h1>
        </div>

        <div className="pill-tabs" style={{ marginBottom: '2rem' }}>
          <button
            className={`pill-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Platform Overview
          </button>
          <button
            className={`pill-tab ${activeTab === 'verification' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            Verification Queue ({pendingQueueLength} pending)
          </button>
          <button
            className={`pill-tab ${activeTab === 'users' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management ({usersList.length})
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
                <p className="stat-card-label">Platform Revenue</p>
                <h3 className="stat-card-num">৳{(platformStats.totalRevenue ?? platformStats.monthly_turnover_bdt ?? 0).toLocaleString('en-BD')}</h3>
                <p className="stat-card-sub">Sep 2026</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(47,93,138,0.1)', color: 'var(--color-blueprint)' }}>
                  <FileText size={24} />
                </div>
                <p className="stat-card-label">Active Leases</p>
                <h3 className="stat-card-num">{platformStats.activeLeases ?? platformStats.active_contracts ?? 0}</h3>
                <p className="stat-card-sub">Across all properties</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(76,122,93,0.12)', color: 'var(--color-success)' }}>
                  <Users size={24} />
                </div>
                <p className="stat-card-label">Registered Users</p>
                <h3 className="stat-card-num">{(platformStats.registeredUsers ?? platformStats.total_registered_users ?? 0).toLocaleString('en-BD')}</h3>
                <p className="stat-card-sub">+{platformStats.monthlyGrowth ?? 0}% this month</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(200,155,60,0.12)', color: 'var(--color-brass-dark)' }}>
                  <Building2 size={24} />
                </div>
                <p className="stat-card-label">Properties Listed</p>
                <h3 className="stat-card-num">{platformStats.propertiesListed ?? platformStats.active_listings ?? 0}</h3>
                <p className="stat-card-sub">Dhaka & surroundings</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
              <div className="mod-card mod-card-pad" style={{ borderLeft: '4px solid var(--color-brass)', cursor: 'pointer' }} onClick={() => setActiveTab('verification')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={24} color="var(--color-brass)" />
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--color-ink)' }}>Pending Verifications</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>2 landlord accounts pending NID/deed verification</p>
                  </div>
                </div>
              </div>

              <div className="mod-card mod-card-pad" style={{ borderLeft: '4px solid var(--color-error)', cursor: 'pointer' }} onClick={() => setActiveTab('users')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={24} color="var(--color-error)" />
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--color-ink)' }}>Active Disputes</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-charcoal)' }}>3 active tenant-landlord disputes requiring resolution</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mod-card mod-card-pad-lg" style={{ marginTop: '2rem' }}>
              <h3 className="section-heading">Platform Health</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>Occupancy rate: 67%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--color-line)', borderRadius: 'var(--radius-pill)' }}>
                  <div style={{ width: '67%', background: 'var(--color-success)', height: '100%', borderRadius: 'var(--radius-pill)' }}></div>
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '8px' }}>Monthly growth</span>
                <div style={{ fontFamily: 'var(--font-stencil)', fontSize: '2rem', color: 'var(--color-success)' }}>+12.4%</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Verification Queue */}
        {activeTab === 'verification' && (
          <div>
            <h2 className="section-heading">Verification Queue</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {verificationQueue.map(item => (
                <div key={item.id} className="verif-card mod-card mod-card-pad">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="landlord-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', background: 'var(--color-blueprint)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-ink)', fontSize: '1.1rem' }}>{item.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{item.email}</div>
                      <div style={{ fontSize: '0.8rem', color: '#8a8f85', marginTop: '4px' }}>Submitted: {item.submittedAt || '2h ago'}</div>
                    </div>
                  </div>
                  
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-blueprint)', marginTop: '12px', marginBottom: '16px' }}>
                    Property: {item.propertyTitle}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <h5 className="section-heading" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>National ID (NID)</h5>
                      <div className="doc-placeholder" style={{ background: 'var(--color-paper-dim)', border: '1px dashed var(--color-line-strong)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', color: 'var(--color-charcoal)', fontSize: '0.9rem', marginBottom: '8px' }}>
                        <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        NID Document
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{item.nidNumber || 'NID-XXXX-XXXX'}</span>
                        <span className={`badge ${item.nidStatus === 'approved' ? 'badge-success' : 'badge-warn'}`}>
                          {item.nidStatus === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h5 className="section-heading" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Property Deed</h5>
                      <div className="doc-placeholder" style={{ background: 'var(--color-paper-dim)', border: '1px dashed var(--color-line-strong)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', color: 'var(--color-charcoal)', fontSize: '0.9rem', marginBottom: '8px' }}>
                        <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        Property Deed
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>Property Deed</span>
                        <span className={`badge ${item.deedStatus === 'approved' ? 'badge-success' : 'badge-warn'}`}>
                          {item.deedStatus === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleRejectClick(item)}>
                      <XCircle size={18} /> Reject
                    </button>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleApproveDocs(item)}>
                      <CheckCircle size={18} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: User Management */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal)' }} />
                <input 
                  className="mod-input" 
                  style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }} 
                  placeholder="Search by name or email..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              <div className="pill-tabs" style={{ marginBottom: 0 }}>
                {['All', 'Tenants', 'Landlords', 'Banned'].map(f => (
                  <button
                    key={f}
                    className={`pill-tab ${roleFilter === f ? 'is-active' : ''}`}
                    onClick={() => setRoleFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mod-card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="mod-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--color-paper)', borderBottom: '1px solid var(--color-line)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>User</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>Email</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>Role</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>Joined</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>Reports</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--color-line)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-ink)', color: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${u.role === 'landlord' ? 'badge-ink' : u.role === 'admin' ? 'badge-warn' : 'badge-neutral'}`}>
                            {u.role || 'tenant'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${u.status === 'banned' ? 'badge-error' : 'badge-success'}`}>
                            {u.status === 'banned' ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-charcoal)', fontSize: '0.9rem' }}>
                          {u.joinedAt || 'Mar 2025'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: u.reports > 0 ? 700 : 400, color: u.reports > 0 ? 'var(--color-error)' : 'var(--color-charcoal)' }}>
                          {u.reports || 0}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="action-btns" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button className="icon-action-btn" title="View">
                              <Eye size={18} />
                            </button>
                            <button 
                              className={`icon-action-btn ${u.status !== 'banned' ? 'danger' : ''}`} 
                              title={u.status === 'banned' ? 'Unban' : 'Ban'}
                              onClick={() => toggleBanStatus(u)}
                            >
                              <Ban size={18} />
                            </button>
                            {u.reports > 0 && (
                              <button className="icon-action-btn" title="Resolve" onClick={() => handleDisputeClick(u)}>
                                <AlertTriangle size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal)' }}>
                          No users found matching your search or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Verification" size="sm">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>{rejectItem?.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-blueprint)' }}>{rejectItem?.propertyTitle}</div>
          </div>
          <textarea 
            className={`mod-input ${rejectError ? 'has-error' : ''}`} 
            style={{ minHeight: '100px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} 
            placeholder="State the reason for rejection (min 20 characters)..." 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
          />
          {rejectError && <div className="mod-error" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '4px' }}>{rejectError}</div>}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
            <button className="btn btn-dark" style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={confirmReject}>Send Rejection Notice</button>
          </div>
        </Modal>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && disputeUser && (
        <Modal isOpen={showDisputeModal} onClose={() => setShowDisputeModal(false)} title="Resolve Dispute" size="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{disputeUser.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{disputeUser.email}</div>
            </div>
            <span className="badge badge-error">{disputeUser.reports} Reports</span>
          </div>
          
          <textarea 
            className={`mod-input ${disputeError ? 'has-error' : ''}`} 
            style={{ minHeight: '120px', width: '100%', boxSizing: 'border-box' }} 
            placeholder="Enter admin notes and resolution..." 
            value={disputeNote} 
            onChange={(e) => setDisputeNote(e.target.value)} 
          />
          {disputeError && <div className="mod-error" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '4px' }}>{disputeError}</div>}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button className="btn" style={{ flex: 1, background: '#fff', color: 'var(--color-error)', borderColor: 'var(--color-error)', border: '1px solid var(--color-error)' }} onClick={() => handleResolveDispute('ban')}>Ban User</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleResolveDispute('resolve')}>Mark Resolved</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
