import { env } from "@/config/env";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";

const ACCESS_TOKEN_SECRET: Secret = env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET: Secret = env.REFRESH_TOKEN_SECRET;

const REFRESH_OPTIONS: SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRATION as SignOptions["expiresIn"],
};
const ACCESS_OPTIONS: SignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRATION as SignOptions["expiresIn"],
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: "admin" | "customer";
  authMethod: "credentials" | "refresh";
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, ACCESS_OPTIONS);
};
export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, REFRESH_OPTIONS);
};

export const verifyRefreshToken = (payload: string): RefreshTokenPayload => {
  return jwt.verify(payload, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
};
