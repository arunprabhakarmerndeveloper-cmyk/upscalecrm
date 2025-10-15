"use client";

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

// --- TypeScript Interfaces ---

// Describes a single quotation object in the list
interface QuotationListItem {
  id: string;
  quotationId: string;
  status: string;
  totalAmount: number;
  clientInfo: {
    name: string;
  };
  createdAt: string | number;
}

// Describes the shape of the entire data object returned by the query
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
      }
      createdAt
    }
  }
`;

export default function QuotationsListPage() {
  const { loading: authLoading } = useAuth();
  // Apply the GetQuotationsData interface for a fully typed `data` object
  const { loading: dataLoading, error, data } = useQuery<GetQuotationsData>(GET_QUOTATIONS);

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
    <div style={{ maxWidth: '1280px', margin: 'auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Quotations</h1>
        <Link href="/quotations/new" style={{ ...buttonStyle }}>
          + Add New Quotation
        </Link>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={tableHeaderStyle}>Quotation ID</th>
              <th style={tableHeaderStyle}>Client Name</th>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={{...tableHeaderStyle, textAlign: 'right' }}>Amount</th>
              <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.quotations && data.quotations.length > 0 ? (
              // 'q' is now automatically typed as QuotationListItem
              data.quotations.map((q) => (
                <tr key={q.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={tableCellStyle}>{q.quotationId}</td>
                  <td style={tableCellStyle}>{q.clientInfo.name}</td>
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
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No quotations found.</td>
              </tr>
            )}
          </tbody>
        </table>
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
    padding: '0.75rem 1.5rem',
    color: '#6b7280',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const tableCellStyle: React.CSSProperties = {
    padding: '1rem 1.5rem',
    color: '#374151',
    verticalAlign: 'middle'
};