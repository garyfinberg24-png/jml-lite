// Onboarding Configuration Models for DWx Recruitment Manager
// Configurable document types, assets, systems, training, and policy packs

export enum DocumentCategory {
  HR = 'HR',
  Finance = 'Finance',
  Compliance = 'Compliance',
  Legal = 'Legal',
  IT = 'IT'
}

export enum AssetCategory {
  Hardware = 'Hardware',
  Software = 'Software',
  Furniture = 'Furniture',
  Access = 'Access',
  Other = 'Other'
}

export enum SystemAccessCategory {
  Core = 'Core',
  Department = 'Department',
  Optional = 'Optional',
  Admin = 'Admin'
}

export enum TrainingCategory {
  Orientation = 'Orientation',
  Safety = 'Safety',
  Compliance = 'Compliance',
  Technical = 'Technical',
  SoftSkills = 'Soft Skills'
}

export enum TrainingDeliveryMethod {
  InPerson = 'In-Person',
  OnlineSelfPaced = 'Online Self-Paced',
  OnlineLive = 'Online Live',
  Blended = 'Blended'
}

export interface IDocumentType {
  Id?: number;
  Title: string;
  Description?: string;
  Category?: DocumentCategory;
  IsRequired: boolean;
  RequiredForDepartments?: string[];
  SortOrder: number;
  IsActive: boolean;
  Created?: Date;
  Modified?: Date;
}

export interface IAssetType {
  Id?: number;
  Title: string;
  Description?: string;
  Category: AssetCategory;
  EstimatedCost?: number;
  IsReturnable: boolean;
  DefaultQuantity: number;
  RequiresApproval: boolean;
  ApprovalThreshold?: number;
  LeadTimeDays?: number;
  SortOrder: number;
  IsActive: boolean;
  Created?: Date;
  Modified?: Date;
}

export interface ISystemAccessType {
  Id?: number;
  Title: string;
  Description?: string;
  Category?: SystemAccessCategory;
  DefaultRole?: string;
  AvailableRoles?: string[];
  LicenseCostMonthly?: number;
  ProvisioningInstructions?: string;
  DeprovisioningInstructions?: string;
  RequiresApproval: boolean;
  SortOrder: number;
  IsActive: boolean;
  Created?: Date;
  Modified?: Date;
}

export interface ITrainingCourse {
  Id?: number;
  Title: string;
  Description?: string;
  Category?: TrainingCategory;
  DeliveryMethod?: TrainingDeliveryMethod;
  DurationHours?: number;
  IsMandatory: boolean;
  MandatoryForDepartments?: string[];
  ExpirationMonths?: number;
  ContentUrl?: string;
  Provider?: string;
  EstimatedCost?: number;
  SortOrder: number;
  IsActive: boolean;
  Created?: Date;
  Modified?: Date;
}

export interface IPolicyPack {
  Id?: number;
  Title: string;
  Description?: string;
  Department?: string;
  JobTitle?: string;
  DocumentTypeIds: number[];
  AssetTypeIds: number[];
  SystemAccessTypeIds: number[];
  TrainingCourseIds: number[];
  IsDefault: boolean;
  SortOrder: number;
  IsActive: boolean;
  Created?: Date;
  Modified?: Date;
}

export interface IDepartment {
  Id?: number;
  Title: string;
  Code?: string;
  ManagerId?: number;
  DefaultPolicyPackId?: number;
  CostCenter?: string;
  IsActive: boolean;
  Created?: Date;
  Modified?: Date;
}

// Resolved policy pack with full objects instead of IDs
export interface IResolvedPolicyPack {
  policyPack: IPolicyPack;
  documents: IDocumentType[];
  assets: IAssetType[];
  systems: ISystemAccessType[];
  training: ITrainingCourse[];
}
