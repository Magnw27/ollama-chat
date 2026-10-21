const { useState, useEffect, useRef, useMemo, useCallback } = React;

const STORAGE_CHATS = 'neon.chats.v6';
const STORAGE_SETTINGS = 'neon.settings.v6';

const PREFERRED_MODEL = 'gemma4:31b-cloud';

const DEFAULT_SETTINGS = {
  model: PREFERRED_MODEL,
  temperature: 0.6,
  top_p: 0.9,
  top_k: 40,
  num_predict: 2048,
  think: false,
  keepAlive: '30m',
  accent: 'blue',
};

const ACCENTS = [
  { id: 'blue', color: '#4f8cff' },
  { id: 'violet', color: '#9a7bff' },
  { id: 'emerald', color: '#2fd3a0' },
  { id: 'amber', color: '#f4b23c' },
  { id: 'rose', color: '#fb6f92' },
];

const SUGGESTIONS = [
  'Jelaskan Docker dan container dalam 5 poin singkat.',
  'Buat fungsi Python untuk membaca CSV dan merangkum statistiknya.',
  'Bantu saya debug error ini dan jelaskan penyebabnya.',
  'Tulis email profesional untuk menindaklanjuti proposal klien.',
];

const ICONS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />,
  edit: (
    <>
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  download: (
    <>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
      <path d="M5 19h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5m0 0 4 4m-4-4L8 9" />
      <path d="M5 19h14" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  send: <path d="m4.5 12 15-7-6 15-2.6-5.9L4.5 12Z" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowDown: <path d="M12 5v14m0 0 5-5m-5 5-5-5" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-1.6 6.4" />
      <path d="M20 4v7h-7" />
    </>
  ),
  spark: <path d="M12 3.5 13.9 9l5.6 2-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-2L12 3.5Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <rect x="8" y="8" width="8" height="8" rx="1.6" />
      <path d="M9 1v2M15 1v2M9 21v2M15 21v2M1 9h2M1 15h2M21 9h2M21 15h2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.8 19.2A1.2 1.2 0 0 0 3.8 21h16.4a1.2 1.2 0 0 0 1-1.8L12 3Z" />
      <path d="M12 9v5M12 17.5h.01" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4a3 3 0 0 0-3 3 3 3 0 0 0-1.2 5.6A3 3 0 0 0 7 18.4 3 3 0 0 0 12 20V4.8A2 2 0 0 0 9.5 4Z" />
      <path d="M14.5 4a3 3 0 0 1 3 3 3 3 0 0 1 1.2 5.6A3 3 0 0 1 17 18.4 3 3 0 0 1 12 20" />
    </>
  ),
  message: <path d="M20 15a2 2 0 0 1-2 2H9l-5 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10Z" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  broom: (
    <>
      <path d="m14 4 6 6M16 6l-8 8" />
      <path d="M8 14c-2 0-4 2-4 6 4 0 6-2 6-4" />
      <path d="m5 19 3-3" />
    </>
  ),
};

function Icon({ name, size = 18, className, style }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] || null}
    </svg>
  );
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const cx = (...parts) => parts.filter(Boolean).join(' ');

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 45) return 'baru saja';
  const units = [
    [31536000, 'tahun'],
    [2592000, 'bulan'],
    [604800, 'minggu'],
    [86400, 'hari'],
    [3600, 'jam'],
    [60, 'menit'],
  ];
  for (const [seconds, label] of units) {
    if (diff >= seconds) return `${Math.floor(diff / seconds)} ${label} lalu`;
  }
  return 'baru saja';
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function fmtNumber(value) {
  return Number(value || 0).toLocaleString('id-ID');
}

function makeTitle(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > 46 ? `${clean.slice(0, 46)}…` : clean || 'Sesi baru';
}

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'neon-chat'
  );
}

function toApiMessage(message) {
  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content,
  };
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function chatToMarkdown(chat) {
  const lines = [
    `# ${chat.title}`,
    '',
    `- Dibuat: ${new Date(chat.createdAt).toLocaleString('id-ID')}`,
    `- Diperbarui: ${new Date(chat.updatedAt || chat.createdAt).toLocaleString('id-ID')}`,
    '',
  ];
  chat.messages.forEach((message) => {
    if (message.error || !message.content.trim()) return;
    lines.push(message.role === 'user' ? '## Pengguna' : '## NEON AI', '', message.content, '');
  });
  return lines.join('\n');
}

