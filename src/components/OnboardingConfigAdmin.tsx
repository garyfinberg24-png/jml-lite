import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import {
  IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse, IPolicyPack, IDepartment,
  IOnboardingProfile, OnboardingProfileType,
  DocumentCategory, AssetCategory, SystemAccessCategory, TrainingCategory, TrainingDeliveryMethod
} from '../models/IOnboardingConfig';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps { sp: SPFI; }

type ConfigTab = 'documents' | 'assets' | 'systems' | 'training' | 'profiles' | 'policyPacks' | 'departments';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT SEED DATA - Comprehensive onboarding configuration for demos/new customers
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_DOCUMENTS: Omit<IDocumentType, 'Id'>[] = [
  // HR Documents
  { Title: 'Employment Contract', Description: 'Signed employment agreement including terms, compensation, and start date', Category: DocumentCategory.HR, IsRequired: true, SortOrder: 1, IsActive: true },
  { Title: 'NDA / Confidentiality Agreement', Description: 'Non-disclosure agreement for protecting company intellectual property', Category: DocumentCategory.Legal, IsRequired: true, SortOrder: 2, IsActive: true },
  { Title: 'Emergency Contact Form', Description: 'Contact information for emergencies', Category: DocumentCategory.HR, IsRequired: true, SortOrder: 3, IsActive: true },
  { Title: 'Direct Deposit Authorization', Description: 'Bank details for payroll processing', Category: DocumentCategory.Finance, IsRequired: true, SortOrder: 4, IsActive: true },
  { Title: 'Tax Withholding Form (W-4/P45)', Description: 'Tax declaration form for payroll', Category: DocumentCategory.Finance, IsRequired: true, SortOrder: 5, IsActive: true },
  { Title: 'Benefits Enrollment Form', Description: 'Health insurance and benefits selection', Category: DocumentCategory.HR, IsRequired: false, SortOrder: 6, IsActive: true },
  { Title: 'Pension/401k Enrollment', Description: 'Retirement savings plan enrollment', Category: DocumentCategory.Finance, IsRequired: false, SortOrder: 7, IsActive: true },
  // Identification (using HR category)
  { Title: 'Photo ID Copy', Description: 'Government-issued photo identification', Category: DocumentCategory.HR, IsRequired: true, SortOrder: 10, IsActive: true },
  { Title: 'Right to Work Documentation', Description: 'Proof of eligibility to work (passport, visa, work permit)', Category: DocumentCategory.Compliance, IsRequired: true, SortOrder: 11, IsActive: true },
  { Title: 'Professional Headshot', Description: 'Photo for badge and company directory', Category: DocumentCategory.HR, IsRequired: false, SortOrder: 12, IsActive: true },
  // Compliance
  { Title: 'Code of Conduct Acknowledgment', Description: 'Signed acknowledgment of company policies and ethics code', Category: DocumentCategory.Compliance, IsRequired: true, SortOrder: 20, IsActive: true },
  { Title: 'IT Acceptable Use Policy', Description: 'Agreement to follow IT security and usage policies', Category: DocumentCategory.IT, IsRequired: true, SortOrder: 21, IsActive: true },
  { Title: 'Data Protection Agreement', Description: 'GDPR/privacy compliance acknowledgment', Category: DocumentCategory.Compliance, IsRequired: true, SortOrder: 22, IsActive: true },
  { Title: 'Health & Safety Acknowledgment', Description: 'Workplace safety policy acknowledgment', Category: DocumentCategory.Compliance, IsRequired: true, SortOrder: 23, IsActive: true },
  { Title: 'Background Check Authorization', Description: 'Consent for background verification', Category: DocumentCategory.Legal, IsRequired: false, SortOrder: 24, IsActive: true },
  // Training Certifications (using IT category for technical certs)
  { Title: 'Security Awareness Training Certificate', Description: 'Completed cybersecurity awareness training', Category: DocumentCategory.IT, IsRequired: true, SortOrder: 30, IsActive: true },
  { Title: 'Compliance Training Certificate', Description: 'Industry-specific compliance training completion', Category: DocumentCategory.Compliance, IsRequired: false, SortOrder: 31, IsActive: true },
];

const DEFAULT_ASSETS: Omit<IAssetType, 'Id'>[] = [
  // Hardware - Computing
  { Title: 'Laptop', Description: 'Standard work laptop with company image', Category: AssetCategory.Hardware, EstimatedCost: 1500, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 3, SortOrder: 1, IsActive: true },
  { Title: 'Desktop Computer', Description: 'Desktop workstation for office-based roles', Category: AssetCategory.Hardware, EstimatedCost: 1200, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 3, SortOrder: 2, IsActive: true },
  { Title: 'Monitor', Description: '24-27 inch external monitor', Category: AssetCategory.Hardware, EstimatedCost: 300, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 2, SortOrder: 3, IsActive: true },
  { Title: 'Second Monitor', Description: 'Additional monitor for dual-screen setup', Category: AssetCategory.Hardware, EstimatedCost: 300, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: true, ApprovalThreshold: 0, LeadTimeDays: 2, SortOrder: 4, IsActive: true },
  { Title: 'Docking Station', Description: 'USB-C docking station for laptop connectivity', Category: AssetCategory.Hardware, EstimatedCost: 250, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 2, SortOrder: 5, IsActive: true },
  { Title: 'Keyboard & Mouse', Description: 'Standard keyboard and mouse set', Category: AssetCategory.Hardware, EstimatedCost: 80, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 1, SortOrder: 6, IsActive: true },
  { Title: 'Webcam', Description: 'HD webcam for video conferencing', Category: AssetCategory.Hardware, EstimatedCost: 100, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 1, SortOrder: 7, IsActive: true },
  { Title: 'Headset', Description: 'USB/Bluetooth headset with microphone for calls', Category: AssetCategory.Hardware, EstimatedCost: 150, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 1, SortOrder: 8, IsActive: true },
  // Mobile Devices (using Hardware category)
  { Title: 'Mobile Phone', Description: 'Company mobile phone for business use', Category: AssetCategory.Hardware, EstimatedCost: 800, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: true, ApprovalThreshold: 0, LeadTimeDays: 5, SortOrder: 10, IsActive: true },
  { Title: 'Tablet/iPad', Description: 'Tablet device for mobile work', Category: AssetCategory.Hardware, EstimatedCost: 600, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: true, ApprovalThreshold: 0, LeadTimeDays: 5, SortOrder: 11, IsActive: true },
  { Title: 'SIM Card', Description: 'Company mobile plan SIM card', Category: AssetCategory.Other, EstimatedCost: 0, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 2, SortOrder: 12, IsActive: true },
  // Access & Security
  { Title: 'Building Access Card', Description: 'RFID badge for building and floor access', Category: AssetCategory.Access, EstimatedCost: 15, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 1, SortOrder: 20, IsActive: true },
  { Title: 'Parking Pass', Description: 'Employee parking permit', Category: AssetCategory.Access, EstimatedCost: 0, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: true, ApprovalThreshold: 0, LeadTimeDays: 1, SortOrder: 21, IsActive: true },
  { Title: 'Security Token/YubiKey', Description: 'Hardware security key for MFA', Category: AssetCategory.Access, EstimatedCost: 50, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 2, SortOrder: 22, IsActive: true },
  { Title: 'Office Keys', Description: 'Physical keys for office/cabinet access', Category: AssetCategory.Access, EstimatedCost: 10, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 1, SortOrder: 23, IsActive: true },
  // Office Equipment
  { Title: 'Desk Chair', Description: 'Ergonomic office chair', Category: AssetCategory.Furniture, EstimatedCost: 400, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 3, SortOrder: 30, IsActive: true },
  { Title: 'Standing Desk', Description: 'Height-adjustable standing desk', Category: AssetCategory.Furniture, EstimatedCost: 800, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: true, ApprovalThreshold: 500, LeadTimeDays: 7, SortOrder: 31, IsActive: true },
  { Title: 'Laptop Bag/Backpack', Description: 'Carrying bag for laptop and accessories', Category: AssetCategory.Other, EstimatedCost: 75, IsReturnable: false, DefaultQuantity: 1, RequiresApproval: false, LeadTimeDays: 1, SortOrder: 40, IsActive: true },
];

