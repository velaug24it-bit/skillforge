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
  questionType?: 'coding' | 'mcq';
  
  // For coding questions
  code?: string;
  language?: string;
  sampleTestPassed?: boolean;
  sampleExecutionOutput?: string;
  testResults?: ITestResult[];

  // For MCQ / Aptitude questions
  selectedOption?: string; // 'A' | 'B' | 'C' | 'D' or empty/null
  correctOption?: string;  // Included in results
  isCorrect?: boolean;
  isNegativeMarked?: boolean;
  explanation?: string;

  questionScore: number; // Can be decimal for aptitude (-0.25, 0, 1.0) or 0-50 for coding
  submittedAt?: Date;
}

export interface IAssessmentAttempt extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  levelId: mongoose.Types.ObjectId;
  levelNumber: number;
  assessmentType: 'coding' | 'aptitude';
  bookingId?: mongoose.Types.ObjectId;
  questionSubmissions: IQuestionSubmission[];
  totalScore: number; // float/number
  maxScore: number; // 40 for aptitude, 100 for coding
  passingScore: number; // 24 for aptitude, 100 for coding
  passed: boolean;
  correctCount?: number;
  wrongCount?: number;
  unattemptedCount?: number;
  negativePenalty?: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'AWAITING_EXIT_VERIFICATION' | 'EXIT_VERIFIED' | 'COMPLETED' | 'EXPIRED';
  startedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  finalSubmittedAt?: Date;
  otpHash?: string;
  otpGeneratedAt?: Date;
  otpExpiresAt?: Date;
  otpStatus?: 'NOT_GENERATED' | 'ACTIVE' | 'EXPIRED' | 'USED' | 'INVALIDATED';
  otpFailedAttempts?: number;
  isExitVerified?: boolean;
  otpVerifiedAt?: Date;
  otpGeneratedBy?: mongoose.Types.ObjectId;
  exitedAt?: Date;
  violationReason?: string;
  isDisqualified?: boolean;
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
    questionId: { type: Schema.Types.ObjectId, required: true },
    questionNumber: { type: Number, required: true },
    questionType: { type: String, enum: ['coding', 'mcq'], default: 'coding' },
    code: { type: String, default: '' },
    language: { type: String },
    sampleTestPassed: { type: Boolean, default: false },
    sampleExecutionOutput: { type: String },
    testResults: [testResultSchema],
    selectedOption: { type: String, default: '' },
    correctOption: { type: String },
    isCorrect: { type: Boolean },
    isNegativeMarked: { type: Boolean },
    explanation: { type: String },
    questionScore: { type: Number, default: 0 },
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
    assessmentType: {
      type: String,
      enum: ['coding', 'aptitude'],
      default: 'coding',
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    questionSubmissions: [questionSubmissionSchema],
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    passingScore: {
      type: Number,
      default: 100,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
    },
    unattemptedCount: {
      type: Number,
      default: 0,
    },
    negativePenalty: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'AWAITING_EXIT_VERIFICATION', 'EXIT_VERIFIED', 'COMPLETED', 'EXPIRED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    finalSubmittedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    otpHash: {
      type: String,
      select: false,
    },
    otpGeneratedAt: {
      type: Date,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpStatus: {
      type: String,
      enum: ['NOT_GENERATED', 'ACTIVE', 'EXPIRED', 'USED', 'INVALIDATED'],
      default: 'NOT_GENERATED',
    },
    otpFailedAttempts: {
      type: Number,
      default: 0,
    },
    isExitVerified: {
      type: Boolean,
      default: false,
    },
    otpVerifiedAt: {
      type: Date,
    },
    otpGeneratedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    exitedAt: {
      type: Date,
    },
    violationReason: {
      type: String,
    },
    isDisqualified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const AssessmentAttempt: Model<IAssessmentAttempt> =
  mongoose.models.AssessmentAttempt ||
  mongoose.model<IAssessmentAttempt>('AssessmentAttempt', assessmentAttemptSchema);