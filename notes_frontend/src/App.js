import React, { useState, useEffect } from 'react';
import './App.css';
import { createClient } from '@supabase/supabase-js';

/**
 * Minimalistic Notes App with Supabase integration.
 * Features: Auth, create, update, delete, list, and search notes
 * Layout: Sidebar, Topbar, Main Content
 */

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

// PUBLIC_INTERFACE
function App() {
  // Theme state
  const [theme, setTheme] = useState('light');
  // Supabase client
  const [supabase] = useState(() => createClient(SUPABASE_URL, SUPABASE_KEY));
  // Auth/user states
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('sign-in'); // sign-in or sign-up
  // Notes state
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editNote, setEditNote] = useState({ title: '', content: '' });
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  // Handle theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Get user on mount
  useEffect(() => {
    // PUBLIC_INTERFACE
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data && data.user) setUser(data.user);
    };
    getUser();
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          setNotes([]);
          setSelectedNote(null);
        }
      }
    );
    return () => subscription.unsubscribe();
    // eslint-disable-next-line
  }, [supabase]);

  // Fetch notes for user
  useEffect(() => {
    if (!user) return;
    fetchNotes();
    // eslint-disable-next-line
  }, [user]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // PUBLIC_INTERFACE
  const fetchNotes = async () => {
    setLoadingNotes(true);
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      setNotes([]);
    } else {
      setNotes(data);
    }
    setLoadingNotes(false);
  };

  // PUBLIC_INTERFACE
  const handleAuth = (evt) => {
    evt.preventDefault();
    if (authView === 'sign-in') {
      handleSignIn(evt);
    } else {
      handleSignUp(evt);
    }
  };

  // PUBLIC_INTERFACE
  const handleSignIn = async (evt) => {
    evt.preventDefault();
    const email = evt.target.email.value;
    const password = evt.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setAuthView('sign-in');
    } else {
      alert(error.message);
    }
  };

  // PUBLIC_INTERFACE
  const handleSignUp = async (evt) => {
    evt.preventDefault();
    const email = evt.target.email.value;
    const password = evt.target.password.value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) {
      setAuthView('sign-in');
      alert('Sign up successful, now you can log in.');
    } else {
      alert(error.message);
    }
  };

  // PUBLIC_INTERFACE
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNotes([]);
    setSelectedNote(null);
  };

  // PUBLIC_INTERFACE
  const handleNoteSelect = (note) => {
    setSelectedNote(note);
    setEditNote({ title: note.title, content: note.content });
    setAdding(false);
  };

  // PUBLIC_INTERFACE
  const handleNoteAddClick = () => {
    setAdding(true);
    setSelectedNote(null);
    setEditNote({ title: '', content: '' });
  };

  // PUBLIC_INTERFACE
  const handleNoteEditChange = (evt) => {
    const { name, value } = evt.target;
    setEditNote((prev) => ({ ...prev, [name]: value }));
  };

  // PUBLIC_INTERFACE
  const handleNoteSave = async (evt) => {
    evt.preventDefault();
    if (!editNote.title.trim()) {
      alert("Title is required.");
      return;
    }
    if (adding) {
      // Insert note
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: user.id,
          title: editNote.title,
          content: editNote.content || '',
        }]);
      if (!error) {
        setAdding(false);
        fetchNotes();
      } else {
        alert(error.message);
      }
    } else {
      // Update note
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: editNote.title,
          content: editNote.content || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedNote.id)
        .eq('user_id', user.id);
      if (!error) {
        setSelectedNote((prev) => ({ ...prev, ...editNote }));
        fetchNotes();
      } else {
        alert(error.message);
      }
    }
  };

  // PUBLIC_INTERFACE
  const handleNoteDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm("Delete this note?")) return;
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', selectedNote.id)
      .eq('user_id', user.id);
    if (!error) {
      setSelectedNote(null);
      fetchNotes();
    } else {
      alert(error.message);
    }
  };

  // PUBLIC_INTERFACE
  const handleSearchChange = (evt) => {
    setSearch(evt.target.value);
  };

  // Search notes (client side for quick response)
  useEffect(() => {
    if (!user) return;
    // Debounce search
    const timeout = setTimeout(() => {
      fetchNotes();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line
  }, [search]);

  // --- UI RENDER ---

  // PUBLIC_INTERFACE
  const AuthForm = () => (
    <div className="auth-form-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <form
        className="auth-form"
        onSubmit={handleAuth}
        style={{
          minWidth: 320,
          padding: 32,
          borderRadius: 10,
          background: 'var(--bg-secondary)',
          boxShadow: '0 0 16px #0001',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        <h2 style={{ margin: 0 }}>{authView === 'sign-in' ? 'Sign In' : 'Sign Up'}</h2>
        <input name="email" type="email" placeholder="Email" required style={inputStyle} />
        <input name="password" type="password" placeholder="Password" required style={inputStyle} minLength={6} />
        <button type="submit" style={buttonStyle}>{authView === 'sign-in' ? 'Sign In' : 'Sign Up'}</button>
        <button
          type="button"
          onClick={() => setAuthView(authView === 'sign-in' ? 'sign-up' : 'sign-in')}
          style={{ ...buttonStyle, background: '#8882', color: 'var(--text-primary)' }}
        >
          {authView === 'sign-in' ? "No account? Sign Up" : "Already signed up? Sign In"}
        </button>
      </form>
    </div>
  );

  // PUBLIC_INTERFACE
  const Sidebar = () => (
    <aside style={sidebarStyle}>
      <div style={{ fontWeight: 'bold', fontSize: 22, padding: '24px 12px 0 12px', color: '#1976d2' }}>📝 Notes</div>
      <button
        style={buttonStylePrimary}
        onClick={handleNoteAddClick}
        disabled={adding}
      >
        + Add Note
      </button>
      <input
        type="text"
        placeholder="Search notes"
        value={search}
        onChange={handleSearchChange}
        style={{ ...inputStyle, margin: '12px', marginBottom: 0 }}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingNotes && <div style={{ padding: '1em 12px', color: '#888' }}>Loading...</div>}
        {!loadingNotes && notes.length === 0 && <div style={{ padding: '1em 12px', color: '#aaa' }}>No notes found.</div>}
        {notes.map(note => (
          <div
            key={note.id}
            onClick={() => handleNoteSelect(note)}
            style={{
              ...noteSidebarItemStyle,
              background: selectedNote && selectedNote.id === note.id ? '#e3f2fd' : 'transparent'
            }}
          >
            <strong>{note.title}</strong>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{note.updated_at ? (new Date(note.updated_at)).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>
    </aside>
  );

  // PUBLIC_INTERFACE
  const Topbar = () => (
    <header style={topbarStyle}>
      <div style={{ fontWeight: 'bold', fontSize: 20, color: '#424242' }}>Notes App</div>
      <div style={{ flex: 1 }} />
      <button className="theme-toggle" style={{ marginRight: 16 }} onClick={toggleTheme}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
      <button
        style={{ ...buttonStyle, background: '#e53935', color: '#fff' }}
        onClick={handleLogout}
      >
        Logout
      </button>
    </header>
  );

  // PUBLIC_INTERFACE
  const NoteEditor = () => (
    <form style={mainNoteContentStyle} onSubmit={handleNoteSave}>
      <input
        name="title"
        value={editNote.title}
        onChange={handleNoteEditChange}
        placeholder="Note title"
        style={{ ...inputStyleLarge, fontWeight: 'bold', fontSize: 22, marginBottom: 12 }}
        maxLength={120}
        required
        autoFocus
      />
      <textarea
        name="content"
        value={editNote.content}
        onChange={handleNoteEditChange}
        placeholder="Note content"
        style={{ ...inputStyleLarge, minHeight: 180, marginBottom: 12, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="submit"
          style={buttonStylePrimary}
        >
          {adding ? "Create" : "Save"}
        </button>
        {!adding && <button
          type="button"
          style={{ ...buttonStyle, background: '#e53935', color: '#fff' }}
          onClick={handleNoteDelete}
        >
          Delete
        </button>}
      </div>
    </form>
  );

  // PUBLIC_INTERFACE
  const NoteViewer = () => (
    <div style={mainNoteContentStyle}>
      <h2>{selectedNote.title}</h2>
      <div style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>{selectedNote.updated_at ? (new Date(selectedNote.updated_at)).toLocaleString() : ''}</div>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>
        {selectedNote.content}
      </div>
      <button
        style={{ ...buttonStyle, marginTop: 20 }}
        onClick={() => setAdding(false)}
      >
        Edit
      </button>
    </div>
  );

  // --- Page Layout ---
  if (!user) return <AuthForm />;

  return (
    <div style={appContainerStyle}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Topbar />
        <main style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {adding ? (
            <NoteEditor />
          ) : selectedNote ? (
            <NoteEditor />
          ) : (
            <div style={mainNoteContentStyle}>
              <div style={{ color: '#888', fontSize: 20, textAlign: 'center', marginTop: 64 }}>
                Select a note or add a new note to get started.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---- Styles ----

const sidebarStyle = {
  width: 280,
  background: '#f8f9fa',
  borderRight: '1px solid var(--border-color)',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

const topbarStyle = {
  height: 60,
  background: '#f8f9fa',
  borderBottom: '1px solid var(--border-color)',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 28px',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const mainNoteContentStyle = {
  maxWidth: 640,
  margin: '36px auto',
  width: '100%',
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 2px 8px #0001',
  padding: '32px 28px',
  minHeight: 280,
  display: 'flex',
  flexDirection: 'column'
};

const noteSidebarItemStyle = {
  padding: '12px 18px',
  borderRadius: 8,
  margin: '6px 9px',
  cursor: 'pointer',
  background: 'transparent',
  transition: 'background 0.15s',
  fontSize: 16
};

const buttonStyle = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 15,
  fontWeight: 500,
  background: '#eee',
  color: '#222',
  cursor: 'pointer',
  marginTop: 0,
  marginBottom: 0
};

const buttonStylePrimary = {
  ...buttonStyle,
  background: '#1976d2',
  color: '#fff',
  margin: '18px 12px 8px 12px',
  width: 'calc(100% - 24px)'
};

const inputStyle = {
  border: '1px solid #e9ecef',
  borderRadius: 7,
  padding: '9px 12px',
  fontSize: 16,
  marginBottom: 8,
  width: 'calc(100% - 24px)',
  background: '#fff',
  color: '#222'
};

const inputStyleLarge = {
  ...inputStyle,
  width: '100%',
  fontSize: 18
};

const appContainerStyle = {
  display: 'flex',
  minHeight: '100vh',
  background: 'var(--bg-primary)'
};

export default App;
