import type { NextFunction, Request, Response } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { timingSafeEqual } from "node:crypto";
import type { AuthUser } from "@shared/routes";

declare module "express-session" {
  interface SessionData {
    user?: AuthUser;
  }
}

const DEFAULT_BASIC_EMAIL = "admin@ikioledlighting.com";
const DEFAULT_BASIC_NAME = "IKIO Admin";
const DEFAULT_BASIC_PASSWORD = "LeadSync@123";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SessionStore = createMemoryStore(session);

function parseCsvEnv(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function safeTextMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function buildDisplayName(email: string): string {
  const localPart = email.split("@")[0] || "user";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

function shouldTrustProxy(): boolean {
  if (!isProductionEnvironment()) {
    return false;
  }

  const rawValue = process.env.TRUST_PROXY?.trim().toLowerCase();
  return rawValue !== "false" && rawValue !== "0" && rawValue !== "off";
}

const authConfig = {
  basicEmail: normalizeEmail(process.env.AUTH_BASIC_EMAIL || DEFAULT_BASIC_EMAIL),
  basicName: process.env.AUTH_BASIC_NAME?.trim() || DEFAULT_BASIC_NAME,
  basicPassword: process.env.AUTH_BASIC_PASSWORD || DEFAULT_BASIC_PASSWORD,
  companyPassword: process.env.AUTH_COMPANY_PASSWORD || process.env.AUTH_BASIC_PASSWORD || DEFAULT_BASIC_PASSWORD,
  allowedDomains: parseCsvEnv(process.env.AUTH_ALLOWED_DOMAINS || "ikioledlighting.com"),
  allowedEmails: parseCsvEnv(process.env.AUTH_ALLOWED_EMAILS),
};

function isCompanyEmailAllowed(email: string): boolean {
  if (authConfig.allowedEmails.includes(email)) {
    return true;
  }

  return authConfig.allowedDomains.some((domain) => email.endsWith(`@${domain}`));
}

export function authenticateUser(email: string, password: string): AuthUser | null {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (
    normalizedEmail === authConfig.basicEmail &&
    safeTextMatch(trimmedPassword, authConfig.basicPassword)
  ) {
    return {
      email: normalizedEmail,
      name: authConfig.basicName,
      provider: "basic",
      role: "admin",
    };
  }

  if (
    authConfig.companyPassword &&
    isCompanyEmailAllowed(normalizedEmail) &&
    safeTextMatch(trimmedPassword, authConfig.companyPassword)
  ) {
    return {
      email: normalizedEmail,
      name: buildDisplayName(normalizedEmail),
      provider: "company",
      role: normalizedEmail === authConfig.basicEmail ? "admin" : "member",
    };
  }

  return null;
}

export function getSessionMiddleware() {
  const isProduction = isProductionEnvironment();
  const trustProxy = shouldTrustProxy();

  return session({
    secret: process.env.SESSION_SECRET || "lead-sync-session-secret",
    proxy: trustProxy,
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({
      checkPeriod: SESSION_MAX_AGE_MS,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction ? "auto" : false,
      maxAge: SESSION_MAX_AGE_MS,
    },
  });
}

export function shouldEnableProxyTrust(): boolean {
  return shouldTrustProxy();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  return next();
}

export function getSessionUser(req: Request): AuthUser | null {
  return req.session.user || null;
}

export async function establishSession(req: Request, user: AuthUser): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  req.session.user = user;

  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function destroySession(req: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
