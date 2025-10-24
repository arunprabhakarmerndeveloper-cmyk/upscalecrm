"use client";

import React, { useState, useMemo, FormEvent, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  SearchableProductSelect,
  ProductSearchResult,
} from "@/app/components/SearchableProductSelect";
import Link from "next/link";

// --- TypeScript Interfaces ---
interface ClientInfoState {
  name: string;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  installationAddress: string | null;
}

interface LineItemState {
  // Adding a temporary unique key for React rendering
  key: string;
  productId: string;
  productName: string;
  quantity: number | string;
  price: number | string;
  description: string;
}

interface CommercialTermState {
  title: string;
  content: string;
}

interface QuotationForEdit {
  id: string;
  clientInfo: ClientInfoState;
  lineItems:
    | {
        productName: string;
        quantity: number;
        price: number;
        description: string;
      }[]
    | null;
  validUntil: string | number | null;
  commercialTerms: CommercialTermState[] | null;
  imageUrls?: string[];
  taxPercentage?: number; // Added field
}

interface UpdateQuotationInput {
  clientInfo?: ClientInfoState;
  lineItems: {
    productName: string;
    quantity: number;
    price: number;
    description: string;
  }[];
  validUntil?: string | null;
  commercialTerms?: Omit<CommercialTermState, "__typename">[];
  reason: string;
  totalAmount: number; // Subtotal
  taxPercentage: number;
  grandTotal: number; // Grand Total
  imageUrls?: string[];
}

// --- GraphQL ---
// 👇 FIX 1: Added taxPercentage to the query
const GET_EDIT_QUOTATION_DATA = gql`
  query GetEditQuotationData($id: ID!) {
    quotation(id: $id) {
      id
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
      validUntil
      commercialTerms {
        title
        content
      }
      imageUrls
      taxPercentage
    }
  }
`;

const UPDATE_QUOTATION = gql`
  mutation UpdateQuotation($id: ID!, $input: UpdateQuotationInput!) {
    updateQuotation(id: $id, input: $input) {
      id
    }
  }
`;

