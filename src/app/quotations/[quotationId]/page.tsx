"use client";

import { useQuery, gql, useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

const GET_QUOTATION_DETAILS = gql`
  query GetQuotationDetails($id: ID!) {
    quotation(id: $id) {
      id
      quotationId
      status
      client { id } 
      totalAmount
      validUntil
      commercialTerms { title content }
      createdAt
      clientInfo { name phone email billingAddress { street city pincode } }
      lineItems { product { name } description quantity price }
      editHistory { version updatedAt reason totalAmount updatedBy { name } }
    }
  }
`;

const UPDATE_STATUS_MUTATION = gql`
    mutation UpdateQuotationStatus($id: ID!, $status: String!) {
        updateQuotationStatus(id: $id, status: $status) { id status }
    }
`;

const APPROVE_QUOTATION_MUTATION = gql`
    mutation ApproveQuotation($quotationId: ID!) {
        approveQuotation(quotationId: $quotationId) { id status client { id } }
    }
`;


const CREATE_INVOICE_MUTATION = gql`
    mutation CreateInvoiceFromQuotation($quotationId: ID!, $dueDate: String) {
        createInvoiceFromQuotation(quotationId: $quotationId, dueDate: $dueDate) {
            id # We need the ID of the new invoice to redirect to it
        }
    }
`;


export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  

  const idParam = params.id || params.quotationId;
  const id = Array.isArray(idParam) ? idParam[0] : idParam as string;

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

  const { loading: authLoading } = useAuth();
  const { loading, error, data, refetch } = useQuery(GET_QUOTATION_DETAILS, {
    variables: { id },
    skip: !id, // Correctly skip the query if the ID isn't available yet
  });

  const [updateStatus, { loading: statusUpdateLoading }] = useMutation(UPDATE_STATUS_MUTATION, {
      onCompleted: () => refetch(),
      onError: (err) => alert(`Error: ${err.message}`)
  });

  const [approveQuotation, { loading: approveLoading }] = useMutation(APPROVE_QUOTATION_MUTATION, {
      onCompleted: () => {
          alert('Quotation approved successfully! A client record has been created or linked.');
          refetch();
      },
      onError: (err) => alert(`Error: ${err.message}`)
  });
  
  // --- NEW: Logic for creating an invoice ---
  const [createInvoice, { loading: invoiceCreationLoading }] = useMutation(CREATE_INVOICE_MUTATION, {
      onCompleted: (data) => {
          const newInvoiceId = data.createInvoiceFromQuotation.id;
          alert('Invoice created successfully!');
          router.push(`/invoices/${newInvoiceId}`); // Redirect to the new invoice page
      },
      onError: (err) => alert(`Error creating invoice: ${err.message}`),
      refetchQueries: ['GetInvoices', 'GetDashboardData'] // Update the main invoices list
  });

  const handleCreateInvoice = () => {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30); // Default to 30 days from now
      const dueDate = prompt("Please enter the due date for this invoice (YYYY-MM-DD):", defaultDueDate.toISOString().split('T')[0]);
      
      if (dueDate) { // Proceed only if the user provides a date
          createInvoice({ variables: { quotationId: id, dueDate } });
      }
  };

  const handleStatusChange = (newStatus: string) => {
      if (newStatus === 'Approved') {
          const { quotation } = data;
          if (!quotation.client) {
              if (window.confirm('This quotation is for a new lead. Approving it will create a new client record. Proceed?')) {
                  approveQuotation({ variables: { quotationId: id } });
              }
          } else {
              if (window.confirm(`Are you sure you want to change status to "Approved"?`)) {
                 updateStatus({ variables: { id, status: 'Approved' } });
              }
          }
      } else {
          if (window.confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
              updateStatus({ variables: { id, status: newStatus } });
          }
      }
  };
  
  // More detailed logging for easier debugging
  useEffect(() => {
      console.log({
          idFromParams: id,
          isAuthLoading: authLoading,
          isDataLoading: loading
      });
  }, [id, authLoading, loading]);


  if (!id || authLoading || loading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading quotation details...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '5rem' }}>Error: {error.message}</div>;
  }
  if (!data || !data.quotation) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Quotation not found.</div>;
  }

  const { quotation } = data;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '1rem 1rem 4rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#111827' }}>Quotation</h1>
          <p style={{ color: '#4b5563', fontWeight: '500', fontSize: '1.125rem' }}>{quotation.quotationId}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <StatusBadge status={quotation.status} />
            <ActionsMenu onStatusChange={handleStatusChange} isLoading={statusUpdateLoading || approveLoading} />
            <Link href={`/quotations/edit/${quotation.id}`} style={{...buttonStyle, backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db'}}>
                Edit
            </Link>
            <button 
                onClick={handleCreateInvoice} 
                disabled={quotation.status !== 'Approved' || invoiceCreationLoading}
                style={{
                    ...buttonStyle,
                    cursor: quotation.status !== 'Approved' ? 'not-allowed' : 'pointer',
                    opacity: quotation.status !== 'Approved' ? 0.5 : 1
                }}
                title={quotation.status !== 'Approved' ? 'Quotation must be approved to create an invoice' : 'Create Invoice'}
            >
                {invoiceCreationLoading ? 'Creating...' : 'Create Invoice'}
            </button>
        </div>
      </div>

      {/* Client & Date Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        <div>
          <h3 style={detailHeaderStyle}>BILLED TO</h3>
          <p style={{ fontWeight: '600', color: '#111827' }}>{quotation.clientInfo.name}</p>
          <p style={detailTextStyle}>{quotation.clientInfo.phone}</p>
          <p style={detailTextStyle}>{quotation.clientInfo.email}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={detailHeaderStyle}>QUOTATION DATE</h3>
          <p style={detailTextStyle}>{formatDate(quotation.createdAt)}</p>
          <h3 style={{ ...detailHeaderStyle, marginTop: '1rem' }}>VALID UNTIL</h3>
          <p style={detailTextStyle}>{formatDate(quotation.validUntil)}</p>
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={tableHeaderStyle}>Item</th>
              <th style={{...tableHeaderStyle, textAlign: 'center'}}>Qty</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Price</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
            {quotation.lineItems.map((item: any, index: number) => (
              <tr key={index} style={{ borderTop: index > 0 ? '1px solid #f3f4f6' : 'none' }}>
                <td style={tableCellStyle}>
                  <p style={{ fontWeight: '600', color: '#111827' }}>{item.product?.name || 'N/A'}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{item.description}</p>
                </td>
                <td style={{...tableCellStyle, textAlign: 'center'}}>{item.quantity}</td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ backgroundColor: '#f9fafb', fontWeight: '700', borderTop: '2px solid #e5e7eb' }}>
            <tr>
              <td colSpan={3} style={{ ...tableCellStyle, textAlign: 'right', fontSize: '1.125rem' }}>Total Amount</td>
              <td style={{ ...tableCellStyle, textAlign: 'right', fontSize: '1.125rem' }}>{formatCurrency(quotation.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* --- UPDATED: Commercial Terms Section --- */}
      {quotation.commercialTerms && quotation.commercialTerms.length > 0 && (
          <div>
            <h2 style={sectionTitleStyle}>Commercial Terms</h2>
            <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {quotation.commercialTerms.map((term: any, index: number) => (
                    <div key={index}>
                        <h3 style={{ fontWeight: '600' }}>{term.title}</h3>
                        <p style={{ whiteSpace: 'pre-wrap', color: '#4b5563' }}>{term.content}</p>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* Edit History Section */}
      {quotation.editHistory && quotation.editHistory.length > 0 && (
        <div>
          <h2 style={sectionTitleStyle}>Version History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quotation.editHistory.map((version: any) => (
              <div key={version.version} style={{ backgroundColor: '#f9fafb', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: '600' }}>Version {version.version}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Updated on {new Date(version.updatedAt).toLocaleString()} by {version.updatedBy?.name || 'Unknown'}</p>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Reason: "{version.reason}"</p>
                <p style={{ marginTop: '0.5rem', fontWeight: '500' }}>Previous Total: {formatCurrency(version.totalAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ActionsMenu = ({ onStatusChange, isLoading }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleButtonClick = () => {
        if (!isLoading) setIsOpen((prev) => !prev);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
            <button 
                onClick={handleButtonClick} 
                disabled={isLoading} 
                style={{
                    ...buttonStyle, 
                    backgroundColor: '#f9fafb', 
                    color: '#374151', 
                    border: '1px solid #d1d5db', 
                    opacity: isLoading ? 0.6 : 1 
                }}
            >
                {isLoading ? 'Updating...' : 'Actions ▼'}
            </button>

            {isOpen && (
                <div 
                    style={{ 
                        position: 'absolute', 
                        right: 0, 
                        marginTop: '0.5rem', 
                        width: '180px', 
                        backgroundColor: 'white', 
                        borderRadius: '0.5rem', 
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
                        border: '1px solid #e5e7eb', 
                        zIndex: 100
                    }}
                >
                    <button onClick={() => { onStatusChange('Approved'); setIsOpen(false); }} style={menuItemStyle}>✅ Mark as Approved</button>
                    <button onClick={() => { onStatusChange('Sent'); setIsOpen(false); }} style={menuItemStyle}>✉️ Mark as Sent</button>
                    <button onClick={() => { onStatusChange('Rejected'); setIsOpen(false); }} style={{...menuItemStyle, color: '#ef4444'}}>❌ Mark as Rejected</button>
                </div>
            )}
        </div>
    );
};

// --- Helper Components & Styles ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles: any = { Draft: { background: '#f3f4f6', color: '#4b5563' }, Sent: { background: '#dbeafe', color: '#1d4ed8' }, Approved: { background: '#d1fae5', color: '#065f46' }, Rejected: { background: '#fee2e2', color: '#991b1b' }, };
    const style = statusStyles[status] || statusStyles['Draft'];
    return ( <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}> {status} </span> );
};
const detailHeaderStyle: React.CSSProperties = { color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase' };
const detailTextStyle: React.CSSProperties = { color: '#111827' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', verticalAlign: 'top' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' };
const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', fontWeight: '600', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', transition: 'background-color 0.2s' };
const menuItemStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' };

