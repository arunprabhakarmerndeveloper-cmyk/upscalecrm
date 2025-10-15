"use client";

import { useQuery, gql } from '@apollo/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- TypeScript Interfaces ---

// Describes the structure for address objects
interface Address {
  street: string | null;
  city: string | null;
  pincode: string | null;
}

// Describes the main client object
interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string;
  billingAddress: Address | null;
  installationAddress: Address | null;
  createdAt: string | number;
}

// Describes the shape of the data returned by the GraphQL query
interface ClientDetailsData {
  client: Client;
}

// --- GraphQL Query ---

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
    
    // Apply the ClientDetailsData interface for a fully typed `data` object
    const { loading, error, data } = useQuery<ClientDetailsData>(GET_CLIENT_DETAILS, { 
        variables: { id }, 
        skip: !id 
    });

    if (loading) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Loading client...</div>;
    if (error) return <div style={{color: 'red', textAlign: 'center'}}>Error: {error.message}</div>;
    if (!data?.client) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Client not found.</div>;

    const { client } = data;

    return (
        <div style={{ maxWidth: '800px', margin: 'auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{client.name}</h1>
                    <p style={{ color: '#6b7280' }}>
                        Client since {new Date(Number(client.createdAt)).toLocaleDateString('en-GB')}
                    </p>
                </div>
                <Link href={`/clients/edit/${client.id}`} style={buttonStyle}>Edit Client</Link>
            </div>
            
            <div style={sectionStyle}>
                <h2 style={sectionHeaderStyle}>Contact Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <DetailItem label="Contact Person" value={client.contactPerson} />
                    <DetailItem label="Phone" value={client.phone} />
                    <DetailItem label="Email" value={client.email} />
                </div>
            </div>

            {/* You can add more sections here for addresses, etc. */}
        </div>
    );
}

// --- Typed Helper Component ---

interface DetailItemProps {
    label: string;
    value: string | number | null | undefined;
}

const DetailItem = ({ label, value }: DetailItemProps) => 
    value ? (
        <div style={{marginBottom: '1rem'}}>
            <p style={{fontSize: '0.875rem', color: '#6b7280'}}>{label}</p>
            <p style={{fontWeight: '500'}}>{value}</p>
        </div>
    ) : null;

// --- Styles ---
const sectionStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' };
const sectionHeaderStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none' };