// --- Reusable UI Components (Assumed to be unchanged) ---
const buttonStyle: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  padding: "0.75rem 1.5rem",
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  transition: "background-color 0.2s",
};
const Modal = ({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void; }) => {
    const isSuccess = type === "success";
    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, }}>
            <div style={{ backgroundColor: "white", padding: "1.5rem 2rem", borderRadius: "0.75rem", width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", textAlign: "center", }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    {isSuccess ? "Success" : "Error"}
                </h2>
                <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>
                <button onClick={onClose} style={{ ...buttonStyle, backgroundColor: isSuccess ? "#10b981" : "#ef4444", color: "white", width: "100%", }}>
                    OK
                </button>
            </div>
        </div>
    );
};
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "2rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)", }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem", }}>
            {title}
        </h2>
        {children}
    </div>
);
const InputField = ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
        {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", }}>{label}</label>}
        <input style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", }} {...props} />
    </div>
);
const TextAreaField = ({ label, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <div>
        {label && <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.875rem", }}>{label}</label>}
        <textarea style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", minHeight: "80px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", }} {...props} />
    </div>
);

// --- Main Component ---
export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.quotationId as string;

  // --- State ---
  const [clientInfo, setClientInfo] = useState<ClientInfoState | null>(null);
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [commercialTerms, setCommercialTerms] = useState<CommercialTermState[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [updateReason, setUpdateReason] = useState("");
  // 👇 FIX 2: Renamed state to match backend schema
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [modal, setModal] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // --- GraphQL ---
  const { loading: dataLoading, error: dataError } = useQuery<{ quotation: QuotationForEdit }>(
    GET_EDIT_QUOTATION_DATA,
    {
      variables: { id },
      skip: !id,
      onCompleted: (data) => {
        if (!data?.quotation) return;
        const { quotation } = data;
        setClientInfo(quotation.clientInfo);
        setLineItems(
          quotation.lineItems?.map((item) => ({
            ...item,
            key: crypto.randomUUID(), // Add a unique key for stable rendering
            productId: "temp-id", // Keeps existing logic
          })) || []
        );
        if (quotation.validUntil)
          setValidUntil(new Date(Number(quotation.validUntil)).toISOString().split("T")[0]);
        if (quotation.commercialTerms) setCommercialTerms(quotation.commercialTerms);
        if (quotation.imageUrls) setImageUrls(quotation.imageUrls);
        // 👇 FIX 3: Set initial tax percentage from fetched data
        if (quotation.taxPercentage) setTaxPercentage(quotation.taxPercentage);
      },
    }
  );

  const [updateQuotation, { loading: mutationLoading }] = useMutation(
    UPDATE_QUOTATION,
    {
      onCompleted: () => setModal({ type: "success", message: "Quotation updated successfully!" }),
      onError: (error) => setModal({ type: "error", message: error.message }),
    }
  );

  // --- Computed ---
  const subtotal = useMemo(
    () =>
      lineItems.reduce(
        (total, item) => total + Number(item.quantity) * Number(item.price),
        0
      ),
    [lineItems]
  );

  // 👇 FIX 4: Renamed to grandTotal for clarity
  const grandTotal = useMemo(() => subtotal + (subtotal * (taxPercentage / 100)), [subtotal, taxPercentage]);

  // --- Handlers ---
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!updateReason) {
      setModal({ type: "error", message: "Please provide a reason for this update." });
      return;
    }

    const finalLineItems = lineItems
      .map(({ productName, quantity, price, description }) => ({
        productName,
        quantity: Number(quantity) || 1,
        price: Number(price) || 0,
        description,
      }))
      .filter((item) => item.productName);

    if (finalLineItems.length === 0) {
        setModal({ type: "error", message: "Please add at least one product." });
        return;
    }

    // 👇 FIX: Create a "clean" clientInfo object without the __typename field
    const cleanClientInfo = clientInfo ? {
        name: clientInfo.name,
        phone: clientInfo.phone,
        email: clientInfo.email,
        billingAddress: clientInfo.billingAddress,
        installationAddress: clientInfo.installationAddress,
    } : undefined;


    const input: UpdateQuotationInput = {
      clientInfo: cleanClientInfo, // Use the clean object here
      lineItems: finalLineItems,
      validUntil: validUntil || null,
      commercialTerms: commercialTerms.map(({ title, content }) => ({ title, content })),
      reason: updateReason,
      totalAmount: subtotal,
      taxPercentage: taxPercentage,
      grandTotal: grandTotal,
      imageUrls,
    };

    updateQuotation({ variables: { id, input } });
  };

    const handleProductSelect = (index: number, product: ProductSearchResult) => {
        setLineItems((current) =>
            current.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        productId: product.id,
                        productName: product.name,
                        price: product.price,
                        description: product.description || "",
                    }
                    : item
            )
        );
    };

    const handleLineItemChange = (
        index: number,
        field: keyof Omit<LineItemState, 'key'>,
        value: string | number
    ) => {
        setLineItems((current) =>
            current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const addLineItem = () =>
        setLineItems((prev) => [
            ...prev,
            { key: crypto.randomUUID(), productId: "", productName: "", quantity: 1, price: 0, description: "" },
        ]);

    const removeLineItem = (index: number) =>
        setLineItems((prev) => prev.filter((_, i) => i !== index));

    const addCommercialTerm = () =>
        setCommercialTerms((prev) => [...prev, { title: "", content: "" }]);

    const removeCommercialTerm = (index: number) =>
        setCommercialTerms((prev) => prev.filter((_, i) => i !== index));

    const handleTermChange = (
        index: number,
        field: keyof CommercialTermState,
        value: string
    ) =>
        setCommercialTerms((prev) =>
            prev.map((term, i) => (i === index ? { ...term, [field]: value } : term))
        );

    const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (const file of Array.from(files)) {
                // This is a placeholder for actual upload logic. 
                // In a real app, you would upload to a service (like S3, Cloudinary)
                // and get a URL back. For now, we use a local blob URL.
                const fileUrl = URL.createObjectURL(file);
                uploadedUrls.push(fileUrl);
            }
            setImageUrls((prev) => [...prev, ...uploadedUrls]);
        } catch (err) {
            setModal({ type: "error", message: "Image processing failed." });
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index: number) =>
        setImageUrls((prev) => prev.filter((_, i) => i !== index));

    const handleCloseModal = () => {
        if (modal?.type === "success") {
            router.push(`/quotations/${id}`);
        }
        setModal(null);
    };


  if (dataLoading) return <div style={{ textAlign: "center", marginTop: "5rem" }}>Loading...</div>;
  if (dataError) return <div style={{ color: "red", textAlign: "center" }}>{dataError.message}</div>;
  if (!clientInfo) return <div style={{ textAlign: "center", marginTop: "5rem" }}>Quotation data not found.</div>;

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem 1rem 4rem 1rem" }}>
      {modal && <Modal type={modal.type} message={modal.message} onClose={handleCloseModal} />}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Edit Quotation</h1>
        </div>

        {/* Client Details */}
        <FormSection title="Client Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <InputField
              label="Client Name"
              value={clientInfo.name}
              onChange={(e) => setClientInfo((c) => c && { ...c, name: e.target.value })}
            />
            <InputField
              label="Client Phone"
              value={clientInfo.phone || ""}
              onChange={(e) => setClientInfo((c) => c && { ...c, phone: e.target.value })}
            />
            <InputField
              label="Client Email"
              type="email"
              value={clientInfo.email || ""}
              onChange={(e) => setClientInfo((c) => c && { ...c, email: e.target.value })}
            />
          </div>
          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
             <InputField
               label="Billing Address"
               value={clientInfo.billingAddress || ""}
               onChange={(e) => setClientInfo((c) => c && { ...c, billingAddress: e.target.value })}
            />
            <InputField
               label="Installation Address"
               value={clientInfo.installationAddress || ""}
               onChange={(e) => setClientInfo((c) => c && { ...c, installationAddress: e.target.value })}
            />
          </div>
        </FormSection>

        {/* Products & Services */}
        <FormSection title="Products & Services">
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {lineItems.map((item, index) => (
              <div
                key={item.key} // Use the unique key here
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontWeight: 600 }}>Item #{index + 1}</label>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      style={{ ...buttonStyle, backgroundColor: "#fee2e2", color: "#ef4444", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {item.productId ? (
                  <div style={{ border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{item.productName}</div>
                    <button
                      type="button"
                      onClick={() => handleLineItemChange(index, "productId", "")}
                      style={{ ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151", padding: "0.5rem 1rem" }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <SearchableProductSelect onProductSelect={(product) => handleProductSelect(index, product)} />
                )}

                {item.productId && (
                  <>
                    <TextAreaField
                      label="Description"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <InputField
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                      />
                      <InputField
                        label="Price (AED)"
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleLineItemChange(index, "price", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLineItem}
            style={{ ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151", marginTop: "1.5rem" }}
          >
            + Add Item
          </button>
        </FormSection>

        {/* Images */}
        <FormSection title="Images">
            <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="image-upload" style={isUploading ? { ...buttonStyle, opacity: 0.6, cursor: "not-allowed" } : { ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151" }}>
                    {isUploading ? "Uploading..." : "Upload More Images"}
                </label>
                <input id="image-upload" type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} disabled={isUploading}/>
            </div>
            {imageUrls.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "1rem" }}>
                    {imageUrls.map((url, index) => (
                        <div key={url + index} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                            <Image src={url} alt={`Quotation image ${index + 1}`} fill style={{ objectFit: "cover" }} />
                            <button type="button" onClick={() => removeImage(index)} style={{ position: "absolute", top: "0.25rem", right: "0.25rem", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: "bold" }}>
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </FormSection>

        {/* Commercial Terms */}
        <FormSection title="Commercial Terms">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {commercialTerms.map((term, index) => (
                    <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                        <div style={{ flexGrow: 1 }}><InputField placeholder="Term Title" value={term.title} onChange={(e) => handleTermChange(index, "title", e.target.value)}/></div>
                        <div style={{ flexGrow: 2 }}><TextAreaField placeholder="Enter detailed term..." value={term.content} onChange={(e) => handleTermChange(index, "content", e.target.value)}/></div>
                        <button type="button" onClick={() => removeCommercialTerm(index)} style={{ ...buttonStyle, backgroundColor: "#fee2e2", color: "#ef4444", height: "fit-content", alignSelf: "center" }}>
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={addCommercialTerm} style={{ ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151", marginTop: "1.5rem" }}>
                + Add Term
            </button>
        </FormSection>

        {/* Summary, Tax & Validity */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <div style={{ width: "100%", maxWidth: "350px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <InputField
              label="VAT (%)"
              type="number"
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(Number(e.target.value) || 0)}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 700, alignItems: "center" }}>
              <span>Grand Total:</span>
              <span>{new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(grandTotal)}</span>
            </div>
            <InputField label="Valid Until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        {/* Reason for Update */}
        <FormSection title="Reason for Update">
          <InputField
            label="Reason for this change (Required)"
            value={updateReason}
            onChange={(e) => setUpdateReason(e.target.value)}
            required
            placeholder="e.g., Client requested change in quantity"
          />
        </FormSection>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "2rem" }}>
          <Link
            href={`/quotations/${id}`}
            style={{ ...buttonStyle, textDecoration: "none", backgroundColor: "#f3f4f6", color: "#374151" }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutationLoading || isUploading}
            style={{ ...buttonStyle, opacity: mutationLoading || isUploading ? 0.6 : 1, backgroundColor: "#10b981" }}
          >
            {mutationLoading || isUploading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}