"use client";

import { useQuery, gql, useMutation } from '@apollo/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import React, { ReactNode, useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- TypeScript Interfaces ---

interface ProductInstance {
  product: {
    name: string;
  } | null;
  serialNumber: string | null;
  purchaseDate: string | number;
}

interface ServiceVisit {
  scheduledDate: string | number;
  completedDate?: string | number | null;
  status: string;
  notes: string | null;
}

interface Amc {
  id: string;
  amcId: string;
  status: string;
  startDate: string | number;
  endDate: string | number;
  contractAmount: number;
  createdBy: {
    name: string;
  } | null;
  createdAt: string | number;
  clientInfo: {
    name: string;
    phone: string;
    email: string | null;
    billingAddress: string | null;
    installationAddress: string | null;
  };
  productInstances: ProductInstance[];
  serviceVisits: ServiceVisit[];
}

interface AmcDetailsData {
  amc: Amc;
}

// --- GraphQL Queries & Mutations ---

const GET_AMC_DETAILS = gql`
  query GetAmcDetails($id: ID!) {
    amc(id: $id) {
      id
      amcId
      status
      startDate
      endDate
      contractAmount
      createdBy { name }
      createdAt
      clientInfo { name phone email billingAddress installationAddress }
      productInstances { 
        product { name } 
        serialNumber 
        purchaseDate 
      }
      serviceVisits { 
        scheduledDate 
        completedDate 
        status 
        notes 
      }
    }
  }
`;

const UPDATE_SERVICE_STATUS = gql`
  mutation UpdateAmcServiceStatus($amcId: ID!, $visitIndex: Int!, $status: String!, $completedDate: String) {
    updateAmcServiceStatus(amcId: $amcId, visitIndex: $visitIndex, status: $status, completedDate: $completedDate) {
      id
      serviceVisits { status completedDate }
    }
  }
`;

