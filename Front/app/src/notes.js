import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./notes.css";
import { Link, useNavigate } from "react-router-dom";
import book from "./photos/book.png";

const PRIORITY_COLORS = {
  Haut: { border: "#ef4444", glow: "rgba(239,68,68,0.18)", badge: "#ef444422", text: "#ef4444", label: "High", rgb: "239,68,68" },
  Moyen: { border: "#f97316", glow: "rgba(249,115,22,0.18)", badge: "#f9731622", text: "#f97316", label: "Medium", rgb: "249,115,22" },
  Bas: { border: "#22c55e", glow: "rgba(34,197,94,0.18)", badge: "#22c55e22", text: "#22c55e", label: "Low", rgb: "34,197,94" },
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "priority-high", label: "Priority: High → Low" },
  { value: "priority-low", label: "Priority: Low → High" },
  { value: "title-az", label: "Title: A → Z" },
];

const PRIORITY_ORDER = { Haut: 3, Moyen: 2, Bas: 1 };

function sortNotes(notes, sortBy) {
  const arr = [...notes];
  switch (sortBy) {
    case "oldest": return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case "priority-high": return arr.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);
    case "priority-low": return arr.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    case "title-az": return arr.sort((a, b) => a.title.localeCompare(b.title));
    default: return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}


