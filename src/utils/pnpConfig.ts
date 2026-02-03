// PnP Configuration for Recruitment Manager
// Singleton SPFI instance management

import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import '@pnp/sp/batching';
import '@pnp/sp/site-users/web';

let _sp: SPFI | null = null;

export function initializePnP(context: WebPartContext): SPFI {
  _sp = spfi().using(SPFx(context));
  return _sp;
}

export function getSP(context?: WebPartContext): SPFI {
  if (context) {
    _sp = spfi().using(SPFx(context));
  }

  if (!_sp) {
    throw new Error('PnP SP not initialized. Call getSP(context) first.');
  }

  return _sp;
}
