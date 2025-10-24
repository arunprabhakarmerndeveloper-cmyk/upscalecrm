import mongoose, { Schema, Document, Model } from 'mongoose';
import { IClient } from './Client';
import { IUser } from './User';
import { IInvoice } from './Invoice';
import { IClientInfo } from './Quotation';

export interface IAMCProduct {
  productName: string;
  description?: string; // ADDED
  quantity?: number;    // ADDED
  price?: number;       // ADDED
  serialNumber?: string;
  purchaseDate?: Date;
}

export interface IAMC extends Document {
  amcId: string;
  client: IClient['_id'];
  clientInfo: IClientInfo;
  productInstances: IAMCProduct[];
  startDate: Date;
  endDate: Date;
  contractAmount: number;
  taxPercentage?: number;
  frequencyPerYear: number;
  serviceVisits: {
    scheduledDate: Date;
    completedDate?: Date;
    status: 'Scheduled' | 'Completed' | 'Cancelled';
    notes?: string;
  }[];
  status: 'Active' | 'Expired' | 'Cancelled';
  createdBy: IUser['_id'];
  createdAt: Date;
  originatingInvoice?: IInvoice['_id'];
  commercialTerms?: string;
}

const AMCSchema: Schema<IAMC> = new Schema({
  amcId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client' }, // This remains for linking existing clients
  clientInfo: {
    name: { type: String, required: true },
    phone: String,
    email: String,
    billingAddress: String,
    installationAddress: String,
  },
  productInstances: [{
    productName: { type: String, required: true },
    description: String, 
    quantity: Number,    
    price: Number,       
    serialNumber: String,
    purchaseDate: Date,
  }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  contractAmount: { type: Number, required: true },
  taxPercentage: { type: Number, default: 0 },
  frequencyPerYear: { type: Number, min: 1, max: 12, required: true },
  serviceVisits: [{
    scheduledDate: Date,
    completedDate: Date,
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'] },
    notes: String,
  }],
  status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originatingInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  commercialTerms: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const AMC: Model<IAMC> = mongoose.models.AMC || mongoose.model<IAMC>('AMC', AMCSchema);

export default AMC;