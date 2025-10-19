"use client";

import { useQuery, gql, useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { useState, FormEvent, ReactNode, CSSProperties } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

// --- TypeScript Interfaces ---
interface ClientInfo {
  name: string;
  phone: string;
  email: string | null;
  billingAddress: string | null;
  installationAddress: string | null;
}
interface LineItem {
  product: { name: string } | null;
  description: string | null;
  quantity: number;
  price: number;
}
interface AssociatedDoc {
    id: string;
    quotationId?: string;
    amcId?: string;
}
interface Invoice {
  id: string;
  invoiceId: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string | number | null;
  dueDate: string | number | null;
  paymentDate: string | number | null;
  installationDate: string | number | null;
  clientInfo: ClientInfo;
  lineItems: LineItem[];
  termsOfService: string | null;
  quotation: AssociatedDoc | null;
  amc: AssociatedDoc | null;
}
interface InvoiceDetailsData {
  invoice: Invoice;
}

// --- GraphQL Queries & Mutations ---
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
      installationDate
      clientInfo { name phone email billingAddress installationAddress }
      lineItems { product { name } description quantity price }
      termsOfService
      quotation { id quotationId }
      amc { id amcId }
    }
  }
`;
const RECORD_PAYMENT_MUTATION = gql`
    mutation RecordPayment($input: RecordPaymentInput!) {
        recordPayment(input: $input) { id status amountPaid paymentDate }
    }
