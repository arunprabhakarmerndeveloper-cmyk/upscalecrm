import mongoose, { Schema, Document } from 'mongoose';
import { IClient, IClientInfo } from './Client';
import { IProduct } from './Product';
import { IUser } from './User';
import { IInvoice } from './Invoice'; // --- 1. Import the Invoice interface ---

export interface IProductInstance {
  product: IProduct['_id'];
  serialNumber?: string;
  purchaseDate?: Date;
}

export interface IAMC extends Document {
  amcId: string;
  client: IClient['_id'];
  clientInfo: IClientInfo;
  productInstances: IProductInstance[]; // This is correctly an array
  startDate: Date;
  endDate: Date;
  contractAmount: number;
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
  originatingInvoice?: IInvoice['_id']; // --- 2. Add the optional link ---
}

const AMCSchema: Schema = new Schema({
  amcId: { type: String, required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  clientInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    installationAddress: { street: String, city: String, pincode: String },
  },
  productInstances: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    serialNumber: { type: String },
    purchaseDate: { type: Date },
  }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  contractAmount: { type: Number, required: true },
  frequencyPerYear: { type: Number, min: 1, max: 12, required: true },
  serviceVisits: [{
    scheduledDate: Date,
    completedDate: Date,
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'] },
    notes: String,
  }],
  status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originatingInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice' }, // --- 3. Add the field to the schema ---
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.models.AMC || mongoose.model<IAMC>('AMC', AMCSchema);

