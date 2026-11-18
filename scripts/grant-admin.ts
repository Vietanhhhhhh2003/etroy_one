import mongoose from 'mongoose';
import { config } from '../src/config/config.js';
import { userService } from '../src/modules/users/user.service.js';

const email = process.argv[2];
if (!email) throw new Error('Usage: node dist/scripts/grant-admin.js <existing-email>');
try {
  await mongoose.connect(config.infrastructure.mongodb.uri);
  const user = await userService.grantAdminAccess(email);
  process.stdout.write(JSON.stringify({ email: user.email, roles: user.roles }) + '\n');
} finally {
  await mongoose.disconnect();
}
