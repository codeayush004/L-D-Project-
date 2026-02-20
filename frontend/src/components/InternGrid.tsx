import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Download } from 'lucide-react';
import InternDetail from './InternDetail';

interface Intern {
    EmpID: string;
    Name: string;
    Email: string;
    [key: string]: any;
}

interface Props {
    data: Intern[];
    onRefresh: () => void;
    managerId: string;
    batchId: string;
}

const InternGrid: React.FC<Props> = ({ data, onRefresh, managerId, batchId }) => {
    const [newSubject, setNewSubject] = useState('');
    const [totalMarks, setTotalMarks] = useState<number>(100);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [selectedInternId, setSelectedInternId] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<{ name: string, total_marks: number }[]>([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/subjects?manager_id=${managerId}&batch_id=${batchId}`);
                setSubjects(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchSubjects();
    }, [data, managerId, batchId]);

    const handleUpdateScore = async (empId: string, subjectName: string, score: number, sTotal?: number) => {
        try {
            await axios.post('http://localhost:5000/api/update-score', {
                EmpID: empId,
                subject: subjectName,
                score,
                total_marks: sTotal,
                manager_id: managerId,
                batch_id: batchId
            });
            onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleExport = () => {
        window.open(`http://localhost:5000/api/export-scores?manager_id=${managerId}&batch_id=${batchId}`);
    };

    const handleCreateSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubject.trim()) return;
        if (data.length > 0) {
            // Register subject via first intern with 0 score
            await handleUpdateScore(data[0].EmpID, newSubject.trim(), 0, totalMarks);
            setNewSubject('');
            setIsAddingSubject(false);
            onRefresh();
        } else {
            alert("Please upload interns first!");
        }
    };

    const handleDeleteSubject = async (subjectName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This will permanently remove all scores for this subject.`)) return;
        try {
            await axios.delete('http://localhost:5000/api/subjects', {
                data: { subject: subjectName, manager_id: managerId, batch_id: batchId }
            });
            onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditSubject = async (subject: any) => {
        const newName = window.prompt("Enter new subject name:", subject.name);
        if (newName === null) return;
        const newTotal = window.prompt("Enter total marks:", subject.total_marks.toString());
        if (newTotal === null) return;

        try {
            await axios.put('http://localhost:5000/api/subjects', {
                old_name: subject.name,
                new_name: newName || subject.name,
                total_marks: parseInt(newTotal) || subject.total_marks,
                manager_id: managerId,
                batch_id: batchId
            });
            onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const showInternDetail = (empId: string) => {
        setSelectedInternId(empId);
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Performance Matrix</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track and manage objective performance across all subjects.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn" onClick={handleExport} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                        <Download size={18} /> Export Excel
                    </button>

                    {!isAddingSubject ? (
                        <button className="btn" onClick={() => setIsAddingSubject(true)}>
                            <Plus size={18} /> New Subject
                        </button>
                    ) : (
                        <form onSubmit={handleCreateSubject} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                            <input
                                className="subject-input"
                                placeholder="Subject Name"
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                                style={{ minWidth: '150px' }}
                            />
                            <input
                                className="subject-input"
                                type="number"
                                placeholder="Total"
                                title="Total Marks"
                                value={totalMarks === 0 ? '' : totalMarks}
                                onChange={e => setTotalMarks(parseInt(e.target.value) || 0)}
                                style={{ width: '80px' }}
                            />
                            <button type="submit" className="btn" style={{ padding: '0.5rem 1rem' }}>Add</button>
                            <button type="button" onClick={() => setIsAddingSubject(false)} className="btn" style={{ background: 'transparent', padding: '0.5rem' }}>Cancel</button>
                        </form>
                    )}
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Intern Name</th>
                            <th>Emp ID</th>
                            {subjects.map(s => (
                                <th key={s.name}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-main)' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Total: {s.total_marks}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                onClick={() => handleEditSubject(s)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', borderRadius: '0.25rem' }}
                                                title="Edit Subject"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSubject(s.name)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', borderRadius: '0.25rem' }}
                                                title="Delete Subject"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(intern => (
                            <tr key={intern.EmpID} onClick={() => showInternDetail(intern.EmpID)} style={{ cursor: 'pointer' }}>
                                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{intern.Name}</td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{intern.EmpID}</td>
                                {subjects.map(s => {
                                    const score = (intern as any)[s.name] || 0;
                                    return (
                                        <td key={s.name} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    defaultValue={score}
                                                    onBlur={e => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val)) {
                                                            handleUpdateScore(intern.EmpID, s.name, val, s.total_marks);
                                                        }
                                                    }}
                                                    onFocus={e => e.target.select()}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {s.total_marks}</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No intern data available. Upload an Excel sheet to populate the matrix.
                    </div>
                )}
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

export default InternGrid;
