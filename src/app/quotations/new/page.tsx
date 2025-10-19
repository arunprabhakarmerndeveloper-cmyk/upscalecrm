"use client";

import React, { useState, useMemo, FormEvent, ReactNode, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';

// --- TypeScript Interfaces ---
interface Address {
  tag: string;
  address: string;
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
interface SelectOption {
  id: string;
  name: string;
}
interface ClientOption extends SelectOption {
    addresses?: Address[];
}
interface ProductOption extends SelectOption {
  price: number;
  description: string | null;
}
interface GetQuotationFormData {
  clients: ClientOption[];
  products: ProductOption[];
}
interface CreateQuotationInput {
  clientId: string;
  billingAddress: string;
  installationAddress: string;
  lineItems: { productId: string; quantity: number; price: number; description: string; }[];
  validUntil: string | null;
  commercialTerms: CommercialTermState[];
  imageUrls?: string[];
}

// --- GraphQL (Cleaned) ---
const GET_FORM_DATA = gql`
  query GetQuotationFormData {
    clients { id name addresses { tag address } }
    products { id name price description }
  }
`;
const CREATE_QUOTATION = gql`
  mutation CreateQuotation($input: CreateQuotationInput!) {
    createQuotation(input: $input) { id, quotationId }
  }
`;

// --- Main Component ---
export default function CreateQuotationPage() {
  const router = useRouter();

  // --- State Hooks ---
  const [clientId, setClientId] = useState('');
  const [clientAddresses, setClientAddresses] = useState<Address[]>([]);
  const [billingAddress, setBillingAddress] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [isSameAddress, setIsSameAddress] = useState(true);
  
  const [lineItems, setLineItems] = useState<LineItemState[]>([{ productId: '', quantity: 1, price: 0, description: '' }]);
  const [validUntil, setValidUntil] = useState('');
  const [commercialTerms, setCommercialTerms] = useState<CommercialTermState[]>([
      { title: 'Payment Terms', content: '70% upon confirmation (Advance)\n30% on delivery' },
      { title: 'Warranty of system', content: '1 year for water filtration system against leakage and electrical components all warranties are against manufacturing defect only.' },
  ]);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [modalInfo, setModalInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newQuotationId, setNewQuotationId] = useState<string | null>(null);

  const { data, loading: dataLoading, error: dataError } = useQuery<GetQuotationFormData>(GET_FORM_DATA);
  
  const [createQuotation, { loading: mutationLoading, error: mutationError }] = useMutation(CREATE_QUOTATION, {
    onCompleted: (data) => {
      setNewQuotationId(data.createQuotation.id);
      setModalInfo({ 
        message: `Quotation ${data.createQuotation.quotationId} created successfully!`,
        type: 'success',
      });
    },
    onError: (error) => {
      setModalInfo({ message: error.message, type: 'error' });
    },
    refetchQueries: ['GetDashboardData', 'GetQuotations']
  });

  // --- Effects ---
  useEffect(() => {
    const selectedClient = data?.clients.find(c => c.id === clientId);
    if (selectedClient?.addresses) {
      setClientAddresses(selectedClient.addresses);
      const firstAddress = selectedClient.addresses[0]?.address || '';
      setBillingAddress(firstAddress);
    } else {
      setClientAddresses([]);
      setBillingAddress('');
    }
  }, [clientId, data]);

  useEffect(() => {
    if (isSameAddress) {
      setInstallationAddress(billingAddress);
    }
  }, [isSameAddress, billingAddress]);

  const totalAmount = useMemo(() => {
    return lineItems.reduce((total, item) => total + (Number(item.quantity) * Number(item.price)), 0);
  }, [lineItems]);
  
  // --- Handlers ---
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
  
    setIsUploading(true);
  
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const timestamp = Math.round(Date.now() / 1000);
        const paramsToSign = { timestamp, folder: process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER! };
  
        const signatureResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paramsToSign }),
        });
  
        if (!signatureResponse.ok) {
          const errorBody = await signatureResponse.json();
          throw new Error(`Failed to get upload signature: ${errorBody.error || 'Server error'}`);
        }
  
        const { signature } = await signatureResponse.json();
  
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER!);
  
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
  
        const uploadResponse = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData,
        });
  
        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.json();
            throw new Error(`Cloudinary upload failed: ${errorBody.error?.message || 'Unknown error'}`);
        }
        
        const uploadData = await uploadResponse.json();
        return uploadData.secure_url;
      } catch (error) {
        console.error('Image upload error:', error);
        setModalInfo({ message: `An image failed to upload: ${error instanceof Error ? error.message : 'Please try again.'}`, type: 'error' });
        return null;
      }
    });
  
    const uploadedUrls = await Promise.all(uploadPromises);
    const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);
  
    setImageUrls(prev => [...prev, ...successfulUrls]);
    setIsUploading(false);
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!clientId) {
      setModalInfo({ message: 'Please select a client.', type: 'error' });
      return;
    }

    const finalLineItems = lineItems.map(({ productId, quantity, price, description }) => ({
      productId, quantity: parseInt(String(quantity), 10), price: parseFloat(String(price)), description
    })).filter(item => item.productId);

    if (finalLineItems.length === 0) {
      setModalInfo({ message: 'Please add at least one product to the quotation.', type: 'error' });
      return;
    }

    const input: CreateQuotationInput = {
      clientId,
      billingAddress,
      installationAddress,
      lineItems: finalLineItems,
      validUntil: validUntil || null,
      commercialTerms: commercialTerms.filter(term => term.title && term.content),
      imageUrls: imageUrls,
    };
    
    createQuotation({ variables: { input } });
  };
  
  const addCommercialTerm = () => setCommercialTerms([...commercialTerms, { title: '', content: '' }]);
  const removeCommercialTerm = (index: number) => setCommercialTerms(commercialTerms.filter((_, i) => i !== index));
  const handleTermChange = (index: number, field: keyof CommercialTermState, value: string) => { const newTerms = [...commercialTerms]; (newTerms[index] as any)[field] = value; setCommercialTerms(newTerms); };
  
  const addLineItem = () => setLineItems([...lineItems, { productId: '', quantity: 1, price: 0, description: '' }]);
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
  const handleLineItemChange = (index: number, field: keyof LineItemState, value: string | number) => {
    setLineItems(currentItems => 
        currentItems.map((item, i) => {
            if (i !== index) { return item; }
            const updatedItem = { ...item, [field]: value };
            if (field === 'productId' && data?.products) {
                const product = data.products.find(p => p.id === value);
                if (product) { updatedItem.price = product.price; updatedItem.description = product.description || ''; }
            }
            return updatedItem;
        })
    );
  };

  const handleCloseModal = () => {
    if (modalInfo?.type === 'success' && newQuotationId) {
      router.push(`/quotations/${newQuotationId}`);
    } else {
      setModalInfo(null);
    }
  };
  
  if (dataLoading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading form...</div>;
  if (dataError) return <div style={{color: 'red'}}>Error loading data: {dataError.message}</div>;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '2rem 1rem 4rem 1rem' }}>
      {modalInfo && <Modal type={modalInfo.type} message={modalInfo.message} onClose={handleCloseModal} />}

      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>Create New Quotation</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <FormSection title="Client Details">
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <SelectField label="Select Client" value={clientId} onChange={(e) => setClientId(e.target.value)} options={data?.clients} required />
                
                {clientId && (
                  <>
                    <AddressSelectField
                      label="Billing Address"
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      addresses={clientAddresses}
                      required
                    />
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <input type="checkbox" id="sameAddress" checked={isSameAddress} onChange={(e) => setIsSameAddress(e.target.checked)} />
                        <label htmlFor="sameAddress" style={{fontWeight: '500', color: '#4b5563'}}>Installation address is same as billing address</label>
                    </div>

                    {!isSameAddress && (
                        <AddressSelectField
                            label="Installation Address"
                            value={installationAddress}
                            onChange={(e) => setInstallationAddress(e.target.value)}
                            addresses={clientAddresses}
                            required
                        />
                    )}
                  </>
                )}
            </div>
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

        <FormSection title="Images">
          <div style={imageUploadContainerStyle}>
            <label htmlFor="image-upload" style={isUploading ? {...uploadButtonStyle, ...uploadButtonDisabledStyle} : uploadButtonStyle}>
              {isUploading ? 'Uploading...' : 'Upload Images'}
            </label>
            <input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
          </div>
          {imageUrls.length > 0 && (
            <div style={imagePreviewGridStyle}>
              {imageUrls.map((url, index) => (
                <div key={index} style={imagePreviewItemStyle}>
                  <img src={url} alt={`Quotation image ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    style={removeImageButtonStyle}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
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
        <div>
            {mutationError && <p style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>Error: {mutationError.message}</p>}
            <button type="submit" disabled={mutationLoading || isUploading} style={{...buttonStyle, width: '100%', padding: '0.75rem', fontSize: '1rem', backgroundColor: '#10b981', color: 'white', opacity: (mutationLoading || isUploading) ? 0.6 : 1 }}>
                {(mutationLoading || isUploading) ? 'Saving...' : 'Create Quotation'}
            </button>
        </div>
      </form>
    </div>
  );
}

// --- Helper Components & Styles ---

const Modal = ({ type, message, onClose }: { type: 'success' | 'error', message: string, onClose: () => void }) => {
  const isSuccess = type === 'success';
  const title = isSuccess ? 'Success' : 'Error';
  const iconColor = isSuccess ? '#10b981' : '#ef4444';
  const buttonColor = isSuccess ? '#10b981' : '#ef4444';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '1.5rem 2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ margin: '0 auto 1rem auto', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: isSuccess ? '#d1fae5' : '#fee2e2', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isSuccess ? (
            <svg style={{ width: '24px', height: '24px', color: iconColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg style={{ width: '24px', height: '24px', color: iconColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          )}
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{title}</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p>
        <button onClick={onClose} style={{...buttonStyle, backgroundColor: buttonColor, color: 'white', width: '100%' }}>OK</button>
      </div>
    </div>
  );
};

const FormSection = ({ title, children }: {title: string, children: ReactNode}) => ( <div style={formSectionStyle}> <h2 style={sectionHeaderStyle}>{title}</h2> {children} </div> );
const InputField = ({ label, ...props }: {label?: string} & React.InputHTMLAttributes<HTMLInputElement>) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>} <input style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props} /> </div> );
const TextAreaField = ({ label, ...props }: {label?: string} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>} <textarea style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', minHeight: '80px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props} /> </div> );
const SelectField = ({ label, options, placeholder, ...props }: {label?: string, options?: (SelectOption)[], placeholder?: string} & React.SelectHTMLAttributes<HTMLSelectElement>) => ( <div> {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>{label}</label>} <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} {...props}><option value="">{placeholder || 'Please select'}</option>{options?.map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}</select> </div> );
const AddressSelectField = ({ label, addresses, ...props }: {label: string, addresses?: Address[]} & React.SelectHTMLAttributes<HTMLSelectElement>) => ( <div> <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label> <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white' }} {...props}> <option value="">Select an address</option> {addresses?.map((addr, index) => ( <option key={index} value={addr.address}> {`(${addr.tag}) ${addr.address}`} </option> ))} </select> </div> );

const imageUploadContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' };
const uploadButtonStyle: React.CSSProperties = { backgroundColor: '#e5e7eb', color: '#374151', fontWeight: '600', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' };
const uploadButtonDisabledStyle: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.6 };
const imagePreviewGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem' };
const imagePreviewItemStyle: React.CSSProperties = { position: 'relative', aspectRatio: '1 / 1', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' };
const removeImageButtonStyle: React.CSSProperties = { position: 'absolute', top: '0.25rem', right: '0.25rem', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' };

const formSectionStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' };
const sectionHeaderStyle: React.CSSProperties = { fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' };
const tableHeaderStyle: React.CSSProperties = { padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' };
const tableCellStyle: React.CSSProperties = { padding: '0.75rem' };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' };

