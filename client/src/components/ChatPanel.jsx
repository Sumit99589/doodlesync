import { useState, useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import useChatStore from '../store/chatStore';
import useRoomStore from '../store/roomStore';
import { getChatArray, getYDoc } from '../lib/yjs';
import { getCursorColor } from '../constants';

export default function ChatPanel() {
  const chatOpen = useChatStore((s) => s.chatOpen);
  const setChatOpen = useChatStore((s) => s.setChatOpen);
  const lastSeenCount = useChatStore((s) => s.lastSeenCount);
  const setLastSeenCount = useChatStore((s) => s.setLastSeenCount);

  const userName = useRoomStore((s) => s.userName);
  const sessionId = useRoomStore((s) => s.sessionId);
  const connectedUsers = useRoomStore((s) => s.connectedUsers);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const listRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Sync state with Yjs array dynamically (with initialization polling fallback)
  useEffect(() => {
    let active = true;
    let observer = null;

    const setupObserver = () => {
      const chatArr = getChatArray();
      if (chatArr) {
        setMessages(chatArr.toArray());
        observer = () => {
          if (active) {
            setMessages(chatArr.toArray());
          }
        };
        chatArr.observe(observer);
        return true;
      }
      return false;
    };

    if (!setupObserver()) {
      // If the Y.Doc or Y.Array isn't initialized yet, poll every 50ms
      const interval = setInterval(() => {
        if (setupObserver()) {
          clearInterval(interval);
        }
      }, 50);

      return () => {
        active = false;
        clearInterval(interval);
        const chatArr = getChatArray();
        if (chatArr && observer) {
          chatArr.unobserve(observer);
        }
      };
    }

    return () => {
      active = false;
      const chatArr = getChatArray();
      if (chatArr && observer) {
        chatArr.unobserve(observer);
      }
    };
  }, []);

  // Update last seen count when panel is open
  useEffect(() => {
    const chatArr = getChatArray();
    if (chatOpen && chatArr) {
      setLastSeenCount(chatArr.length);
    }
  }, [chatOpen, messages.length, setLastSeenCount]);

  // Track if user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const threshold = 30;
    const isAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight <= threshold;
    isAtBottomRef.current = isAtBottom;
  }, []);

  // Scroll to bottom when new messages arrive if scroll was already locked at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = useCallback(() => {
    const trimmed = text.trim();
    const chatArr = getChatArray();
    if (!trimmed || !chatArr) return;

    const ydoc = getYDoc();
    const myColor = ydoc ? getCursorColor(ydoc.clientID) : '#818cf8';

    const msg = {
      id: nanoid(),
      userId: sessionId,
      userName: userName,
      color: myColor,
      text: trimmed.slice(0, 500),
      timestamp: Date.now(),
    };

    chatArr.push([msg]);
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [text, sessionId, userName]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Auto-grow height up to ~3 lines (80px max)
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
  };

  const unreadCount = Math.max(0, messages.length - lastSeenCount);
  const rightOffset = chatOpen ? '296px' : '16px';

  return (
    <>
      {/* Floating Chat Toggle Button */}
      <button
        className="chat-toggle-floating"
        style={{ right: rightOffset }}
        onClick={() => setChatOpen(!chatOpen)}
        title={chatOpen ? "Collapse Chat" : "Expand Chat"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '20px', height: '20px', color: 'white' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {!chatOpen && unreadCount > 0 && (
          <span className="chat-badge">{unreadCount}</span>
        )}
      </button>

      {/* Chat Sidebar Panel */}
      <div
        className={`chat-panel ${chatOpen ? 'chat-panel-open' : ''}`}
        style={{ right: '16px' }}
      >
        <div className="chat-panel-inner">
          {/* Header */}
          <div className="chat-panel-header">
            <div className="chat-panel-header-left">
              <span className="chat-panel-title">Chat</span>
              <span className="chat-panel-online">
                {connectedUsers.length} online
              </span>
            </div>
            <button
              className="chat-close-btn"
              onClick={() => setChatOpen(false)}
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages list */}
          <div
            ref={listRef}
            className="chat-messages-list"
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                No messages yet. Say hello 👋
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === sessionId;
                const timeString = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${isMe ? 'chat-message-me' : 'chat-message-other'}`}
                  >
                    <div
                      className="chat-message-bubble"
                      style={{
                        backgroundColor: isMe ? `${msg.color}26` : 'rgba(255, 255, 255, 0.05)',
                        borderLeft: isMe ? `3px solid ${msg.color}` : 'none',
                        borderRight: !isMe ? `3px solid ${msg.color}` : 'none',
                      }}
                    >
                      <div className="chat-message-meta">
                        <div className="chat-message-sender">
                          <span
                            className="chat-message-dot"
                            style={{ backgroundColor: msg.color }}
                          />
                          <span className="chat-message-name">{msg.userName}</span>
                        </div>
                        <span className="chat-message-time">{timeString}</span>
                      </div>
                      <div className="chat-message-text">{msg.text}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="chat-input-container">
              <textarea
                ref={textareaRef}
                className="chat-input-textarea"
                rows="1"
                placeholder="Message the room..."
                value={text}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength="500"
              />
              <button
                className="chat-send-btn"
                onClick={handleSendMessage}
                disabled={!text.trim()}
                title="Send message"
              >
                ✈
              </button>
            </div>
            {text.length > 400 && (
              <div className={`chat-char-counter ${text.length >= 500 ? 'chat-char-counter-limit' : ''}`}>
                {text.length}/500
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
