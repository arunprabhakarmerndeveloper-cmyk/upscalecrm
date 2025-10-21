"use client";

import { useState, FormEvent, ChangeEvent, ReactNode } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { GET_PRODUCTS } from "@/graphql/queries";

// --- TypeScript Interfaces ---

interface ProductFormData {
  name: string;
  productId: string;
  price: string;
  type: "product" | "service";
  description: string;
}

interface ProductInput {
  name: string;
  price: number;
  type: "product" | "service";
  description?: string;
  productId?: string;
}

// --- GraphQL Mutation ---

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
      id
    }
  }
`;

export default function NewProductPage() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();

  // --- FIX: Updated initial state to use 'productId' ---
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    productId: "",
    price: "",
    type: "product",
    description: "",
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalOnClose, setModalOnClose] = useState(() => () => {});

  const [createProduct, { loading: mutationLoading, error }] = useMutation(
    CREATE_PRODUCT,
    {
      onCompleted: () => {
        setShowSuccessModal(true);

        setModalOnClose(() => () => {
          setShowSuccessModal(false);
          router.push(`/products`);
        });
      },
      refetchQueries: [{ query: GET_PRODUCTS }],
      awaitRefetchQueries: true,
    }
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- NEW: A function to generate a unique product ID ---
  const generateProductId = () => {
    if (!formData.name) {
      alert("Please enter a product name first to generate an ID.");
      return;
    }
    // Creates an acronym from the name, e.g., "AquaPure Pro" -> "APP"
    const acronym = formData.name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();

    // Adds 4 random alphanumeric characters
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newId = `${acronym}-${randomPart}`;
    setFormData({ ...formData, productId: newId });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const input: ProductInput = {
      name: formData.name,
      price: parseFloat(formData.price),
      type: formData.type,
      description: formData.description || undefined,
      productId: formData.productId || undefined,
    };

    createProduct({ variables: { input } });
  };

  if (authLoading)
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>Loading...</div>
    );

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "2rem 1rem" }}>
      {showSuccessModal && (
        <SuccessModal
          message="Product created successfully!"
          onClose={modalOnClose}
        />
      )}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: "700" }}>
            Add New Product/Service
          </h1>
          <button
            type="submit"
            disabled={mutationLoading}
            style={{ ...buttonStyle, opacity: mutationLoading ? 0.6 : 1 }}
          >
            {mutationLoading ? "Saving..." : "Save Product"}
          </button>
        </div>

        <FormSection title="Product Information">
          <div style={gridStyle}>
            <InputField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., AquaPure Pro Purifier"
            />
            <SelectField
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="product">Product</option>
              <option value="service">Service</option>
            </SelectField>
            <InputField
              label="Price (AED)"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              required
              placeholder="e.g., 1500.00"
            />

            {/* --- FIX: Input field now uses 'productId' and has the generate button --- */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <InputField
                label="Product ID (Optional)"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                placeholder="e.g., APP-001"
              />
              <button
                type="button"
                onClick={generateProductId}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  padding: "0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                Generate from Name
              </button>
            </div>
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <TextAreaField
              label="Description (Optional)"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
        </FormSection>

        {error && (
          <p style={{ color: "red", textAlign: "center" }}>
            Error: {error.message}
          </p>
        )}

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}
        >
          <Link
            href="/products"
            style={{
              ...buttonStyle,
              backgroundColor: "#f3f4f6",
              color: "#374151",
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// --- NEW Success Modal Component ---
const SuccessModal = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "0.75rem",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          margin: "0 auto 1rem auto",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          backgroundColor: "#d1fae5",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <svg
          style={{ width: "24px", height: "24px", color: "#065f46" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "0.5rem",
        }}
      >
        Success
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>
      <button
        onClick={onClose}
        style={{
          ...buttonStyle,
          backgroundColor: "#10b981",
          color: "white",
          width: "100%",
        }}
      >
        OK
      </button>
    </div>
  </div>
);

// --- Typed Helper Components & Styles ---

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div
    style={{
      backgroundColor: "#fff",
      borderRadius: "0.75rem",
      padding: "1.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
    }}
  >
    <h2
      style={{
        fontSize: "1.25rem",
        fontWeight: "600",
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "1rem",
        marginBottom: "1.5rem",
      }}
    >
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
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "500",
        color: "#4b5563",
      }}
    >
      {label}
    </label>
    <input
      style={{
        width: "100%",
        padding: "0.6rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        outline: "none",
      }}
      {...props}
    />
  </div>
);

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}
const TextAreaField = ({ label, ...props }: TextAreaFieldProps) => (
  <div>
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "500",
        color: "#4b5563",
      }}
    >
      {label}
    </label>
    <textarea
      rows={3}
      style={{
        width: "100%",
        padding: "0.6rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        outline: "none",
      }}
      {...props}
    />
  </div>
);

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}
const SelectField = ({ label, children, ...props }: SelectFieldProps) => (
  <div>
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "500",
        color: "#4b5563",
      }}
    >
      {label}
    </label>
    <select
      style={{
        width: "100%",
        padding: "0.6rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        backgroundColor: "white",
      }}
      {...props}
    >
      {children}
    </select>
  </div>
);

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "1.5rem",
  alignItems: "start",
};
const buttonStyle: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "#fff",
  fontWeight: "600",
  padding: "0.6rem 1.5rem",
  borderRadius: "0.375rem",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
};
