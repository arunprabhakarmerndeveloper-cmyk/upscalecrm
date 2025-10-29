"use client";

import { useQuery, gql, useMutation } from "@apollo/client";
import { useParams } from "next/navigation";
import {
  useState,
  useEffect,
  FormEvent,
  ReactNode,
  CSSProperties,
  useRef,
} from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageAsBase64 } from "@/lib/imageUtils";

// --- TypeScript Interfaces ---
interface ClientInfo {
  name: string;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
  installationAddress: string | null;
}
interface LineItem {
  productName: string;
  description: string | null;
  quantity: number;
  price: number;
}
interface AssociatedDoc {
  id: string;
  quotationId?: string;
  amcId?: string;
}
interface CreatedByInfo {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  invoiceId: string;
  status: string;
  totalAmount: number;
  taxPercentage: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string | number | null;
  dueDate: string | number | null;
  paymentDate: string | number | null;
  installationDate: string | number | null;
  clientInfo: ClientInfo;
  lineItems: LineItem[];
  termsOfService: string | null;
  quotation: AssociatedDoc | null;
  amc: AssociatedDoc | null;
  createdBy: CreatedByInfo | null;
}
interface InvoiceDetailsData {
  invoice: Invoice;
}
interface AmcFormData {
  startDate: string;
  endDate: string;
  frequencyPerYear: number;
  contractAmount: number;
  commercialTerms?: string;
}

// --- jspdf Module Augmentation ---
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: {
      finalY?: number;
    };
  }
}

// --- GraphQL Queries & Mutations ---
const GET_INVOICE_DETAILS = gql`
  query GetInvoiceDetails($id: ID!) {
    invoice(id: $id) {
      id
      invoiceId
      status
      totalAmount
      taxPercentage
      grandTotal
      amountPaid
      balanceDue
      issueDate
      dueDate
      paymentDate
      installationDate
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
      termsOfService
      quotation {
        id
        quotationId
      }
      amc {
        id
        amcId
      }
      createdBy {
        id
        name
      }
    }
  }
`;
const RECORD_PAYMENT_MUTATION = gql`
  mutation RecordPayment($input: RecordPaymentInput!) {
    recordPayment(input: $input) {
      id
      status
      amountPaid
      paymentDate
      balanceDue
    }
  }
`;
const CREATE_AMC_FROM_INVOICE_MUTATION = gql`
  mutation CreateAmcFromInvoice(
    $invoiceId: ID!
    $startDate: String!
    $endDate: String!
    $frequencyPerYear: Int!
    $contractAmount: Float!
    $commercialTerms: String
  ) {
    createAmcFromInvoice(
      invoiceId: $invoiceId
      startDate: $startDate
      endDate: $endDate
      frequencyPerYear: $frequencyPerYear
      contractAmount: $contractAmount
      commercialTerms: $commercialTerms
    ) {
      id
      amcId
    }
  }
`;

