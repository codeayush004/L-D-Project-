import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import axios from 'axios';

interface Props {
    endpoint: string;
    onSuccess: () => void;
    label: string;
    managerId: string;
    batchId: string;
}

const FileUpload: React.FC<Props> = ({ endpoint, onSuccess, label, managerId, batchId }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('manager_id', managerId);
        formData.append('batch_id', batchId);

        try {
            await axios.post(`http://localhost:5000/api/${endpoint}`, formData);
            alert(`${label} uploaded successfully!`);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Upload failed. Please check the file format.');
        }
    };

    return (
        <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} Action</p>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
            />
            <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', gap: '0.75rem' }}>
                <Upload size={18} />
                <span>Upload Excel</span>
            </button>
        </div>
    );
};

export default FileUpload;
