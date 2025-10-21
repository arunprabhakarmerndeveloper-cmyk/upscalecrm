"use client";

import React, { useState, useEffect, FormEvent, ReactNode } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// --- TypeScript Interfaces ---

interface Address {
  tag: string;
  address: string;
}

interface ProductInstance {
  productId: string;
  serialNumber: string;
  purchaseDate: string;
}

interface ServiceVisit {
  scheduledDate: string;
}

interface SelectOption {
  id: string;
  name: string;
}

interface ClientWithAddresses extends SelectOption {
  addresses: Address[];
}

interface AmcFormData {
  clients: ClientWithAddresses[];
  products: SelectOption[];
}

interface LineItemForAmc {
  product: {
    id: string;
  } | null;
}

interface InvoiceForAmc {
  id: string;
  client: {
    id: string;
  };
  lineItems: LineItemForAmc[];
}

interface InvoiceData {
  invoice: InvoiceForAmc;
}

interface CreateAmcInput {
  clientId: string;
  productInstances: ProductInstance[];
  startDate: string;
  endDate: string;
  contractAmount: number;
  frequencyPerYear: number;
  serviceVisits: ServiceVisit[];
  originatingInvoiceId?: string;
  billingAddress: string;
  installationAddress: string;
  commercialTerms: string;
}

// --- GraphQL Queries & Mutations ---

const GET_AMC_FORM_DATA = gql`
  query GetAmcFormData {
    clients {
      id
      name
      addresses {
        tag
        address
      }
    }
    products(type: "product") {
      id
      name
    }
  }
`;

const GET_INVOICE_DATA_FOR_AMC = gql`
  query GetInvoiceDataForAmc($id: ID!) {
    invoice(id: $id) {
      id
      client {
        id
      }
      lineItems {
        product {
          id
        }
      }
    }
  }
`;

const CREATE_AMC = gql`
  mutation CreateAMC($input: CreateAMCInput!) {
    createAMC(input: $input) {
      id
      amcId
    }
  }
`;

// --- ✅ NEW: Modal Components ---
const Modal = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
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
        padding: "1.5rem",
        borderRadius: "0.75rem",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            &times;
          </button>
        )}
      </div>
      {children}
    </div>
  </div>
);

const SuccessModal = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <Modal title="Success" onClose={onClose}>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>
      <button
        onClick={onClose}
        style={{ ...buttonStyle, backgroundColor: "#10b981", width: "100%" }}
      >
        OK
      </button>
    </div>
  </Modal>
);

const ErrorModal = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <Modal title="Error" onClose={onClose}>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#b91c1c", marginBottom: "1.5rem" }}>{message}</p>
      <button
        onClick={onClose}
        style={{ ...buttonStyle, backgroundColor: "#ef4444", width: "100%" }}
      >
        Close
      </button>
    </div>
  </Modal>
);

