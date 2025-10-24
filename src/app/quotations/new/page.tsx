"use client";

import React, {
  useState,
  useMemo,
  FormEvent,
  ReactNode,
  useEffect,
} from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { GET_QUOTATIONS } from "@/graphql/queries";
import {
  SearchableClientSelect,
  ClientSearchResult,
} from "@/app/components/SearchableClientSelect";
import {
  SearchableProductSelect,
  ProductSearchResult,
} from "@/app/components/SearchableProductSelect";

// --- Types ---
interface Address {
  tag: string;
  address: string;
}
interface LineItemState {
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
interface QuotationsQueryData {
  quotations: { id: string; quotationId: string }[];
}
interface CreateQuotationInput {
  clientId?: string;
  newClient?: { name: string; phone: string; email?: string };
  billingAddress: string;
  installationAddress: string;
  lineItems: {
    productName: string;
    quantity: number;
    price: number;
    description: string;
  }[];
  validUntil: string | null;
  commercialTerms: CommercialTermState[];
  imageUrls?: string[];
}

// --- GraphQL ---
const CREATE_QUOTATION = gql`
  mutation CreateQuotation($input: CreateQuotationInput!) {
    createQuotation(input: $input) {
      id
      quotationId
    }
  }
`;

// --- Styles ---
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

const uploadButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.75rem 1.5rem",
  backgroundColor: "#2563eb",
  color: "#fff",
  borderRadius: "0.5rem",
  cursor: "pointer",
  fontWeight: 600,
};

const uploadButtonDisabledStyle: React.CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.6,
};

const imageUploadContainerStyle: React.CSSProperties = { marginBottom: "1rem" };

const imagePreviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  gap: "0.5rem",
};

const imagePreviewItemStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  borderRadius: "0.5rem",
  overflow: "hidden",
};

const removeImageButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "2px",
  right: "2px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  width: "22px",
  height: "22px",
  cursor: "pointer",
};

