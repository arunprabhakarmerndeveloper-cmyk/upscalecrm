// models/Quotation.ts

import mongoose, { Schema, Document, Model } from 'mongoose';
import { IClient } from './Client';
import { IUser } from './User';

export interface IClientInfo {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  installationAddress?: string;
}

// 👇 FIX 1: Product is now stored by name, not ID reference
export interface ILineItem {
  productName: string; 
  description: string;
  quantity: number;
  price: number;
}

export interface ICommercialTerm {
  title: string;
  content: string;
}

// 👇 FIX 2: QuotationVersion now holds a full copy of all quotation data
export interface IQuotationVersion {
  version: number;
  updatedAt: Date;
  updatedBy: IUser['_id'];
  reason: string;
  clientInfo: IClientInfo;
  lineItems: ILineItem[];
  imageUrls?: string[];
  totalAmount: number;
  taxPercentage?: number;
  grandTotal: number;
  validUntil: Date;
  commercialTerms?: ICommercialTerm[];
}

export interface IQuotation extends Document {
  quotationId: string;
  client?: IClient['_id'];
  clientInfo: IClientInfo;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  lineItems: ILineItem[];
  imageUrls?: string[];
  totalAmount: number;
  taxPercentage?: number;
  grandTotal: number;
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
    phone: { type: String },
    email: String,
    billingAddress: String,
    installationAddress: String,
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Approved', 'Rejected'],
    default: 'Draft',
  },
  // 👇 FIX 3: lineItems schema updated to store productName
  lineItems: [{
    productName: { type: String, required: true },
    description: String,
    quantity: { type: Number, default: 1 },
    price: Number,
  }],
  imageUrls: [String],
  totalAmount: { type: Number },
  taxPercentage: { type: Number, default: 0 },
  grandTotal: { type: Number },
  validUntil: { type: Date },
  commercialTerms: [{
    title: { type: String, required: true },
    content: { type: String, required: true }
  }],
  // 👇 FIX 4: editHistory schema updated to store all fields
  editHistory: [{
    version: Number,
    updatedAt: Date,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    clientInfo: { name: String, phone: String, email: String, billingAddress: String, installationAddress: String },
    lineItems: [{ productName: String, description: String, quantity: Number, price: Number }],
    totalAmount: Number,
  taxPercentage: Number,
  grandTotal: Number, 
    validUntil: Date,
    commercialTerms: [{ title: String, content: String }],
    imageUrls: [String],
  }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Quotation: Model<IQuotation> = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

export default Quotation;