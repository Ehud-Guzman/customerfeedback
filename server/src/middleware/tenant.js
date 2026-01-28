import { prisma } from "../lib/prisma.js";
import { fail } from "../lib/http.js";

function normalizeHeader(v) {
  if (Array.isArray(v)) return v[0];
  if (v == null) return null;
  return String(v).trim();
}

function isValidKey(v) {
  return typeof v === "string" && /^[a-zA-Z0-9_-]{2,64}$/.test(v);
}

const MEM_CACHE = new Map();
const TTL_MS = 30_000;

function cacheGet(key) {
  const hit = MEM_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    MEM_CACHE.delete(key);
    return null;
  }
  return hit.data;
}
function cacheSet(key, data, ttl = TTL_MS) {
  MEM_CACHE.set(key, { data, exp: Date.now() + ttl });
  return data;
}

async function getUserDb(userId) {
  const key = `u:${userId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const u = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, email: true, role: true, isActive: true, memberships: { select: { orgId: true, role: true, isActive: true } } },
  });
  return cacheSet(key, u);
}

async function resolveOrgByIdOrCode(orgKey) {
  const key = `o:${orgKey}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const org = await prisma.organization.findFirst({
    where: { OR: [{ id: String(orgKey) }, { code: String(orgKey) }] },
    select: { id: true, code: true, name: true, isActive: true },
  });

  return cacheSet(key, org);
}

export async function tenantContext(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return fail(res, 401, "Unauthenticated");

    const userDb = await getUserDb(userId);
    if (!userDb || !userDb.isActive) return fail(res, 401, "User not found or inactive");

    req.role = userDb.role;
    req.userEmail = userDb.email;

    // SYSTEM_ADMIN can operate platform-wide, but can also pick a tenant via header.
    if (userDb.role === "SYSTEM_ADMIN") {
      const headerOrgKey =
        normalizeHeader(req.headers["x-org-id"]) ||
        normalizeHeader(req.headers["x-organization-id"]) ||
        normalizeHeader(req.headers["x-tenant-id"]) ||
        null;

      if (!headerOrgKey) {
        req.orgId = null;
        req.org = null;
        return next();
      }

      if (!isValidKey(headerOrgKey)) return fail(res, 400, "Invalid X-Org-Id");

      const org = await resolveOrgByIdOrCode(headerOrgKey);
      if (!org) return fail(res, 404, "Organization not found");
      if (!org.isActive) return fail(res, 403, "Organization inactive");

      req.orgId = org.id;
      req.org = org;
      return next();
    }

    // Non-system users must have membership; allow header override only if they are member (optional hardening).
    const headerOrgKey = normalizeHeader(req.headers["x-org-id"]) || null;

    let org = null;
    if (headerOrgKey) {
      if (!isValidKey(headerOrgKey)) return fail(res, 400, "Invalid X-Org-Id");
      org = await resolveOrgByIdOrCode(headerOrgKey);
    } else {
      // default: first active membership (simple template)
      const m = (userDb.memberships || []).find((m) => m.isActive);
      if (m) org = await prisma.organization.findUnique({ where: { id: m.orgId }, select: { id: true, code: true, name: true, isActive: true } });
    }

    if (!org) return fail(res, 403, "Tenant required. Select an organization.");
    if (!org.isActive) return fail(res, 403, "Organization inactive");

    // ensure membership
    const isMember = (userDb.memberships || []).some((m) => m.orgId === org.id && m.isActive);
    if (!isMember) return fail(res, 403, "Not a member of this organization");

    req.orgId = org.id;
    req.org = org;

    // membership role can override base role inside org
    const membership = (userDb.memberships || []).find((m) => m.orgId === org.id && m.isActive);
    req.orgRole = membership?.role || userDb.role;

    return next();
  } catch (err) {
    console.error("TENANT CONTEXT ERROR:", err);
    return fail(res, 500, "Server error");
  }
}

export function requireTenant(req, res, next) {
  if (!req.orgId) return fail(res, 403, "Tenant required", "TENANT_REQUIRED");
  return next();
}
