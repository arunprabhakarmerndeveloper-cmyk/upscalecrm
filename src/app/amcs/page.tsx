"use client";

import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useState, useMemo, ChangeEvent } from 'react';
import React from 'react';

// --- TypeScript Interfaces ---
interface ProductInstance {
  product: { name: string } | null;
}

interface AmcListItem {
  id: string;
  amcId: string;
  status: string;
  clientInfo: { name: string; phone?: string; email?: string | null };
  productInstances: ProductInstance[];
  startDate: string | number;
  endDate: string | number;
}

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
      clientInfo { name phone email }
      productInstances { product { name } }
      startDate
      endDate
    }
  }
`;

export default function AMCsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data } = useQuery<GetAmcsData>(GET_AMCS);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAmcs = useMemo(() => {
    if (!data?.amcs) return [];
    if (!searchTerm) return data.amcs;

    const lowerTerm = searchTerm.toLowerCase();
    return data.amcs.filter(a =>
      a.amcId.toLowerCase().includes(lowerTerm) ||
      a.clientInfo.name.toLowerCase().includes(lowerTerm) ||
      (a.clientInfo.phone && a.clientInfo.phone.includes(lowerTerm)) ||
      (a.clientInfo.email && a.clientInfo.email.toLowerCase().includes(lowerTerm)) ||
      a.status.toLowerCase().includes(lowerTerm)
    );
  }, [data, searchTerm]);

  const formatDate = (dateValue: string | number | null | undefined) => {
    if (!dateValue) return '—';
    const timestamp = typeof dateValue === 'number' ? dateValue : Number(dateValue);
    const date = new Date(timestamp);
    return isNaN(date.getTime())
      ? 'Invalid date'
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (authLoading || dataLoading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading AMCs...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '5rem' }}>Error: {error.message}</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(80vh)',
      maxWidth: '1400px',
      margin: 'auto',
    }}>
      {/* --- Header + Search --- */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Annual Maintenance Contracts (AMCs)</h1>
          <Link href="/amcs/new" style={buttonStyle}>
            + New AMC
          </Link>
        </div>

        <div style={{ margin: '1rem 0', maxWidth: '400px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text"
            placeholder="Search by AMC ID, client, phone, email..."
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

      {/* --- Scrollable Table --- */}
      <div style={{ flexGrow: 1, overflow: 'hidden', backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2563eb' }}>
              <tr>
                <th style={tableHeaderStyle}>AMC ID</th>
                <th style={tableHeaderStyle}>Client</th>
                <th style={tableHeaderStyle}>Products</th>
                <th style={tableHeaderStyle}>Start Date</th>
                <th style={tableHeaderStyle}>End Date</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAmcs.length > 0 ? filteredAmcs.map((amc, idx) => (
                <tr key={amc.id} style={{ borderTop: idx > 0 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={tableCellStyle}>{amc.amcId}</td>
                  <td style={tableCellStyle}>
                    <div>
                      <p style={{ fontWeight: '600' }}>{amc.clientInfo.name}</p>
                      {amc.clientInfo.email && <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{amc.clientInfo.email}</p>}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    {amc.productInstances.map(p => p.product?.name).filter(Boolean).join(', ')}
                  </td>
                  <td style={tableCellStyle}>{formatDate(amc.startDate)}</td>
                  <td style={tableCellStyle}>{formatDate(amc.endDate)}</td>
                  <td style={tableCellStyle}><StatusBadge status={amc.status} /></td>
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                    <Link href={`/amcs/${amc.id}`} style={actionButtonStyle}>View</Link>
                  </td>
                </tr>
              )) : (
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

// --- Helper Components & Styles ---
const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, React.CSSProperties> = {
    Active: { background: '#d1fae5', color: '#065f46' },
    Expired: { background: '#fee2e2', color: '#991b1b' },
    Cancelled: { background: '#e5e7eb', color: '#4b5563' }
  };
  const style = statusStyles[status] || { background: '#f3f4f6', color: '#4b5563' };
  return <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{status}</span>;
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
  color: '#ffffff',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb'
};

const tableCellStyle: React.CSSProperties = {
  padding: '1rem 1.5rem',
  color: '#374151',
  verticalAlign: 'top'
};
