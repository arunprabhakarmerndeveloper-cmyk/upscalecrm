"use client";

import React, { useState, useMemo, FormEvent, ReactNode, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { GET_INVOICES } from "@/graphql/queries"; // Assuming you have a GET_INVOICES query
import {
  SearchableClientSelect,
  ClientSearchResult,
} from "@/app/components/SearchableClientSelect";
import {
  SearchableProductSelect,
  ProductSearchResult,
} from "@/app/components/SearchableProductSelect";

// --- Types ---
// Interface for Address, needed for AddressSelectField
interface Address {
  tag: string;
  address: string;
}
interface LineItemState {
  key: string; // Unique key for React list rendering
  productId: string;
  productName: string;
  quantity: number | string;
  price: number | string;
  description: string;
}
interface InvoicesQueryData {
  invoices: { id: string; invoiceId: string }[];
}
// Input for adding a new client, matching the resolver
interface NewClientForInvoiceInput {
    name: string;
    phone: string;
    email?: string;
}
// Updated CreateInvoiceInput matching the latest schema
interface CreateInvoiceInput {
  clientId?: string; // Optional
  newClient?: NewClientForInvoiceInput; // Added
  billingAddress: string; // Added
  installationAddress: string; // Added
  issueDate: string;
  dueDate?: string | null;
  installationDate?: string | null;
  lineItems: {
    productName: string;
    quantity: number;
    price: number;
    description: string;
  }[];
  taxPercentage: number;
  termsOfService?: string | null;
}

// --- GraphQL ---
const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceId # Include invoiceId for the success message
    }
  }
