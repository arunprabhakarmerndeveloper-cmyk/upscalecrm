import mongoose, { Schema, Document } from 'mongoose';
import { IClient, IClientInfo } from './Client'; // This import is now correct
import { IQuotation, ILineItem } from './Quotation';
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

const InvoiceSchema: Schema = new Schema({
  invoiceId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  clientInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    billingAddress: { street: String, city: String, pincode: String },
    installationAddress: { street: String, city: String, pincode: String },
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

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