const DEFAULT_SYSTEMS: Omit<ISystemAccessType, 'Id'>[] = [
  // Core Business Systems
  { Title: 'Microsoft 365', Description: 'Email, Teams, SharePoint, OneDrive - Core productivity suite', Category: SystemAccessCategory.Core, DefaultRole: 'Standard User', RequiresApproval: false, LicenseCostMonthly: 12.50, ProvisioningInstructions: 'Create account in Azure AD, assign E3/E5 license, add to security groups', DeprovisioningInstructions: 'Disable account, convert mailbox to shared, remove licenses', SortOrder: 1, IsActive: true },
  { Title: 'Active Directory', Description: 'Windows domain account for network access', Category: SystemAccessCategory.Core, DefaultRole: 'Domain User', RequiresApproval: false, LicenseCostMonthly: 0, ProvisioningInstructions: 'Create AD account, add to department OU and security groups', DeprovisioningInstructions: 'Disable account, move to Disabled Users OU', SortOrder: 2, IsActive: true },
  { Title: 'VPN Access', Description: 'Remote access to corporate network', Category: SystemAccessCategory.Core, DefaultRole: 'Standard VPN', RequiresApproval: false, LicenseCostMonthly: 0, ProvisioningInstructions: 'Add to VPN users group, send VPN client download instructions', DeprovisioningInstructions: 'Remove from VPN users group', SortOrder: 3, IsActive: true },
  { Title: 'Corporate Intranet', Description: 'Internal company portal and resources', Category: SystemAccessCategory.Core, DefaultRole: 'Reader', RequiresApproval: false, LicenseCostMonthly: 0, ProvisioningInstructions: 'Access granted automatically via AD account', DeprovisioningInstructions: 'Access revoked with AD account', SortOrder: 4, IsActive: true },
  // Business Applications (using Department category)
  { Title: 'HR Information System (HRIS)', Description: 'Employee self-service portal for HR tasks', Category: SystemAccessCategory.Department, DefaultRole: 'Employee', RequiresApproval: false, LicenseCostMonthly: 8, ProvisioningInstructions: 'Create employee record, sync from AD, assign self-service role', DeprovisioningInstructions: 'Mark as terminated, archive record', SortOrder: 10, IsActive: true },
  { Title: 'Time & Attendance System', Description: 'Clock in/out and timesheet management', Category: SystemAccessCategory.Core, DefaultRole: 'Employee', RequiresApproval: false, LicenseCostMonthly: 3, ProvisioningInstructions: 'Create user, assign to department, set manager for approvals', DeprovisioningInstructions: 'Disable account, export final timesheet', SortOrder: 11, IsActive: true },
  { Title: 'Expense Management', Description: 'Submit and track expense claims', Category: SystemAccessCategory.Core, DefaultRole: 'Submitter', RequiresApproval: false, LicenseCostMonthly: 4, ProvisioningInstructions: 'Create account, set cost center and approval chain', DeprovisioningInstructions: 'Process pending expenses, disable account', SortOrder: 12, IsActive: true },
  { Title: 'Project Management (Jira/Azure DevOps)', Description: 'Task and project tracking system', Category: SystemAccessCategory.Optional, DefaultRole: 'Team Member', RequiresApproval: true, LicenseCostMonthly: 10, ProvisioningInstructions: 'Add to organization, assign to projects, set permissions', DeprovisioningInstructions: 'Reassign open items, remove from projects', SortOrder: 13, IsActive: true },
  { Title: 'CRM System (Salesforce/Dynamics)', Description: 'Customer relationship management', Category: SystemAccessCategory.Department, DefaultRole: 'Sales User', RequiresApproval: true, LicenseCostMonthly: 75, ProvisioningInstructions: 'Create user, assign license and profile, set territory', DeprovisioningInstructions: 'Reassign accounts/opportunities, freeze user', SortOrder: 14, IsActive: true },
  { Title: 'ERP System (SAP/Oracle)', Description: 'Enterprise resource planning system', Category: SystemAccessCategory.Department, DefaultRole: 'End User', RequiresApproval: true, LicenseCostMonthly: 50, ProvisioningInstructions: 'Create user ID, assign roles based on job function', DeprovisioningInstructions: 'Lock user, remove roles, archive', SortOrder: 15, IsActive: true },
  // Development Tools (using Optional category)
  { Title: 'GitHub/GitLab', Description: 'Source code repository access', Category: SystemAccessCategory.Optional, DefaultRole: 'Developer', RequiresApproval: true, LicenseCostMonthly: 19, ProvisioningInstructions: 'Add to organization, assign to team repositories', DeprovisioningInstructions: 'Remove from organization, revoke PATs', SortOrder: 20, IsActive: true },
  { Title: 'CI/CD Pipeline Access', Description: 'Build and deployment systems', Category: SystemAccessCategory.Optional, DefaultRole: 'Developer', RequiresApproval: true, LicenseCostMonthly: 0, ProvisioningInstructions: 'Grant access to relevant pipelines and environments', DeprovisioningInstructions: 'Revoke pipeline access, rotate any shared credentials', SortOrder: 21, IsActive: true },
  { Title: 'Cloud Console (AWS/Azure/GCP)', Description: 'Cloud platform administration access', Category: SystemAccessCategory.Admin, DefaultRole: 'Developer', RequiresApproval: true, LicenseCostMonthly: 0, ProvisioningInstructions: 'Create IAM user, assign to groups, enable MFA', DeprovisioningInstructions: 'Disable IAM user, revoke access keys', SortOrder: 22, IsActive: true },
  // Communication (using Core category)
  { Title: 'Slack/Teams Channels', Description: 'Team and department communication channels', Category: SystemAccessCategory.Core, DefaultRole: 'Member', RequiresApproval: false, LicenseCostMonthly: 0, ProvisioningInstructions: 'Add to department and team channels', DeprovisioningInstructions: 'Remove from all channels', SortOrder: 30, IsActive: true },
  { Title: 'Zoom/Webex', Description: 'Video conferencing platform', Category: SystemAccessCategory.Optional, DefaultRole: 'Licensed User', RequiresApproval: false, LicenseCostMonthly: 15, ProvisioningInstructions: 'Assign license, configure SSO', DeprovisioningInstructions: 'Remove license, transfer scheduled meetings', SortOrder: 31, IsActive: true },
  // Specialized (using Department category)
  { Title: 'Finance System Access', Description: 'Accounting and financial reporting', Category: SystemAccessCategory.Department, DefaultRole: 'Viewer', RequiresApproval: true, LicenseCostMonthly: 40, ProvisioningInstructions: 'Create user, assign roles per finance team request', DeprovisioningInstructions: 'Remove access, audit recent activity', SortOrder: 40, IsActive: true },
  { Title: 'Admin Console Access', Description: 'Administrative access to IT systems', Category: SystemAccessCategory.Admin, DefaultRole: 'Helpdesk', RequiresApproval: true, LicenseCostMonthly: 0, ProvisioningInstructions: 'Add to admin groups per role requirements', DeprovisioningInstructions: 'Remove all admin access, audit activity', SortOrder: 50, IsActive: true },
];

