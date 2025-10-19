import mongoose, { Schema, Document, Model } from 'mongoose';

// --- THIS IS THE FIX: A new, more flexible address interface ---
export interface IAddress {
  tag: string;    // e.g., "Billing", "Shipping", "Site 1"
  address: string; // The full address as a single string
}

export interface IClient extends Document {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  addresses?: IAddress[]; // Replaced separate address fields with an array
  customFields?: {
    key: string;
    value: string;
  }[];
}

const ClientSchema: Schema<IClient> = new Schema({
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  // --- THIS IS THE FIX: The schema now uses an array of address objects ---
  addresses: [{
    tag: { type: String, required: true },
    address: { type: String, required: true },
  }],
  customFields: [{
    key: { type: String },
    value: { type: String }
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
