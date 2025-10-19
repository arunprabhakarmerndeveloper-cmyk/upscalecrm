"use client";

import { useState, useMemo, useEffect, FormEvent, ChangeEvent, ReactNode } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

// --- TypeScript Interfaces ---
interface ClientInfoState {
  name: string;
  phone: string;
  email: string | null;
  billingAddress: string | null;
  installationAddress: string | null;
}
interface LineItemState {
  productId: string;
  quantity: number | string;
  price: number | string;
  description: string;
  __typename?: string;
}
interface CommercialTermState {
  title: string;
  content: string;
  __typename?: string;
}
interface SelectOption {
  id: string;
  name: string;
}
interface ProductOption extends SelectOption {
  price: number;
  description: string | null;
}
interface LineItemForEdit {
  product: { id: string } | null;
  quantity: number;
  price: number;
  description: string;
}
interface QuotationForEdit {
  id: string;
  clientInfo: ClientInfoState;
  lineItems: LineItemForEdit[] | null;
  validUntil: string | number | null;
  commercialTerms: CommercialTermState[] | null;
}
interface GetEditQuotationFormData {
  quotation: QuotationForEdit;
  products: ProductOption[];
}
interface LineItemInput {
    productId: string;
    quantity: number;
    price: number;
    description: string;
}
interface UpdateQuotationInput {
  lineItems: LineItemInput[];
  validUntil?: string | null;
  commercialTerms?: Omit<CommercialTermState, '__typename'>[];
  reason: string;
  totalAmount: number;
}

