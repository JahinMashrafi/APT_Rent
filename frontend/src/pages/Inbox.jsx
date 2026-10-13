import { useState, useRef, useEffect } from 'react';
import { mockConversations } from '../data/mockData.js';
import AppNavbar from '../components/AppNavbar.jsx';
import { Send, Search, ArrowLeft, MessageSquare, MoreVertical } from 'lucide-react';
import api from '../services/api';
import '../css/global.css';
import '../css/navbar.css';
import '../css/newsfeed-home.css';
import '../css/modules.css';

function formatMessageTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatConvTime(iso) {
  const d = new Date(iso), now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return formatMessageTime(iso);
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function getDateLabel(iso) {
  const d = new Date(iso), now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function Inbox() {
  const [conversations, setConversations] = useState(mockConversations);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, conversations]);

  useEffect(() => {
    // GET /conversations — falls back to the mock list already in state.
    api.conversations
      .list()
      .then((data) => {
        if (data?.data?.length) setConversations(data.data);
      })
      .catch(() => {});
  }, []);

  const filteredConvs = conversations.filter(c => 
    c.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find(c => c.id === activeConvId);

  function sendMessage() {
    if (!messageText.trim() || !activeConvId) return;
    const newMsg = { id: `msg-${Date.now()}`, senderId: 'user-1', text: messageText.trim(), timestamp: new Date().toISOString() };
    setConversations(prev => prev.map(c => c.id === activeConvId
      ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMsg.text, lastMessageTime: newMsg.timestamp, unreadCount: 0 }
      : c
    ));
    // POST /conversations/:id/messages — best-effort; the thread already
    // updated locally above.
    api.conversations.sendMessage(activeConvId, newMsg.text).catch(() => {});
    setMessageText('');
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectConversation = (id) => {
    setActiveConvId(id);
    setMobileView('chat');
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    // PATCH /conversations/:id/read
    api.conversations.markRead(id).catch(() => {});
  };

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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-ink)', marginBottom: '10px' }}>Messages</h2>
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
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConvs.map(conv => (
              <button
                key={conv.id}
                className={`contact-item ${activeConvId === conv.id ? 'is-active' : ''}`}
                onClick={() => selectConversation(conv.id)}
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
                      {conv.unreadCount}
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
              <p>Select a conversation to start chatting</p>
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
                  return activeConv.messages.map((msg) => {
                    const label = getDateLabel(msg.timestamp);
                    const showSep = label !== lastLabel;
                    lastLabel = label;
                    const isSent = msg.senderId === 'user-1';
                    
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
                          <div className={`msg-bubble ${isSent ? 'sent' : 'received'}`}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#8a8f85', marginTop: '2px' }}>
                            {formatMessageTime(msg.timestamp)}
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
                  placeholder="Type a message..."
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
