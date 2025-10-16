import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// 1. Define the Role type once to be used in both the interface and schema
export type UserRole = 'Admin' | 'Management';

// Define the structure of a User document
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional because it's not always selected from the DB
  role: UserRole; // Use the shared type
  isActive: boolean;
  comparePassword(password: string): Promise<boolean>; // Custom method
}

const UserSchema: Schema<IUser> = new Schema({
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
    select: false, // Prevents password from being sent in queries by default
  },
  role: {
    type: String,
    enum: ['Admin', 'Management'], // Matches the UserRole type
    default: 'Management',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Pre-save hook to automatically hash the password
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    // 2. Type the catch block error correctly
    if (error instanceof Error) {
        return next(error);
    }
    // Handle cases where the thrown object is not an Error
    return next(new Error('An unknown error occurred during password hashing'));
  }
});

// Method to compare candidate password with the hashed password
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  // `this.password` is available here because we would have explicitly selected it
  return bcrypt.compare(password, this.password);
};

// Prevent Mongoose from recompiling the model in a serverless environment
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;