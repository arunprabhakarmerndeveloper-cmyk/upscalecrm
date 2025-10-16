import mongoose, { Schema, Document, Model } from 'mongoose';
// --- FIX 1: Removed the problematic IClientInfo import ---
import { IClient } from './Client';
import { IProduct } from './Product';
import { IUser } from './User';

// --- FIX 2: Defined IClientInfo directly in this file ---
// This interface describes the shape of the client data stored directly on the quotation
export interface IClientInfo {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    pincode?: string;
  };
  installationAddress?: {
    street?: string;
    city?: string;
    pincode?: string;
  };
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
  clientInfo: IClientInfo; // Now correctly uses the locally defined interface
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  lineItems: ILineItem[];
  totalAmount: number;
  validUntil: Date;
  commercialTerms?: ICommercialTerm[];
  editHistory: IQuotationVersion[];
}

const QuotationSchema: Schema<IQuotation> = new Schema({
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

// --- FIX 3: Removed the problematic re-export ---
const Quotation: Model<IQuotation> = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

export default Quotation;