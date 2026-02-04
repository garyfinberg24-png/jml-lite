# JML Decoupling Blueprint — Extracting a Standalone DWx Application

**Version**: 1.0
**Date**: 1 February 2026
**Author**: Gary Finberg / Claude (AI Assistant)
**Based On**: The successful decoupling of DWx Asset Manager from the JML Monolith
**Purpose**: Reusable step-by-step instructions for Claude to decouple any module from JML into a standalone DWx application

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Understanding the JML Monolith](#2-understanding-the-jml-monolith)
3. [Pre-Decoupling Checklist](#3-pre-decoupling-checklist)
4. [Phase 1: Project Scaffolding](#4-phase-1-project-scaffolding)
5. [Phase 2: Code Extraction from JML](#5-phase-2-code-extraction-from-jml)
6. [Phase 3: Renaming & Decoupling](#6-phase-3-renaming--decoupling)
7. [Phase 4: DWx Standard Components](#7-phase-4-dwx-standard-components)
8. [Phase 5: Styling & Theming](#8-phase-5-styling--theming)
9. [Phase 6: SharePoint List Provisioning](#9-phase-6-sharepoint-list-provisioning)
10. [Phase 7: Build, Package & Deploy](#10-phase-7-build-package--deploy)
11. [Phase 8: Post-Deployment Hardening](#11-phase-8-post-deployment-hardening)
12. [CSS/SCSS Issues & Solutions](#12-cssscss-issues--solutions)
13. [Lessons Learned & Gotchas](#13-lessons-learned--gotchas)
14. [Complete File Inventory](#14-complete-file-inventory)
15. [Template: CLAUDE.md for New App](#15-template-claudemd-for-new-app)

---

## 1. Executive Summary

The JML (Joiner, Mover, Leaver) solution is a monolithic SPFx application containing 32+ webparts spanning employee lifecycle, asset management, policy management, contracts, recruitment, and more. Over time, individual modules have been extracted ("decoupled") into standalone DWx (Digital Workplace Excellence) applications that:

- Run on their own SharePoint site
- Have their own `.sppkg` package
- Use their own SharePoint list prefix (e.g., `AM_`, `PM_`)
- Have no code or runtime dependency on JML
- Follow the DWx Standard UI pattern (Header, Nav, Breadcrumbs, Search, Admin, Help)

### Successfully Decoupled Apps

| App | Prefix | Theme | Webparts | Status |
|-----|--------|-------|----------|--------|
| **Asset Manager** | `AM_` | Slate Blue (#475569) | 1 (single SPA) | Complete |
| **Policy Manager** | `PM_` | Forest Teal (#0d9488) | 14 (multi-page) | Complete |

### Remaining Candidates for Decoupling

| Module | Suggested Prefix | Notes |
|--------|-----------------|-------|
| Recruitment Manager | `RM_` | Talent dashboard, CV management, interviews |
| Contract Manager | `CM_` | Contract lifecycle, procurement |
| Financial Management | `FM_` | Budget tracking, financial reports |
| Training & Skills | `TS_` | Training builder, skills matrix |
| Document Hub | `DH_` | Document management, sharing |

---

## 2. Understanding the JML Monolith

### Location
```
C:\Projects\SPFx\JML_SPO\
```

### Architecture
The JML project uses a **two-package build system** from a single git repository:

```
JML_SPO (git repo)
├── 19 Core webparts (employee lifecycle)
├── 13+ Enterprise webparts (premium modules)
├── 146 shared services
├── 56 shared models
├── 100+ shared components
├── config/config.json (Core bundle — 19 webparts)
└── JML_Enterprise/ (synced build folder)
    └── config/config.json (Enterprise bundle — 13 webparts)
```

### How JML Organizes Multiple Apps

All modules live under one `src/` tree:
- **Services**: `src/services/AssetService.ts`, `src/services/PolicyService.ts`, etc.
- **Models**: `src/models/IAsset.ts`, `src/models/IPolicy.ts`, etc.
- **Components**: `src/components/AssetCheckout.tsx`, `src/components/PolicyHub.tsx`, etc.
- **Webparts**: `src/webparts/jmlAssetDashboard/`, `src/webparts/jmlPolicyHub/`, etc.

### Key Shared Infrastructure in JML

These components are shared across all modules and will NOT be copied directly:

| Component | Purpose | Replacement in Standalone |
|-----------|---------|--------------------------|
| `JmlAppLayout` | Full-page layout wrapper | Create `[App]AppLayout` or use inline layout |
| `JmlAppHeader` | Navigation header | Create `[Prefix]AppHeader` |
| `JmlAppFooter` | Footer | Usually not needed |
| `JmlNavConfig` | Navigation config | Create app-specific nav config |
| `FluentUIStyles.ts` | Shared style tokens | Create `AmPanelStyles.module.scss` |
| `pnpConfig.ts` | PnP SP initialization | Copy as-is (framework utility) |
| `SharePointOverrides.ts` | Hide SP chrome | Copy as-is (framework utility) |
| `injectPortalStyles.ts` | Portal z-index fix | Copy as-is (framework utility) |

---

## 3. Pre-Decoupling Checklist

Before starting, gather this information:

### App Identity
- [ ] **App name** (e.g., "Asset Manager", "Recruitment Manager")
- [ ] **List prefix** (e.g., `AM_`, `RM_`) — 2-3 letter uppercase abbreviation
- [ ] **Theme color** — primary hex color (distinct from existing apps)
- [ ] **SharePoint site URL** — where the app will be deployed
- [ ] **Package name** — npm name (e.g., `dwx-asset-manager`)

### From JML, Identify
- [ ] Which webpart(s) belong to this module
- [ ] Which services this module uses
- [ ] Which models/interfaces this module needs
- [ ] Which SharePoint lists this module reads/writes
- [ ] Whether the module uses Graph API, Azure Functions, or other integrations

### Architecture Decision: Single vs Multi-Page

| Pattern | When to Use | Example |
|---------|------------|---------|
| **Single SPA** (1 webpart) | Module has 5-12 views, all CRUD-based | Asset Manager |
| **Multi-page** (N webparts) | Module has distinct page types (builder, viewer, admin) | Policy Manager (14 webparts) |

**Recommendation**: Start with Single SPA unless the module genuinely needs different page layouts. Asset Manager has 12 views (Dashboard, Registry, Checkout, Licenses, Vendors, Contracts, Requests, Reports, Search, Admin, Help, My Assets) all within one webpart — this is cleaner and simpler to deploy.

---

## 4. Phase 1: Project Scaffolding

### Step 1.1: Create the SPFx Project

```bash
# Navigate to workspace
cd C:\Projects\SPFx\[AppName]\

# Generate SPFx project
yo @microsoft/sharepoint
# Answers:
#   Solution name: [app-name] (e.g., asset-manager)
#   Component type: WebPart
#   WebPart name: Dwx[AppName] (e.g., DwxAssetManager)
#   Framework: React
#   TypeScript: Yes
```

### Step 1.2: Align Dependencies

Update `package.json` to match JML's dependency versions exactly:

```json
{
  "name": "dwx-[app-name]",
  "version": "1.0.0",
  "dependencies": {
    "@fluentui/react": "8.106.4",
    "@fluentui/react-components": "^9.54.0",
    "@fluentui/react-icons": "^2.0.233",
    "@microsoft/sp-core-library": "1.20.0",
    "@microsoft/sp-property-pane": "1.20.0",
    "@microsoft/sp-webpart-base": "1.20.0",
    "@pnp/sp": "^3.25.0",
    "@pnp/graph": "^3.25.0",
    "@pnp/spfx-controls-react": "^3.18.0",
    "date-fns": "^3.6.0",
    "react": "17.0.1",
    "react-dom": "17.0.1",
    "tslib": "2.3.1"
  }
}
```

**Critical**: Use React 17.0.1 (NOT 18) — SPFx 1.20.0 requires React 17.

### Step 1.3: Configure tsconfig.json

Ensure these settings match JML:
```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "lib": ["es5", "dom", "es2015.collection", "es2015.promise"],
    "jsx": "react",
    "strict": false,
    "skipLibCheck": true,
    "noEmitOnError": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  }
}
```

### Step 1.4: Create Directory Structure

```
src/
├── webparts/dwx[AppName]/
│   ├── [AppName]WebPart.ts
│   ├── [AppName]WebPart.manifest.json
│   ├── components/
│   │   ├── [AppName].tsx           # Main router component
│   │   └── I[AppName]Props.ts     # Props interface
│   └── loc/
│       ├── en-us.js
│       └── mystrings.d.ts
├── components/                     # All UI components
├── services/                       # Business logic services
├── models/                         # TypeScript interfaces
├── constants/
│   └── SharePointListNames.ts      # List name constants
├── utils/
│   ├── pnpConfig.ts               # PnP initialization
│   ├── injectPortalStyles.ts      # Portal styles
│   ├── SharePointOverrides.ts     # SP chrome hiding
│   ├── toast.ts                   # Toast notifications
│   ├── activityLog.ts             # Activity tracking
│   └── validation.ts              # Form validation
└── styles/                         # Shared SCSS (if needed)
```

---

## 5. Phase 2: Code Extraction from JML

### What to Copy From JML

#### A. Framework Utilities (Copy as-is, minimal changes)

| File | Source in JML | Changes Needed |
|------|--------------|----------------|
| `pnpConfig.ts` | `src/utils/pnpConfig.ts` | None — identical pattern |
| `injectPortalStyles.ts` | `src/utils/injectPortalStyles.ts` | None |
| `SharePointOverrides.ts` | `src/utils/SharePointOverrides.ts` | None |

These are framework plumbing — they don't contain business logic or JML coupling.

#### B. Domain Services (Copy + Modify)

From JML's `src/services/`, copy the services your module uses. Modifications needed:

1. **Remove JML list name references** — Replace hardcoded `'Assets'` with `AM_LISTS.ASSETS`
2. **Remove cross-module dependencies** — If AssetService calls ProcessService or ApprovalService, remove those calls
3. **Simplify field lists** — JML services may query 30+ fields; the standalone app may only need 15-20
4. **Update import paths** — All imports must resolve within the new project

Example — AssetService extraction:
```typescript
// JML version:
const items = await this.sp.web.lists.getByTitle('Assets').items
  .select('Id', 'Title', /* ... 30 fields */)
  .filter(`ProcessId eq ${processId}`)();  // ← JML coupling

// Standalone version:
import { AM_LISTS } from '../constants/SharePointListNames';
const items = await this.sp.web.lists.getByTitle(AM_LISTS.ASSETS).items
  .select('Id', 'Title', /* ... 20 fields */)();  // ← No ProcessId filter
```

#### C. Models/Interfaces (Copy + Simplify)

From JML's `src/models/`, copy the relevant interfaces:

1. **Strip JML-specific fields** — Remove `ProcessId`, `JmlTaskId`, `WorkflowStepId` etc.
2. **Consolidate** — JML may have 8 separate asset model files; combine into 1-2 files
3. **Add app-specific enums** — Status enums, category enums tailored to the standalone app

#### D. Components (Copy + Rewrite)

This is where the most work happens. Components from JML need significant changes:

1. **Remove JML layout wrappers** — No `JmlAppLayout`, no `JmlAppHeader`
2. **Remove JML navigation** — No `JmlNavConfig` calls
3. **Replace shared styling** — JML's `FluentUIStyles.ts` tokens → app's own SCSS modules
4. **Change component style** — JML uses class components; standalone can use functional components
5. **Rewire data flow** — JML passes SP context through layout; standalone passes directly

### What NOT to Copy From JML

| Don't Copy | Why |
|-----------|-----|
| `JmlAppLayout.tsx` | Tightly coupled to JML navigation and role system |
| `JmlAppHeader.tsx` | Contains JML-specific nav items and branding |
| `JmlAppFooter.tsx` | JML branding |
| `JmlNavConfig.ts` | JML navigation structure |
| `ProcessService.ts` | JML core — not relevant to standalone modules |
| `TaskService.ts` | JML core workflow engine |
| `WorkflowService.ts` | JML core workflow engine |
| `RoleDetectionService.ts` | Uses JML SharePoint groups; create new one |
| Any service with `Jml` prefix | Tightly coupled to JML processes |

---

## 6. Phase 3: Renaming & Decoupling

### Step 3.1: SharePoint List Names

Create `src/constants/SharePointListNames.ts`:

```typescript
// [App] SharePoint List Names
// All lists use the [XX]_ prefix ([App Name])

export const [XX]_LISTS = {
  // Core lists
  [ENTITY]: '[XX]_[EntityName]',
  // ... all lists
} as const;

export type [XX]_ListName = typeof [XX]_LISTS[keyof typeof [XX]_LISTS];
```

**Asset Manager example** (`AM_LISTS`):
```typescript
export const AM_LISTS = {
  ASSETS: 'AM_Assets',
  ASSET_TYPES: 'AM_AssetTypes',
  ASSET_ASSIGNMENTS: 'AM_AssetAssignments',
  ASSET_CHECKOUTS: 'AM_AssetCheckouts',
  ASSET_MAINTENANCE: 'AM_AssetMaintenance',
  ASSET_TRANSFERS: 'AM_AssetTransfers',
  ASSET_AUDITS: 'AM_AssetAudits',
  ASSET_AUDIT_ITEMS: 'AM_AssetAuditItems',
  ASSET_REQUESTS: 'AM_AssetRequests',
  M365_LICENSES: 'AM_M365Licenses',
  VENDORS: 'AM_Vendors',
  CONTRACTS: 'AM_Contracts',
  CONFIGURATION: 'AM_Configuration',
  AUDIT_TRAIL: 'AM_AuditTrail',
  APPROVAL_HISTORY: 'AM_ApprovalHistory',
  APPROVAL_DELEGATIONS: 'AM_ApprovalDelegations'
} as const;
```

### Step 3.2: Global Search & Replace

After copying files, perform these replacements across the codebase:

| Search | Replace | Why |
|--------|---------|-----|
| `getByTitle('Assets')` | `getByTitle(AM_LISTS.ASSETS)` | Use constants |
| `from '../../../services/` | `from '../../services/` | Path correction |
| `JmlAppLayout` | Remove entirely | Not used in standalone |
| `JmlAppHeader` | Replace with `[Prefix]AppHeader` | New header |
| `props.processId` | Remove | JML coupling |
| `import { JML` | Remove | JML imports |

### Step 3.3: Remove ALL JML Dependencies

Search the entire codebase for these patterns and remove/replace:

```
JML, Jml, jml (in import paths)
processId, ProcessId
workflowId, WorkflowId
taskId, TaskId (JML task, not app task)
JmlAppLayout, JmlAppHeader, JmlNavConfig
```

---

## 7. Phase 4: DWx Standard Components

Every standalone DWx app needs these standard components. Create them fresh — do NOT copy from JML.

### 7.1: App Header (`[Prefix]AppHeader.tsx`)

The header is the most complex new component. It provides:

| Feature | Description |
|---------|-------------|
| **Brand gradient** | App-colored gradient bar with icon, title, breadcrumbs |
| **Navigation bar** | White bar with tab-style nav items |
| **Recently Viewed** | Dropdown showing last 5 viewed items (localStorage) |
| **Notifications** | Bell icon with unread count badge |
| **Search** | Search icon → navigates to Search view |
| **Admin** | Settings cog → navigates to Admin view (role-gated) |
| **Help** | Help icon → navigates to Help view |
| **User menu** | Avatar with initials, role display, sign-out |

**Asset Manager implementation** — `AmAppHeader.tsx`:
- `AssetViewType` union: `'dashboard' | 'registry' | 'checkout' | 'licenses' | ...`
- Nav items array with `key`, `label`, `icon`, `viewType`, `minRole`
- Role-based filtering via `AssetRoleService.filterNavForRole()`
- Recently viewed stored in localStorage (key: `am_recently_viewed`, max 20 items)
- Activity log for notifications via `activityLog.ts` utility
- Breadcrumb strip below nav bar

**Key pattern — Recently Viewed**:
```typescript
export interface IRecentlyViewedItem {
  id: number;
  type: 'asset' | 'vendor' | 'contract' | 'checkout' | 'license' | 'report';
  title: string;
  subtitle?: string;
  timestamp: string;
}

export function addToRecentlyViewed(item: IRecentlyViewedItem): void {
  const key = 'am_recently_viewed';
  const items: IRecentlyViewedItem[] = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = items.filter(i => !(i.id === item.id && i.type === item.type));
  filtered.unshift({ ...item, timestamp: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)));
}
```

### 7.2: Role Service (`[Prefix]RoleService.ts`)

Every app needs its own role hierarchy:

```typescript
export enum AssetManagerRole {
  User = 'User',       // Browse, My Assets
  Manager = 'Manager', // + Licenses, Vendors, Contracts, Reports
  Admin = 'Admin'      // + Admin Center
}

export async function detectUserRole(sp: SPFI): Promise<AssetManagerRole> {
  try {
    const groups = await sp.web.currentUser.groups();
    const groupNames = groups.map(g => g.Title);
    if (groupNames.some(n => n.includes('AM Admin'))) return AssetManagerRole.Admin;
    if (groupNames.some(n => n.includes('AM Manager'))) return AssetManagerRole.Manager;
    return AssetManagerRole.User;
  } catch {
    return AssetManagerRole.User; // Fail safe
  }
}

const ROLE_LEVEL: Record<AssetManagerRole, number> = {
  [AssetManagerRole.User]: 0,
  [AssetManagerRole.Manager]: 1,
  [AssetManagerRole.Admin]: 2,
};

export function hasMinimumRole(current: AssetManagerRole, required: AssetManagerRole): boolean {
  return ROLE_LEVEL[current] >= ROLE_LEVEL[required];
}

const NAV_MIN_ROLE: Record<string, AssetManagerRole> = {
  dashboard: AssetManagerRole.User,
  myAssets: AssetManagerRole.User,
  registry: AssetManagerRole.User,
  checkout: AssetManagerRole.User,
  search: AssetManagerRole.User,
  help: AssetManagerRole.User,
  licenses: AssetManagerRole.Manager,
  vendors: AssetManagerRole.Manager,
  contracts: AssetManagerRole.Manager,
  reports: AssetManagerRole.Manager,
  requests: AssetManagerRole.Manager,
  admin: AssetManagerRole.Admin,
};

export function filterNavForRole(role: AssetManagerRole): string[] {
  return Object.entries(NAV_MIN_ROLE)
    .filter(([_, minRole]) => hasMinimumRole(role, minRole))
    .map(([key]) => key);
}
```

### 7.3: Search Center (`AssetSearch.tsx`)

Standard DWx search pattern:
- Hero section with search input and category chips
- Left sidebar filters (type, status, category)
- Card-layout results sorted by relevance
- Cross-entity search (assets, vendors, contracts, etc.)

### 7.4: Admin Center (`AssetAdminCenter.tsx`)

Standard DWx admin pattern:
- **Sidebar** (280px) with navigation sections
- **Content area** that swaps based on selected section
- Sections:
  - Navigation Visibility toggles (with Enable/Disable All)
  - General Settings (feature flags)
  - Category/Type management
  - Notification configuration
  - Data Export
  - Audit Log viewer
  - System Info

Navigation toggles use localStorage write-through:
```typescript
const handleNavToggle = (key: string, enabled: boolean) => {
  const config = JSON.parse(localStorage.getItem('am_nav_visibility') || '{}');
  config[key] = enabled;
  localStorage.setItem('am_nav_visibility', JSON.stringify(config));
  // Also write to SP (fire-and-forget):
  configService.setValue('nav_visibility', JSON.stringify(config), 'Navigation');
};
```

### 7.5: Help Center (`AssetHelpCenter.tsx`)

Standard DWx help pattern:
- **Tabs**: Home, Articles, FAQs, Shortcuts, Support
- Search across articles and FAQs
- Accordion FAQ with expand/collapse
- Keyboard shortcuts table
- Support form (category, subject, description)

### 7.6: Dashboard (`AssetDashboard.tsx`)

Standard DWx dashboard pattern:
- 4-6 KPI tiles (count, currency, percentage)
- Status donut chart (CSS conic-gradient — no chart library needed)
- Category bar chart (CSS horizontal bars)
- Activity feed (recent actions)
- Alerts section (expiring items, overdue items)

### 7.7: Main Router Component (`AssetManager.tsx`)

The SPA router that switches views:

```typescript
const AssetManager: React.FC<IAssetManagerProps> = (props) => {
  const [currentView, setCurrentView] = useState<AssetViewType>('registry');
  const [userRole, setUserRole] = useState<AssetManagerRole>(AssetManagerRole.User);
  const sp = useMemo(() => getSP(props.context), [props.context]);

  useEffect(() => {
    injectPortalStyles();
    signalAppReady();
  }, []);

  useEffect(() => {
    if (sp) {
      detectUserRole(sp).then(setUserRole).catch(() => {});
    }
  }, [sp]);

  return (
    <FluentProvider theme={webLightTheme}>
      <AmAppHeader
        currentView={currentView}
        onNavigate={setCurrentView}
        userRole={userRole}
        /* ... other props */
      />
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {currentView === 'dashboard' && <AssetDashboard sp={sp} />}
        {currentView === 'registry' && <AssetRegistry sp={sp} />}
        {/* ... other views */}
      </div>
    </FluentProvider>
  );
};
```

---

## 8. Phase 5: Styling & Theming

### Step 5.1: Choose a Theme Color

Each DWx app needs a distinct primary color:

| App | Primary | Dark | Light | Gradient |
|-----|---------|------|-------|----------|
| Asset Manager | `#475569` | `#334155` | `#64748b` | `135deg, #475569, #334155` |
| Policy Manager | `#0d9488` | `#0f766e` | `#14b8a6` | `135deg, #0d9488, #0f766e` |
| Recruitment (proposed) | `#7c3aed` | `#6d28d9` | `#8b5cf6` | `135deg, #7c3aed, #6d28d9` |

### Step 5.2: Create AmPanelStyles.module.scss

This is the shared panel/dialog style guide. Copy from Asset Manager and update the color palette:

```scss
/* PANEL HEADER — [Theme] Gradient */
.panelHeader {
  padding: 20px 24px;
  background: linear-gradient(135deg, [PRIMARY] 0%, [DARK] 100%);
  color: #ffffff;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
}

/* PANEL FOOTER */
.panelFooter {
  padding: 16px 24px;
  background: #ffffff;
  border-top: 1px solid #e1dfdd;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

/* BUTTONS — Theme branded */
.btnPrimary {
  background: [PRIMARY];
  /* ... */
}
.btnPrimary:hover {
  background: [DARK];
}

/* FLUENT UI v8 PANEL OVERRIDES */
.amPanel :global(.ms-Panel-header) { padding: 0; }
.amPanel :global(.ms-Panel-headerText) { display: none; }
.amPanel :global(.ms-Panel-contentInner) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.amPanel :global(.ms-Panel-scrollableContent) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.amPanel :global(.ms-Panel-content) {
  flex: 1;
  overflow-y: auto;
  padding: 24px !important;
}
```

### Step 5.3: Create FieldBorders.module.scss

This is the form field styling that makes Fluent UI controls look consistent.

**CRITICAL**: This file handles BOTH Fluent UI v8 and v9 controls because SPFx apps commonly use both.

```scss
/* ─── Fluent UI v9 Input wrapper ─── */
.fieldWithBorder :global(.fui-Input) {
  border: 1px solid #8a8886 !important;
  border-radius: 4px !important;
  min-height: 34px;
  background-color: #ffffff;
}
.fieldWithBorder :global(.fui-Input:hover) {
  border-color: #605e5c !important;
}
.fieldWithBorder :global(.fui-Input:focus-within) {
  border-color: [PRIMARY] !important;
  box-shadow: 0 0 0 1px [PRIMARY] !important;
}

/* ─── Fluent UI v9 Dropdown trigger ─── */
.fieldWithBorder :global(.fui-Dropdown) {
  border: 1px solid #8a8886 !important;
  border-radius: 4px !important;
  min-height: 34px;
  background-color: #ffffff;
}

/* ─── Fluent UI v9 Textarea wrapper ─── */
.fieldWithBorder :global(.fui-Textarea) {
  border: 1px solid #8a8886 !important;
  border-radius: 4px !important;
  min-height: 60px;
  background-color: #ffffff;
}

/* Inner elements — remove duplicate borders */
.fieldWithBorder :global(.fui-Textarea) textarea {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
.fieldWithBorder :global(.fui-Input) input {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* ─── Fluent UI v8 TextField ─── */
.fieldWithBorder :global(.ms-TextField-fieldGroup) {
  border: 1px solid #8a8886;
  border-radius: 4px;
  min-height: 34px;
}
.fieldWithBorder :global(.ms-TextField-fieldGroup::after) {
  border-radius: 4px;
  border-color: [PRIMARY];
}

/* ─── Fluent UI v8 Dropdown ─── */
.fieldWithBorder :global(.ms-Dropdown-title) {
  border: 1px solid #8a8886;
  border-radius: 4px;
  min-height: 34px;
  line-height: 32px;
}

/* ─── PeoplePicker (pnp/spfx-controls-react) ─── */
.fieldWithBorder :global(.ms-BasePicker-text) {
  border: 1px solid #8a8886;
  border-radius: 4px;
  min-height: 34px;
  padding: 2px 8px;
}
.fieldWithBorder :global(.ms-BasePicker-text::after) {
  border-color: [PRIMARY];
  border-radius: 4px;
}

/* ─── Fluent UI v8 Toggle ─── */
.fieldWithBorder :global(.ms-Toggle.is-checked .ms-Toggle-background) {
  background-color: [PRIMARY];
  border-color: [PRIMARY];
}
```

**Usage in components**:
```typescript
import fieldStyles from '../FieldBorders.module.scss';

// Wrap each form field:
<div className={fieldStyles.fieldWithBorder}>
  <Field label="Asset Name" required>
    <Input value={name} onChange={(_, d) => setName(d.value)} />
  </Field>
</div>
```

---

## 9. Phase 6: SharePoint List Provisioning

### Step 6.1: Create PowerShell Scripts

Location: `scripts/`

**Pattern**: Each script is idempotent, assumes user is already connected to SharePoint.

```powershell
# scripts/Deploy-[App]Lists.ps1
# Deploys all SharePoint lists for [App Name]
# Usage: .\Deploy-[App]Lists.ps1
# Prerequisite: Connect-PnPOnline -Url https://[tenant].sharepoint.com/sites/[App] -Interactive

$siteUrl = "https://mf7m.sharepoint.com/sites/[App]"

function Ensure-List {
    param([string]$ListName, [string]$Description)
    $list = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
    if ($null -eq $list) {
        New-PnPList -Title $ListName -Template GenericList -OnQuickLaunch:$false
        Write-Host "Created: $ListName" -ForegroundColor Green
    } else {
        Write-Host "Exists: $ListName" -ForegroundColor Gray
    }
}

function Ensure-Field {
    param([string]$ListName, [string]$FieldName, [string]$Type, [bool]$Required = $false)
    $field = Get-PnPField -List $ListName -Identity $FieldName -ErrorAction SilentlyContinue
    if ($null -eq $field) {
        Add-PnPField -List $ListName -DisplayName $FieldName -InternalName $FieldName `
            -Type $Type -Required:$Required -ErrorAction SilentlyContinue
        Write-Host "  Added field: $FieldName ($Type)" -ForegroundColor Cyan
    }
}

# Create lists
Ensure-List "[XX]_[Entity]" "[Entity] description"
Ensure-Field "[XX]_[Entity]" "FieldName" "Text" $true
# ... more fields
```

### Step 6.2: Configuration List

Every app needs a configuration list for key-value settings:

```powershell
Ensure-List "[XX]_Configuration" "Application configuration settings"
Ensure-Field "[XX]_Configuration" "ConfigKey" "Text" $true
Ensure-Field "[XX]_Configuration" "ConfigValue" "Note" $false
Ensure-Field "[XX]_Configuration" "Category" "Choice" $false  # Navigation, General, Display
Ensure-Field "[XX]_Configuration" "IsActive" "Boolean" $false
```

### Step 6.3: Seed Sample Data

Create a separate seed script for demo/testing:

```powershell
# scripts/Seed-[App]SampleData.ps1
Add-PnPListItem -List "[XX]_Assets" -Values @{
    Title = "Dell Latitude 5520"
    AssetTag = "AM-001"
    Category = "Hardware"
    Status = "Available"
    # ... more fields
}
```

---

## 10. Phase 7: Build, Package & Deploy

### Step 7.1: Configure config.json

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/spfx-build/config.2.0.schema.json",
  "version": "2.0",
  "bundles": {
    "dwx-[app-name]-web-part": {
      "components": [{
        "entrypoint": "./lib/webparts/dwx[AppName]/[AppName]WebPart.js",
        "manifest": "./src/webparts/dwx[AppName]/[AppName]WebPart.manifest.json"
      }]
    }
  },
  "localizedResources": {
    "Dwx[AppName]WebPartStrings": "lib/webparts/dwx[AppName]/loc/{locale}.js"
  }
}
```

### Step 7.2: Build & Package

```bash
# Clean build
gulp clean

# Production bundle (verify zero errors)
gulp bundle --ship

# Package (creates .sppkg)
gulp package-solution --ship

# Output: sharepoint/solution/[app-name].sppkg
```

### Step 7.3: Deploy to SharePoint

1. Navigate to App Catalog: `https://[tenant].sharepoint.com/sites/AppCatalog`
2. Upload `[app-name].sppkg`
3. Check "Make this solution available to all sites"
4. Deploy

### Step 7.4: Create SharePoint Pages

On the target site, create these pages:

| Page | Layout | WebPart |
|------|--------|---------|
| `[AppName].aspx` | Full-width, single column | `Dwx[AppName]` |

For multi-page apps, create one page per webpart.

---

## 11. Phase 8: Post-Deployment Hardening

### Step 8.1: Version Bump

After initial deployment works:
1. Update `package-solution.json` version
2. Update `package.json` version
3. Rebuild, repackage, redeploy

### Step 8.2: Git Repository

```bash
cd [project-root]
git init
git remote add origin https://github.com/[org]/dwx-[app-name].git
git add .
git commit -m "Initial commit: DWx [App Name] v1.0.0"
git push -u origin master
```

### Step 8.3: Create CLAUDE.md

See [Section 15](#15-template-claudemd-for-new-app) for a template.

---

## 12. CSS/SCSS Issues & Solutions

This section documents every CSS issue encountered during the Asset Manager decoupling and how each was resolved. **These are the most time-consuming bugs and are critical to avoid.**

### Issue 1: Stale .module.css Files Overriding .module.scss

**Symptom**: Field borders not rendering despite correct SCSS code.

**Root Cause**: Hand-written `.module.css` files (e.g., `FieldBorders.module.css`) were sitting alongside compiled `.module.scss` files. The SPFx webpack build loads BOTH, and the CSS file's specificity (or load order) overrode the SCSS output.

**The stale CSS file had**:
- Old border colors (`#d1d1d1` instead of `#8a8886`)
- Wrong focus color (`#0078d4` instead of app theme)
- Missing Fluent UI v9 selectors (no `.fui-Input`, `.fui-Dropdown`, `.fui-Textarea`)

**Fix**:
```bash
# Delete ALL hand-written .module.css files alongside .module.scss files
rm src/components/FieldBorders.module.css
rm src/components/FieldBorders.module.css.d.ts
rm src/components/DropdownFix.module.css
```

**Prevention Rule**: NEVER create hand-written `.module.css` files in an SPFx project that uses SCSS. The build pipeline compiles `.module.scss` → CSS automatically. Having both causes conflicts.

### Issue 2: Fluent UI v9 vs v8 CSS Class Names

**Symptom**: Styles work on some controls but not others.

**Root Cause**: Fluent UI v9 uses `fui-` prefixed class names while v8 uses `ms-` prefixed class names. Most SPFx apps use BOTH versions simultaneously.

**Fluent UI v9 classes** (used by Input, Dropdown, Textarea, Field, Dialog):
```
.fui-Input          — Input wrapper
.fui-Dropdown       — Dropdown trigger
.fui-Textarea       — Textarea wrapper
.fui-Label          — Field label
.fui-Listbox        — Dropdown popup list
.fui-Option         — Dropdown option
.fui-Label__required — Required asterisk
```

**Fluent UI v8 classes** (used by TextField, Dropdown, Panel, Toggle, PeoplePicker):
```
.ms-TextField-fieldGroup     — TextField wrapper
.ms-Dropdown-title           — Dropdown trigger
.ms-Label                    — Field label
.ms-BasePicker-text          — PeoplePicker input
.ms-Toggle-background        — Toggle track
.ms-Panel-header             — Panel header
.ms-Panel-content            — Panel body
```

**Fix**: The `FieldBorders.module.scss` file must include selectors for BOTH v8 and v9 controls.

### Issue 3: `:global()` Required for Fluent UI Class Names

**Symptom**: SCSS selectors targeting Fluent UI classes don't match.

**Root Cause**: CSS Modules (`.module.scss`) hash all class names by default. Fluent UI's class names are not hashed, so you must use `:global()` to prevent hashing.

**Wrong**:
```scss
.fieldWithBorder .fui-Input {
  /* This compiles to: .fieldWithBorder_abc123 .fui-Input_xyz789 — won't match! */
}
```

**Correct**:
```scss
.fieldWithBorder :global(.fui-Input) {
  /* This compiles to: .fieldWithBorder_abc123 .fui-Input — matches! */
}
```

### Issue 4: `!important` Required for Fluent UI v9 Overrides

**Symptom**: SCSS rules exist but Fluent UI's inline styles or Griffel-generated styles win.

**Root Cause**: Fluent UI v9 uses Griffel (atomic CSS) which generates styles with higher specificity. Your module SCSS compiles to lower-specificity selectors.

**Fix**: Use `!important` on border, border-radius, and box-shadow properties for v9 controls:

```scss
.fieldWithBorder :global(.fui-Input) {
  border: 1px solid #8a8886 !important;
  border-radius: 4px !important;
}
.fieldWithBorder :global(.fui-Input:focus-within) {
  border-color: #475569 !important;
  box-shadow: 0 0 0 1px #475569 !important;
}
```

**Note**: Fluent UI v8 controls generally do NOT need `!important` — their CSS is lower specificity.

### Issue 5: Fluent UI v9 Dialog Footer Positioning

**Symptom**: Panel/dialog buttons appear above the form content instead of at the bottom.

**Root Cause**: Fluent UI v9 `DialogBody` uses CSS grid layout internally. A custom footer `div` placed inside `DialogBody` gets positioned by grid order, not by flex order.

**Wrong approach**:
```tsx
<DialogBody>
  <DialogContent>{/* form fields */}</DialogContent>
  <div className={panelCss.panelFooter}>  {/* ← Grid places this wrong */}
    <button>Cancel</button>
    <button>Save</button>
  </div>
</DialogBody>
```

**Fix — Override DialogBody to use flex**:
```tsx
<DialogBody style={{ display: 'flex', flexDirection: 'column', padding: 0, margin: 0 }}>
  <DialogContent style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
    {/* form fields */}
  </DialogContent>
  <div className={panelCss.panelFooter}>
    <button>Cancel</button>
    <button>Save</button>
  </div>
</DialogBody>
```

### Issue 6: Fluent UI v8 Panel Header/Footer Overrides

**Symptom**: Panel opens with default header (wrong styling) and no footer.

**Root Cause**: Fluent UI v8 `Panel` has its own header rendering that overrides custom content. The panel's internal `contentInner` div doesn't flex properly by default.

**Fix — Use `.amPanel` wrapper class**:
```scss
.amPanel :global(.ms-Panel-header) { padding: 0; }
.amPanel :global(.ms-Panel-headerText) { display: none; }
.amPanel :global(.ms-Panel-contentInner) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.amPanel :global(.ms-Panel-scrollableContent) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.amPanel :global(.ms-Panel-content) {
  flex: 1;
  overflow-y: auto;
  padding: 24px !important;
}
```

Then wrap the Panel:
```tsx
<Panel
  isOpen={isOpen}
  onDismiss={onDismiss}
  type={PanelType.medium}
  className={panelCss.amPanel}
  hasCloseButton={false}
>
  <div className={panelCss.panelHeader}>
    {/* Custom gradient header */}
  </div>
  <div className={panelCss.panelBody}>
    {/* Form content */}
  </div>
  <div className={panelCss.panelFooter}>
    {/* Cancel + Save buttons */}
  </div>
</Panel>
```

### Issue 7: Inner Element Double Borders

**Symptom**: Form fields show two borders — one on the wrapper, one on the inner input.

**Root Cause**: After adding a border to `.fui-Input` wrapper, the inner `<input>` element still has its own default border.

**Fix**: Remove borders from inner elements:
```scss
.fieldWithBorder :global(.fui-Input) input {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
.fieldWithBorder :global(.fui-Textarea) textarea {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
```

### Issue 8: SharePoint CDN Caching After Deployment

**Symptom**: Deployed new `.sppkg` but the app still shows old code/styles.

**Root Cause**: SharePoint CDN caches JavaScript bundles aggressively. Even after uploading a new package, the old bundle may be served.

**Fix** (in order of escalation):
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache for the SharePoint domain
3. Bump version in `package-solution.json` → rebuild → redeploy
4. Remove and re-add the app in the SharePoint App Catalog
5. Wait 15-30 minutes for CDN cache to expire naturally

### Issue 9: Dropdown Portal Z-Index

**Symptom**: Dropdown options appear behind panels or dialogs.

**Root Cause**: Fluent UI v9 renders dropdown popups in a portal at the document root. SharePoint's stacking context can hide these portals.

**Fix**: `injectPortalStyles.ts` utility:
```typescript
export function injectPortalStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .fui-FluentProvider [class*="fui-Listbox"] {
      z-index: 1000001 !important;
    }
  `;
  document.head.appendChild(style);
}
```

Call this in the main component's `useEffect`:
```typescript
useEffect(() => {
  injectPortalStyles();
}, []);
```

---

## 13. Lessons Learned & Gotchas

### Architecture Lessons

1. **Single SPA is simpler than multi-page** — Asset Manager's 12 views in 1 webpart is much easier to manage than Policy Manager's 14 separate webparts. Prefer single SPA unless you genuinely need different page layouts.

2. **Functional components > class components** — JML uses class components (React 17 pattern). When extracting, convert to functional components with hooks. They're shorter, easier to read, and work better with TypeScript inference.

3. **Fire-and-forget audit logging** — Audit service calls should never throw or block the user. Pattern:
   ```typescript
   auditService.logEntry({ ... }).catch(() => {}); // Never await, never throw
   ```

4. **Dual-storage configuration** — Write to both SharePoint AND localStorage. Read from localStorage (fast). This gives eventual consistency without blocking the UI.

5. **Don't over-copy from JML** — It's tempting to copy all 146 services. Resist. Only copy what your module actually needs. Asset Manager went from JML's 146 services to 10.

### Build & Deployment Gotchas

6. **React version mismatch** — SPFx 1.20.0 requires React 17.0.1. Using React 18 causes cryptic build errors.

7. **Missing config.json entry** — If a webpart is missing from `config/config.json`, the build succeeds but the webpart doesn't appear in SharePoint. Always verify manifest count in build output.

8. **PnP import side effects** — You must import PnP sub-modules for them to work:
   ```typescript
   import '@pnp/sp/webs';
   import '@pnp/sp/lists';
   import '@pnp/sp/items';
   import '@pnp/sp/items/get-all';
   import '@pnp/sp/batching';
   import '@pnp/sp/site-users/web';
   ```

9. **SharePoint field name vs display name** — When querying SharePoint, use internal names in `.select()` and `.filter()`. The display name and internal name can differ (e.g., display: "Contract Value", internal: "ContractValue"). Getting this wrong returns empty results silently.

10. **PowerShell script naming** — Scripts starting with numbers (e.g., `02-Quiz-Lists.ps1`) need `.\` prefix to execute: `.\02-Quiz-Lists.ps1`

### CSS/Styling Gotchas

11. **Never create `.module.css` alongside `.module.scss`** — The build loads both and they conflict. Use SCSS only.

12. **Always use `:global()` for Fluent UI classes** — CSS Modules hash class names; Fluent UI classes are not hashed.

13. **Always use `!important` for Fluent UI v9 border overrides** — Griffel-generated styles have higher specificity.

14. **DialogBody uses grid, not flex** — Override with inline `display: flex` for custom footer positioning.

15. **Panel header needs to be hidden** — Fluent UI v8 Panel renders its own header. You must hide it and render your own gradient header.

### Data & SharePoint Gotchas

16. **`.getAll()` vs paged queries** — Use `.getAll()` for lists under 5000 items. For larger lists, use `top()` and `skip()` pagination.

17. **OData special characters** — Asset tags like `AM-001/A` need OData escaping in filter strings. Use a helper:
    ```typescript
    function escapeOData(value: string): string {
      return value.replace(/'/g, "''");
    }
    ```

18. **Currency formatting** — Use `Intl.NumberFormat` with the correct locale:
    ```typescript
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value)
    ```

---

## 14. Complete File Inventory

### Asset Manager — Final File Count

| Category | Count | Key Files |
|----------|-------|-----------|
| WebPart | 1 | `dwxAssetManager/AssetManagerWebPart.ts` |
| Components | 18 | AmAppHeader, AssetRegistry, AssetCheckout, AssetDashboard, MyAssets, M365LicenseManager, AssetReports, VendorRegistry, ContractRegister, AssetRequests, AssetSearch, AssetAdminCenter, AssetHelpCenter, AuditLog, DelegationPanel, ImportExportDialog, AssetLabel, DwxListViewTabs |
| Services | 10 | AssetService, AssetTrackingService, RequestService, VendorService, ContractService, AuditTrailService, ConfigurationService, AssetRoleService, ImportService, ExportService |
| Models | 4 | IAsset.ts (21 interfaces, 8 enums), IVendor.ts, IContract.ts, IApproval.ts |
| Constants | 1 | SharePointListNames.ts (AM_LISTS) |
| Utilities | 6 | pnpConfig, injectPortalStyles, SharePointOverrides, toast, activityLog, validation |
| Shared Styles | 3 | AmPanelStyles.module.scss, FieldBorders.module.scss, DropdownFix.module.scss |
| Scripts | 7 | Deploy, Upgrade (Phase1, Phase2), Configuration, Seed data (x2), Upgrade legacy |
| Config | 3 | config.json, package-solution.json, tsconfig.json |
| SP Lists | 16 | AM_Assets, AM_AssetTypes, AM_AssetAssignments, AM_AssetCheckouts, AM_AssetMaintenance, AM_AssetTransfers, AM_AssetAudits, AM_AssetAuditItems, AM_AssetRequests, AM_M365Licenses, AM_Vendors, AM_Contracts, AM_Configuration, AM_AuditTrail, AM_ApprovalHistory, AM_ApprovalDelegations |

---

## 15. Template: CLAUDE.md for New App

When creating a new decoupled app, create this file at the project root:

```markdown
# [App Name] - Claude Code Context

## Instructions for Claude

1. **Always read CLAUDE.md before you do anything**
2. **Always ask questions if you are unsure of the task or requirement**
3. **Be systematic in your planning, and execution**
4. **After you complete a task, always validate the result**
5. **We are working in https://mf7m.sharepoint.com/sites/[AppName]**

## Project Overview

**[App Name]** is a standalone application within the **DWx (Digital Workplace Excellence)** suite by First Digital, decoupled from the JML monolith.

### Application Identity
- **App Name**: [App Name]
- **Suite**: DWx (Digital Workplace Excellence)
- **Company**: First Digital
- **Tagline**: [Tagline]
- **Current Version**: 1.0.0
- **SharePoint Site**: https://mf7m.sharepoint.com/sites/[AppName]

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | SharePoint Framework (SPFx) | 1.20.0 |
| UI Library | React | 17.0.1 |
| Language | TypeScript | 4.7.4 |
| UI Components | Fluent UI v8 + v9 | 8.106.4 / 9.54.0 |
| Data Access | PnP/SP | 3.25.0 |
| Build System | Gulp | 4.0.2 |

## Design System

### Color Palette — [Theme Name]
| Name | Hex | Usage |
|------|-----|-------|
| Primary | [PRIMARY] | Headers, active states, accents |
| Dark | [DARK] | Gradient endpoints, hover states |
| Light | [LIGHT] | Active nav items, badges |

### Gradients
Header gradient: `linear-gradient(135deg, [PRIMARY] 0%, [DARK] 100%)`

## SharePoint Lists

All lists use the `[XX]_` prefix.

[List all lists with columns]

## Build Commands

```bash
npm install
gulp clean && gulp bundle --ship && gulp package-solution --ship
# Output: sharepoint/solution/[app-name].sppkg
```

## Development Guidelines

### SCSS Rules (CRITICAL)
1. NEVER create `.module.css` files — use `.module.scss` only
2. Always use `:global()` for Fluent UI class selectors
3. Always use `!important` for Fluent UI v9 border overrides
4. DialogBody needs `display: flex` override for custom footers
5. Panel headers need `.ms-Panel-headerText { display: none }` override

### Services
1. Use the singleton SPFI instance via `getSP()`
2. Use `[XX]_LISTS` constants for all list names
3. Audit logging is fire-and-forget (never throws)
```

---

## Appendix A: Quick Reference — Decoupling Checklist

```
[ ] 1.  Create SPFx project with yo @microsoft/sharepoint
[ ] 2.  Align package.json dependencies (React 17, Fluent UI 8.106.4, PnP 3.25.0)
[ ] 3.  Create directory structure (components, services, models, constants, utils)
[ ] 4.  Copy framework utilities (pnpConfig, injectPortalStyles, SharePointOverrides)
[ ] 5.  Create SharePointListNames.ts with [XX]_LISTS constants
[ ] 6.  Copy and modify domain services (replace list names, remove JML coupling)
[ ] 7.  Copy and simplify models (remove ProcessId, WorkflowId, JML fields)
[ ] 8.  Create [Prefix]AppHeader component (nav, recently viewed, notifications, search, admin, help)
[ ] 9.  Create [Prefix]RoleService (role hierarchy, nav filtering, group detection)
[ ] 10. Create AmPanelStyles.module.scss (panel header, footer, buttons)
[ ] 11. Create FieldBorders.module.scss (Fluent v8 + v9 selectors)
[ ] 12. Create main router component with view switching
[ ] 13. Create domain components (Registry, Dashboard, Admin, Help, Search, etc.)
[ ] 14. Create PowerShell provisioning scripts (idempotent, no Connect-PnPOnline)
[ ] 15. Register webpart in config/config.json
[ ] 16. Build: gulp bundle --ship (zero errors)
[ ] 17. Package: gulp package-solution --ship
[ ] 18. Deploy to SharePoint App Catalog
[ ] 19. Create SharePoint pages
[ ] 20. Run provisioning scripts to create lists
[ ] 21. Seed sample data
[ ] 22. Initialize git repo, push to GitHub
[ ] 23. Create CLAUDE.md
[ ] 24. Verify: data loads, forms work, styles correct, roles filter nav
```

---

## Appendix B: Color Palette Registry

To avoid color conflicts between DWx apps:

| App | Primary | Reserved Palette |
|-----|---------|-----------------|
| DWx Core/Hub | `#1a5a8a` (Blue) | Blue family |
| Policy Manager | `#0d9488` (Forest Teal) | Teal family |
| Asset Manager | `#475569` (Slate) | Slate/Gray-Blue family |
| Contract Manager | `#0078d4` (Azure Blue) | Microsoft Blue family |
| Recruitment (proposed) | `#7c3aed` (Purple) | Purple family |
| Training (proposed) | `#ea580c` (Orange) | Orange family |
| Document Hub (proposed) | `#059669` (Emerald) | Green family |

---

*End of Blueprint*
