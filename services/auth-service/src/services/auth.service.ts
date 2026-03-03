import { db } from "@/db";
import { userCredentials } from "@/models/user-creds.schema";
import { refreshToken } from "@/models/refresh-token.schema";
import {
  AuthResponse,
  AuthTokens,
  LoginInput,
  RegisterInput,
} from "@/types/auth.types";

import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/utils/jwt";

import { HttpError } from "@ecommerce-platform/common";
import logger from "@/utils/logger";
import { and, eq } from "drizzle-orm";

const REFRESH_TOKEN_TTL_DAYS = 7;

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const existingUser = await db.query.userCredentials.findFirst({
    where: (credentials, { eq }) => eq(credentials.email, input.email),
  });
  if (existingUser) {
    throw new HttpError(409, "User with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(userCredentials)
      .values({
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      })
      .returning();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const [tokenRecord] = await tx
      .insert(refreshToken)
      .values({
        userId: user.id,
        expiresAt,
      })
      .returning();

    return {
      user,
      tokenRecord,
    };
  });

  const accessToken = signAccessToken({
    email: result.user.email,
    userId: result.user.id,
    role: result.user.role,
    authMethod: "credentials",
  });
  const refreshTokenSigned = signRefreshToken({
    userId: result.user.id,
    tokenId: result.tokenRecord.token_id as string,
  });

  logger.info({ userId: result.user.id }, "User registered successfully");

  // TODO: publish user.registered event to Kafka when messaging is set up
  // publishUserRegistered({ id, email, displayName, createdAt })

  return {
    accessToken,
    refreshToken: refreshTokenSigned,
    user: {
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName!,
      createdAt: result.user.createdAt,
    },
  };
};

export const login = async (input: LoginInput): Promise<AuthTokens> => {
  const credentials = await db.query.userCredentials.findFirst({
    where: (credentials, { eq }) => eq(credentials.email, input.email),
  });

  if (!credentials) {
    throw new HttpError(401, "Invalid credentials");
  }

  const passwordValid = await verifyPassword(
    input.password,
    credentials.passwordHash,
  );
  if (!passwordValid) {
    throw new HttpError(401, "Invalid credentiasls");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  const [tokenRecord] = await db
    .insert(refreshToken)
    .values({
      userId: credentials.id,
      expiresAt,
    })
    .returning();

  const accessToken = signAccessToken({
    userId: credentials.id,
    email: credentials.email,
    role: credentials.role,
    authMethod: "credentials",
  });

  const refreshTokenSigned = signRefreshToken({
    userId: credentials.id,
    tokenId: tokenRecord.token_id,
  });

  logger.info({ userId: credentials.id }, "User logged in successfully");

  return {
    accessToken,
    refreshToken: refreshTokenSigned,
  };
};

export const refreshTokens = async (token: string): Promise<AuthTokens> => {
  const payload = verifyRefreshToken(token);

  const tokenRecord = await db.query.refreshToken.findFirst({
    where: and(
      eq(refreshToken.token_id, payload.tokenId),
      eq(refreshToken.userId, payload.userId),
    ),
  });

  if (!tokenRecord) {
    throw new HttpError(401, "Invalid refresh token");
  }

  if (tokenRecord.isRevoked) {
    await db
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.userId, payload.userId));

    logger.warn(
      { userId: payload.userId },
      "Refresh token reuse detected — all tokens revoked",
    );
    throw new HttpError(401, "Invalid refresh token");
  }

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    await db
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.token_id, payload.tokenId));

    throw new HttpError(401, "Refresh token has expired");
  }

  const user = await db.query.userCredentials.findFirst({
    where: eq(userCredentials.id, payload.userId),
  });

  if (!user) {
    logger.warn({ userId: payload.userId }, "User missing for refresh token");
    throw new HttpError(401, "Invalid refresh token");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  const newTokenRecord = await db.transaction(async (tx) => {
    await tx
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.token_id, tokenRecord.token_id));

    const [newRecord] = await tx
      .insert(refreshToken)
      .values({
        userId: user.id,
        expiresAt,
      })
      .returning();

    return newRecord;
  });

  logger.info({ userId: user.id }, "Tokens refreshed successfully");

  return {
    accessToken: signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      authMethod: "refresh",
    }),
    refreshToken: signRefreshToken({
      userId: user.id,
      tokenId: newTokenRecord.token_id,
    }),
  };
};

export const revokeRefreshTokens = async (userId: string) => {
  await db
    .update(refreshToken)
    .set({ isRevoked: true })
    .where(eq(refreshToken.userId, userId));
};
