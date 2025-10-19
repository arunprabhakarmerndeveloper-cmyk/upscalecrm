"use client";

import { useQuery, gql } from '@apollo/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

// --- TypeScript Interfaces ---
interface Address {
  tag: string;
  address: string;
}

interface Quotation {
    id: string;
    quotationId: string;
    createdAt: string | number;
    status: string;
    totalAmount: number;
}

interface Invoice {
    id: string;
    invoiceId: string;
    issueDate: string | number | null;
    installationDate: string | number | null;
    status: string;
    totalAmount: number;
}

interface AMC {
    id: string;
    amcId: string;
    startDate: string | number;
    endDate: string | number;
    status: string;
    productInstances: {
        product: {
            name: string;
        }
    }[] | null;
}

interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  addresses: Address[] | null;
  createdAt: string | number;
  quotations: Quotation[] | null;
  invoices: Invoice[] | null;
  amcs: AMC[] | null;
}

interface ClientDetailsData {
  client: Client;
}

// --- GraphQL Query ---
const GET_CLIENT_DETAILS = gql`
  query GetClientDetails($id: ID!) {
    client(id: $id) {
      id
      name
      contactPerson
      phone
      email
      addresses {
        tag
        address
      }
      createdAt
      quotations {
        id
        quotationId
        createdAt
        status
        totalAmount
      }
      invoices {
        id
        invoiceId
        issueDate
        installationDate
        status
        totalAmount
      }
      amcs {
          id
          amcId
          startDate
          endDate
          status
          productInstances {
              product {
                  name
              }
          }
      }
    }
  }
`;

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

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);

