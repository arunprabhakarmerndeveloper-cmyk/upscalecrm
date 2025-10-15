"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

// --- TypeScript Interfaces ---

// Describes the structure of the form's state
interface ProductFormData {
  name: string;
  sku: string;
  price: string; // Use string for input field compatibility
  type: "product" | "service";
  description: string;
}

// Describes the data from the GET_PRODUCT_FOR_EDIT query
interface ProductForEdit {
  id: string;
  name: string | null;
  sku: string | null;
  price: number | null;
  type: "product" | "service" | null;
  description: string | null;
}

interface GetProductForEditData {
  product: ProductForEdit;
}

// --- Queries & Mutations ---
const GET_PRODUCT_FOR_EDIT = gql`
  query GetProductForEdit($id: ID!) {
    product(id: $id) {
      id
      name
      sku
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

  // Apply the ProductFormData interface to the component's state
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    price: "",
    type: "product",
    description: "",
  });

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
        sku: product.sku || "",
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
        alert("✅ Product/Service updated successfully!");
        router.push("/products");
      },
      refetchQueries: ["GetProducts"],
    }
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!id) return; // Guard clause
    const input = {
      name: formData.name,
      sku: formData.sku,
      price: parseFloat(formData.price),
      type: formData.type,
      description: formData.description,
    };
    updateProduct({ variables: { id, input } });
  };

  if (authLoading) return <p style={{ textAlign: "center", marginTop: "5rem" }}>Loading user...</p>;
  if (!user) return <p style={{ textAlign: "center", marginTop: "5rem", color: "red" }}>User not found.</p>;
  if (queryLoading) return <p style={{ textAlign: "center", marginTop: "5rem" }}>Loading product...</p>;
  if (queryError) return <p style={{ color: "red", textAlign: "center", marginTop: "5rem" }}>Error: {queryError.message}</p>;
  if (!data?.product) return <p style={{ color: "red", textAlign: "center", marginTop: "5rem" }}>Product not found.</p>;

  return (
    <div style={{ maxWidth: 700, margin: "auto", padding: "2rem 1rem" }}>
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
            <InputField label="SKU (Optional)" name="sku" value={formData.sku} onChange={handleChange} />
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

// --- Typed Helper Components & Styles ---

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
  children: React.ReactNode;
}
const SelectField = ({ label, children, ...props }: SelectFieldProps) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, fontWeight: 500, color: "#4b5563" }}>{label}</label>
    <select style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8, backgroundColor: "white" }} {...props}>
      {children}
    </select>
  </div>
);

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 };
const buttonStyle: React.CSSProperties = { backgroundColor: "#2563eb", color: "#fff", fontWeight: 600, padding: "0.6rem 1.5rem", borderRadius: 6, border: "none", cursor: "pointer", textDecoration: "none" };