async function readSSE(response, onEvent) {
  if (!response.body) throw new Error('Browser ini tidak mendukung streaming.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      for (const rawLine of event.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;
        if (raw === '[DONE]') return;
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          continue;
        }
        onEvent(payload);
      }
    }
  }
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function Markdown({ content }) {
  const ref = useRef(null);

  const html = useMemo(() => {
    if (!content) return '';
    if (!window.marked || !window.DOMPurify) {
      return escapeHtml(content).replace(/\n/g, '<br>');
    }
    try {
      const raw = window.marked.parse(content, { gfm: true, breaks: true });
      const clean = window.DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
      const template = document.createElement('template');
      template.innerHTML = clean;
      template.content.querySelectorAll('img').forEach((image) => {
        const src = image.getAttribute('src') || '';
        if (!/^(https?:\/\/|data:image\/)/i.test(src)) {
          image.remove();
          return;
        }
        image.setAttribute('loading', 'lazy');
        image.setAttribute('referrerpolicy', 'no-referrer');
      });
      return template.innerHTML;
    } catch {
      return escapeHtml(content).replace(/\n/g, '<br>');
    }
  }, [content]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    root.querySelectorAll('a[href]').forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });

    root.querySelectorAll('pre code').forEach((block) => {
      if (window.hljs) {
        try {
          window.hljs.highlightElement(block);
        } catch {
          /* ignore */
        }
      }
      const pre = block.parentElement;
      if (!pre || pre.querySelector('.code-copy')) return;

      const match = (block.className || '').match(/language-([\w+-]+)/);
      if (match && !pre.querySelector('.code-lang')) {
        const label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = match[1];
        pre.appendChild(label);
        pre.classList.add('has-lang');
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.textContent = 'Salin';
      button.addEventListener('click', async () => {
        try {
          await copyText(block.innerText);
          button.textContent = 'Tersalin';
        } catch {
          button.textContent = 'Gagal';
        }
        setTimeout(() => {
          button.textContent = 'Salin';
        }, 1600);
      });
      pre.appendChild(button);
    });
  }, [html]);

  return <div ref={ref} className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Stats({ stats }) {
  if (!stats) return null;
  const parts = [];
  if (stats.completion_tokens) parts.push(`${fmtNumber(stats.completion_tokens)} token`);
  if (stats.tokens_per_second) {
    parts.push(`${String(stats.tokens_per_second).replace('.', ',')} tok/dtk`);
  }
  if (stats.total_duration_ms) {
    parts.push(`${(stats.total_duration_ms / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} dtk`);
  }
  if (!parts.length) return null;
  return (
    <div className="stats">
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
    </div>
  );
}

function Toast({ toast }) {
  const icons = { success: 'check', error: 'alert', info: 'spark' };
  return (
    <div className={`toast ${toast.type}`}>
      <Icon name={icons[toast.type] || 'spark'} size={16} />
      <span>{toast.message}</span>
    </div>
  );
}

function ConfirmDialog({ state, onClose }) {
  if (!state) return null;
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal compact" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="panel-title" id="confirm-title">{state.title}</h2>
            <p className="panel-sub">{state.message}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Batal</button>
          <button
            className={cx('btn', state.danger ? 'btn-danger' : 'btn-primary')}
            onClick={() => {
              onClose();
              state.onConfirm();
            }}
          >
            {state.confirmLabel || 'Lanjut'}
          </button>
        </div>
      </div>
    </>
  );
}

