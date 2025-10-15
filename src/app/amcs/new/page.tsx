"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

const GET_AMC_FORM_DATA = gql`
  query GetAmcFormData {
    clients { id name }
    products(type: "product") { id name }
  }
`;

const GET_INVOICE_DATA_FOR_AMC = gql`
    query GetInvoiceDataForAmc($id: ID!) {
        invoice(id: $id) {
            id
            client { id }
            lineItems {
                product { id }
            }
        }
    }
`;

const CREATE_AMC = gql`
  mutation CreateAMC($input: CreateAMCInput!) {
    createAMC(input: $input) {
      id
      amcId
    }
  }
`;

export default function CreateAmcPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromInvoiceId = searchParams.get('fromInvoice');

  // State management
  const [productInstances, setProductInstances] = useState([{ productId: '', serialNumber: '', purchaseDate: '' }]);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [frequencyPerYear, setFrequencyPerYear] = useState('4');
  const [serviceVisits, setServiceVisits] = useState<{ scheduledDate: string }[]>([]);

  const { data: formData, loading: formLoading } = useQuery(GET_AMC_FORM_DATA);
  const { data: invoiceData, loading: invoiceLoading } = useQuery(GET_INVOICE_DATA_FOR_AMC, {
      variables: { id: fromInvoiceId },
      skip: !fromInvoiceId,
  });

  // Pre-fill form if creating from an invoice
  useEffect(() => {
    if (invoiceData?.invoice) {
      const { invoice } = invoiceData;
      setClientId(invoice.client.id);
      const products = invoice.lineItems.map((item: any) => ({ productId: item.product?.id || '', serialNumber: '', purchaseDate: new Date().toISOString().split('T')[0] })).filter((p: any) => p.productId);
      if (products.length > 0) setProductInstances(products);
    }
  }, [invoiceData]);
  
  // --- FIX #1: Auto-calculate the end date ---
  useEffect(() => {
    if (startDate && !isNaN(new Date(startDate).getTime())) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(end.getDate() - 1); // Set to one day before the next year
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate]); // This effect runs only when the start date changes

  // --- FIX #2: Auto-calculate suggested service dates based on the FULL contract period ---
  useEffect(() => {
    const freq = parseInt(frequencyPerYear, 10);
    if (startDate && endDate && !isNaN(new Date(startDate).getTime()) && !isNaN(new Date(endDate).getTime()) && freq > 0) {
      const newVisits = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      const durationMs = end.getTime() - start.getTime();
      if (durationMs < 0) return; // Don't calculate if dates are invalid

      // If only 1 visit, schedule it on the start date.
      // Otherwise, distribute evenly between start and end.
      const intervalMs = freq > 1 ? durationMs / (freq - 1) : 0;

      for (let i = 0; i < freq; i++) {
        const visitTimestamp = start.getTime() + (i * intervalMs);
        const visitDate = new Date(visitTimestamp);
        newVisits.push({ scheduledDate: visitDate.toISOString().split('T')[0] });
      }
      setServiceVisits(newVisits);
    }
  }, [startDate, endDate, frequencyPerYear]); // Now depends on endDate as well


  const [createAMC, { loading: mutationLoading, error: mutationError }] = useMutation(CREATE_AMC, {
    onCompleted: (data) => {
      alert(`AMC ${data.createAMC.amcId} created successfully!`);
      router.push(`/amcs/${data.createAMC.id}`);
    },
    refetchQueries: ['GetAMCs', 'GetDashboardData']
  });

  const handleServiceDateChange = (index: number, value: string) => {
    const updatedVisits = [...serviceVisits];
    updatedVisits[index].scheduledDate = value;
    setServiceVisits(updatedVisits);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: any = { clientId, productInstances: productInstances.filter(p => p.productId), startDate, endDate, contractAmount: parseFloat(contractAmount), frequencyPerYear: parseInt(frequencyPerYear, 10), serviceVisits };
    if (fromInvoiceId) { input.originatingInvoiceId = fromInvoiceId; }
    if (input.productInstances.length === 0) { alert('Please add at least one product.'); return; }
    createAMC({ variables: { input } });
  };
  
  const handleProductChange = (index: number, field: string, value: string) => { const updatedInstances = [...productInstances]; (updatedInstances[index] as any)[field] = value; setProductInstances(updatedInstances); };
  const addProduct = () => { setProductInstances([...productInstances, { productId: '', serialNumber: '', purchaseDate: '' }]); };
  const removeProduct = (index: number) => { setProductInstances(productInstances.filter((_, i) => i !== index)); };

  if (formLoading || invoiceLoading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading form...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '2rem 1rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Create New AMC</h1>
          <button type="submit" disabled={mutationLoading} style={{...buttonStyle, opacity: mutationLoading ? 0.6 : 1 }}>
            {mutationLoading ? 'Saving...' : 'Create AMC'}
          </button>
        </div>
        
        <FormSection title="Client Details">
          <SelectField label="Client" name="clientId" value={clientId} onChange={(e: any) => setClientId(e.target.value)} options={formData?.clients} required disabled={!!fromInvoiceId} />
          {fromInvoiceId && <p style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem'}}>Client pre-selected from originating invoice.</p>}
        </FormSection>

        <FormSection title="Products Under Contract">
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {productInstances.map((instance, index) => (
                    <div key={index} style={{backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb'}}>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <SelectField label={`Product #${index + 1}`} value={instance.productId} onChange={(e: any) => handleProductChange(index, 'productId', e.target.value)} options={formData?.products} required disabled={!!fromInvoiceId} />
                            <InputField label="Serial Number" value={instance.serialNumber} onChange={(e: any) => handleProductChange(index, 'serialNumber', e.target.value)} />
                            <InputField label="Purchase / Install Date" type="date" value={instance.purchaseDate} onChange={(e: any) => handleProductChange(index, 'purchaseDate', e.target.value)} required />
                        </div>
                        {productInstances.length > 1 && !fromInvoiceId && (
                            <button type="button" onClick={() => removeProduct(index)} style={{...buttonStyle, backgroundColor: '#ef4444', padding: '0.4rem 0.8rem', fontSize: '0.875rem', marginTop: '1rem'}}>Remove Product</button>
                        )}
                    </div>
                ))}
            </div>
            {!fromInvoiceId && (
              <button type="button" onClick={addProduct} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151', marginTop: '1rem'}}>+ Add Another Product</button>
            )}
        </FormSection>
        
        <FormSection title="Contract Details">
          <div style={gridStyle}>
            <InputField label="Contract Start Date" name="startDate" type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} required />
            <InputField label="Contract End Date" name="endDate" type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} required />
            <InputField label="Contract Amount (AED)" name="contractAmount" type="number" step="0.01" value={contractAmount} onChange={(e: any) => setContractAmount(e.target.value)} required />
            <InputField label="Services per Year" name="frequencyPerYear" type="number" min="1" max="5" value={frequencyPerYear} onChange={(e: any) => setFrequencyPerYear(e.target.value)} required />
          </div>
        </FormSection>
        
        <FormSection title="Service Schedule">
            <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem'}}>
                The following service dates are automatically suggested. You can edit them if needed.
            </p>
            <div style={gridStyle}>
                {serviceVisits.map((visit, index) => (
                    <InputField 
                        key={index}
                        label={`Service Visit #${index + 1}`}
                        type="date"
                        value={visit.scheduledDate}
                        onChange={(e: any) => handleServiceDateChange(index, e.target.value)}
                    />
                ))}
            </div>
        </FormSection>
        
        {mutationError && <p style={{ color: 'red', textAlign: 'center' }}>{mutationError.message}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <Link href="/amcs" style={{...buttonStyle, backgroundColor: '#f3f4f6', color: '#374151'}}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}

// --- Helper Components & Styles ---
const FormSection = ({ title, children }: {title: string, children: React.ReactNode}) => (<div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}><h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2>{children}</div>);
const InputField = ({ label, ...props }: any) => (<div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label><input style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', outline: 'none' }} {...props} /></div>);
const SelectField = ({ label, options, ...props }: any) => (<div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label><select style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white' }} {...props}><option value="">Please select</option>{options?.map((opt: any) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}</select></div>);
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', textDecoration: 'none' };

