// JML Lite SharePoint List Names
// All lists use the JML_ prefix (Joiner/Mover/Leaver)

export const JML_LISTS = {
  // Core JML Lists
  ONBOARDING: 'JML_Onboarding',
  ONBOARDING_TASKS: 'JML_OnboardingTasks',
  ONBOARDING_TEMPLATES: 'JML_OnboardingTemplates',
  MOVER: 'JML_Mover',
  MOVER_TASKS: 'JML_MoverTasks',
  MOVER_SYSTEM_ACCESS: 'JML_MoverSystemAccess',
  OFFBOARDING: 'JML_Offboarding',
  OFFBOARDING_TASKS: 'JML_OffboardingTasks',
  ASSET_RETURN: 'JML_AssetReturn',

  // Workflow Lists
  APPROVALS: 'JML_Approvals',
  TASK_LIBRARY: 'JML_TaskLibrary',
  CLASSIFICATION_RULES: 'JML_ClassificationRules',
  NOTIFICATIONS: 'JML_Notifications',

  // Configuration Lists
  CONFIGURATION: 'JML_Configuration',
  AUDIT_TRAIL: 'JML_AuditTrail',
  DOCUMENT_TYPES: 'JML_DocumentTypes',
  ASSET_TYPES: 'JML_AssetTypes',
  SYSTEM_ACCESS_TYPES: 'JML_SystemAccessTypes',
  TRAINING_COURSES: 'JML_TrainingCourses',
  POLICY_PACKS: 'JML_PolicyPacks',
  DEPARTMENTS: 'JML_Departments',
} as const;

// Document Libraries
export const JML_LIBRARIES = {
  // Employee document library with folder per employee
  EMPLOYEE_DOCUMENTS: 'JML_EmployeeDocuments',
} as const;

export type JML_ListName = typeof JML_LISTS[keyof typeof JML_LISTS];
export type JML_LibraryName = typeof JML_LIBRARIES[keyof typeof JML_LIBRARIES];

// Backwards compatibility alias (for migration)
export const RM_LISTS = JML_LISTS;
