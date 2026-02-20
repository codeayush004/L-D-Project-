import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import InternDetail from './InternDetail';

interface Intern {
    EmpID: string;
    Name: string;
    Email: string;
    feedbacks: { [key: string]: string };
}

interface Props {
    managerId: string;
    batchId: string;
}

const FeedbackGrid: React.FC<Props> = ({ managerId, batchId }) => {
    const [interns, setInterns] = useState<Intern[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [newColumn, setNewColumn] = useState('');
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [selectedInternId, setSelectedInternId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [gridRes, colsRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/feedback-grid?manager_id=${managerId}&batch_id=${batchId}`),
                axios.get(`http://localhost:5000/api/feedback-columns?manager_id=${managerId}&batch_id=${batchId}`)
            ]);
            setInterns(gridRes.data);
            setColumns(colsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [managerId, batchId]);

    const handleUpdateFeedback = async (empId: string, column: string, text: string) => {
        try {
            await axios.post('http://localhost:5000/api/update-feedback-cell', {
                EmpID: empId,
                column,
                text,
                manager_id: managerId,
                batch_id: batchId
            });
            // We don't refresh the whole grid to keep focus, but we can update local state
            setInterns(prev => prev.map(i => {
                if (i.EmpID === empId) {
                    return { ...i, feedbacks: { ...i.feedbacks, [column]: text } };
                }
                return i;
            }));
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newColumn.trim()) return;
        try {
            await axios.post('http://localhost:5000/api/feedback-columns', {
                name: newColumn.trim(),
                manager_id: managerId,
                batch_id: batchId
            });
            setNewColumn('');
            setIsAddingColumn(false);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteColumn = async (name: string) => {
        if (!window.confirm(`Delete the column "${name}"? All feedback in this column will be lost.`)) return;
        try {
            await axios.delete('http://localhost:5000/api/feedback-columns', {
                data: { name, manager_id: managerId, batch_id: batchId }
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const showInternDetail = (empId: string) => {
        setSelectedInternId(empId);
    };

    if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading Feedback Grid...</div>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={24} className="text-secondary" /> Feedback Matrix
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Qualitative assessments and reviews per intern.</p>
                </div>

                {!isAddingColumn ? (
                    <button className="btn" onClick={() => setIsAddingColumn(true)}>
                        <Plus size={18} /> New Review Slot
                    </button>
                ) : (
                    <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                        <input
                            className="subject-input"
                            placeholder="Review Cycle Name (e.g. Week 1)"
                            value={newColumn}
                            onChange={e => setNewColumn(e.target.value)}
                            style={{ minWidth: '200px' }}
                        />
                        <button type="submit" className="btn" style={{ padding: '0.5rem 1rem' }}>Add</button>
                        <button type="button" onClick={() => setIsAddingColumn(false)} className="btn" style={{ background: 'transparent', padding: '0.5rem' }}>Cancel</button>
                    </form>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Intern Name</th>
                            <th>Emp ID</th>
                            {columns.map(col => (
                                <th key={col} style={{ minWidth: '300px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{col}</span>
                                        <button
                                            onClick={() => handleDeleteColumn(col)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {interns.map(intern => (
                            <tr key={intern.EmpID}>
                                <td
                                    style={{ fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}
                                    onClick={() => showInternDetail(intern.EmpID)}
                                >
                                    {intern.Name}
                                </td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{intern.EmpID}</td>
                                {columns.map(col => (
                                    <td key={col} style={{ padding: '0.5rem' }}>
                                        <textarea
                                            defaultValue={intern.feedbacks[col] || ''}
                                            onBlur={(e) => handleUpdateFeedback(intern.EmpID, col, e.target.value)}
                                            placeholder="Write feedback..."
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                padding: '0.5rem',
                                                color: '#fff',
                                                fontSize: '0.875rem',
                                                resize: 'vertical',
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedInternId && (
                <InternDetail
                    empId={selectedInternId}
                    managerId={managerId}
                    batchId={batchId}
                    onClose={() => setSelectedInternId(null)}
                />
            )}
        </div>
    );
};

export default FeedbackGrid;
