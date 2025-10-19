import mongoose, { Schema, Document, Model } from 'mongoose';
import { IClient } from './Client';
import { IQuotation, ILineItem, IClientInfo } from './Quotation';
import { IAMC } from './AMC'; 

export interface IInvoice extends Document {
  invoiceId: string;
  client: IClient['_id'];
  clientInfo: IClientInfo;
  quotation?: IQuotation['_id'];
  amc?: IAMC['_id'];
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  issueDate: Date;
  dueDate?: Date;
  installationDate?: Date;
  lineItems: ILineItem[];
  totalAmount: number;
  amountPaid: number;
  paymentDate?: Date;
  termsOfService?: string;
}

const InvoiceSchema: Schema<IInvoice> = new Schema({
  invoiceId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  // --- THIS IS THE FIX: Schema updated to use simple strings for addresses ---
  clientInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    billingAddress: String,
    installationAddress: String,
  },
  quotation: { type: Schema.Types.ObjectId, ref: 'Quotation' },
  amc: { type: Schema.Types.ObjectId, ref: 'AMC' },
  status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'], default: 'Draft' },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  installationDate: { type: Date },
  lineItems: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: Number,
    price: Number,
  }],
  totalAmount: { type: Number },
  amountPaid: { type: Number, default: 0 },
  paymentDate: { type: Date },
  termsOfService: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
