// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the structure of a User document
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Password is optional on the interface because it won't always be sent back
  role: 'Admin' | 'Sales' | 'Technician';
  isActive: boolean;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // IMPORTANT: This prevents the password from being sent in queries by default
  },
  role: {
    type: String,
    enum: ['Admin', 'Management'],
    default: 'Management',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// This is a 'pre-save hook'. Before a user is saved, this function will run.
// We use it to automatically hash the password.
UserSchema.pre<IUser>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err: any) {
    return next(err);
  }
});

// This adds a method to the user model to easily compare passwords
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);