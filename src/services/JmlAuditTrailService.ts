// Audit Trail Service — Activity Logging for Recruitment Manager

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { RM_LISTS } from '../constants/SharePointListNames';

export interface IAuditEntry {
  Id?: number;
  Action: string;
  EntityType: string;
  EntityId?: number;
  EntityTitle?: string;
  Details?: string;
  PerformedById?: number;
  PerformedByName?: string;
  Timestamp?: Date;
}

export class RmAuditTrailService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  /** Fire-and-forget audit entry — never throws */
  public logEntry(entry: Partial<IAuditEntry>): void {
    this.sp.web.lists.getByTitle(RM_LISTS.AUDIT_TRAIL).items.add({
      Title: entry.Action || 'Action',
      Action: entry.Action,
      EntityType: entry.EntityType,
      EntityId: entry.EntityId,
      EntityTitle: entry.EntityTitle,
      Details: entry.Details,
    }).catch(() => {}); // Fire-and-forget
  }

  public async getAuditLog(filters?: {
    entityType?: string;
    entityId?: number;
    top?: number;
  }): Promise<IAuditEntry[]> {
    try {
      let filterParts: string[] = [];
      if (filters?.entityType) filterParts.push(`EntityType eq '${filters.entityType}'`);
      if (filters?.entityId) filterParts.push(`EntityId eq ${filters.entityId}`);

      const query = this.sp.web.lists.getByTitle(RM_LISTS.AUDIT_TRAIL).items
        .select('Id', 'Title', 'Action', 'EntityType', 'EntityId', 'EntityTitle', 'Details', 'Created', 'Author/Title')
        .expand('Author')
        .orderBy('Created', false)
        .top(filters?.top || 100);

      if (filterParts.length > 0) {
        query.filter(filterParts.join(' and '));
      }

      const items = await query();
      return items.map((item: any) => ({
        Id: item.Id,
        Action: item.Action,
        EntityType: item.EntityType,
        EntityId: item.EntityId,
        EntityTitle: item.EntityTitle,
        Details: item.Details,
        PerformedByName: item.Author?.Title,
        Timestamp: item.Created ? new Date(item.Created) : undefined,
      }));
    } catch (error) {
      console.error('[RmAuditTrailService] Error getting audit log:', error);
      return [];
    }
  }
}
