# JML Lite - Claude Code Context

## Instructions for Claude

1. **Always read CLAUDE.md before you do anything**
2. **Always ask questions if you are unsure of the task or requirement**
3. **Be systematic in your planning, and execution**
4. **After you complete a task, always validate the result**
5. **We are working in https://mf7m.sharepoint.com/sites/JMLLite**

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
| Onboarding Wizard | OnboardingWizardPage | 9 | Full onboarding wizard with task configuration |
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

### Role Hierarchy
- **User** (Level 0): Dashboard, My Onboarding, Search, Help
- **Manager** (Level 1): + Onboarding, Transfers, Offboarding, Approvals, Analytics
- **Admin** (Level 2): + Admin Center

SP Groups: `JML Admin`, `JML Manager`

## JML Module Components

### Onboarding (Joiners)
- **OnboardingTracker**: List view with status tabs, progress bars
- **OnboardingWizard**: 9-step wizard (candidate, details, policy pack, docs, systems, assets, training, **configure tasks**, review)
- **OnboardingWizardPage**: Full-page wrapper for wizard
- **OnboardingForm**: Detail panel for editing onboarding records
- **OnboardingBuddy**: Self-service portal for new hires with document upload
- **OnboardingConfigAdmin**: Admin panel for document/asset/system/training config

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

### Current Version: v1.1.0

### Recent Changes
1. **Task Configuration Panel** - Full-screen task assignment & scheduling
2. **Task Library** - Reusable task templates with classification codes
3. **Classification Rules** - Auto-routing based on task classification
4. **Notification System** - 3-tier (Email, Teams, In-App)
5. **Document Service** - Employee folder management with category subfolders
6. **Approval Workflow** - Foundation for approval management
7. **OnboardingWizard Step 7** - "Configure Tasks" step always shows
8. **Dashboard Illustration** - Isometric 3D cards for Joiner/Mover/Leaver

### Known Issues Being Tested
- Step 7 "Configure Tasks" visibility in OnboardingWizard
- Document upload display in Onboarding Buddy

### Pending Features
- Full approval workflow integration
- Email notification triggers
- Teams notification webhooks
- Task reminder scheduling

### Files Modified in v1.1.0
- `OnboardingWizard.tsx` - Added Step 7, task building, classification rules integration
- `OnboardingBuddy.tsx` - Document upload, profile panel redesign
- `JmlAppHeader.tsx` - NotificationPanel integration
- `DocumentService.ts` - Fixed subfolder fetching
- `Deploy-JMLLists.ps1` - Added new list definitions
- Plus 60+ new/modified files

### Build Status
- Last successful build: 2026-02-04
- Package: `sharepoint/solution/jml-lite.sppkg`
