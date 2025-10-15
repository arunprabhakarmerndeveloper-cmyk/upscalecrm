import mongoose, { Schema, Document } from 'mongoose';

// --- THIS IS THE FIX: IClientInfo is now defined and exported here ---
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
// --- END OF FIX ---

export interface IClient extends Document {
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
  customFields?: {
    key: string;
    value: string;
  }[];
}

const ClientSchema: Schema = new Schema({
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  billingAddress: {
    street: String,
    city: String,
    pincode: String
  },
  installationAddress: {
    street: String,
    city: String,
    pincode: String
  },
  customFields: [{
    key: { type: String },
    value: { type: String }
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
