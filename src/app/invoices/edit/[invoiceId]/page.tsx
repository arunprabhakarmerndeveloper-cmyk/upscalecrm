"use client";

import React, { useState, useMemo, FormEvent, ReactNode, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useRouter, useParams } from "next/navigation";
import { GET_INVOICES } from "@/graphql/queries"; // Assuming you have a GET_INVOICES query
import {
  SearchableProductSelect,
  ProductSearchResult,
} from "@/app/components/SearchableProductSelect";

// --- Types ---
// Interfaces matching the data structure for editing
interface IClientInfo {
  name: string;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  installationAddress: string | null;
}
interface LineItemState {
  key: string; // Unique key for React list rendering
  productId: string; // Internal state, not sent if only productName is needed
  productName: string;
  quantity: number | string;
  price: number | string;
  description: string;
}
// Input types matching GraphQL Schema
interface ClientInfoInput {
    name: string;
    phone?: string | null;
    email?: string | null;
    billingAddress?: string | null;
    installationAddress?: string | null;
}
interface LineItemInput {
    productName: string;
    description: string;
    quantity: number;
    price: number;
}
interface UpdateInvoiceInput {
  clientInfo?: ClientInfoInput;
  issueDate?: string;
  dueDate?: string | null;
  installationDate?: string | null;
  lineItems?: LineItemInput[];
  taxPercentage?: number;
  termsOfService?: string | null;
  // Note: Backend recalculates totals, so we don't send them directly
}
// Type for the data fetched for editing
interface InvoiceForEdit {
    id: string;
    invoiceId: string; // For display/reference if needed
    status: string; // <<< FIX 1: Added status field
    clientInfo: IClientInfo;
    lineItems: {
        productName: string;
        quantity: number;
        price: number;
        description: string;
    }[];
    issueDate: string | number; // Comes as string/number timestamp
    dueDate?: string | number | null;
    installationDate?: string | number | null;
    taxPercentage: number;
    termsOfService?: string | null;
}


// --- GraphQL ---
const GET_EDIT_INVOICE_DATA = gql`
  query GetEditInvoiceData($id: ID!) {
    invoice(id: $id) {
      id
      invoiceId
      status # Fetch status to prevent editing non-draft invoices
      clientInfo {
        name
        phone
        email
        billingAddress
        installationAddress
      }
      lineItems {
        productName
        quantity
        price
        description
      }
      issueDate
      dueDate
      installationDate
      taxPercentage
      termsOfService
    }
  }
`;

const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($id: ID!, $input: UpdateInvoiceInput!) {
    updateInvoice(id: $id, input: $input) {
      id # Return ID for confirmation/redirection
      # Optionally return updated fields if needed immediately
    }
  }
