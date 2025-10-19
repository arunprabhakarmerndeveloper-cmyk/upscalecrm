"use client";

import { useQuery, gql, useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, ReactNode } from 'react';
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

interface CommercialTerm {
  title: string;
  content: string;
}

interface EditHistoryEntry {
  version: number;
  updatedAt: string | number;
  reason: string;
  totalAmount: number;
  updatedBy: { name: string } | null;
}

interface AssociatedInvoice {
    id: string;
    invoiceId: string;
    status: string;
}

interface AssociatedAMC {
    id: string;
    amcId: string;
    status: string;
}

// --- ✅ FIX: Updated the Quotation interface ---
// It now expects the associated documents directly, not nested under the client.
interface Quotation {
  id: string;
  quotationId: string;
  status: string;
  client: { 
    id: string;
  } | null;
  totalAmount: number;
  validUntil: string | number | null;
  createdAt: string | number;
  clientInfo: ClientInfo;
  lineItems: LineItem[];
  commercialTerms: CommercialTerm[] | null;
  editHistory: EditHistoryEntry[] | null;
  associatedInvoices: AssociatedInvoice[] | null;
  associatedAMCs: AssociatedAMC[] | null;
  imageUrls: string[] | null;
}

interface QuotationDetailsData {
  quotation: Quotation;
}

// --- GraphQL Queries & Mutations ---

const GET_QUOTATION_DETAILS = gql`
  # --- ✅ FIX: Updated the GraphQL query ---
  # It now fetches associatedInvoices and associatedAMCs directly from the quotation resolver.
  query GetQuotationDetails($id: ID!) {
    quotation(id: $id) {
      id
      quotationId
      status
      totalAmount
      validUntil
      commercialTerms { title content }
      createdAt
      clientInfo { name phone email billingAddress installationAddress }
      lineItems { product { name } description quantity price }
      editHistory { version updatedAt reason totalAmount updatedBy { name } }
      client { id }
      associatedInvoices { id invoiceId status }
      associatedAMCs { id amcId status }
      imageUrls
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
    mutation CreateInvoiceFromQuotation($quotationId: ID!, $dueDate: String, $installationDate: String) {
        createInvoiceFromQuotation(quotationId: $quotationId, dueDate: $dueDate, installationDate: $installationDate) {
            id
        }
    }
`;