// --- Reusable Components ---
const Modal = ({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) => {
  const isSuccess = type === "success";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
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
          padding: "1.5rem 2rem",
          borderRadius: "0.75rem",
          width: "90%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          {isSuccess ? "Success" : "Error"}
        </h2>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>
        <button
          onClick={onClose}
          style={{
            ...buttonStyle,
            backgroundColor: isSuccess ? "#10b981" : "#ef4444",
            width: "100%",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

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
      padding: "2rem",
      boxShadow:
        "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    }}
  >
    <h2
      style={{
        fontSize: "1.25rem",
        fontWeight: 600,
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

const InputField = ({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    {label && (
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: 500,
          fontSize: "0.875rem",
        }}
      >
        {label}
      </label>
    )}
    <input
      style={{
        width: "100%",
        padding: "0.75rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
      }}
      {...props}
    />
  </div>
);

const TextAreaField = ({
  label,
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div>
    {label && (
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: 500,
          fontSize: "0.875rem",
        }}
      >
        {label}
      </label>
    )}
    <textarea
      style={{
        width: "100%",
        padding: "0.75rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        minHeight: "80px",
      }}
      {...props}
    />
  </div>
);

const AddressSelectField = ({
  label,
  addresses,
  ...props
}: {
  label: string;
  addresses?: Address[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div>
    <label
      style={{
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: 500,
        color: "#4b5563",
      }}
    >
      {label}
    </label>
    <select
      style={{
        width: "100%",
        padding: "0.75rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        backgroundColor: "white",
      }}
      {...props}
    >
      <option value="">Select a saved address</option>
      {addresses?.map((addr, index) => (
        <option
          key={index}
          value={addr.address}
        >{`(${addr.tag}) ${addr.address}`}</option>
      ))}
    </select>
  </div>
);

// --- Main Component ---
export default function CreateQuotationPage() {
  const router = useRouter();

  // --- State ---
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClient, setSelectedClient] =
    useState<ClientSearchResult | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [installationAddress, setInstallationAddress] = useState("");
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [lineItems, setLineItems] = useState<LineItemState[]>([
    { productId: "", productName: "", quantity: 1, price: 0, description: "" },
  ]);
  const [validUntil, setValidUntil] = useState("");
  const [vatPercent, setVatPercent] = useState<number | string>(0);
  const [commercialTerms, setCommercialTerms] = useState<CommercialTermState[]>(
    [
      {
        title: "Payment Terms",
        content: "70% upon confirmation (Advance)\n30% on delivery",
      },
      {
        title: "Warranty of system",
        content:
          "1 year for water filtration system against leakage and electrical components all warranties are against manufacturing defect only.",
      },
    ]
  );
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [modalInfo, setModalInfo] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [newQuotationId, setNewQuotationId] = useState<string | null>(null);

  // --- GraphQL Mutation ---
  const [createQuotation, { loading: mutationLoading, error: mutationError }] =
    useMutation(CREATE_QUOTATION, {
      onCompleted: (data) => {
        setNewQuotationId(data.createQuotation.id);
        setModalInfo({
          message: `Quotation ${data.createQuotation.quotationId} created successfully!`,
          type: "success",
        });
      },
      onError: (error) =>
        setModalInfo({ message: error.message, type: "error" }),
      update: (cache, { data: { createQuotation: newQuotation } }) => {
        try {
          const existingData = cache.readQuery<QuotationsQueryData>({
            query: GET_QUOTATIONS,
          });
          if (existingData)
            cache.writeQuery({
              query: GET_QUOTATIONS,
              data: { quotations: [...existingData.quotations, newQuotation] },
            });
        } catch (e) {
          console.error("Could not update quotations cache", e);
        }
      },
    });

  // --- Effects ---
  useEffect(() => {
    if (!isNewClient && selectedClient?.addresses?.length && !useManualAddress)
      setBillingAddress(selectedClient.addresses[0].address);
    else setBillingAddress("");
  }, [selectedClient, isNewClient, useManualAddress]);

  useEffect(() => {
    if (isSameAddress) setInstallationAddress(billingAddress);
  }, [isSameAddress, billingAddress]);

  // --- Calculations ---
  const totalAmount = useMemo(
    () =>
      lineItems.reduce(
        (total, item) => total + Number(item.quantity) * Number(item.price),
        0
      ),
    [lineItems]
  );

  const grandTotal = useMemo(() => {
    const total = totalAmount;
    const vat = Number(vatPercent) ? (total * Number(vatPercent)) / 100 : 0;
    return total + vat;
  }, [totalAmount, vatPercent]);

  // --- Handlers ---
  const handleClientSelect = (client: ClientSearchResult) =>
    setSelectedClient(client);
  const handleProductSelect = (index: number, product: ProductSearchResult) =>
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
  const handleLineItemChange = (
    index: number,
    field: keyof LineItemState,
    value: string | number
  ) =>
    setLineItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!isNewClient && !selectedClient)
      return setModalInfo({
        message: "Please select a client.",
        type: "error",
      });
    if (isNewClient && (!newClient.name || !newClient.phone))
      return setModalInfo({
        message: "New client's Name and Phone are required.",
        type: "error",
      });

    const finalLineItems = lineItems
      .map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        price: Number(item.price),
        description: item.description || "",
      }))
      .filter((item) => item.productName);
    if (finalLineItems.length === 0)
      return setModalInfo({
        message: "Please add at least one product.",
        type: "error",
      });

    const input: CreateQuotationInput = {
      billingAddress,
      installationAddress,
      lineItems: finalLineItems,
      validUntil: validUntil || null,
      commercialTerms: commercialTerms.filter(
        (term) => term.title && term.content
      ),
      imageUrls,
    };
    if (isNewClient) input.newClient = newClient;
    else if (selectedClient) input.clientId = selectedClient.id;

    createQuotation({ variables: { input } });
  };

  const addLineItem = () =>
    setLineItems((prev) => [
      ...prev,
      {
        productId: "",
        productName: "",
        quantity: 1,
        price: 0,
        description: "",
      },
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
  const handleCloseModal = () => {
    if (modalInfo?.type === "success" && newQuotationId)
      router.push(`/quotations/${newQuotationId}`);
    else setModalInfo(null);
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files) return;
    setIsUploading(true);

    const files = Array.from(event.target.files);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const reader = new FileReader();
        const fileLoadPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject("File reading error");
        });
        reader.readAsDataURL(file);
        const fileUrl = await fileLoadPromise;
        uploadedUrls.push(fileUrl);
      } catch (error) {
        console.error("Image upload failed:", error);
        setModalInfo({
          message: `Failed to upload ${file.name}`,
          type: "error",
        });
      }
    }

    setImageUrls((prev) => [...prev, ...uploadedUrls]);
    setIsUploading(false);
  };

  const removeImage = (indexToRemove: number) =>
    setImageUrls((prev) => prev.filter((_, i) => i !== indexToRemove));

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "auto",
        padding: "2rem 1rem 4rem 1rem",
      }}
    >
      {modalInfo && (
        <Modal
          type={modalInfo.type}
          message={modalInfo.message}
          onClose={handleCloseModal}
        />
      )}
      <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "2rem" }}>
        Create New Quotation
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
      >
        {/* Client Details */}
        <FormSection title="Client Details">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                type="checkbox"
                id="isNewClient"
                checked={isNewClient}
                onChange={(e) => {
                  setIsNewClient(e.target.checked);
                  setSelectedClient(null);
                  setUseManualAddress(e.target.checked);
                }}
              />
              <label htmlFor="isNewClient">Add new client manually</label>
            </div>

            {isNewClient ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                <InputField
                  label="New Client Name"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({ ...newClient, name: e.target.value })
                  }
                  required
                />
                <InputField
                  label="New Client Phone"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                  required
                />
                <InputField
                  label="New Client Email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient({ ...newClient, email: e.target.value })
                  }
                />
              </div>
            ) : selectedClient ? (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "600" }}>{selectedClient.name}</div>
                  <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                    {selectedClient.phone || selectedClient.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "0.5rem 1rem",
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <SearchableClientSelect onClientSelect={handleClientSelect} />
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                type="checkbox"
                id="useManualAddress"
                checked={useManualAddress}
                onChange={(e) => setUseManualAddress(e.target.checked)}
                disabled={isNewClient}
              />
              <label htmlFor="useManualAddress">Enter address manually</label>
            </div>

            {useManualAddress ||
            isNewClient ||
            !selectedClient?.addresses?.length ? (
              <InputField
                label="Billing Address"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />
            ) : (
              <AddressSelectField
                label="Billing Address"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                addresses={selectedClient?.addresses}
              />
            )}

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <input
                type="checkbox"
                id="sameAddress"
                checked={isSameAddress}
                onChange={(e) => setIsSameAddress(e.target.checked)}
              />
              <label htmlFor="sameAddress">
                Installation address is same as billing
              </label>
            </div>

            {!isSameAddress &&
              (useManualAddress ||
              isNewClient ||
              !selectedClient?.addresses?.length ? (
                <InputField
                  label="Installation Address"
                  value={installationAddress}
                  onChange={(e) => setInstallationAddress(e.target.value)}
                />
              ) : (
                <AddressSelectField
                  label="Installation Address"
                  value={installationAddress}
                  onChange={(e) => setInstallationAddress(e.target.value)}
                  addresses={selectedClient?.addresses}
                />
              ))}
          </div>
        </FormSection>

        {/* Products & Services */}
        <FormSection title="Products & Services">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {lineItems.map((item, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label style={{ fontWeight: "600" }}>Item #{index + 1}</label>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      style={{
                        ...buttonStyle,
                        backgroundColor: "#fee2e2",
                        color: "#ef4444",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {item.productId ? (
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.5rem",
                      padding: "1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: "600" }}>{item.productName}</div>
                    <button
                      type="button"
                      onClick={() =>
                        handleLineItemChange(index, "productId", "")
                      }
                      style={{
                        ...buttonStyle,
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <SearchableProductSelect
                    onProductSelect={(product) =>
                      handleProductSelect(index, product)
                    }
                  />
                )}

                {item.productId && (
                  <>
                    <TextAreaField
                      label="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleLineItemChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <InputField
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                      <InputField
                        label="Price (AED)"
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) =>
                          handleLineItemChange(index, "price", e.target.value)
                        }
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
            style={{
              ...buttonStyle,
              backgroundColor: "#10b981",
              color: "#ffffff",
              marginTop: "1.5rem",
            }}
          >
            + Add Item
          </button>
        </FormSection>

        {/* Images */}
        <FormSection title="Images">
          <div style={imageUploadContainerStyle}>
            <label
              htmlFor="image-upload"
              style={
                isUploading
                  ? { ...uploadButtonStyle, ...uploadButtonDisabledStyle }
                  : uploadButtonStyle
              }
            >
              {isUploading ? "Uploading..." : "Upload Images"}
            </label>
            <input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: "none" }}
              disabled={isUploading}
            />
          </div>
          {imageUrls.length > 0 && (
            <div style={imagePreviewGridStyle}>
              {imageUrls.map((url, index) => (
                <div key={index} style={imagePreviewItemStyle}>
                  <Image
                    src={url}
                    alt={`Quotation image ${index + 1}`}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    style={removeImageButtonStyle}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {/* Commercial Terms */}
        <FormSection title="Commercial Terms">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {commercialTerms.map((term, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flexGrow: 1 }}>
                  <InputField
                    placeholder="Term Title"
                    value={term.title}
                    onChange={(e) =>
                      handleTermChange(index, "title", e.target.value)
                    }
                  />
                </div>
                <div style={{ flexGrow: 2 }}>
                  <TextAreaField
                    placeholder="Enter detailed term..."
                    value={term.content}
                    onChange={(e) =>
                      handleTermChange(index, "content", e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCommercialTerm(index)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
                    height: "fit-content",
                    alignSelf: "center",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCommercialTerm}
            style={{
              ...buttonStyle,
              backgroundColor: "#10b981",
              color: "#ffffff",
              marginTop: "1.5rem",
            }}
          >
            + Add Term
          </button>
        </FormSection>

        {/* Total, VAT & Validity */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "350px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.25rem",
                fontWeight: "700",
                alignItems: "center",
              }}
            >
              <span>Total Amount:</span>
              <span>
                {new Intl.NumberFormat("en-AE", {
                  style: "currency",
                  currency: "AED",
                }).format(totalAmount)}
              </span>
            </div>

            <InputField
              label="VAT (%)"
              type="number"
              step="0.01"
              value={vatPercent}
              onChange={(e) => setVatPercent(e.target.value)}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.25rem",
                fontWeight: "700",
                alignItems: "center",
              }}
            >
              <span>Grand Total:</span>
              <span>
                {new Intl.NumberFormat("en-AE", {
                  style: "currency",
                  currency: "AED",
                }).format(grandTotal)}
              </span>
            </div>

            <InputField
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <div>
          {mutationError && (
            <p
              style={{
                color: "red",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              Error: {mutationError.message}
            </p>
          )}
          <button
            type="submit"
            disabled={mutationLoading || isUploading}
            style={{
              ...buttonStyle,
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              backgroundColor: "#10b981",
              opacity: mutationLoading || isUploading ? 0.6 : 1,
            }}
          >
            {mutationLoading || isUploading ? "Saving..." : "Create Quotation"}
          </button>
        </div>
      </form>
    </div>
  );
}