`;

// --- Styles ---
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
// <<< FIX 2: Removed incorrect ': void' signature hint
const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
};
// Helper to format Date object or timestamp string/number into YYYY-MM-DD
const formatDateForInput = (dateValue: string | number | null | undefined): string => {
    if (!dateValue) return "";
    try {
        // Handle potential timestamp strings more robustly
        const ts = typeof dateValue === 'string' && /^\d+$/.test(dateValue) ? Number(dateValue) : dateValue;
        const date = new Date(ts);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    } catch (e) {
        console.error("Error formatting date:", dateValue, e);
        return "";
    }
};

// --- Reusable Components ---
// <<< FIX 3: Removed incorrect ': void' signature hint
const Modal = ({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void; }) => {
    const isSuccess = type === "success";
    // Basic Modal Implementation (replace with your actual component if different)
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: '1.5rem 2rem', borderRadius: '0.75rem', maxWidth: '400px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{isSuccess ? "Success" : "Error"}</h2>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p>
                <button onClick={onClose} style={{ ...buttonStyle, backgroundColor: isSuccess ? "#10b981" : "#ef4444", width: "100%" }}>OK</button>
            </div>
        </div>
    );
};
const FormSection = ({ title, children }: { title: string; children: ReactNode; }) => ( <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "2rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)", }}> <h2 style={{ fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem", marginTop: 0 }}> {title} </h2> {children} </div> );
const InputField = ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => ( <div> {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", }}> {label} </label>} <input style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", }} {...props} /> </div> );
const TextAreaField = ({ label, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => ( <div> {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", }}> {label} </label>} <textarea style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", minHeight: "80px", }} {...props} /> </div> );


// --- Main Component ---
export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.invoiceId as string; // Assuming route param is invoiceId

  // --- State ---
  const [clientInfo, setClientInfo] = useState<IClientInfo | null>(null);
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [taxPercentage, setTaxPercentage] = useState<number | string>(0);
  const [termsOfService, setTermsOfService] = useState("");
  const [originalStatus, setOriginalStatus] = useState<string | null>(null); // To track if invoice was draft
  const [modalInfo, setModalInfo] = useState<{ message: string; type: "success" | "error"; } | null>(null);


  // --- GraphQL Query & Mutation ---
  const { loading: dataLoading, error: dataError, data } = useQuery<{ invoice: InvoiceForEdit }>(
    GET_EDIT_INVOICE_DATA,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: "cache-and-network", // Ensure fresh data
      onCompleted: (data) => {
        if (!data?.invoice) {
            setModalInfo({ type: 'error', message: 'Invoice not found or could not be loaded.' });
            return;
        };
        const { invoice } = data;
        setOriginalStatus(invoice.status); // Store original status

        // Check if editable *after* setting status
        if (invoice.status !== 'Draft') {
            // Display modal but still populate state for read-only view if desired
            setModalInfo({ type: 'error', message: `Invoice is ${invoice.status} and cannot be edited.` });
        }

        setClientInfo(invoice.clientInfo);
        setLineItems(
          invoice.lineItems?.map((item) => ({
            ...item,
            key: crypto.randomUUID(), // Add key for React
            productId: "temp-id", // Placeholder
          })) || []
        );
        setIssueDate(formatDateForInput(invoice.issueDate));
        setDueDate(formatDateForInput(invoice.dueDate));
        setInstallationDate(formatDateForInput(invoice.installationDate));
        setTaxPercentage(invoice.taxPercentage ?? 0);
        setTermsOfService(invoice.termsOfService ?? "");
      },
       onError: (error) => {
            setModalInfo({ type: 'error', message: `Error loading invoice: ${error.message}` });
       }
    }
  );

  const [updateInvoice, { loading: mutationLoading, error: mutationError }] = useMutation(
    UPDATE_INVOICE,
    {
      onCompleted: () => {
        setModalInfo({ type: "success", message: "Invoice updated successfully!" });
        // Redirecting in handleCloseModal
      },
      onError: (error) => setModalInfo({ type: "error", message: `Update failed: ${error.message}` }),
       // Refetch details to get potentially recalculated totals from backend
       // Refetch list to update status/totals there
       refetchQueries: [ { query: GET_EDIT_INVOICE_DATA, variables: { id } }, GET_INVOICES ],
       awaitRefetchQueries: true,
    }
  );

  // --- Calculations ---
  const subtotal = useMemo(() => lineItems.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0), [lineItems]);
  const taxAmount = useMemo(() => (subtotal * (Number(taxPercentage) / 100)), [subtotal, taxPercentage]);
  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  // --- Handlers ---
   const handleClientInfoChange = (field: keyof IClientInfo, value: string) => {
        setClientInfo(prev => prev ? { ...prev, [field]: value } : null);
   };

  const handleProductSelect = (index: number, product: ProductSearchResult) => {
    setLineItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, productId: product.id, productName: product.name, price: product.price, description: product.description || ""} : item
      )
    );
  };

  const handleLineItemChange = (index: number, field: keyof Omit<LineItemState, 'key'>, value: string | number) => {
    setLineItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
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

    if (originalStatus !== 'Draft') {
        setModalInfo({ type: "error", message: "This invoice is not a draft and cannot be edited." });
        return;
    }

    if (!clientInfo) {
        setModalInfo({ type: "error", message: "Client information is missing." });
        return;
    }

    const finalLineItems = lineItems
      .map((item) => ({ productName: item.productName, quantity: Number(item.quantity) || 1, price: Number(item.price) || 0, description: item.description || "" }))
      .filter((item) => item.productName && item.quantity > 0 && item.price >= 0);

    if (finalLineItems.length === 0) {
      setModalInfo({ message: "Please add at least one valid product line item.", type: "error" });
      return;
    }

    // Construct the input for the update mutation
    const input: UpdateInvoiceInput = {
      clientInfo: { // Send the potentially updated client snapshot
        name: clientInfo.name,
        phone: clientInfo.phone,
        email: clientInfo.email,
        billingAddress: clientInfo.billingAddress,
        installationAddress: clientInfo.installationAddress,
      },
      issueDate: issueDate || undefined, // Send if changed or has value
      dueDate: dueDate || null, // Send null if empty
      installationDate: installationDate || null, // Send null if empty
      lineItems: finalLineItems,
      taxPercentage: Number(taxPercentage) || 0,
      termsOfService: termsOfService || null, // Send null if empty
    };

    updateInvoice({ variables: { id, input } });
  };

  const handleCloseModal = () => {
    if (modalInfo?.type === "success") {
      router.push(`/invoices/${id}`); // Redirect back to detail page on success
    } else if (modalInfo?.message.includes("cannot be edited")) {
         router.back(); // Go back if the error was about non-draft status
    }
     else {
      setModalInfo(null); // Close other error modals
    }
  };

   // --- Render Logic ---
   if (dataLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading invoice data...</div>;
   // Error modal handles most loading errors via onError
   if (dataError && !data?.invoice) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>Error loading invoice data. Please try again or go back.</div>;
   // If data loaded but invoice object is missing
   if (!data?.invoice && !dataLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Invoice not found.</div>;
    // Client info check - should be populated if invoice exists
   if (!clientInfo && !dataLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Could not load client details for the invoice.</div>;


   // Check for non-draft status *after* ensuring data is loaded
   if (!dataLoading && originalStatus && originalStatus !== 'Draft') {
     return (
        <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem 1rem 4rem 1rem" }}>
            {/* Show modal immediately if status was wrong on load */}
            {modalInfo && ( <Modal type={modalInfo.type} message={modalInfo.message} onClose={handleCloseModal} /> )}
            <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>Edit Invoice</h1>
            <p style={{textAlign: 'center', background: '#fff8e1', padding: '1rem', borderRadius: '8px', border: '1px solid #ffecb3'}}>
                This invoice has status {originalStatus} and cannot be edited.
            </p>
            <button onClick={() => router.back()} style={{...buttonStyle, background: '#6c757d', display: 'block', margin: '1rem auto 0 auto' }}>Go Back</button>
        </div>
     );
   }


  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem 1rem 4rem 1rem" }}>
      {/* Modal for success/failure feedback */}
      {modalInfo && ( <Modal type={modalInfo.type} message={modalInfo.message} onClose={handleCloseModal} /> )}
      <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "2rem" }}> Edit Invoice ({data?.invoice?.invoiceId}) </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
         {/* Client Details Section - Editable */}
        <FormSection title="Client Details">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            <InputField label="Client Name" value={clientInfo?.name || ''} onChange={(e) => handleClientInfoChange('name', e.target.value)} required />
            <InputField label="Client Phone" value={clientInfo?.phone || ''} onChange={(e) => handleClientInfoChange('phone', e.target.value)} />
            <InputField label="Client Email" type="email" value={clientInfo?.email || ''} onChange={(e) => handleClientInfoChange('email', e.target.value)} />
            <InputField label="Billing Address" value={clientInfo?.billingAddress || ''} onChange={(e) => handleClientInfoChange('billingAddress', e.target.value)} required />
            <InputField label="Installation Address" value={clientInfo?.installationAddress || ''} onChange={(e) => handleClientInfoChange('installationAddress', e.target.value)} required />
          </div>
        </FormSection>

        {/* Invoice Dates - Editable */}
        <FormSection title="Invoice Dates">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            <InputField label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            <InputField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <InputField label="Installation Date" type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
          </div>
        </FormSection>

        {/* Products & Services - Editable */}
        <FormSection title="Products & Services">
           <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {lineItems.map((item, index) => (
              <div key={item.key} style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontWeight: "600" }}>Item #{index + 1}</label>
                  {lineItems.length > 1 && ( <button type="button" onClick={() => removeLineItem(index)} style={{ ...buttonStyle, backgroundColor: "#fee2e2", color: "#ef4444", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}> Remove </button> )}
                </div>
                {/* Product Name Input */}
                 <InputField label="Product Name" value={item.productName} onChange={(e) => handleLineItemChange(index, "productName", e.target.value)} placeholder="Enter product name" required />

                {/* Description, Quantity, Price */}
                <TextAreaField label="Description" value={item.description} onChange={(e) => handleLineItemChange(index, "description", e.target.value)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <InputField label="Quantity" type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)} min="1" required/>
                  <InputField label="Price (AED)" type="number" step="0.01" value={item.price} onChange={(e) => handleLineItemChange(index, "price", e.target.value)} min="0" required/>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLineItem} style={{ ...buttonStyle, backgroundColor: "#d1fae5", color: "#065f46", marginTop: "1.5rem" }}> + Add Item </button>
        </FormSection>

        {/* Terms of Service - Editable */}
        <FormSection title="Terms of Service">
          <TextAreaField placeholder="Enter payment terms, warranty info, etc." value={termsOfService} onChange={(e) => setTermsOfService(e.target.value)} rows={4} />
        </FormSection>

        {/* Summary & Tax - Editable */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <div style={{ width: "100%", maxWidth: "350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <span style={{ fontWeight: 500 }}>Subtotal:</span> <span>{formatCurrency(subtotal)}</span> </div>
            <InputField label="VAT (%)" type="number" step="0.01" min="0" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} required/>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <span style={{ fontWeight: 500 }}>Tax Amount:</span> <span>{formatCurrency(taxAmount)}</span> </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: "700", alignItems: "center", borderTop: '1px solid #ccc', paddingTop: '0.5rem', marginTop: '0.5rem' }}> <span>Grand Total:</span> <span>{formatCurrency(grandTotal)}</span> </div>
          </div>
        </div>

        {/* Submit */}
        <div>
          {mutationError && ( <p style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}> Error: {mutationError.message} </p> )}
          {/* Disable submit button if not a draft */}
          <button type="submit" disabled={mutationLoading || originalStatus !== 'Draft'} style={{ ...buttonStyle, width: "100%", padding: "0.75rem", fontSize: "1rem", backgroundColor: "#10b981", ...((mutationLoading || originalStatus !== 'Draft') && buttonDisabledStyle) }} title={originalStatus !== 'Draft' ? "Cannot edit non-draft invoices" : ""}>
            {mutationLoading ? "Saving..." : "Save Invoice Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

