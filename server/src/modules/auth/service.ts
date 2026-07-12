import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/error-handler.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens.js";
import type { z } from "zod";
import type { registerSchema, loginSchema } from "./schema.js";

function toAuthResponse(user: {
  id: string;
  name: string;
  email: string;
  role: any;
  departmentId: string | null;
  tourCompletedAt: Date | null;
}) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, departmentId: user.departmentId });
  const refreshToken = signRefreshToken(user.id);
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      tourCompletedAt: user.tourCompletedAt,
    },
  };
}

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "email_taken", "An account with this email already exists.", { email: "Entered email is already registered." });
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, departmentId: input.departmentId, role: "employee" },
  });
  return toAuthResponse(user);
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new AppError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  return toAuthResponse(user);
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new AppError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
  }
  return toAuthResponse(user);
}
