"use client";

import { useState, FormEvent, ChangeEvent, ReactNode } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GET_CLIENTS } from '@/graphql/queries';

interface Address {
  tag: string;
  address: string;
}

interface ClientFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  addresses: Address[];
}

interface ClientsQueryData {
  clients: {
    id: string;
    name: string; 
    phone?: string;
    email?: string;
  }[];
}

const CREATE_CLIENT = gql`
  mutation CreateClient($input: ClientInput!) {
    createClient(input: $input) {
      id
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

export default function NewClientPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    addresses: [{ tag: "Billing", address: "" }],
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalOnClose, setModalOnClose] = useState(() => () => {});

  const [createClient, { loading, error }] = useMutation(CREATE_CLIENT, {
    onCompleted: (data) => {
      const newClientId = data.createClient.id;
      setShowSuccessModal(true);

      setModalOnClose(() => () => {
        setShowSuccessModal(false);
        router.push(`/clients/${newClientId}`);
      });
    },
    update: (cache, { data: { createClient: newClient } }) => {
      try {
        const existingData = cache.readQuery<ClientsQueryData>({ query: GET_CLIENTS });

        if (existingData) {
          cache.writeQuery({
            query: GET_CLIENTS,
            data: {
              clients: [...existingData.clients, newClient],
            },
          });
        }
      } catch (e) {
        console.error("Error updating cache after client creation:", e);
      }
    }
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (
    index: number,
    field: keyof Address,
    value: string
  ) => {
    const updatedAddresses = [...formData.addresses];
    updatedAddresses[index][field] = value;
    setFormData({ ...formData, addresses: updatedAddresses });
  };

  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, { tag: "", address: "" }],
    });
  };

  const removeAddress = (index: number) => {
    const updatedAddresses = formData.addresses.filter((_, i) => i !== index);
    setFormData({ ...formData, addresses: updatedAddresses });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalInput = {
      ...formData,
      addresses: formData.addresses.filter((addr) => addr.tag && addr.address),
    };
    createClient({ variables: { input: finalInput } });
  };

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "2rem 1rem" }}>

      {showSuccessModal && (
        <SuccessModal 
          message="Client created successfully!"
          onClose={modalOnClose}
        />
      )}

      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: "700",
          marginBottom: "2rem",
        }}
      >
        Add New Client
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
      >
        <FormSection title="Primary Information">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <InputField
              label="Client / Company Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <InputField
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
            />
            <InputField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
            <InputField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </FormSection>

        <FormSection title="Addresses">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
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
                <InputField
                  label="Address Tag"
                  placeholder="e.g., Billing, Site 1"
                  value={addr.tag}
                  onChange={(e) =>
                    handleAddressChange(index, "tag", e.target.value)
                  }
                  required={!!addr.address}
                />
                <InputField
                  label="Full Address"
                  placeholder="Enter full address"
                  value={addr.address}
                  onChange={(e) =>
                    handleAddressChange(index, "address", e.target.value)
                  }
                  required={!!addr.tag}
                />
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
          <button
            type="button"
            onClick={addAddress}
            style={{
              ...buttonStyle,
              backgroundColor: "#3b82f6",
              color: "white",
              marginTop: "1rem",
            }}
          >
            + Add Another Address
          </button>
        </FormSection>

        {error && (
          <p style={{ color: "red", textAlign: "center" }}>
            Error: {error.message}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <Link
            href="/clients"
            style={{
              ...buttonStyle,
              backgroundColor: "#9ca3af",
              color: "white",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: "#10b981",
              color: "white",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save Client"}
          </button>
        </div>
      </form>
    </div>
  );
}



// --- NEW Success Modal Component ---
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
      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
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
  <div style={{ width: "100%" }}>
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "500",
      }}
    >
      {label}
    </label>
    <input
      style={{
        width: "100%",
        padding: "0.6rem 0.8rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.375rem",
        boxSizing: "border-box",
      }}
      {...props}
    />
  </div>
);

const buttonStyle: React.CSSProperties = {
  padding: "0.6rem 1.2rem",
  fontWeight: "600",
  borderRadius: "0.375rem",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  display: "inline-block",
  width: "auto",
  transition: "all 0.2s ease",
};
