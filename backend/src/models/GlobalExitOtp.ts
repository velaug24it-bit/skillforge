import mongoose, { Document, Schema } from 'mongoose';

export interface IGlobalExitOtp extends Document {
  otp: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpGeneratedAt: Date;
  generatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const globalExitOtpSchema = new Schema<IGlobalExitOtp>(
  {
    otp: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    otpGeneratedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const GlobalExitOtp = mongoose.model<IGlobalExitOtp>('GlobalExitOtp', globalExitOtpSchema);
