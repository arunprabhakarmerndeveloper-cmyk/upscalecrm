"use client";

import { useQuery, gql } from '@apollo/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const GET_CLIENT_DETAILS = gql`
  query GetClientDetails($id: ID!) {
    client(id: $id) {
      id
      name
      contactPerson
      phone
      email
      billingAddress { street city pincode }
      installationAddress { street city pincode }
      createdAt
    }
  }
`;

export default function ClientDetailPage() {
    const params = useParams();
    const id = params.clientId as string;
    const { loading, error, data } = useQuery(GET_CLIENT_DETAILS, { variables: { id }, skip: !id });

    if (loading) return <div style={{textAlign: 'center'}}>Loading client...</div>;
    if (error) return <div style={{color: 'red'}}>Error: {error.message}</div>;
    if (!data?.client) return <div style={{textAlign: 'center'}}>Client not found.</div>;

    const { client } = data;

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{client.name}</h1>
                    <p style={{ color: '#6b7280' }}>Client since {new Date(client.createdAt).toLocaleDateString()}</p>
                </div>
                <Link href={`/clients/edit/${client.id}`} style={buttonStyle}>Edit Client</Link>
            </div>
            
            <div style={sectionStyle}>
                <h2 style={sectionHeaderStyle}>Contact Information</h2>
                <DetailItem label="Contact Person" value={client.contactPerson} />
                <DetailItem label="Phone" value={client.phone} />
                <DetailItem label="Email" value={client.email} />
            </div>

            {/* Placeholder for related Quotations, Invoices, AMCs */}
        </div>
    );
}

const DetailItem = ({ label, value }: any) => value ? (<div style={{marginBottom: '1rem'}}><p style={{fontSize: '0.875rem', color: '#6b7280'}}>{label}</p><p style={{fontWeight: '500'}}>{value}</p></div>) : null;
const sectionStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const sectionHeaderStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none' };