function Sidebar({
  chats,
  currentChatId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onExport,
  query,
  setQuery,
  collapsed,
  online,
  onToggle,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return Object.values(chats)
      .filter((chat) => {
        if (!needle) return true;
        if (chat.title.toLowerCase().includes(needle)) return true;
        return chat.messages.some((message) => message.content.toLowerCase().includes(needle));
      })
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [chats, query]);

  const startRename = (chat) => {
    setEditingId(chat.id);
    setDraft(chat.title);
  };

  const commitRename = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim().slice(0, 90));
    setEditingId(null);
  };

  return (
    <aside className={cx('sidebar', collapsed && 'is-collapsed')} aria-label="Riwayat chat">
      <div className="sidebar-head">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">N</div>
          {!collapsed && (
            <div className="brand-text hide-collapsed">
              <div className="brand-name">NEON <span>AI</span></div>
              <div className="brand-sub">ollama · v6</div>
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={onToggle} aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}>
          <Icon name={collapsed ? 'panel' : 'menu'} />
        </button>
      </div>

      <div className="sidebar-body">
        <div className="sidebar-actions">
          <button className="btn btn-primary btn-block" onClick={onNew}>
            <Icon name="plus" size={17} />
            <span className="hide-collapsed">Chat baru</span>
          </button>
          {!collapsed && (
            <div className="search-wrap hide-collapsed">
              <span className="search-icon"><Icon name="search" size={15} /></span>
              <input
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari chat…"
                aria-label="Cari chat"
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery('')} aria-label="Bersihkan pencarian">
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {!collapsed && <div className="sidebar-label hide-collapsed">{list.length} sesi</div>}

        <div className="chat-list">
          {list.map((chat) => (
            <div
              key={chat.id}
              className={cx('chat-item', currentChatId === chat.id && 'active')}
              onClick={() => onSelect(chat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(chat.id);
                }
              }}
            >
              <span className="chat-item-icon"><Icon name="message" size={15} /></span>
              <div className="chat-item-main">
                {editingId === chat.id ? (
                  <input
                    className="rename-input"
                    autoFocus
                    value={draft}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => setDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename();
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    aria-label="Nama chat"
                  />
                ) : (
                  <>
                    <div className="chat-item-title">{chat.title}</div>
                    <div className="chat-item-meta">{timeAgo(chat.updatedAt || chat.createdAt)}</div>
                  </>
                )}
              </div>
              <div className="chat-item-actions">
                <button
                  className="icon-btn"
                  aria-label="Ekspor chat"
                  title="Ekspor markdown"
                  onClick={(event) => {
                    event.stopPropagation();
                    onExport(chat.id);
                  }}
                >
                  <Icon name="download" size={14} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Ganti nama chat"
                  title="Ganti nama"
                  onClick={(event) => {
                    event.stopPropagation();
                    startRename(chat);
                  }}
                >
                  <Icon name="edit" size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label="Hapus chat"
                  title="Hapus"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(chat.id);
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-foot">
        <span className={cx('status-dot', online === null ? 'checking' : online ? 'online' : 'offline')} />
        <span className="hide-collapsed">{online === null ? 'memeriksa…' : online ? 'Ollama aktif' : 'Ollama offline'}</span>
      </div>
    </aside>
  );
}

function Message({
  message,
  isLast,
  isStreaming,
  onEdit,
  onRegenerate,
  onDelete,
  onNotify,
}) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(message.content);
  }, [message.content, editing]);

  const handleCopy = async () => {
    try {
      await copyText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onNotify('Gagal menyalin ke clipboard', 'error');
    }
  };

  const submitEdit = () => {
    const value = draft.trim();
    if (value && value !== message.content) onEdit(value);
    setEditing(false);
  };

  if (isUser) {
    return (
      <div className="msg user">
        <div className="msg-avatar user"><Icon name="user" size={16} /></div>
        <div className="msg-body">
          <div className="msg-head">
            <span className="msg-time">{fmtTime(message.ts)}</span>
          </div>
          {editing ? (
            <div className="edit-box">
              <textarea
                className="edit-input"
                value={draft}
                autoFocus
                onFocus={(event) => event.target.select()}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setEditing(false);
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submitEdit();
                }}
              />
              <div className="edit-actions">
                <button className="btn btn-primary btn-sm" onClick={submitEdit}>Simpan & kirim ulang</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Batal</button>
              </div>
            </div>
          ) : (
            <div className="bubble">{message.content}</div>
          )}
          {!editing && (
            <div className="msg-actions">
              <button className="icon-btn" onClick={handleCopy} aria-label="Salin pesan" title="Salin">
                <Icon name={copied ? 'check' : 'copy'} size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => setEditing(true)}
                aria-label="Edit pesan"
                title="Edit"
                disabled={isStreaming}
              >
                <Icon name="edit" size={14} />
              </button>
              <button className="icon-btn danger" onClick={onDelete} aria-label="Hapus pesan" title="Hapus">
                <Icon name="trash" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="msg assistant">
      <div className="msg-avatar ai"><Icon name="spark" size={16} /></div>
      <div className="msg-body">
        <div className="msg-head">
          <span className="msg-name">NEON AI</span>
          <span className="msg-time">{fmtTime(message.ts)}</span>
          {message.model && <span className="badge subtle">{message.model}</span>}
          {message.stopped && <span className="badge warn">dihentikan</span>}
        </div>

        {message.thinking ? (
          <details className="thinking" open={isStreaming || undefined}>
            <summary>
              <Icon name="brain" size={12} style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6 }} />
              Proses berpikir · {fmtNumber(message.thinking.length)} karakter
            </summary>
            <pre className="thinking-pre">{message.thinking}</pre>
          </details>
        ) : null}

        <div className="msg-content">
          {message.error ? (
            <div className="msg-error">
              <Icon name="alert" size={16} />
              <span>{message.error}</span>
            </div>
          ) : isStreaming ? (
            <div className="stream-text">
              {message.content || <span className="typing"><span /><span /><span /></span>}
              {message.content ? <span className="caret" /> : null}
            </div>
          ) : message.content ? (
            <Markdown content={message.content} />
          ) : (
            <span className="msg-stopped">Tidak ada konten.</span>
          )}
        </div>

        <Stats stats={message.stats} />

        {!isStreaming && (
          <div className="msg-actions">
            <button className="action-label" onClick={handleCopy}>
              <Icon name={copied ? 'check' : 'copy'} size={13} />
              {copied ? 'Tersalin' : 'Salin'}
            </button>
            {isLast && (
              <button className="action-label" onClick={onRegenerate}>
                <Icon name="refresh" size={13} />
                Ulangi
              </button>
            )}
            <button className="action-label" onClick={onDelete}>
              <Icon name="trash" size={13} />
              Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({ value, onChange, onSend, onStop, isStreaming, model, offline, inputRef }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <div className="composer">
      <div className="composer-inner">
        <div className="composer-box">
          <textarea
            ref={(element) => {
              textareaRef.current = element;
              if (inputRef) inputRef.current = element;
            }}
            className="composer-input"
            rows={1}
            value={value}
            placeholder={isStreaming ? 'NEON AI sedang menulis…' : 'Tanya apa saja…'}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSend();
              }
            }}
            aria-label="Pesan untuk NEON AI"
          />
          <div className="composer-bar">
            <span className="composer-model" title={model || 'Belum ada model'}>
              <Icon name="cpu" size={13} />
              <span>{model || 'belum ada model'}</span>
            </span>
            <span className="composer-hint">
              {offline ? 'Ollama offline · periksa koneksi' : 'Enter kirim · Shift+Enter baris baru'}
            </span>
            {isStreaming ? (
              <button className="btn stop-btn" onClick={onStop} type="button">
                <Icon name="stop" size={13} />
                <span className="btn-text">Stop</span>
              </button>
            ) : (
              <button
                className="btn btn-primary send-btn"
                onClick={onSend}
                type="button"
                disabled={!value.trim()}
                aria-label="Kirim pesan"
              >
                <Icon name="send" size={15} />
                <span className="btn-text">Kirim</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick, offline, onRetry }) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">N</div>
      <h1 className="empty-title">Halo, saya <span>NEON AI</span></h1>
      <p className="empty-sub">
        Asisten lokal yang berjalan di atas Ollama. Pilih model, mulai percakapan, dan data Anda tetap di perangkat ini.
      </p>
      {offline && (
        <div className="msg-error" style={{ maxWidth: 520 }}>
          <Icon name="alert" size={16} />
          <span>
            Ollama belum terdeteksi. Jalankan <strong>ollama serve</strong> lalu coba lagi.
            <button className="btn btn-sm" style={{ marginLeft: 10 }} onClick={onRetry}>Periksa ulang</button>
          </span>
        </div>
      )}
      <div className="suggestions">
        {SUGGESTIONS.map((text) => (
          <button className="suggestion" key={text} onClick={() => onPick(text)}>
            <Icon name="spark" size={15} />
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, hint, format }) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        <span className="value-pill">{format ? format(value) : value}</span>
      </div>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${Math.max(0, Math.min(100, percent))}%` }}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        aria-label={label}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
  models,
  onOpenModels,
  onClose,
  onExportAll,
  onImport,
  onClearAll,
  onStopStream,
  isStreaming,
}) {
  return (
    <aside className="panel" role="dialog" aria-modal="true" aria-label="Pengaturan">
      <div className="panel-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="panel-title">Pengaturan</h2>
          <p className="panel-sub">Model, sampling, dan tampilan</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Tutup pengaturan">
          <Icon name="close" />
        </button>
      </div>

      <div className="panel-body">
        <div className="field">
          <div className="field-label"><span>Model aktif</span></div>
          <select
            className="select"
            value={settings.model}
            onChange={(event) => onChange({ model: event.target.value })}
            disabled={!models.length}
          >
            {!models.length && <option value="">Tidak ada model</option>}
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}{model.parameter_size ? ` · ${model.parameter_size}` : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" type="button" onClick={onOpenModels}>
            <Icon name="cpu" size={14} />
            Kelola model
          </button>
        </div>

        <hr className="divider" />

        <SliderField
          label="Temperature"
          value={settings.temperature}
          min={0}
          max={2}
          step={0.05}
          onChange={(value) => onChange({ temperature: value })}
          format={(value) => Number(value).toFixed(2).replace('.', ',')}
          hint="Lebih rendah = konsisten, lebih tinggi = kreatif."
        />
        <SliderField
          label="Top P"
          value={settings.top_p}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(value) => onChange({ top_p: value })}
          format={(value) => Number(value).toFixed(2).replace('.', ',')}
        />
        <SliderField
          label="Top K"
          value={settings.top_k}
          min={1}
          max={200}
          step={1}
          onChange={(value) => onChange({ top_k: value })}
          format={(value) => String(value)}
        />

        <div className="field">
          <div className="field-label"><span>Batas token jawaban</span></div>
          <input
            className="input"
            type="number"
            min={64}
            max={32768}
            step={64}
            value={settings.num_predict}
            onChange={(event) => onChange({ num_predict: Math.max(64, Math.min(32768, parseInt(event.target.value || '0', 10) || 64)) })}
            aria-label="Batas token jawaban"
          />
          <p className="field-hint">Jumlah maksimum token yang dihasilkan per balasan.</p>
        </div>

        <div className="field">
          <div className="field-label"><span>Keep alive</span></div>
          <select
            className="select"
            value={settings.keepAlive}
            onChange={(event) => onChange({ keepAlive: event.target.value })}
          >
            <option value="5m">5 menit</option>
            <option value="30m">30 menit</option>
            <option value="1h">1 jam</option>
            <option value="24h">24 jam</option>
            <option value="-1">Selamanya (-1)</option>
          </select>
          <p className="field-hint">Berapa lama model tetap dimuat di memori setelah dipakai.</p>
        </div>

        <div className="inline-row">
          <div className="inline-text">
            <div className="inline-title">Mode berpikir</div>
            <div className="inline-desc">Untuk model reasoning (mis. qwen3, deepseek-r1).</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.think}
            className={cx('switch', settings.think && 'on')}
            onClick={() => onChange({ think: !settings.think })}
            aria-label="Mode berpikir"
          />
        </div>

        <hr className="divider" />

        <div className="field">
          <div className="field-label"><span>Warna aksen</span></div>
          <div className="accent-list">
            {ACCENTS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                className={cx('accent-dot', settings.accent === accent.id && 'active')}
                style={{ background: accent.color }}
                onClick={() => onChange({ accent: accent.id })}
                aria-label={`Aksen ${accent.id}`}
                aria-pressed={settings.accent === accent.id}
              />
            ))}
          </div>
        </div>

        <hr className="divider" />

        <div className="field">
          <div className="section-label">Pintasan</div>
          <div className="shortcut-row"><span>Chat baru</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd></span></div>
          <div className="shortcut-row"><span>Buka/tutup sidebar</span><span><kbd>Ctrl</kbd> + <kbd>B</kbd></span></div>
          <div className="shortcut-row"><span>Kirim pesan</span><span><kbd>Enter</kbd></span></div>
          <div className="shortcut-row"><span>Baris baru</span><span><kbd>Shift</kbd> + <kbd>Enter</kbd></span></div>
        </div>

        <div className="field">
          <div className="section-label">Data</div>
          <button className="btn btn-sm" type="button" onClick={onExportAll}>
            <Icon name="download" size={14} />
            Ekspor semua chat (JSON)
          </button>
          <button className="btn btn-sm" type="button" onClick={onImport}>
            <Icon name="upload" size={14} />
            Impor chat (JSON)
          </button>
        </div>

        <div className="danger-zone">
          <div className="inline-title">Zona bahaya</div>
          <div className="inline-desc">Semua data disimpan di browser ini, bukan di server.</div>
          <button className="btn btn-sm btn-danger" type="button" onClick={onClearAll}>
            <Icon name="broom" size={14} />
            Hapus semua data
          </button>
        </div>

        {isStreaming && (
          <button className="btn btn-sm" type="button" onClick={onStopStream}>
            <Icon name="stop" size={13} />
            Hentikan generasi yang berjalan
          </button>
        )}
      </div>
    </aside>
  );
}

function ModelManager({ models, online, onClose, onRefresh, notify }) {
  const [name, setName] = useState('');
  const [pullState, setPullState] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const pull = async () => {
    const target = name.trim();
    if (!target || pullState) return;
    setPullState({ status: 'Menghubungi Ollama…', percent: 0 });
    try {
      const response = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Server membalas ${response.status}`);
      }
      await readSSE(response, (event) => {
        if (event.type === 'progress') {
          const total = Number(event.total || 0);
          const completed = Number(event.completed || 0);
          const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;
          setPullState({ status: event.status || 'Mengunduh…', percent });
        } else if (event.type === 'error') {
          throw new Error(event.message || 'Unduhan gagal');
        }
      });
      setPullState(null);
      setName('');
      notify(`Model "${target}" siap digunakan.`, 'success');
      onRefresh();
    } catch (error) {
      setPullState(null);
      notify(`Gagal mengunduh: ${error.message}`, 'error');
    }
  };

  const removeModel = async (modelName) => {
    setDeleting(modelName);
    try {
      const response = await fetch(`/api/models/${encodeURIComponent(modelName)}`, { method: 'DELETE' });
      if (!response.ok) {
        let detail = await response.text();
        try {
          const parsed = JSON.parse(detail);
          detail = parsed.detail || detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail || `Server membalas ${response.status}`);
      }
      notify('Model dihapus.', 'success');
      onRefresh();
    } catch (error) {
      notify(`Gagal menghapus: ${error.message}`, 'error');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Kelola model">
        <div className="modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="panel-title">Model Ollama</h2>
            <p className="panel-sub">{online ? `${models.length} model terpasang` : 'Ollama offline'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <div className="pull-box">
            <div className="field-label"><span>Unduh model baru</span></div>
            <div className="pull-row">
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') pull();
                }}
                placeholder="mis. llama3.2, qwen2.5-coder:7b"
                aria-label="Nama model untuk diunduh"
                disabled={!!pullState}
              />
              <button className="btn btn-primary" onClick={pull} disabled={!name.trim() || !!pullState}>
                <Icon name="download" size={15} />
                Tarik
              </button>
            </div>
            {pullState && (
              <>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${pullState.percent}%` }} />
                </div>
                <div className="pull-status">
                  <span>{pullState.status}</span>
                  <span>{pullState.percent}%</span>
                </div>
              </>
            )}
            <p className="field-hint">Nama diambil dari library.ollama.com, contoh: <code>llama3.2</code>.</p>
          </div>

          <div className="model-list">
            {models.map((model) => (
              <div className="model-row" key={model.name}>
                <div className="model-info">
                  <div className="model-name">{model.name}</div>
                  <div className="model-meta">
                    {[model.size_human, model.parameter_size, model.quantization].filter(Boolean).join(' · ') || 'ukuran tidak diketahui'}
                  </div>
                </div>
                <div className="model-actions">
                  <button
                    className={cx('btn btn-sm', confirmDelete === model.name && 'btn-danger')}
                    disabled={deleting === model.name}
                    onClick={() => {
                      if (confirmDelete === model.name) {
                        removeModel(model.name);
                      } else {
                        setConfirmDelete(model.name);
                        setTimeout(() => setConfirmDelete((value) => (value === model.name ? null : value)), 3200);
                      }
                    }}
                  >
                    {deleting === model.name ? 'Menghapus…' : confirmDelete === model.name ? 'Yakin?' : 'Hapus'}
                  </button>
                </div>
              </div>
            ))}
            {!models.length && (
              <p className="field-hint">
                Belum ada model terpasang. Unduh satu di atas atau jalankan <code>ollama pull llama3.2</code>.
              </p>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button
            className="btn"
            onClick={async () => {
              setRefreshing(true);
              await onRefresh();
              setRefreshing(false);
            }}
            disabled={refreshing}
          >
            <Icon name="refresh" size={14} />
            {refreshing ? 'Memuat…' : 'Muat ulang'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>Selesai</button>
        </div>
      </div>
    </>
  );
}

function App() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [chats, setChats] = useState(() => load(STORAGE_CHATS, {}));
  const [currentChatId, setCurrentChatId] = useState(() => {
    const stored = load(STORAGE_CHATS, {});
    const ids = Object.keys(stored);
    if (!ids.length) return null;
    return ids.sort(
      (a, b) =>
        (stored[b].updatedAt || stored[b].createdAt || 0) -
        (stored[a].updatedAt || stored[a].createdAt || 0)
    )[0];
  });
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load(STORAGE_SETTINGS, {}) }));
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsOnline, setModelsOnline] = useState(null);
  const [health, setHealth] = useState({ state: 'checking', version: null });
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [pinned, setPinned] = useState(true);

  const streamAbortRef = useRef(null);
  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const importRef = useRef(null);
  const pinnedRef = useRef(true);
  const deletedChatsRef = useRef(new Set());
  const toastSeq = useRef(0);
  const quotaWarnedRef = useRef(false);

  const notify = useCallback((message, type = 'info') => {
    const id = ++toastSeq.current;
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4300);
  }, []);

  const updateChat = useCallback((id, updater) => {
    setChats((previous) => {
      const chat = previous[id];
      if (!chat) return previous;
      return { ...previous, [id]: updater(chat) };
    });
  }, []);

  const createChat = useCallback(() => {
    const id = uid();
    const now = Date.now();
    setChats((previous) => ({
      ...previous,
      [id]: { id, title: 'Sesi baru', messages: [], createdAt: now, updatedAt: now },
    }));
    setCurrentChatId(id);
    setInput('');
    setQuery('');
    if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 60);
    return id;
  }, []);

  const loadModels = useCallback(async (spinner = false) => {
    if (spinner) setModelsLoading(true);
    try {
      const response = await fetch('/api/models', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data.models) ? data.models : [];
      setModels(list);
      setModelsOnline(!!data.online);
      setSettings((previous) => {
        if (!list.length) return previous;
        if (previous.model && list.some((model) => model.name === previous.model)) return previous;
        const preferred = list.find((model) => model.name === PREFERRED_MODEL) || list[0];
        return { ...previous, model: preferred.name };
      });
    } catch {
      setModelsOnline(false);
    } finally {
      if (spinner) setModelsLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      const data = await response.json();
      setHealth({
        state: data.ollama_online ? 'online' : 'offline',
        version: data.version || null,
      });
    } catch {
      setHealth({ state: 'offline', version: null });
    }
  }, []);

  useEffect(() => {
    if (!currentChatId) createChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    checkHealth();
    loadModels();
  }, [checkHealth, loadModels]);

  useEffect(() => {
    const timer = setInterval(checkHealth, 30000);
    const onFocus = () => checkHealth();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkHealth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!save(STORAGE_CHATS, chats) && !quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        notify('Penyimpanan browser penuh. Hapus sebagian chat lama.', 'error');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [chats, notify]);

  useEffect(() => {
    save(STORAGE_SETTINGS, settings);
    document.documentElement.dataset.accent = settings.accent || 'blue';
  }, [settings]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(true);
  }, [isMobile]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const apply = () => document.documentElement.style.setProperty('--app-h', `${Math.round(viewport.height)}px`);
    apply();
    viewport.addEventListener('resize', apply);
    return () => {
      viewport.removeEventListener('resize', apply);
      document.documentElement.style.removeProperty('--app-h');
    };
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const element = threadRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    pinnedRef.current = true;
    setPinned(true);
  }, []);

  useEffect(() => {
    const element = threadRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
      pinnedRef.current = true;
      setPinned(true);
    }
  }, [currentChatId]);

  useEffect(() => {
    if (pinnedRef.current && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [chats]);

  const onThreadScroll = () => {
    const element = threadRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    pinnedRef.current = distance < 120;
    setPinned(distance < 120);
  };

  const patchSettings = (patch) => setSettings((previous) => ({ ...previous, ...patch }));

  const runStream = async (chatId, apiMessages, assistantId, modelName) => {
    const controller = new AbortController();
    streamAbortRef.current = controller;
    setStreaming({ chatId, messageId: assistantId });

    let content = '';
    let thinking = '';
    let stats = null;
    let lastFlush = 0;

    const apply = (patch, force = false) => {
      const now = performance.now();
      if (!force && now - lastFlush < 70) return;
      lastFlush = now;
      updateChat(chatId, (chat) => ({
        ...chat,
        updatedAt: Date.now(),
        messages: chat.messages.map((message) =>
          message.id === assistantId ? { ...message, ...patch } : message
        ),
      }));
    };

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: apiMessages,
          options: {
            temperature: Number(settings.temperature),
            top_p: Number(settings.top_p),
            top_k: Number(settings.top_k),
            num_predict: Number(settings.num_predict),
          },
          think: settings.think ? true : undefined,
          keep_alive: settings.keepAlive || undefined,
        }),
      });

      if (!response.ok) {
        let detail = await response.text();
        try {
          const parsed = JSON.parse(detail);
          detail = parsed.detail || parsed.error || detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail || `Server membalas ${response.status}`);
      }

      await readSSE(response, (event) => {
        if (event.type === 'token') {
          content += event.content || '';
          apply({ content });
        } else if (event.type === 'thinking') {
          thinking += event.content || '';
          apply({ thinking, content });
        } else if (event.type === 'done') {
          stats = event.stats || null;
        } else if (event.type === 'error') {
          throw new Error(event.message || 'Terjadi kesalahan pada stream.');
        }
      });

      apply({ content, thinking, streaming: false, stats, error: null }, true);
    } catch (error) {
      const aborted = error.name === 'AbortError';
      apply(
        {
          content,
          thinking,
          streaming: false,
          stopped: aborted,
          error: aborted ? null : String(error.message || error),
        },
        true
      );
      if (!deletedChatsRef.current.has(chatId)) {
        if (aborted) notify('Generasi dihentikan.', 'info');
        else notify(`Gagal: ${error.message}`, 'error');
      }
    } finally {
      deletedChatsRef.current.delete(chatId);
      setStreaming(null);
      streamAbortRef.current = null;
    }
  };

  const handleSend = async (override) => {
    const text = (typeof override === 'string' ? override : input).trim();
    if (!text || streaming) return;
    if (!settings.model) {
      notify('Pilih model Ollama terlebih dahulu.', 'error');
      setModelsOpen(true);
      return;
    }

    let chatId = currentChatId;
    let base = [];
    let existing = chatId ? chats[chatId] : null;
    let hadUser = false;
    if (existing) {
      base = existing.messages;
      hadUser = existing.messages.some((message) => message.role === 'user');
    } else {
      chatId = uid();
    }

    const userMessage = { id: uid(), role: 'user', content: text, ts: Date.now() };
    const assistantId = uid();
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      thinking: '',
      ts: Date.now(),
      streaming: true,
      model: settings.model,
    };
    const messages = [...base, userMessage, assistantMessage];
    const title = hadUser && existing ? existing.title : makeTitle(text);

    setChats((previous) => ({
      ...previous,
      [chatId]: {
        ...(previous[chatId] || { createdAt: Date.now(), messages: [] }),
        id: chatId,
        title,
        messages,
        updatedAt: Date.now(),
      },
    }));
    setCurrentChatId(chatId);
    setInput('');
    if (isMobile) setSidebarOpen(false);
    pinnedRef.current = true;
    setPinned(true);

    const history = messages
      .filter((message) => message.id !== assistantId && !message.error && message.content.trim())
      .map(toApiMessage);

    await runStream(chatId, history, assistantId, settings.model);
  };

  const regenerate = async (chatId, assistantId) => {
    if (streaming) return;
    const chat = chats[chatId];
    if (!chat) return;
    const index = chat.messages.findIndex((message) => message.id === assistantId);
    if (index < 0) return;
    const before = chat.messages.slice(0, index);
    if (!before.some((message) => message.role === 'user')) {
      notify('Tidak ada pesan pengguna untuk diulang.', 'error');
      return;
    }

    const newAssistantId = uid();
    const assistantMessage = {
      id: newAssistantId,
      role: 'assistant',
      content: '',
      thinking: '',
      ts: Date.now(),
      streaming: true,
      model: settings.model,
    };
    updateChat(chatId, (current) => ({
      ...current,
      messages: [...before, assistantMessage],
      updatedAt: Date.now(),
    }));
    if (isMobile) setSidebarOpen(false);

    const history = before
      .filter((message) => !message.error && message.content.trim())
      .map(toApiMessage);
    await runStream(chatId, history, newAssistantId, settings.model);
  };

  const editMessage = async (chatId, messageId, newText) => {
    if (streaming) return;
    const chat = chats[chatId];
    if (!chat) return;
    const index = chat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;

    const before = chat.messages.slice(0, index);
    const edited = { ...chat.messages[index], content: newText, ts: Date.now() };
    const assistantId = uid();
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      thinking: '',
      ts: Date.now(),
      streaming: true,
      model: settings.model,
    };
    const messages = [...before, edited, assistantMessage];

    updateChat(chatId, (current) => ({
      ...current,
      messages,
      title: before.some((message) => message.role === 'user') ? current.title : makeTitle(newText),
      updatedAt: Date.now(),
    }));

    const history = messages
      .filter((message) => message.id !== assistantId && !message.error && message.content.trim())
      .map(toApiMessage);
    await runStream(chatId, history, assistantId, settings.model);
  };

  const deleteMessage = (chatId, messageId) => {
    updateChat(chatId, (chat) => ({
      ...chat,
      messages: chat.messages.filter((message) => message.id !== messageId),
      updatedAt: Date.now(),
    }));
  };

  const stopStreaming = () => {
    streamAbortRef.current?.abort();
  };

  const exportChat = (chatId) => {
    const chat = chats[chatId];
    if (!chat) return;
    downloadFile(`${slugify(chat.title)}.md`, chatToMarkdown(chat), 'text/markdown;charset=utf-8');
    notify('Chat diekspor sebagai Markdown.', 'success');
  };

  const exportAll = () => {
    const payload = {
      app: 'neon-ai',
      version: 6,
      exportedAt: new Date().toISOString(),
      chats,
    };
    downloadFile(`neon-chats-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
    notify('Semua chat diekspor.', 'success');
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = data && typeof data === 'object' && data.chats ? data.chats : data;
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
        throw new Error('Format file tidak dikenali.');
      }
      const valid = {};
      Object.values(incoming).forEach((chat) => {
        if (!chat || !Array.isArray(chat.messages)) return;
        const id = uid();
        valid[id] = {
          ...chat,
          id,
          createdAt: chat.createdAt || Date.now(),
          updatedAt: chat.updatedAt || Date.now(),
          messages: chat.messages
            .filter((message) => message && typeof message.content === 'string')
            .map((message) => ({ ...message, id: message.id || uid(), streaming: false })),
        };
      });
      const count = Object.keys(valid).length;
      if (!count) throw new Error('Tidak ada chat yang bisa diimpor.');
      setChats((previous) => ({ ...previous, ...valid }));
      setCurrentChatId(Object.keys(valid)[0]);
      setSettingsOpen(false);
      notify(`${count} chat berhasil diimpor.`, 'success');
    } catch (error) {
      notify(error.message || 'Gagal mengimpor file.', 'error');
    }
  };

  const requestDeleteChat = (chatId) => {
    const chat = chats[chatId];
    if (!chat) return;
    setConfirm({
      title: 'Hapus chat?',
      message: `"${chat.title}" akan dihapus permanen dari perangkat ini.`,
      confirmLabel: 'Hapus',
      danger: true,
      onConfirm: () => {
        if (streaming?.chatId === chatId) {
          deletedChatsRef.current.add(chatId);
          stopStreaming();
        }
        setChats((previous) => {
          const next = { ...previous };
          delete next[chatId];
          return next;
        });
        if (currentChatId === chatId) {
          const remaining = Object.keys(chats).filter((id) => id !== chatId);
          setCurrentChatId(remaining.length ? remaining[0] : null);
          if (!remaining.length) setTimeout(createChat, 0);
        }
        notify('Chat dihapus.', 'success');
      },
    });
  };

  const clearAll = () => {
    setConfirm({
      title: 'Hapus semua data?',
      message: 'Semua riwayat chat dan pengaturan di perangkat ini akan dihapus. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Hapus semua',
      danger: true,
      onConfirm: () => {
        if (streaming?.chatId) deletedChatsRef.current.add(streaming.chatId);
        stopStreaming();
        setChats({});
        setSettings({ ...DEFAULT_SETTINGS });
        try {
          localStorage.removeItem(STORAGE_CHATS);
          localStorage.removeItem(STORAGE_SETTINGS);
        } catch {
          /* ignore */
        }
        setSettingsOpen(false);
        setModelsOpen(false);
        setTimeout(createChat, 0);
        notify('Semua data dihapus.', 'success');
      },
    });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        createChat();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarOpen((value) => !value);
        return;
      }
      if (event.key === 'Escape') {
        if (confirm) setConfirm(null);
        else if (modelsOpen) setModelsOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirm, modelsOpen, settingsOpen, createChat]);

  const activeChat = currentChatId ? chats[currentChatId] : null;
  const messages = activeChat?.messages || [];
  const online = modelsOnline === null ? health.state === 'online' : modelsOnline;

  return (
    <div className={cx('app', sidebarOpen && 'sidebar-open')}>
      <div className="aurora a1" />
      <div className="aurora a2" />

      {isMobile && sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelect={(id) => {
          setCurrentChatId(id);
          if (isMobile) setSidebarOpen(false);
        }}
        onNew={createChat}
        onRename={(id, title) => updateChat(id, (chat) => ({ ...chat, title, updatedAt: Date.now() }))}
        onDelete={requestDeleteChat}
        onExport={exportChat}
        query={query}
        setQuery={setQuery}
        collapsed={!isMobile && !sidebarOpen}
        online={online}
        onToggle={() => setSidebarOpen((value) => !value)}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            >
              <Icon name={sidebarOpen && !isMobile ? 'panel' : 'menu'} />
            </button>
            <div className="topbar-title">
              <strong>{activeChat?.title || 'NEON AI'}</strong>
              <span>
                {activeChat
                  ? `${fmtNumber(messages.length)} pesan · ${timeAgo(activeChat.updatedAt)}`
                  : 'Sesi baru'}
              </span>
            </div>
          </div>
          <div className="topbar-right">
            <span className={cx('status-pill', health.state)}>
              <span className={cx('status-dot', health.state)} />
              {health.state === 'online' ? 'Online' : health.state === 'checking' ? 'Memeriksa' : 'Offline'}
            </span>
            <button className="model-pill" onClick={() => setModelsOpen(true)} title="Kelola model">
              <Icon name="cpu" size={15} />
              <span className="model-pill-text">{settings.model || 'Pilih model'}</span>
              <Icon name="chevronDown" size={13} />
            </button>
            <button
              className={cx('icon-btn', settingsOpen && 'is-active')}
              onClick={() => setSettingsOpen((value) => !value)}
              aria-label="Pengaturan"
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>

        <div className="thread" ref={threadRef} onScroll={onThreadScroll}>
          <div className="thread-inner">
            {messages.length === 0 ? (
              <EmptyState
                offline={health.state === 'offline'}
                onRetry={() => {
                  checkHealth();
                  loadModels(true);
                }}
                onPick={(text) => {
                  setInput(text);
                  inputRef.current?.focus();
                }}
              />
            ) : (
              messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  isStreaming={
                    streaming?.chatId === activeChat.id && streaming?.messageId === message.id
                  }
                  onNotify={notify}
                  onEdit={(text) => editMessage(activeChat.id, message.id, text)}
                  onRegenerate={() => regenerate(activeChat.id, message.id)}
                  onDelete={() => deleteMessage(activeChat.id, message.id)}
                />
              ))
            )}
          </div>
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={stopStreaming}
          isStreaming={!!streaming}
          model={settings.model}
          offline={health.state === 'offline'}
          inputRef={inputRef}
        />

        {!pinned && messages.length > 0 && (
          <button
            className="scroll-btn"
            onClick={() => scrollToBottom(true)}
            aria-label="Ke pesan terbaru"
          >
            <Icon name="arrowDown" size={17} />
          </button>
        )}
      </main>

      {settingsOpen && (
        <>
          <div className="backdrop" onClick={() => setSettingsOpen(false)} />
          <SettingsPanel
            settings={settings}
            onChange={patchSettings}
            models={models}
            onOpenModels={() => {
              setSettingsOpen(false);
              setModelsOpen(true);
            }}
            onClose={() => setSettingsOpen(false)}
            onExportAll={exportAll}
            onImport={() => importRef.current?.click()}
            onClearAll={clearAll}
            onStopStream={stopStreaming}
            isStreaming={!!streaming}
          />
        </>
      )}

      {modelsOpen && (
        <ModelManager
          models={models}
          online={!!online}
          loading={modelsLoading}
          onClose={() => setModelsOpen(false)}
          onRefresh={() => loadModels(true)}
          notify={notify}
        />
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>

      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
