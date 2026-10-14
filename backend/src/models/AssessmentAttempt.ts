import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITestResult {
  testCaseIndex: number; // 1 to 5
  passed: boolean;
  marksEarned: number; // 0 or 10
  statusDescription: string; // "Passed", "Wrong Answer", "Time Limit Exceeded", "Runtime Error"
  executionTimeMs?: number;
}

export interface IQuestionSubmission {
  questionId: mongoose.Types.ObjectId;
  questionNumber: number;
  code: string;
  language: string;
  sampleTestPassed: boolean;
  sampleExecutionOutput?: string;
  testResults: ITestResult[];
  questionScore: number; // 0 to 50
  submittedAt?: Date;
}

export interface IAssessmentAttempt extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  levelNumber: number;
  bookingId?: mongoose.Types.ObjectId;
  questionSubmissions: IQuestionSubmission[];
  totalScore: number; // 0 to 100
  passed: boolean; // true only if totalScore === 100
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  startedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const testResultSchema = new Schema<ITestResult>(
  {
    testCaseIndex: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    marksEarned: { type: Number, required: true, default: 0 },
    statusDescription: { type: String, required: true },
    executionTimeMs: { type: Number },
  },
  { _id: false }
);

const questionSubmissionSchema = new Schema<IQuestionSubmission>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'CodingQuestion', required: true },
    questionNumber: { type: Number, required: true },
    code: { type: String, default: '' },
    language: { type: String, required: true },
    sampleTestPassed: { type: Boolean, default: false },
    sampleExecutionOutput: { type: String },
    testResults: [testResultSchema],
    questionScore: { type: Number, default: 0, min: 0, max: 50 },
    submittedAt: { type: Date },
  },
  { _id: false }
);

const assessmentAttemptSchema = new Schema<IAssessmentAttempt>(
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
      index: true,
    },
    levelNumber: {
      type: Number,
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    questionSubmissions: [questionSubmissionSchema],
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'],
      default: 'IN_PROGRESS',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AssessmentAttempt: Model<IAssessmentAttempt> =
  mongoose.models.AssessmentAttempt ||
  mongoose.model<IAssessmentAttempt>('AssessmentAttempt', assessmentAttemptSchema);
