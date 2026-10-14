import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillforge',
  JWT_SECRET: process.env.JWT_SECRET || 'skillforge_dev_secret_key_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JUDGE0_API_URL: process.env.JUDGE0_API_URL || '',
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY || '',
  JUDGE0_API_HOST: process.env.JUDGE0_API_HOST || '',
  CAMPUS_TIMEZONE: process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