function NotesLogo() {
  return (
    <div className="logo-wrap">
      
      <img 
        src={book} 
        alt="Notes Logo" 
        className="logo-svg"
        style={{ width: '44px', height: '44px', objectFit: 'contain' }}
      />
      <div className="logo-text">
        <span className="logo-my">My</span>
        <span className="logo-notes">Notes</span>
      </div>
    </div>
  );
}

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [modal, setModal] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("Moyen");
  const [doneIds, setDoneIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("doneIds") || "[]"); } catch { return []; }
  });
  const [trashNotes, setTrashNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trashNotes") || "[]"); } catch { return []; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const getAuthConfig = () => {
    const currentToken = localStorage.getItem("token");
    return { headers: { Authorization: currentToken ? `Bearer ${currentToken}` : "" } };
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    navigate("/login");
  }, [navigate]);

  const handleAuthError = (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      logout();
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!token) {
      logout();
    }
  }, [token, logout]);

  useEffect(() => {
    const onStorageChange = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", onStorageChange);
    const intervalId = setInterval(() => {
      const current = localStorage.getItem("token");
      if (current !== token) {
        setToken(current);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", onStorageChange);
      clearInterval(intervalId);
    };
  }, [token]);

  useEffect(() => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      return undefined;
    }

    try {
      const [, payload] = currentToken.split(".");
      if (!payload) return undefined;
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      if (!decoded.exp) return undefined;
      const millisecondsUntilExpiry = decoded.exp * 1000 - Date.now() - 1000;
      if (millisecondsUntilExpiry <= 0) {
        logout();
        return undefined;
      }
      const timerId = setTimeout(logout, millisecondsUntilExpiry);
      return () => clearTimeout(timerId);
    } catch {
      return undefined;
    }
  }, [logout, token]);

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    if (!localStorage.getItem("token")) {
      logout();
      return;
    }

    try {
      const res = await axios.get(
        "http://noteapp.local/api/notes",
        getAuthConfig()
      );

      setNotes(res.data);
    } catch (err) {
      if (handleAuthError(err)) {
        return;
      }

      console.error("Token expired or invalid", err);
      setTimeout(fetchNotes, 5000);
    }
  };

  const openNote = (note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setPriority(note.priority);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedNote(null);
    setTitle("");
    setContent("");
    setPriority("Moyen");
  };

  const handleAdd = async () => {
    if (!title.trim()) return alert("Title is required");
    try {
      await axios.post("http://noteapp.local/api/notes", { title, content, priority }, getAuthConfig());
      closeModal();
      fetchNotes();
    } catch (err) {
      if (handleAuthError(err)) return;
      alert(err.response?.data?.message || "Error saving note");
    }
  };

  const handleEdit = async () => {
    if (!title.trim()) return alert("Title is required");
    try {
      await axios.put(`http://noteapp.local/api/notes/${selectedNote.id}`, { title, content, priority }, getAuthConfig());
      closeModal();
      fetchNotes();
    } catch (err) {
      if (handleAuthError(err)) return;
      alert(err.response?.data?.message || "Error saving note");
    }
  };

  const handleDelete = async (note) => {
    try {
      await axios.delete(`http://noteapp.local/api/notes/${note.id}`, getAuthConfig());
      const updated = [...trashNotes, { ...note, deletedAt: new Date().toISOString() }];
      setTrashNotes(updated);
      localStorage.setItem("trashNotes", JSON.stringify(updated));
      closeModal();
      fetchNotes();
    } catch (err) {
      if (handleAuthError(err)) return;
      console.error("Delete failed", err);
    }
  };

  const handleMarkDone = (note) => {
    const updated = doneIds.includes(note.id)
      ? doneIds.filter(id => id !== note.id)
      : [...doneIds, note.id];
    setDoneIds(updated);
    localStorage.setItem("doneIds", JSON.stringify(updated));
  };

  const restoreFromTrash = async (note) => {
    try {
      await axios.post("http://noteapp.local/api/notes", { title: note.title, content: note.content, priority: note.priority }, getAuthConfig());
      const updated = trashNotes.filter(n => n.id !== note.id);
      setTrashNotes(updated);
      localStorage.setItem("trashNotes", JSON.stringify(updated));
      fetchNotes();
    } catch (err) {
      if (handleAuthError(err)) return;
      console.error("Restore failed", err);
    }
  };

  const clearTrash = () => {
    setTrashNotes([]);
    localStorage.removeItem("trashNotes");
  };

  const sorted = sortNotes(notes, sortBy);
  const doneNotes = sorted.filter(n => doneIds.includes(n.id));
  const activeNotes = sorted.filter(n => !doneIds.includes(n.id));

  return (
    <>
      <div className="nc">

       
        <div className="bg-book" aria-hidden="true" />
        <div className="bg-glow-left" aria-hidden="true" />
        <div className="bg-glow-right" aria-hidden="true" />

        <div className="nw">

          <div className="nh">
            <NotesLogo />
            <div className="nh-right">
              <div className="sort-wrap">
                <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="sort-arrow">▾</span>
              </div>
              
              <button className="icon-btn btn-add" title="Add note" onClick={() => setModal("add")}>＋</button>
             
              <button className="icon-btn btn-done" title="Done list" onClick={() => setModal("done")}>✓</button>
              
              <button className="icon-btn btn-trash" title="Deleted notes" onClick={() => setModal("trash")}>🗑</button>
              <button className="logout-btn" onClick={logout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>

          
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-num">{notes.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-divider"/>
            <div className="stat-item">
              <span className="stat-num" style={{color:"#22c55e"}}>{doneIds.filter(id => notes.find(n=>n.id===id)).length}</span>
              <span className="stat-label">Done</span>
            </div>
            <div className="stat-divider"/>
            <div className="stat-item">
              <span className="stat-num" style={{color:"#ef4444"}}>{notes.filter(n=>n.priority==="Haut").length}</span>
              <span className="stat-label">High Priority</span>
            </div>
          </div>

          
          {notes.length === 0
            ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <div className="empty-msg">No notes yet — hit + to create one</div>
              </div>
            )
            : (
              <>
                {activeNotes.length > 0 && (
                  <div className="notes-list">
                    {activeNotes.map(note => (
                      <NoteCard key={note.id} note={note} done={false} onOpen={openNote} onToggleDone={handleMarkDone} />
                    ))}
                  </div>
                )}
                {doneNotes.length > 0 && (
                  <>
                    <div className="section-label">
                      <span className="section-line"/>
                      Completed ({doneNotes.length})
                      <span className="section-line"/>
                    </div>
                    <div className="notes-list">
                      {doneNotes.map(note => (
                        <NoteCard key={note.id} note={note} done={true} onOpen={openNote} onToggleDone={handleMarkDone} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )
          }
        </div>
      </div>

      
      {modal === "add" && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">✦ New Note</span>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <NoteForm title={title} setTitle={setTitle} content={content} setContent={setContent} priority={priority} setPriority={setPriority} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd}>Add Note</button>
            </div>
          </div>
        </div>
      )}

      {modal === "edit" && selectedNote && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">✎ Edit Note</span>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <NoteForm title={title} setTitle={setTitle} content={content} setContent={setContent} priority={priority} setPriority={setPriority} />
            <div className="modal-actions">
              <button className="btn-danger" onClick={() => handleDelete(selectedNote)}>Delete</button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal === "done" && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">✓ Completed Notes</span>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            {doneNotes.length === 0
              ? <div className="modal-empty">No completed notes yet</div>
              : (
                <div className="modal-note-list">
                  {doneNotes.map(note => {
                    const p = PRIORITY_COLORS[note.priority];
                    return (
                      <div className="modal-note-item" key={note.id}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.border, flexShrink: 0 }} />
                        <div className="modal-note-item-body">
                          <div className="modal-note-item-title" style={{ textDecoration: "line-through", color: "#475569" }}>{note.title}</div>
                          <div className="modal-note-item-date">{new Date(note.created_at).toLocaleDateString()}</div>
                        </div>
                        <button className="restore-btn" onClick={() => handleMarkDone(note)}>Undo</button>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>
      )}

      {modal === "trash" && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="trash-header">
              <span className="modal-title">🗑 Deleted Notes</span>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            {trashNotes.length === 0
              ? <div className="modal-empty">Trash is empty</div>
              : (
                <>
                  <div className="modal-note-list" style={{ marginBottom: 16 }}>
                    {trashNotes.map((note, i) => {
                      const p = PRIORITY_COLORS[note.priority] || PRIORITY_COLORS.Moyen;
                      return (
                        <div className="modal-note-item" key={i}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.border, flexShrink: 0 }} />
                          <div className="modal-note-item-body">
                            <div className="modal-note-item-title">{note.title}</div>
                            <div className="modal-note-item-date">Deleted {new Date(note.deletedAt).toLocaleDateString()}</div>
                          </div>
                          <button className="restore-btn" onClick={() => restoreFromTrash(note)}>Restore</button>
                        </div>
                      );
                    })}
                  </div>
                  <button className="btn-danger" style={{ width: "100%", padding: "11px" }} onClick={clearTrash}>Empty Trash</button>
                </>
              )
            }
          </div>
        </div>
      )}
    </>
  );
}

function NoteCard({ note, done, onOpen, onToggleDone }) {
  const p = PRIORITY_COLORS[note.priority] || PRIORITY_COLORS.Moyen;
  return (
    <div
      className={`note-card${done ? " done-card" : ""}`}
      style={{
        borderLeftColor: p.border,
        "--pri-r": p.rgb,
      }}
      onClick={() => onOpen(note)}
    >
      <div className="note-card-inner">
        <div
          className={`done-check${done ? " checked" : ""}`}
          style={{ borderColor: p.border }}
          onClick={e => { e.stopPropagation(); onToggleDone(note); }}
          title={done ? "Mark incomplete" : "Mark done"}
        >
          {done && (
            <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
        </div>
        <div className="note-card-body">
          <div className="note-card-top">
            <span className={`note-card-title${done ? " done-title" : ""}`}>{note.title}</span>
            <span className="pri-badge" style={{ background: p.badge, color: p.text, borderColor: `${p.border}44` }}>{p.label}</span>
          </div>
          {note.content && <p className="note-card-content">{note.content}</p>}
          <div className="note-card-footer">
            <span className="note-date">📅 {new Date(note.created_at).toLocaleDateString()}</span>
            <span className="note-arrow">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteForm({ title, setTitle, content, setContent, priority, setPriority }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" type="text" placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
      </div>
      <div className="form-group">
        <label className="form-label">Content</label>
        <textarea className="form-textarea" placeholder="Write your note..." value={content} onChange={e => setContent(e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">Priority</label>
        <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="Bas">🟢 Low Priority</option>
          <option value="Moyen">🟠 Medium Priority</option>
          <option value="Haut">🔴 High Priority</option>
        </select>
      </div>
    </>
  );
}