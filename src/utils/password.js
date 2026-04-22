import bcrypt from "bcryptjs";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword() {
  const random = Math.random().toString(36).slice(-6);
  return `Mon@${random}9`;
}
