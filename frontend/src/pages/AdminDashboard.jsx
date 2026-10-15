import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import AppNavbar from '../components/AppNavbar.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Search, ExternalLink, ArrowUpRight, Plus } from 'lucide-react';
import api from '../services/api';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

const INITIAL_NEW_USER = {
  name: '',
  email: '',
  password: '',
  contact_number: '',
  address: '',
  occupation: '',
  workplace_name: '',
  is_tenant: true,
  is_landlord: false,
  is_admin: false,
  is_verified: false,
};

export default function AdminDashboard() {
  const { role } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== 'admin') navigate('/');
  }, [role, navigate]);

  const [activeTab, setActiveTab] = useState('overview');
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [platformStats, setPlatformStats] = useState({
    total_registered_users: 0,
    verified_landlords: 0,
    active_listings: 0,
    active_contracts: 0,
    monthly_turnover_bdt: 0,
    pending_verifications: 0,
    open_disputes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // User Management Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Create User / Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState(INITIAL_NEW_USER);
  const [createError, setCreateError] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Reject Verification Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Document Lightbox Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

  // User Profile / Details Modal State
  const [inspectUser, setInspectUser] = useState(null);

  // Dispute Modal State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeUser, setDisputeUser] = useState(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [disputeError, setDisputeError] = useState('');

  const fetchAdminData = useCallback(async () => {
    if (role !== 'admin') return;
    setLoading(true);
    try {
      const [statsRes, verifRes, usersRes] = await Promise.all([
        api.admin.stats().catch(() => null),
        api.admin.verifications().catch(() => null),
        api.admin.users ? api.admin.users().catch(() => null) : Promise.resolve(null),
      ]);

      if (statsRes) setPlatformStats(statsRes);
      if (verifRes?.data) setVerificationQueue(verifRes.data);
      if (usersRes?.data) setUsersList(usersRes.data);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  if (role !== 'admin') return null;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const currentMonthLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  // Open Create Modal in either 'user' or 'admin' preset mode
  const openCreateAccountModal = (preset = 'user') => {
    setCreateError('');
    if (preset === 'admin') {
      setNewUserForm({
        ...INITIAL_NEW_USER,
        is_tenant: false,
        is_landlord: false,
        is_admin: true,
        is_verified: true,
      });
    } else {
      setNewUserForm({
        ...INITIAL_NEW_USER,
        is_tenant: true,
        is_landlord: false,
        is_admin: false,
        is_verified: false,
      });
    }
    setShowCreateModal(true);
  };

  // POST /admin/users
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (
      !newUserForm.name.trim() ||
      !newUserForm.email.trim() ||
      !newUserForm.password ||
      !newUserForm.contact_number.trim()
    ) {
      setCreateError('Name, email, password, and contact number are required.');
      return;
    }

    if (!newUserForm.is_tenant && !newUserForm.is_landlord && !newUserForm.is_admin) {
      setCreateError('Select at least one role (Tenant, Landlord, or Admin).');
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await api.admin.createUser(newUserForm);
      const createdUser = res?.user || res;
      if (createdUser) {
        setUsersList((prev) => [createdUser, ...prev]);
      }
      setPlatformStats((prev) => ({
        ...prev,
        total_registered_users: (prev.total_registered_users || 0) + 1,
        verified_landlords:
          createdUser?.is_landlord && createdUser?.is_verified
            ? (prev.verified_landlords || 0) + 1
            : prev.verified_landlords,
      }));
      setShowCreateModal(false);
      setActiveTab('users');
    } catch (err) {
      setCreateError(err?.message || 'Failed to create account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // PATCH /admin/users/:id/admin
  const handleToggleAdminRole = async (u) => {
    const userId = u.user_id ?? u.id;
    setActionLoadingId(`admin-${userId}`);
    try {
      const res = await api.admin.toggleAdminRole(userId);
      setUsersList((prev) =>
        prev.map((user) =>
          (user.user_id ?? user.id) === userId
            ? { ...user, is_admin: res.is_admin }
            : user
        )
      );
    } catch (err) {
      console.error('Failed to update admin role:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // PATCH /admin/verifications/:id/approve
  const handleApproveDocs = async (item) => {
    const userId = item.user_id;
    setActionLoadingId(`verif-${userId}`);
    try {
      await api.admin.approveVerification(userId);
      setVerificationQueue((q) => q.filter((i) => i.user_id !== userId));
      setUsersList((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, is_verified: true } : u))
      );
      setPlatformStats((prev) => ({
        ...prev,
        pending_verifications: Math.max(0, (prev.pending_verifications || 1) - 1),
      }));
    } catch (err) {
      console.error('Failed to approve verification:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectClick = (item) => {
    setRejectItem(item);
    setRejectReason('');
    setRejectError('');
    setShowRejectModal(true);
  };

  // PATCH /admin/verifications/:id/reject
  const confirmReject = async () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError('A rejection reason is required.');
      return;
    }

    const userId = rejectItem.user_id;
    setActionLoadingId(`verif-${userId}`);
    try {
      await api.admin.rejectVerification(userId, trimmed);
      setVerificationQueue((q) => q.filter((i) => i.user_id !== userId));
      setPlatformStats((prev) => ({
        ...prev,
        pending_verifications: Math.max(0, (prev.pending_verifications || 1) - 1),
      }));
      setShowRejectModal(false);
      setRejectItem(null);
    } catch (err) {
      setRejectError(err?.message || 'Failed to reject verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // PATCH /admin/users/:id/ban
  const toggleBanStatus = async (u) => {
    const userId = u.user_id ?? u.id;
    setActionLoadingId(`ban-${userId}`);
    try {
      const res = await api.admin.toggleBanUser(userId);
      setUsersList((prev) =>
        prev.map((user) =>
          (user.user_id ?? user.id) === userId
            ? { ...user, is_banned: res.is_banned, status: res.status }
            : user
        )
      );
    } catch (err) {
      console.error('Failed to toggle ban:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDisputeClick = (u) => {
    setDisputeUser(u);
    setDisputeNote('');
    setDisputeError('');
    setShowDisputeModal(true);
  };

  // PATCH /admin/disputes/:id/resolve
  const handleResolveDispute = async (action) => {
    const userId = disputeUser.user_id ?? disputeUser.id;
    const disputeId = disputeUser.latest_dispute_id ?? disputeUser.disputeId;

    if (action === 'resolve' && !disputeNote.trim()) {
      setDisputeError('Resolution notes are required to resolve a dispute.');
      return;
    }

    setActionLoadingId(`dispute-${userId}`);
    try {
      if (action === 'ban') {
        await toggleBanStatus(disputeUser);
      } else {
        if (disputeId) {
          await api.admin.resolveDispute(disputeId, disputeNote.trim());
        }
        setUsersList((prev) =>
          prev.map((u) =>
            (u.user_id ?? u.id) === userId
              ? { ...u, reports: Math.max(0, (u.reports || 1) - 1) }
              : u
          )
        );
        setPlatformStats((prev) => ({
          ...prev,
          open_disputes: Math.max(0, (prev.open_disputes || 1) - 1),
        }));
      }
      setShowDisputeModal(false);
      setDisputeUser(null);
    } catch (err) {
      setDisputeError(err?.message || 'Failed to resolve dispute.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.contact_number?.toLowerCase().includes(q);

    const isBanned = Boolean(u.is_banned || u.status === 'banned');

    const matchRole =
      roleFilter === 'All'
        ? true
        : roleFilter === 'Admins'
        ? Boolean(u.is_admin || u.role === 'admin')
        : roleFilter === 'Banned'
        ? isBanned
        : roleFilter === 'Disputed'
        ? (u.reports || 0) > 0
        : roleFilter === 'Landlords'
        ? Boolean(u.is_landlord || u.role === 'landlord')
        : Boolean(u.is_tenant || u.role === 'tenant');

    return matchSearch && matchRole;
  });

  const pendingCount =
    verificationQueue.length || platformStats.pending_verifications || 0;

  const ledgerMetrics = [
    {
      index: '01',
      label: 'Monthly Turnover',
      value: `৳${Number(platformStats.monthly_turnover_bdt || 0).toLocaleString('en-BD')}`,
      sub: `Settled in ${currentMonthLabel}`,
    },
    {
      index: '02',
      label: 'Active Contracts',
      value: Number(platformStats.active_contracts || 0).toLocaleString('en-BD'),
      sub: 'Executed leases',
    },
    {
      index: '03',
      label: 'Active Listings',
      value: Number(platformStats.active_listings || 0).toLocaleString('en-BD'),
      sub: 'Non-archived properties',
    },
    {
      index: '04',
      label: 'Registered Users',
      value: Number(
        platformStats.total_registered_users || usersList.length || 0
      ).toLocaleString('en-BD'),
      sub: `${Number(platformStats.verified_landlords || 0)} verified landlords`,
    },
    {
      index: '05',
      label: 'Pending Reviews',
      value: Number(pendingCount).toLocaleString('en-BD'),
      sub: 'Awaiting document check',
      highlight: pendingCount > 0 ? 'var(--color-brass-dark)' : undefined,
    },
    {
      index: '06',
      label: 'Open Disputes',
      value: Number(platformStats.open_disputes || 0).toLocaleString('en-BD'),
      sub: 'Unresolved cases',
      highlight: platformStats.open_disputes > 0 ? 'var(--color-error)' : undefined,
    },
  ];

  return (
    <div className="module-shell">
      <AppNavbar />

      <main className="module-main-wide" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Header Bar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.25rem',
            borderBottom: '2px solid var(--color-ink)',
          }}
        >
          <div>
            <h1
              className="module-title"
              style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.02em' }}
            >
              Admin Panel
            </h1>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            <button
              onClick={() => openCreateAccountModal('user')}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-ink)',
                padding: '7px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--color-ink)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Plus size={13} /> ADD USER
            </button>
            <button
              onClick={() => openCreateAccountModal('admin')}
              style={{
                background: 'var(--color-ink)',
                border: '1px solid var(--color-ink)',
                padding: '7px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--color-paper)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Plus size={13} /> ADD ADMIN
            </button>
            <button
              onClick={fetchAdminData}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-line-strong)',
                padding: '7px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--color-charcoal)',
              }}
            >
              {loading ? 'SYNCING...' : 'REFRESH'}
            </button>
          </div>
        </header>

        {/* Flat Typographic Metric Ledger */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            borderBottom: '1px solid var(--color-line-strong)',
            marginBottom: '2rem',
          }}
        >
          {ledgerMetrics.map((m, idx) => (
            <div
              key={m.index}
              style={{
                padding: '1.25rem 1.25rem 1.25rem 0',
                paddingLeft: idx === 0 ? '0' : '1.25rem',
                borderLeft: idx === 0 ? 'none' : '1px solid var(--color-line)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-charcoal)',
                  marginBottom: '0.5rem',
                }}
              >
                <span>{m.label}</span>
                <span style={{ opacity: 0.45 }}>{m.index}</span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                  color: m.highlight || 'var(--color-ink)',
                  marginBottom: '0.35rem',
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--color-charcoal)',
                  opacity: 0.8,
                }}
              >
                {m.sub}
              </div>
            </div>
          ))}
        </section>

        {/* Flush Underline Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            gap: '2rem',
            borderBottom: '1px solid var(--color-line)',
            marginBottom: '2rem',
          }}
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'verification', label: 'Verification Queue', count: pendingCount },
            {
              id: 'users',
              label: 'User Management',
              count: usersList.length || platformStats.total_registered_users || 0,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                  padding: '0 0 12px 0',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-ink)' : 'var(--color-charcoal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      padding: '1px 6px',
                      background: isActive ? 'var(--color-ink)' : 'var(--color-paper-dim)',
                      color: isActive ? 'var(--color-paper)' : 'var(--color-charcoal)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '2.5rem',
              alignItems: 'start',
            }}
          >
            {/* Left: Immediate Verification Queue */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--color-ink)',
                  marginBottom: '1rem',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                  }}
                >
                  Awaiting Identity Review ({pendingCount})
                </h2>
                <button
                  onClick={() => setActiveTab('verification')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-blueprint)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  OPEN FULL QUEUE <ArrowUpRight size={14} />
                </button>
              </div>

              {verificationQueue.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 0',
                    borderBottom: '1px solid var(--color-line)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: 'var(--color-charcoal)',
                  }}
                >
                  All submitted identity documents have been reviewed.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-line)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        color: 'var(--color-charcoal)',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '8px 0' }}>Applicant</th>
                      <th style={{ padding: '8px 10px' }}>Contact</th>
                      <th style={{ padding: '8px 10px' }}>Submitted</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationQueue.slice(0, 5).map((item) => (
                      <tr
                        key={item.user_id}
                        style={{ borderBottom: '1px solid var(--color-line)' }}
                      >
                        <td style={{ padding: '12px 0', fontWeight: 600 }}>
                          {item.name}
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem',
                              fontWeight: 400,
                              color: 'var(--color-charcoal)',
                            }}
                          >
                            UID #{item.user_id}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '12px 10px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                          }}
                        >
                          {item.contact_number || '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px 10px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            color: 'var(--color-charcoal)',
                          }}
                        >
                          {formatDate(item.submitted_at)}
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                          <button
                            onClick={() => setActiveTab('verification')}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-ink)',
                              padding: '4px 10px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                            }}
                          >
                            INSPECT
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right: Reported Users / Active Disputes */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--color-ink)',
                  marginBottom: '1rem',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                  }}
                >
                  Users With Open Disputes ({platformStats.open_disputes || 0})
                </h2>
                <button
                  onClick={() => {
                    setRoleFilter('Disputed');
                    setActiveTab('users');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-blueprint)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  USER DIRECTORY <ArrowUpRight size={14} />
                </button>
              </div>

              {usersList.filter((u) => (u.reports || 0) > 0).length === 0 ? (
                <div
                  style={{
                    padding: '2rem 0',
                    borderBottom: '1px solid var(--color-line)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: 'var(--color-charcoal)',
                  }}
                >
                  Zero accounts currently have open dispute reports.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-line)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        color: 'var(--color-charcoal)',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '8px 0' }}>Reported User</th>
                      <th style={{ padding: '8px 10px' }}>Reason</th>
                      <th style={{ padding: '8px 10px' }}>Reports</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList
                      .filter((u) => (u.reports || 0) > 0)
                      .slice(0, 5)
                      .map((u) => (
                        <tr
                          key={u.user_id ?? u.id}
                          style={{ borderBottom: '1px solid var(--color-line)' }}
                        >
                          <td style={{ padding: '12px 0', fontWeight: 600 }}>
                            {u.name}
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.7rem',
                                fontWeight: 400,
                                color: 'var(--color-charcoal)',
                              }}
                            >
                              {u.email}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '12px 10px',
                              fontSize: '0.8rem',
                              color: 'var(--color-charcoal)',
                            }}
                          >
                            {u.latest_dispute_reason || 'Open mediation claim'}
                          </td>
                          <td
                            style={{
                              padding: '12px 10px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: 'var(--color-error)',
                            }}
                          >
                            {u.reports}
                          </td>
                          <td style={{ padding: '12px 0', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDisputeClick(u)}
                              style={{
                                background: 'var(--color-ink)',
                                color: 'var(--color-paper)',
                                border: '1px solid var(--color-ink)',
                                padding: '4px 10px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                              }}
                            >
                              RESOLVE
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: VERIFICATION QUEUE */}
        {activeTab === 'verification' && (
          <div>
            {verificationQueue.length === 0 ? (
              <div
                style={{
                  padding: '3rem 0',
                  borderTop: '1px solid var(--color-line)',
                  borderBottom: '1px solid var(--color-line)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--color-charcoal)',
                }}
              >
                QUEUE EMPTY — No pending identity documents require verification.
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--color-ink)' }}>
                {verificationQueue.map((item, index) => {
                  const isBusy = actionLoadingId === `verif-${item.user_id}`;
                  return (
                    <div
                      key={item.user_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '260px 1fr auto',
                        gap: '2rem',
                        padding: '1.5rem 0',
                        borderBottom: '1px solid var(--color-line-strong)',
                        alignItems: 'start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            color: 'var(--color-charcoal)',
                            marginBottom: '4px',
                          }}
                        >
                          #{String(index + 1).padStart(2, '0')} · UID {item.user_id}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: '1.15rem',
                            color: 'var(--color-ink)',
                            marginBottom: '6px',
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.82rem',
                            color: 'var(--color-charcoal)',
                            marginBottom: '4px',
                          }}
                        >
                          TEL: {item.contact_number || '—'}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'var(--color-charcoal)',
                            opacity: 0.75,
                          }}
                        >
                          FILED: {formatDate(item.submitted_at)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '1.25rem',
                        }}
                      >
                        <div
                          style={{
                            border: '1px solid var(--color-line-strong)',
                            padding: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              color: 'var(--color-charcoal)',
                              marginBottom: '8px',
                            }}
                          >
                            <span>01 / National ID (NID)</span>
                            {item.nid_photo_url && (
                              <a
                                href={item.nid_photo_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: 'var(--color-blueprint)',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                RAW <ExternalLink size={11} />
                              </a>
                            )}
                          </div>

                          {item.nid_photo_url ? (
                            <div
                              onClick={() =>
                                setPreviewDoc({
                                  title: `${item.name} — National ID`,
                                  url: item.nid_photo_url,
                                })
                              }
                              style={{
                                height: '130px',
                                background: 'var(--color-paper-dim)',
                                overflow: 'hidden',
                                cursor: 'zoom-in',
                              }}
                            >
                              <img
                                src={item.nid_photo_url}
                                alt={`NID for ${item.name}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                height: '130px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--color-paper-dim)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--color-charcoal)',
                              }}
                            >
                              NO NID UPLOADED
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            border: '1px solid var(--color-line-strong)',
                            padding: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              color: 'var(--color-charcoal)',
                              marginBottom: '8px',
                            }}
                          >
                            <span>02 / Job ID Card</span>
                            {item.job_id_card_url && (
                              <a
                                href={item.job_id_card_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: 'var(--color-blueprint)',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                RAW <ExternalLink size={11} />
                              </a>
                            )}
                          </div>

                          {item.job_id_card_url ? (
                            <div
                              onClick={() =>
                                setPreviewDoc({
                                  title: `${item.name} — Job ID Card`,
                                  url: item.job_id_card_url,
                                })
                              }
                              style={{
                                height: '130px',
                                background: 'var(--color-paper-dim)',
                                overflow: 'hidden',
                                cursor: 'zoom-in',
                              }}
                            >
                              <img
                                src={item.job_id_card_url}
                                alt={`Job ID for ${item.name}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                height: '130px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--color-paper-dim)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--color-charcoal)',
                              }}
                            >
                              NO JOB ID UPLOADED
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          minWidth: '140px',
                        }}
                      >
                        <button
                          className="btn btn-primary"
                          disabled={isBusy}
                          onClick={() => handleApproveDocs(item)}
                          style={{
                            width: '100%',
                            borderRadius: 0,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            padding: '10px 14px',
                          }}
                        >
                          {isBusy ? 'Saving...' : 'Approve'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          disabled={isBusy}
                          onClick={() => handleRejectClick(item)}
                          style={{
                            width: '100%',
                            borderRadius: 0,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            padding: '10px 14px',
                            color: 'var(--color-error)',
                            borderColor: 'var(--color-error)',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div style={{ position: 'relative', flex: '1', maxWidth: '340px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-charcoal)',
                  }}
                />
                <input
                  className="mod-input"
                  style={{
                    paddingLeft: '32px',
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 0,
                  }}
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['All', 'Tenants', 'Landlords', 'Admins', 'Disputed', 'Banned'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setRoleFilter(f)}
                    style={{
                      background: roleFilter === f ? 'var(--color-ink)' : 'transparent',
                      color: roleFilter === f ? 'var(--color-paper)' : 'var(--color-ink)',
                      border: '1px solid var(--color-ink)',
                      padding: '6px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderTop: '2px solid var(--color-ink)' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '880px',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--color-line-strong)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--color-charcoal)',
                    }}
                  >
                    <th style={{ padding: '12px 12px 12px 0' }}>User</th>
                    <th style={{ padding: '12px' }}>Email / Contact</th>
                    <th style={{ padding: '12px' }}>Roles</th>
                    <th style={{ padding: '12px' }}>KYC</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Joined</th>
                    <th style={{ padding: '12px' }}>Open Reports</th>
                    <th style={{ padding: '12px 0 12px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const userId = u.user_id ?? u.id;
                    const isBanned = Boolean(u.is_banned || u.status === 'banned');
                    const isAdmin = Boolean(u.is_admin || u.role === 'admin');
                    const roles =
                      [
                        isAdmin ? 'ADMIN' : null,
                        u.is_landlord ? 'LANDLORD' : null,
                        u.is_tenant ? 'TENANT' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'TENANT';

                    return (
                      <tr
                        key={userId}
                        style={{ borderBottom: '1px solid var(--color-line)' }}
                      >
                        <td
                          style={{
                            padding: '12px 12px 12px 0',
                            fontWeight: 600,
                            color: 'var(--color-ink)',
                          }}
                        >
                          {u.name}
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem',
                              fontWeight: 400,
                              color: 'var(--color-charcoal)',
                            }}
                          >
                            UID #{userId}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: 'var(--color-charcoal)',
                          }}
                        >
                          <div>{u.email}</div>
                          {u.contact_number && (
                            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                              {u.contact_number}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.74rem',
                            fontWeight: isAdmin ? 700 : 400,
                            color: isAdmin ? 'var(--color-blueprint)' : 'var(--color-ink)',
                          }}
                        >
                          {roles}
                        </td>

                        <td
                          style={{
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: u.is_verified
                              ? 'var(--color-success)'
                              : 'var(--color-charcoal)',
                          }}
                        >
                          {u.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                        </td>

                        <td
                          style={{
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: isBanned
                              ? 'var(--color-error)'
                              : 'var(--color-success)',
                          }}
                        >
                          {isBanned ? 'BANNED' : 'ACTIVE'}
                        </td>

                        <td
                          style={{
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            color: 'var(--color-charcoal)',
                          }}
                        >
                          {formatDate(u.created_at || u.joinedAt)}
                        </td>

                        <td
                          style={{
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: (u.reports || 0) > 0 ? 700 : 400,
                            color:
                              (u.reports || 0) > 0
                                ? 'var(--color-error)'
                                : 'var(--color-charcoal)',
                          }}
                        >
                          {u.reports || 0}
                        </td>

                        <td style={{ padding: '12px 0 12px 12px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: '6px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                            }}
                          >
                            <button
                              onClick={() => setInspectUser(u)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--color-line-strong)',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                color: 'var(--color-ink)',
                              }}
                            >
                              VIEW
                            </button>
                            <button
                              disabled={actionLoadingId === `admin-${userId}`}
                              onClick={() => handleToggleAdminRole(u)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--color-line-strong)',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                color: isAdmin
                                  ? 'var(--color-charcoal)'
                                  : 'var(--color-blueprint)',
                              }}
                            >
                              {isAdmin ? 'REVOKE ADMIN' : 'MAKE ADMIN'}
                            </button>
                            <button
                              disabled={actionLoadingId === `ban-${userId}`}
                              onClick={() => toggleBanStatus(u)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--color-line-strong)',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                color: isBanned
                                  ? 'var(--color-ink)'
                                  : 'var(--color-error)',
                              }}
                            >
                              {isBanned ? 'UNBAN' : 'BAN'}
                            </button>
                            {(u.reports || 0) > 0 && (
                              <button
                                onClick={() => handleDisputeClick(u)}
                                style={{
                                  background: 'var(--color-ink)',
                                  color: 'var(--color-paper)',
                                  border: '1px solid var(--color-ink)',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.72rem',
                                }}
                              >
                                RESOLVE
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        style={{
                          padding: '2.5rem 0',
                          textAlign: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.82rem',
                          color: 'var(--color-charcoal)',
                        }}
                      >
                        No users found matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Provision User / Admin Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={
            newUserForm.is_admin
              ? 'Provision New Admin Account'
              : 'Provision New User Account'
          }
          size="md"
        >
          <form onSubmit={handleCreateUserSubmit}>
            {/* Quick Mode Switcher */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                marginBottom: '1.25rem',
                border: '1px solid var(--color-ink)',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    is_admin: false,
                    is_tenant: !prev.is_landlord ? true : prev.is_tenant,
                  }))
                }
                style={{
                  padding: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  background: !newUserForm.is_admin ? 'var(--color-ink)' : 'transparent',
                  color: !newUserForm.is_admin ? 'var(--color-paper)' : 'var(--color-ink)',
                }}
              >
                Standard User (Tenant / Landlord)
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    is_admin: true,
                    is_verified: true,
                  }))
                }
                style={{
                  padding: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  background: newUserForm.is_admin ? 'var(--color-ink)' : 'transparent',
                  color: newUserForm.is_admin ? 'var(--color-paper)' : 'var(--color-ink)',
                }}
              >
                Administrator (is_admin = true)
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.85rem',
                marginBottom: '0.85rem',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Full Name *
                </label>
                <input
                  className="mod-input"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                  placeholder="Tanvir Rahman"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  className="mod-input"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                  placeholder="tanvir@example.com"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Temporary Password *
                </label>
                <input
                  type="password"
                  className="mod-input"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                  placeholder="Minimum 8 characters"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Contact Number *
                </label>
                <input
                  className="mod-input"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                  placeholder="01712-345678"
                  value={newUserForm.contact_number}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, contact_number: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Occupation
                </label>
                <input
                  className="mod-input"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                  placeholder="e.g. service, student, business"
                  value={newUserForm.occupation}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, occupation: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Workplace / Institution
                </label>
                <input
                  className="mod-input"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                  placeholder="e.g. Grameenphone Ltd"
                  value={newUserForm.workplace_name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, workplace_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Address
              </label>
              <input
                className="mod-input"
                style={{ width: '100%', boxSizing: 'border-box', borderRadius: 0 }}
                placeholder="House 12, Road 5, Sector 3, Uttara, Dhaka"
                value={newUserForm.address}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, address: e.target.value })
                }
              />
            </div>

            {/* Role & KYC Flags */}
            <div
              style={{
                borderTop: '1px solid var(--color-line)',
                borderBottom: '1px solid var(--color-line)',
                padding: '0.85rem 0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.6rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newUserForm.is_tenant}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, is_tenant: e.target.checked })
                  }
                />
                <span>Tenant Role (is_tenant)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newUserForm.is_landlord}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, is_landlord: e.target.checked })
                  }
                />
                <span>Landlord Role (is_landlord)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newUserForm.is_admin}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      is_admin: e.target.checked,
                      is_verified: e.target.checked ? true : newUserForm.is_verified,
                    })
                  }
                />
                <span>Admin Access (is_admin)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newUserForm.is_verified}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, is_verified: e.target.checked })
                  }
                />
                <span>Pre-Verified KYC (is_verified)</span>
              </label>
            </div>

            {createError && (
              <div
                style={{
                  color: 'var(--color-error)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  marginTop: '8px',
                }}
              >
                {createError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '1.25rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                style={{ borderRadius: 0 }}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ borderRadius: 0 }}
                disabled={createSubmitting}
              >
                {createSubmitting
                  ? 'Creating...'
                  : newUserForm.is_admin
                  ? 'Create Admin Account'
                  : 'Create User Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* User Dossier Modal */}
      {inspectUser && (
        <Modal
          isOpen={Boolean(inspectUser)}
          onClose={() => setInspectUser(null)}
          title={`User Record — UID #${inspectUser.user_id ?? inspectUser.id}`}
          size="sm"
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.8 }}>
            <div><strong>NAME:</strong> {inspectUser.name}</div>
            <div><strong>EMAIL:</strong> {inspectUser.email}</div>
            <div><strong>PHONE:</strong> {inspectUser.contact_number || '—'}</div>
            <div>
              <strong>ROLES:</strong>{' '}
              {[
                inspectUser.is_admin ? 'Admin' : null,
                inspectUser.is_landlord ? 'Landlord' : null,
                inspectUser.is_tenant ? 'Tenant' : null,
              ]
                .filter(Boolean)
                .join(', ') || 'Tenant'}
            </div>
            <div><strong>VERIFIED:</strong> {inspectUser.is_verified ? 'YES' : 'NO'}</div>
            <div><strong>OPEN REPORTS:</strong> {inspectUser.reports || 0}</div>
            <div><strong>JOINED:</strong> {formatDate(inspectUser.created_at)}</div>
          </div>
        </Modal>
      )}

      {/* Document Lightbox Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          size="lg"
        >
          <div style={{ background: 'var(--color-paper-dim)', padding: '1rem', textAlign: 'center' }}>
            <img
              src={previewDoc.url}
              alt={previewDoc.title}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          </div>
        </Modal>
      )}

      {/* Reject Verification Modal */}
      {showRejectModal && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Identity Verification"
          size="sm"
        >
          <div
            style={{
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
              {rejectItem?.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: 'var(--color-charcoal)',
              }}
            >
              UID #{rejectItem?.user_id} · {rejectItem?.contact_number}
            </div>
          </div>

          <textarea
            className={`mod-input ${rejectError ? 'has-error' : ''}`}
            style={{
              minHeight: '110px',
              resize: 'vertical',
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 0,
            }}
            placeholder="State the reason for rejection..."
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (rejectError) setRejectError('');
            }}
          />
          {rejectError && (
            <div
              style={{
                color: 'var(--color-error)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                marginTop: '6px',
              }}
            >
              {rejectError}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '1.5rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              className="btn btn-ghost"
              style={{ borderRadius: 0 }}
              onClick={() => setShowRejectModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-dark"
              style={{
                background: 'var(--color-error)',
                borderColor: 'var(--color-error)',
                borderRadius: 0,
              }}
              onClick={confirmReject}
            >
              Confirm Rejection
            </button>
          </div>
        </Modal>
      )}

      {/* Resolve Dispute Modal */}
      {showDisputeModal && disputeUser && (
        <Modal
          isOpen={showDisputeModal}
          onClose={() => setShowDisputeModal(false)}
          title="Resolve Dispute"
          size="md"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                {disputeUser.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  color: 'var(--color-charcoal)',
                }}
              >
                {disputeUser.email}
              </div>
              {disputeUser.latest_dispute_reason && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-ink)' }}>
                  <strong>Claim:</strong> {disputeUser.latest_dispute_reason}
                  {disputeUser.latest_dispute_details && (
                    <div style={{ color: 'var(--color-charcoal)', marginTop: '2px' }}>
                      {disputeUser.latest_dispute_details}
                    </div>
                  )}
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-error)',
                fontWeight: 700,
              }}
            >
              {disputeUser.reports} OPEN REPORTS
            </span>
          </div>

          <textarea
            className={`mod-input ${disputeError ? 'has-error' : ''}`}
            style={{
              minHeight: '120px',
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 0,
            }}
            placeholder="Enter resolution_notes (saved to disputes.resolution_notes)..."
            value={disputeNote}
            onChange={(e) => {
              setDisputeNote(e.target.value);
              if (disputeError) setDisputeError('');
            }}
          />
          {disputeError && (
            <div
              style={{
                color: 'var(--color-error)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                marginTop: '6px',
              }}
            >
              {disputeError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
            <button
              className="btn"
              style={{
                flex: 1,
                background: 'transparent',
                color: 'var(--color-error)',
                border: '1px solid var(--color-error)',
                borderRadius: 0,
              }}
              onClick={() => handleResolveDispute('ban')}
            >
              Ban User
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, borderRadius: 0 }}
              onClick={() => handleResolveDispute('resolve')}
            >
              Mark Resolved
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}