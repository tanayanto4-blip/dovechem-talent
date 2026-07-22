import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Static RBAC audit: every admin server function must be guarded by
 * requireStaff or requireAdmin. Denials must return HTTP 403 and be
 * written to public.audit_logs.
 */

const ADMIN_FILES = [
  "src/lib/admin.functions.ts",
  "src/lib/users.functions.ts",
];

const PUBLIC_ALLOWLIST = new Set([
  // Public bootstrap surface — safe by design (only works when no admin exists).
  "bootstrapStatus",
  "createBootstrapAdmin",
  // Session-only helpers that only need an authenticated user, not staff role.
  "claimFirstAdmin",
  "getMyRoles",
]);

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("RBAC enforcement on admin endpoints", () => {
  it("every admin server function is guarded by requireStaff or requireAdmin", () => {
    const unguarded: string[] = [];
    for (const file of ADMIN_FILES) {
      const src = read(file);
      const re = /export const (\w+)\s*=\s*createServerFn\(\{[^}]*\}\)([\s\S]*?)\.handler\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const name = m[1];
        const chain = m[2];
        if (PUBLIC_ALLOWLIST.has(name)) continue;
        const guarded =
          /\.middleware\(\[[^\]]*\brequireStaff\b/.test(chain) ||
          /\.middleware\(\[[^\]]*\brequireAdmin\b/.test(chain);
        if (!guarded) unguarded.push(`${file} :: ${name}`);
      }
    }
    expect(unguarded, `Unguarded admin endpoints: ${unguarded.join(", ")}`).toEqual([]);
  });

  it("staff middleware denies with HTTP 403 and writes an audit log entry", () => {
    const src = read("src/lib/staff-middleware.ts");
    // Must throw a Response with status 403 (not a plain Error).
    expect(src).toMatch(/throw new Response\(/);
    expect(src).toMatch(/status:\s*403/);
    // Must record the denial to audit_logs via the service-role client.
    expect(src).toMatch(/from\(["']audit_logs["']\)/);
    expect(src).toMatch(/admin\.access\.denied/);
    expect(src).toMatch(/client\.server/);
  });
});
