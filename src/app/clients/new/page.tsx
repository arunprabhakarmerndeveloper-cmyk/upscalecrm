"use client";

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CREATE_CLIENT = gql`
  mutation CreateClient($input: ClientInput!) {
    createClient(input: $input) {
      id
    }
  }
`;

export default function NewClientPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
    });

    const [createClient, { loading, error }] = useMutation(CREATE_CLIENT, {
        onCompleted: () => router.push('/clients'),
        refetchQueries: ['GetClients', 'GetDashboardData']
    });

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createClient({ variables: { input: formData } });
    };

    return (
        <div style={{ maxWidth: '700px', margin: 'auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '2rem' }}>Add New Client</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#fff', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <InputField label="Client / Company Name" name="name" value={formData.name} onChange={handleChange} required />
                <InputField label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
                {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Link href="/clients" style={{...buttonStyle, backgroundColor: '#f3f4f6', color: '#374151'}}>Cancel</Link>
                    <button type="submit" disabled={loading} style={{...buttonStyle, opacity: loading ? 0.6 : 1 }}>{loading ? 'Saving...' : 'Save Client'}</button>
                </div>
            </form>
        </div>
    );
}

// --- Helper Components & Styles ---
const InputField = ({ label, ...props }: any) => (<div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{label}</label><input style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} {...props} /></div>);
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1.2rem', fontWeight: '600', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer' };