// --- Helper Components & Styles ---
const formatDate = (dateValue: string | number | null | undefined) => { if (!dateValue) return '—'; const ts = typeof dateValue === 'number' ? dateValue : Number(dateValue); const d = new Date(ts); return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
const StatusBadge = ({ status }: { status: string }) => { const styles: Record<string, React.CSSProperties> = { Draft: { background: '#f3f4f6', color: '#4b5563' }, Sent: { background: '#dbeafe', color: '#1d4ed8' }, Approved: { background: '#d1fae5', color: '#065f46' }, Rejected: { background: '#fee2e2', color: '#991b1b' }, Paid: { background: '#d1fae5', color: '#065f46' }, Active: { background: '#d1fae5', color: '#065f46' }, Expired: { background: '#fee2e2', color: '#991b1b' } }; const style = styles[status] || styles['Draft']; return ( <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}> {status} </span> ); };
const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', fontWeight: '600', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', transition: 'background-color 0.2s' };
const actionButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const menuItemStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' };
const detailHeaderStyle: React.CSSProperties = { color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', textTransform: 'uppercase' };
const detailTextStyle: React.CSSProperties = { color: '#111827', whiteSpace: 'pre-wrap' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', verticalAlign: 'top' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' };
const associatedDocStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f3f4f6'};
const FormSection = ({ title, children }: { title: string; children: ReactNode }) => ( <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2> {children} </div> );
const InputField = ({ label, ...props }: {label?: string} & React.InputHTMLAttributes<HTMLInputElement>) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>} <input style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props} /> </div> );
const ModalWrapper = ({title, children, onClose}: {title: string, children: ReactNode, onClose: () => void}) => ( <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}> <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>{title}</h2> {children} </div> </div> );
const SuccessModal = ({ message, onClose }: { message: string, onClose: () => void }) => ( <ModalWrapper title="Success" onClose={onClose}> <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}> <div style={{ margin: '0 auto 1rem auto', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}> <svg style={{ width: '24px', height: '24px', color: '#065f46' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> </div> <p style={{ color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>{message}</p> <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#10b981', color: 'white', width: '100%' }}>OK</button> </div> </ModalWrapper> );
const ConfirmationModal = ({ title, message, onConfirm, onCancel, loading, confirmText = 'Confirm', showCancel = true }: { title: string, message: string, onConfirm: () => void, onCancel: () => void, loading?: boolean, confirmText?: string, showCancel?: boolean }) => ( <ModalWrapper title={title} onClose={onCancel}> <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}> {showCancel && <button onClick={onCancel} disabled={loading} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151'}}>Cancel</button>} <button onClick={onConfirm} disabled={loading} style={{...buttonStyle, backgroundColor: title === 'Error' ? '#2563eb' : '#ef4444', color: 'white', opacity: loading ? 0.6 : 1 }}> {loading ? 'Processing...' : confirmText} </button> </div> </ModalWrapper> );
const CreateInvoiceModal = ({ onSubmit, onClose, loading }: { onSubmit: (dates: { dueDate: string, installationDate: string }) => void, onClose: () => void, loading: boolean }) => { const [dueDate, setDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().split('T')[0]; }); const [installationDate, setInstallationDate] = useState(new Date().toISOString().split('T')[0]); return ( <ModalWrapper title="Create Invoice" onClose={onClose}> <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}> <InputField label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /> <InputField label="Installation Date" type="date" value={installationDate} onChange={e => setInstallationDate(e.target.value)} /> </div> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}> <button onClick={onClose} disabled={loading} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151'}}>Cancel</button> <button onClick={() => onSubmit({ dueDate, installationDate })} disabled={loading} style={{...buttonStyle, backgroundColor: '#10b981', color: 'white', opacity: loading ? 0.6 : 1 }}> {loading ? 'Creating...' : 'Confirm & Create'} </button> </div> </ModalWrapper> ); };
const ModalController = ({ modalState, setModalState }: { modalState: any, setModalState: any }) => { const { type, message, onConfirm } = modalState; if (!type) return null; if (type === 'success') { return <SuccessModal message={message} onClose={() => setModalState({ type: null, message: ''})} />; } if (type === 'success-redirect') { return <SuccessModal message={message} onClose={onConfirm} />; } if (type === 'error') { return <ConfirmationModal title="Error" message={message} onConfirm={() => setModalState({ type: null, message: ''})} onCancel={() => setModalState({ type: null, message: ''})} confirmText="OK" showCancel={false} />; } if (type === 'confirm') { return <ConfirmationModal title="Confirm Action" message={message} onConfirm={() => { onConfirm(); setModalState({ type: null, message: ''}); }} onCancel={() => setModalState({ type: null, message: ''})} />; } return null; };
const ActionsMenu = ({ onStatusChange, isLoading }: { onStatusChange: (newStatus: string) => void; isLoading: boolean; }) => { const [isOpen, setIsOpen] = useState(false); const menuRef = useRef<HTMLDivElement>(null); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setIsOpen(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []); const handleButtonClick = () => { if (!isLoading) setIsOpen((prev) => !prev); }; return ( <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}> <button onClick={handleButtonClick} disabled={isLoading} style={{ ...buttonStyle, backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', opacity: isLoading ? 0.6 : 1 }}> {isLoading ? 'Updating...' : 'Actions ▼'} </button> {isOpen && ( <div style={{ position: 'absolute', right: 0, marginTop: '0.5rem', width: '180px', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', zIndex: 100 }}> <button onClick={() => { onStatusChange('Approved'); setIsOpen(false); }} style={menuItemStyle}>✅ Mark as Approved</button> <button onClick={() => { onStatusChange('Sent'); setIsOpen(false); }} style={menuItemStyle}>✉️ Mark as Sent</button> <button onClick={() => { onStatusChange('Rejected'); setIsOpen(false); }} style={{...menuItemStyle, color: '#ef4444'}}>❌ Mark as Rejected</button> </div> )} </div> ); };

// --- ✅ NEW: Styles for Image Viewer ---
const imageGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' };
const imageThumbnailStyle: React.CSSProperties = { position: 'relative', aspectRatio: '1 / 1', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer' };
const fullScreenViewerStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '2rem' };
const fullScreenImageStyle: React.CSSProperties = { maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' };
const closeButtonStyle: React.CSSProperties = { position: 'absolute', top: '1rem', right: '1rem', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' };

// --- Main Page Component ---
export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.quotationId as string;

  const [modalState, setModalState] = useState<{ type: string | null; message: string; onConfirm?: () => void }>({ type: null, message: '' });
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const { loading: authLoading } = useAuth();
  const { loading, error, data, refetch } = useQuery<QuotationDetailsData>(GET_QUOTATION_DETAILS, {
    variables: { id },
    skip: !id,
  });

  const [updateStatus, { loading: statusUpdateLoading }] = useMutation(UPDATE_STATUS_MUTATION, {
      onCompleted: () => { setModalState({ type: 'success', message: 'Status updated successfully!' }); refetch(); },
      onError: (err) => setModalState({ type: 'error', message: `Error: ${err.message}` })
  });

  const [approveQuotation, { loading: approveLoading }] = useMutation(APPROVE_QUOTATION_MUTATION, {
      onCompleted: () => { setModalState({ type: 'success', message: 'Quotation approved! A client record has been created or linked.' }); refetch(); },
      onError: (err) => setModalState({ type: 'error', message: `Error: ${err.message}` })
  });
  
  const [createInvoice, { loading: invoiceCreationLoading }] = useMutation(CREATE_INVOICE_MUTATION, {
      onCompleted: (data) => {
          const newInvoiceId = data.createInvoiceFromQuotation.id;
          setModalState({ type: 'success-redirect', message: 'Invoice created successfully!', onConfirm: () => router.push(`/invoices/${newInvoiceId}`) });
      },
      onError: (err) => setModalState({ type: 'error', message: `Error creating invoice: ${err.message}` }),
      refetchQueries: ['GetInvoices', 'GetDashboardData']
  });

  const handleCreateInvoice = (dates: { dueDate: string, installationDate: string }) => {
      createInvoice({ variables: { quotationId: id, ...dates } });
  };

  const handleStatusChange = (newStatus: string) => {
      if (!data?.quotation) return;
      const { quotation } = data;
      if (newStatus === 'Approved' && !quotation.client) {
          setModalState({ type: 'confirm', message: 'This is a new lead. Approving will create a client record. Proceed?', onConfirm: () => approveQuotation({ variables: { quotationId: id } }) });
      } else {
          setModalState({ type: 'confirm', message: `Are you sure you want to change the status to "${newStatus}"?`, onConfirm: () => updateStatus({ variables: { id, status: newStatus } }) });
      }
  };

  if (!id || authLoading || loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading quotation details...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '5rem' }}>Error: {error.message}</div>;
  if (!data?.quotation) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Quotation not found.</div>;

  const { quotation } = data;
  // --- ✅ FIX: Use the new fields directly from the quotation object ---
  const { associatedInvoices, associatedAMCs } = quotation;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '1rem 1rem 4rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {modalState.type && <ModalController modalState={modalState} setModalState={setModalState} />}
        {modalState.type === 'create-invoice' && 
            <CreateInvoiceModal 
                onSubmit={handleCreateInvoice} 
                onClose={() => setModalState({ type: null, message: ''})} 
                loading={invoiceCreationLoading}
            />
        }
        {/* --- ✅ NEW: Full-screen image viewer modal --- */}
        {viewingImage && (
            <div style={fullScreenViewerStyle} onClick={() => setViewingImage(null)}>
                <img src={viewingImage} alt="Full screen view" style={fullScreenImageStyle} />
                <button style={closeButtonStyle}>&times;</button>
            </div>
        )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#111827' }}>Quotation</h1>
          <p style={{ color: '#4b5563', fontWeight: '500', fontSize: '1.125rem' }}>{quotation.quotationId}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <StatusBadge status={quotation.status} />
            <ActionsMenu onStatusChange={handleStatusChange} isLoading={statusUpdateLoading || approveLoading} />
            <Link href={`/quotations/edit/${quotation.id}`} style={{...buttonStyle, backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db'}}>Edit</Link>
            <button 
              onClick={() => setModalState({ type: 'create-invoice', message: ''})} 
              disabled={quotation.status !== 'Approved'}
              style={{...buttonStyle, cursor: quotation.status !== 'Approved' ? 'not-allowed' : 'pointer', opacity: quotation.status !== 'Approved' ? 0.5 : 1}}
              title={quotation.status !== 'Approved' ? 'Quotation must be approved to create an invoice' : 'Create Invoice'}
            >
              Create Invoice
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
        <div>
          <h3 style={detailHeaderStyle}>BILLED TO</h3>
          <p style={{ fontWeight: '600', color: '#111827' }}>{quotation.clientInfo.name}</p>
          <p style={detailTextStyle}>{quotation.clientInfo.phone}</p>
          <p style={detailTextStyle}>{quotation.clientInfo.email}</p>
          <div style={{ marginTop: '1rem' }}>
              <h4 style={detailHeaderStyle}>Billing Address</h4>
              <p style={detailTextStyle}>{quotation.clientInfo.billingAddress || 'N/A'}</p>
          </div>
          <div style={{ marginTop: '1rem' }}>
              <h4 style={detailHeaderStyle}>Installation Address</h4>
              <p style={detailTextStyle}>{quotation.clientInfo.installationAddress || 'N/A'}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={detailHeaderStyle}>QUOTATION DATE</h3>
          <p style={detailTextStyle}>{formatDate(quotation.createdAt)}</p>
          <h3 style={{ ...detailHeaderStyle, marginTop: '1rem' }}>VALID UNTIL</h3>
          <p style={detailTextStyle}>{formatDate(quotation.validUntil)}</p>
        </div>
      </div>
      
      {/* --- ✅ FIX: Check the length of the new fields --- */}
      {((associatedInvoices?.length || 0) > 0 || (associatedAMCs?.length || 0) > 0) && (
          <FormSection title="Associated Documents">
              {associatedInvoices?.map(inv => (
                  <div key={inv.id} style={associatedDocStyle}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <p style={{fontWeight: '600'}}>Invoice: {inv.invoiceId}</p>
                          <StatusBadge status={inv.status} />
                      </div>
                      <Link href={`/invoices/${inv.id}`} style={actionButtonStyle}>View Invoice</Link>
                  </div>
              ))}
              {associatedAMCs?.map(amc => (
                  <div key={amc.id} style={associatedDocStyle}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <p style={{fontWeight: '600'}}>AMC: {amc.amcId}</p>
                          <StatusBadge status={amc.status} />
                      </div>
                      <Link href={`/amcs/${amc.id}`} style={actionButtonStyle}>View AMC</Link>
                  </div>
              ))}
          </FormSection>
      )}

      {/* --- ✅ NEW: Image Display Section --- */}
      {quotation.imageUrls && quotation.imageUrls.length > 0 && (
          <FormSection title="Images">
              <div style={imageGridStyle}>
                  {quotation.imageUrls.map((url, index) => (
                      <div key={index} style={imageThumbnailStyle} onClick={() => setViewingImage(url)}>
                          <img src={url} alt={`Quotation image ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                  ))}
              </div>
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
            {quotation.lineItems.map((item, index) => (
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

      {quotation.commercialTerms && quotation.commercialTerms.length > 0 && (
          <div>
            <h2 style={sectionTitleStyle}>Commercial Terms</h2>
            <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {quotation.commercialTerms.map((term, index) => (
                    <div key={index}>
                        <h3 style={{ fontWeight: '600' }}>{term.title}</h3>
                        <p style={{ whiteSpace: 'pre-wrap', color: '#4b5563' }}>{term.content}</p>
                    </div>
                ))}
            </div>
          </div>
      )}

      {quotation.editHistory && quotation.editHistory.length > 0 && (
        <div>
          <h2 style={sectionTitleStyle}>Version History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quotation.editHistory.map((version) => (
              <div key={version.version} style={{ backgroundColor: '#f9fafb', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: '600' }}>Version {version.version}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Updated on {new Date(Number(version.updatedAt)).toLocaleString()} by {version.updatedBy?.name || 'Unknown'}</p>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Reason: &quot;{version.reason}&quot;</p>
                <p style={{ marginTop: '0.5rem', fontWeight: '500' }}>Previous Total: {formatCurrency(version.totalAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

