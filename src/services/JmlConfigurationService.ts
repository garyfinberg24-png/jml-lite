// Configuration Service — Key-Value Settings for Recruitment Manager

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { RM_LISTS } from '../constants/SharePointListNames';

export interface IConfigEntry {
  Id?: number;
  ConfigKey: string;
  ConfigValue: string;
  Category: string;
  IsActive: boolean;
}

export class RmConfigurationService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  public async getValue(key: string): Promise<string | null> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.CONFIGURATION).items
        .filter(`ConfigKey eq '${key}' and IsActive eq 1`)
        .select('ConfigValue')
        .top(1)();
      return items.length > 0 ? items[0].ConfigValue : null;
    } catch {
      return null;
    }
  }

  public async setValue(key: string, value: string, category: string = 'General'): Promise<boolean> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.CONFIGURATION).items
        .filter(`ConfigKey eq '${key}'`)
        .select('Id')
        .top(1)();

      if (items.length > 0) {
        await this.sp.web.lists.getByTitle(RM_LISTS.CONFIGURATION).items.getById(items[0].Id).update({
          ConfigValue: value,
          Category: category,
          IsActive: true,
        });
      } else {
        await this.sp.web.lists.getByTitle(RM_LISTS.CONFIGURATION).items.add({
          ConfigKey: key,
          ConfigValue: value,
          Category: category,
          IsActive: true,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  public async getByCategory(category: string): Promise<IConfigEntry[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.CONFIGURATION).items
        .filter(`Category eq '${category}' and IsActive eq 1`)
        .select('Id', 'ConfigKey', 'ConfigValue', 'Category', 'IsActive')
        .getAll();
      return items;
    } catch {
      return [];
    }
  }
}
