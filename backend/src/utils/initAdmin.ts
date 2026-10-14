import { User } from '../models/User';

export const ensureAdminUser = async (): Promise<void> => {
  try {
    const adminEmail = 'admin@skillforge.com';
    let admin = await User.findOne({
      $or: [{ email: adminEmail }, { email: 'admin' }, { role: 'admin' }],
    }).select('+password');

    if (!admin) {
      admin = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
      });
      console.log('[Auth] Default administrator initialized: admin / admin123');
    } else {
      // Ensure role is admin
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        await admin.save();
      }
      // Ensure password is admin123
      const isMatch = await admin.comparePassword('admin123');
      if (!isMatch) {
        admin.password = 'admin123';
        await admin.save();
        console.log('[Auth] Administrator credentials verified (admin / admin123)');
      }
    }

    // Ensure existing bookings have attendanceStatus defaulted
    const { Booking } = await import('../models/Booking');
    await Booking.updateMany(
      { attendanceStatus: { $nin: ['PRESENT', 'ABSENT', 'PENDING'] } },
      { $set: { attendanceStatus: 'PENDING' } }
    );
  } catch (error: any) {
    console.error('[Auth] Failed to initialize default admin account:', error.message);
  }
};
