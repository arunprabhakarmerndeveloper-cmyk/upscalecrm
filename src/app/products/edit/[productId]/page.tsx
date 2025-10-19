"use client";

import { useState, useEffect, FormEvent, ChangeEvent, ReactNode } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

// --- TypeScript Interfaces ---

type ProductType = "product" | "service";

interface ProductFormData {
  name: string;
  productId: string;
  price: string;
  type: ProductType;
  description: string;
}

interface ProductForEdit {
  id: string;
  name: string | null;
  productId: string | null;
  price: number | null;
  type: ProductType | null;
  description: string | null;
}

interface GetProductForEditData {
  product: ProductForEdit;
}

// --- FIX: Create a specific interface for the mutation input ---
interface ProductInput {
  name: string;
  price: number;
  type: ProductType;
  description: string;
  productId?: string; // Optional field
}


// --- Queries & Mutations ---
const GET_PRODUCT_FOR_EDIT = gql`
  query GetProductForEdit($id: ID!) {
    product(id: $id) {
      id
      name
      productId
      price
      type
      description
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

export default function EditProductPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.productId) ? params.productId[0] : (params.productId as string);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    productId: "",
    price: "",
    type: "product",
    description: "",
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { data, loading: queryLoading, error: queryError } = useQuery<GetProductForEditData>(GET_PRODUCT_FOR_EDIT, {
    variables: { id },
    skip: !user || !id,
    fetchPolicy: "network-only",
    onError: (err) => console.error("Error fetching product:", err),
  });

  useEffect(() => {
    if (data?.product) {
      const { product } = data;
      setFormData({
        name: product.name || "",
        productId: product.productId || "",
        price: product.price ? String(product.price) : "",
        type: product.type || "product",
        description: product.description || "",
      });
    }
  }, [data]);

  const [updateProduct, { loading: mutationLoading, error: mutationError }] = useMutation(
    UPDATE_PRODUCT,
    {
      onCompleted: () => {
        setShowSuccessModal(true);
      },
      refetchQueries: ["GetProducts"],
    }
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const generateProductId = () => {
      if (!formData.name) {
          alert('Please enter a product name first to generate an ID.');
          return;
      }
      const acronym = formData.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newId = `${acronym}-${randomPart}`;
      setFormData({ ...formData, productId: newId });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    // --- FIX: Use the specific ProductInput interface ---
    const input: ProductInput = {
      name: formData.name,
      price: parseFloat(formData.price),
      type: formData.type,
      description: formData.description,
    };

    if (formData.productId) {
        input.productId = formData.productId;
    }

    updateProduct({ variables: { id, input } });
  };

  if (authLoading) return <p style={{ textAlign: "center", marginTop: "5rem" }}>Loading user...</p>;
  if (!user) return <p style={{ textAlign: "center", marginTop: "5rem", color: "red" }}>User not found.</p>;
  if (queryLoading) return <p style={{ textAlign: "center", marginTop: "5rem" }}>Loading product...</p>;
  if (queryError) return <p style={{ color: "red", textAlign: "center", marginTop: "5rem" }}>Error: {queryError.message}</p>;
  if (!data?.product) return <p style={{ color: "red", textAlign: "center", marginTop: "5rem" }}>Product not found.</p>;

  return (
    <div style={{ maxWidth: 700, margin: "auto", padding: "2rem 1rem" }}>
      {showSuccessModal && (
        <SuccessModal 
            message="Product/Service updated successfully!"
            onClose={() => {
                setShowSuccessModal(false);
                router.push("/products");
            }}
        />
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Edit Product/Service</h1>
          <button type="submit" disabled={mutationLoading} style={{ ...buttonStyle, opacity: mutationLoading ? 0.6 : 1 }}>
            {mutationLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <FormSection title="Product Information">
          <div style={gridStyle}>
            <InputField label="Name" name="name" value={formData.name} onChange={handleChange} required />
            <SelectField label="Type" name="type" value={formData.type} onChange={handleChange}>
              <option value="product">Product</option>
              <option value="service">Service</option>
            </SelectField>
            <InputField label="Price (AED)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <InputField label="Product ID (Optional)" name="productId" value={formData.productId} onChange={handleChange} />
                <button 
                    type="button" 
                    onClick={generateProductId} 
                    style={{ ...buttonStyle, backgroundColor: '#f3f4f6', color: '#374151', padding: '0.5rem', fontSize: '0.875rem' }}
                >
                    Generate from Name
                </button>
            </div>
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <TextAreaField label="Description (Optional)" name="description" value={formData.description} onChange={handleChange} />
          </div>
        </FormSection>

        {mutationError && <p style={{ color: "red", textAlign: "center" }}>{mutationError.message}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <Link href="/products" style={{ ...buttonStyle, backgroundColor: "#f3f4f6", color: "#374151" }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// --- Success Modal Component ---
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

// --- Typed Helper Components & Styles ---

const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
      {title}
    </h2>
    {children}
  </div>
);

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const InputField = ({ label, ...props }: InputFieldProps) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, fontWeight: 500, color: "#4b5563" }}>{label}</label>
    <input style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8, outline: "none" }} {...props} />
  </div>
);

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}
const TextAreaField = ({ label, ...props }: TextAreaFieldProps) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, fontWeight: 500, color: "#4b5563" }}>{label}</label>
    <textarea rows={3} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8, outline: "none" }} {...props} />
  </div>
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}
const SelectField = ({ label, children, ...props }: SelectFieldProps) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, fontWeight: 500, color: "#4b5563" }}>{label}</label>
    <select style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8, backgroundColor: "white" }} {...props}>
      {children}
    </select>
  </div>
);

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24, alignItems: 'start' };
const buttonStyle: React.CSSProperties = { backgroundColor: "#2563eb", color: "#fff", fontWeight: 600, padding: "0.6rem 1.5rem", borderRadius: 6, border: "none", cursor: "pointer", textDecoration: "none" };

