"use client";

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) { id }
  }
`;

export default function NewProductPage() {
    const { loading: authLoading } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: '', sku: '', price: '', type: 'product', description: '' });
    
    const [createProduct, { loading: mutationLoading, error }] = useMutation(CREATE_PRODUCT, {
        onCompleted: () => {
            alert('Product/Service created successfully!');
            router.push('/products');
        },
        refetchQueries: ['GetProducts'] // Refetches the product list on the main page
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createProduct({ variables: { input: { ...formData, price: parseFloat(formData.price) } } });
    };

    if (authLoading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '700px', margin: 'auto', padding: '2rem 1rem' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Add New Product/Service</h1>
                    <button type="submit" disabled={mutationLoading} style={{...buttonStyle, opacity: mutationLoading ? 0.6 : 1 }}>
                        {mutationLoading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>

                <FormSection title="Product Information">
                    <div style={gridStyle}>
                        <InputField label="Name" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., AquaPure Pro Purifier" />
                        <SelectField label="Type" name="type" value={formData.type} onChange={handleChange}>
                            <option value="product">Product</option>
                            <option value="service">Service</option>
                        </SelectField>
                        <InputField label="Price (AED)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required placeholder="e.g., 15000.00" />
                        <InputField label="SKU (Optional)" name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g., APP-001" />
                    </div>
                    <div style={{marginTop: '1.5rem'}}>
                         <TextAreaField label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} />
                    </div>
                </FormSection>
                
                {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <Link href="/products" style={{...buttonStyle, backgroundColor: '#f3f4f6', color: '#374151'}}>Cancel</Link>
                </div>
            </form>
        </div>
    );
}

// --- Helper Components & Styles ---
const FormSection = ({ title, children }: {title: string, children: React.ReactNode}) => (<div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}><h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2>{children}</div>);
const InputField = ({ label, ...props }: any) => (<div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label><input style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', outline: 'none' }} {...props} /></div>);
const TextAreaField = ({ label, ...props }: any) => (<div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label><textarea rows={3} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', outline: 'none' }} {...props} /></div>);
const SelectField = ({ label, children, ...props }: any) => (<div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4b5563' }}>{label}</label><select style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white' }} {...props}>{children}</select></div>);
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' };
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', textDecoration: 'none' };

