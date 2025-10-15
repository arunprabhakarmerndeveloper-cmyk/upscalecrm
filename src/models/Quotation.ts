import mongoose, { Schema, Document } from 'mongoose';
import { IClient, IClientInfo } from './Client';
import { IProduct } from './Product';
import { IUser } from './User';

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

// --- NEW: Defines the structure for a commercial term ---
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
  totalAmount: number;
  validUntil: Date;
  commercialTerms?: ICommercialTerm[]; // --- UPDATED ---
  editHistory: IQuotationVersion[];
}

const QuotationSchema: Schema = new Schema({
  quotationId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
  clientInfo: {
    name: { type: String, required: true },
    contactPerson: String,
    phone: { type: String, required: true },
    email: String,
    billingAddress: { street: String, city: String, pincode: String },
    installationAddress: { street: String, city: String, pincode: String },
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
  totalAmount: { type: Number },
  validUntil: { type: Date },
  // --- UPDATED: Replaced termsOfService with a flexible array ---
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

// We need to export IClientInfo so other models can use it.
export { IClientInfo }; 
export default mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

