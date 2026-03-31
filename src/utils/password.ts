import bcrypt from "bcrypt";

const comparePassword = (plainText: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(plainText, passwordHash);
};

export { comparePassword };
