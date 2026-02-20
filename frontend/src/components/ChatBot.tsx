import React, { useState } from 'react';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';

interface Props {
    managerId: string;
    batchId: string;
}

const ChatBot: React.FC<Props> = ({ managerId, batchId }) => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!query) return;
        const userMsg = query;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery('');
        setLoading(true);

        try {
            const res = await axios.post('http://localhost:5000/api/chat', {
                query: userMsg,
                manager_id: managerId,
                batch_id: batchId
            });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting to the brain." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}>
                    <Bot size={20} color="white" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>AI Performance Brain</h2>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Connected to MongoDB</p>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                        <Bot size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '0.9rem' }}>Ask me anything about your interns' performance.<br />I have access to all scores and feedback logs.</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`chat-bubble ${m.role}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                            {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.role === 'user' ? 'Manager' : 'Assistant'}</span>
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: '400' }}>{m.text}</div>
                    </div>
                ))}
                {loading && (
                    <div className="chat-bubble ai pulse" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="loading-dots">Analysing performance data...</div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a query (e.g., 'Who is the top performer in React?')"
                    style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                />
                <button className="btn" onClick={handleSend} disabled={loading} style={{ borderRadius: '0.75rem', padding: '0.5rem 1rem' }}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default ChatBot;
