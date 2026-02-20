import React, { useState } from 'react';
import axios from 'axios';
import { Plus, User, Mail, Hash, Edit2, Trash2, X } from 'lucide-react';
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
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInternId, setSelectedInternId] = useState<string | null>(null);
    const [newIntern, setNewIntern] = useState({ Name: '', Email: '', EmpID: '' });
    const [editingIntern, setEditingIntern] = useState<Intern | null>(null);

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

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingIntern) return;
        try {
            await axios.put('http://localhost:5000/api/interns', {
                ...editingIntern,
                manager_id: managerId,
                batch_id: batchId
            });
            setShowEditModal(false);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to edit intern");
        }
    };

    const handleDelete = async (empId: string) => {
        if (!window.confirm("Are you sure? This will delete the intern and all their scores/feedback.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/interns?emp_id=${empId}&manager_id=${managerId}&batch_id=${batchId}`);
            onRefresh();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to delete intern");
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
                            <th style={{ textAlign: 'right' }}>Actions</th>
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
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => { setEditingIntern(intern); setShowEditModal(true); }}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(intern.EmpID)}
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Register New Intern</h2>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
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
                                <button className="btn" type="submit" style={{ flex: 1 }}>Register Intern</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingIntern && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Edit Intern Bio</h2>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="input-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={14} /> Full Name
                                </label>
                                <input
                                    type="text"
                                    value={editingIntern.Name}
                                    onChange={e => setEditingIntern({ ...editingIntern, Name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={14} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    value={editingIntern.Email}
                                    onChange={e => setEditingIntern({ ...editingIntern, Email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Hash size={14} /> Employee ID
                                </label>
                                <input
                                    type="text"
                                    value={editingIntern.EmpID}
                                    disabled
                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>ID cannot be changed as it links to performance records.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn" type="submit" style={{ flex: 1 }}>Update Details</button>
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
