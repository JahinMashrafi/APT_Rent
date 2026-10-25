import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar.jsx';
import { Send, Search, ArrowLeft, MessageSquare, MoreVertical } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { mockConversations } from '../data/mockData.js';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const POLL_INTERVAL_MS = 5000;

export default function Inbox() {
  const { t, formatClock, formatDate, dayLabel, formatNumber } = useLanguage();

// Localised time helpers (Bangla digits + month names when language is bn)
const formatMessageTime = (iso) => formatClock(iso);
const getDateLabel = (iso) => dayLabel(iso);
const formatConvTime = (iso) => {
  const d = new Date(iso), now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return formatClock(iso);
  if (diff < 172800000) return t('common.yesterday');
  return formatDate(d, 'short');
};
  const { currentUser, authReady, setMessageUnreadCount } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [messagesByConv, setMessagesByConv] = useState({});
  const [activeConvId, setActiveConvId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [usingMock, setUsingMock] = useState(false);
  const messagesEndRef = useRef(null);

  // Set once the first list call settles, so the ?contact= deep link knows
  // whether an existing thread was found or a new one needs creating.
  const [listReady, setListReady] = useState(false);
  const handledContactRef = useRef(null);
  // Whether a successful list response has landed yet — decides if a
  // failure should fall back to demo data.
  const loadedOnceRef = useRef(false);
  // Last lastMessageTime we've rendered per conversation. Used to decide
  // whether a poll actually brought anything new, so polling never yanks
  // the view around while someone is reading or typing.
  const lastSeenRef = useRef({});

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeMessages = activeConvId ? messagesByConv[activeConvId] ?? [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeConvId]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const applyMockData = useCallback(() => {
    setConversations(mockConversations);
    const seeded = {};
    mockConversations.forEach((c) => {
      seeded[c.id] = c.messages ?? [];
    });
    setMessagesByConv(seeded);
    setUsingMock(true);
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const data = await api.conversations.getMessages(convId);
      setMessagesByConv((prev) => ({ ...prev, [convId]: data?.data ?? [] }));
    } catch {
      // Keep whatever's already on screen rather than blanking the thread.
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.conversations.list();
      const items = data?.data ?? [];
      loadedOnceRef.current = true;
      setConversations(items);
      setListReady(true);
      return items;
    } catch {
      // Degrade to demo data rather than showing a permanently empty inbox.
      setListReady(true);
      if (!loadedOnceRef.current) {
        loadedOnceRef.current = true;
        applyMockData();
      }
      return null;
    }
  }, [applyMockData]);

  // Poll for new messages. Cleared on unmount.
  useEffect(() => {
    let cancelled = false;
    // loadConversations only calls setState after its `await`, so this is
    // not the synchronous-render cascade the lint rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
    const timer = setInterval(() => {
      if (!cancelled) loadConversations();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [loadConversations]);

  // Navbar unread badge: total across all threads. Only pushed up when it
  // actually changes, so opening the inbox doesn't re-render the navbar.
  const lastBadgeRef = useRef(0);
  useEffect(() => {
    const total = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    if (total === lastBadgeRef.current) return;
    lastBadgeRef.current = total;
    setMessageUnreadCount(total);
  }, [conversations, setMessageUnreadCount]);

  // RequireAuth already guards this route on the way in. This covers the
  // case it can't: a session that expires while the page is open, which
  // would otherwise leave an empty inbox and 401s. `state.from` keeps the
  // ?contact=&property= params so signing back in returns to the thread.
  useEffect(() => {
    if (authReady && !currentUser) {
      navigate('/login', {
        replace: true,
        state: { from: { pathname: '/inbox', search: location.search } },
      });
    }
  }, [authReady, currentUser, navigate, location.search]);

  const openConversation = useCallback(
    (convId) => {
      setActiveConvId(convId);
      setMobileView('chat');
      // Seed the change-detector so opening a thread isn't mistaken for
      // "new messages arrived" by the poll effect below.
      const conv = conversations.find((c) => c.id === convId);
      if (conv) lastSeenRef.current[convId] = String(conv.lastMessageTime);
      loadMessages(convId);
      api.conversations.markRead(convId).catch(() => {});
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
    },
    [conversations, loadMessages]
  );

  // When a poll brings genuinely new activity on the open thread, pull the
  // new messages and clear the unread badge.
  useEffect(() => {
    if (!activeConv) return;
    const key = String(activeConv.lastMessageTime);
    if (lastSeenRef.current[activeConv.id] === key) return;
    lastSeenRef.current[activeConv.id] = key;
    loadMessages(activeConv.id);
    api.conversations.markRead(activeConv.id).catch(() => {});
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConv.id ? { ...c, unreadCount: 0 } : c))
    );
  }, [conversations, activeConv, loadMessages]);

  // ---------------------------------------------------------------------------
  // ?contact=<userId>&property=<propertyId> deep link
  //
  // PropertyDetails navigates here from its "Contact Landlord" button. Without
  // this, arriving with ?contact set used to silently do nothing.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const contactId = searchParams.get('contact');
    const propertyId = searchParams.get('property');
    if (!contactId || !listReady || !currentUser) return;
    if (handledContactRef.current === contactId) return;
    handledContactRef.current = contactId;

    const existing = conversations.find((c) => String(c.participant.id) === String(contactId));
    if (existing) {
      // Syncing the ?contact= URL param into the open thread is a legitimate
      // effect — there's no event handler that could do this instead.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openConversation(existing.id);
    } else if (propertyId) {
      // No thread yet — create one for this property and its owner.
      api.conversations
        .start({ property_id: propertyId, recipient_id: contactId })
        .then(async (result) => {
          const items = await loadConversations();
          const created = (items ?? []).find(
            (c) => String(c.id) === String(result?.conversation_id)
          );
          if (created) openConversation(created.id);
        })
        .catch((error) => {
          showToast({
            message: error.response?.data?.message || t('inbox.startFailed'),
            type: 'error',
          });
        });
    } else {
      showToast({
        message: t('inbox.openPropertyFirst'),
        type: 'warning',
      });
    }
    // Drop the params so a refresh doesn't re-trigger thread creation.
    setSearchParams({}, { replace: true });
  }, [searchParams, listReady, currentUser, conversations, openConversation, loadConversations, showToast, setSearchParams, t]);

  // ---------------------------------------------------------------------------
  // Sending
  // ---------------------------------------------------------------------------

  function sendMessage() {
    const text = messageText.trim();
    if (!text || !activeConvId) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      senderId: currentUser?.id,
      text,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), optimistic],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessage: text, lastMessageTime: optimistic.timestamp }
          : c
      )
    );
    setMessageText('');

    api.conversations
      .sendMessage(activeConvId, text)
      .then((res) => {
        const saved = res?.message;
        setMessagesByConv((prev) => ({
          ...prev,
          [activeConvId]: (prev[activeConvId] ?? []).map((m) =>
            m.id === tempId ? { ...saved, pending: false } : m
          ),
        }));
      })
      .catch(() => {
        setMessagesByConv((prev) => ({
          ...prev,
          [activeConvId]: (prev[activeConvId] ?? []).filter((m) => m.id !== tempId),
        }));
        setMessageText(text); // don't lose what they typed
        showToast({ message: t('inbox.sendFailed'), type: 'error' });
      });
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConvs = conversations.filter(
    (c) =>
      (c.participant?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.propertyTitle ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="module-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNavbar />
      <style>{`
        .inbox-shell {
           flex: 1;
           display: flex;
           overflow: hidden;
           height: calc(100vh - 64px);
        }
        .inbox-contacts {
           width: 320px;
           display: flex;
           flex-direction: column;
           border-right: 1px solid var(--color-line);
           background: var(--color-paper);
        }
        .inbox-chat {
           flex: 1;
           display: flex;
           flex-direction: column;
           background: var(--color-paper-dim);
        }
        .contact-item {
           display: flex;
           gap: 12px;
           padding: 16px;
           border-bottom: 1px solid var(--color-line);
           background: transparent;
           border-left: 3px solid transparent;
           cursor: pointer;
           text-align: left;
           width: 100%;
        }
        .contact-item:hover {
           background: rgba(43,43,40,0.03);
        }
        .contact-item.is-active {
           background: rgba(43,43,40,0.05);
           border-left-color: var(--color-brass);
        }
        .contact-avatar {
           width: 44px;
           height: 44px;
           border-radius: 50%;
           background: var(--color-ink);
           color: var(--color-paper);
           display: flex;
           align-items: center;
           justify-content: center;
           font-weight: 600;
           position: relative;
        }
        .contact-avatar.small {
           width: 38px;
           height: 38px;
        }
        .online-dot {
           width: 12px;
           height: 12px;
           border-radius: 50%;
           background: var(--color-success);
           border: 2px solid var(--color-paper);
           position: absolute;
           bottom: 0;
           right: 0;
        }
        .msg-bubble {
           max-width: 75%;
           padding: 10px 14px;
           border-radius: var(--radius-md);
           font-size: 0.92rem;
           margin-bottom: 4px;
           font-family: var(--font-body);
        }
        .msg-bubble.sent {
           background: var(--color-ink);
           color: var(--color-paper);
           border-bottom-right-radius: 2px;
        }
        .msg-bubble.received {
           background: var(--color-white, #fff);
           border: 1px solid var(--color-line);
           color: var(--color-ink);
           border-bottom-left-radius: 2px;
        }
        .msg-bubble.pending {
           opacity: 0.6;
        }
        .nav-badge {
           background: var(--color-brass);
           color: var(--color-ink);
           border-radius: 999px;
           font-size: 0.62rem;
           font-weight: 700;
           padding: 1px 6px;
           margin-left: 6px;
        }
        @media (max-width: 768px) {
           .inbox-contacts {
              width: 100%;
              display: flex;
           }
           .inbox-chat {
              display: none;
              width: 100%;
           }
           .inbox-shell.show-chat .inbox-contacts {
              display: none;
           }
           .inbox-shell.show-chat .inbox-chat {
              display: flex;
           }
           .mobile-back-btn {
              display: block !important;
           }
        }
        .mobile-back-btn {
           display: none;
           background: none;
           border: none;
           cursor: pointer;
           padding: 4px;
           margin-right: 8px;
        }
      `}</style>
      <div className={`inbox-shell ${mobileView === 'chat' ? 'show-chat' : ''}`}>


        {/* Left Panel */}
        <div className="inbox-contacts">
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-line)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-ink)', marginBottom: '10px' }}>{t('inbox.messages')}</h2>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-blueprint)', opacity: 0.6 }} />
              <input
                style={{
                  width: '100%',
                  border: '1px solid var(--color-line-strong)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '8px 12px 8px 32px',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-body)',
                  background: 'var(--color-paper)'
                }}
                placeholder={t('inbox.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConvs.length === 0 && (
              <p style={{ padding: '24px 16px', color: '#8a8f85', fontSize: '0.85rem', textAlign: 'center' }}>
                {usingMock ? t('inbox.none') : t('inbox.noneYet')}
              </p>
            )}
            {filteredConvs.map(conv => (
              <button
                key={conv.id}
                className={`contact-item ${activeConvId === conv.id ? 'is-active' : ''}`}
                onClick={() => openConversation(conv.id)}
              >
                <div className="contact-avatar">
                  {conv.participant.initials}
                  {conv.participant.isOnline && <span className="online-dot" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{conv.participant.name}</span>
                    <span style={{ fontSize: '0.72rem', color: '#9a9e93', fontFamily: 'var(--font-mono)' }}>{formatConvTime(conv.lastMessageTime)}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8a8f85', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {conv.lastMessage}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-blueprint)', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.propertyTitle}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span style={{ background: 'var(--color-brass)', color: 'var(--color-ink)', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', display: 'inline-block', marginTop: '4px' }}>
                      {formatNumber(conv.unreadCount)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="inbox-chat">
          {!activeConv ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-line-strong)' }}>
              <MessageSquare size={48} style={{ marginBottom: '16px' }} />
              <p>{t('inbox.selectPrompt')}</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="mod-card" style={{ borderRadius: 0, borderBottom: '1px solid var(--color-line)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button className="mobile-back-btn" onClick={() => setMobileView('list')}>
                    <ArrowLeft size={20} color="var(--color-ink)" />
                  </button>
                  <div className="contact-avatar small" style={{ marginRight: '12px' }}>
                    {activeConv.participant.initials}
                    {activeConv.participant.isOnline && <span className="online-dot" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '1rem' }}>{activeConv.participant.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-blueprint)' }}>{activeConv.propertyTitle}</div>
                  </div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }}>
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--color-paper)' }}>
                {(() => {
                  let lastLabel = null;
                  return activeMessages.map((msg) => {
                    const label = getDateLabel(msg.timestamp);
                    const showSep = label !== lastLabel;
                    lastLabel = label;
                    const isSent = String(msg.senderId) === String(currentUser?.id);

                    return (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        {showSep && (
                          <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-blueprint)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-line)' }}></div>
                            {label}
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-line)' }}></div>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start', width: '100%' }}>
                          <div className={`msg-bubble ${isSent ? 'sent' : 'received'}${msg.pending ? ' pending' : ''}`}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#8a8f85', marginTop: '2px' }}>
                            {formatMessageTime(msg.timestamp)}
                            {isSent && (msg.pending ? ` · ${t('inbox.sending')}` : msg.readAt ? ` · ${t('inbox.read')}` : '')}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div style={{ borderTop: '1px solid var(--color-line)', padding: '12px 16px', display: 'flex', gap: '8px', background: 'var(--color-white, #fff)' }}>
                <textarea
                  rows={1}
                  style={{
                    flex: 1,
                    resize: 'none',
                    border: '1.5px solid var(--color-line-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.92rem',
                    background: 'var(--color-paper)'
                  }}
                  placeholder={t('inbox.typePlaceholder')}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  style={{
                    background: 'var(--color-ink)',
                    color: 'var(--color-paper)',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                    opacity: messageText.trim() ? 1 : 0.5
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}