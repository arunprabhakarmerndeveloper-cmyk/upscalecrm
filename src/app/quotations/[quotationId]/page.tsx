"use client";

import { useQuery, gql, useMutation } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageAsBase64 } from "@/lib/imageUtils";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY?: number;
    };
  }
}

// --- TypeScript Interfaces ---
interface IClientInfo {
  name: string;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  installationAddress: string | null;
}
interface ILineItem {
  productName: string;
  description: string | null;
  quantity: number;
  price: number;
}
interface ICommercialTerm {
  title: string;
  content: string;
}
interface IEditHistoryEntry {
  version: number;
  updatedAt: string | number;
  reason: string;
  totalAmount: number;
  updatedBy: { name: string } | null;
  clientInfo: IClientInfo;
  lineItems: ILineItem[];
  validUntil: string | number | null;
  commercialTerms: ICommercialTerm[] | null;
  imageUrls: string[] | null;
  taxPercentage?: number;
  grandTotal?: number;
}
interface IAssociatedDoc {
  id: string;
  status: string;
  invoiceId?: string;
  amcId?: string;
}
interface IQuotation {
  id: string;
  quotationId: string;
  status: string;
  client: { id: string } | null;
  totalAmount: number;
  grandTotal?: number;
  validUntil: string | number | null;
  createdAt: string | number;
  taxPercentage?: number;
  clientInfo: IClientInfo;
  lineItems: ILineItem[];
  commercialTerms: ICommercialTerm[] | null;
  editHistory: IEditHistoryEntry[] | null;
  associatedInvoices: IAssociatedDoc[] | null;
  associatedAMCs: IAssociatedDoc[] | null;
  imageUrls: string[] | null;
}
type ModalState =
  | { type: null }
  | {
      type: "success" | "error" | "confirm" | "create-invoice";
      message?: string;
      onConfirm?: () => void;
    };

// --- GraphQL ---
const GET_QUOTATION_DETAILS = gql`
  query GetQuotationDetails($id: ID!) {
    quotation(id: $id) {
      id
      quotationId
      status
      totalAmount
      grandTotal
      validUntil
      taxPercentage
      commercialTerms {
        title
        content
      }
      createdAt
      clientInfo {
        name
        phone
        email
        billingAddress
        installationAddress
      }
      lineItems {
        productName
        description
        quantity
        price
      }
      editHistory {
        version
        updatedAt
        reason
        totalAmount
        grandTotal
        taxPercentage
        updatedBy {
          name
        }
        clientInfo {
          name
          phone
          email
          billingAddress
          installationAddress
        }
        lineItems {
          productName
          description
          quantity
          price
        }
        validUntil
        commercialTerms {
          title
          content
        }
        imageUrls
      }
      client {
        id
      }
      associatedInvoices {
        id
        invoiceId
        status
      }
      associatedAMCs {
        id
        amcId
        status
      }
      imageUrls
    }
  }
`;
const UPDATE_STATUS_MUTATION = gql`
  mutation UpdateQuotationStatus($id: ID!, $status: String!) {
    updateQuotationStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;
const APPROVE_QUOTATION_MUTATION = gql`
  mutation ApproveQuotation($quotationId: ID!) {
    approveQuotation(quotationId: $quotationId) {
      id
      status
      client {
        id
      }
    }
  }
`;
const CREATE_INVOICE_MUTATION = gql`
  mutation CreateInvoiceFromQuotation(
    $quotationId: ID!
    $dueDate: String
    $installationDate: String
  ) {
    createInvoiceFromQuotation(
      quotationId: $quotationId
      dueDate: $dueDate
      installationDate: $installationDate
    ) {
      id
      invoiceId
    }
  }
