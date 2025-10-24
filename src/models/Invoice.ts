import mongoose, { Schema, Document, Model } from 'mongoose';
import { IClient } from './Client';
import { IQuotation } from './Quotation';
import { IAMC } from './AMC';
import { IUser } from './User'; // Import IUser if not already imported

// Re-using these interfaces for consistency with Quotations
export interface IClientInfo {
  name: string;
  contactPerson?: string; // Optional field
  phone?: string;
  email?: string;
  billingAddress?: string;
  installationAddress?: string;
}

export interface ILineItem {
  productName: string;
  description: string;
  quantity: number;
  price: number;
}

export interface IInvoice extends Document {
  invoiceId: string;
  client?: IClient['_id']; // Made optional
  clientInfo: IClientInfo;
  quotation?: IQuotation['_id'];
  amc?: IAMC['_id'];
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  issueDate: Date;
  dueDate?: Date;
  installationDate?: Date;
  lineItems: ILineItem[];
  totalAmount: number; // Subtotal
  taxPercentage: number;
  grandTotal: number; // Final total
  amountPaid: number;
  paymentDate?: Date;
  termsOfService?: string;
  createdBy?: IUser['_id']; // Changed to IUser, made optional if necessary
}

const InvoiceSchema: Schema<IInvoice> = new Schema({
  invoiceId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: false }, // Made optional
  clientInfo: {
    name: { type: String, required: true },
    phone: String,
    email: String,
    billingAddress: String,
    installationAddress: String,
  },
  quotation: { type: Schema.Types.ObjectId, ref: 'Quotation' },
  amc: { type: Schema.Types.ObjectId, ref: 'AMC' },
  status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'], default: 'Draft' },
  issueDate: { type: Date, default: Date.now },
  dueDate: Date,
  installationDate: Date,
  lineItems: [{
    productName: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  taxPercentage: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentDate: Date,
  termsOfService: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