`;

// --- Styles (Reusing from Quotation page) ---
const buttonStyle: React.CSSProperties = {
  backgroundColor: "#2563eb", // Example blue
  color: "#fff",
  fontWeight: 600,
  padding: "0.75rem 1.5rem",
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  transition: "background-color 0.2s",
  textDecoration: 'none', // Added for consistency if used on Link
};
const buttonDisabledStyle: React.CSSProperties = {
    cursor: "not-allowed",
    opacity: 0.6,
};


// --- Helper Functions ---
const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
};


// --- Reusable Components ---
const Modal = ({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void; }) => { const isSuccess = type === "success"; return ( <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, }}> <div style={{ backgroundColor: "white", padding: "1.5rem 2rem", borderRadius: "0.75rem", width: "90%", maxWidth: "400px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", }}> <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem", }}> {isSuccess ? "Success" : "Error"} </h2> <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p> <button onClick={onClose} style={{ ...buttonStyle, backgroundColor: isSuccess ? "#10b981" : "#ef4444", width: "100%", }} > OK </button> </div> </div> ); };
const FormSection = ({ title, children }: { title: string; children: ReactNode; }) => ( <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "2rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)", }}> <h2 style={{ fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem", marginTop: 0 }}> {title} </h2> {children} </div> );
const InputField = ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => ( <div> {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", }}> {label} </label>} <input style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", }} {...props} /> </div> );
const TextAreaField = ({ label, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => ( <div> {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", }}> {label} </label>} <textarea style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", minHeight: "80px", }} {...props} /> </div> );
// Added AddressSelectField component from CreateQuotationPage
const AddressSelectField = ({ label, addresses, ...props }: { label: string; addresses?: Address[]; } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#4b5563' }}>
        {label}
      </label>
      <select
        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white' }}
        {...props}
      >
        <option value="">Select a saved address</option>
        {addresses?.map((addr, index) => (
          <option key={index} value={addr.address}>{`(${addr.tag}) ${addr.address}`}</option>
        ))}
      </select>
    </div>
);


// --- Main Component ---
export default function CreateInvoicePage() {
  const router = useRouter();

  // --- State (Combined from original + quotation page) ---
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [useManualAddress, setUseManualAddress] = useState(false); // For existing clients
  const [billingAddress, setBillingAddress] = useState("");
  const [installationAddress, setInstallationAddress] = useState("");
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [lineItems, setLineItems] = useState<LineItemState[]>([
    { key: crypto.randomUUID(), productId: "", productName: "", quantity: 1, price: 0, description: "" },
  ]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
     const date = new Date();
     date.setDate(date.getDate() + 30);
     return date.toISOString().split("T")[0];
   });
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxPercentage, setTaxPercentage] = useState<number | string>(5); // Default tax
  const [termsOfService, setTermsOfService] = useState("");
  const [modalInfo, setModalInfo] = useState<{ message: string; type: "success" | "error"; } | null>(null);
  const [newInvoiceId, setNewInvoiceId] = useState<string | null>(null);

  // --- GraphQL Mutation ---
  const [createInvoice, { loading: mutationLoading, error: mutationError }] =
    useMutation(CREATE_INVOICE, {
      onCompleted: (data) => {
        setNewInvoiceId(data.createInvoice.id);
        setModalInfo({
          message: `Invoice ${data.createInvoice.invoiceId} created successfully!`,
          type: "success",
        });
      },
      onError: (error) =>
        setModalInfo({ message: error.message, type: "error" }),
      update: (cache, { data: { createInvoice: newInvoice } }) => {
        if (!GET_INVOICES) return;
        try {
          const existingData = cache.readQuery<InvoicesQueryData>({ query: GET_INVOICES });
          if (existingData && newInvoice) {
            cache.writeQuery({
              query: GET_INVOICES,
              data: { invoices: [newInvoice, ...existingData.invoices] },
            });
          }
        } catch (e) {
             if (!(e instanceof Error && e.message.includes("Can't find field"))) {
                 console.error("Could not update invoices cache:", e);
             }
        }
      },
    });

  // --- Effects for Address Handling (from quotation page) ---
   useEffect(() => {
    // Pre-fill billing address if an existing client is selected and not using manual address
    if (!isNewClient && selectedClient?.addresses?.length && !useManualAddress) {
        // Find the first billing address or just the first address
        const billingAddr = selectedClient.addresses.find(a => a.tag === 'Billing');
        setBillingAddress(billingAddr?.address || selectedClient.addresses[0].address);
    } else {
        setBillingAddress(""); // Clear if new client or manual address
    }
   }, [selectedClient, isNewClient, useManualAddress]);

   useEffect(() => {
    // If "Same Address" is checked, sync installation address with billing address
    if (isSameAddress) {
        setInstallationAddress(billingAddress);
    }
   }, [isSameAddress, billingAddress]);

  // --- Calculations ---
  const subtotal = useMemo(() => lineItems.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0), [lineItems]);
  const taxAmount = useMemo(() => (subtotal * (Number(taxPercentage) / 100)), [subtotal, taxPercentage]);
  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  // --- Handlers ---
  const handleClientSelect = (client: ClientSearchResult) => {
    setSelectedClient(client);
    setIsNewClient(false); // Ensure new client form is hidden
    setUseManualAddress(false); // Default to using saved addresses
  };

  const handleProductSelect = (index: number, product: ProductSearchResult) => {
    setLineItems((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, productId: product.id, productName: product.name, price: product.price, description: product.description || ""}
          : item
      )
    );
  };

  const handleLineItemChange = (index: number, field: keyof Omit<LineItemState, 'key'>, value: string | number) => {
    setLineItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { key: crypto.randomUUID(), productId: "", productName: "", quantity: 1, price: 0, description: "" }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validation for client selection or new client details
    if (!isNewClient && !selectedClient) {
      setModalInfo({ message: "Please select an existing client or add a new one manually.", type: "error" });
      return;
    }
    if (isNewClient && !newClient.name) {
      setModalInfo({ message: "New client's Name and Phone are required.", type: "error" });
      return;
    }


    const finalLineItems = lineItems
      .map((item) => ({ productName: item.productName, quantity: Number(item.quantity) || 1, price: Number(item.price) || 0, description: item.description || "" }))
      .filter((item) => item.productName && item.quantity > 0 && item.price >= 0);

    if (finalLineItems.length === 0) {
      setModalInfo({ message: "Please add at least one valid product line item.", type: "error" });
      return;
    }

    // Construct input based on new client or existing
    const input: CreateInvoiceInput = {
      issueDate: issueDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || null,
      installationDate: installationDate || null,
      lineItems: finalLineItems,
      taxPercentage: Number(taxPercentage) || 0,
      termsOfService: termsOfService || null,
      billingAddress: billingAddress, // Pass addresses explicitly
      installationAddress: installationAddress,
      // Conditionally add clientId or newClient
      ...(isNewClient ? { newClient: newClient } : { clientId: selectedClient?.id }),
    };

     // Ensure either clientId or newClient is present before sending
    if (!input.clientId && !input.newClient) {
        setModalInfo({ message: "Client information is missing.", type: "error" });
        return; // Should not happen with the checks above, but good safeguard
    }
    // Remove empty clientId if newClient is present
     if (input.newClient && input.clientId) {
        delete input.clientId;
    }


    createInvoice({ variables: { input } });
  };

  const handleCloseModal = () => {
    if (modalInfo?.type === "success" && newInvoiceId) {
      router.push(`/invoices/${newInvoiceId}`);
    } else {
      setModalInfo(null);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem 1rem 4rem 1rem" }}>
      {modalInfo && ( <Modal type={modalInfo.type} message={modalInfo.message} onClose={handleCloseModal} /> )}
      <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "2rem" }}> Create New Invoice </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
         {/* Client Details Section (Adapted from CreateQuotationPage) */}
        <FormSection title="Client Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Checkbox for New Client */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input type="checkbox" id="isNewClient" checked={isNewClient} onChange={(e) => { setIsNewClient(e.target.checked); setSelectedClient(null); setUseManualAddress(e.target.checked); setBillingAddress(''); setInstallationAddress(''); }} />
              <label htmlFor="isNewClient">Add new client manually</label>
            </div>

            {/* Conditional Rendering: New Client Form or Existing Client Selection */}
            {isNewClient ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
                <InputField label="New Client Name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} required={isNewClient}/>
                <InputField label="New Client Phone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                <InputField label="New Client Email" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
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

            {/* Address Handling (Only shows fully when needed) */}
            {!isNewClient && selectedClient && selectedClient.addresses && selectedClient.addresses.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: '1rem' }}>
                    <input type="checkbox" id="useManualAddress" checked={useManualAddress} onChange={(e) => setUseManualAddress(e.target.checked)} />
                    <label htmlFor="useManualAddress">Enter address manually (override saved)</label>
                </div>
            )}

            {/* Billing Address Input/Select */}
            {(isNewClient || useManualAddress || !selectedClient?.addresses?.length) ? (
                 <InputField label="Billing Address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
             ) : selectedClient ? (
                 <AddressSelectField label="Billing Address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} addresses={selectedClient?.addresses} />
             ) : null}


            {/* Same Address Checkbox */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input type="checkbox" id="sameAddress" checked={isSameAddress} onChange={e => setIsSameAddress(e.target.checked)} disabled={!billingAddress} />
                 <label htmlFor="sameAddress">Installation address is same as billing</label>
             </div>


            {/* Installation Address Input/Select */}
             {!isSameAddress && (
                (isNewClient || useManualAddress || !selectedClient?.addresses?.length) ? (
                    <InputField label="Installation Address" value={installationAddress} onChange={e => setInstallationAddress(e.target.value)} />
                ) : selectedClient ? (
                    <AddressSelectField label="Installation Address" value={installationAddress} onChange={e => setInstallationAddress(e.target.value)} addresses={selectedClient?.addresses} />
                ) : null
             )}

          </div>
        </FormSection>

        {/* Invoice Dates */}
        <FormSection title="Invoice Dates">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            <InputField label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            <InputField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <InputField label="Installation Date" type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
          </div>
        </FormSection>

        {/* Products & Services */}
        <FormSection title="Products & Services">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {lineItems.map((item, index) => (
              <div key={item.key} style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontWeight: "600" }}>Item #{index + 1}</label>
                  {lineItems.length > 1 && ( <button type="button" onClick={() => removeLineItem(index)} style={{ ...buttonStyle, backgroundColor: "#fee2e2", color: "#ef4444", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}> Remove </button> )}
                </div>
                {item.productName && item.productId ? (
                  <div style={{ border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: "600" }}>{item.productName}</div>
                    <button type="button" onClick={() => { handleLineItemChange(index, "productId", ""); handleLineItemChange(index, "productName", ""); handleLineItemChange(index, "price", 0); handleLineItemChange(index, "description", ""); }} style={{ ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151", padding: "0.5rem 1rem" }}> Change </button>
                  </div>
                ) : ( <SearchableProductSelect onProductSelect={(product) => handleProductSelect(index, product)} /> )}
                {(item.productName || item.productId) && (
                  <>
                    <TextAreaField label="Description" value={item.description} onChange={(e) => handleLineItemChange(index, "description", e.target.value)} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <InputField label="Quantity" type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)} min="1" />
                      <InputField label="Price (AED)" type="number" step="0.01" value={item.price} onChange={(e) => handleLineItemChange(index, "price", e.target.value)} min="0" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLineItem} style={{ ...buttonStyle, backgroundColor: "#d1fae5", color: "#065f46", marginTop: "1.5rem" }}> + Add Item </button>
        </FormSection>

        {/* Terms of Service */}
        <FormSection title="Terms of Service">
          <TextAreaField placeholder="Enter payment terms, warranty info, etc." value={termsOfService} onChange={(e) => setTermsOfService(e.target.value)} rows={4} />
        </FormSection>

        {/* Summary & Tax */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <div style={{ width: "100%", maxWidth: "350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <span style={{ fontWeight: 500 }}>Subtotal:</span> <span>{formatCurrency(subtotal)}</span> </div>
            <InputField label="VAT (%)" type="number" step="0.01" min="0" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <span style={{ fontWeight: 500 }}>Tax Amount:</span> <span>{formatCurrency(taxAmount)}</span> </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: "700", alignItems: "center", borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem' }}> <span>Grand Total:</span> <span>{formatCurrency(grandTotal)}</span> </div>
          </div>
        </div>

        {/* Submit */}
        <div>
          {mutationError && ( <p style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}> Error: {mutationError.message} </p> )}
          <button type="submit" disabled={mutationLoading || (!selectedClient && !isNewClient)} style={{ ...buttonStyle, width: "100%", padding: "0.75rem", fontSize: "1rem", backgroundColor: "#10b981", ...((mutationLoading || (!selectedClient && !isNewClient)) && buttonDisabledStyle) }} title={(!selectedClient && !isNewClient) ? "Please select or add a client first" : ""} >
            {mutationLoading ? "Saving..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

