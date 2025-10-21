"use client";

import { useQuery, gql, useMutation } from "@apollo/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import React, { ReactNode, useState } from "react";
import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageAsBase64 } from "@/lib/imageUtils";

// --- TypeScript Interfaces ---

interface ProductInstance {
  product: {
    name: string;
  } | null;
  serialNumber: string | null;
  purchaseDate: string | number;
}

interface ServiceVisit {
  scheduledDate: string | number;
  completedDate?: string | number | null;
  status: string;
  notes: string | null;
}

interface Amc {
  id: string;
  amcId: string;
  status: string;
  startDate: string | number;
  endDate: string | number;
  contractAmount: number;
  createdBy: {
    name: string;
  } | null;
  createdAt: string | number;
  clientInfo: {
    name: string;
    phone: string;
    email: string | null;
    billingAddress: string | null;
    installationAddress: string | null;
  };
  productInstances: ProductInstance[];
  serviceVisits: ServiceVisit[];
  commercialTerms?: string;
}

interface AmcDetailsData {
  amc: Amc;
}

// --- GraphQL Queries & Mutations ---

const GET_AMC_DETAILS = gql`
  query GetAmcDetails($id: ID!) {
    amc(id: $id) {
      id
      amcId
      status
      startDate
      endDate
      contractAmount
      createdBy {
        name
      }
      createdAt
      clientInfo {
        name
        phone
        email
        billingAddress
        installationAddress
      }
      productInstances {
        product {
          name
        }
        serialNumber
        purchaseDate
      }
      serviceVisits {
        scheduledDate
        completedDate
        status
        notes
      }
      commercialTerms
    }
  }
`;

const UPDATE_SERVICE_STATUS = gql`
  mutation UpdateAmcServiceStatus(
    $amcId: ID!
    $visitIndex: Int!
    $status: String!
    $completedDate: String
  ) {
    updateAmcServiceStatus(
      amcId: $amcId
      visitIndex: $visitIndex
      status: $status
      completedDate: $completedDate
    ) {
      id
      serviceVisits {
        status
        completedDate
      }
    }
  }
`;

// --- Helper Functions & Styles ---
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(
    amount
  );

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "#fff",
  fontWeight: "600",
  padding: "0.6rem 1.2rem",
  borderRadius: "0.375rem",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "0.75rem",
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #e5e7eb",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: "600",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "1rem",
  marginBottom: "1rem",
};