const DEFAULT_TRAINING: Omit<ITrainingCourse, 'Id'>[] = [
  // Orientation
  { Title: 'Company Welcome & Culture', Description: 'Introduction to company history, mission, values, and culture', Category: TrainingCategory.Orientation, DeliveryMethod: TrainingDeliveryMethod.InPerson, DurationHours: 2, IsMandatory: true, Provider: 'HR Department', SortOrder: 1, IsActive: true },
  { Title: 'Office Tour & Facilities', Description: 'Physical tour of office facilities, emergency exits, and amenities', Category: TrainingCategory.Orientation, DeliveryMethod: TrainingDeliveryMethod.InPerson, DurationHours: 0.5, IsMandatory: true, Provider: 'Facilities', SortOrder: 2, IsActive: true },
  { Title: 'Meet the Team', Description: 'Introduction to team members and key stakeholders', Category: TrainingCategory.Orientation, DeliveryMethod: TrainingDeliveryMethod.InPerson, DurationHours: 1, IsMandatory: true, Provider: 'Hiring Manager', SortOrder: 3, IsActive: true },
  { Title: 'HR Policies & Benefits Overview', Description: 'Review of HR policies, benefits enrollment, and employee resources', Category: TrainingCategory.Orientation, DeliveryMethod: TrainingDeliveryMethod.OnlineLive, DurationHours: 1.5, IsMandatory: true, Provider: 'HR Department', SortOrder: 4, IsActive: true },
  // Compliance - Mandatory
  { Title: 'Security Awareness Training', Description: 'Cybersecurity best practices, phishing awareness, password security', Category: TrainingCategory.Compliance, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1, IsMandatory: true, Provider: 'KnowBe4', ExpirationMonths: 12, SortOrder: 10, IsActive: true },
  { Title: 'Data Protection & GDPR', Description: 'Data privacy regulations, handling personal data, breach reporting', Category: TrainingCategory.Compliance, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1, IsMandatory: true, Provider: 'Internal', ExpirationMonths: 12, SortOrder: 11, IsActive: true },
  { Title: 'Anti-Harassment & Discrimination', Description: 'Workplace harassment prevention, reporting procedures', Category: TrainingCategory.Compliance, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1, IsMandatory: true, Provider: 'HR Department', ExpirationMonths: 24, SortOrder: 12, IsActive: true },
  { Title: 'Code of Conduct', Description: 'Business ethics, conflicts of interest, professional standards', Category: TrainingCategory.Compliance, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 0.5, IsMandatory: true, Provider: 'Legal/Compliance', SortOrder: 13, IsActive: true },
  // Safety
  { Title: 'Health & Safety Induction', Description: 'Workplace safety basics, ergonomics, incident reporting', Category: TrainingCategory.Safety, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 0.5, IsMandatory: true, Provider: 'Health & Safety', SortOrder: 20, IsActive: true },
  { Title: 'Fire Safety & Emergency Procedures', Description: 'Emergency evacuation, fire extinguisher use, first aid locations', Category: TrainingCategory.Safety, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 0.5, IsMandatory: true, Provider: 'Facilities', SortOrder: 21, IsActive: true },
  { Title: 'First Aid Awareness', Description: 'Basic first aid awareness and emergency response', Category: TrainingCategory.Safety, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1, IsMandatory: false, Provider: 'Health & Safety', SortOrder: 22, IsActive: true },
  // Technical
  { Title: 'IT Systems Overview', Description: 'Introduction to company IT systems, tools, and support channels', Category: TrainingCategory.Technical, DeliveryMethod: TrainingDeliveryMethod.OnlineLive, DurationHours: 1, IsMandatory: true, Provider: 'IT Department', SortOrder: 30, IsActive: true },
  { Title: 'Microsoft 365 Essentials', Description: 'Outlook, Teams, SharePoint, OneDrive basics', Category: TrainingCategory.Technical, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 2, IsMandatory: false, Provider: 'Microsoft Learn', SortOrder: 31, IsActive: true },
  { Title: 'Communication Tools Training', Description: 'Teams/Slack best practices, video conferencing etiquette', Category: TrainingCategory.Technical, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 0.5, IsMandatory: false, Provider: 'IT Department', SortOrder: 32, IsActive: true },
  // Role-Specific (using Technical category)
  { Title: 'Sales Methodology Training', Description: 'Company sales process, CRM usage, pipeline management', Category: TrainingCategory.Technical, DeliveryMethod: TrainingDeliveryMethod.Blended, DurationHours: 8, IsMandatory: false, Provider: 'Sales Enablement', SortOrder: 40, IsActive: true },
  { Title: 'Developer Onboarding', Description: 'Development environment setup, coding standards, CI/CD processes', Category: TrainingCategory.Technical, DeliveryMethod: TrainingDeliveryMethod.Blended, DurationHours: 4, IsMandatory: false, Provider: 'Engineering', SortOrder: 41, IsActive: true },
  { Title: 'Customer Service Training', Description: 'Support processes, ticketing system, escalation procedures', Category: TrainingCategory.Technical, DeliveryMethod: TrainingDeliveryMethod.InPerson, DurationHours: 4, IsMandatory: false, Provider: 'Customer Success', SortOrder: 42, IsActive: true },
  // Soft Skills
  { Title: 'Effective Communication', Description: 'Business communication, email etiquette, presentation skills', Category: TrainingCategory.SoftSkills, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 2, IsMandatory: false, Provider: 'LinkedIn Learning', EstimatedCost: 30, SortOrder: 50, IsActive: true },
  { Title: 'Time Management', Description: 'Productivity techniques, prioritization, work-life balance', Category: TrainingCategory.SoftSkills, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1.5, IsMandatory: false, Provider: 'LinkedIn Learning', EstimatedCost: 30, SortOrder: 51, IsActive: true },
];

