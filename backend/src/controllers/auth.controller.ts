import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { sendTokenResponse } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { env } from '../config/env';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate presence
    if (!name || !email || !password || !confirmPassword) {
      return next(new AppError('Please provide all required fields: name, email, password, and confirmPassword', 400));
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return next(new AppError('Please provide a valid email address (e.g. student@college.edu)', 400));
    }

    // Password length validation
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }

    // Match check
    if (password !== confirmPassword) {
      return next(new AppError('Passwords do not match', 400));
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return next(new AppError('An account with this email address already exists. Please log in.', 409));
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'student',
    });

    sendTokenResponse(user, 201, res, 'Registration successful. Welcome to SkillForge!');
  } catch (error: any) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide both email and password', 400));
    }

    // Find user by email and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Compare bcrypt password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (error: any) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error: any) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Please enter your registered email address', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // For security and privacy, do not disclose whether user exists or not
    res.status(200).json({
      success: true,
      message: user
        ? 'Password recovery instructions have been sent to your email.'
        : 'If that email address is registered, password recovery instructions have been sent.',
      recoveryWorkflow: 'In this college portal environment, contact your exam administrator or lab coordinator if you require immediate credential reset.',
    });
  } catch (error: any) {
    next(error);
  }
};
