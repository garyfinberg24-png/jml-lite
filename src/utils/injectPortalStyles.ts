// Inject Portal Styles for Fluent UI v9
// Fixes floating backgrounds on portal components (Dropdown, Dialog, Tooltip, Menu)
// Safe to call multiple times — uses observer ID to prevent duplicates

const STYLE_ID = 'rm-portal-styles';

export function injectPortalStyles(): void {
  // Only inject once
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    /* Fluent UI v9 Portal Fixes for Recruitment Manager */
    .fui-FluentProvider {
      background-color: transparent !important;
    }

    /* Dialog surface */
    .fui-DialogSurface {
      background-color: #ffffff !important;
      box-shadow: 0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108) !important;
      border-radius: 8px !important;
      font-family: "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif !important;
    }

    /* Dialog backdrop */
    .fui-DialogBackdrop {
      background-color: rgba(0, 0, 0, 0.4) !important;
    }

    /* Dropdown / Listbox */
    .fui-Listbox {
      background-color: #ffffff !important;
      border: 1px solid #d1d1d1 !important;
      box-shadow: 0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108) !important;
      border-radius: 4px !important;
      z-index: 1000000 !important;
    }

    .fui-Option {
      font-family: "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif !important;
      font-size: 14px !important;
      padding: 6px 12px !important;
      cursor: pointer !important;
    }

    .fui-Option:hover {
      background-color: #f3f2f1 !important;
    }

    .fui-Option[aria-selected="true"] {
      background-color: #edebe9 !important;
    }

    /* Menu / Popover */
    .fui-MenuPopover,
    .fui-PopoverSurface {
      background-color: #ffffff !important;
      border: 1px solid #d1d1d1 !important;
      box-shadow: 0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108) !important;
      border-radius: 4px !important;
      z-index: 1000000 !important;
    }

    .fui-MenuItem {
      font-family: "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif !important;
      font-size: 14px !important;
    }

    /* Tooltip */
    .fui-Tooltip {
      z-index: 1000001 !important;
    }

    /* Override SharePoint global table th/td border and underline styles */
    .fui-FluentProvider th,
    .fui-FluentProvider td,
    [data-rm-ready] th,
    [data-rm-ready] td {
      border: none !important;
      text-decoration: none !important;
      background-image: none !important;
      box-shadow: none !important;
    }

    /* Re-apply our row bottom borders */
    .fui-FluentProvider tr[class*="row"],
    [data-rm-ready] tr[class*="row"] {
      border-bottom: 1px solid #edebe9 !important;
    }

    .fui-FluentProvider tr[class*="row"]:last-child,
    [data-rm-ready] tr[class*="row"]:last-child {
      border-bottom: none !important;
    }

    /* Re-apply our thead bottom accent border */
    .fui-FluentProvider thead[class*="tableHeader"],
    [data-rm-ready] thead[class*="tableHeader"] {
      border-bottom: 2px solid #005BAA !important;
    }

    /* SharePoint social bar / footer hiding */
    [data-sp-feature-tag="SocialBar"],
    .pageComments,
    .ms-CommentsWrapper,
    #CommentsWrapper,
    .od-SuiteHeader-comments,
    #sp-pageFooter,
    [data-automation-id="pageFooter"] {
      display: none !important;
    }
  `;

  document.head.appendChild(styleEl);
}

export function removePortalStyles(): void {
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) {
    styleEl.remove();
  }
}

export function usePortalStyles(): void {
  injectPortalStyles();
}