const DEFAULT_DEPARTMENTS: Omit<IDepartment, 'Id'>[] = [
  { Title: 'Human Resources', Code: 'HR', CostCenter: 'CC-100', IsActive: true },
  { Title: 'Information Technology', Code: 'IT', CostCenter: 'CC-200', IsActive: true },
  { Title: 'Finance', Code: 'FIN', CostCenter: 'CC-300', IsActive: true },
  { Title: 'Sales', Code: 'SLS', CostCenter: 'CC-400', IsActive: true },
  { Title: 'Marketing', Code: 'MKT', CostCenter: 'CC-410', IsActive: true },
  { Title: 'Operations', Code: 'OPS', CostCenter: 'CC-500', IsActive: true },
  { Title: 'Customer Success', Code: 'CS', CostCenter: 'CC-600', IsActive: true },
  { Title: 'Engineering', Code: 'ENG', CostCenter: 'CC-700', IsActive: true },
  { Title: 'Product', Code: 'PRD', CostCenter: 'CC-710', IsActive: true },
  { Title: 'Legal', Code: 'LGL', CostCenter: 'CC-800', IsActive: true },
  { Title: 'Executive', Code: 'EXEC', CostCenter: 'CC-900', IsActive: true },
];

// Onboarding Profiles - Predefined bundles for departments and roles
// Note: DocumentTypeIds, AssetTypeIds, etc. are placeholder numbers that will be mapped after seeding
// In production, these would reference actual IDs from the seeded config items
const DEFAULT_PROFILES: Omit<IOnboardingProfile, 'Id'>[] = [
  // Department Profiles
  {
    Title: 'IT Department',
    Description: 'Standard onboarding for Information Technology staff including developer tools, admin access, and technical training',
    ProfileType: OnboardingProfileType.Department,
    Department: 'Information Technology',
    DocumentTypeIds: [], // Will be populated with: Employment Contract, NDA, IT Acceptable Use Policy
    AssetTypeIds: [], // Will be populated with: Laptop, Second Monitor, Docking Station, Headset, Security Token
    SystemAccessTypeIds: [], // Will be populated with: M365, AD, VPN, GitHub/GitLab, Cloud Console, CI/CD
    TrainingCourseIds: [], // Will be populated with: Security Awareness, IT Systems Overview, Developer Onboarding
    Icon: 'DeveloperTools',
    Color: '#005BAA',
    IsDefault: false,
    SortOrder: 1,
    IsActive: true,
  },
  {
    Title: 'HR Department',
    Description: 'Onboarding for Human Resources staff with HRIS access and people management tools',
    ProfileType: OnboardingProfileType.Department,
    Department: 'Human Resources',
    DocumentTypeIds: [],
    AssetTypeIds: [],
    SystemAccessTypeIds: [], // M365, AD, VPN, HRIS
    TrainingCourseIds: [], // HR Policies, Data Protection, Anti-Harassment
    Icon: 'People',
    Color: '#107c10',
    IsDefault: false,
    SortOrder: 2,
    IsActive: true,
  },
  {
    Title: 'Finance Department',
    Description: 'Onboarding for Finance team with ERP and financial system access',
    ProfileType: OnboardingProfileType.Department,
    Department: 'Finance',
    DocumentTypeIds: [],
    AssetTypeIds: [],
    SystemAccessTypeIds: [], // M365, AD, VPN, ERP, Finance System
    TrainingCourseIds: [], // Compliance, Data Protection
    Icon: 'Money',
    Color: '#8764b8',
    IsDefault: false,
    SortOrder: 3,
    IsActive: true,
  },
  {
    Title: 'Sales Department',
    Description: 'Onboarding for Sales team with CRM access and sales training',
    ProfileType: OnboardingProfileType.Department,
    Department: 'Sales',
    DocumentTypeIds: [],
    AssetTypeIds: [], // Laptop, Mobile Phone, Headset
    SystemAccessTypeIds: [], // M365, AD, VPN, CRM
    TrainingCourseIds: [], // Sales Methodology, CRM Training
    Icon: 'LineChart',
    Color: '#ea580c',
    IsDefault: false,
    SortOrder: 4,
    IsActive: true,
  },
  // Role-based Profiles
  {
    Title: 'Software Developer',
    Description: 'Full developer setup with coding tools, repositories, and technical training',
    ProfileType: OnboardingProfileType.Role,
    JobTitle: 'Software Developer',
    DocumentTypeIds: [],
    AssetTypeIds: [], // Laptop, Second Monitor, Docking Station, Headset
    SystemAccessTypeIds: [], // M365, AD, VPN, GitHub/GitLab, Cloud Console, CI/CD, Project Management
    TrainingCourseIds: [], // Security Awareness, Developer Onboarding, Git Training
    Icon: 'Code',
    Color: '#0078d4',
    IsDefault: false,
    SortOrder: 10,
    IsActive: true,
  },
  {
    Title: 'UX/UI Designer',
    Description: 'Designer setup with creative tools and collaboration software',
    ProfileType: OnboardingProfileType.Role,
    JobTitle: 'Designer',
    DocumentTypeIds: [],
    AssetTypeIds: [], // Laptop, Second Monitor, Tablet/iPad
    SystemAccessTypeIds: [], // M365, AD, VPN, Project Management
    TrainingCourseIds: [],
    Icon: 'Design',
    Color: '#ff6f61',
    IsDefault: false,
    SortOrder: 11,
    IsActive: true,
  },
  {
    Title: 'Administrative Assistant',
    Description: 'Standard office setup for administrative and support roles',
    ProfileType: OnboardingProfileType.Role,
    JobTitle: 'Administrative Assistant',
    DocumentTypeIds: [],
    AssetTypeIds: [], // Laptop, Monitor, Keyboard/Mouse
    SystemAccessTypeIds: [], // M365, AD, Corporate Intranet
    TrainingCourseIds: [], // M365 Essentials, Communication Tools
    Icon: 'ClipboardList',
    Color: '#6264a7',
    IsDefault: true, // Default profile for general use
    SortOrder: 12,
    IsActive: true,
  },
  {
    Title: 'Sales Representative',
    Description: 'Mobile-ready sales setup with CRM and communication tools',
    ProfileType: OnboardingProfileType.Role,
    JobTitle: 'Sales Representative',
    DocumentTypeIds: [],
    AssetTypeIds: [], // Laptop, Mobile Phone, Headset
    SystemAccessTypeIds: [], // M365, AD, VPN, CRM, Zoom/Webex
    TrainingCourseIds: [], // Sales Methodology, CRM Training
    Icon: 'Handshake',
    Color: '#ea580c',
    IsDefault: false,
    SortOrder: 13,
    IsActive: true,
  },
];

