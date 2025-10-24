"use client";

import { useState, FormEvent, ChangeEvent, ReactNode } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// --- TypeScript Interfaces ---

interface Address {
  tag: string;
  address: string;
  __typename?: string; // Allow __typename to exist in state
}

interface ClientFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  addresses: Address[];
}

interface ClientForEdit {
    name: string;
    contactPerson: string | null;
    phone: string;
    email: string | null;
    addresses: Address[] | null;
}

interface GetClientForEditData {
    client: ClientForEdit;
}


// --- GraphQL Queries & Mutations ---

const GET_CLIENT_FOR_EDIT = gql`
    query GetClientForEdit($id: ID!) {
        client(id: $id) {
            name
            contactPerson
            phone
            email
            addresses {
                tag
                address
            }
        }
    }
`;

const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: ID!, $input: ClientInput!) {
    updateClient(id: $id, input: $input) {
      id
    }
  }
`;

export default function EditClientPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.clientId as string;    
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    const [formData, setFormData] = useState<ClientFormData>({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        addresses: [],
    });

    const { loading: queryLoading, error: queryError } = useQuery<GetClientForEditData>(GET_CLIENT_FOR_EDIT, {
        variables: { id },
        skip: !id,
        onCompleted: (data) => {
            if (data?.client) {
                const { client } = data;
                setFormData({
                    name: client.name || '',
                    contactPerson: client.contactPerson || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    addresses: client.addresses && client.addresses.length > 0 ? client.addresses : [{ tag: 'Billing', address: '' }],
                });
            }
        }
    });

    const [updateClient, { loading: mutationLoading, error: mutationError }] = useMutation(UPDATE_CLIENT, {
        onCompleted: () => {
            setShowSuccessModal(true);
        },
        refetchQueries: ['GetClients', 'GetClientDetails', 'GetDashboardData']
    });

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddressChange = (index: number, field: keyof Omit<Address, '__typename'>, value: string) => {
        const updatedAddresses = [...formData.addresses];
        updatedAddresses[index][field] = value;
        setFormData({ ...formData, addresses: updatedAddresses });
    };

    const addAddress = () => {
        setFormData({ ...formData, addresses: [...formData.addresses, { tag: '', address: '' }] });
    };

    const removeAddress = (index: number) => {
        const updatedAddresses = formData.addresses.filter((_, i) => i !== index);
        setFormData({ ...formData, addresses: updatedAddresses });
    };
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        // --- THIS IS THE FIX ---
        // We manually rebuild the input object, ensuring only the expected fields are sent.
        // The .map() on addresses strips out the '__typename' field.
        const finalInput = {
            name: formData.name,
            contactPerson: formData.contactPerson,
            phone: formData.phone,
            email: formData.email,
            addresses: formData.addresses
                .filter(addr => addr.tag && addr.address)
                .map(({ tag, address }) => ({ tag, address })), // This removes __typename and other extra fields
        };
        updateClient({ variables: { id, input: finalInput } });
    };

    if (queryLoading) return <div style={{textAlign: 'center', marginTop: '5rem'}}>Loading client data...</div>;
    if (queryError) return <div style={{color: 'red', textAlign: 'center'}}>Error: {queryError.message}</div>;

    return (
        <div style={{ maxWidth: '700px', margin: 'auto', padding: '2rem 1rem' }}>

          {showSuccessModal && (
                <SuccessModal 
                    message="Client updated successfully!"
                    onClose={() => {
                        setShowSuccessModal(false);
                        router.push(`/clients/${id}`);
                    }}
                />
            )}

            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '2rem' }}>Edit Client</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <FormSection title="Primary Information">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <InputField label="Client / Company Name" name="name" value={formData.name} onChange={handleChange} required />
                        <InputField label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                        <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} />
                        <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
                    </div>
                </FormSection>

                <FormSection title="Addresses">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {formData.addresses.map((addr, index) => (
                            <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: "1.5rem",
                  gap: "1.5rem",
                }}
              >
                                <InputField label="Address Tag" placeholder="e.g., Billing, Site 1" value={addr.tag} onChange={(e) => handleAddressChange(index, 'tag', e.target.value)} required={!!addr.address} />
                                <InputField label="Full Address" placeholder="Enter full address" value={addr.address} onChange={(e) => handleAddressChange(index, 'address', e.target.value)} required={!!addr.tag} />
                                    <button
                  type="button"
                  onClick={() => removeAddress(index)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#ef4444",
                    color: "white",
                    alignSelf: "flex-start",
                    padding: "0.5rem 1rem",
                  }}
                >
                  Remove Address
                </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addAddress} style={{...buttonStyle, backgroundColor: '#3b82f6', color: 'white', marginTop: '1rem' }}>
                        + Add Another Address
                    </button>
                </FormSection>
                
                {mutationError && <p style={{ color: 'red', textAlign: 'center' }}>Error: {mutationError.message}</p>}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Link href={`/clients/${id}`} style={{...buttonStyle, backgroundColor: '#9ca3af', color: 'white'}}>Cancel</Link>
                    <button type="submit" disabled={mutationLoading} style={{...buttonStyle, backgroundColor: '#10b981', color: 'white', opacity: mutationLoading ? 0.6 : 1 }}>
                        {mutationLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

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

// --- Helper Components & Styles ---
const FormSection = ({ title, children }: { title: string, children: ReactNode }) => ( <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>{title}</h2> {children} </div> );
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
const InputField = ({ label, ...props }: InputFieldProps) => ( <div style={{ flex: props.style?.flex || 'auto', width: '100%' }}> <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>{label}</label> <input style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }} {...props} /> </div> );
const buttonStyle: React.CSSProperties = { padding: '0.6rem 1.2rem', fontWeight: '600', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer' };

