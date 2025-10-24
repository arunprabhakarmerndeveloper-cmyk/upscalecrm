"use client";

import React, { useState, useEffect, FormEvent, ReactNode, useMemo } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
// FIX: Removed unused 'SearchableProductSelectProps' import
import { SearchableProductSelect, ProductSearchResult } from "@/app/components/SearchableProductSelect";

// --- GraphQL ---
const GET_AMC = gql`
  query GetAMC($id: ID!) {
    amc(id: $id) {
      id
      amcId
      status
      clientInfo {
        name
        phone
        email
        billingAddress
        installationAddress
      }
      productInstances {
        productName
        description
        quantity
        price
        serialNumber
        purchaseDate
      }
      startDate
      endDate
      contractAmount
      taxPercentage
      frequencyPerYear
      commercialTerms
    }
  }
`;

const UPDATE_AMC = gql`
  mutation UpdateAMC($id: ID!, $input: UpdateAMCInput!) {
    updateAMC(id: $id, input: $input) {
      id
      amcId
    }
  }
`;

// --- TypeScript Interfaces ---
interface ClientInfo {
    name: string;
    phone?: string;
    email?: string;
    billingAddress?: string;
    installationAddress?: string;
}
interface ProductInstance {
  key: string;
  productName: string;
  description: string;
  quantity: number | string;
  price: number | string;
  serialNumber: string;
  purchaseDate: string;
}
interface ServiceVisit {
  scheduledDate: string;
}
interface AMCData {
  id: string;
  amcId: string;
  status: 'Active' | 'Expired' | 'Cancelled';
  clientInfo: ClientInfo;
  productInstances: ProductInstance[];
  startDate: string;
  endDate: string;
  contractAmount: number;
  taxPercentage?: number;
  frequencyPerYear: number;
  commercialTerms?: string;
}
type WithTypename<T> = T & { __typename?: string };