// --- Main Component ---
export default function AmcDetailPage() {
  const params = useParams();
  const id = params.amcId as string;
  const { loading: authLoading } = useAuth();

  const [modal, setModal] = useState<{
    type: "confirm" | "error" | null;
    message: string;
    onConfirm?: () => void;
  }>({ type: null, message: "" });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { loading, error, data, refetch } = useQuery<AmcDetailsData>(
    GET_AMC_DETAILS,
    {
      variables: { id },
      skip: !id,
    }
  );

  const [updateServiceStatus, { loading: updateLoading }] = useMutation(
    UPDATE_SERVICE_STATUS,
    {
      onCompleted: () => refetch(),
      onError: (err) =>
        setModal({
          type: "error",
          message: `Error updating service status: ${err.message}`,
        }),
    }
  );

  const handleServiceCheck = (index: number, currentStatus: string) => {
    const newStatus = currentStatus === "Completed" ? "Scheduled" : "Completed";
    setModal({
      type: "confirm",
      message: `Mark service #${index + 1} as ${newStatus}?`,
      onConfirm: () => {
        const completedDate =
          newStatus === "Completed" ? new Date().toISOString() : undefined;
        updateServiceStatus({
          variables: {
            amcId: id,
            visitIndex: index,
            status: newStatus,
            completedDate,
          },
        });
        setModal({ type: null, message: "" });
      },
    });
  };

  const handleCloseModal = () => setModal({ type: null, message: "" });

  const handleDownloadPdf = async () => {
    if (!data?.amc) return;
    setIsGeneratingPdf(true);

    try {
      const [headerLogo, watermarkLogo] = await Promise.all([
        getImageAsBase64("/upscale-water-solution-logo+title.png"),
        getImageAsBase64("/upscale-water-solutions-logo.png"),
      ]);

      if (!headerLogo || !watermarkLogo) {
        throw new Error(
          "Could not load required PDF assets. Please re-save your logos as simple PNGs and try again."
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new jsPDF("p", "mm", "a4"); // Use 'any' to simplify typing
      const { amc } = data;
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let lastY = 0;

      const colors = {
        navy: "#0B1E3C", royal: "#125EAB", aqua: "#0FD1E3",
        gray: "#F4F6FA", text: "#333333", white: "#FFFFFF",
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
      doc.text("Annual Maintenance Contract (AMC)", margin, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(colors.text);
      doc.text(firmAddress, margin, 24);

      doc.setDrawColor(colors.aqua);
      doc.setLineWidth(0.5);
      doc.line(margin, 30, pageWidth - margin, 30);
      lastY = 35;

      const clientDetails = [
        ["Client Name:", amc.clientInfo.name],
        ["Installation Address:", amc.clientInfo.installationAddress || "N/A"],
        ["Contact Number:", amc.clientInfo.phone],
        ["Email Address:", amc.clientInfo.email || "N/A"],
        ["Date of Installation:", formatDate(amc.productInstances[0]?.purchaseDate)],
        ["Contract Validity:", `${formatDate(amc.startDate)} to ${formatDate(amc.endDate)}`],
        ["Contract Amount:", formatCurrency(amc.contractAmount) + " (AED)"],
      ];

      autoTable(doc, {
        startY: lastY,
        body: clientDetails,
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
        alternateRowStyles: { fillColor: colors.gray },
      });

      lastY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : lastY;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(colors.royal);
      doc.text("Products Under Contract", margin, lastY);
      lastY += 6;

      const productData = amc.productInstances.map((p) => [
        p.product?.name || "N/A",
        p.serialNumber || "N/A",
        formatDate(p.purchaseDate),
      ]);

      autoTable(doc, {
        startY: lastY,
        head: [["Product Name", "Serial Number", "Install Date"]],
        body: productData,
        theme: "grid",
        headStyles: { fontStyle: "bold", fillColor: colors.royal, textColor: colors.white },
        alternateRowStyles: { fillColor: colors.gray },
        styles: { lineColor: colors.aqua, lineWidth: 0.1 },
      });

      lastY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : lastY;

      doc.setFontSize(12);
      doc.setTextColor(colors.royal);
      doc.text("Scope of Work", margin, lastY);
      lastY += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(colors.text);
      const numServices = amc.serviceVisits.length;
      const scopeText = `Under this AMC, the following ${numServices} services will be provided for a period of twelve (12) months from the date of installation.`;
      const splitText = doc.splitTextToSize(scopeText, pageWidth - margin * 2);
      doc.text(splitText, margin, lastY);
      lastY += splitText.length * 5 + 5;

      const serviceData = amc.serviceVisits.map((v, i) => [
        `Visit #${i + 1}`,
        formatDate(v.scheduledDate),
        v.status,
        formatDate(v.completedDate),
      ]);

      autoTable(doc, {
        startY: lastY,
        head: [["Visit", "Scheduled Date", "Status", "Completed On"]],
        body: serviceData,
        theme: "grid",
        headStyles: { fontStyle: "bold", fillColor: colors.royal, textColor: colors.white },
        alternateRowStyles: { fillColor: colors.gray },
        styles: { lineColor: colors.aqua, lineWidth: 0.1 },
      });

      lastY = doc.lastAutoTable?.finalY || lastY;

      if (lastY > pageHeight - 50) {
        doc.addPage();
        lastY = margin;
      }
      doc.setTextColor(colors.royal);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Authorized Signatures", margin, lastY + 25);

      doc.setDrawColor(colors.navy);
      doc.setLineWidth(0.2);
      doc.line(margin, lastY + 40, margin + 70, lastY + 40);
      doc.setTextColor(colors.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Company Representative", margin, lastY + 45);

      doc.line(pageWidth - margin - 70, lastY + 40, pageWidth - margin, lastY + 40);
      doc.text("Client", pageWidth - margin - 70, lastY + 45);
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setGState(new GState({ opacity: 0.08 }));
        const watermarkWidth = 120;
        const watermarkHeight = 120;
        const x = (pageWidth - watermarkWidth) / 2;
        const y = (pageHeight - watermarkHeight) / 2;
        doc.addImage(
          watermarkLogo,
          "PNG",
          x,
          y,
          watermarkWidth,
          watermarkHeight
        );

        doc.setGState(new GState({ opacity: 1 }));

        const footerY = pageHeight - 12;
        doc.setFontSize(9);
        doc.setTextColor(colors.footer);

        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY + 2, {
          align: "center",
        });
        doc.text(`Email: info@upscalewatersolutions.com`, margin, footerY + 2.5);
        doc.text(`Phone: +971 58 584 2822`, pageWidth - margin, footerY + 2.5, {
          align: "right",
        });
      }

      doc.save(`AMC-${amc.amcId}.pdf`);
    } catch (err) {
      console.error("PDF Generation Failed:", err);
      setModal({
        type: "error",
        message:
          "An error occurred while generating the PDF. Please check the console.",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!id || authLoading || loading)
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        Loading AMC Details...
      </div>
    );
  if (error && !data)
    return (
      <div style={{ color: "red", textAlign: "center" }}>
        Error: {error.message}
      </div>
    );
  if (!data?.amc)
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        AMC not found.
      </div>
    );

  const { amc } = data;

  return (
    <>
      <div
        style={{
          maxWidth: "900px",
          margin: "auto",
          padding: "1rem 1rem 4rem 1rem",
        }}
      >
        {modal.type === "confirm" && (
          <ConfirmationModal
            message={modal.message}
            onConfirm={modal.onConfirm!}
            onCancel={handleCloseModal}
            loading={updateLoading}
          />
        )}
        {modal.type === "error" && (
          <ErrorModal message={modal.message} onClose={handleCloseModal} />
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: "800" }}>
              AMC Details
            </h1>
            <p style={{ color: "#4b5563", fontWeight: "500" }}>{amc.amcId}</p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <StatusBadge status={amc.status} />
            <button
              onClick={handleDownloadPdf}
              style={buttonStyle}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? "Downloading..." : "Download PDF"}
            </button>
            <Link
              href={`/amcs/edit/${amc.id}`}
              style={{
                ...buttonStyle,
                backgroundColor: "#f9fafb",
                color: "#374151",
                border: "1px solid #d1d5db",
              }}
            >
              Edit
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Client & Contract Details</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <DetailItem label="Client" value={amc.clientInfo.name} />
              <DetailItem label="Phone" value={amc.clientInfo.phone} />
              <DetailItem label="Email" value={amc.clientInfo.email || "N/A"} />
              <DetailItem
                label="Contract Amount"
                value={formatCurrency(amc.contractAmount)}
              />
              <DetailItem
                label="Contract Period"
                value={`${formatDate(amc.startDate)} - ${formatDate(
                  amc.endDate
                )}`}
              />
              <DetailItem
                label="Created On"
                value={`${formatDate(amc.createdAt)} by ${
                  amc.createdBy?.name || "N/A"
                }`}
              />
            </div>
            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                marginTop: "1.5rem",
                paddingTop: "1.5rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <DetailItem
                label="Billing Address"
                value={amc.clientInfo.billingAddress || "N/A"}
              />
              <DetailItem
                label="Installation Address"
                value={amc.clientInfo.installationAddress || "N/A"}
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Products Under Contract</h3>
            {amc.productInstances.map(
              (instance: ProductInstance, index: number) => (
                <div
                  key={index}
                  style={{
                    borderTop: index > 0 ? "1px solid #f3f4f6" : "none",
                    padding: "1rem 0",
                  }}
                >
                  <p style={{ fontWeight: "600" }}>
                    {instance.product?.name || "Product Not Found"}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Serial Number: {instance.serialNumber || "N/A"}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Install Date: {formatDate(instance.purchaseDate)}
                  </p>
                </div>
              )
            )}
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Service Schedule</h3>
            {amc.serviceVisits.map((visit: ServiceVisit, index: number) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem 0",
                  borderTop: index > 0 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={visit.status === "Completed"}
                  onChange={() => handleServiceCheck(index, visit.status)}
                  style={{
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                    accentColor: "#2563eb",
                  }}
                  disabled={updateLoading}
                />
                <div
                  style={{
                    textDecoration:
                      visit.status === "Completed" ? "line-through" : "none",
                    color: visit.status === "Completed" ? "#9ca3af" : "#111827",
                  }}
                >
                  <p style={{ fontWeight: "500" }}>
                    Service Visit #{index + 1}
                  </p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Scheduled for: {formatDate(visit.scheduledDate)}
                  </p>
                  {visit.status === "Completed" && (
                    <p style={{ fontSize: "0.875rem" }}>
                      Completed on: {formatDate(visit.completedDate)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {amc.commercialTerms && (
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Commercial Terms</h3>
              <ul
                style={{
                  paddingLeft: "1.25rem",
                  color: "#111827",
                  fontWeight: 500,
                  listStyle: "disc",
                }}
              >
                {amc.commercialTerms.split("\n").map((term, idx) => (
                  <li key={idx} style={{ marginBottom: "0.5rem" }}>
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Helper Components ---
const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div style={{ padding: "0.25rem 0" }}>
    <p
      style={{
        fontSize: "0.875rem",
        color: "#6b7280",
        fontWeight: "500",
        textTransform: "uppercase",
      }}
    >
      {label}
    </p>
    <p style={{ fontWeight: "600", color: "#111827", whiteSpace: "pre-wrap" }}>
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, React.CSSProperties> = {
    Active: { background: "#d1fae5", color: "#065f46" },
    Expired: { background: "#fee2e2", color: "#991b1b" },
    Cancelled: { background: "#e5e7eb", color: "#4b5563" },
  };
  const style = statusStyles[status] || {
    background: "#f3f4f6",
    color: "#4b5563",
  };
  return (
    <span
      style={{
        ...style,
        padding: "0.25rem 0.75rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: "600",
        textTransform: "capitalize",
        display: "inline-block",
      }}
    >
      {status}
    </span>
  );
};

const Modal = ({
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
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>{title}</h2>
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
      </div>
      {children}
    </div>
  </div>
);

const ConfirmationModal = ({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) => (
  <Modal title="Confirm Action" onClose={onCancel}>
    <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{message}</p>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
      <button
        onClick={onCancel}
        disabled={loading}
        style={{ ...buttonStyle, backgroundColor: "#e5e7eb", color: "#374151" }}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          ...buttonStyle,
          backgroundColor: "#2563eb",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Processing..." : "Confirm"}
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
    <p style={{ color: "#b91c1c", marginBottom: "1.5rem" }}>{message}</p>
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button
        onClick={onClose}
        style={{ ...buttonStyle, backgroundColor: "#ef4444" }}
      >
        Close
      </button>
    </div>
  </Modal>
);