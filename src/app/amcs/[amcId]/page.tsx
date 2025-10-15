"use client";

import { useQuery, gql, useMutation } from '@apollo/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
// 'useState' was unused, so it's removed from imports. Add it back if you need it.

// --- TypeScript Interfaces based on your GraphQL Schema ---

interface ProductInstance {
  product: {
    name: string;
  };
  serialNumber: string | null;
  purchaseDate: string | number;
}

interface ServiceVisit {
  scheduledDate: string | number;
  completedDate?: string | number | null;
  status: string;
  notes: string;
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
    email: string;
  };
  productInstances: ProductInstance[];
  serviceVisits: ServiceVisit[];
}

interface AmcDetailsData {
  amc: Amc;
}

// --- GraphQL Queries ---

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
      clientInfo { name phone email }
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

export default function AmcDetailPage() {
  const params = useParams();
  const id = params.amcId as string;
  const { loading: authLoading } = useAuth();
  
  // Apply the AmcDetailsData interface to useQuery for full type safety
  const { loading, error, data, refetch } = useQuery<AmcDetailsData>(GET_AMC_DETAILS, { 
    variables: { id }, 
    skip: !id 
  });

  const [updateServiceStatus] = useMutation(UPDATE_SERVICE_STATUS, {
      onCompleted: () => refetch(),
      onError: (err) => alert(`Error updating service status: ${err.message}`)
  });

  // Type for dateValue is now more specific
  const formatDate = (dateValue: string | number | null | undefined) => {
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

  const handleServiceCheck = (index: number, currentStatus: string) => {
      const newStatus = currentStatus === 'Completed' ? 'Scheduled' : 'Completed';
      const completedDate = newStatus === 'Completed' ? new Date().toISOString() : undefined;
      
      if(window.confirm(`Mark service #${index + 1} as ${newStatus}?`)){
        updateServiceStatus({ variables: { amcId: id, visitIndex: index, status: newStatus, completedDate } });
      }
  };

  if (!id || authLoading || loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading AMC Details...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;
  if (!data?.amc) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>AMC not found.</div>;

  const { amc } = data;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '1rem 1rem 4rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800' }}>AMC Details</h1>
          <p style={{ color: '#4b5563', fontWeight: '500' }}>{amc.amcId}</p>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <StatusBadge status={amc.status} />
          <Link href={`/amcs/edit/${amc.id}`} style={{...buttonStyle, backgroundColor: '#f9fafb', color: '#374151', border: '1px solid #d1d5db'}}>Edit</Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={sectionStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <DetailItem label="Client" value={amc.clientInfo.name} />
                <DetailItem label="Contract Period" value={`${formatDate(amc.startDate)} - ${formatDate(amc.endDate)}`} />
                <DetailItem label="Contract Amount" value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amc.contractAmount)} />
                <DetailItem label="Created On" value={`${formatDate(amc.createdAt)} by ${amc.createdBy?.name || 'N/A'}`} />
            </div>
        </div>
        
        <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Products Under Contract</h3>
            {/* Using the ProductInstance interface for 'instance' */}
            {amc.productInstances.map((instance: ProductInstance, index: number) => (
                <div key={index} style={{ borderTop: index > 0 ? '1px solid #f3f4f6' : 'none', padding: '1rem 0' }}>
                    <p style={{fontWeight: '600'}}>{instance.product.name}</p>
                    <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Serial Number: {instance.serialNumber || 'N/A'}</p>
                    <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Install Date: {formatDate(instance.purchaseDate)}</p>
                </div>
            ))}
        </div>

        <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Service Schedule</h3>
            {/* Using the ServiceVisit interface for 'visit' */}
            {amc.serviceVisits.map((visit: ServiceVisit, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderTop: index > 0 ? '1px solid #f3f4f6' : 'none' }}>
                    <input type="checkbox" checked={visit.status === 'Completed'} onChange={() => handleServiceCheck(index, visit.status)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }} />
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
  );
}

// --- Helper Components & Styles with Type Safety ---

interface DetailItemProps {
  label: string;
  value: string | number;
}
const DetailItem = ({ label, value }: DetailItemProps) => (<div style={{ padding: '0.25rem 0' }}><p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase' }}>{label}</p><p style={{ fontWeight: '600', color: '#111827' }}>{value}</p></div>);

const StatusBadge = ({ status }: { status: string }) => { 
  // This is a much safer type for an object with string keys and CSS property values
  const statusStyles: Record<string, React.CSSProperties> = { 
    Active: { background: '#d1fae5', color: '#065f46' }, 
    Expired: { background: '#fee2e2', color: '#991b1b' }, 
    Cancelled: { background: '#e5e7eb', color: '#4b5563' }
  }; 
  const style = statusStyles[status] || { background: '#f3f4f6', color: '#4b5563' }; 
  return <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{status}</span>; 
};

const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer' };
const sectionStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' };
const sectionHeaderStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' };