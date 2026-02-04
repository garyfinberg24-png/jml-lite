// JML Lite Role Service
// 3-tier RBAC: User < Manager < Admin
// Detects role via SharePoint group membership

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import '@pnp/sp/site-groups';

export enum JmlRole {
  User = 'User',
  Manager = 'Manager',
  Admin = 'Admin'
}

const ROLE_LEVEL: Record<JmlRole, number> = {
  [JmlRole.User]: 0,
  [JmlRole.Manager]: 1,
  [JmlRole.Admin]: 2,
};

const NAV_MIN_ROLE: Record<string, JmlRole> = {
  dashboard: JmlRole.User,
  myonboarding: JmlRole.User,
  search: JmlRole.User,
  help: JmlRole.User,
  onboarding: JmlRole.Manager,
  mover: JmlRole.Manager,
  offboarding: JmlRole.Manager,
  approvals: JmlRole.Manager,
  taskmanager: JmlRole.Manager,
  jmlreporting: JmlRole.Manager,
  analytics: JmlRole.Manager,
  admin: JmlRole.Admin,
};

export interface IHeaderVisibility {
  showSearch: boolean;
  showNotifications: boolean;
  showHelp: boolean;
  showAdmin: boolean;
}

export async function detectUserRole(sp: SPFI): Promise<JmlRole> {
  try {
    const currentUser = await sp.web.currentUser();
    const groups = await sp.web.siteUsers.getById(currentUser.Id).groups();
    const groupTitles = groups.map((g: { Title: string }) => g.Title.toLowerCase());

    if (groupTitles.some((t: string) => t.includes('jml admin'))) {
      return JmlRole.Admin;
    }
    if (groupTitles.some((t: string) => t.includes('jml manager'))) {
      return JmlRole.Manager;
    }
    // Default to User (least privilege) - users must be added to JML Manager/Admin groups for elevated access
    return JmlRole.User;
  } catch (error) {
    // SECURITY: Default to least privilege on any error
    // Never grant elevated access when role detection fails
    console.warn('[JmlRoleService] Role detection failed, defaulting to User (least privilege):', error);
    return JmlRole.User;
  }
}

export function hasMinimumRole(current: JmlRole, required: JmlRole): boolean {
  return ROLE_LEVEL[current] >= ROLE_LEVEL[required];
}

export function filterNavForRole(role: JmlRole): string[] {
  return Object.keys(NAV_MIN_ROLE).filter(key =>
    hasMinimumRole(role, NAV_MIN_ROLE[key])
  );
}

export function getHeaderVisibility(role: JmlRole): IHeaderVisibility {
  return {
    showSearch: true,
    showNotifications: true,
    showHelp: true,
    showAdmin: role === JmlRole.Admin,
  };
}