// --- Helper Functions & Styles ---
const formatDate = (dateValue: string | number | null | undefined) => { if (!dateValue) return '—'; const ts = typeof dateValue === 'number' ? dateValue : Number(dateValue); const d = new Date(ts); return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer' };
const sectionStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' };
const sectionHeaderStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' };

// --- Main Component ---

export default function AmcDetailPage() {
  const params = useParams();
  const id = params.amcId as string;
  const { loading: authLoading } = useAuth();
  
  const [modal, setModal] = useState<{ type: 'confirm' | 'error' | null; message: string; onConfirm?: () => void }>({ type: null, message: '' });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const { loading, error, data, refetch } = useQuery<AmcDetailsData>(GET_AMC_DETAILS, { 
    variables: { id }, 
    skip: !id 
  });

  const [updateServiceStatus, { loading: updateLoading }] = useMutation(UPDATE_SERVICE_STATUS, {
      onCompleted: () => refetch(),
      onError: (err) => setModal({ type: 'error', message: `Error updating service status: ${err.message}`})
  });

  const handleServiceCheck = (index: number, currentStatus: string) => {
      const newStatus = currentStatus === 'Completed' ? 'Scheduled' : 'Completed';
      setModal({
          type: 'confirm',
          message: `Mark service #${index + 1} as ${newStatus}?`,
          onConfirm: () => {
              const completedDate = newStatus === 'Completed' ? new Date().toISOString() : undefined;
              updateServiceStatus({ variables: { amcId: id, visitIndex: index, status: newStatus, completedDate } });
              setModal({ type: null, message: '' });
          }
      });
  };

  const handleCloseModal = () => setModal({ type: null, message: '' });

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !data?.amc) return;
    setIsGeneratingPdf(true);
    try {
        const canvas = await html2canvas(pdfRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${data.amc.amcId}.pdf`);
    } catch (err) {
        console.error("Failed to generate PDF:", err);
        setModal({ type: 'error', message: 'Failed to generate PDF. Please try again.' });
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (!id || authLoading || loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading AMC Details...</div>;
  if (error && !data) return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;
  if (!data?.amc) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>AMC not found.</div>;

  const { amc } = data;

  return (
    <>
      {/* This hidden div is used as the source for the PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PDFContent ref={pdfRef} amc={amc} />
      </div>

      <div style={{ maxWidth: '900px', margin: 'auto', padding: '1rem 1rem 4rem 1rem' }}>
          {modal.type === 'confirm' && <ConfirmationModal message={modal.message} onConfirm={modal.onConfirm!} onCancel={handleCloseModal} loading={updateLoading} />}
          {modal.type === 'error' && <ErrorModal message={modal.message} onClose={handleCloseModal} />}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '800' }}>AMC Details</h1>
            <p style={{ color: '#4b5563', fontWeight: '500' }}>{amc.amcId}</p>
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <StatusBadge status={amc.status} />
            <button onClick={handleDownloadPdf} style={buttonStyle} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? 'Downloading...' : 'Download PDF'}
            </button>
            <Link href={`/amcs/edit/${amc.id}`} style={{...buttonStyle, backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db'}}>Edit</Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Client & Contract Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <DetailItem label="Client" value={amc.clientInfo.name} />
                  <DetailItem label="Phone" value={amc.clientInfo.phone} />
                  <DetailItem label="Email" value={amc.clientInfo.email || 'N/A'} />
                  <DetailItem label="Contract Amount" value={formatCurrency(amc.contractAmount)} />
                  <DetailItem label="Contract Period" value={`${formatDate(amc.startDate)} - ${formatDate(amc.endDate)}`} />
                  <DetailItem label="Created On" value={`${formatDate(amc.createdAt)} by ${amc.createdBy?.name || 'N/A'}`} />
              </div>
               <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '1.5rem', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <DetailItem label="Billing Address" value={amc.clientInfo.billingAddress || 'N/A'} />
                  <DetailItem label="Installation Address" value={amc.clientInfo.installationAddress || 'N/A'} />
              </div>
          </div>
          
          <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Products Under Contract</h3>
              {amc.productInstances.map((instance: ProductInstance, index: number) => (
                  <div key={index} style={{ borderTop: index > 0 ? '1px solid #f3f4f6' : 'none', padding: '1rem 0' }}>
                      <p style={{fontWeight: '600'}}>{instance.product?.name || 'Product Not Found'}</p>
                      <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Serial Number: {instance.serialNumber || 'N/A'}</p>
                      <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Install Date: {formatDate(instance.purchaseDate)}</p>
                  </div>
              ))}
          </div>

          <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Service Schedule</h3>
              {amc.serviceVisits.map((visit: ServiceVisit, index: number) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderTop: index > 0 ? '1px solid #f3f4f6' : 'none' }}>
                      <input type="checkbox" checked={visit.status === 'Completed'} onChange={() => handleServiceCheck(index, visit.status)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }} disabled={updateLoading} />
                      <div style={{ textDecoration: visit.status === 'Completed' ? 'line-through' : 'none', color: visit.status === 'Completed' ? '#9ca3af' : '#111827' }}>
                          <p style={{ fontWeight: '500' }}>Service Visit #{index + 1}</p>
                          <p style={{ fontSize: '0.875rem' }}>Scheduled for: {formatDate(visit.scheduledDate)}</p>
                          {visit.status === 'Completed' && <p style={{ fontSize: '0.875rem' }}>Completed on: {formatDate(visit.completedDate)}</p>}
                      </div>
                  </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

// --- Helper Components ---
interface DetailItemProps { label: string; value: string | number; }
const DetailItem = ({ label, value }: DetailItemProps) => (<div style={{ padding: '0.25rem 0' }}><p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase' }}>{label}</p><p style={{ fontWeight: '600', color: '#111827', whiteSpace: 'pre-wrap' }}>{value}</p></div>);
const StatusBadge = ({ status }: { status: string }) => { const statusStyles: Record<string, React.CSSProperties> = { Active: { background: '#d1fae5', color: '#065f46' }, Expired: { background: '#fee2e2', color: '#991b1b' }, Cancelled: { background: '#e5e7eb', color: '#4b5563' } }; const style = statusStyles[status] || { background: '#f3f4f6', color: '#4b5563' }; return <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{status}</span>; };
// --- ✅ FIX: Added a close button to the Modal component ---
const Modal = ({ title, children, onClose }: { title: string, children: ReactNode, onClose: () => void }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{title}</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            {children}
        </div>
    </div>
);
const ConfirmationModal = ({ message, onConfirm, onCancel, loading }: { message: string, onConfirm: () => void, onCancel: () => void, loading?: boolean }) => ( <Modal title="Confirm Action" onClose={onCancel}> <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p> <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}> <button onClick={onCancel} disabled={loading} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151'}}>Cancel</button> <button onClick={onConfirm} disabled={loading} style={{...buttonStyle, backgroundColor: '#2563eb', opacity: loading ? 0.6 : 1 }}> {loading ? 'Processing...' : 'Confirm'} </button> </div> </Modal> );
const ErrorModal = ({ message, onClose }: { message: string, onClose: () => void }) => ( <Modal title="Error" onClose={onClose}> <p style={{ color: '#b91c1c', marginBottom: '1.5rem' }}>{message}</p> <div style={{ display: 'flex', justifyContent: 'flex-end' }}> <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#ef4444' }}>Close</button> </div> </Modal> );

// --- Hidden PDF Content Component ---
const PDFContent = React.forwardRef<HTMLDivElement, { amc: Amc }>(({ amc }, ref) => {
    const pdfPageStyle: React.CSSProperties = { margin: '0', width: '210mm', minHeight: '297mm', backgroundColor: 'white', padding: '20mm', fontFamily: 'sans-serif' };

    return (
        <div ref={ref} style={pdfPageStyle}>
            <h1 style={{ fontSize: '24pt', marginBottom: '20px', color: '#111827' }}>Annual Maintenance Contract</h1>
            <p style={{ fontSize: '12pt', marginBottom: '30px', color: '#4b5563' }}><strong>AMC ID:</strong> {amc.amcId}</p>

            <h2 style={{ fontSize: '16pt', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '15px' }}>Client & Contract Information</h2>
            <p><strong>Client:</strong> {amc.clientInfo.name}</p>
            <p><strong>Phone:</strong> {amc.clientInfo.phone}</p>
            <p><strong>Email:</strong> {amc.clientInfo.email || 'N/A'}</p>
            <p><strong>Billing Address:</strong> {amc.clientInfo.billingAddress || 'N/A'}</p>
            <p><strong>Installation Address:</strong> {amc.clientInfo.installationAddress || 'N/A'}</p>
            <br/>
            <p><strong>Contract Period:</strong> {formatDate(amc.startDate)} to {formatDate(amc.endDate)}</p>
            <p><strong>Contract Amount:</strong> {formatCurrency(amc.contractAmount)}</p>

            <h2 style={{ fontSize: '16pt', borderBottom: '1px solid #ddd', paddingBottom: '5px', margin: '30px 0 15px 0' }}>Products Under Contract</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Product Name</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Serial Number</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Install Date</th>
                    </tr>
                </thead>
                <tbody>
                    {amc.productInstances.map((p, i) => (
                        <tr key={i}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{p.product?.name || 'Product Not Found'}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{p.serialNumber || 'N/A'}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(p.purchaseDate)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <h2 style={{ fontSize: '16pt', borderBottom: '1px solid #ddd', paddingBottom: '5px', margin: '30px 0 15px 0' }}>Service Schedule</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                 <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Visit #</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Scheduled Date</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Completed On</th>
                    </tr>
                </thead>
                <tbody>
                    {amc.serviceVisits.map((v, i) => (
                        <tr key={i}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i + 1}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(v.scheduledDate)}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{v.status}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(v.completedDate)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

// Add a display name for the forwarded ref component
PDFContent.displayName = 'PDFContent';

