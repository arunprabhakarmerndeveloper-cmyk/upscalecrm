"use client";

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import React from 'react'; // Import React for CSSProperties

// --- TypeScript Interfaces ---

// Describes a single product instance within an AMC
interface ProductInstance {
  // --- ✅ FIX: Product can now be null if it was deleted ---
  product: {
    name: string;
  } | null;
}

// Describes the structure of a single AMC object in the list
interface AmcListItem {
  id: string;
  amcId: string;
  status: string;
  clientInfo: {
    name: string;
  };
  productInstances: ProductInstance[];
  startDate: string | number;
  endDate: string | number;
}

// Describes the shape of the entire data object returned by the query
interface GetAmcsData {
  amcs: AmcListItem[];
}

// --- GraphQL Query ---

const GET_AMCS = gql`
  query GetAMCs {
    amcs {
      id
      amcId
      status
      clientInfo { name }
      productInstances {
        product {
          name
        }
      }
      startDate
      endDate
    }
  }
`;

export default function AMCsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data } = useQuery<GetAmcsData>(GET_AMCS);

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
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading AMCs...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: 'auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Annual Maintenance Contracts (AMCs)</h1>
        <Link href="/amcs/new" style={buttonStyle}>
          + New AMC
        </Link>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={tableHeaderStyle}>AMC ID</th>
                <th style={tableHeaderStyle}>Client</th>
                <th style={tableHeaderStyle}>Products</th>
                <th style={tableHeaderStyle}>Start Date</th>
                <th style={tableHeaderStyle}>End Date</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.amcs && data.amcs.length > 0 ? (
                data.amcs.map((amc, index) => (
                  <tr key={amc.id} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}>
                    <td style={tableCellStyle}>{amc.amcId}</td>
                    <td style={tableCellStyle}>{amc.clientInfo.name}</td>
                    <td style={tableCellStyle}>
                      {/* --- ✅ FIX: Safely map over product names --- */}
                      {/* This now handles cases where a product is null without crashing. */}
                      {amc.productInstances
                        .map((p) => p.product?.name) // Use optional chaining
                        .filter(Boolean) // Remove any null/undefined entries
                        .join(', ')}
                    </td>
                    <td style={tableCellStyle}>{formatDate(amc.startDate)}</td>
                    <td style={tableCellStyle}>{formatDate(amc.endDate)}</td>
                    <td style={tableCellStyle}><StatusBadge status={amc.status} /></td>
                    <td style={{...tableCellStyle, textAlign: 'center'}}>
                      <Link href={`/amcs/${amc.id}`} style={actionButtonStyle}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No AMCs found.</td>
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
        Active: { background: '#d1fae5', color: '#065f46' }, 
        Expired: { background: '#fee2e2', color: '#991b1b' }, 
        Cancelled: { background: '#e5e7eb', color: '#4b5563' }
    };
    const style = statusStyles[status] || { background: '#f3f4f6', color: '#4b5563' };
    return <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{status}</span>;
};

const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', textDecoration: 'none' };
const actionButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', color: '#374151', verticalAlign: 'middle', whiteSpace: 'nowrap' };

