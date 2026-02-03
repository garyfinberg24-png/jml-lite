// SharePoint Overrides for Recruitment Manager
// Full-bleed layout and SharePoint chrome hiding

const GLOBAL_STYLE_ID = 'rm-global-overrides';
const EMBEDDED_STYLE_ID = 'rm-embedded-mode';

function shouldShowSharePointChrome(): boolean {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('env') === 'full';
}

export function injectSharePointOverrides(): void {
  if (typeof document === 'undefined') return;

  if (!document.getElementById(GLOBAL_STYLE_ID)) {
    const globalStyle = document.createElement('style');
    globalStyle.id = GLOBAL_STYLE_ID;
    globalStyle.textContent = `
      /* Recruitment Manager Global Overrides */

      /* Full-bleed canvas */
      .CanvasZone,
      [class*="CanvasZone"],
      .CanvasSection,
      [class*="CanvasSection"],
      .ControlZone,
      [class*="ControlZone"],
      .CanvasZoneContainer,
      [class*="CanvasZoneContainer"] {
        overflow: visible !important;
        max-width: none !important;
      }

      [data-sp-web-part],
      .webPartContainer,
      [class*="webPartContainer"] {
        overflow: visible !important;
      }

      .CanvasZone > div {
        max-width: 100% !important;
      }

      /* Hide SharePoint social bar */
      [data-sp-feature-tag="SocialBar"]:not(.ms-Panel *):not(.ms-Layer *),
      .pageComments:not(.ms-Panel *):not(.ms-Layer *),
      .ms-CommentsWrapper:not(.ms-Panel *):not(.ms-Layer *),
      #CommentsWrapper:not(.ms-Panel *):not(.ms-Layer *),
      [data-automation-id="pageFooter"]:not(.ms-Panel *):not(.ms-Layer *),
      #sp-pageFooter:not(.ms-Panel *):not(.ms-Layer *) {
        display: none !important;
      }
    `;
    document.head.appendChild(globalStyle);
  }

  if (!shouldShowSharePointChrome() && !document.getElementById(EMBEDDED_STYLE_ID)) {
    const embeddedStyle = document.createElement('style');
    embeddedStyle.id = EMBEDDED_STYLE_ID;
    embeddedStyle.textContent = `
      /* Embedded mode — hide SharePoint chrome for app-like experience */
      #SuiteNavPlaceHolder,
      [class*="SuiteNav"],
      .ms-HubNav,
      [class*="HubNav"],
      #spSiteHeader,
      [data-automationid="SiteHeader"],
      [class*="siteHeader"],
      [class*="SiteHeader"],
      .ms-siteHeader-container,
      #spCommandBar,
      .sp-appBar,
      [class*="appBar"],
      #sp-appBar,
      .ms-FocusZone[role="navigation"],
      [data-automationid="pageHeader"],
      .ms-compositeHeader,
      [class*="compositeHeader"],
      [class*="titleRow"],
      [class*="TitleRow"],
      #SuiteNavWrapper,
      .o365cs-nav-container,
      [class*="o365cs-nav"],
      .od-TopBar,
      [class*="TopBar"],
      .ms-siteHeader,
      div[class*="titleRegion"],
      div[class*="TitleRegion"],
      #spLeftNav,
      [class*="leftNav"],
      [class*="LeftNav"],
      .ms-Nav,
      [data-automationid="VerticalNav"] {
        display: none !important;
      }

      #workbenchPageContent,
      [class*="workbenchPageContent"],
      .SPCanvas,
      [class*="SPCanvas"],
      .CanvasZone,
      [class*="mainContent"] {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }

      body {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }

      .CanvasZone,
      [class*="CanvasZone"] {
        min-height: 100vh !important;
      }
    `;
    document.head.appendChild(embeddedStyle);
  }
}

export function removeSharePointOverrides(): void {
  [GLOBAL_STYLE_ID, EMBEDDED_STYLE_ID].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

export function signalAppReady(): void {
  if (typeof document === 'undefined') return;
  const webPartContainers = document.querySelectorAll('[data-sp-web-part] > div');
  webPartContainers.forEach((el) => {
    el.setAttribute('data-rm-ready', 'true');
  });
}
