import mongoose, { Schema, Document, Model } from 'mongoose';
import { IClient } from './Client';
import { IProduct } from './Product';
import { IUser } from './User';

// --- THIS IS THE FIX: Addresses are now simple strings ---
export interface IClientInfo {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress?: string;
  installationAddress?: string;
}

export interface ILineItem {
  product: IProduct['_id'];
  description: string;
  quantity: number;
  price: number;
}

export interface IQuotationVersion {
  version: number;
  updatedAt: Date;
  updatedBy: IUser['_id'];
  reason: string;
  lineItems: ILineItem[];
  totalAmount: number;
}

export interface ICommercialTerm {
  title: string;
  content: string;
}

export interface IQuotation extends Document {
  quotationId: string;
  client?: IClient['_id'];
  clientInfo: IClientInfo;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  lineItems: ILineItem[];
  imageUrls?: string[];
  totalAmount: number;
  validUntil: Date;
  commercialTerms?: ICommercialTerm[];
  editHistory: IQuotationVersion[];
}

const QuotationSchema: Schema<IQuotation> = new Schema({
  quotationId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
  // --- THIS IS THE FIX: Schema updated to use simple strings for addresses ---
  clientInfo: {
    name: { type: String, required: true },
    contactPerson: String,
    phone: { type: String, required: true },
    email: String,
    billingAddress: String,
    installationAddress: String,
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Approved', 'Rejected'],
    default: 'Draft',
  },
  lineItems: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, default: 1 },
    price: Number,
  }],
  imageUrls: [String],
  totalAmount: { type: Number },
  validUntil: { type: Date },
  commercialTerms: [{
    title: { type: String, required: true },
    content: { type: String, required: true }
  }],
  editHistory: [{
    version: Number,
    updatedAt: Date,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    lineItems: [],
    totalAmount: Number,
  }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Quotation: Model<IQuotation> = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

export default Quotation;
