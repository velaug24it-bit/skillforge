import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<boolean> => {
  try {
    if (!env.MONGODB_URI) {
      console.warn('[Database] MONGODB_URI is not defined in environment variables.');
      return false;
    }

    // Configure connection listeners
    mongoose.connection.on('connected', () => {
      console.log(`[Database] Mongoose connected successfully to MongoDB.`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[Database] Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] Mongoose connection disconnected.');
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    return true;
  } catch (error: any) {
    console.warn(`[Database] Unable to connect to MongoDB at "${env.MONGODB_URI.split('@').pop()}": ${error.message}`);
    console.warn('[Database] Backend server running with database in disconnected state. Set a valid MONGODB_URI in backend/.env to connect to MongoDB Atlas or local MongoDB.');
    if (env.isProduction) {
      process.exit(1);
    }
    return false;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Database] Disconnected from MongoDB');
    }
  } catch (error: any) {
    console.error(`[Database] Error disconnecting database: ${error.message}`);
  }
};

export const getDatabaseStatus = () => {
  const state = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[state] || 'unknown',
    connected: state === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};