const DOCUMENT_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(DocumentCategory).map(c => ({ key: c, text: c }));
const ASSET_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(AssetCategory).map(c => ({ key: c, text: c }));
const SYSTEM_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(SystemAccessCategory).map(c => ({ key: c, text: c }));
const TRAINING_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(TrainingCategory).map(c => ({ key: c, text: c }));
const DELIVERY_METHOD_OPTIONS: IDropdownOption[] = Object.values(TrainingDeliveryMethod).map(c => ({ key: c, text: c }));
const PROFILE_TYPE_OPTIONS: IDropdownOption[] = Object.values(OnboardingProfileType).map(c => ({ key: c, text: c }));

export const OnboardingConfigAdmin: React.FC<IProps> = ({ sp }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('documents');
  const [loading, setLoading] = useState(true);

  // Data states
  const [documents, setDocuments] = useState<IDocumentType[]>([]);
  const [assets, setAssets] = useState<IAssetType[]>([]);
  const [systems, setSystems] = useState<ISystemAccessType[]>([]);
  const [training, setTraining] = useState<ITrainingCourse[]>([]);
  const [policyPacks, setPolicyPacks] = useState<IPolicyPack[]>([]);
  const [profiles, setProfiles] = useState<IOnboardingProfile[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);

  // Panel states
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create');
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Seed dialog states
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const service = new OnboardingConfigService(sp);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, ast, sys, trn, pol, prof, dept] = await Promise.all([
        service.getDocumentTypes(),
        service.getAssetTypes(),
        service.getSystemAccessTypes(),
        service.getTrainingCourses(),
        service.getPolicyPacks(),
        service.getOnboardingProfiles(),
        service.getDepartments(),
      ]);
      setDocuments(docs);
      setAssets(ast);
      setSystems(sys);
      setTraining(trn);
      setPolicyPacks(pol);
      setProfiles(prof);
      setDepartments(dept);
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error loading:', error);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs: { key: ConfigTab; label: string; icon: string; count: number }[] = [
    { key: 'documents', label: 'Document Types', icon: 'Document', count: documents.length },
    { key: 'assets', label: 'Asset Types', icon: 'DevicesApple', count: assets.length },
    { key: 'systems', label: 'System Access', icon: 'Cloud', count: systems.length },
    { key: 'training', label: 'Training Courses', icon: 'Education', count: training.length },
    { key: 'profiles', label: 'Onboarding Profiles', icon: 'UserOptional', count: profiles.length },
    { key: 'policyPacks', label: 'Policy Packs', icon: 'Package', count: policyPacks.length },
    { key: 'departments', label: 'Departments', icon: 'Org', count: departments.length },
  ];

  const openCreate = (): void => {
    setEditItem(getDefaultItem(activeTab));
    setPanelMode('create');
    setPanelOpen(true);
  };

  const openEdit = (item: any): void => {
    setEditItem({ ...item });
    setPanelMode('edit');
    setPanelOpen(true);
  };

  const confirmDelete = (item: any): void => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const getDefaultItem = (tab: ConfigTab): any => {
    switch (tab) {
      case 'documents': return { Title: '', Description: '', Category: DocumentCategory.HR, IsRequired: false, SortOrder: 0, IsActive: true };
      case 'assets': return { Title: '', Description: '', Category: AssetCategory.Hardware, EstimatedCost: 0, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, SortOrder: 0, IsActive: true };
      case 'systems': return { Title: '', Description: '', Category: SystemAccessCategory.Core, DefaultRole: '', RequiresApproval: false, SortOrder: 0, IsActive: true };
      case 'training': return { Title: '', Description: '', Category: TrainingCategory.Orientation, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1, IsMandatory: false, SortOrder: 0, IsActive: true };
      case 'profiles': return { Title: '', Description: '', ProfileType: OnboardingProfileType.Department, Department: '', JobTitle: '', DocumentTypeIds: [], AssetTypeIds: [], SystemAccessTypeIds: [], TrainingCourseIds: [], Icon: 'UserOptional', Color: '#005BAA', IsDefault: false, SortOrder: 0, IsActive: true };
      case 'policyPacks': return { Title: '', Description: '', Department: '', JobTitle: '', DocumentTypeIds: [], AssetTypeIds: [], SystemAccessTypeIds: [], TrainingCourseIds: [], IsDefault: false, SortOrder: 0, IsActive: true };
      case 'departments': return { Title: '', Code: '', CostCenter: '', IsActive: true };
      default: return {};
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!editItem?.Title) return;
    setSaving(true);
    try {
      switch (activeTab) {
        case 'documents':
          if (panelMode === 'create') await service.createDocumentType(editItem);
          else await service.updateDocumentType(editItem.Id, editItem);
          break;
        case 'assets':
          if (panelMode === 'create') await service.createAssetType(editItem);
          else await service.updateAssetType(editItem.Id, editItem);
          break;
        case 'systems':
          if (panelMode === 'create') await service.createSystemAccessType(editItem);
          else await service.updateSystemAccessType(editItem.Id, editItem);
          break;
        case 'training':
          if (panelMode === 'create') await service.createTrainingCourse(editItem);
          else await service.updateTrainingCourse(editItem.Id, editItem);
          break;
        case 'profiles':
          if (panelMode === 'create') await service.createOnboardingProfile(editItem);
          else await service.updateOnboardingProfile(editItem.Id, editItem);
          break;
        case 'policyPacks':
          if (panelMode === 'create') await service.createPolicyPack(editItem);
          else await service.updatePolicyPack(editItem.Id, editItem);
          break;
        case 'departments':
          if (panelMode === 'create') await service.createDepartment(editItem);
          else await service.updateDepartment(editItem.Id, editItem);
          break;
      }
      setPanelOpen(false);
      loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error saving:', error);
    }
    setSaving(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget?.Id) return;
    setDeleting(true);
    try {
      switch (activeTab) {
        case 'documents': await service.deleteDocumentType(deleteTarget.Id); break;
        case 'assets': await service.deleteAssetType(deleteTarget.Id); break;
        case 'systems': await service.deleteSystemAccessType(deleteTarget.Id); break;
        case 'training': await service.deleteTrainingCourse(deleteTarget.Id); break;
        case 'profiles': await service.deleteOnboardingProfile(deleteTarget.Id); break;
        case 'policyPacks': await service.deletePolicyPack(deleteTarget.Id); break;
        case 'departments': await service.deleteDepartment(deleteTarget.Id); break;
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error deleting:', error);
    }
    setDeleting(false);
  };

  const toggleActive = async (item: any): Promise<void> => {
    try {
      const updates = { IsActive: !item.IsActive };
      switch (activeTab) {
        case 'documents': await service.updateDocumentType(item.Id, updates); break;
        case 'assets': await service.updateAssetType(item.Id, updates); break;
        case 'systems': await service.updateSystemAccessType(item.Id, updates); break;
        case 'training': await service.updateTrainingCourse(item.Id, updates); break;
        case 'profiles': await service.updateOnboardingProfile(item.Id, updates); break;
        case 'policyPacks': await service.updatePolicyPack(item.Id, updates); break;
        case 'departments': await service.updateDepartment(item.Id, updates); break;
      }
      loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error toggling active:', error);
    }
  };

  const updateEditItem = (field: string, value: any): void => {
    setEditItem((prev: any) => ({ ...prev, [field]: value }));
  };

  // Check if any configuration data exists
  const hasExistingData = (): boolean => {
    return documents.length > 0 || assets.length > 0 || systems.length > 0 || training.length > 0 || profiles.length > 0 || departments.length > 0;
  };

  // Seed default data
  const handleSeedDefaults = async (): Promise<void> => {
    setSeeding(true);
    setSeedDialogOpen(false);
    try {
      // Seed in order: departments first (for profile references), then config items, then profiles
      console.log('[OnboardingConfigAdmin] Seeding departments...');
      for (const dept of DEFAULT_DEPARTMENTS) {
        await service.createDepartment(dept as any);
      }

      console.log('[OnboardingConfigAdmin] Seeding documents...');
      for (const doc of DEFAULT_DOCUMENTS) {
        await service.createDocumentType(doc as any);
      }

      console.log('[OnboardingConfigAdmin] Seeding assets...');
      for (const asset of DEFAULT_ASSETS) {
        await service.createAssetType(asset as any);
      }

      console.log('[OnboardingConfigAdmin] Seeding systems...');
      for (const sys of DEFAULT_SYSTEMS) {
        await service.createSystemAccessType(sys as any);
      }

      console.log('[OnboardingConfigAdmin] Seeding training courses...');
      for (const course of DEFAULT_TRAINING) {
        await service.createTrainingCourse(course as any);
      }

      console.log('[OnboardingConfigAdmin] Seeding onboarding profiles...');
      for (const profile of DEFAULT_PROFILES) {
        await service.createOnboardingProfile(profile as any);
      }

      console.log('[OnboardingConfigAdmin] Seeding complete!');
      await loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error seeding defaults:', error);
    }
    setSeeding(false);
  };

  const getCurrentData = (): any[] => {
    switch (activeTab) {
      case 'documents': return documents;
      case 'assets': return assets;
      case 'systems': return systems;
      case 'training': return training;
      case 'profiles': return profiles;
      case 'policyPacks': return policyPacks;
      case 'departments': return departments;
      default: return [];
    }
  };

  const renderTable = (): React.ReactElement => {
    const data = getCurrentData();
    if (data.length === 0) {
      return <div style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>No items configured. Click "Add New" to create one.</div>;
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #005BAA', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Title</th>
            {activeTab !== 'departments' && activeTab !== 'profiles' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Category</th>}
            {activeTab === 'departments' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Code</th>}
            {activeTab === 'profiles' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Type</th>}
            {activeTab === 'assets' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Cost</th>}
            {activeTab === 'training' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Duration</th>}
            {activeTab === 'policyPacks' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Department</th>}
            {activeTab === 'profiles' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Scope</th>}
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 80 }}>Active</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item: any) => (
            <tr key={item.Id} style={{ borderBottom: '1px solid #edebe9' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f8ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ fontWeight: 500 }}>{item.Title}</div>
                {item.Description && <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>{item.Description.substring(0, 60)}{item.Description.length > 60 ? '...' : ''}</div>}
              </td>
              {activeTab !== 'departments' && activeTab !== 'policyPacks' && activeTab !== 'profiles' && (
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#f3f2f1' }}>{item.Category || '\u2014'}</span>
                </td>
              )}
              {activeTab === 'departments' && <td style={{ padding: '10px 16px' }}>{item.Code || '\u2014'}</td>}
              {activeTab === 'profiles' && (
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: item.ProfileType === 'Department' ? '#e8f4fd' : '#fff3e0', color: item.ProfileType === 'Department' ? '#005BAA' : '#ea580c' }}>
                    {item.ProfileType}
                  </span>
                </td>
              )}
              {activeTab === 'assets' && <td style={{ padding: '10px 16px' }}>{item.EstimatedCost ? `$${item.EstimatedCost.toLocaleString()}` : '\u2014'}</td>}
              {activeTab === 'training' && <td style={{ padding: '10px 16px' }}>{item.DurationHours ? `${item.DurationHours}h` : '\u2014'}</td>}
              {activeTab === 'policyPacks' && <td style={{ padding: '10px 16px' }}>{item.Department || 'All'}</td>}
              {activeTab === 'profiles' && <td style={{ padding: '10px 16px' }}>{item.Department || item.JobTitle || 'General'}</td>}
              <td style={{ padding: '10px 16px' }}>
                <button
                  onClick={() => toggleActive(item)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                  title={item.IsActive ? 'Click to deactivate' : 'Click to activate'}
                >
                  <Icon iconName={item.IsActive ? 'CheckboxComposite' : 'Checkbox'} style={{ fontSize: 18, color: item.IsActive ? '#059669' : '#8a8886' }} />
                </button>
              </td>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(item)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                    <Icon iconName="Edit" style={{ fontSize: 14, color: '#605e5c' }} />
                  </button>
                  <button onClick={() => confirmDelete(item)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                    <Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderPanelContent = (): React.ReactElement | null => {
    if (!editItem) return null;

    switch (activeTab) {
      case 'documents':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={DOCUMENT_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <Toggle label="Required" checked={editItem.IsRequired} onChange={(_, c) => updateEditItem('IsRequired', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'assets':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={ASSET_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <SpinButton label="Estimated Cost ($)" value={String(editItem.EstimatedCost || 0)} min={0} max={100000} step={50} onChange={(_, v) => updateEditItem('EstimatedCost', parseFloat(v || '0'))} />
            <SpinButton label="Default Quantity" value={String(editItem.DefaultQuantity || 1)} min={1} max={100} onChange={(_, v) => updateEditItem('DefaultQuantity', parseInt(v || '1'))} />
            <SpinButton label="Lead Time (Days)" value={String(editItem.LeadTimeDays || 0)} min={0} max={90} onChange={(_, v) => updateEditItem('LeadTimeDays', parseInt(v || '0'))} />
            <Toggle label="Returnable" checked={editItem.IsReturnable} onChange={(_, c) => updateEditItem('IsReturnable', c)} />
            <Toggle label="Requires Approval" checked={editItem.RequiresApproval} onChange={(_, c) => updateEditItem('RequiresApproval', c)} />
            {editItem.RequiresApproval && (
              <SpinButton label="Approval Threshold ($)" value={String(editItem.ApprovalThreshold || 0)} min={0} max={100000} step={100} onChange={(_, v) => updateEditItem('ApprovalThreshold', parseFloat(v || '0'))} />
            )}
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'systems':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={SYSTEM_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <TextField label="Default Role" value={editItem.DefaultRole || ''} onChange={(_, v) => updateEditItem('DefaultRole', v)} />
            <SpinButton label="Monthly License Cost ($)" value={String(editItem.LicenseCostMonthly || 0)} min={0} max={10000} step={5} onChange={(_, v) => updateEditItem('LicenseCostMonthly', parseFloat(v || '0'))} />
            <TextField label="Provisioning Instructions" multiline rows={3} value={editItem.ProvisioningInstructions || ''} onChange={(_, v) => updateEditItem('ProvisioningInstructions', v)} />
            <TextField label="Deprovisioning Instructions" multiline rows={3} value={editItem.DeprovisioningInstructions || ''} onChange={(_, v) => updateEditItem('DeprovisioningInstructions', v)} />
            <Toggle label="Requires Approval" checked={editItem.RequiresApproval} onChange={(_, c) => updateEditItem('RequiresApproval', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'training':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={TRAINING_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <Dropdown label="Delivery Method" selectedKey={editItem.DeliveryMethod} options={DELIVERY_METHOD_OPTIONS} onChange={(_, o) => o && updateEditItem('DeliveryMethod', o.key)} />
            <SpinButton label="Duration (Hours)" value={String(editItem.DurationHours || 1)} min={0.5} max={100} step={0.5} onChange={(_, v) => updateEditItem('DurationHours', parseFloat(v || '1'))} />
            <TextField label="Provider" value={editItem.Provider || ''} onChange={(_, v) => updateEditItem('Provider', v)} />
            <TextField label="Content URL" value={editItem.ContentUrl || ''} onChange={(_, v) => updateEditItem('ContentUrl', v)} />
            <SpinButton label="Estimated Cost ($)" value={String(editItem.EstimatedCost || 0)} min={0} max={10000} step={25} onChange={(_, v) => updateEditItem('EstimatedCost', parseFloat(v || '0'))} />
            <SpinButton label="Expiration (Months)" value={String(editItem.ExpirationMonths || 0)} min={0} max={60} onChange={(_, v) => updateEditItem('ExpirationMonths', parseInt(v || '0'))} placeholder="0 = No expiration" />
            <Toggle label="Mandatory" checked={editItem.IsMandatory} onChange={(_, c) => updateEditItem('IsMandatory', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'profiles':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} placeholder="e.g., IT Department Profile, Software Developer" />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} placeholder="Describe what this profile includes and when to use it" />
            <Dropdown
              label="Profile Type"
              selectedKey={editItem.ProfileType}
              options={PROFILE_TYPE_OPTIONS}
              onChange={(_, o) => o && updateEditItem('ProfileType', o.key)}
            />
            {editItem.ProfileType === OnboardingProfileType.Department && (
              <Dropdown
                label="Department"
                selectedKey={editItem.Department || ''}
                options={[{ key: '', text: 'Select Department' }, ...departments.filter(d => d.IsActive).map(d => ({ key: d.Title, text: d.Title }))]}
                onChange={(_, o) => o && updateEditItem('Department', o.key)}
              />
            )}
            {editItem.ProfileType === OnboardingProfileType.Role && (
              <TextField label="Job Title/Role" value={editItem.JobTitle || ''} onChange={(_, v) => updateEditItem('JobTitle', v)} placeholder="e.g., Software Developer, Sales Representative" />
            )}
            <div style={{ marginTop: 8, marginBottom: 8, padding: 12, background: '#f9f9f9', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 8 }}>Configuration Bundles</div>
              <div style={{ fontSize: 11, color: '#605e5c', marginBottom: 12 }}>Select which items should be pre-selected when this profile is chosen during onboarding.</div>
            </div>
            <Dropdown
              label="Documents to Collect"
              multiSelect
              selectedKeys={editItem.DocumentTypeIds || []}
              options={documents.filter(d => d.IsActive).map(d => ({ key: d.Id!, text: d.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.DocumentTypeIds || [];
                  if (o.selected) updateEditItem('DocumentTypeIds', [...ids, o.key]);
                  else updateEditItem('DocumentTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Systems to Provision"
              multiSelect
              selectedKeys={editItem.SystemAccessTypeIds || []}
              options={systems.filter(s => s.IsActive).map(s => ({ key: s.Id!, text: s.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.SystemAccessTypeIds || [];
                  if (o.selected) updateEditItem('SystemAccessTypeIds', [...ids, o.key]);
                  else updateEditItem('SystemAccessTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Equipment to Assign"
              multiSelect
              selectedKeys={editItem.AssetTypeIds || []}
              options={assets.filter(a => a.IsActive).map(a => ({ key: a.Id!, text: a.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.AssetTypeIds || [];
                  if (o.selected) updateEditItem('AssetTypeIds', [...ids, o.key]);
                  else updateEditItem('AssetTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Training to Schedule"
              multiSelect
              selectedKeys={editItem.TrainingCourseIds || []}
              options={training.filter(t => t.IsActive).map(t => ({ key: t.Id!, text: t.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.TrainingCourseIds || [];
                  if (o.selected) updateEditItem('TrainingCourseIds', [...ids, o.key]);
                  else updateEditItem('TrainingCourseIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <TextField label="Icon Name" value={editItem.Icon || ''} onChange={(_, v) => updateEditItem('Icon', v)} placeholder="Fluent UI icon name (e.g., UserOptional)" />
            <TextField label="Color" value={editItem.Color || ''} onChange={(_, v) => updateEditItem('Color', v)} placeholder="Hex color (e.g., #005BAA)" />
            <Toggle label="Default Profile" checked={editItem.IsDefault} onChange={(_, c) => updateEditItem('IsDefault', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'policyPacks':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown
              label="Department"
              selectedKey={editItem.Department || ''}
              options={[{ key: '', text: 'All Departments' }, ...departments.filter(d => d.IsActive).map(d => ({ key: d.Title, text: d.Title }))]}
              onChange={(_, o) => o && updateEditItem('Department', o.key)}
            />
            <TextField label="Job Title (optional)" value={editItem.JobTitle || ''} onChange={(_, v) => updateEditItem('JobTitle', v)} placeholder="Leave empty for all job titles" />
            <Dropdown
              label="Document Types"
              multiSelect
              selectedKeys={editItem.DocumentTypeIds || []}
              options={documents.filter(d => d.IsActive).map(d => ({ key: d.Id!, text: d.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.DocumentTypeIds || [];
                  if (o.selected) updateEditItem('DocumentTypeIds', [...ids, o.key]);
                  else updateEditItem('DocumentTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Asset Types"
              multiSelect
              selectedKeys={editItem.AssetTypeIds || []}
              options={assets.filter(a => a.IsActive).map(a => ({ key: a.Id!, text: a.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.AssetTypeIds || [];
                  if (o.selected) updateEditItem('AssetTypeIds', [...ids, o.key]);
                  else updateEditItem('AssetTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="System Access Types"
              multiSelect
              selectedKeys={editItem.SystemAccessTypeIds || []}
              options={systems.filter(s => s.IsActive).map(s => ({ key: s.Id!, text: s.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.SystemAccessTypeIds || [];
                  if (o.selected) updateEditItem('SystemAccessTypeIds', [...ids, o.key]);
                  else updateEditItem('SystemAccessTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Training Courses"
              multiSelect
              selectedKeys={editItem.TrainingCourseIds || []}
              options={training.filter(t => t.IsActive).map(t => ({ key: t.Id!, text: t.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.TrainingCourseIds || [];
                  if (o.selected) updateEditItem('TrainingCourseIds', [...ids, o.key]);
                  else updateEditItem('TrainingCourseIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Toggle label="Default Pack" checked={editItem.IsDefault} onChange={(_, c) => updateEditItem('IsDefault', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'departments':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Code" value={editItem.Code || ''} onChange={(_, v) => updateEditItem('Code', v)} placeholder="e.g., HR, IT, FIN" />
            <TextField label="Cost Center" value={editItem.CostCenter || ''} onChange={(_, v) => updateEditItem('CostCenter', v)} />
            <Dropdown
              label="Default Policy Pack"
              selectedKey={editItem.DefaultPolicyPackId || ''}
              options={[{ key: '', text: 'None' }, ...policyPacks.filter(p => p.IsActive).map(p => ({ key: p.Id!, text: p.Title }))]}
              onChange={(_, o) => o && updateEditItem('DefaultPolicyPackId', o.key || null)}
            />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      default:
        return null;
    }
  };

  const getPanelTitle = (): string => {
    const action = panelMode === 'create' ? 'Add' : 'Edit';
    switch (activeTab) {
      case 'documents': return `${action} Document Type`;
      case 'assets': return `${action} Asset Type`;
      case 'systems': return `${action} System Access`;
      case 'training': return `${action} Training Course`;
      case 'profiles': return `${action} Onboarding Profile`;
      case 'policyPacks': return `${action} Policy Pack`;
      case 'departments': return `${action} Department`;
      default: return action;
    }
  };

  const onRenderPanelHeader = (): JSX.Element => (
    <div className={styles.panelHeader}>
      <div className={styles.panelIcon}>
        <Icon iconName={tabs.find(t => t.key === activeTab)?.icon || 'Settings'} style={{ fontSize: 20, color: '#fff' }} />
      </div>
      <div>
        <div className={styles.panelTitle}>{getPanelTitle()}</div>
        <div className={styles.panelSubtitle}>Onboarding Configuration</div>
      </div>
    </div>
  );

  const onRenderPanelFooter = (): JSX.Element => (
    <div className={styles.panelFooter}>
      <button className={styles.btnSecondary} onClick={() => setPanelOpen(false)}>Cancel</button>
      <button className={styles.btnPrimary} onClick={handleSave} disabled={saving || !editItem?.Title}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#605e5c' }}>Loading configuration...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Onboarding Configuration</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSeedDialogOpen(true)}
            disabled={seeding}
            style={{
              padding: '8px 16px', borderRadius: 4, border: '1px solid #005BAA', background: '#fff', color: '#005BAA',
              fontSize: 13, fontWeight: 600, cursor: seeding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              opacity: seeding ? 0.6 : 1,
            }}
          >
            <Icon iconName={seeding ? 'Sync' : 'DatabaseSync'} style={{ fontSize: 14 }} />
            {seeding ? 'Seeding...' : 'Seed Defaults'}
          </button>
          <button onClick={openCreate} style={{
            padding: '8px 20px', borderRadius: 4, border: 'none', background: '#005BAA', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon iconName="Add" style={{ fontSize: 14 }} /> Add New
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #edebe9', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#005BAA' : '#605e5c',
            borderBottom: activeTab === tab.key ? '2px solid #005BAA' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon iconName={tab.icon} style={{ fontSize: 14 }} />
            {tab.label}
            <span style={{
              padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600,
              background: activeTab === tab.key ? '#005BAA' : '#edebe9',
              color: activeTab === tab.key ? '#fff' : '#605e5c',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Data table */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {renderTable()}
      </div>

      {/* Edit Panel */}
      <Panel
        isOpen={panelOpen}
        type={PanelType.medium}
        onDismiss={() => setPanelOpen(false)}
        hasCloseButton={false}
        onRenderHeader={onRenderPanelHeader}
        onRenderFooterContent={onRenderPanelFooter}
        isFooterAtBottom={true}
        className={styles.rmPanel}
      >
        <div className={styles.panelBody} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderPanelContent()}
        </div>
      </Panel>

      {/* Delete Dialog */}
      <Dialog
        hidden={!deleteDialogOpen}
        onDismiss={() => setDeleteDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Item',
          subText: `Are you sure you want to delete "${deleteTarget?.Title}"? This action cannot be undone.`,
        }}
      >
        <DialogFooter>
          <DefaultButton onClick={() => setDeleteDialogOpen(false)} text="Cancel" />
          <PrimaryButton onClick={handleDelete} text={deleting ? 'Deleting...' : 'Delete'} disabled={deleting}
            styles={{ root: { background: '#d13438', border: 'none' }, rootHovered: { background: '#a4262c' } }} />
        </DialogFooter>
      </Dialog>

      {/* Seed Defaults Confirmation Dialog */}
      <Dialog
        hidden={!seedDialogOpen}
        onDismiss={() => setSeedDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Seed Default Configuration',
          subText: hasExistingData()
            ? 'Configuration data already exists. Seeding will ADD new default items alongside existing data. This includes documents, assets, systems, training courses, onboarding profiles, and departments. Continue?'
            : 'This will populate all configuration tabs with default items for a typical organization. This includes:\n\n• 17 Document Types\n• 18 Asset Types\n• 17 System Access Types\n• 19 Training Courses\n• 8 Onboarding Profiles\n• 11 Departments\n\nContinue with seeding?',
        }}
      >
        <DialogFooter>
          <DefaultButton onClick={() => setSeedDialogOpen(false)} text="Cancel" />
          <PrimaryButton
            onClick={handleSeedDefaults}
            text="Seed Defaults"
            styles={{ root: { background: '#005BAA', border: 'none' }, rootHovered: { background: '#004A8F' } }}
          />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