`;

// --- Helper Functions & Components ---
const formatDate = (dateValue: string | number | null | undefined) => {
  if (!dateValue) return "—";
  const ts = typeof dateValue === "number" ? dateValue : Number(dateValue);
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? "Invalid date"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(amount);
};
const buttonStyle: React.CSSProperties = {
  padding: "0.6rem 1.2rem",
  fontWeight: "600",
  borderRadius: "0.375rem",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const generateQuotationPDF = async (
  data: IQuotation | IEditHistoryEntry,
  mainQuotationId?: string
) => {
  const [headerLogo, watermarkLogo] = await Promise.all([
    getImageAsBase64("/upscale-water-solution-logo+title.png"),
    getImageAsBase64("/upscale-water-solutions-logo.png"),
  ]);
  if (!headerLogo || !watermarkLogo) {
    throw new Error("Could not load required PDF assets.");
  }
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let lastY = 0;
  const footerHeight = 15;
  const colors = {
    navy: "#0B1E3C",
    royal: "#125EAB",
    aqua: "#0FD1E3",
    gray: "#F4F6FA",
    text: "#333333",
    white: "#FFFFFF",
    footer: "#555555",
  };
  const firmAddress =
    "Upscale Water Solutions, Al Barsha, Hassanicor Building, Level 1, Office Number 105 - Dubai";
  const logoWidth = 40;
  const logoHeight = logoWidth / (500 / 200);
  doc.addImage(
    headerLogo,
    "PNG",
    pageWidth - margin - logoWidth,
    12,
    logoWidth,
    logoHeight
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(colors.navy);
  doc.text("Quotation", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.text);
  doc.text(firmAddress, margin, 24);
  doc.setDrawColor(colors.aqua);
  doc.setLineWidth(0.5);
  doc.line(margin, 30, pageWidth - margin, 30);
  lastY = 35;
  const ensureSpace = (requiredHeight: number) => {
    if (lastY + requiredHeight > pageHeight - footerHeight) {
      doc.addPage();
      lastY = margin;
    }
  };
  const clientDetails = [
    ["Client Name:", data.clientInfo.name],
    ["Contact Number:", data.clientInfo.phone || "N/A"],
    ["Email Address:", data.clientInfo.email || "N/A"],
    ["Billing Address:", data.clientInfo.billingAddress || "N/A"],
    ["Installation Address:", data.clientInfo.installationAddress || "N/A"],
    [
      "Quotation Date:",
      formatDate("createdAt" in data ? data.createdAt : new Date().getTime()),
    ],
    ["Valid Until:", formatDate(data.validUntil)],
  ];
  autoTable(doc, {
    startY: lastY,
    body: clientDetails,
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    alternateRowStyles: { fillColor: colors.gray },
    margin: { bottom: footerHeight },
  });
  lastY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : lastY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.royal);
  ensureSpace(6);
  doc.text("Products & Pricing", margin, lastY);
  lastY += 6;
  const lineItems = (data.lineItems || []).map((item) => [
    item.productName,
    item.description || "—",
    item.quantity,
    formatCurrency(item.price),
    formatCurrency(item.price * item.quantity),
  ]);
  autoTable(doc, {
    startY: lastY,
    head: [["Product", "Description", "Qty", "Price", "Total"]],
    body: lineItems,
    theme: "grid",
    headStyles: {
      fontStyle: "bold",
      fillColor: colors.royal,
      textColor: colors.white,
    },
    alternateRowStyles: { fillColor: colors.gray },
    styles: { lineColor: colors.aqua, lineWidth: 0.1 },
    margin: { bottom: footerHeight },
  });
  lastY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : lastY;
  const subtotal =
    data.lineItems?.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ) || 0;
  const tax = ((data.taxPercentage ?? 0) / 100) * subtotal;
  const grandTotal = subtotal + tax;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.navy);
  ensureSpace(6);
  doc.text("Summary", margin, lastY);
  lastY += 6;
  autoTable(doc, {
    startY: lastY,
    body: [
      ["Subtotal:", formatCurrency(subtotal)],
      [`VAT (${data.taxPercentage ?? 0}%):`, formatCurrency(tax)],
      ["Grand Total:", formatCurrency(grandTotal)],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    theme: "plain",
    margin: { bottom: footerHeight },
  });
  lastY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : lastY;
  if (data.commercialTerms && data.commercialTerms.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(colors.royal);
    ensureSpace(6);
    doc.text("Commercial Terms", margin, lastY);
    lastY += 6;
    data.commercialTerms.forEach((term) => {
      ensureSpace(5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(colors.navy);
      doc.text(term.title, margin, lastY);
      lastY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(colors.text);
      const points = term.content
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");
      points.forEach((point) => {
        const bullet = `• ${point.trim()}`;
        const splitLine = doc.splitTextToSize(bullet, pageWidth - margin * 2);
        ensureSpace(splitLine.length * 5 + 2);
        doc.text(splitLine, margin + 5, lastY);
        lastY += splitLine.length * 5 + 2;
      });
      lastY += 3;
    });
  }
  if (data.imageUrls && data.imageUrls.length > 0) {
    lastY += 10;
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.royal);
    doc.text("Attached Images", margin, lastY);
    lastY += 8;
    const imgWidth = 50,
      imgHeight = 35,
      imgGap = 8;
    let x = margin;
    for (const img of data.imageUrls) {
      const base64 = await getImageAsBase64(img);
      if (!base64) continue;
      if (x + imgWidth > pageWidth - margin) {
        x = margin;
        lastY += imgHeight + imgGap;
      }
      ensureSpace(imgHeight + footerHeight);
      doc.addImage(base64, "JPEG", x, lastY, imgWidth, imgHeight);
      x += imgWidth + imgGap;
    }
    lastY += imgHeight + 10;
  }
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setGState(new GState({ opacity: 0.08 }));
    const watermarkWidth = 120,
      watermarkHeight = 120;
    const x = (pageWidth - watermarkWidth) / 2,
      y = (pageHeight - watermarkHeight) / 2;
    doc.addImage(watermarkLogo, "PNG", x, y, watermarkWidth, watermarkHeight);
    doc.setGState(new GState({ opacity: 1 }));
    const footerY = pageHeight - 12;
    doc.setFontSize(9);
    doc.setTextColor(colors.footer);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY + 2, {
      align: "center",
    });
    doc.text("Email: info@upscalewatersolutions.com", margin, footerY + 2.5);
    doc.text("Phone: +971 58 584 2822", pageWidth - margin, footerY + 2.5, {
      align: "right",
    });
  }
  const fileName =
    "quotationId" in data
      ? `${data.quotationId}.pdf`
      : `${mainQuotationId}-V${data.version}.pdf`;
  doc.save(fileName);
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
      padding: "1.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
    }}
  >
    {" "}
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
    </h2>{" "}
    {children}{" "}
  </div>
);
const InputField = ({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    {" "}
    {label && (
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: "500",
          fontSize: "0.875rem",
        }}
      >
        {label}
      </label>
    )}{" "}
    <input
      style={{
        width: "100%",
        padding: "0.75rem",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
      }}
      {...props}
    />{" "}
  </div>
);
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, React.CSSProperties> = {
    Draft: { background: "#f3f4f6", color: "#4b5563" },
    Sent: { background: "#dbeafe", color: "#1d4ed8" },
    Approved: { background: "#d1fae5", color: "#065f46" },
    Rejected: { background: "#fee2e2", color: "#991b1b" },
    Paid: { background: "#d1fae5", color: "#065f46" },
    Active: { background: "#d1fae5", color: "#065f46" },
    Expired: { background: "#fee2e2", color: "#991b1b" },
  };
  const style = styles[status] || styles["Draft"];
  return (
    <span
      style={{
        ...style,
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: "600",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
};
const tableHeaderStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem 1.5rem",
  color: "#6b7280",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  fontWeight: "600",
};
const tableCellStyle: React.CSSProperties = {
  padding: "1rem 1.5rem",
  verticalAlign: "top",
};
const imageGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "1rem",
};
const imageThumbnailStyle: React.CSSProperties = {
  position: "relative",
  aspectRatio: "1 / 1",
  borderRadius: "0.5rem",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  cursor: "pointer",
};
const ModalWrapper = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
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
    onClick={onClose}
  >
    {" "}
    <div
      style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "0.75rem",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {" "}
      <h2
        style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}
      >
        {title}
      </h2>{" "}
      {children}{" "}
    </div>{" "}
  </div>
);
const SuccessModal = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <ModalWrapper title="Success" onClose={onClose}>
    {" "}
    <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>{" "}
    <button
      onClick={onClose}
      style={{ ...buttonStyle, backgroundColor: "#10b981", width: "100%" }}
    >
      OK
    </button>{" "}
  </ModalWrapper>
);
const ConfirmationModal = ({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmText = "Confirm",
  showCancel = true,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmText?: string;
  showCancel?: boolean;
}) => (
  <ModalWrapper title={title} onClose={onCancel}>
    {" "}
    <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>{" "}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
      {" "}
      {showCancel && (
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#e5e7eb",
            color: "#374151",
          }}
        >
          Cancel
        </button>
      )}{" "}
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          ...buttonStyle,
          backgroundColor: title === "Error" ? "#2563eb" : "#ef4444",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Processing..." : confirmText}
      </button>{" "}
    </div>{" "}
  </ModalWrapper>
);
const CreateInvoiceModal = ({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (dates: { dueDate: string; installationDate: string }) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [installationDate, setInstallationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  return (
    <ModalWrapper title="Create Invoice" onClose={onClose}>
      {" "}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {" "}
        <InputField
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />{" "}
        <InputField
          label="Installation Date"
          type="date"
          value={installationDate}
          onChange={(e) => setInstallationDate(e.target.value)}
        />{" "}
      </div>{" "}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {" "}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#e5e7eb",
            color: "#374151",
          }}
        >
          Cancel
        </button>{" "}
        <button
          onClick={() => onSubmit({ dueDate, installationDate })}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#10b981",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating..." : "Confirm & Create"}
        </button>{" "}
      </div>{" "}
    </ModalWrapper>
  );
};
const ActionsMenu = ({
  onStatusChange,
  isLoading,
}: {
  onStatusChange: (newStatus: string) => void;
  isLoading: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      ref={menuRef}
    >
      {" "}
      <button
        onClick={() => !isLoading && setIsOpen((p) => !p)}
        disabled={isLoading}
        style={{
          ...buttonStyle,
          backgroundColor: "#f9fafb",
          color: "#374151",
          border: "1px solid #d1d5db",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        Actions ▼
      </button>{" "}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "0.5rem",
            width: "180px",
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            zIndex: 100,
          }}
        >
          {" "}
          <button
            onClick={() => {
              onStatusChange("Approved");
              setIsOpen(false);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✅ Mark as Approved
          </button>{" "}
          <button
            onClick={() => {
              onStatusChange("Sent");
              setIsOpen(false);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✉️ Mark as Sent
          </button>{" "}
          <button
            onClick={() => {
              onStatusChange("Rejected");
              setIsOpen(false);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
            }}
          >
            ❌ Mark as Rejected
          </button>{" "}
        </div>
      )}{" "}
    </div>
  );
};
const ModalController = ({
  modalState,
  setModalState,
}: {
  modalState: ModalState;
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>;
}) => {
  if (!modalState.type) return null;
  const { type, message, onConfirm } = modalState;
  if (type === "create-invoice") return null;
  if (type === "success")
    return (
      <SuccessModal
        message={message || ""}
        onClose={() => setModalState({ type: null })}
      />
    );
  if (type === "error")
    return (
      <ConfirmationModal
        title="Error"
        message={message || ""}
        onConfirm={() => setModalState({ type: null })}
        onCancel={() => setModalState({ type: null })}
        confirmText="OK"
        showCancel={false}
      />
    );
  if (type === "confirm")
    return (
      <ConfirmationModal
        title="Confirm Action"
        message={message || ""}
        onConfirm={() => {
          onConfirm?.();
          setModalState({ type: null });
        }}
        onCancel={() => setModalState({ type: null })}
      />
    );
  return null;
};

// FIX 1: Create a reusable ImageGallery component
const ImageGallery = ({
  imageUrls,
  onImageClick,
}: {
  imageUrls: string[] | null | undefined;
  onImageClick: (url: string) => void;
}) => {
  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }
  return (
    <div>
      <h3
        style={{
          color: "#6b7280",
          fontSize: "0.75rem",
          fontWeight: "600",
          marginBottom: "0.25rem",
          textTransform: "uppercase",
        }}
      >
        Images
      </h3>
      <div style={imageGridStyle}>
        {imageUrls.map((url, index) => (
          <div
            key={index}
            style={imageThumbnailStyle}
            onClick={() => onImageClick(url)}
          >
            <Image
              src={url}
              alt={`Quotation image ${index + 1}`}
              style={{ objectFit: "cover" }}
              fill
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Reusable Snapshot Components ---
const QuotationSnapshot = ({
  data,
  onImageClick,
}: {
  data: IEditHistoryEntry | IQuotation;
  onImageClick: (url: string) => void;
}) => {
  const subtotal =
    data.lineItems?.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ) || 0;
  const taxAmount = (subtotal * (data.taxPercentage ?? 0)) / 100;
  const grandTotal = subtotal + taxAmount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}
      >
        <div>
          <h3
            style={{
              color: "#6b7280",
              fontSize: "0.75rem",
              fontWeight: "600",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}
          >
            Client Details
          </h3>
          <p>
            <strong>Name:</strong> {data.clientInfo.name}
          </p>
          <p>
            <strong>Phone:</strong> {data.clientInfo.phone || "N/A"}
          </p>
          <p>
            <strong>Billing Address:</strong>{" "}
            {data.clientInfo.billingAddress || "N/A"}
          </p>
        </div>
        <div>
          <h3
            style={{
              color: "#6b7280",
              fontSize: "0.75rem",
              fontWeight: "600",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}
          >
            Important Dates
          </h3>
          {"createdAt" in data && (
            <p>
              <strong>Created At:</strong> {formatDate(data.createdAt)}
            </p>
          )}
          <p>
            <strong>Valid Until:</strong> {formatDate(data.validUntil)}
          </p>
        </div>
      </div>
      <div>
        <h3
          style={{
            color: "#6b7280",
            fontSize: "0.75rem",
            fontWeight: "600",
            marginBottom: "0.25rem",
            textTransform: "uppercase",
          }}
        >
          Products & Services
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f9fafb" }}>
            <tr>
              <th style={{ ...tableHeaderStyle, width: "35%" }}>Item</th>
              <th style={{ ...tableHeaderStyle, width: "35%" }}>Description</th>
              <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Qty</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Price</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems?.map((item, index) => (
              <tr key={index} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={tableCellStyle}>{item.productName}</td>
                <td style={tableCellStyle}>{item.description || "—"}</td>
                <td style={{ ...tableCellStyle, textAlign: "center" }}>
                  {item.quantity}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {formatCurrency(item.price)}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {formatCurrency(item.quantity * item.price)}
                </td>
              </tr>
            ))}
            <tr>
              <td
                colSpan={4}
                style={{
                  ...tableCellStyle,
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                Subtotal:
              </td>
              <td
                style={{
                  ...tableCellStyle,
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {formatCurrency(subtotal)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={4}
                style={{
                  ...tableCellStyle,
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >{`VAT (${data.taxPercentage ?? 0}%):`}</td>
              <td
                style={{
                  ...tableCellStyle,
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {formatCurrency(taxAmount)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={4}
                style={{
                  ...tableCellStyle,
                  fontWeight: 700,
                  textAlign: "right",
                }}
              >
                Grand Total:
              </td>
              <td
                style={{
                  ...tableCellStyle,
                  textAlign: "right",
                  fontWeight: 700,
                }}
              >
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {data.commercialTerms && data.commercialTerms.length > 0 && (
        <div>
          <h3
            style={{
              color: "#6b7280",
              fontSize: "0.75rem",
              fontWeight: "600",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}
          >
            Commercial Terms
          </h3>
          <div
            style={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {data.commercialTerms.map((term, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom:
                    idx === data.commercialTerms.length - 1 ? 0 : "1rem",
                }}
              >
                <strong style={{ color: "#111827" }}>{term.title}:</strong>
                <div
                  style={{
                    whiteSpace: "pre-line",
                    color: "#374151",
                    paddingTop: "0.25rem",
                  }}
                >
                  {term.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ImageGallery imageUrls={data.imageUrls} onImageClick={onImageClick} />
    </div>
  );
};

const VersionHistoryItem = ({
  version,
  quotationId,
  onImageClick,
}: {
  version: IEditHistoryEntry;
  quotationId: string;
  onImageClick: (url: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        backgroundColor: "#f9fafb",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "600",
        }}
      >
        <span>
          Version {version.version} — Updated: {formatDate(version.updatedAt)}
        </span>
        <span
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            padding: "1rem 1.5rem 1.5rem 1.5rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            style={{
              ...buttonStyle,
              backgroundColor: "#2563eb",
              color: "#fff",
              marginBottom: "1rem",
            }}
            onClick={() => generateQuotationPDF(version, quotationId)}
          >
            Download PDF
          </button>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1rem",
            }}
          >
            Updated by: {version.updatedBy?.name || "Unknown"} | Total Amount:{" "}
            {formatCurrency(version.grandTotal ?? version.totalAmount)}
          </p>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              marginBottom: "1rem",
            }}
          >
            <QuotationSnapshot data={version} onImageClick={onImageClick} />
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.quotationId as string;

  const [modalState, setModalState] = useState<ModalState>({ type: null });
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const { loading, error, data, refetch } = useQuery<{ quotation: IQuotation }>(
    GET_QUOTATION_DETAILS,
    { variables: { id }, skip: !id, fetchPolicy: "cache-and-network" }
  );
  const [updateStatus, { loading: statusUpdateLoading }] = useMutation(
    UPDATE_STATUS_MUTATION,
    {
      onCompleted: () => {
        setModalState({ type: "success", message: "Status updated!" });
        refetch();
      },
      onError: (err) =>
        setModalState({ type: "error", message: `Error: ${err.message}` }),
    }
  );
  const [approveQuotation, { loading: approveLoading }] = useMutation(
    APPROVE_QUOTATION_MUTATION,
    {
      onCompleted: () => {
        setModalState({
          type: "success",
          message:
            "Quotation approved! A client record has been created or linked.",
        });
        refetch();
      },
      onError: (err) =>
        setModalState({ type: "error", message: `Error: ${err.message}` }),
    }
  );
  const [createInvoiceMutation, { loading: invoiceCreationLoading }] =
    useMutation(CREATE_INVOICE_MUTATION, {
      onCompleted: (data) => {
        const newInvoiceId = data.createInvoiceFromQuotation.id;
        setModalState({
          type: "success",
          message: "Invoice created successfully!",
        });
        router.push(`/invoices/${newInvoiceId}`);
      },
      onError: (err) =>
        setModalState({
          type: "error",
          message: `Error creating invoice: ${err.message}`,
        }),
      refetchQueries: [
        { query: GET_QUOTATION_DETAILS, variables: { id } },
        "GetInvoices",
      ],
      awaitRefetchQueries: true,
    });

  const handleCreateInvoice = (dates: {
    dueDate: string;
    installationDate: string;
  }) => {
    createInvoiceMutation({ variables: { quotationId: id, ...dates } });
  };

  const handleStatusChange = (newStatus: string) => {
    if (!data?.quotation) return;
    if (newStatus === "Approved" && !data.quotation.client) {
      setModalState({
        type: "confirm",
        message:
          "This is a new lead. Approving will create a client record. Proceed?",
        onConfirm: () => approveQuotation({ variables: { quotationId: id } }),
      });
    } else {
      setModalState({
        type: "confirm",
        message: `Are you sure you want to change the status to "${newStatus}"?`,
        onConfirm: () => updateStatus({ variables: { id, status: newStatus } }),
      });
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>Loading...</div>
    );
  if (error)
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: "5rem" }}>
        Error: {error.message}
      </div>
    );
  if (!data?.quotation)
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        Quotation not found.
      </div>
    );

  const { quotation } = data;

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "auto",
        padding: "1rem 1rem 4rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      {modalState.type && (
        <ModalController
          modalState={modalState}
          setModalState={setModalState}
        />
      )}
      {modalState.type === "create-invoice" && (
        <CreateInvoiceModal
          onSubmit={handleCreateInvoice}
          onClose={() => setModalState({ type: null })}
          loading={invoiceCreationLoading}
        />
      )}
      {viewingImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
          onClick={() => setViewingImage(null)}
        >
          {" "}
          <img
            src={viewingImage}
            alt="Full screen view"
            style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }}
          />{" "}
          <button
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            &times;
          </button>{" "}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800" }}>Quotation</h1>
          <p
            style={{
              color: "#4b5563",
              fontWeight: "500",
              fontSize: "1.125rem",
            }}
          >
            {quotation.quotationId}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <StatusBadge status={quotation.status} />
          <ActionsMenu
            onStatusChange={handleStatusChange}
            isLoading={statusUpdateLoading || approveLoading}
          />
          <Link
            href={`/quotations/edit/${quotation.id}`}
            style={{
              ...buttonStyle,
              backgroundColor: "#f9fafb",
              color: "#374151",
              border: "1px solid #d1d5db",
            }}
          >
            Edit
          </Link>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: "#2563eb",
              color: "#fff",
            }}
            onClick={() => generateQuotationPDF(quotation)}
          >
            Download PDF
          </button>
          <button
            onClick={() => setModalState({ type: "create-invoice" })}
            disabled={quotation.status !== "Approved"}
            style={{
              ...buttonStyle,
              backgroundColor: "#10b981",
              cursor:
                quotation.status !== "Approved" ? "not-allowed" : "pointer",
              opacity: quotation.status !== "Approved" ? 0.5 : 1,
            }}
            title={
              quotation.status !== "Approved"
                ? "Quotation must be approved to create an invoice"
                : "Create Invoice"
            }
          >
            Create Invoice
          </button>
        </div>
      </div>
      <FormSection title="Current Version">
        <QuotationSnapshot data={quotation} onImageClick={setViewingImage} />
      </FormSection>
      {quotation.editHistory && quotation.editHistory.length > 0 && (
        <FormSection title="Version History">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {quotation.editHistory
              .slice()
              .reverse()
              .map((version) => (
                <VersionHistoryItem
                  key={version.version}
                  version={version}
                  quotationId={quotation.quotationId}
                  onImageClick={setViewingImage}
                />
              ))}
          </div>
        </FormSection>
      )}
    </div>
  );
}