const UPDATE_INVOICE_STATUS_MUTATION = gql`
  mutation UpdateInvoiceStatus($id: ID!, $status: String!) {
    updateInvoiceStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

// --- Helper Components & Styles ---
const formatDate = (dateValue: string | number | null | undefined) => {
  if (!dateValue) return "—";
  const ts =
    typeof dateValue === "string" && /^\d+$/.test(dateValue)
      ? Number(dateValue)
      : dateValue;
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
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, React.CSSProperties> = {
    Draft: { background: "#f3f4f6", color: "#4b5563" },
    Sent: { background: "#dbeafe", color: "#1d4ed8" },
    Paid: { background: "#d1fae5", color: "#065f46" },
    Overdue: { background: "#fee2e2", color: "#991b1b" },
    Cancelled: { background: "#e5e7eb", color: "#4b5563" },
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
const buttonStyle: CSSProperties = {
  padding: "0.5rem 1rem",
  fontWeight: "600",
  borderRadius: "0.375rem",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#2563eb",
  color: "white",
  transition: "background-color 0.2s",
  textDecoration: "none",
};
const detailHeaderStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "0.75rem",
  fontWeight: "600",
  marginBottom: "0.25rem",
  textTransform: "uppercase",
};
const detailTextStyle: CSSProperties = {
  color: "#111827",
  whiteSpace: "pre-wrap",
  margin: "0.25rem 0",
};
const tableHeaderStyle: CSSProperties = {
  textAlign: "left",
  padding: "0.75rem 1rem",
  color: "#6b7280",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  fontWeight: "600",
  background: "#f9fafb",
};
const tableCellStyle: CSSProperties = {
  padding: "0.75rem 1rem",
  verticalAlign: "top",
  borderBottom: "1px solid #e5e7eb",
};
const associatedDocStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem 0",
  borderBottom: "1px solid #f3f4f6",
};
const actionButtonStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  color: "#374151",
  fontWeight: "500",
  padding: "0.4rem 0.8rem",
  borderRadius: "0.375rem",
  border: "1px solid #d1d5db",
  cursor: "pointer",
  textDecoration: "none",
  fontSize: "0.875rem",
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
    <h2
      style={{
        fontSize: "1.25rem",
        fontWeight: "600",
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "1rem",
        marginBottom: "1.5rem",
        marginTop: 0,
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
          fontWeight: "500",
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
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
      }}
      {...props}
    />
  </div>
);
const ModalWrapper = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
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
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
          {title}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "#9ca3af",
            padding: 0,
            lineHeight: 1,
          }}
        >
          &times;
        </button>
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
  <ModalWrapper title="Success" onClose={onClose}>
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
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
      <p
        style={{
          color: "#6b7280",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        {message}
      </p>
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
  </ModalWrapper>
);

// --- PDF Generation (MODIFIED) ---
const handleDownloadPdf = async (
  invoice: Invoice,
  isReceipt: boolean,
  headerLogo: string | null,
  watermarkLogo: string | null
) => {
  try {
    if (!headerLogo || !watermarkLogo) {
      alert("PDF assets are not ready. Please wait a moment and try again.");
      return;
    }

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let lastY = 0;
    const footerHeight = 15; // <-- Added this for margin calculations

    const colors = {
      navy: "#0B1E3C",
      royal: "#125EAB",
      aqua: "#0FD1E3",
      gray: "#F4F6FA",
      text: "#333333",
      white: "#FFFFFF",
      footer: "#555555",
      green: "#28a745",
      red: "#dc3545",
    };
    
    // --- UPDATED CONSTANTS ---
    const firmAddress =
      "Upscale Trading (FZC) United Arab Emirates Block B-B32-068 SRTIP Free Zone";
    const email = "info@upscalewatersolutions.com";
    const phone = "+971 52 634 7143";
    const website = "www.upscalewatersolutions.com";
    // const firmTRN = "TRN: 1000000000000"; // <-- REMOVED as requested

    // --- Added ensureSpace function ---
    const ensureSpace = (requiredHeight: number) => {
      if (lastY + requiredHeight > pageHeight - footerHeight) {
        doc.addPage();
        lastY = margin;
      }
    };

    // --- UPDATED PDF Header ---
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

    // --- PDF Title (Invoice vs Receipt) ---
    const title = isReceipt ? "Receipt" : "Tax Invoice";
    doc.text(title, margin, 18);

    // --- NEW HEADER CONTACT INFO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.text);

    doc.text(`Email: ${email}  |  Phone: ${phone}`, margin, 24);
    doc.link(margin + 10, 21, doc.getTextWidth(email), 5, {
      url: `mailto:${email}`,
    });
    doc.link(
      margin + 20 + doc.getTextWidth(`Email: ${email}  |  `),
      21,
      doc.getTextWidth(phone),
      5,
      { url: `tel:${phone}` }
    );

    doc.text(`Website: ${website}`, margin, 28);
    doc.link(margin + 14, 25, doc.getTextWidth(website), 5, {
      url: `https://${website}`,
    });
    // --- END OF NEW INFO ---

    doc.setDrawColor(colors.aqua);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageWidth - margin, 32); // Adjusted Y
    // --- END UPDATED PDF Header ---


    // --- Invoice & Client Details (CONTENT - UNCHANGED) ---
    // This section uses hardcoded Y values, which is fine as it starts at 42,
    // which is 10mm below our new header line at 32.
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BILLED TO:", margin, 42);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.clientInfo.name, margin, 47);
    doc.text(invoice.clientInfo.phone || "N/A", margin, 52);
    doc.text(invoice.clientInfo.email || "N/A", margin, 57);
    doc.text(invoice.clientInfo.billingAddress || "N/A", margin, 62, {
      maxWidth: 80,
    });

    doc.setFont("helvetica", "bold");
    const rightColX = pageWidth - margin - 60;
    doc.text("Invoice #:", rightColX, 42);
    doc.text("Issue Date:", rightColX, 47);
    doc.text("Due Date:", rightColX, 52);

    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoiceId, rightColX + 30, 42);
    doc.text(formatDate(invoice.issueDate), rightColX + 30, 47);
    doc.text(formatDate(invoice.dueDate), rightColX + 30, 52);

    if (isReceipt) {
      doc.setFont("helvetica", "bold");
      doc.text("Payment Date:", rightColX, 57);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(invoice.paymentDate), rightColX + 30, 57);
    }

    lastY = 75; // Set start Y for the table

    // --- Line Items Table ---
    const lineItemsBody = (invoice.lineItems || []).map((item) => [
      item.productName + (item.description ? `\n${item.description}` : ""),
      item.quantity,
      formatCurrency(item.price),
      formatCurrency(item.price * item.quantity),
    ]);

    autoTable(doc, {
      startY: lastY,
      head: [["Item Description", "Qty", "Unit Price", "Amount"]],
      body: lineItemsBody,
      theme: "grid",
      headStyles: {
        fontStyle: "bold",
        fillColor: colors.royal,
        textColor: colors.white,
      },
      alternateRowStyles: { fillColor: colors.gray },
      styles: {
        lineColor: colors.aqua,
        lineWidth: 0.1,
        cellPadding: 2.5,
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 105 },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 30, halign: "right" },
      },
      margin: { bottom: footerHeight }, // <-- NECESSARY FIX
    });

    lastY = doc.lastAutoTable?.finalY || lastY + 20;

    // --- Totals Section ---
    ensureSpace(35); // <-- NECESSARY FIX (5mm padding + 30mm height)
    const summaryY = lastY + 5;
    const totalColX = pageWidth - margin - 50;
    const labelColX = totalColX - 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Subtotal:", labelColX, summaryY, { align: "right" });
    doc.text(formatCurrency(invoice.totalAmount), totalColX + 50, summaryY, {
      align: "right",
    });

    doc.text(`VAT (${invoice.taxPercentage}%):`, labelColX, summaryY + 6, {
      align: "right",
    });
    doc.text(
      formatCurrency((invoice.totalAmount * invoice.taxPercentage) / 100),
      totalColX + 50,
      summaryY + 6,
      { align: "right" }
    );

    doc.setFont("helvetica", "bold");
    doc.text("Grand Total (AED):", labelColX, summaryY + 12, {
      align: "right",
    });
    doc.text(
      formatCurrency(invoice.grandTotal),
      totalColX + 50,
      summaryY + 12,
      { align: "right" }
    );

    doc.text("Amount Paid:", labelColX, summaryY + 18, { align: "right" });
    doc.text(
      formatCurrency(invoice.amountPaid),
      totalColX + 50,
      summaryY + 18,
      { align: "right" }
    );

    doc.setLineWidth(0.5);
    doc.line(totalColX - 10, summaryY + 21, pageWidth - margin, summaryY + 21);

    doc.setFontSize(11);
    doc.setTextColor(isReceipt ? colors.green : colors.red);
    doc.text("Balance Due:", labelColX, summaryY + 26, { align: "right" });
    doc.text(
      formatCurrency(invoice.balanceDue),
      totalColX + 50,
      summaryY + 26,
      { align: "right" }
    );

    lastY = summaryY + 30; // Update lastY
    doc.setTextColor(colors.text);

    // --- Terms of Service ---
    if (invoice.termsOfService) {
      doc.setFontSize(9); // Set font for accurate calculation
      doc.setFont("helvetica", "normal");
      const splitTerms = doc.splitTextToSize(
        invoice.termsOfService,
        pageWidth - margin * 2 - 80
      );
      const requiredHeight = 5 + (splitTerms.length * 5); // Title + content
      
      ensureSpace(requiredHeight + 3); // <-- NECESSARY FIX

      doc.setFont("helvetica", "bold");
      doc.text("Terms of Service:", margin, lastY);
      doc.setFont("helvetica", "normal");
      doc.text(splitTerms, margin, lastY + 5);
      
      lastY += requiredHeight + 3; // <-- Update lastY
    }

    // --- UPDATED Footer + Watermark on every page ---
    const pageCount =
      doc.internal.pages.length > 0 ? doc.internal.pages.length : 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Watermark
      doc.setGState(new GState({ opacity: 0.08 }));
      const watermarkWidth = 120;
      const watermarkHeight = 120;
      doc.addImage(
        watermarkLogo,
        "PNG",
        (pageWidth - watermarkWidth) / 2,
        (pageHeight - watermarkHeight) / 2,
        watermarkWidth,
        watermarkHeight
      );

      // "PAID" Stamp (Kept this logic)
      if (isReceipt) {
        doc.setGState(new GState({ opacity: 0.1 }));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(100);
        doc.setTextColor(colors.green);
        doc.text("PAID", pageWidth / 2, pageHeight / 2 + 35, {
          align: "center",
          angle: -45,
        });
      }

      doc.setGState(new GState({ opacity: 1 }));

      // --- NEW FOOTER LAYOUT ---
      const footerLineY = pageHeight - footerHeight;
      doc.setDrawColor(colors.aqua); // Match header line color
      doc.setLineWidth(0.5); // Match header line width
      doc.line(margin, footerLineY, pageWidth - margin, footerLineY);
      
      const footerY = footerLineY + 3; // Position text below the line
      doc.setFontSize(9);
      doc.setTextColor(colors.footer);

      // 1. Address on the left
      doc.text(firmAddress, margin, footerY + 2.5, {
        align: "left",
      });

      // 2. Page number on the right
      const pageNumText = `Page ${i} of ${pageCount}`;
      doc.text(pageNumText, pageWidth - margin, footerY + 2.5, {
        align: "right",
      });
      // --- END NEW FOOTER ---
    }

    const fileName = isReceipt
      ? `Receipt-${invoice.invoiceId}.pdf`
      : `Invoice-${invoice.invoiceId}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error("PDF Generation Failed:", err);
    alert("An error occurred while generating the PDF.");
  }
};

// In InvoiceDetailPage.tsx, add this new component before the main page component

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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { label: "Mark as Sent", status: "Sent", icon: "✉️" },
    { label: "Mark as Overdue", status: "Overdue", icon: "❗" },
    { label: "Mark as Cancelled", status: "Cancelled", icon: "❌" },
  ];

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={menuRef}>
      <button
        onClick={() => !isLoading && setIsOpen((p) => !p)}
        disabled={isLoading}
        style={{
          ...actionButtonStyle,
          padding: "0.5rem 1rem",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        Actions ▼
      </button>
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
            overflow: "hidden",
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.status}
              onClick={() => {
                onStatusChange(item.status);
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
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              {`${item.icon} ${item.label}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.invoiceId as string;
  const { loading: authLoading } = useAuth();
  const { loading, error, data, refetch } = useQuery<InvoiceDetailsData>(
    GET_INVOICE_DETAILS,
    { variables: { id }, skip: !id, fetchPolicy: "cache-and-network" }
  );

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isAmcModalOpen, setAmcModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // ADDED: State for pre-loaded images
  const [headerLogoBase64, setHeaderLogoBase64] = useState<string | null>(null);
  const [watermarkLogoBase64, setWatermarkLogoBase64] = useState<string | null>(
    null
  );

  // ADDED: useEffect to pre-load assets
  useEffect(() => {
    const loadPdfAssets = async () => {
      try {
        const [header, watermark] = await Promise.all([
          getImageAsBase64("/upscale-water-solution-logo+title.png"),
          getImageAsBase64("/upscale-water-solutions-logo.png"),
        ]);
        if (header) setHeaderLogoBase64(header);
        if (watermark) setWatermarkLogoBase64(watermark);
      } catch (error) {
        console.error("Failed to pre-load PDF assets:", error);
      }
    };
    loadPdfAssets();
  }, []); // Empty array ensures this runs only once on mount

  const [createAmc, { loading: amcLoading }] = useMutation(
    CREATE_AMC_FROM_INVOICE_MUTATION,
    {
      onCompleted: (data) => {
        setAmcModalOpen(false);
        setSuccessMessage(
          `AMC ${data.createAmcFromInvoice.amcId} created successfully!`
        );
        setShowSuccessModal(true);
        refetch();
      },
      onError: (err) => {
        alert(`Error creating AMC: ${err.message}`);
      },
    }
  );

  // ADDED: Mutation hook for status updates
  const [updateStatus, { loading: statusUpdateLoading }] = useMutation(
    UPDATE_INVOICE_STATUS_MUTATION,
    {
      onCompleted: () => {
        setSuccessMessage("Invoice status updated successfully!");
        setShowSuccessModal(true);
        refetch(); // Refetch to get the latest status
      },
      onError: (err) => alert(`Error updating status: ${err.message}`),
    }
  );

  if (!id || authLoading || loading)
    return (
      <div style={{ textAlign: "center", marginTop: "5rem", padding: "2rem" }}>
        Loading invoice details...
      </div>
    );
  if (error)
    return (
      <div style={{ color: "red", padding: "2rem", textAlign: "center" }}>
        Error loading invoice: {error.message}
      </div>
    );
  if (!data?.invoice)
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        Invoice not found.
      </div>
    );

  const { invoice } = data;

  // MODIFIED: Click handler to pass pre-loaded images
  const handleDownloadClick = async (isReceipt: boolean) => {
    setIsDownloading(true);
    await handleDownloadPdf(
      invoice,
      isReceipt,
      headerLogoBase64,
      watermarkLogoBase64
    );
    setIsDownloading(false);
  };

  // ADDED: Handler function for status changes
  const handleStatusChange = (newStatus: string) => {
    if (confirm(`Are you sure you want to change the status to "${newStatus}"?`)) {
      updateStatus({ variables: { id: invoice.id, status: newStatus } });
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "auto",
        padding: "1rem 1rem 4rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        fontFamily: "sans-serif",
      }}
    >
      {showSuccessModal && (
        <SuccessModal message={successMessage} onClose={() => setShowSuccessModal(false)} />
      )}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          invoiceId={invoice.id}
          balanceDue={invoice.balanceDue}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentRecorded={() => {
            setPaymentModalOpen(false);
            setSuccessMessage("Payment recorded successfully!");
            setShowSuccessModal(true);
            refetch();
          }}
        />
      )}
      {isAmcModalOpen && (
        <CreateAmcModal
          invoice={invoice}
          onClose={() => setAmcModalOpen(false)}
          onSubmit={(formData: AmcFormData) => {
            createAmc({ variables: { ...formData, invoiceId: invoice.id } });
          }}
          loading={amcLoading}
        />
      )}
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Invoice</h1>
          <p style={{ color: "#555", fontWeight: 500, margin: "0.25rem 0" }}>{invoice.invoiceId}</p>
          {invoice.createdBy && (
            <p style={{ fontSize: "0.8rem", color: "#666", margin: "0.25rem 0" }}>
              Created by: {invoice.createdBy.name}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <StatusBadge status={invoice.status} />

          {/* MODIFIED: Actions Menu added */}
          {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
              <ActionsMenu
                onStatusChange={handleStatusChange}
                isLoading={statusUpdateLoading}
              />
          )}

          {invoice.status === "Draft" && (
            <Link href={`/invoices/edit/${invoice.id}`} style={{ ...actionButtonStyle }}>Edit</Link>
          )}
          {invoice.status === "Paid" && !invoice.amc && (
            <button
              onClick={() => setAmcModalOpen(true)}
              style={{ ...buttonStyle, background: "#ffc107", color: "#212529" }}
              disabled={amcLoading}
            >
              Generate AMC
            </button>
          )}
          {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
            <button onClick={() => setPaymentModalOpen(true)} style={{ ...buttonStyle, background: "#28a745" }}>
              Record Payment
            </button>
          )}
          <button
            onClick={() => handleDownloadClick(false)}
            style={{ ...buttonStyle, background: "#007bff" }}
            disabled={isDownloading || !headerLogoBase64 || !watermarkLogoBase64}
          >
            {isDownloading ? "..." : "Download Invoice"}
          </button>
          {invoice.status === "Paid" && (
            <button
              onClick={() => handleDownloadClick(true)}
              style={{ ...buttonStyle, background: "#17a2b8" }}
              disabled={isDownloading || !headerLogoBase64 || !watermarkLogoBase64}
            >
              {isDownloading ? "..." : "Download Receipt"}
            </button>
          )}
        </div>
      </div>
      {/* Client & Dates Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          padding: "1.5rem",
          backgroundColor: "#fff",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
        }}
      >
        <div>
          <h3 style={detailHeaderStyle}>BILLED TO</h3>
          <p
            style={{ fontWeight: "600", color: "#111827", margin: "0.25rem 0" }}
          >
            {invoice.clientInfo.name}
          </p>
          <p style={detailTextStyle}>{invoice.clientInfo.phone || "N/A"}</p>
          <p style={detailTextStyle}>{invoice.clientInfo.email || "N/A"}</p>
          <div style={{ marginTop: "1rem" }}>
            <h4 style={detailHeaderStyle}>Billing Address</h4>
            <p style={detailTextStyle}>
              {invoice.clientInfo.billingAddress || "N/A"}
            </p>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <h4 style={detailHeaderStyle}>Installation Address</h4>
            <p style={detailTextStyle}>
              {invoice.clientInfo.installationAddress || "N/A"}
            </p>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <h3 style={detailHeaderStyle}>INVOICE DATE</h3>
          <p style={detailTextStyle}>{formatDate(invoice.issueDate)}</p>
          <h3 style={{ ...detailHeaderStyle, marginTop: "1rem" }}>
            INSTALLATION DATE
          </h3>
          <p style={detailTextStyle}>{formatDate(invoice.installationDate)}</p>
          <h3 style={{ ...detailHeaderStyle, marginTop: "1rem" }}>DUE DATE</h3>
          <p style={detailTextStyle}>{formatDate(invoice.dueDate)}</p>
          {invoice.status === "Paid" && invoice.paymentDate && (
            <div style={{ marginTop: "1rem" }}>
              <h3 style={detailHeaderStyle}>Payment Date</h3>
              <p style={detailTextStyle}>{formatDate(invoice.paymentDate)}</p>
            </div>
          )}
        </div>
      </div>
      {/* Associated Documents */}
      {(invoice.quotation || invoice.amc) && (
        <FormSection title="Associated Documents">
          {invoice.quotation && (
            <div style={associatedDocStyle}>
              <p style={{ fontWeight: "600", margin: 0 }}>
                Originating Quotation: {invoice.quotation.quotationId}
              </p>
              <Link
                href={`/quotations/${invoice.quotation.id}`}
                style={actionButtonStyle}
              >
                View Quotation
              </Link>
            </div>
          )}
          {invoice.amc && (
            <div style={associatedDocStyle}>
              <p style={{ fontWeight: "600", margin: 0 }}>
                Related AMC: {invoice.amc.amcId}
              </p>
              <Link href={`/amcs/${invoice.amc.id}`} style={actionButtonStyle}>
                View AMC
              </Link>
            </div>
          )}
        </FormSection>
      )}
      {/* Line Items Table */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "600px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Item</th>
              <th
                style={{
                  ...tableHeaderStyle,
                  textAlign: "center",
                  width: "80px",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  ...tableHeaderStyle,
                  textAlign: "right",
                  width: "120px",
                }}
              >
                Price
              </th>
              <th
                style={{
                  ...tableHeaderStyle,
                  textAlign: "right",
                  width: "120px",
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, index) => (
              <tr key={index}>
                <td style={tableCellStyle}>
                  <p style={{ fontWeight: "600", color: "#111827", margin: 0 }}>
                    {item.productName || "N/A"}
                  </p>
                  {item.description && (
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        margin: "0.25rem 0 0 0",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.description}
                    </p>
                  )}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "center" }}>
                  {item.quantity}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {formatCurrency(item.price)}
                </td>
                <td
                  style={{
                    ...tableCellStyle,
                    textAlign: "right",
                    fontWeight: "500",
                  }}
                >
                  {formatCurrency(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Summary & Terms */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "2rem",
          flexWrap: "wrap-reverse",
        }}
      >
        <div style={{ flex: "1 1 300px" }}>
          {invoice.termsOfService && (
            <>
              <h3 style={detailHeaderStyle}>TERMS OF SERVICE</h3>
              <p
                style={{
                  ...detailTextStyle,
                  whiteSpace: "pre-wrap",
                  marginTop: "0.25rem",
                }}
              >
                {invoice.termsOfService}
              </p>
            </>
          )}
        </div>
        <div
          style={{
            flex: "0 1 350px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={detailTextStyle}>Subtotal:</span>
              <span style={detailTextStyle}>
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={detailTextStyle}>
                VAT ({invoice.taxPercentage}%):
              </span>
              <span style={detailTextStyle}>
                {formatCurrency(
                  (invoice.totalAmount * invoice.taxPercentage) / 100
                )}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "600",
              }}
            >
              <span style={detailTextStyle}>Grand Total:</span>
              <span style={detailTextStyle}>
                {formatCurrency(invoice.grandTotal)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={detailTextStyle}>Amount Paid:</span>
              <span style={detailTextStyle}>
                {formatCurrency(invoice.amountPaid)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "0.75rem",
                marginTop: "0.5rem",
                borderTop: "2px solid #111827",
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- RecordPaymentModal Component ---
interface RecordPaymentModalProps {
  invoiceId: string;
  balanceDue: number;
  onClose: () => void;
  onPaymentRecorded: () => void;
}
const RecordPaymentModal = ({
  invoiceId,
  balanceDue,
  onClose,
  onPaymentRecorded,
}: RecordPaymentModalProps) => {
  const [amount, setAmount] = useState(Math.max(0, balanceDue).toFixed(2));
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [recordPayment, { loading, error }] = useMutation(
    RECORD_PAYMENT_MUTATION,
    {
      onCompleted: () => {
        onPaymentRecorded();
      },
    }
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Please enter a valid positive payment amount.");
      return;
    }
    recordPayment({
      variables: { input: { invoiceId, amount: paymentAmount, paymentDate } },
    });
  };

  return (
    <ModalWrapper title="Record Payment" onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <InputField
          label={`Payment Amount (AED) - Balance: ${formatCurrency(
            balanceDue
          )}`}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          step="0.01"
          max={balanceDue > 0 ? balanceDue.toFixed(2) : undefined}
          min="0.01"
        />
        <InputField
          label="Payment Date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
        {error && (
          <p style={{ color: "red", margin: "0.5rem 0" }}>{error.message}</p>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...buttonStyle,
              backgroundColor: "#e5e7eb",
              color: "#1f2937",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "#28a745",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// --- CreateAmcModal Component ---
interface CreateAmcModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (data: AmcFormData) => void;
  loading: boolean;
}
const CreateAmcModal = ({
  invoice,
  onClose,
  onSubmit,
  loading,
}: CreateAmcModalProps) => {
  const today = new Date();
  const nextYear = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
  );

  const [startDate, setStartDate] = useState(today.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(nextYear.toISOString().split("T")[0]);
  const [frequencyPerYear, setFrequencyPerYear] = useState(4);
  const [contractAmount, setContractAmount] = useState(invoice.grandTotal);
  const [commercialTerms, setCommercialTerms] = useState(
    invoice.termsOfService || ""
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const freq = Number(frequencyPerYear);
    const amount = Number(contractAmount);

    if (freq <= 0 || amount <= 0) {
      alert("Frequency and Contract Amount must be positive numbers.");
      return;
    }
    if (!startDate || !endDate) {
      alert("Start and End dates are required.");
      return;
    }

    onSubmit({
      startDate,
      endDate,
      frequencyPerYear: freq,
      contractAmount: amount,
      commercialTerms: commercialTerms || undefined,
    });
  };

  return (
    <ModalWrapper title="Generate New AMC" onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            color: "#4b5563",
            margin: "-0.5rem 0 0.5rem 0",
          }}
        >
          Creating AMC from Invoice: <strong>{invoice.invoiceId}</strong>
        </p>
        <InputField
          label="Contract Amount (AED)"
          type="number"
          step="0.01"
          min="0.01"
          value={contractAmount}
          onChange={(e) => setContractAmount(Number(e.target.value))}
          required
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <InputField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <InputField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <InputField
          label="Service Visits per Year"
          type="number"
          min="1"
          step="1"
          value={frequencyPerYear}
          onChange={(e) => setFrequencyPerYear(Number(e.target.value))}
          required
        />
        <InputField
          label="Commercial Terms (Optional)"
          type="textarea"
          value={commercialTerms || ""}
          onChange={(e) => setCommercialTerms(e.target.value)}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...buttonStyle,
              backgroundColor: "#e5e7eb",
              color: "#1f2937",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "#ffc107",
              color: "#212529",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating..." : "Create AMC"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};
