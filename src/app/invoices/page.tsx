"use client";

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

// GraphQL query to fetch all invoices
const GET_INVOICES = gql`
  query GetInvoices {
    invoices {
      id
      invoiceId
      status
      totalAmount
      dueDate
      clientInfo {
        name
      }
      issueDate
    }
  }
`;

export default function InvoicesListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data } = useQuery(GET_INVOICES);

  const formatDate = (dateValue: any) => {
  if (!dateValue) return '—';

  // Ensure it is a number
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
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading invoices...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '5rem' }}>Error loading invoices: {error.message}</div>;
  }

  return (
    <div style={{ maxWidth: '1280px', margin: 'auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Invoices</h1>
        {/* We will add a 'new' page later if manual creation is needed */}
        {/* <Link href="/invoices/new" style={{ ...buttonStyle }}>+ Add New Invoice</Link> */}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={tableHeaderStyle}>Invoice ID</th>
              <th style={tableHeaderStyle}>Client Name</th>
              <th style={tableHeaderStyle}>Issue Date</th>
              <th style={tableHeaderStyle}>Installation Date</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={{...tableHeaderStyle, textAlign: 'right' }}>Amount</th>
              <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.invoices.length > 0 ? (
              data.invoices.map((inv: any, index: number) => (
                <tr key={inv.id} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={tableCellStyle}>{inv.invoiceId}</td>
                  <td style={tableCellStyle}>{inv.clientInfo.name}</td>
                  <td style={tableCellStyle}>{formatDate(inv.issueDate)}</td>
                  <td style={tableCellStyle}>{formatDate(inv.installationDate)}</td>
                  <td style={tableCellStyle}><StatusBadge status={inv.status} /></td>
                  <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '500' }}>
                    {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(inv.totalAmount)}
                  </td>
                  <td style={{...tableCellStyle, textAlign: 'center'}}>
                    <Link href={`/invoices/${inv.id}`} style={{...actionButtonStyle}}>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Helper Components & Styles ---

const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles: any = {
        Draft: { background: '#f3f4f6', color: '#4b5563' },
        Sent: { background: '#dbeafe', color: '#1d4ed8' },
        Paid: { background: '#d1fae5', color: '#065f46' },
        Overdue: { background: '#fee2e2', color: '#991b1b' },
        Cancelled: { background: '#e5e7eb', color: '#4b5563' }
    };
    const style = statusStyles[status] || statusStyles['Draft'];

    return (
        <span style={{
            ...style,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'capitalize'
        }}>
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
    backgroundColor: '#fff',
    color: '#374151',
    fontWeight: '500',
    padding: '0.4rem 0.8rem',
    borderRadius: '0.375rem',
    border: '1px solid #d1d5db',
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
