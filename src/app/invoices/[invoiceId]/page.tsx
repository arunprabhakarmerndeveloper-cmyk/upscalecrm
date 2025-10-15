"use client";

import { useQuery, gql, useMutation } from '@apollo/client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

const GET_INVOICE_DETAILS = gql`
  query GetInvoiceDetails($id: ID!) {
    invoice(id: $id) {
      id
      invoiceId
      status
      totalAmount
      amountPaid
      balanceDue
      issueDate
      dueDate
      paymentDate
      clientInfo {
        name
        phone
        email
        billingAddress { street city pincode }
      }
      lineItems {
        product { name }
        description
        quantity
        price
      }
      termsOfService
    }
  }
`;

const RECORD_PAYMENT_MUTATION = gql`
    mutation RecordPayment($input: RecordPaymentInput!) {
        recordPayment(input: $input) {
            id
            status
            amountPaid
            paymentDate
        }
    }
`;

export default function InvoiceDetailPage() {
  const params = useParams();

  // --- THIS IS THE FIX ---
  // We now correctly look for `params.invoiceId` to match your folder structure.
  const id = Array.isArray(params.invoiceId) ? params.invoiceId[0] : params.invoiceId as string;
  // --- END OF FIX ---
  
  const { loading: authLoading } = useAuth();
  const { loading, error, data, refetch } = useQuery(GET_INVOICE_DETAILS, { variables: { id }, skip: !id });

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);

  if (!id || authLoading || loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading invoice details...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;
  if (!data || !data.invoice) return <div style={{ textAlign: 'center' }}>Invoice not found.</div>;

  const { invoice } = data;

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

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '1rem 1rem 4rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: '800' }}>Invoice</h1>
                <p style={{ color: '#4b5563', fontWeight: '500' }}>{invoice.invoiceId}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <StatusBadge status={invoice.status} />
                <Link 
                    href={`/amcs/new?fromInvoice=${invoice.id}`}
                    style={{...buttonStyle}}
                  >
                    Generate AMC
                  </Link>
                {invoice.status !== 'Paid' && (
                    <button onClick={() => setPaymentModalOpen(true)} style={{...buttonStyle}}>Record Payment</button>
                )}
            </div>
        </div>

        {/* Client & Date Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <div>
                <h3 style={detailHeaderStyle}>BILLED TO</h3>
                <p style={{ fontWeight: '600', color: '#111827' }}>{invoice.clientInfo.name}</p>
                <p style={detailTextStyle}>{invoice.clientInfo.phone}</p>
                <p style={detailTextStyle}>{invoice.clientInfo.email}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
                <h3 style={detailHeaderStyle}>INVOICE DATE</h3>
                <p style={detailTextStyle}>{invoice.issueDate ? formatDate(invoice.issueDate) : "__"}</p>
                <h3 style={{ ...detailHeaderStyle, marginTop: '1rem' }}>INSTALLATION DATE</h3>
                <p style={detailTextStyle}>{invoice.dueDate ? formatDate(invoice.installationDate) : "__"}</p>
                <h3 style={{ ...detailHeaderStyle, marginTop: '1rem' }}>DUE DATE</h3>
                <p style={detailTextStyle}>{invoice.dueDate ? formatDate(invoice.dueDate) : "__"}</p>
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
                    {invoice.lineItems.map((item: any, index: number) => (
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
            </table>
        </div>
        
        {/* Totals & Terms Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap-reverse' }}>
            <div style={{ flex: '1 1 300px' }}>
                {invoice.termsOfService && (
                    <>
                        <h3 style={detailHeaderStyle}>TERMS OF SERVICE</h3>
                        <p style={{...detailTextStyle, whiteSpace: 'pre-wrap'}}>{invoice.termsOfService}</p>
                    </>
                )}
            </div>
            <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={detailTextStyle}>Subtotal:</span> <span style={detailTextStyle}>{formatCurrency(invoice.totalAmount)}</span></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={detailTextStyle}>Paid:</span> <span style={detailTextStyle}>{formatCurrency(invoice.amountPaid)}</span></div>
                    <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '2px solid #e5e7eb', fontSize: '1.25rem', fontWeight: '700', color: '#111827'}}><span>Balance Due:</span> <span>{formatCurrency(invoice.balanceDue)}</span></div>
                </div>
            </div>
        </div>

        {isPaymentModalOpen && (
            <RecordPaymentModal
                invoiceId={invoice.id}
                balanceDue={invoice.balanceDue}
                onClose={() => setPaymentModalOpen(false)}
                onPaymentRecorded={refetch}
            />
        )}
    </div>
  );
}

const RecordPaymentModal = ({ invoiceId, balanceDue, onClose, onPaymentRecorded }: any) => {
    const [amount, setAmount] = useState(balanceDue.toFixed(2));
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const [recordPayment, { loading, error }] = useMutation(RECORD_PAYMENT_MUTATION, {
        onCompleted: () => {
            alert('Payment recorded successfully!');
            onPaymentRecorded();
            onClose();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        recordPayment({ variables: { input: { invoiceId, amount: parseFloat(amount), paymentDate } } });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>Record Payment</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <InputField label="Payment Amount (AED)" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} required step="0.01" />
                    <InputField label="Payment Date" type="date" value={paymentDate} onChange={(e: any) => setPaymentDate(e.target.value)} required />
                    {error && <p style={{color: 'red'}}>{error.message}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#1f2937'}}>Cancel</button>
                        <button type="submit" disabled={loading} style={{...buttonStyle, opacity: loading ? 0.6: 1}}>{loading ? 'Saving...' : 'Save Payment'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Helper Components & Styles ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles: any = { Draft: { background: '#f3f4f6', color: '#4b5563' }, Sent: { background: '#dbeafe', color: '#1d4ed8' }, Paid: { background: '#d1fae5', color: '#065f46' }, Overdue: { background: '#fee2e2', color: '#991b1b' }, Cancelled: { background: '#e5e7eb', color: '#4b5563' } };
    const style = statusStyles[status] || statusStyles['Draft'];
    return ( <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}> {status} </span> );
};
const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', fontWeight: '600', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', transition: 'background-color 0.2s' };
const InputField = ({ label, ...props }: any) => (
    <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label>
        <input style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', outline: 'none' }} {...props} />
    </div>
);
const detailHeaderStyle: React.CSSProperties = { color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase' };
const detailTextStyle: React.CSSProperties = { color: '#111827' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', verticalAlign: 'top' };