export default function CreateAmcPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromInvoiceId = searchParams.get("fromInvoice");

  // State for form fields
  const [productInstances, setProductInstances] = useState<ProductInstance[]>(
    []
  );
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [frequencyPerYear, setFrequencyPerYear] = useState("4");
  const [serviceVisits, setServiceVisits] = useState<ServiceVisit[]>([]);
  const [clientAddresses, setClientAddresses] = useState<Address[]>([]);
  const [billingAddress, setBillingAddress] = useState("");
  const [commercialTerms, setCommercialTerms] = useState("");
  const [installationAddress, setInstallationAddress] = useState("");
  const [isSameAddress, setIsSameAddress] = useState(true);

  // --- ✅ NEW: State for managing modals ---
  const [modal, setModal] = useState<{ type: 'success' | 'error' | null; message: string; data?: { id: string; amcId: string; } }>({ type: null, message: '', data: undefined });

  const { data: formData, loading: formLoading } =
    useQuery<AmcFormData>(GET_AMC_FORM_DATA);
  const { data: invoiceData, loading: invoiceLoading } = useQuery<InvoiceData>(
    GET_INVOICE_DATA_FOR_AMC,
    {
      variables: { id: fromInvoiceId },
      skip: !fromInvoiceId,
    }
  );

  const [createAMC, { loading: mutationLoading }] = useMutation(CREATE_AMC, {
    onCompleted: (data) => {
      // --- ✅ FIX: Show success modal instead of alert ---
      setModal({
        type: "success",
        message: `AMC ${data.createAMC.amcId} created successfully!`,
        data: data.createAMC,
      });
    },
    onError: (error) => {
      // --- ✅ FIX: Show error modal on mutation failure ---
      setModal({ type: "error", message: error.message });
    },
    refetchQueries: ["GetAMCs", "GetDashboardData"],
  });

  // --- Effects (unchanged) ---
  useEffect(() => {
    if (invoiceData?.invoice && formData) {
      const { invoice } = invoiceData;
      setClientId(invoice.client.id);

      const productsFromInvoice =
        invoice.lineItems
          ?.map((item) => ({
            productId: item.product?.id || "",
            serialNumber: "",
            purchaseDate: new Date().toISOString().split("T")[0],
          }))
          .filter((p) => p.productId) || [];

      if (productsFromInvoice.length > 0) {
        setProductInstances(productsFromInvoice);
      } else {
        setProductInstances([
          {
            productId: "",
            serialNumber: "",
            purchaseDate: new Date().toISOString().split("T")[0],
          },
        ]);
      }
    }
  }, [invoiceData, formData]);

  useEffect(() => {
    const selectedClient = formData?.clients.find((c) => c.id === clientId);
    if (selectedClient?.addresses) {
      setClientAddresses(selectedClient.addresses);
      const firstAddress = selectedClient.addresses[0]?.address || "";
      setBillingAddress(firstAddress);
    } else {
      setClientAddresses([]);
      setBillingAddress("");
    }
  }, [clientId, formData]);

  useEffect(() => {
    if (isSameAddress) {
      setInstallationAddress(billingAddress);
    }
  }, [isSameAddress, billingAddress]);

  useEffect(() => {
    if (startDate && !isNaN(new Date(startDate).getTime())) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      setEndDate(end.toISOString().split("T")[0]);
    }
  }, [startDate]);

  useEffect(() => {
    const freq = parseInt(frequencyPerYear, 10);
    if (
      startDate &&
      endDate &&
      !isNaN(new Date(startDate).getTime()) &&
      !isNaN(new Date(endDate).getTime()) &&
      freq > 0
    ) {
      const newVisits: ServiceVisit[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationMs = end.getTime() - start.getTime();
      if (durationMs < 0) return;
      const intervalMs = freq > 1 ? durationMs / (freq - 1) : 0;
      for (let i = 0; i < freq; i++) {
        const visitTimestamp = start.getTime() + i * intervalMs;
        const visitDate = new Date(visitTimestamp);
        newVisits.push({
          scheduledDate: visitDate.toISOString().split("T")[0],
        });
      }
      setServiceVisits(newVisits);
    }
  }, [startDate, endDate, frequencyPerYear]);

  // --- Handlers ---
  const handleModalClose = () => {
      if (modal.type === 'success' && modal.data?.id) {
          router.push(`/amcs/${modal.data.id}`);
      }
      setModal({ type: null, message: '', data: undefined });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // --- ✅ FIX: Use modal for validation errors ---
    if (!clientId) {
      setModal({ type: "error", message: "Please select a client." });
      return;
    }
    const filteredProducts = productInstances.filter((p) => p.productId);
    if (filteredProducts.length === 0) {
      setModal({ type: "error", message: "Please add at least one product." });
      return;
    }

    const input: CreateAmcInput = {
      clientId,
      productInstances: filteredProducts,
      startDate,
      endDate,
      contractAmount: parseFloat(contractAmount),
      frequencyPerYear: parseInt(frequencyPerYear, 10),
      serviceVisits,
      billingAddress,
      installationAddress,
      commercialTerms,
    };
    if (fromInvoiceId) {
      input.originatingInvoiceId = fromInvoiceId;
    }

    createAMC({ variables: { input } });
  };

  const handleServiceDateChange = (index: number, value: string) => {
    const updatedVisits = [...serviceVisits];
    updatedVisits[index].scheduledDate = value;
    setServiceVisits(updatedVisits);
  };
  const handleProductChange = (
    index: number,
    field: keyof ProductInstance,
    value: string
  ) => {
    setProductInstances((prev) =>
      prev.map((instance, i) =>
        i === index ? { ...instance, [field]: value } : instance
      )
    );
  };
  const addProduct = () => {
    setProductInstances([
      ...productInstances,
      { productId: "", serialNumber: "", purchaseDate: "" },
    ]);
  };
  const removeProduct = (index: number) => {
    setProductInstances(productInstances.filter((_, i) => i !== index));
  };

  const productsAreFromInvoice =
    fromInvoiceId && productInstances.some((p) => p.productId !== "");

  if (formLoading || invoiceLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        Loading form...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "2rem 1rem" }}>
      {/* --- ✅ NEW: Render modals conditionally --- */}
      {modal.type === "success" && (
        <SuccessModal message={modal.message} onClose={handleModalClose} />
      )}
      {modal.type === "error" && (
        <ErrorModal message={modal.message} onClose={handleModalClose} />
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
            Create New AMC
          </h1>
          <button
            type="submit"
            disabled={mutationLoading}
            style={{ ...buttonStyle, opacity: mutationLoading ? 0.6 : 1 }}
          >
            {mutationLoading ? "Saving..." : "Create AMC"}
          </button>
        </div>

        <FormSection title="Client Details">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <SelectField
              label="Client"
              name="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={formData?.clients}
              required
              disabled={!!fromInvoiceId}
            />
            {fromInvoiceId && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                Client pre-selected from originating invoice.
              </p>
            )}

            {clientId && (
              <>
                <AddressSelectField
                  label="Billing Address"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  addresses={clientAddresses}
                  required
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="checkbox"
                    id="sameAddress"
                    checked={isSameAddress}
                    onChange={(e) => setIsSameAddress(e.target.checked)}
                  />
                  <label
                    htmlFor="sameAddress"
                    style={{ fontWeight: "500", color: "#4b5563" }}
                  >
                    Installation address is same as billing address
                  </label>
                </div>

                {!isSameAddress && (
                  <AddressSelectField
                    label="Installation Address"
                    value={installationAddress}
                    onChange={(e) => setInstallationAddress(e.target.value)}
                    addresses={clientAddresses}
                    required
                  />
                )}
              </>
            )}
          </div>
        </FormSection>

        <FormSection title="Products Under Contract">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {productInstances.map((instance, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "1.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <SelectField
                    label={`Product #${index + 1}`}
                    value={instance.productId}
                    onChange={(e) =>
                      handleProductChange(index, "productId", e.target.value)
                    }
                    options={formData?.products}
                    required
                    disabled={!!productsAreFromInvoice}
                  />

                  <InputField
                    label="Serial Number"
                    value={instance.serialNumber}
                    onChange={(e) =>
                      handleProductChange(index, "serialNumber", e.target.value)
                    }
                  />
                  <InputField
                    label="Install Date"
                    type="date"
                    value={instance.purchaseDate}
                    onChange={(e) =>
                      handleProductChange(index, "purchaseDate", e.target.value)
                    }
                    required
                  />
                </div>
                {productInstances.length > 1 && !productsAreFromInvoice && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#ef4444",
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.875rem",
                      marginTop: "1rem",
                    }}
                  >
                    Remove Product
                  </button>
                )}
              </div>
            ))}
          </div>
          {!productsAreFromInvoice && (
            <button
              type="button"
              onClick={addProduct}
              style={{
                ...buttonStyle,
                backgroundColor: "#e5e7eb",
                color: "#374151",
                marginTop: "1rem",
              }}
            >
              + Add Another Product
            </button>
          )}
        </FormSection>

        <FormSection title="Contract Details">
          <div style={gridStyle}>
            <InputField
              label="Contract Start Date"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <InputField
              label="Contract End Date"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <InputField
              label="Contract Amount (AED)"
              name="contractAmount"
              type="number"
              step="0.01"
              value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              required
            />
            <InputField
              label="Services per Year"
              name="frequencyPerYear"
              type="number"
              min="1"
              max="12"
              value={frequencyPerYear}
              onChange={(e) => setFrequencyPerYear(e.target.value)}
              required
            />
          </div>
        </FormSection>

        <FormSection title="Service Schedule">
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1rem",
            }}
          >
            The following service dates are automatically suggested. You can
            edit them if needed.
          </p>
          <div style={gridStyle}>
            {serviceVisits.map((visit, index) => (
              <InputField
                key={index}
                label={`Service Visit #${index + 1}`}
                type="date"
                value={visit.scheduledDate}
                onChange={(e) => handleServiceDateChange(index, e.target.value)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Commercial Terms">
  <textarea
    value={commercialTerms}
    onChange={(e) => setCommercialTerms(e.target.value)}
    placeholder="Enter commercial terms for this AMC"
    style={{
      width: "100%",
      padding: "0.6rem",
      border: "1px solid #d1d5db",
      borderRadius: "0.5rem",
      minHeight: "100px",
      resize: "vertical",
      outline: "none",
    }}
  />
</FormSection>


        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <Link
            href="/amcs"
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

// --- Helper Components & Styles ---
const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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
interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: SelectOption[];
}
const SelectField = ({ label, options, ...props }: SelectFieldProps) => (
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
      <option value="">Please select</option>
      {options?.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  </div>
);
interface AddressSelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  addresses?: Address[];
}
const AddressSelectField = ({
  label,
  addresses,
  ...props
}: AddressSelectFieldProps) => (
  <div>
    {" "}
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "500",
        color: "#4b5563",
      }}
    >
      {label}
    </label>{" "}
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
      {" "}
      <option value="">Select an address</option>{" "}
      {addresses?.map((addr, index) => (
        <option key={index} value={addr.address}>
          {" "}
          {`(${addr.tag}) ${addr.address}`}{" "}
        </option>
      ))}{" "}
    </select>{" "}
  </div>
);
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "1.5rem",
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
