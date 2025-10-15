"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

// A custom hook for responsive inline styles
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      if (media.matches !== matches) setMatches(media.matches);
      const listener = () => setMatches(media.matches);
      window.addEventListener("resize", listener);
      return () => window.removeEventListener("resize", listener);
    }
  }, [matches, query]);
  return matches;
};

// --- GraphQL Queries and Mutations ---
const GET_EDIT_FORM_DATA = gql`
  query GetEditQuotationFormData($id: ID!) {
    quotation(id: $id) {
      id
      client { id }
      clientInfo { name phone email }
      lineItems { 
        product { id } 
        quantity 
        price 
        description 
      }
      validUntil
      commercialTerms { title content }
    }
    products { id name price description }
    clients { id name }
  }
`;

const UPDATE_QUOTATION = gql`
  mutation UpdateQuotation($id: ID!, $input: UpdateQuotationInput!) {
    updateQuotation(id: $id, input: $input) {
      id
      quotationId
    }
  }
`;

// --- Main Component ---
export default function EditQuotationPage() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  // --- FIX #1: Correctly read the ID from the URL parameter ---
  const id = Array.isArray(params.quotationId) ? params.quotationId[0] : params.quotationId as string;
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // State Management
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '' });
  const [lineItems, setLineItems] = useState([{ productId: '', quantity: 1, price: 0, description: '' }]);
  const [validUntil, setValidUntil] = useState('');
  const [commercialTerms, setCommercialTerms] = useState<{title: string, content: string}[]>([]);
  const [updateReason, setUpdateReason] = useState('');

  const { data, loading: dataLoading, error: dataError } = useQuery(GET_EDIT_FORM_DATA, {
    variables: { id },
    skip: !id,
    onCompleted: (data) => {
      if (data && data.quotation) {
        const { quotation } = data;
        setClientInfo(quotation.clientInfo || { name: '', phone: '' });
        if (quotation.lineItems) { setLineItems(quotation.lineItems.map((item: any) => ({ productId: item.product?.id || '', quantity: item.quantity, price: item.price, description: item.description, }))); }
        if(quotation.validUntil) { setValidUntil(new Date(quotation.validUntil).toISOString().split('T')[0]); }
        if (quotation.commercialTerms) { setCommercialTerms(quotation.commercialTerms.map(({title, content}: any) => ({title, content}))); }
      }
    },
    onError: (error) => { console.error("Error fetching edit form data:", error); }
  });
  
  const [updateQuotation, { loading: mutationLoading, error: mutationError }] = useMutation(UPDATE_QUOTATION, {
    onCompleted: () => {
      alert(`Quotation updated successfully! A new version has been saved.`);
      router.push(`/quotations/${id}`); // This redirect will now work correctly
    },
    refetchQueries: ['GetQuotationDetails', 'GetDashboardData', 'GetQuotations']
  });

  const totalAmount = useMemo(() => lineItems.reduce((total, item) => total + (Number(item.quantity) * Number(item.price)), 0), [lineItems]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateReason) { alert('Please provide a reason for this update.'); return; }
    const input = {
      lineItems: lineItems.map(({ productId, quantity, price, description }) => ({ productId, quantity: parseInt(quantity.toString(), 10) || 1, price: parseFloat(price.toString()) || 0, description })),
      validUntil: validUntil || null,
      commercialTerms,
      reason: updateReason,
    };
    updateQuotation({ variables: { id, input } });
  };
  
  const addLineItem = () => setLineItems([...lineItems, { productId: '', quantity: 1, price: 0, description: '' }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  // --- FIX #2: More robust state update for line items ---
  const handleLineItemChange = (index: number, field: string, value: any) => {
    setLineItems(currentItems => 
        currentItems.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item, [field]: value };
                // If product is changed, autofill price and description
                if (field === 'productId' && data?.products) {
                    const selectedProduct = data.products.find((p: any) => p.id === value);
                    if (selectedProduct) {
                        updatedItem.price = selectedProduct.price;
                        updatedItem.description = selectedProduct.description;
                    }
                }
                return updatedItem;
            }
            return item;
        })
    );
  };
  // --- END OF FIX #2 ---

  const addCommercialTerm = () => setCommercialTerms([...commercialTerms, { title: '', content: '' }]);
  const removeCommercialTerm = (index: number) => setCommercialTerms(commercialTerms.filter((_, i) => i !== index));
  const handleTermChange = (index: number, field: 'title' | 'content', value: string) => { const updatedTerms = [...commercialTerms]; updatedTerms[index][field] = value; setCommercialTerms(updatedTerms); };

  if (!id || authLoading || dataLoading) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Loading form...</div>;
  if (dataError) return <div style={{color: 'red', textAlign: 'center'}}>Error loading data: {dataError.message}</div>;
  if (!data || !data.quotation) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Could not load quotation data to edit.</div>

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '2rem 1rem' }}>
        <form id="edit-quotation-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Edit Quotation</h1>
                <button type="submit" disabled={mutationLoading} style={{...buttonStyle, opacity: mutationLoading ? 0.6 : 1}}>
                    {mutationLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <FormSection title="Client Details (Read-only)">
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Name:</strong> {clientInfo.name}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Phone:</strong> {clientInfo.phone}</p>
            </FormSection>
            
            <FormSection title="Products & Services">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {lineItems.map((item, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: '1rem', alignItems: isDesktop ? 'flex-end' : 'stretch', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ flex: '5 1 0%', minWidth: isDesktop ? '150px' : 'auto' }}><SelectField label="Product" value={item.productId} onChange={(e: any) => handleLineItemChange(index, 'productId', e.target.value)} options={data?.products} placeholder="Select a product" /></div>
                    <div style={{ flex: '1 1 0%', minWidth: isDesktop ? '60px' : 'auto' }}><InputField label="Qty" type="number" min="1" value={item.quantity} onChange={(e: any) => handleLineItemChange(index, 'quantity', e.target.value)} /></div>
                    <div style={{ flex: '2 1 0%', minWidth: isDesktop ? '100px' : 'auto' }}><InputField label="Price (AED)" type="number" step="0.01" value={item.price} onChange={(e: any) => handleLineItemChange(index, 'price', e.target.value)} /></div>
                    <div style={{ flex: '0 0 auto' }}><button type="button" onClick={() => removeLineItem(index)} style={{ width: '100%', backgroundColor: '#ef4444', color: 'white', fontWeight: '600', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>Remove</button></div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addLineItem} style={{ marginTop: '1rem', backgroundColor: '#e5e7eb', color: '#374151', fontWeight: '600', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>+ Add Item</button>
            </FormSection>

            <FormSection title="Commercial Terms">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {commercialTerms.map((term, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: '1rem', alignItems: isDesktop ? 'center' : 'stretch', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ flex: '1 1 0%' }}><InputField placeholder="Title (e.g., Warranty)" value={term.title} onChange={(e: any) => handleTermChange(index, 'title', e.target.value)} /></div>
                    <div style={{ flex: '2 1 0%' }}><TextAreaField placeholder="Content..." value={term.content} onChange={(e: any) => handleTermChange(index, 'content', e.target.value)} /></div>
                    <div style={{ flex: '0 0 auto' }}><button type="button" onClick={() => removeCommercialTerm(index)} style={{ ...buttonStyle, backgroundColor: '#ef4444' }}>Remove</button></div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addCommercialTerm()} style={{ marginTop: '1rem', backgroundColor: '#e5e7eb', color: '#374151', fontWeight: '600', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>+ Add Custom Term</button>
            </FormSection>

            <FormSection title="Other Details">
                <InputField label="Valid Until" type="date" value={validUntil} onChange={(e: any) => setValidUntil(e.target.value)} />
            </FormSection>

            <FormSection title="Reason for Update">
                <InputField label="Reason for this change (Required)" value={updateReason} onChange={(e: any) => setUpdateReason(e.target.value)} required placeholder="e.g., Client requested change in quantity" />
            </FormSection>

            {mutationError && <p style={{ color: 'red', textAlign: 'center' }}>Error: {mutationError.message}</p>}
        </form>
    </div>
  );
}

// --- Helper Sub-components ---
const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => ( <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2> {children} </div> );
const InputField = ({ label, ...props }: any) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563' }}>{label}</label>} <input style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', outline: 'none' }} {...props} /> </div> );
const TextAreaField = ({ label, ...props }: any) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563' }}>{label}</label>} <textarea rows={3} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', outline: 'none' }} {...props} /> </div> );
const SelectField = ({ label, options, ...props }: any) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: '500', color: '#4b5563' }}>{label}</label>} <select style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', outline: 'none', backgroundColor: 'white' }} {...props}><option value="">Please select</option>{options?.map((opt: any) => (<option key={opt.id} value={opt.id}>{opt.name || opt.title}</option>))}</select> </div> );
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' };

