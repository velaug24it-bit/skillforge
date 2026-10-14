import mongoose, { Document, Schema, Model } from 'mongoose';

export type BookingStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface IBooking extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  startTime: string; // "09:10"
  endTime: string; // "10:10"
  slotReference: string;
  status: BookingStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    levelId: {
      type: Schema.Types.ObjectId,
      ref: 'AssessmentLevel',
      required: true,
    },
    date: {
      type: String,
      required: true, // Format: YYYY-MM-DD
      index: true,
    },
    startTime: {
      type: String,
      required: true, // e.g. "09:10"
    },
    endTime: {
      type: String,
      required: true, // e.g. "10:10"
    },
    slotReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['BOOKED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
      default: 'BOOKED',
      index: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Unique partial index ensuring a slot cannot be booked by multiple students simultaneously
bookingSchema.index(
  { date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'BOOKED' },
  }
);

export const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);