// --- GraphQL ---
const GET_EDIT_FORM_DATA = gql`
  query GetEditQuotationFormData($id: ID!) {
    quotation(id: $id) {
      id
      clientInfo { name phone email billingAddress installationAddress }
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
  
  const id = Array.isArray(params.quotationId) ? params.quotationId[0] : params.quotationId as string;

  const [clientInfo, setClientInfo] = useState<ClientInfoState | null>(null);
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [commercialTerms, setCommercialTerms] = useState<CommercialTermState[]>([]);
  const [updateReason, setUpdateReason] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data, loading: dataLoading, error: dataError } = useQuery<GetEditQuotationFormData>(GET_EDIT_FORM_DATA, {
    variables: { id },
    skip: !id,
    onCompleted: (data) => {
      if (data?.quotation) {
        const { quotation } = data;
        setClientInfo(quotation.clientInfo);
        if (quotation.lineItems) { 
          setLineItems(quotation.lineItems.map(item => ({ 
            productId: item.product?.id || '', 
            quantity: item.quantity, 
            price: item.price, 
            description: item.description, 
          }))); 
        }
        if (quotation.validUntil) { 
          setValidUntil(new Date(Number(quotation.validUntil)).toISOString().split('T')[0]); 
        }
        if (quotation.commercialTerms) { 
          setCommercialTerms(quotation.commercialTerms); 
        }
      }
    },
    onError: (error) => { console.error("Error fetching edit form data:", error); }
  });
  
  const [updateQuotation, { loading: mutationLoading, error: mutationError }] = useMutation(UPDATE_QUOTATION, {
    onCompleted: () => {
      setShowSuccessModal(true);
    },
    refetchQueries: ['GetQuotationDetails', 'GetDashboardData', 'GetQuotations']
  });

  const totalAmount = useMemo(() => lineItems.reduce((total, item) => total + (Number(item.quantity) * Number(item.price)), 0), [lineItems]);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!updateReason) { alert('Please provide a reason for this update.'); return; }
    
    const input: UpdateQuotationInput = {
      lineItems: lineItems.map(({ productId, quantity, price, description }) => ({ 
        productId, 
        quantity: parseInt(String(quantity), 10) || 1, 
        price: parseFloat(String(price)) || 0, 
        description 
      })),
      validUntil: validUntil || null,
      commercialTerms: commercialTerms.map(({ title, content }) => ({ title, content })),
      reason: updateReason,
      totalAmount: totalAmount,
    };
    updateQuotation({ variables: { id, input } });
  };
  
  const addLineItem = () => setLineItems([...lineItems, { productId: '', quantity: 1, price: 0, description: '' }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  const handleLineItemChange = (index: number, field: keyof Omit<LineItemState, '__typename'>, value: string | number) => {
    setLineItems(currentItems => 
        currentItems.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'productId' && data?.products) {
                    const selectedProduct = data.products.find((p) => p.id === value);
                    if (selectedProduct) {
                        updatedItem.price = selectedProduct.price;
                        updatedItem.description = selectedProduct.description || '';
                    }
                }
                return updatedItem;
            }
            return item;
        })
    );
  };

  const addCommercialTerm = () => setCommercialTerms([...commercialTerms, { title: '', content: '' }]);
  const removeCommercialTerm = (index: number) => setCommercialTerms(commercialTerms.filter((_, i) => i !== index));
  const handleTermChange = (index: number, field: keyof Omit<CommercialTermState, '__typename'>, value: string) => { 
    const updatedTerms = [...commercialTerms]; 
    updatedTerms[index][field] = value; 
    setCommercialTerms(updatedTerms); 
  };

  if (!id || authLoading || dataLoading) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Loading form...</div>;
  if (dataError) return <div style={{color: 'red', textAlign: 'center'}}>Error loading data: {dataError.message}</div>;
  if (!data?.quotation || !clientInfo) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Could not load quotation data to edit.</div>

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '2rem 1rem 4rem 1rem' }}>
        {showSuccessModal && (
            <SuccessModal 
                message="Quotation updated successfully!"
                onClose={() => {
                    setShowSuccessModal(false);
                    router.push(`/quotations/${id}`);
                }}
            />
        )}
        <form id="edit-quotation-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Edit Quotation</h1>
                <button type="submit" disabled={mutationLoading} style={{...buttonStyle, opacity: mutationLoading ? 0.6 : 1, backgroundColor: '#10b981', color: 'white' }}>
                    {mutationLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <FormSection title="Client Details (Read-only)">
                
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Name:</strong> {clientInfo.name}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Email:</strong> {clientInfo.email}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Phone:</strong> {clientInfo.phone}</p>
              </div>
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Billing Address:</strong> {clientInfo.billingAddress}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ color: '#4b5563' }}>Installation Address:</strong> {clientInfo.installationAddress}</p>
            </FormSection>
            
            <FormSection title="Products & Services">
                <div style={{overflowX: 'auto', marginBottom: '1.5rem'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
                        <thead style={{borderBottom: '1px solid #e5e7eb'}}>
                            <tr>
                                <th style={{...tableHeaderStyle, width: '40%'}}>Product</th>
                                <th style={{...tableHeaderStyle, width: '15%'}}>Qty</th>
                                <th style={{...tableHeaderStyle, width: '20%'}}>Price (AED)</th>
                                <th style={{...tableHeaderStyle, width: '20%', textAlign: 'right'}}>Total</th>
                                <th style={{...tableHeaderStyle, width: '5%', textAlign: 'center'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((item, index) => (
                            <tr key={index} style={{borderBottom: '1px solid #f3f4f6'}}>
                                <td style={tableCellStyle}><SelectField value={item.productId} onChange={(e) => handleLineItemChange(index, 'productId', e.target.value)} options={data?.products} placeholder="Select product" /></td>
                                <td style={tableCellStyle}><InputField type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} /></td>
                                <td style={tableCellStyle}><InputField type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', e.target.value)} /></td>
                                <td style={{...tableCellStyle, fontWeight: 600, textAlign: 'right' }}>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(Number(item.quantity) * Number(item.price) || 0)}</td>
                                <td style={{...tableCellStyle, textAlign: 'center' }}><button type="button" onClick={() => removeLineItem(index)} style={{...buttonStyle, backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.5rem'}}>X</button></td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button type="button" onClick={addLineItem} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151'}}>+ Add Item</button>
            </FormSection>

            <FormSection title="Commercial Terms">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {commercialTerms.map((term, index) => (
                    <div key={index} style={{display: 'flex', gap: '1rem', alignItems: 'flex-start'}}>
                        <div style={{flexGrow: 1}}><InputField placeholder="Term Title (e.g., Payment Terms)" value={term.title} onChange={(e) => handleTermChange(index, 'title', e.target.value)} /></div>
                        <div style={{flexGrow: 2}}><TextAreaField placeholder="Enter detailed term..." value={term.content} onChange={(e) => handleTermChange(index, 'content', e.target.value)} /></div>
                        <button type="button" onClick={() => removeCommercialTerm(index)} style={{...buttonStyle, backgroundColor: '#fee2e2', color: '#ef4444', height: 'fit-content', alignSelf: 'center'}}>Remove</button>
                    </div>
                    ))}
                </div>
                <button type="button" onClick={addCommercialTerm} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151', marginTop: '1.5rem'}}>+ Add Term</button>
            </FormSection>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700', alignItems: 'center' }}>
                        <span>Total Amount:</span>
                        <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalAmount)}</span>
                    </div>
                    <InputField label="Valid Until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
            </div>

            <FormSection title="Reason for Update">
                <InputField label="Reason for this change (Required)" value={updateReason} onChange={(e) => setUpdateReason(e.target.value)} required placeholder="e.g., Client requested change in quantity" />
            </FormSection>

            {mutationError && <p style={{ color: "red", textAlign: "center" }}>{mutationError.message}</p>}
        </form>
    </div>
  );
}

// --- Helper Components & Styles ---

const SuccessModal = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ margin: '0 auto 1rem auto', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg style={{ width: '24px', height: '24px', color: '#065f46' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Success</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p>
            <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#10b981', color: 'white', width: '100%' }}>OK</button>
        </div>
    </div>
);

const FormSection = ({ title, children }: { title: string; children: ReactNode }) => ( <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' }}><h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2>{children}</div>);
const InputField = ({ label, ...props }: {label?: string} & React.InputHTMLAttributes<HTMLInputElement>) => ( <div>{label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>}<input style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props} /></div>);
const TextAreaField = ({ label, ...props }: {label?: string} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => ( <div>{label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>}<textarea style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', minHeight: '80px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props} /></div>);
const SelectField = ({ label, options, placeholder, ...props }: {label?: string, options?: (ProductOption | SelectOption)[], placeholder?: string} & React.SelectHTMLAttributes<HTMLSelectElement>) => ( <div>{label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>}<select style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props}><option value="">{placeholder || 'Please select'}</option>{options?.map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}</select></div>);
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' };
const tableHeaderStyle: React.CSSProperties = { padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' };
const tableCellStyle: React.CSSProperties = { padding: '0.75rem' };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' };
