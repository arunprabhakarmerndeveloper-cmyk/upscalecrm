"use client";

import React, { useState, useEffect, FormEvent, ReactNode, useMemo } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchableClientSelect, ClientSearchResult } from "@/app/components/SearchableClientSelect";
import { SearchableProductSelect, ProductSearchResult } from "@/app/components/SearchableProductSelect";

// --- TypeScript Interfaces ---
interface Address { tag: string; address: string; }

interface ProductInstance {
  key: string; 
  productName: string;
  description: string;
  quantity: number | string;
  price: number | string;
  serialNumber: string;
  purchaseDate: string;
}

interface ServiceVisit { scheduledDate: string; }

interface CreateAmcInput {
  clientId?: string;
  newClient?: { name: string; phone: string; email?: string; };
  productInstances: {
    productName: string;
    description: string;
    serialNumber: string;
    purchaseDate: string;
  }[];
  startDate: string;
  endDate: string;
  contractAmount: number;
  taxPercentage: number;
  frequencyPerYear: number;
  serviceVisits: ServiceVisit[];
  billingAddress: string;
  installationAddress: string;
  commercialTerms: string;
  originatingInvoiceId?: string;
}

// --- GraphQL ---
const CREATE_AMC = gql`
  mutation CreateAMC($input: CreateAMCInput!) {
    createAMC(input: $input) {
      id
      amcId
    }
  }
`;

