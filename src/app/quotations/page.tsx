"use client";

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useState, useMemo, ChangeEvent } from 'react';

// --- TypeScript Interfaces ---

interface QuotationListItem {
  id: string;
  quotationId: string;
  status: string;
  totalAmount: number;
  clientInfo: {
    name: string;
    phone: string; // Added phone
    email: string | null; // Added email
  };
  createdAt: string | number;
}

interface GetQuotationsData {
  quotations: QuotationListItem[];
}

// --- GraphQL Query ---
const GET_QUOTATIONS = gql`
  query GetQuotations {
    quotations {
      id
      quotationId
      status
      totalAmount
      clientInfo {
        name
        phone # Added phone
        email # Added email
      }
      createdAt
    }
  }
`;

export default function QuotationsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data } = useQuery<GetQuotationsData>(GET_QUOTATIONS);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotations = useMemo(() => {
    if (!data?.quotations) return [];
    if (!searchTerm) return data.quotations;

    const lowercasedTerm = searchTerm.toLowerCase();
    return data.quotations.filter(q => 
      q.quotationId.toLowerCase().includes(lowercasedTerm) ||
      q.clientInfo.name.toLowerCase().includes(lowercasedTerm) ||
      q.status.toLowerCase().includes(lowercasedTerm) ||
      q.clientInfo.phone.includes(lowercasedTerm) || // Added phone to search
      (q.clientInfo.email && q.clientInfo.email.toLowerCase().includes(lowercasedTerm)) // Added email to search
    );
  }, [data, searchTerm]);


  const formatDate = (dateValue: string | number | null | undefined) => {
    if (!dateValue) return '—';
    const timestamp = typeof dateValue === 'number' ? dateValue : Number(dateValue);
    const date = new Date(timestamp);
    return isNaN(date.getTime())
      ? 'Invalid date'
      : date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  };

  if (authLoading || dataLoading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading quotations...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '5rem' }}>Error loading quotations: {error.message}</div>;
  }

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(80vh)', // Adjust this value based on your main header/footer height
        maxWidth: '1400px',
        margin: 'auto',
    }}>
      {/* --- Non-scrolling Header Section --- */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Quotations</h1>
          <Link href="/quotations/new" style={buttonStyle}>
            + Add New Quotation
          </Link>
        </div>
        <div style={{ margin: '1rem 0', maxWidth: '400px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input 
                type="text"
                placeholder="Search by ID, client, phone, email..."
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

      {/* --- Scrollable Table Container --- */}
      <div style={{ flexGrow: 1, overflow: 'hidden', backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={tableHeaderStyle}>Quotation ID</th>
                  <th style={tableHeaderStyle}>Client</th>
                  <th style={tableHeaderStyle}>Phone</th>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={{...tableHeaderStyle, textAlign: 'right' }}>Amount</th>
                  <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.length > 0 ? (
                  filteredQuotations.map((q) => (
                    <tr key={q.id} style={tableRowStyle}>
                      <td style={tableCellStyle}>{q.quotationId}</td>
                      <td style={tableCellStyle}>
                        <div>
                            <p style={{ fontWeight: '600' }}>{q.clientInfo.name}</p>
                            {q.clientInfo.email && <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{q.clientInfo.email}</p>}
                        </div>
                      </td>
                      <td style={tableCellStyle}>{q.clientInfo.phone}</td>
                      <td style={tableCellStyle}>{formatDate(q.createdAt)}</td>
                      <td style={tableCellStyle}><StatusBadge status={q.status} /></td>
                      <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '500' }}>
                        {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(q.totalAmount)}
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>
                        <Link href={`/quotations/${q.id}`} style={{...actionButtonStyle}}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No quotations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

// --- Typed Helper Components & Styles ---

const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles: Record<string, React.CSSProperties> = {
        Draft: { background: '#f3f4f6', color: '#4b5563' },
        Sent: { background: '#dbeafe', color: '#1d4ed8' },
        Approved: { background: '#d1fae5', color: '#065f46' },
        Rejected: { background: '#fee2e2', color: '#991b1b' },
    };
    const style = statusStyles[status] || statusStyles['Draft'];
    return (
        <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>
            {status}
        </span>
    );
};

const buttonStyle: React.CSSProperties = {
    backgroundColor: '#2563eb',
    color: '#fff',
    fontWeight: '600',
    padding: '0.6rem 1.2rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none'
};

const actionButtonStyle: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    color: '#374151',
    fontWeight: '500',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.375rem',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '0.875rem'
};

const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '1rem 1.5rem',
    color: '#6b7280',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb'
};

const tableCellStyle: React.CSSProperties = {
    padding: '1rem 1.5rem',
    color: '#374151',
    verticalAlign: 'top' // Changed to 'top' to align with the multi-line client info
};

const tableRowStyle: React.CSSProperties = { borderTop: '1px solid #f3f4f6' };

