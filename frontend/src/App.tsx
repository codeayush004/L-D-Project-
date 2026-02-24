import { useState, useEffect } from 'react';
import axios from 'axios';
import { Home, BarChart2, MessageSquare, Users, BookOpen } from 'lucide-react';
import FileUpload from './components/FileUpload';
import InternGrid from './components/InternGrid';
import ChatBot from './components/ChatBot';
import InternList from './components/InternList';
import FeedbackGrid from './components/FeedbackGrid'; // Added FeedbackGrid import
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview'); // Changed initial tab to 'overview'
  const [data, setData] = useState([]);
  const [manager, setManager] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const fetchData = async () => {
    if (!manager || !activeBatch) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/scores?manager_id=${manager.manager_id}&batch_id=${activeBatch.batch_id}`);
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  const fetchBatches = async () => {
    if (!manager) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/batches?manager_id=${manager.manager_id}`);
      setBatches(res.data);
      if (!activeBatch && res.data.length > 0) {
        setActiveBatch(res.data[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName) return;
    try {
      await axios.post('http://localhost:5000/api/batches', {
        name: newBatchName,
        manager_id: manager.manager_id
      });
      setNewBatchName('');
      setShowBatchModal(false);
      fetchBatches();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const res = await axios.post(`http://localhost:5000/api/${endpoint}`, { username, password });
      setManager(res.data);
      setUsername('');
      setPassword('');
      localStorage.setItem('manager', JSON.stringify(res.data));
    } catch (error: any) {
      alert(error.response?.data?.detail || "Auth failed");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('manager');
    if (saved) setManager(JSON.parse(saved));
  }, []);

  useEffect(() => {
    fetchData();
  }, [manager, activeBatch]);

  useEffect(() => {
    if (manager) fetchBatches();
  }, [manager]);

  if (!manager) {
    return (
      <div className="auth-container">
        <div className="card auth-card">
          <div className="auth-header">
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{authMode === 'login' ? 'Login to manage your interns' : 'Register to start tracking performance'}</p>
          </div>

          <form onSubmit={handleAuth}>
            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Manager ID / Name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-group" style={{ marginBottom: '2.5rem' }}>
              <label>Security Key</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }} type="submit">
              {authMode === 'login' ? 'Sign In to Portal' : 'Register Manager'}
            </button>
          </form>

          <p className="auth-footer">
            {authMode === 'login' ? "Don't have an account?" : "Already registered?"}
            <span
              className="auth-toggle"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? "Create one now" : "Go to Login"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div>
          <h1>L&D Portal</h1>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Workspace Context</p>
              <button
                onClick={() => setShowBatchModal(true)}
                style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
              >
                + NEW BATCH
              </button>
            </div>
            <select
              value={activeBatch?.batch_id || ''}
              onChange={(e) => setActiveBatch(batches.find(b => b.batch_id === e.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white', fontWeight: '600' }}
            >
              <option value="">-- Choose Batch --</option>
              {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.name}</option>)}
            </select>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '0.25rem' }}>Active Manager</p>
            <p style={{ color: 'white', fontWeight: '600' }}>{manager.username}</p>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Home size={18} /> Overview
          </button>
          <button className={`nav-link ${activeTab === 'interns' ? 'active' : ''}`} onClick={() => setActiveTab('interns')} disabled={!activeBatch}>
            <Users size={18} /> Interns
          </button>
          <button className={`nav-link ${activeTab === 'scores' ? 'active' : ''}`} onClick={() => setActiveTab('scores')} disabled={!activeBatch}>
            <BarChart2 size={18} /> Performance Grid
          </button>
          <button className={`nav-link ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')} disabled={!activeBatch}>
            <MessageSquare size={18} /> Feedback Grid
          </button>
          <button className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')} disabled={!activeBatch}>
            <MessageSquare size={18} /> AI Assistant
          </button>
        </nav>

        <button
          className="btn"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
          onClick={() => { localStorage.removeItem('manager'); setManager(null); }}
        >
          Sign Out
        </button>
      </div>

      <main className="main-content">
        {!activeBatch ? (
          <div className="card" style={{ textAlign: 'center', marginTop: '10rem', background: 'rgba(99, 102, 241, 0.05)', borderStyle: 'dashed' }}>
            <BookOpen size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>No Active Workspace</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>Switch context by selecting an existing batch or create a new one to start managing performance.</p>
            <button className="btn" onClick={() => setShowBatchModal(true)}>Create First Batch</button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div>
                <div className="stat-grid">
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Users size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Interns</span>
                    </div>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)', lineHeight: '1' }}>{data.length}</p>
                  </div>
                  <FileUpload endpoint="upload-interns" label="Intern" onSuccess={fetchData} managerId={manager.manager_id} batchId={activeBatch.batch_id} />
                  <FileUpload endpoint="upload-feedback" label="Feedback" onSuccess={fetchData} managerId={manager.manager_id} batchId={activeBatch.batch_id} />
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0) 100%)' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Batch Scope: {activeBatch.name}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '600px' }}>
                    You are currently viewing data for the selected batch. Use the tabs to manage interns, scores, and access AI-driven performance insights.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'interns' && (
              <InternList data={data} onRefresh={fetchData} managerId={manager.manager_id} batchId={activeBatch.batch_id} />
            )}

            {activeTab === 'scores' && (
              <InternGrid data={data} onRefresh={fetchData} managerId={manager.manager_id} batchId={activeBatch.batch_id} />
            )}

            {activeTab === 'feedback' && (
              <FeedbackGrid managerId={manager.manager_id} batchId={activeBatch.batch_id} />
            )}

            {activeTab === 'chat' && (
              <ChatBot managerId={manager.manager_id} batchId={activeBatch.batch_id} />
            )}
          </>
        )}
      </main>

      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ background: 'var(--primary)', width: '64px', height: '64px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 30px rgba(99,102,241,0.4)' }}>
              <BookOpen size={32} color="white" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>New Batch</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>Define a new workspace to isolate intern performance records.</p>

            <form onSubmit={createBatch}>
              <div className="input-group">
                <label style={{ textAlign: 'left', display: 'block' }}>Batch Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Q1 Training 2024"
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                <button className="btn" type="submit" style={{ flex: 1, padding: '1rem' }}>Initialize Batch</button>
              </div>
            </form>
            <button onClick={() => setShowBatchModal(false)} style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
