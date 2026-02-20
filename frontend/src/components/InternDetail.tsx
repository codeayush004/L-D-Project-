import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import {
    X,
    Mail,
    Hash,
    TrendingUp,
    Calendar,
    MessageSquare,
    Award
} from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';

interface InternDetailProps {
    empId: string;
    managerId: string;
    batchId: string;
    onClose: () => void;
}

const InternDetail: React.FC<InternDetailProps> = ({ empId, managerId, batchId, onClose }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/reports/${empId}?manager_id=${managerId}&batch_id=${batchId}`);
                setData(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [empId, managerId, batchId]);

    if (loading) return (
        <div className="modal-overlay">
            <div className="card glass" style={{ padding: '4rem', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Generating intern profile...</p>
            </div>
        </div>
    );

    if (!data) return null;

    const { intern, scores, feedbacks, subjects } = data;

    // Transform scores for charts
    const chartData = subjects.map((s: any) => {
        const sName = typeof s === 'string' ? s : s.name;
        const sTotal = typeof s === 'string' ? 100 : s.total_marks;
        const sScore = scores[sName] || 0;
        const percentage = (sScore / sTotal) * 100;

        return {
            subject: sName,
            score: sScore,
            total: sTotal,
            fullMark: sTotal,
            percentage: Math.round(percentage)
        };
    });

    const averagePerformance = chartData.length > 0
        ? Math.round(chartData.reduce((acc: number, curr: any) => acc + curr.percentage, 0) / chartData.length)
        : 0;

    return createPortal(
        <div id="dashboard-portal-root" className="modal-overlay" style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto',
            zIndex: 9999,
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 7, 18, 0.9)',
            backdropFilter: 'blur(8px)'
        }}>
            <div className="modal-content" style={{
                maxWidth: '1200px',
                width: '90vw',
                height: '85vh',
                padding: 0,
                overflow: 'hidden',
                background: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 40px 80px -15px rgba(0,0,0,0.8)',
                borderRadius: '1.5rem',
                border: '1px solid var(--border)'
            }}>
                {/* Header Section - Even More Compact */}
                <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', padding: '1.25rem 2rem', position: 'relative' }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '0.75rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '1rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: '800', color: 'white', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                            {intern.Name.charAt(0)}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'white', marginBottom: '0.1rem', letterSpacing: '-0.02em' }}>{intern.Name}</h1>
                            <div style={{ display: 'flex', gap: '1.25rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Hash size={14} /> {intern.EmpID}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={14} /> {intern.Email}</span>
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.15rem', fontWeight: '700' }}>Overall Performance</div>
                            <div style={{ fontSize: '2.8rem', fontWeight: '950', color: 'white', lineHeight: '1' }}>{averagePerformance}%</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem', maxWidth: '180px' }}>
                                (Average across all subjects)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area - Scrollable */}
                <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '2rem', flex: 1, overflowY: 'auto', background: 'rgba(15, 23, 42, 0.5)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', margin: 0, padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '700' }}>
                                <TrendingUp size={20} className="text-primary" /> Skill Proficiency Radar
                            </h3>
                            <div style={{ width: '100%', height: '320px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Score"
                                            dataKey="percentage"
                                            stroke="var(--primary)"
                                            fill="var(--primary)"
                                            fillOpacity={0.6}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', margin: 0, padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '700' }}>
                                <Award size={20} className="text-secondary" /> Performance Trends
                            </h3>
                            <div style={{ width: '100%', height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="percentage" fill="var(--secondary)" radius={[4, 4, 0, 0]} barSize={35} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', flex: 1, margin: 0, padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '700' }}>
                                <MessageSquare size={20} className="text-secondary" /> Feedback History
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {feedbacks.length > 0 ? feedbacks.map((f: any, i: number) => (
                                    <div key={i} style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                                        {i < feedbacks.length - 1 && (
                                            <div style={{ position: 'absolute', left: '6px', top: '1.5rem', bottom: '-1.25rem', width: '2px', background: 'var(--border)' }}></div>
                                        )}
                                        <div style={{ position: 'absolute', left: 0, top: '0.3rem', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--secondary)', border: '4px solid #0f172a' }}></div>

                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={12} /> {new Date(f.date).toLocaleDateString()}
                                            <span style={{ color: 'var(--secondary)', fontWeight: '700' }}>• {f.column || 'General'}</span>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: '1.5', color: '#cbd5e1' }}>
                                            {f.text}
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                        <MessageSquare size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <p style={{ fontSize: '0.9rem' }}>No feedback recorded yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button className="btn" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
                        Return to Portal
                    </button>
                    <button className="btn" onClick={() => window.print()} style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
                        Export PDF
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InternDetail;