// --- Helper Components ---
const buttonStyle: React.CSSProperties = { backgroundColor: "#2563eb", color: "#fff", fontWeight: "600", padding: "0.6rem 1.5rem", borderRadius: "0.375rem", border: "none", cursor: "pointer", textDecoration: "none" };
const SuccessModal = ({ message, onClose }: { message: string, onClose: () => void }) => ( <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}> <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', textAlign: 'center' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Success</h2> <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p> <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#10b981', width: '100%' }}>OK</button> </div> </div> );
const ErrorModal = ({ message, onClose }: { message: string, onClose: () => void }) => ( <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}> <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', textAlign: 'center' }}> <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Error</h2> <p style={{ color: '#b91c1c', marginBottom: '1.5rem' }}>{message}</p> <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#ef4444', width: '100%' }}>Close</button> </div> </div> );
const FormSection = ({ title, children }: { title: string, children: ReactNode }) => ( <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}> <h2 style={{ fontSize: "1.25rem", fontWeight: "600", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem" }}>{title}</h2> {children} </div> );
const InputField = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => ( <div> <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#4b5563" }}>{label}</label> <input style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", outline: "none" }} {...props} /> </div> );
const TextAreaField = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => ( <div> <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#4b5563" }}>{label}</label> <textarea style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", minHeight: '80px', outline: "none" }} {...props} /> </div> );
const AddressSelectField = ({ label, addresses, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, addresses?: Address[] }) => ( <div> <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#4b5563" }}>{label}</label> <select style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", backgroundColor: "white" }} {...props}> <option value="">Select an address</option> {addresses?.map((addr, index) => (<option key={index} value={addr.address}>{`(${addr.tag}) ${addr.address}`}</option>))} </select> </div> );
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" };

// --- Main Page Component ---
export default function CreateAmcPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromInvoiceId = searchParams.get("fromInvoice");

  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [installationAddress, setInstallationAddress] = useState("");
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [productInstances, setProductInstances] = useState<ProductInstance[]>([
    { key: crypto.randomUUID(), productName: "", description: "", price: 0, quantity: 1, serialNumber: "", purchaseDate: new Date().toISOString().split("T")[0] }
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [taxPercentage, setTaxPercentage] = useState<number | string>(5);
  const [frequencyPerYear, setFrequencyPerYear] = useState("4");
  const [serviceVisits, setServiceVisits] = useState<ServiceVisit[]>([]);
  const [commercialTerms, setCommercialTerms] = useState("");
  const [modal, setModal] = useState<{ type: 'success' | 'error' | null; message: string; data?: { id: string; amcId: string; } }>({ type: null, message: '' });

  const [createAMC, { loading: mutationLoading }] = useMutation(CREATE_AMC, {
    onCompleted: (data) => setModal({ type: "success", message: `AMC ${data.createAMC.amcId} created successfully!`, data: data.createAMC }),
    onError: (error) => setModal({ type: "error", message: error.message }),
    refetchQueries: ['GetAmcs']
  });

  const subtotal = useMemo(() => productInstances.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0), [productInstances]);
  const taxAmount = useMemo(() => (subtotal * (Number(taxPercentage) / 100)), [subtotal, taxPercentage]);
  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  useEffect(() => {
    if (!isNewClient && selectedClient?.addresses?.length && !useManualAddress) {
      const billingAddr = selectedClient.addresses.find(a => a.tag === 'Billing');
      setBillingAddress(billingAddr?.address || selectedClient.addresses[0].address);
    } else { setBillingAddress(""); }
  }, [selectedClient, isNewClient, useManualAddress]);
  
  useEffect(() => { if (startDate) { const start = new Date(startDate); const end = new Date(start); end.setFullYear(start.getFullYear() + 1); end.setDate(end.getDate() - 1); setEndDate(end.toISOString().split("T")[0]); } }, [startDate]);
  useEffect(() => { const freq = parseInt(frequencyPerYear, 10); if (startDate && endDate && freq > 0) { const start = new Date(startDate); const end = new Date(endDate); const durationMs = end.getTime() - start.getTime(); if (durationMs < 0) return; const intervalMs = freq > 1 ? durationMs / (freq - 1) : 0; setServiceVisits(Array.from({ length: freq }, (_, i) => ({ scheduledDate: new Date(start.getTime() + i * intervalMs).toISOString().split("T")[0] }))); } }, [startDate, endDate, frequencyPerYear]);
  useEffect(() => { if (isSameAddress) setInstallationAddress(billingAddress); }, [isSameAddress, billingAddress]);

  const handleClientSelect = (client: ClientSearchResult) => { setSelectedClient(client); setIsNewClient(false); setUseManualAddress(false); };
  const handleModalClose = () => { if (modal.type === 'success' && modal.data?.id) { router.push(`/amcs/${modal.data.id}`); } setModal({ type: null, message: '' }); };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isNewClient && !selectedClient) { return setModal({ type: "error", message: "Please select an existing client or add a new one manually." }); }
    if (isNewClient && !newClient.name) { return setModal({ type: "error", message: "New client's Name and Phone are required." }); }


    const filteredProducts = productInstances.map(p => ({ productName: p.productName.trim(), description: p.description, quantity: Number(p.quantity) || 1, price: Number(p.price) || 0, serialNumber: p.serialNumber, purchaseDate: p.purchaseDate })).filter(p => p.productName !== "");
    if (filteredProducts.length === 0) { return setModal({ type: "error", message: "Please add at least one product with a name." }); }
    
    const input: CreateAmcInput = { 
        productInstances: filteredProducts, 
        startDate, 
        endDate, 
        contractAmount: grandTotal, 
        taxPercentage: Number(taxPercentage) || 0,
        frequencyPerYear: parseInt(frequencyPerYear, 10) || 1, 
        serviceVisits, 
        billingAddress, 
        installationAddress, 
        commercialTerms 
    };

    if (isNewClient) { input.newClient = newClient; }
    else if (selectedClient) { input.clientId = selectedClient.id; }
    if (!input.clientId && !input.newClient) { return setModal({ type: "error", message: "Client information is missing." }); }
    if (fromInvoiceId) input.originatingInvoiceId = fromInvoiceId;

    createAMC({ variables: { input } });
  };
  
  const handleProductSelect = (index: number, product: ProductSearchResult) => { setProductInstances(prev => prev.map((item, i) => i === index ? { ...item, productName: product.name, price: product.price, description: product.description || '' } : item)); };
  const handleProductChange = (index: number, field: keyof Omit<ProductInstance, 'key'>, value: string | number) => { setProductInstances(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p)); };
  const addProduct = () => { setProductInstances(prev => [...prev, { key: crypto.randomUUID(), productName: "", description: "", price: 0, quantity: 1, serialNumber: "", purchaseDate: new Date().toISOString().split("T")[0] }]); };
  const removeProduct = (index: number) => { setProductInstances(prev => prev.filter((_, i) => i !== index)); };

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem 1rem 4rem 1rem" }}>
      {modal.type && (modal.type === 'success' ? <SuccessModal message={modal.message} onClose={handleModalClose} /> : <ErrorModal message={modal.message} onClose={handleModalClose} />)}
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>Create New AMC</h1>
        </div>

        <FormSection title="Client Details">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type="checkbox" id="isNewClient" checked={isNewClient} onChange={(e) => {
                        setIsNewClient(e.target.checked);
                        setSelectedClient(null);
                        setUseManualAddress(e.target.checked);
                        setBillingAddress('');
                        setInstallationAddress('');
                    }} />
                    <label htmlFor="isNewClient">Add new client manually</label>
                </div>
            
                {isNewClient ? (
                    <div style={gridStyle}>
                        <InputField label="New Client Name" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} required />
                        <InputField label="New Client Phone" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} required />
                        <InputField label="New Client Email" type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} />
                    </div>
                ) : selectedClient ? (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontWeight: "600" }}>{selectedClient.name}</div>
                            <div style={{ fontSize: "0.9rem", color: "#6b7280" }}> {selectedClient.phone || selectedClient.email} </div>
                        </div>
                        <button type="button" onClick={() => {setSelectedClient(null); setBillingAddress(''); setInstallationAddress('');}} style={{ ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151", padding: "0.5rem 1rem" }}>Change</button>
                    </div>
                ) : (
                    <SearchableClientSelect onClientSelect={handleClientSelect} />
                )}

                {!isNewClient && selectedClient && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input type="checkbox" id="useManualAddress" checked={useManualAddress} onChange={(e) => setUseManualAddress(e.target.checked)} />
                        <label htmlFor="useManualAddress">Enter address manually</label>
                    </div>
                )}
                
                {(useManualAddress || isNewClient || !selectedClient?.addresses?.length) ? (
                    <InputField label="Billing Address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                ) : (
                    <AddressSelectField label="Billing Address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} addresses={selectedClient?.addresses} />
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="sameAddress" checked={isSameAddress} onChange={(e) => setIsSameAddress(e.target.checked)} disabled={!billingAddress} />
                    <label htmlFor="sameAddress">Installation address is same as billing</label>
                </div>
                
                {!isSameAddress && (
                    (useManualAddress || isNewClient || !selectedClient?.addresses?.length) ? (
                        <InputField label="Installation Address" value={installationAddress} onChange={(e) => setInstallationAddress(e.target.value)} required={!isSameAddress} />
                    ) : (
                        <AddressSelectField label="Installation Address" value={installationAddress} onChange={(e) => setInstallationAddress(e.target.value)} addresses={selectedClient?.addresses} required={!isSameAddress} />
                    )
                )}
            </div>
        </FormSection>

        <FormSection title="Products Under Contract">
          {productInstances.map((instance, index) => (
            <div key={instance.key} style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb", marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label style={{ fontWeight: "600" }}>Item #{index + 1}</label>
                    {productInstances.length > 1 && ( <button type="button" onClick={() => removeProduct(index)} style={{ ...buttonStyle, backgroundColor: "#fee2e2", color: "#ef4444", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Remove</button> )}
                </div>

                <SearchableProductSelect onProductSelect={(product) => handleProductSelect(index, product)} />
                
                {instance.productName && (
                    <>
                        <TextAreaField label="Description" value={instance.description} onChange={(e) => handleProductChange(index, "description", e.target.value)} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <InputField label="Quantity" type="number" min="1" value={instance.quantity} onChange={(e) => handleProductChange(index, "quantity", e.target.value)} />
                            <InputField label="Price (AED)" type="number" step="0.01" value={instance.price} onChange={(e) => handleProductChange(index, "price", e.target.value)} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <InputField label="Serial Number" value={instance.serialNumber} onChange={(e) => handleProductChange(index, "serialNumber", e.target.value)} />
                            <InputField label="Install Date" type="date" value={instance.purchaseDate} onChange={(e) => handleProductChange(index, "purchaseDate", e.target.value)} />
                        </div>
                    </>
                )}
            </div>
          ))}
          <button type="button" onClick={addProduct} style={{ ...buttonStyle, backgroundColor: "#d1fae5", color: "#065f46" }}>+ Add Product</button>
        </FormSection>

        <FormSection title="Contract Details">
            <div style={gridStyle}>
                <InputField label="Contract Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                <InputField label="Contract End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                <InputField label="Services per Year" type="number" min="1" max="12" value={frequencyPerYear} onChange={(e) => setFrequencyPerYear(e.target.value)} required />
            </div>
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Auto-Generated Service Schedule</h3>
              <div style={gridStyle}>
                {serviceVisits.map((visit, index) => (
                  <InputField key={index} label={`Visit #${index + 1}`} type="date" value={visit.scheduledDate} readOnly disabled />
                ))}
              </div>
            </div>
        </FormSection>
        
        <FormSection title="Commercial Terms">
          <textarea value={commercialTerms} onChange={(e) => setCommercialTerms(e.target.value)} placeholder="Enter terms..." style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", minHeight: "100px", resize: "vertical" }} />
        </FormSection>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <div style={{ width: "100%", maxWidth: "350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}> <span style={{ fontWeight: 500 }}>Subtotal:</span> <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(subtotal)}</span> </div>
                <InputField label="VAT (%)" type="number" step="0.01" min="0" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} />
                <div style={{ display: "flex", justifyContent: "space-between" }}> <span style={{ fontWeight: 500 }}>Tax Amount:</span> <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(taxAmount)}</span> </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: "700", borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem' }}> <span>Grand Total (Contract Amount):</span> <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(grandTotal)}</span> </div>
            </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
          <Link href="/amcs" style={{ ...buttonStyle, backgroundColor: "#f3f4f6", color: "#374151" }}>Cancel</Link>
          <button type="submit" disabled={mutationLoading} style={{ ...buttonStyle, backgroundColor: '#10b981', opacity: mutationLoading ? 0.6 : 1 }}>
            {mutationLoading ? "Saving..." : "Create AMC"}
          </button>
        </div>
      </form>
    </div>
  );
}