`;

// --- Helper Components & Styles ---
const formatDate = (dateValue: string | number | null | undefined) => { if (!dateValue) return '—'; const ts = typeof dateValue === 'number' ? dateValue : Number(dateValue); const d = new Date(ts); return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
const StatusBadge = ({ status }: { status: string }) => { const styles: Record<string, React.CSSProperties> = { Draft: { background: '#f3f4f6', color: '#4b5563' }, Sent: { background: '#dbeafe', color: '#1d4ed8' }, Paid: { background: '#d1fae5', color: '#065f46' }, Overdue: { background: '#fee2e2', color: '#991b1b' }, Cancelled: { background: '#e5e7eb', color: '#4b5563' } }; const style = styles[status] || styles['Draft']; return ( <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}> {status} </span> ); };
const buttonStyle: CSSProperties = { padding: '0.5rem 1rem', fontWeight: '600', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', transition: 'background-color 0.2s', textDecoration: 'none' };
const detailHeaderStyle: CSSProperties = { color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase' };
const detailTextStyle: CSSProperties = { color: '#111827', whiteSpace: 'pre-wrap' };
const tableHeaderStyle: CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' };
const tableCellStyle: CSSProperties = { padding: '1rem 1.5rem', verticalAlign: 'top' };
const associatedDocStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6'};
const actionButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const FormSection = ({ title, children }: { title: string; children: ReactNode }) => ( <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2> {children} </div>);
const InputField = ({ label, ...props }: {label?: string} & React.InputHTMLAttributes<HTMLInputElement>) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>} <input style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props} /> </div> );
const ModalWrapper = ({title, children, onClose}: {title: string, children: ReactNode, onClose: () => void}) => ( <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}> <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}> <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{title}</h2> <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}>&times;</button> </div> {children} </div> </div> );
const SuccessModal = ({ message, onClose }: { message: string, onClose: () => void }) => ( <ModalWrapper title="Success" onClose={onClose}> <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}> <div style={{ margin: '0 auto 1rem auto', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}> <svg style={{ width: '24px', height: '24px', color: '#065f46' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> </div> <p style={{ color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>{message}</p> <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#10b981', color: 'white', width: '100%' }}>OK</button> </div> </ModalWrapper> );

// --- Main Page Component ---
export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.invoiceId as string;
  
  const { loading: authLoading } = useAuth();
  const { loading, error, data, refetch } = useQuery<InvoiceDetailsData>(GET_INVOICE_DETAILS, { variables: { id }, skip: !id });

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (!id || authLoading || loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading invoice details...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;
  if (!data?.invoice) return <div style={{ textAlign: 'center' }}>Invoice not found.</div>;

  const { invoice } = data;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '1rem 1rem 4rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {showSuccessModal && <SuccessModal message="Payment recorded successfully!" onClose={() => setShowSuccessModal(false)} />}
        {isPaymentModalOpen && (
            <RecordPaymentModal
                invoiceId={invoice.id}
                balanceDue={invoice.balanceDue}
                onClose={() => setPaymentModalOpen(false)}
                onPaymentRecorded={() => {
                    setShowSuccessModal(true);
                    refetch();
                }}
            />
        )}
        
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800' }}>Invoice</h1>
              <p style={{ color: '#4b5563', fontWeight: '500' }}>{invoice.invoiceId}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <StatusBadge status={invoice.status} />
              <Link href={`/amcs/new?fromInvoice=${invoice.id}`} style={{...buttonStyle}}>
                Generate AMC
              </Link>
              {invoice.status !== 'Paid' && (
                  <button onClick={() => setPaymentModalOpen(true)} style={{...buttonStyle}}>Record Payment</button>
              )}
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <div>
              <h3 style={detailHeaderStyle}>BILLED TO</h3>
              <p style={{ fontWeight: '600', color: '#111827' }}>{invoice.clientInfo.name}</p>
              <p style={detailTextStyle}>{invoice.clientInfo.phone}</p>
              <p style={detailTextStyle}>{invoice.clientInfo.email}</p>
              <div style={{ marginTop: '1rem' }}>
                  <h4 style={detailHeaderStyle}>Billing Address</h4>
                  <p style={detailTextStyle}>{invoice.clientInfo.billingAddress || 'N/A'}</p>
              </div>
              <div style={{ marginTop: '1rem' }}>
                  <h4 style={detailHeaderStyle}>Installation Address</h4>
                  <p style={detailTextStyle}>{invoice.clientInfo.installationAddress || 'N/A'}</p>
              </div>
          </div>
          <div style={{ textAlign: 'right' }}>
              <h3 style={detailHeaderStyle}>INVOICE DATE</h3>
              <p style={detailTextStyle}>{formatDate(invoice.issueDate)}</p>
              <h3 style={{ ...detailHeaderStyle, marginTop: '1rem' }}>INSTALLATION DATE</h3>
              <p style={detailTextStyle}>{formatDate(invoice.installationDate)}</p>
              <h3 style={{ ...detailHeaderStyle, marginTop: '1rem' }}>DUE DATE</h3>
              <p style={detailTextStyle}>{formatDate(invoice.dueDate)}</p>
          </div>
      </div>

      {(invoice.quotation || invoice.amc) && (
          <FormSection title="Associated Documents">
              {invoice.quotation && (
                  <div style={associatedDocStyle}>
                      <p style={{fontWeight: '600'}}>Originating Quotation: {invoice.quotation.quotationId}</p>
                      <Link href={`/quotations/${invoice.quotation.id}`} style={actionButtonStyle}>View Quotation</Link>
                  </div>
              )}
              {invoice.amc && (
                   <div style={associatedDocStyle}>
                      <p style={{fontWeight: '600'}}>Related AMC: {invoice.amc.amcId}</p>
                      <Link href={`/amcs/${invoice.amc.id}`} style={actionButtonStyle}>View AMC</Link>
                  </div>
              )}
          </FormSection>
      )}

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
                  {invoice.lineItems.map((item, index) => (
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
    </div>
  );
}

// --- Typed RecordPaymentModal Component ---
interface RecordPaymentModalProps {
  invoiceId: string;
  balanceDue: number;
  onClose: () => void;
  onPaymentRecorded: () => void;
}
const RecordPaymentModal = ({ invoiceId, balanceDue, onClose, onPaymentRecorded }: RecordPaymentModalProps) => {
    const [amount, setAmount] = useState(balanceDue.toFixed(2));
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const [recordPayment, { loading, error }] = useMutation(RECORD_PAYMENT_MUTATION, {
        onCompleted: () => {
            onPaymentRecorded();
            onClose();
        }
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        recordPayment({ variables: { input: { invoiceId, amount: parseFloat(amount), paymentDate } } });
    };

    return (
        <ModalWrapper title="Record Payment" onClose={onClose}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <InputField label="Payment Amount (AED)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" />
                <InputField label="Payment Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                {error && <p style={{color: 'red'}}>{error.message}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#1f2937'}}>Cancel</button>
                    <button type="submit" disabled={loading} style={{...buttonStyle, opacity: loading ? 0.6: 1}}>{loading ? 'Saving...' : 'Save Payment'}</button>
                </div>
            </form>
        </ModalWrapper>
    );
};

