import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthUser } from "@shared/routes";

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthUser | null;
  }
}

const DEFAULT_BASIC_EMAIL = "admin@ikioledlighting.com";
const DEFAULT_BASIC_NAME = "IKIO Admin";
const DEFAULT_BASIC_PASSWORD = "LeadSync@123";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "ikio_auth";

type SessionPayload = {
  user: AuthUser;
  expiresAt: number;
};

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

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "lead-sync-session-secret";
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

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signValue(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodeSessionCookie(payload: SessionPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(body);
  return `${body}.${signature}`;
}

function decodeSessionCookie(value: string): SessionPayload | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = signValue(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as SessionPayload;
    if (!parsed?.user || !parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""];
        }

        return [part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))];
      }),
  );
}

function serializeCookie(name: string, value: string, maxAgeMs: number): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];

  if (isProductionEnvironment()) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearCookie(name: string): string {
  const attributes = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (isProductionEnvironment()) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function getSessionMiddleware(): RequestHandler {
  return (req, _res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionValue = cookies[SESSION_COOKIE_NAME];
    req.authUser = sessionValue ? decodeSessionCookie(sessionValue)?.user || null : null;
    next();
  };
}

export function shouldEnableProxyTrust(): boolean {
  return shouldTrustProxy();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    return res.status(401).json({ message: "Authentication required" });
  }

  return next();
}

export function getSessionUser(req: Request): AuthUser | null {
  return req.authUser || null;
}

export async function establishSession(req: Request, user: AuthUser): Promise<void> {
  const payload: SessionPayload = {
    user,
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  };

  const header = serializeCookie(SESSION_COOKIE_NAME, encodeSessionCookie(payload), SESSION_MAX_AGE_MS);
  req.authUser = user;
  req.res?.append("Set-Cookie", header);
}

export async function destroySession(req: Request): Promise<void> {
  req.authUser = null;
  req.res?.append("Set-Cookie", clearCookie(SESSION_COOKIE_NAME));
}
