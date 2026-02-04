# JML Lite - Claude Code Context

## ⚠️ CRITICAL: PROJECT BOUNDARIES (READ FIRST)

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║  WORKING FOLDER: C:\Projects\SPFx\RecruitmentManager\jml-lite                ║
║                                                                              ║
║  This is the ONLY folder Claude should EVER access for this project.        ║
║  The parent folder name "RecruitmentManager" is misleading - ignore it.     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 🚫 FORBIDDEN PATHS - NEVER ACCESS THESE

| Path | Why Forbidden |
| ---- | ------------- |
| `C:\Projects\SPFx\RecruitmentManager\` | Parent folder - contains unrelated projects |
| `C:\Projects\SPFx\RecruitmentManager\recruitment-manager\` | Separate Recruitment Manager app |
| `C:\Projects\SPFx\jml-lite\` | Outdated/different copy - NOT our project |

**If the user asks you to reference another project for comparison, they will EXPLICITLY tell you.**

---

## Instructions for Claude

1. **Always read CLAUDE.md before you do anything**
2. **Always ask questions if you are unsure of the task or requirement**
3. **Be systematic in your planning, and execution**
4. **After you complete a task, always validate the result**
5. **We are working in https://mf7m.sharepoint.com/sites/JMLLite**
6. **NEVER access folders outside `C:\Projects\SPFx\RecruitmentManager\jml-lite\`**

## Project Overview

**JML Lite** is a standalone employee lifecycle management application within the **DWx (Digital Workplace Excellence)** suite by First Digital.

### Application Identity
- **App Name**: JML Lite
- **Suite**: DWx (Digital Workplace Excellence)
- **Company**: First Digital
- **Tagline**: Employee Lifecycle Management
- **Current Version**: 1.1.0
- **SharePoint Site**: https://mf7m.sharepoint.com/sites/JMLLite
- **GitHub Repository**: https://github.com/garyfinberg24-png/jml-lite
- **List Prefix**: JML_

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

### Color Palette — Blue (JML Theme)
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #005BAA | Headers, active states, accents |
| Dark | #004A8F | Gradient endpoints, hover states |
| Joiner | #005BAA | Onboarding theme (blue) |
| Mover | #ea580c | Transfer theme (orange) |
| Leaver | #d13438 | Offboarding theme (red) |

### Gradients
Header gradient: `linear-gradient(135deg, #005BAA 0%, #004A8F 100%)`

## Architecture

### Single SPA Pattern
- 1 WebPart: `DwxJmlLite`
- Main router component switches between 12+ views
- Role-based navigation filtering (User / Manager / Admin)

### Views
| View | Component | Min Role |
|------|-----------|----------|
| Dashboard | JMLDashboard | User |
| Onboarding | OnboardingTracker | Manager |
| My Onboarding | OnboardingBuddy | User |
| Transfers | MoverTracker | Manager |
| Offboarding | OffboardingTracker | Manager |
| Approvals | ApprovalQueue | Manager |
| Analytics | JMLAnalytics | Manager |
| Search | JMLSearch | User |
| Admin | JMLAdminCenter | Admin |
| Help | JMLHelpCenter | User |

### Wizard Views (Full-Page)
| View | Component | Steps | Description |
|------|-----------|-------|-------------|
| Onboarding Wizard | OnboardingWizardPage | 9 | Full onboarding wizard with profile selection and task configuration |
| Mover Wizard | MoverWizardPage | 6 | Transfer wizard |
| Offboarding Wizard | OffboardingWizardPage | 7 | Offboarding wizard |

## SharePoint Lists

All lists use the `JML_` prefix.

### Core JML Lists
| Constant | List Name | Purpose |
|----------|-----------|---------|
| ONBOARDING | JML_Onboarding | Employee onboarding records |
| ONBOARDING_TASKS | JML_OnboardingTasks | Onboarding task items |
| ONBOARDING_TEMPLATES | JML_OnboardingTemplates | Reusable task templates |
| MOVER | JML_Mover | Internal transfer records |
| MOVER_TASKS | JML_MoverTasks | Transfer task items |
| MOVER_SYSTEM_ACCESS | JML_MoverSystemAccess | System access changes |
| OFFBOARDING | JML_Offboarding | Employee offboarding records |
| OFFBOARDING_TASKS | JML_OffboardingTasks | Offboarding task items |
| ASSET_RETURN | JML_AssetReturn | Asset return tracking |

### Workflow Lists
| Constant | List Name | Purpose |
|----------|-----------|---------|
| APPROVALS | JML_Approvals | Approval workflow items |
| TASK_LIBRARY | JML_TaskLibrary | Reusable task templates |
| CLASSIFICATION_RULES | JML_ClassificationRules | Auto-routing rules |
| NOTIFICATIONS | JML_Notifications | In-app notification storage |

### Configuration Lists
| Constant | List Name | Purpose |
|----------|-----------|---------|
| DOCUMENT_TYPES | JML_DocumentTypes | Document type config |
| ASSET_TYPES | JML_AssetTypes | Asset type config |
| SYSTEM_ACCESS_TYPES | JML_SystemAccessTypes | System access config |
| TRAINING_COURSES | JML_TrainingCourses | Training course config |
| POLICY_PACKS | JML_PolicyPacks | Policy pack bundles |
| ONBOARDING_PROFILES | JML_OnboardingProfiles | Predefined onboarding profiles by department/role |
| DEPARTMENTS | JML_Departments | Department config |
| CONFIGURATION | JML_Configuration | App settings (key-value) |
| AUDIT_TRAIL | JML_AuditTrail | System audit log |

### Document Libraries
| Constant | Library Name | Purpose |
|----------|--------------|---------|
| EMPLOYEE_DOCUMENTS | JML_EmployeeDocuments | Employee document storage with folders per employee |

## Services

### Core Services
| Service | Purpose |
|---------|---------|
| OnboardingService | Onboarding CRUD & task management |
| OnboardingConfigService | Configuration list management |
| MoverService | Transfer CRUD & task management |
| OffboardingService | Offboarding CRUD & asset returns |
| JmlConfigurationService | Key-value settings |
| JmlAuditTrailService | Audit logging (fire-and-forget) |
| JmlRoleService | Role detection & nav filtering |

### Workflow Services
| Service | Purpose |
|---------|---------|
| TaskLibraryService | Task template CRUD operations |
| ClassificationRulesService | Auto-routing rule management |
| ApprovalService | Approval workflow management |
| WorkflowOrchestrator | Orchestrates complex workflows |

### Notification Services (3-Tier)
| Service | Purpose |
|---------|---------|
| GraphNotificationService | Email via Microsoft Graph API (Mail.Send) |
| TeamsNotificationService | Teams messages via Graph + webhooks |
| InAppNotificationService | SharePoint list-backed in-app notifications |
| TaskReminderService | Scheduled task reminders |

### Document Services
| Service | Purpose |
|---------|---------|
| DocumentService | Employee document folder management with category subfolders |

## Build Commands

```bash
npm install
gulp clean && gulp bundle --ship && gulp package-solution --ship
# Output: sharepoint/solution/jml-lite.sppkg
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
2. Use `JML_LISTS` constants for all list names
3. Audit logging is fire-and-forget (never throws)
4. PnP/SP v3: Use `Promise.all()` for batch operations (no `createBatch`)

### PowerShell Scripts

1. **Do NOT include `Connect-PnPOnline` or `Disconnect-PnPOnline`** in scripts — the user will already be connected to the SharePoint site before running any scripts
2. Scripts assume the PnP PowerShell context is already established
3. Focus on the actual operations (list creation, field provisioning, etc.)

### Role Hierarchy
- **User** (Level 0): Dashboard, My Onboarding, Search, Help
- **Manager** (Level 1): + Onboarding, Transfers, Offboarding, Approvals, Analytics
- **Admin** (Level 2): + Admin Center

SP Groups: `JML Admin`, `JML Manager`

## JML Module Components

### Onboarding (Joiners)
- **OnboardingTracker**: List view with status tabs, progress bars
- **OnboardingWizard**: 9-step wizard (candidate, **profile**, details, policy pack, docs, systems, assets, training, **configure tasks**, review)
- **OnboardingWizardPage**: Full-page wrapper for wizard with profile-based pre-population
- **OnboardingForm**: Detail panel for editing onboarding records
- **OnboardingBuddy**: Self-service portal for new hires with document upload
- **OnboardingConfigAdmin**: Admin panel for document/asset/system/training/profile config with seed data feature

### Mover (Internal Transfers)
- **MoverTracker**: List view with status tabs
- **MoverWizard**: 6-step wizard (employee, transfer details, system access, assets, training, review)
- **MoverWizardPage**: Full-page wrapper for wizard
- **MoverForm**: Detail panel for editing transfer records
- **MoverConfigAdmin**: Admin panel for mover-specific config

### Offboarding (Leavers)
- **OffboardingTracker**: List view with status tabs
- **OffboardingWizard**: 7-step wizard (employee, termination, assets, systems, exit interview, knowledge transfer, review)
- **OffboardingWizardPage**: Full-page wrapper for wizard
- **OffboardingForm**: Detail panel with asset return checklists
- **OffboardingConfigAdmin**: Admin panel for offboarding config

### Task Configuration System
- **TaskConfigurationPanel**: Full-screen panel for bulk task assignment & scheduling
- **TaskLibraryAdmin**: Admin panel for managing reusable task templates
- **ClassificationRulesAdmin**: Admin panel for auto-routing rules
- **TaskManager**: Task management view

### Notifications
- **NotificationPanel**: Rich notification dropdown with filtering, grouping, mark-read

### Approvals
- **ApprovalQueue**: Approval management panel for pending approvals

### Shared
- **JmlWizardLayout**: Reusable wizard layout component with step navigation
- **JmlWizard.module.scss**: Comprehensive styles for all JML wizards
- **JMLDashboard**: Main dashboard with quick actions and metrics (isometric 3D cards illustration)
- **JMLSearch**: Global search across JML data
- **JMLAdminCenter**: Admin configuration center with Task Library and Classification Rules tabs
- **JMLHelpCenter**: Help documentation
- **JMLAnalytics**: Analytics dashboard with JML metrics
- **ImportData**: Data import functionality

## Task Classification System

10 classification codes for task categorization and auto-routing:

| Code | Label | Description |
|------|-------|-------------|
| DOC | Documentation | Document collection & verification |
| SYS | System Access | IT system provisioning & access |
| HRD | Hardware | Equipment & hardware provisioning |
| TRN | Training | Training & development |
| ORI | Orientation | Onboarding orientation activities |
| CMP | Compliance | Compliance & policy requirements |
| FAC | Facilities | Workspace & facilities setup |
| SEC | Security | Security & access control |
| FIN | Finance | Finance & payroll setup |
| COM | Communication | Communication & announcement |

## Session State (Last Updated: 2026-02-04)

### Current Version: v1.3.0

### Recent Changes (v1.3.0)

1. **Onboarding Profiles** - Predefined configuration bundles tied to Department or Role
   - 4 Department profiles: IT, HR, Finance, Sales (with appropriate defaults)
   - 4 Role profiles: Software Developer, UX/UI Designer, Administrative Assistant, Sales Representative
   - Profile selection step added to OnboardingWizardPage (Step 2)
   - `applyProfile()` function pre-populates wizard selections based on chosen profile
2. **OnboardingConfigAdmin Enhancements**
   - New "Profiles" tab for managing onboarding profiles
   - "Seed Default Data" feature for all config types (documents, assets, systems, training, profiles)
   - ProfileType field (Department vs Role) with conditional Department/JobTitle fields
3. **SharePoint Schema Update** - JML_OnboardingProfiles list with all profile fields
4. **OnboardingConfigService** - Full CRUD operations for onboarding profiles

### Previous Release (v1.2.0)

- Task Dependencies - Tasks can now depend on other tasks with circular dependency detection
- TaskConfigurationOverlay - New full-screen overlay component for task configuration
- Two-Phase Task Creation - Proper ID mapping from temp IDs to SharePoint IDs
- Blocked Status - Tasks with dependencies start as "Blocked" until prerequisites complete
- Visual Dependency Indicators - Orange/green badges showing dependency relationships

### Previous Release (v1.1.0)

- Task Configuration Panel - Full-screen task assignment & scheduling
- Task Library - Reusable task templates with classification codes
- Classification Rules - Auto-routing based on task classification
- Notification System - 3-tier (Email, Teams, In-App)
- Document Service - Employee folder management with category subfolders
- Approval Workflow - Foundation for approval management
- Dashboard Illustration - Isometric 3D cards for Joiner/Mover/Leaver

### Known Issues Being Tested

- Profile selection UI in OnboardingWizardPage
- applyProfile() pre-population accuracy
- Seed data integrity

### Pending Features

- Automatic unblocking when dependencies complete
- Full approval workflow integration
- Email notification triggers
- Teams notification webhooks
- Task reminder scheduling

### Files Modified in v1.3.0

- `IOnboardingConfig.ts` - OnboardingProfileType enum, IOnboardingProfile, IResolvedOnboardingProfile interfaces
- `SharePointListNames.ts` - ONBOARDING_PROFILES constant
- `Deploy-JMLLists.ps1` - JML_OnboardingProfiles list provisioning
- `OnboardingConfigService.ts` - Full CRUD for onboarding profiles
- `OnboardingConfigAdmin.tsx` - Profiles tab, seed data feature, panel content
- `OnboardingWizardPage.tsx` - Profile step, applyProfile function, updated step flow

### Build Status

- Last successful build: 2026-02-04
- Package: `sharepoint/solution/jml-lite.sppkg`
- Git tag: v1.3.0

---

## Session Recovery Guide (For New Claude Agents)

When starting a new session and the user says "continue" or "pick up where we left off":

### Step 1: Check Session State Above

The "Session State" section contains current work status, known issues, and pending features.

### Step 2: Ask the User These Questions

1. **Which component were you working on?** (e.g., OnboardingWizard, MoverTracker, Dashboard)
2. **What specific task needs to be done?** (e.g., "fix validation on step 3", "add new field")
3. **What's currently broken or incomplete?** (e.g., "form doesn't save", "styling is wrong")

### Step 3: Read Relevant Files

Don't ask the user to explain code - read the files directly:

```text
Key entry points:
- src/webparts/dwxJmlLite/DwxJmlLiteWebPart.ts (main webpart)
- src/webparts/dwxJmlLite/components/DwxJmlLite.tsx (main router)
- src/webparts/dwxJmlLite/components/JML/ (all JML components)
- src/webparts/dwxJmlLite/services/ (all services)
```

### Tips for Efficient Context Building

- **Don't ask users to paste large code blocks** - read files yourself
- **Don't attach large images** - keep mockups under 1MB or describe in text
- **Keep prompts focused** - "fix X in Y file" is better than long explanations
- **Use this CLAUDE.md** - it has the full architecture and conventions

### Quick Commands for Context

```bash
# See project structure
ls -la C:/Projects/SPFx/RecruitmentManager/jml-lite/src/webparts/dwxJmlLite/components/JML/

# Check recent changes
cd C:/Projects/SPFx/RecruitmentManager/jml-lite && git log --oneline -10

# Find a component
grep -r "ComponentName" C:/Projects/SPFx/RecruitmentManager/jml-lite/src/
```

---

## Work Log (Update This Section Daily)

Track what was worked on each session so new agents can pick up quickly.

| Date | What Was Done | Next Steps |
| ---- | ------------- | ---------- |
| 2026-02-04 | v1.3.0: Onboarding Profiles feature, seed data capability, profile selection step | Test profile selection and pre-population |
| 2026-02-04 | v1.2.0: Task dependencies with circular detection, two-phase creation, blocked status | Test dependency UI, automatic unblocking |
| 2026-02-04 | Updated CLAUDE.md with session recovery guide | Continue feature development |
| 2026-02-04 | Task Configuration Panel, Notification System, Document Service | Test Step 7 visibility, document uploads |
| 2026-02-03 | Initial v1.1.0 release with 60+ new files | Deploy and test on SharePoint |

**To update:** Add a new row at the top with today's date when starting a session.

---

## UI Mockups Reference

All mockups are in: `C:\Projects\SPFx\RecruitmentManager\jml-lite\mockups\`

| Mockup File | Purpose |
| ----------- | ------- |
| `onboarding-wizard-interactive.html` | Full wizard flow reference |
| `categorized-wizard-lists.html` | Task categorization UI |
| `configure-tasks-placement-mockups.html` | Step 7 task configuration |
| `dashboard-illustration-mockup.html` | Isometric 3D cards design |
| `dashboard-v1-hero-cards.html` through `v5` | Dashboard design iterations |

**To view:** Open HTML files directly in browser - they're self-contained.

---

## Common Errors & Fixes

### SCSS/Styling Issues

| Problem | Solution |
| ------- | -------- |
| Fluent UI styles not applying | Use `:global(.ms-ClassName)` wrapper |
| Fluent v9 borders not overriding | Add `!important` to border properties |
| Panel header showing | Add `.ms-Panel-headerText { display: none }` |
| DialogBody layout broken | Add `display: flex` override |
| Module CSS not found | NEVER use `.module.css` - always `.module.scss` |

### PnP/SP Issues

| Problem | Solution |
| ------- | -------- |
| Batch operations fail | PnP v3 removed `createBatch()` - use `Promise.all()` |
| SPFI not initialized | Call `getSP()` singleton, ensure context passed |
| List not found | Check `JML_LISTS` constants match actual list names |

### Build Issues

| Problem | Solution |
| ------- | -------- |
| TypeScript errors on build | Run `gulp clean` first, then rebuild |
| Package won't deploy | Check `sharepoint/solution/` for `.sppkg` file |
| "Module not found" | Check import paths use correct casing |

---

## Test & Validation Commands

```bash
# Build for development (with source maps)
cd C:/Projects/SPFx/RecruitmentManager/jml-lite && gulp build

# Build for production
cd C:/Projects/SPFx/RecruitmentManager/jml-lite && gulp clean && gulp bundle --ship && gulp package-solution --ship

# Serve locally (requires workbench)
cd C:/Projects/SPFx/RecruitmentManager/jml-lite && gulp serve

# Check TypeScript errors only (no build)
cd C:/Projects/SPFx/RecruitmentManager/jml-lite && npx tsc --noEmit

# Find TODO comments in code
grep -r "TODO" C:/Projects/SPFx/RecruitmentManager/jml-lite/src/ --include="*.ts" --include="*.tsx"
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] `gulp clean && gulp bundle --ship` succeeds
- [ ] `gulp package-solution --ship` creates `.sppkg`
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Test locally in workbench if possible

