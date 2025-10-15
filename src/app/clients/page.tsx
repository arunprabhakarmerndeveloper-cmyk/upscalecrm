"use client";

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

const GET_CLIENTS = gql`
  query GetClients {
    clients {
      id
      name
      phone
      email
    }
  }
`;

export default function ClientsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data } = useQuery(GET_CLIENTS);

  if (authLoading || dataLoading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading clients...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;
  }

  return (
    <div style={{ maxWidth: '1024px', margin: 'auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Clients</h1>
        <Link href="/clients/new" style={buttonStyle}>
          + Add New Client
        </Link>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Phone</th>
              <th style={tableHeaderStyle}>Email</th>
              <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.clients.map((client: any, index: number) => (
              <tr key={client.id} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}>
                <td style={tableCellStyle}>{client.name}</td>
                <td style={tableCellStyle}>{client.phone}</td>
                <td style={tableCellStyle}>{client.email}</td>
                <td style={{...tableCellStyle, textAlign: 'center'}}>
                  <Link href={`/clients/${client.id}`} style={actionButtonStyle}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Helper Components & Styles ---
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', textDecoration: 'none' };
const actionButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', color: '#374151', verticalAlign: 'middle' };
