import { describe, it, expect } from "vitest";
import { WorkspaceRole } from "@prisma/client";
import { roleCanEdit, roleCanAdmin, pickHigherRole } from "@/lib/roles";

// Owner/Admin/Member/Observer/Guest permission matrix (RBAC, Phase 3).
describe("authz role helpers", () => {
  const cases: Array<[WorkspaceRole, boolean, boolean]> = [
    // role, canEdit, canAdmin
    [WorkspaceRole.OWNER, true, true],
    [WorkspaceRole.ADMIN, true, true],
    [WorkspaceRole.MEMBER, true, false],
    [WorkspaceRole.GUEST, false, false],
    [WorkspaceRole.OBSERVER, false, false],
  ];

  it.each(cases)("role %s → canEdit=%s canAdmin=%s", (role, canEdit, canAdmin) => {
    expect(roleCanEdit(role)).toBe(canEdit);
    expect(roleCanAdmin(role)).toBe(canAdmin);
  });

  it("null/undefined have no permissions", () => {
    expect(roleCanEdit(null)).toBe(false);
    expect(roleCanEdit(undefined)).toBe(false);
    expect(roleCanAdmin(null)).toBe(false);
    expect(roleCanAdmin(undefined)).toBe(false);
  });

  it("only OWNER/ADMIN can administer", () => {
    const admins = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];
    for (const r of Object.values(WorkspaceRole)) {
      expect(roleCanAdmin(r)).toBe(admins.includes(r));
    }
  });

  it("pickHigherRole picks the strongest effective role", () => {
    // workspace MEMBER + board ADMIN → ADMIN (board sharing elevates)
    expect(pickHigherRole(WorkspaceRole.MEMBER, WorkspaceRole.ADMIN)).toBe(WorkspaceRole.ADMIN);
    // OBSERVER + null → OBSERVER
    expect(pickHigherRole(WorkspaceRole.OBSERVER, null)).toBe(WorkspaceRole.OBSERVER);
    // all null → OBSERVER (safe default)
    expect(pickHigherRole(null, null)).toBe(WorkspaceRole.OBSERVER);
    // OWNER beats everything
    expect(pickHigherRole(WorkspaceRole.OWNER, WorkspaceRole.MEMBER, WorkspaceRole.OBSERVER)).toBe(WorkspaceRole.OWNER);
  });
});
