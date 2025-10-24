// models/Client.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAddress {
  tag: string;
  address: string;
}

export interface IClient extends Document {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  addresses?: IAddress[];
  customFields?: {
    key: string;
    value: string;
  }[];
}

const ClientSchema: Schema<IClient> = new Schema({
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
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