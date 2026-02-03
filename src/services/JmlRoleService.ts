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
  jmlreporting: JmlRole.Manager,
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
    // TODO: Revert to JmlRole.User once JML Admin / JML Manager SP groups are provisioned
    return JmlRole.Admin;
  } catch (error) {
    // Default to Admin during development — tighten once SP groups are provisioned
    console.warn('[JmlRoleService] Role detection failed, defaulting to Admin:', error);
    return JmlRole.Admin;
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
