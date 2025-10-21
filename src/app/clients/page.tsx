"use client";

import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useState, useMemo, ChangeEvent, CSSProperties } from 'react';
import { GET_CLIENTS } from "@/graphql/queries";

// --- TypeScript Interfaces ---

interface ClientListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface GetClientsData {
  clients: ClientListItem[];
}

export default function ClientsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data } = useQuery<GetClientsData>(GET_CLIENTS);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    if (!data?.clients) return [];
    if (!searchTerm) return data.clients;

    const lowercasedTerm = searchTerm.toLowerCase();
    return data.clients.filter(client => 
      client.name.toLowerCase().includes(lowercasedTerm) ||
      client.phone.toLowerCase().includes(lowercasedTerm) ||
      client.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [data, searchTerm]);

  if (authLoading || dataLoading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading clients...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;
  }

  return (
    // --- THIS IS THE FIX: Main full-height container ---
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(80vh)', // Adjust this value based on your main header/footer height
        maxWidth: '1400px',
        margin: 'auto',
    }}>
      {/* --- Non-scrolling Header Section --- */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Clients</h1>
          <Link href="/clients/new" style={buttonStyle}>
            + Add New Client
          </Link>
        </div>
        <div style={{ margin: '1rem 0', maxWidth: '400px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#9ca3af' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input 
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem',
                  outline: 'none',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
              }}
          />
        </div>
      </div>

      {/* --- THIS IS THE FIX: Scrollable Table Container --- */}
      <div style={{ flex: '1 1 0', overflow: 'hidden', backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* --- THIS IS THE FIX: Sticky Table Header --- */}
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2563eb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>Phone</th>
                    <th style={tableHeaderStyle}>Email</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                          <tr key={client.id} style={tableRowStyle}>
                              <td style={tableCellStyle}>{client.name}</td>
                              <td style={tableCellStyle}>{client.phone}</td>
                              <td style={tableCellStyle}>{client.email}</td>
                              <td style={{...tableCellStyle, textAlign: 'center'}}>
                                  <Link href={`/clients/${client.id}`} style={actionButtonStyle}>
                                  View
                                  </Link>
                              </td>
                          </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                              No clients found matching your search.
                          </td>
                      </tr>
                  )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components & Styles ---
const buttonStyle: CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', textDecoration: 'none' };
const actionButtonStyle: CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '1rem' };
const tableHeaderStyle: CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#ffffff', fontSize: '1 rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' };
const tableCellStyle: CSSProperties = { padding: '1rem 1.5rem', color: '#374151', verticalAlign: 'middle' };
const tableRowStyle: CSSProperties = { borderTop: '1px solid #f3f4f6' };