// --- Helper Components ---
const buttonStyle: React.CSSProperties = { backgroundColor: "#2563eb", color: "#fff", fontWeight: 600, padding: "0.6rem 1.5rem", borderRadius: "0.375rem", border: "none", cursor: "pointer", textDecoration: "none" };
const FormSection = ({ title, children }: { title: string; children: ReactNode }) => ( <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", marginBottom: "1.5rem" }}><h2 style={{ fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1rem" }}>{title}</h2>{children}</div>);
const InputField = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => ( <div><label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#4b5563" }}>{label}</label><input style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", outline: "none", backgroundColor: props.readOnly ? "#f9fafb" : "#fff" }} {...props} /></div>);
const SelectField = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: ReactNode }) => ( <div><label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#4b5563" }}>{label}</label><select style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", outline: "none", backgroundColor: "#fff" }} {...props}>{children}</select></div>);

// FIX: Made the 'label' prop optional
const TextAreaField = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div>
    {/* Conditionally render the label only if it exists */}
    {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#4b5563" }}>{label}</label>}
    <textarea
      style={{
        width: "100%",
        padding: "0.6rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        minHeight: "80px",
        outline: "none",
        resize: "vertical",
        marginTop: label ? undefined : '0.5rem' // Add some space if there's no label
      }}
      {...props}
    />
  </div>
);

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" };

// --- Main Component ---
export default function EditAmcPage() {
  const router = useRouter();
  const params = useParams();
  const amcId = params.amcId as string;

  const { data, loading, error } = useQuery<{ amc: AMCData }>(GET_AMC, {
    variables: { id: amcId },
    skip: !amcId,
  });

  const [clientInfo, setClientInfo] = useState<ClientInfo>({ name: '', phone: '', email: '', billingAddress: '', installationAddress: ''});
  const [productInstances, setProductInstances] = useState<ProductInstance[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [taxPercentage, setTaxPercentage] = useState<number | string>(5);
  const [frequencyPerYear, setFrequencyPerYear] = useState("4");
  const [serviceVisits, setServiceVisits] = useState<ServiceVisit[]>([]);
  const [commercialTerms, setCommercialTerms] = useState("");
  const [status, setStatus] = useState<'Active' | 'Expired' | 'Cancelled'>('Active');

  const [updateAMC, { loading: mutationLoading }] = useMutation(UPDATE_AMC, {
    onCompleted: () => router.push(`/amcs/${amcId}`),
    onError: (err) => alert(`Error updating AMC: ${err.message}`),
  });

  useEffect(() => {
    if (data?.amc) {
      const amc = data.amc;
      setClientInfo({
        name: amc.clientInfo?.name ?? '', phone: amc.clientInfo?.phone ?? '', email: amc.clientInfo?.email ?? '',
        billingAddress: amc.clientInfo?.billingAddress ?? '', installationAddress: amc.clientInfo?.installationAddress ?? '',
      });
      setProductInstances(
        amc.productInstances.map((p) => ({
          key: crypto.randomUUID(), productName: p.productName, description: p.description || "",
          quantity: p.quantity ?? 1, price: p.price ?? 0, serialNumber: p.serialNumber || "",
          purchaseDate: p.purchaseDate ? new Date(Number(p.purchaseDate)).toISOString().split("T")[0] : "",
        }))
      );
      setStartDate(new Date(Number(amc.startDate)).toISOString().split("T")[0]);
      setEndDate(new Date(Number(amc.endDate)).toISOString().split("T")[0]);
      setTaxPercentage(amc.taxPercentage ?? 5);
      setFrequencyPerYear(amc.frequencyPerYear.toString());
      setCommercialTerms(amc.commercialTerms || "");
      setStatus(amc.status || 'Active');
    }
  }, [data]);

  useEffect(() => {
    const freq = parseInt(frequencyPerYear, 10);
    if (startDate && endDate && freq > 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationMs = end.getTime() - start.getTime();
      if (durationMs < 0) { setServiceVisits([]); return; }
      const intervalMs = freq > 1 ? durationMs / (freq - 1) : 0;
      const visits = Array.from({ length: freq }, (_, i) => {
         const visitTime = start.getTime() + i * intervalMs;
         const date = (freq === 1 || !isFinite(intervalMs)) ? start : new Date(visitTime);
         return { scheduledDate: isNaN(date.getTime()) ? '' : date.toISOString().split("T")[0] };
      });
      setServiceVisits(visits.filter(v => v.scheduledDate));
    } else {
      setServiceVisits([]);
    }
  }, [startDate, endDate, frequencyPerYear]);

  const subtotal = useMemo(() => productInstances.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.price || 0), 0), [productInstances]);
  const taxAmount = useMemo(() => subtotal * (Number(taxPercentage) / 100), [subtotal, taxPercentage]);
  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const handleClientInfoChange = (field: keyof ClientInfo, value: string) => { setClientInfo(prev => ({ ...prev, [field]: value })); };
  const handleProductSelect = (index: number, product: ProductSearchResult) => { setProductInstances((prev) => prev.map((item, i) => i === index ? { ...item, productName: product.name, price: product.price, description: product.description || "" } : item)); };
  const handleProductChange = (index: number, field: keyof Omit<ProductInstance, "key">, value: string | number) => { setProductInstances((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))); };
  const addProduct = () => setProductInstances((prev) => [...prev, { key: crypto.randomUUID(), productName: "", description: "", price: 0, quantity: 1, serialNumber: "", purchaseDate: new Date().toISOString().split("T")[0] }]);
  const removeProduct = (index: number) => setProductInstances((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const filteredProducts = productInstances.map((p) => ({ productName: p.productName.trim(), description: p.description, quantity: Number(p.quantity) || 1, price: Number(p.price) || 0, serialNumber: p.serialNumber, purchaseDate: p.purchaseDate || undefined })).filter((p) => p.productName !== "");
    if (!filteredProducts.length) return alert("Please add at least one product.");
    
    const { __typename: _typename, ...cleanClientInfo } = clientInfo as WithTypename<ClientInfo>;

    updateAMC({
      variables: {
        id: amcId,
        input: {
          clientInfo: cleanClientInfo,
          productInstances: filteredProducts,
          startDate,
          endDate,
          frequencyPerYear: parseInt(frequencyPerYear, 10) || 1,
          contractAmount: grandTotal,
          taxPercentage: Number(taxPercentage) || 0,
          commercialTerms,
          status,
          serviceVisits,
        },
      },
    });
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Loading AMC data...</p>;
  if (error) return <p style={{ textAlign: 'center', marginTop: '2rem', color: 'red' }}>Error loading AMC: {error.message}</p>;
  if (!data?.amc) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>AMC not found.</p>;

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem 1rem 4rem 1rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Edit AMC {data.amc.amcId}</h1>
        <FormSection title="Client Details">
          <div style={gridStyle}>
            <InputField label="Name" value={clientInfo.name} onChange={e => handleClientInfoChange('name', e.target.value)} required />
            <InputField label="Phone" value={clientInfo.phone || ""} onChange={e => handleClientInfoChange('phone', e.target.value)} />
            <InputField label="Email" type="email" value={clientInfo.email || ""} onChange={e => handleClientInfoChange('email', e.target.value)} />
            <TextAreaField label="Billing Address" value={clientInfo.billingAddress || ""} onChange={e => handleClientInfoChange('billingAddress', e.target.value)} style={{minHeight: '40px', gridColumn: 'span 2'}} />
            <TextAreaField label="Installation Address" value={clientInfo.installationAddress || ""} onChange={e => handleClientInfoChange('installationAddress', e.target.value)} style={{minHeight: '40px', gridColumn: 'span 2'}} />
          </div>
        </FormSection>
        <FormSection title="Products Under Contract">{productInstances.map((instance, index) => (<div key={instance.key} style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><label style={{ fontWeight: 600 }}>Item #{index + 1}</label>{productInstances.length > 1 && (<button type="button" onClick={() => removeProduct(index)} style={{ ...buttonStyle, backgroundColor: "#fee2e2", color: "#ef4444", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Remove</button>)}</div><SearchableProductSelect value={instance.productName} onProductSelect={(product) => handleProductSelect(index, product)} />{instance.productName && (<><TextAreaField label="Description" value={instance.description} onChange={(e) => handleProductChange(index, "description", e.target.value)} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}><InputField label="Quantity" type="number" min="1" value={instance.quantity} onChange={(e) => handleProductChange(index, "quantity", e.target.value)} /><InputField label="Price (AED)" type="number" step="0.01" min="0" value={instance.price} onChange={(e) => handleProductChange(index, "price", e.target.value)} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}><InputField label="Serial Number" value={instance.serialNumber} onChange={(e) => handleProductChange(index, "serialNumber", e.target.value)} /><InputField label="Install Date" type="date" value={instance.purchaseDate} onChange={(e) => handleProductChange(index, "purchaseDate", e.target.value)} /></div></>)}</div>))}<button type="button" onClick={addProduct} style={{ ...buttonStyle, backgroundColor: "#d1fae5", color: "#065f46" }}>+ Add Product</button></FormSection>
        <FormSection title="Contract Details"><div style={gridStyle}><InputField label="Contract Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /><InputField label="Contract End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /><InputField label="Services per Year" type="number" min="1" max="12" value={frequencyPerYear} onChange={(e) => setFrequencyPerYear(e.target.value)} required /><SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Expired' | 'Cancelled')}><option value="Active">Active</option><option value="Expired">Expired</option><option value="Cancelled">Cancelled</option></SelectField></div><div style={{ marginTop: "2rem" }}><h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Auto-Generated Service Schedule</h3><div style={gridStyle}>{serviceVisits.map((visit, index) => (<InputField key={index} label={`Visit #${index + 1}`} type="date" value={visit.scheduledDate} readOnly disabled />))}</div></div></FormSection>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}><div style={{ width: "100%", maxWidth: "350px", display: "flex", flexDirection: "column", gap: "1rem" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 500 }}>Subtotal:</span><span>{new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(subtotal)}</span></div><InputField label="VAT (%)" type="number" step="0.01" min="0" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} /><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 500 }}>Tax Amount:</span><span>{new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(taxAmount)}</span></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 700, borderTop: "1px solid #ccc", paddingTop: "0.5rem", marginTop: "0.5rem" }}><span>Grand Total (Contract Amount):</span><span>{new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(grandTotal)}</span></div></div></div>
        
        {/* This usage is now correct because the label prop is optional */}
        <FormSection title="Commercial Terms">
            <TextAreaField 
                value={commercialTerms} 
                onChange={(e) => setCommercialTerms(e.target.value)} 
                placeholder="Enter terms..." 
            />
        </FormSection>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}><Link href={`/amcs/${amcId}`} style={{ ...buttonStyle, backgroundColor: "#f3f4f6", color: "#374151" }}>Cancel</Link><button type="submit" disabled={mutationLoading} style={{ ...buttonStyle, backgroundColor: "#10b981", opacity: mutationLoading ? 0.6 : 1 }}>{mutationLoading ? "Saving..." : "Save Changes"}</button></div>
      </form>
    </div>
  );
}