// --- Main Page Component ---
export default function ClientDetailPage() {
    const params = useParams();
    const id = params.clientId as string;
    const [activeTab, setActiveTab] = useState('Quotations');
    
    const { loading, error, data } = useQuery<ClientDetailsData>(GET_CLIENT_DETAILS, { 
        variables: { id }, 
        skip: !id 
    });

    if (loading) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Loading client details...</div>;
    if (error) return <div style={{color: 'red', textAlign: 'center'}}>Error: {error.message}</div>;
    if (!data?.client) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Client not found.</div>;

    const { client } = data;

    const tabs = ['Quotations', 'Invoices', 'AMCs', 'Address'];

    return (
        <div style={{ maxWidth: '1200px', margin: 'auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{client.name}</h1>
                    <p style={{ color: '#6b7280' }}>
                        Client since {new Date(Number(client.createdAt)).toLocaleDateString('en-GB')}
                    </p>
                </div>
                <Link href={`/clients/edit/${client.id}`} style={buttonStyle}>Edit Client</Link>
            </div>
            
            <FormSection title="Contact Information">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <DetailItem label="Contact Person" value={client.contactPerson} />
                    <DetailItem label="Phone" value={client.phone} />
                    <DetailItem label="Email" value={client.email} />
                </div>
            </FormSection>

            {/* --- Tabbed Interface for Related Documents --- */}
            <FormSection>
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
                    {tabs.map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            style={{
                                ...tabButtonStyle,
                                color: activeTab === tab ? '#2563eb' : '#6b7280',
                                borderBottom: activeTab === tab ? '3px solid #2563eb' : '3px solid transparent',
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div>
                    {activeTab === 'Quotations' && <QuotationsTab quotations={client.quotations} />}
                    {activeTab === 'Invoices' && <InvoicesTab invoices={client.invoices} />}
                    {activeTab === 'AMCs' && <AMCsTab amcs={client.amcs} />}
                    {activeTab === 'Address' && <AddressesTab addresses={client.addresses} />}
                </div>
            </FormSection>
        </div>
    );
}

// --- Tab Content Components ---

const QuotationsTab = ({ quotations }: { quotations: Quotation[] | null }) => {
    if (!quotations || quotations.length === 0) return <p style={emptyStateStyle}>No quotations found for this client.</p>;
    return (
        <TableWrapper>
            <thead>
                <tr>
                    <th style={tableHeaderStyle}>Quotation ID</th>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={{...tableHeaderStyle, textAlign: 'right'}}>Amount</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {quotations.map(q => (
                    <tr key={q.id} style={tableRowStyle}>
                        <td style={tableCellStyle}>{q.quotationId}</td>
                        <td style={tableCellStyle}>{formatDate(q.createdAt)}</td>
                        <td style={tableCellStyle}><StatusBadge status={q.status} /></td>
                        <td style={{...tableCellStyle, textAlign: 'right'}}>{formatCurrency(q.totalAmount)}</td>
                        <td style={{...tableCellStyle, textAlign: 'center'}}><Link href={`/quotations/${q.id}`} style={actionButtonStyle}>View</Link></td>
                    </tr>
                ))}
            </tbody>
        </TableWrapper>
    );
};

const InvoicesTab = ({ invoices }: { invoices: Invoice[] | null }) => {
    if (!invoices || invoices.length === 0) return <p style={emptyStateStyle}>No invoices found for this client.</p>;
    return (
        <TableWrapper>
            <thead>
                <tr>
                    <th style={tableHeaderStyle}>Invoice ID</th>
                    <th style={tableHeaderStyle}>Issue Date</th>
                    <th style={tableHeaderStyle}>Installation Date</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={{...tableHeaderStyle, textAlign: 'right'}}>Amount</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {invoices.map(inv => (
                    <tr key={inv.id} style={tableRowStyle}>
                        <td style={tableCellStyle}>{inv.invoiceId}</td>
                        <td style={tableCellStyle}>{formatDate(inv.issueDate)}</td>
                        <td style={tableCellStyle}>{formatDate(inv.installationDate)}</td>
                        <td style={tableCellStyle}><StatusBadge status={inv.status} /></td>
                        <td style={{...tableCellStyle, textAlign: 'right'}}>{formatCurrency(inv.totalAmount)}</td>
                        <td style={{...tableCellStyle, textAlign: 'center'}}><Link href={`/invoices/${inv.id}`} style={actionButtonStyle}>View</Link></td>
                    </tr>
                ))}
            </tbody>
        </TableWrapper>
    );
};

const AMCsTab = ({ amcs }: { amcs: AMC[] | null }) => {
    if (!amcs || amcs.length === 0) return <p style={emptyStateStyle}>No AMCs found for this client.</p>;
    return (
        <TableWrapper>
            <thead>
                <tr>
                    <th style={tableHeaderStyle}>AMC ID</th>
                    <th style={tableHeaderStyle}>Products</th>
                    <th style={tableHeaderStyle}>Start Date</th>
                    <th style={tableHeaderStyle}>End Date</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {amcs.map(amc => (
                    <tr key={amc.id} style={tableRowStyle}>
                        <td style={tableCellStyle}>{amc.amcId}</td>
                        <td style={tableCellStyle}>{amc.productInstances?.map(p => p.product.name).join(', ') || 'N/A'}</td>
                        <td style={tableCellStyle}>{formatDate(amc.startDate)}</td>
                        <td style={tableCellStyle}>{formatDate(amc.endDate)}</td>
                        <td style={tableCellStyle}><StatusBadge status={amc.status} /></td>
                        <td style={{...tableCellStyle, textAlign: 'center'}}><Link href={`/amcs/${amc.id}`} style={actionButtonStyle}>View</Link></td>
                    </tr>
                ))}
            </tbody>
        </TableWrapper>
    );
};

const AddressesTab = ({ addresses }: { addresses: Address[] | null }) => {
    if (!addresses || addresses.length === 0) return <p style={emptyStateStyle}>No address found for this client.</p>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {addresses.map((addr, index) => (
                <DetailItem key={index} label={addr.tag} value={addr.address} />
            ))}
        </div>
    );
};


// --- Helper Components & Styles ---
const TableWrapper = ({ children }: { children: ReactNode }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            {children}
        </table>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles: Record<string, React.CSSProperties> = { 
        Draft: { background: '#f3f4f6', color: '#4b5563' }, Sent: { background: '#dbeafe', color: '#1d4ed8' }, 
        Approved: { background: '#d1fae5', color: '#065f46' }, Rejected: { background: '#fee2e2', color: '#991b1b' },
        Paid: { background: '#d1fae5', color: '#065f46' }, Overdue: { background: '#fee2e2', color: '#991b1b' },
        Active: { background: '#d1fae5', color: '#065f46' }, Expired: { background: '#fee2e-e2', color: '#991b1b' }
    };
    const style = statusStyles[status] || statusStyles['Draft'];
    return ( <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{status}</span> );
};

interface DetailItemProps { label: string; value: string | number | null | undefined; }
const DetailItem = ({ label, value }: DetailItemProps) => value ? ( <div style={{marginBottom: '1rem'}}> <p style={{fontSize: '0.875rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase'}}>{label}</p> <p style={{fontWeight: '500'}}>{value}</p> </div> ) : null;

const FormSection = ({ title, children }: { title?: string, children: ReactNode }) => ( <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}> {title && <h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2>} {children} </div> );

const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', height: 'fit-content' };
const actionButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const tabButtonStyle: React.CSSProperties = { padding: '0.75rem 1rem', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginBottom: '-2px' };
const emptyStateStyle: React.CSSProperties = { textAlign: 'center', padding: '2rem', color: '#6b7280' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', color: '#374151', verticalAlign: 'middle', whiteSpace: 'nowrap' };
const tableRowStyle: React.CSSProperties = { borderTop: '1px solid #f3f4f6' };

