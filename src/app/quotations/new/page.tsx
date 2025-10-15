"use client";

import { useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

// --- TypeScript Interfaces ---

// State Management Types
interface ClientInfoState {
  name: string;
  phone: string;
  email: string;
}
interface LineItemState {
  productId: string;
  quantity: number | string;
  price: number | string;
  description: string;
}
interface CommercialTermState {
  title: string;
  content: string;
}

// GraphQL Data Types
interface SelectOption {
  id: string;
  name: string;
}
interface ProductOption extends SelectOption {
  price: number;
  description: string | null;
}
interface GetQuotationFormData {
  clients: SelectOption[];
  products: ProductOption[];
}

// Mutation Input Type
interface CreateQuotationInput {
  lineItems: {
    productId: string;
    quantity: number;
    price: number;
    description: string;
  }[];
  validUntil: string | null;
  commercialTerms: CommercialTermState[];
  clientId?: string;
  clientInfo?: ClientInfoState;
}

// --- GraphQL Queries and Mutations ---

const GET_FORM_DATA = gql`
  query GetQuotationFormData {
    clients { id name }
    products { id name price description }
  }
`;

const CREATE_QUOTATION = gql`
  mutation CreateQuotation($input: CreateQuotationInput!) {
    createQuotation(input: $input) {
      id
      quotationId
    }
  }
`;

// --- Main Component ---
export default function CreateQuotationPage() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();

  // State Management with Types
  const [clientType, setClientType] = useState<'new' | 'existing'>('new');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientInfo, setClientInfo] = useState<ClientInfoState>({ name: '', phone: '', email: '' });
  const [lineItems, setLineItems] = useState<LineItemState[]>([{ productId: '', quantity: 1, price: 0, description: '' }]);
  const [validUntil, setValidUntil] = useState('');
  const [commercialTerms, setCommercialTerms] = useState<CommercialTermState[]>([
      { title: 'Payment Terms', content: '70% upon confirmation (Advance)\n30% on delivery' },
      { title: 'Warranty of system', content: '1 year for water filtration system against leakage and electrical components all warranties are against manufacturing defect only.' },
      { title: 'Plant Delivery Date', content: '3-4 Days from the receipt of confirmed order with advance payment.' }
  ]);

  const { data, loading: dataLoading, error: dataError } = useQuery<GetQuotationFormData>(GET_FORM_DATA);
  
  const [createQuotation, { loading: mutationLoading, error: mutationError }] = useMutation(CREATE_QUOTATION, {
    onCompleted: (data) => {
      const newQuotationId = data.createQuotation.id;
      alert(`Quotation ${data.createQuotation.quotationId} created successfully!`);
      router.push(`/quotations/${newQuotationId}`);
    },
    refetchQueries: ['GetDashboardData', 'GetQuotations']
  });

  const totalAmount = useMemo(() => {
    return lineItems.reduce((total, item) => total + (Number(item.quantity) * Number(item.price)), 0);
  }, [lineItems]);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateQuotationInput = {
      lineItems: lineItems.map(({ productId, quantity, price, description }) => ({
        productId,
        quantity: parseInt(String(quantity), 10),
        price: parseFloat(String(price)),
        description
      })),
      validUntil: validUntil || null,
      commercialTerms: commercialTerms.filter(term => term.title && term.content),
    };

    if (clientType === 'existing') {
      if (!selectedClientId) { alert('Please select an existing client.'); return; }
      input.clientId = selectedClientId;
    } else {
      if (!clientInfo.name || !clientInfo.phone) { alert('Please enter a name and phone for the new lead.'); return; }
      input.clientInfo = clientInfo;
    }
    
    createQuotation({ variables: { input } });
  };

  const addCommercialTerm = () => setCommercialTerms([...commercialTerms, { title: '', content: '' }]);
  const removeCommercialTerm = (index: number) => setCommercialTerms(commercialTerms.filter((_, i) => i !== index));
  const handleTermChange = (index: number, field: keyof CommercialTermState, value: string) => {
    const updatedTerms = [...commercialTerms];
    updatedTerms[index][field] = value;
    setCommercialTerms(updatedTerms);
  };

  const addLineItem = () => setLineItems([...lineItems, { productId: '', quantity: 1, price: 0, description: '' }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  // --- FINAL FIX: Refactored to be fully type-safe without 'any' ---
  const handleLineItemChange = (index: number, field: keyof LineItemState, value: string | number) => {
    setLineItems(currentItems => 
        currentItems.map((item, i) => {
            if (i !== index) {
                return item;
            }

            const updatedItem = { ...item, [field]: value };

            if (field === 'productId' && data?.products) {
                const selectedProduct = data.products.find(p => p.id === value);
                if (selectedProduct) {
                    updatedItem.price = selectedProduct.price;
                    updatedItem.description = selectedProduct.description || '';
                }
            }
            return updatedItem;
        })
    );
  };
  
  if (authLoading || dataLoading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading form...</div>;
  if (dataError) return <div style={{color: 'red'}}>Error loading data: {dataError.message}</div>;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Create New Quotation</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={formSectionStyle}>
          <h2 style={sectionHeaderStyle}>Client Details</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="clientType" value="new" checked={clientType === 'new'} onChange={() => setClientType('new')} /> New Lead
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="clientType" value="existing" checked={clientType === 'existing'} onChange={() => setClientType('existing')} /> Existing Client
            </label>
          </div>
          {clientType === 'new' ? (
            <div style={gridStyle}>
              <InputField label="Name" value={clientInfo.name} onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })} required />
              <InputField label="Phone" value={clientInfo.phone} onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })} required />
              <InputField label="Email" value={clientInfo.email} onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })} type="email" />
            </div>
          ) : (
            <div style={gridStyle}>
                <SelectField label="Select Client" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} options={data?.clients} required />
            </div>
          )}
        </div>

        <div style={{...formSectionStyle, padding: '2rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
            <h2 style={{...sectionHeaderStyle, fontSize: '1.35rem', color: '#1f2937', borderBottom: '2px solid #2563eb', display: 'inline-block', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>Products & Services</h2>
            <div style={{overflowX: 'auto', marginBottom: '1.5rem'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '0.75rem' }}>Product</th>
                            <th style={{ padding: '0.75rem', width: '90px' }}>Qty</th>
                            <th style={{ padding: '0.75rem', width: '120px' }}>Price (AED)</th>
                            <th style={{ padding: '0.75rem', width: '120px' }}>Total</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineItems.map((item, index) => (
                        <tr key={index} style={{borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb'}}>
                            <td style={{ padding: '0.75rem' }}><SelectField value={item.productId} onChange={(e) => handleLineItemChange(index, 'productId', e.target.value)} options={data?.products} placeholder="Select product" /></td>
                            <td style={{ padding: '0.75rem' }}><InputField type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} /></td>
                            <td style={{ padding: '0.75rem' }}><InputField type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', e.target.value)} /></td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(Number(item.quantity) * Number(item.price) || 0)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}><button type="button" onClick={() => removeLineItem(index)} style={{backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', cursor: 'pointer'}}>Remove</button></td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" onClick={addLineItem} style={{...buttonStyle, backgroundColor: '#2563eb', padding: '0.6rem 1.25rem', borderRadius: '0.5rem'}}>+ Add Item</button>
        </div>

        <div style={{...formSectionStyle, padding: '2rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
            <h2 style={{...sectionHeaderStyle, fontSize: '1.35rem', color: '#1f2937', borderBottom: '2px solid #2563eb', display: 'inline-block', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>Commercial Terms</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {commercialTerms.map((term, index) => (
                <div key={index} style={{display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', position: 'relative'}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <InputField placeholder="Term Title (e.g., Payment Terms)" value={term.title} onChange={(e) => handleTermChange(index, 'title', e.target.value)} />
                        <button type="button" onClick={() => removeCommercialTerm(index)} style={{backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', height: 'fit-content', cursor: 'pointer'}}>Remove</button>
                    </div>
                    <TextAreaField placeholder="Enter detailed term..." value={term.content} onChange={(e) => handleTermChange(index, 'content', e.target.value)} />
                </div>
                ))}
            </div>
            <button type="button" onClick={addCommercialTerm} style={{...buttonStyle, backgroundColor: '#2563eb', marginTop: '1.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.5rem'}}>+ Add Term</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', maxWidth: '350px', ...formSectionStyle, padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700' }}>
                        <span>Total Amount:</span>
                        <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalAmount)}</span>
                    </div>
                </div>
            </div>
            <div style={formSectionStyle}>
                <InputField label="Valid Until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
        </div>

        <div>
            {mutationError && <p style={{ color: 'red', marginBottom: '1rem' }}>Error creating quotation: {mutationError.message}</p>}
            <button type="submit" disabled={mutationLoading} style={{...buttonStyle, width: '100%', padding: '0.75rem', fontSize: '1rem', opacity: mutationLoading ? 0.6 : 1 }}>
                {mutationLoading ? 'Saving...' : 'Create Quotation'}
            </button>
        </div>
      </form>
    </div>
  );
}

// --- Typed Helper Sub-components ---
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}
const InputField = ({ label, ...props }: InputFieldProps) => (
    <div>
        {label && <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>}
        <input style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} {...props} />
    </div>
);

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}
const TextAreaField = ({ label, ...props }: TextAreaFieldProps) => (
    <div>
        {label && <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>}
        <textarea style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '40px' }} {...props} />
    </div>
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options?: SelectOption[];
    placeholder?: string;
}
const SelectField = ({ label, options, placeholder, ...props }: SelectFieldProps) => (
    <div>
        {label && <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>}
        <select style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} {...props}>
            <option value="">{placeholder || 'Please select'}</option>
            {options?.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
        </select>
    </div>
);

// --- Reusable Styles ---
const formSectionStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' };
const sectionHeaderStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' };
const gridStyle: React.CSSProperties = { display: 'flex', flexDirection: "column", gap: '1rem', margin: "20px" };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' };