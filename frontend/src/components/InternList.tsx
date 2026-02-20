import React, { useState } from 'react';
import axios from 'axios';
import { Plus, User, Mail, Hash } from 'lucide-react';
import InternDetail from './InternDetail';

interface Intern {
    EmpID: string;
    Name: string;
    Email: string;
}

interface Props {
    data: Intern[];
    onRefresh: () => void;
    managerId: string;
    batchId: string;
}

const InternList: React.FC<Props> = ({ data, onRefresh, managerId, batchId }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedInternId, setSelectedInternId] = useState<string | null>(null);
    const [newIntern, setNewIntern] = useState({ Name: '', Email: '', EmpID: '' });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/interns', {
                ...newIntern,
                manager_id: managerId,
                batch_id: batchId
            });
            setNewIntern({ Name: '', Email: '', EmpID: '' });
            setShowAddModal(false);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to add intern");
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Intern Directory</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>View and manage active interns in this batch.</p>
                </div>
                <button className="btn" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} /> Add Intern Manually
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Emp ID</th>
                            <th>Email Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(intern => (
                            <tr key={intern.EmpID}>
                                <td
                                    style={{ fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}
                                    onClick={() => setSelectedInternId(intern.EmpID)}
                                >
                                    {intern.Name}
                                </td>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{intern.EmpID}</td>
                                <td style={{ color: 'var(--primary)' }}>{intern.Email}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No interns found in this batch yet.
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Register New Intern</h2>
                        <form onSubmit={handleAdd}>
                            <div className="input-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={14} /> Full Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    value={newIntern.Name}
                                    onChange={e => setNewIntern({ ...newIntern, Name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={14} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={newIntern.Email}
                                    onChange={e => setNewIntern({ ...newIntern, Email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Hash size={14} /> Employee ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. INT001"
                                    value={newIntern.EmpID}
                                    onChange={e => setNewIntern({ ...newIntern, EmpID: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn" type="submit" style={{ flex: 1 }}>Register</button>
                                <button className="btn" type="button" style={{ flex: 1, background: 'transparent' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

export default InternList;