### Deploy to SharePoint

1. Go to: [App Catalog](https://mf7m.sharepoint.com/sites/appcatalog)
2. Upload: `sharepoint/solution/jml-lite.sppkg`
3. Check "Make this solution available to all sites" if tenant-wide
4. Click Deploy
5. Go to: [JML Lite Site](https://mf7m.sharepoint.com/sites/JMLLite)
6. Add the webpart to a page to test

### Post-Deployment Validation

- [ ] Webpart loads without errors
- [ ] Navigation works (all views accessible)
- [ ] Data loads from SharePoint lists
- [ ] Forms save correctly
- [ ] Role-based filtering works (User/Manager/Admin)

---

## Key File Locations Quick Reference

```text
PROJECT ROOT: C:\Projects\SPFx\RecruitmentManager\jml-lite\

src/
├── webparts/dwxJmlLite/
│   ├── DwxJmlLiteWebPart.ts          # Main webpart entry
│   ├── components/
│   │   ├── DwxJmlLite.tsx            # Main router component
│   │   ├── JML/                       # All JML components
│   │   │   ├── Onboarding/           # Joiner components
│   │   │   ├── Mover/                # Transfer components
│   │   │   ├── Offboarding/          # Leaver components
│   │   │   ├── Shared/               # Shared components
│   │   │   └── Admin/                # Admin components
│   │   └── Common/                    # Common UI components
│   ├── services/                      # All services
│   │   ├── OnboardingService.ts
│   │   ├── MoverService.ts
│   │   ├── OffboardingService.ts
│   │   ├── DocumentService.ts
│   │   └── ...
│   └── models/                        # TypeScript interfaces
│       └── IJmlModels.ts
├── styles/                            # Global styles
└── assets/                            # Images, icons

scripts/
└── Deploy-JMLLists.ps1               # PowerShell to create SP lists

mockups/                               # HTML mockup files

sharepoint/solution/
└── jml-lite.sppkg                    # Deployable package
```
