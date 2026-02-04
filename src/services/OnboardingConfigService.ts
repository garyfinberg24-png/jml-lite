// Onboarding Configuration Service — Manages document types, asset types, systems, training, policy packs
// Decoupled from JML — uses RM_LISTS constants

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { RM_LISTS } from '../constants/SharePointListNames';
import {
  IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse,
  IPolicyPack, IDepartment, IResolvedPolicyPack,
  IOnboardingProfile, IResolvedOnboardingProfile, OnboardingProfileType,
  DocumentCategory, AssetCategory, SystemAccessCategory, TrainingCategory, TrainingDeliveryMethod
} from '../models/IOnboardingConfig';
import { sanitizeForOData, sanitizeNumberForOData, truncateToLength } from '../utils/validation';

export class OnboardingConfigService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT TYPES
  // ═══════════════════════════════════════════════════════════════

  public async getDocumentTypes(filters?: { isActive?: boolean; category?: DocumentCategory }): Promise<IDocumentType[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.isActive !== undefined) {
        filterParts.push(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }
      if (filters?.category) {
        // Sanitize category to prevent OData injection
        filterParts.push(`Category eq '${sanitizeForOData(filters.category)}'`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.DOCUMENT_TYPES).items
        .select('Id', 'Title', 'Description', 'Category', 'IsRequired', 'RequiredForDepartments', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .orderBy('SortOrder', true);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapDocumentTypeFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting document types:', error);
      return [];
    }
  }

  public async createDocumentType(data: Partial<IDocumentType>): Promise<IDocumentType | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.DOCUMENT_TYPES).items.add({
        Title: truncateToLength(data.Title, 255),
        Description: truncateToLength(data.Description, 5000),
        Category: data.Category,
        IsRequired: data.IsRequired ?? false,
        RequiredForDepartments: data.RequiredForDepartments ? JSON.stringify(data.RequiredForDepartments) : null,
        SortOrder: sanitizeNumberForOData(data.SortOrder) ?? 0,
        IsActive: data.IsActive ?? true,
      });
      return this.mapDocumentTypeFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating document type:', error);
      return null;
    }
  }

  public async updateDocumentType(id: number, updates: Partial<IDocumentType>): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.Title !== undefined) updateData.Title = updates.Title;
      if (updates.Description !== undefined) updateData.Description = updates.Description;
      if (updates.Category !== undefined) updateData.Category = updates.Category;
      if (updates.IsRequired !== undefined) updateData.IsRequired = updates.IsRequired;
      if (updates.RequiredForDepartments !== undefined) {
        updateData.RequiredForDepartments = JSON.stringify(updates.RequiredForDepartments);
      }
      if (updates.SortOrder !== undefined) updateData.SortOrder = updates.SortOrder;
      if (updates.IsActive !== undefined) updateData.IsActive = updates.IsActive;

      await this.sp.web.lists.getByTitle(RM_LISTS.DOCUMENT_TYPES).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating document type:', error);
      return false;
    }
  }

  public async deleteDocumentType(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.DOCUMENT_TYPES).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting document type:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ASSET TYPES
  // ═══════════════════════════════════════════════════════════════

  public async getAssetTypes(filters?: { isActive?: boolean; category?: AssetCategory }): Promise<IAssetType[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.isActive !== undefined) {
        filterParts.push(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }
      if (filters?.category) {
        // Sanitize category to prevent OData injection
        filterParts.push(`Category eq '${sanitizeForOData(filters.category)}'`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.ASSET_TYPES).items
        .select('Id', 'Title', 'Description', 'Category', 'EstimatedCost', 'IsReturnable', 'DefaultQuantity', 'RequiresApproval', 'ApprovalThreshold', 'LeadTimeDays', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .orderBy('SortOrder', true);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapAssetTypeFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting asset types:', error);
      return [];
    }
  }

  public async createAssetType(data: Partial<IAssetType>): Promise<IAssetType | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_TYPES).items.add({
        Title: truncateToLength(data.Title, 255),
        Description: truncateToLength(data.Description, 5000),
        Category: data.Category,
        EstimatedCost: data.EstimatedCost ? sanitizeNumberForOData(data.EstimatedCost) : undefined,
        IsReturnable: data.IsReturnable ?? true,
        DefaultQuantity: sanitizeNumberForOData(data.DefaultQuantity) ?? 1,
        RequiresApproval: data.RequiresApproval ?? false,
        ApprovalThreshold: data.ApprovalThreshold ? sanitizeNumberForOData(data.ApprovalThreshold) : undefined,
        LeadTimeDays: data.LeadTimeDays ? sanitizeNumberForOData(data.LeadTimeDays) : undefined,
        SortOrder: sanitizeNumberForOData(data.SortOrder) ?? 0,
        IsActive: data.IsActive ?? true,
      });
      return this.mapAssetTypeFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating asset type:', error);
      return null;
    }
  }

  public async updateAssetType(id: number, updates: Partial<IAssetType>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = ['Title', 'Description', 'Category', 'EstimatedCost', 'IsReturnable', 'DefaultQuantity', 'RequiresApproval', 'ApprovalThreshold', 'LeadTimeDays', 'SortOrder', 'IsActive'];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_TYPES).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating asset type:', error);
      return false;
    }
  }

  public async deleteAssetType(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_TYPES).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting asset type:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM ACCESS TYPES
  // ═══════════════════════════════════════════════════════════════

  public async getSystemAccessTypes(filters?: { isActive?: boolean; category?: SystemAccessCategory }): Promise<ISystemAccessType[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.isActive !== undefined) {
        filterParts.push(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }
      if (filters?.category) {
        // Sanitize category to prevent OData injection
        filterParts.push(`Category eq '${sanitizeForOData(filters.category)}'`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.SYSTEM_ACCESS_TYPES).items
        .select('Id', 'Title', 'Description', 'Category', 'DefaultRole', 'AvailableRoles', 'LicenseCostMonthly', 'ProvisioningInstructions', 'DeprovisioningInstructions', 'RequiresApproval', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .orderBy('SortOrder', true);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapSystemAccessTypeFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting system access types:', error);
      return [];
    }
  }

  public async createSystemAccessType(data: Partial<ISystemAccessType>): Promise<ISystemAccessType | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.SYSTEM_ACCESS_TYPES).items.add({
        Title: truncateToLength(data.Title, 255),
        Description: truncateToLength(data.Description, 5000),
        Category: data.Category,
        DefaultRole: truncateToLength(data.DefaultRole, 255),
        AvailableRoles: data.AvailableRoles ? JSON.stringify(data.AvailableRoles) : null,
        LicenseCostMonthly: data.LicenseCostMonthly ? sanitizeNumberForOData(data.LicenseCostMonthly) : undefined,
        ProvisioningInstructions: truncateToLength(data.ProvisioningInstructions, 5000),
        DeprovisioningInstructions: truncateToLength(data.DeprovisioningInstructions, 5000),
        RequiresApproval: data.RequiresApproval ?? false,
        SortOrder: sanitizeNumberForOData(data.SortOrder) ?? 0,
        IsActive: data.IsActive ?? true,
      });
      return this.mapSystemAccessTypeFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating system access type:', error);
      return null;
    }
  }

  public async updateSystemAccessType(id: number, updates: Partial<ISystemAccessType>): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.Title !== undefined) updateData.Title = updates.Title;
      if (updates.Description !== undefined) updateData.Description = updates.Description;
      if (updates.Category !== undefined) updateData.Category = updates.Category;
      if (updates.DefaultRole !== undefined) updateData.DefaultRole = updates.DefaultRole;
      if (updates.AvailableRoles !== undefined) updateData.AvailableRoles = JSON.stringify(updates.AvailableRoles);
      if (updates.LicenseCostMonthly !== undefined) updateData.LicenseCostMonthly = updates.LicenseCostMonthly;
      if (updates.ProvisioningInstructions !== undefined) updateData.ProvisioningInstructions = updates.ProvisioningInstructions;
      if (updates.DeprovisioningInstructions !== undefined) updateData.DeprovisioningInstructions = updates.DeprovisioningInstructions;
      if (updates.RequiresApproval !== undefined) updateData.RequiresApproval = updates.RequiresApproval;
      if (updates.SortOrder !== undefined) updateData.SortOrder = updates.SortOrder;
      if (updates.IsActive !== undefined) updateData.IsActive = updates.IsActive;

      await this.sp.web.lists.getByTitle(RM_LISTS.SYSTEM_ACCESS_TYPES).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating system access type:', error);
      return false;
    }
  }

  public async deleteSystemAccessType(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.SYSTEM_ACCESS_TYPES).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting system access type:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRAINING COURSES
  // ═══════════════════════════════════════════════════════════════

  public async getTrainingCourses(filters?: { isActive?: boolean; category?: TrainingCategory }): Promise<ITrainingCourse[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.isActive !== undefined) {
        filterParts.push(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }
      if (filters?.category) {
        // Sanitize category to prevent OData injection
        filterParts.push(`Category eq '${sanitizeForOData(filters.category)}'`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.TRAINING_COURSES).items
        .select('Id', 'Title', 'Description', 'Category', 'DeliveryMethod', 'DurationHours', 'IsMandatory', 'MandatoryForDepartments', 'ExpirationMonths', 'ContentUrl', 'Provider', 'EstimatedCost', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .orderBy('SortOrder', true);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapTrainingCourseFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting training courses:', error);
      return [];
    }
  }

  public async createTrainingCourse(data: Partial<ITrainingCourse>): Promise<ITrainingCourse | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.TRAINING_COURSES).items.add({
        Title: truncateToLength(data.Title, 255),
        Description: truncateToLength(data.Description, 5000),
        Category: data.Category,
        DeliveryMethod: data.DeliveryMethod,
        DurationHours: data.DurationHours ? sanitizeNumberForOData(data.DurationHours) : undefined,
        IsMandatory: data.IsMandatory ?? false,
        MandatoryForDepartments: data.MandatoryForDepartments ? JSON.stringify(data.MandatoryForDepartments) : null,
        ExpirationMonths: data.ExpirationMonths ? sanitizeNumberForOData(data.ExpirationMonths) : undefined,
        ContentUrl: truncateToLength(data.ContentUrl, 500),
        Provider: truncateToLength(data.Provider, 255),
        EstimatedCost: data.EstimatedCost ? sanitizeNumberForOData(data.EstimatedCost) : undefined,
        SortOrder: sanitizeNumberForOData(data.SortOrder) ?? 0,
        IsActive: data.IsActive ?? true,
      });
      return this.mapTrainingCourseFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating training course:', error);
      return null;
    }
  }

  public async updateTrainingCourse(id: number, updates: Partial<ITrainingCourse>): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.Title !== undefined) updateData.Title = updates.Title;
      if (updates.Description !== undefined) updateData.Description = updates.Description;
      if (updates.Category !== undefined) updateData.Category = updates.Category;
      if (updates.DeliveryMethod !== undefined) updateData.DeliveryMethod = updates.DeliveryMethod;
      if (updates.DurationHours !== undefined) updateData.DurationHours = updates.DurationHours;
      if (updates.IsMandatory !== undefined) updateData.IsMandatory = updates.IsMandatory;
      if (updates.MandatoryForDepartments !== undefined) {
        updateData.MandatoryForDepartments = JSON.stringify(updates.MandatoryForDepartments);
      }
      if (updates.ExpirationMonths !== undefined) updateData.ExpirationMonths = updates.ExpirationMonths;
      if (updates.ContentUrl !== undefined) updateData.ContentUrl = updates.ContentUrl;
      if (updates.Provider !== undefined) updateData.Provider = updates.Provider;
      if (updates.EstimatedCost !== undefined) updateData.EstimatedCost = updates.EstimatedCost;
      if (updates.SortOrder !== undefined) updateData.SortOrder = updates.SortOrder;
      if (updates.IsActive !== undefined) updateData.IsActive = updates.IsActive;

      await this.sp.web.lists.getByTitle(RM_LISTS.TRAINING_COURSES).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating training course:', error);
      return false;
    }
  }

  public async deleteTrainingCourse(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.TRAINING_COURSES).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting training course:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POLICY PACKS
  // ═══════════════════════════════════════════════════════════════

  public async getPolicyPacks(filters?: { isActive?: boolean; department?: string }): Promise<IPolicyPack[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.isActive !== undefined) {
        filterParts.push(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }
      if (filters?.department) {
        // Sanitize department to prevent OData injection
        filterParts.push(`Department eq '${sanitizeForOData(filters.department)}'`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.POLICY_PACKS).items
        .select('Id', 'Title', 'Description', 'Department', 'JobTitle', 'DocumentTypeIds', 'AssetTypeIds', 'SystemAccessTypeIds', 'TrainingCourseIds', 'IsDefault', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .orderBy('SortOrder', true);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapPolicyPackFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting policy packs:', error);
      return [];
    }
  }

  public async getPolicyPackById(id: number): Promise<IPolicyPack | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(RM_LISTS.POLICY_PACKS).items
        .getById(id)
        .select('Id', 'Title', 'Description', 'Department', 'JobTitle', 'DocumentTypeIds', 'AssetTypeIds', 'SystemAccessTypeIds', 'TrainingCourseIds', 'IsDefault', 'SortOrder', 'IsActive', 'Created', 'Modified')();
      return this.mapPolicyPackFromSP(item);
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting policy pack by id:', error);
      return null;
    }
  }

  public async createPolicyPack(data: Partial<IPolicyPack>): Promise<IPolicyPack | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.POLICY_PACKS).items.add({
        Title: truncateToLength(data.Title, 255),
        Description: truncateToLength(data.Description, 5000),
        Department: truncateToLength(data.Department, 255),
        JobTitle: truncateToLength(data.JobTitle, 255),
        DocumentTypeIds: data.DocumentTypeIds ? JSON.stringify(data.DocumentTypeIds) : '[]',
        AssetTypeIds: data.AssetTypeIds ? JSON.stringify(data.AssetTypeIds) : '[]',
        SystemAccessTypeIds: data.SystemAccessTypeIds ? JSON.stringify(data.SystemAccessTypeIds) : '[]',
        TrainingCourseIds: data.TrainingCourseIds ? JSON.stringify(data.TrainingCourseIds) : '[]',
        IsDefault: data.IsDefault ?? false,
        SortOrder: sanitizeNumberForOData(data.SortOrder) ?? 0,
        IsActive: data.IsActive ?? true,
      });
      return this.mapPolicyPackFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating policy pack:', error);
      return null;
    }
  }

  public async updatePolicyPack(id: number, updates: Partial<IPolicyPack>): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.Title !== undefined) updateData.Title = updates.Title;
      if (updates.Description !== undefined) updateData.Description = updates.Description;
      if (updates.Department !== undefined) updateData.Department = updates.Department;
      if (updates.JobTitle !== undefined) updateData.JobTitle = updates.JobTitle;
      if (updates.DocumentTypeIds !== undefined) updateData.DocumentTypeIds = JSON.stringify(updates.DocumentTypeIds);
      if (updates.AssetTypeIds !== undefined) updateData.AssetTypeIds = JSON.stringify(updates.AssetTypeIds);
      if (updates.SystemAccessTypeIds !== undefined) updateData.SystemAccessTypeIds = JSON.stringify(updates.SystemAccessTypeIds);
      if (updates.TrainingCourseIds !== undefined) updateData.TrainingCourseIds = JSON.stringify(updates.TrainingCourseIds);
      if (updates.IsDefault !== undefined) updateData.IsDefault = updates.IsDefault;
      if (updates.SortOrder !== undefined) updateData.SortOrder = updates.SortOrder;
      if (updates.IsActive !== undefined) updateData.IsActive = updates.IsActive;

      await this.sp.web.lists.getByTitle(RM_LISTS.POLICY_PACKS).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating policy pack:', error);
      return false;
    }
  }

  public async deletePolicyPack(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.POLICY_PACKS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting policy pack:', error);
      return false;
    }
  }

  public async getFullPolicyPack(packId: number): Promise<IResolvedPolicyPack | null> {
    try {
      const pack = await this.getPolicyPackById(packId);
      if (!pack) return null;

      const [allDocs, allAssets, allSystems, allTraining] = await Promise.all([
        this.getDocumentTypes({ isActive: true }),
        this.getAssetTypes({ isActive: true }),
        this.getSystemAccessTypes({ isActive: true }),
        this.getTrainingCourses({ isActive: true }),
      ]);

      return {
        policyPack: pack,
        documents: allDocs.filter(d => d.Id && pack.DocumentTypeIds.includes(d.Id)),
        assets: allAssets.filter(a => a.Id && pack.AssetTypeIds.includes(a.Id)),
        systems: allSystems.filter(s => s.Id && pack.SystemAccessTypeIds.includes(s.Id)),
        training: allTraining.filter(t => t.Id && pack.TrainingCourseIds.includes(t.Id)),
      };
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting full policy pack:', error);
      return null;
    }
  }

  public async getDefaultPolicyPack(): Promise<IPolicyPack | null> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.POLICY_PACKS).items
        .select('Id', 'Title', 'Description', 'Department', 'JobTitle', 'DocumentTypeIds', 'AssetTypeIds', 'SystemAccessTypeIds', 'TrainingCourseIds', 'IsDefault', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .filter('IsDefault eq 1 and IsActive eq 1')
        .top(1)();
      return items.length > 0 ? this.mapPolicyPackFromSP(items[0]) : null;
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting default policy pack:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPARTMENTS
  // ═══════════════════════════════════════════════════════════════

  public async getDepartments(filters?: { isActive?: boolean }): Promise<IDepartment[]> {
    try {
      let query = this.sp.web.lists.getByTitle(RM_LISTS.DEPARTMENTS).items
        .select('Id', 'Title', 'Code', 'ManagerId', 'DefaultPolicyPackId', 'CostCenter', 'IsActive', 'Created', 'Modified')
        .orderBy('Title', true);

      if (filters?.isActive !== undefined) {
        query = query.filter(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapDepartmentFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting departments:', error);
      return [];
    }
  }

  public async createDepartment(data: Partial<IDepartment>): Promise<IDepartment | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.DEPARTMENTS).items.add({
        Title: truncateToLength(data.Title, 255),
        Code: truncateToLength(data.Code, 50),
        ManagerId: data.ManagerId ? sanitizeNumberForOData(data.ManagerId) : undefined,
        DefaultPolicyPackId: data.DefaultPolicyPackId ? sanitizeNumberForOData(data.DefaultPolicyPackId) : undefined,
        CostCenter: truncateToLength(data.CostCenter, 100),
        IsActive: data.IsActive ?? true,
      });
      return this.mapDepartmentFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating department:', error);
      return null;
    }
  }

  public async updateDepartment(id: number, updates: Partial<IDepartment>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = ['Title', 'Code', 'ManagerId', 'DefaultPolicyPackId', 'CostCenter', 'IsActive'];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.DEPARTMENTS).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating department:', error);
      return false;
    }
  }

  public async deleteDepartment(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.DEPARTMENTS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting department:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING PROFILES
  // ═══════════════════════════════════════════════════════════════

  public async getOnboardingProfiles(filters?: { isActive?: boolean; profileType?: OnboardingProfileType; department?: string }): Promise<IOnboardingProfile[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.isActive !== undefined) {
        filterParts.push(`IsActive eq ${filters.isActive ? 1 : 0}`);
      }
      if (filters?.profileType) {
        filterParts.push(`ProfileType eq '${sanitizeForOData(filters.profileType)}'`);
      }
      if (filters?.department) {
        filterParts.push(`Department eq '${sanitizeForOData(filters.department)}'`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_PROFILES).items
        .select('Id', 'Title', 'Description', 'ProfileType', 'Department', 'JobTitle', 'DocumentTypeIds', 'AssetTypeIds', 'SystemAccessTypeIds', 'TrainingCourseIds', 'Icon', 'Color', 'IsDefault', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .orderBy('SortOrder', true);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapOnboardingProfileFromSP(item));
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting onboarding profiles:', error);
      return [];
    }
  }

  public async getOnboardingProfileById(id: number): Promise<IOnboardingProfile | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_PROFILES).items
        .getById(id)
        .select('Id', 'Title', 'Description', 'ProfileType', 'Department', 'JobTitle', 'DocumentTypeIds', 'AssetTypeIds', 'SystemAccessTypeIds', 'TrainingCourseIds', 'Icon', 'Color', 'IsDefault', 'SortOrder', 'IsActive', 'Created', 'Modified')();
      return this.mapOnboardingProfileFromSP(item);
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting onboarding profile by id:', error);
      return null;
    }
  }

  public async createOnboardingProfile(data: Partial<IOnboardingProfile>): Promise<IOnboardingProfile | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_PROFILES).items.add({
        Title: truncateToLength(data.Title, 255),
        Description: truncateToLength(data.Description, 5000),
        ProfileType: data.ProfileType || OnboardingProfileType.Department,
        Department: truncateToLength(data.Department, 255),
        JobTitle: truncateToLength(data.JobTitle, 255),
        DocumentTypeIds: data.DocumentTypeIds ? JSON.stringify(data.DocumentTypeIds) : '[]',
        AssetTypeIds: data.AssetTypeIds ? JSON.stringify(data.AssetTypeIds) : '[]',
        SystemAccessTypeIds: data.SystemAccessTypeIds ? JSON.stringify(data.SystemAccessTypeIds) : '[]',
        TrainingCourseIds: data.TrainingCourseIds ? JSON.stringify(data.TrainingCourseIds) : '[]',
        Icon: truncateToLength(data.Icon, 50),
        Color: truncateToLength(data.Color, 20),
        IsDefault: data.IsDefault ?? false,
        SortOrder: sanitizeNumberForOData(data.SortOrder) ?? 0,
        IsActive: data.IsActive ?? true,
      });
      return this.mapOnboardingProfileFromSP(result);
    } catch (error) {
      console.error('[OnboardingConfigService] Error creating onboarding profile:', error);
      return null;
    }
  }

  public async updateOnboardingProfile(id: number, updates: Partial<IOnboardingProfile>): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.Title !== undefined) updateData.Title = updates.Title;
      if (updates.Description !== undefined) updateData.Description = updates.Description;
      if (updates.ProfileType !== undefined) updateData.ProfileType = updates.ProfileType;
      if (updates.Department !== undefined) updateData.Department = updates.Department;
      if (updates.JobTitle !== undefined) updateData.JobTitle = updates.JobTitle;
      if (updates.DocumentTypeIds !== undefined) updateData.DocumentTypeIds = JSON.stringify(updates.DocumentTypeIds);
      if (updates.AssetTypeIds !== undefined) updateData.AssetTypeIds = JSON.stringify(updates.AssetTypeIds);
      if (updates.SystemAccessTypeIds !== undefined) updateData.SystemAccessTypeIds = JSON.stringify(updates.SystemAccessTypeIds);
      if (updates.TrainingCourseIds !== undefined) updateData.TrainingCourseIds = JSON.stringify(updates.TrainingCourseIds);
      if (updates.Icon !== undefined) updateData.Icon = updates.Icon;
      if (updates.Color !== undefined) updateData.Color = updates.Color;
      if (updates.IsDefault !== undefined) updateData.IsDefault = updates.IsDefault;
      if (updates.SortOrder !== undefined) updateData.SortOrder = updates.SortOrder;
      if (updates.IsActive !== undefined) updateData.IsActive = updates.IsActive;

      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_PROFILES).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error updating onboarding profile:', error);
      return false;
    }
  }

  public async deleteOnboardingProfile(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_PROFILES).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingConfigService] Error deleting onboarding profile:', error);
      return false;
    }
  }

  public async getResolvedOnboardingProfile(profileId: number): Promise<IResolvedOnboardingProfile | null> {
    try {
      const profile = await this.getOnboardingProfileById(profileId);
      if (!profile) return null;

      const [allDocs, allAssets, allSystems, allTraining] = await Promise.all([
        this.getDocumentTypes({ isActive: true }),
        this.getAssetTypes({ isActive: true }),
        this.getSystemAccessTypes({ isActive: true }),
        this.getTrainingCourses({ isActive: true }),
      ]);

      return {
        profile,
        documents: allDocs.filter(d => d.Id && profile.DocumentTypeIds.includes(d.Id)),
        assets: allAssets.filter(a => a.Id && profile.AssetTypeIds.includes(a.Id)),
        systems: allSystems.filter(s => s.Id && profile.SystemAccessTypeIds.includes(s.Id)),
        training: allTraining.filter(t => t.Id && profile.TrainingCourseIds.includes(t.Id)),
      };
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting resolved onboarding profile:', error);
      return null;
    }
  }

  public async getDefaultOnboardingProfile(): Promise<IOnboardingProfile | null> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_PROFILES).items
        .select('Id', 'Title', 'Description', 'ProfileType', 'Department', 'JobTitle', 'DocumentTypeIds', 'AssetTypeIds', 'SystemAccessTypeIds', 'TrainingCourseIds', 'Icon', 'Color', 'IsDefault', 'SortOrder', 'IsActive', 'Created', 'Modified')
        .filter('IsDefault eq 1 and IsActive eq 1')
        .top(1)();
      return items.length > 0 ? this.mapOnboardingProfileFromSP(items[0]) : null;
    } catch (error) {
      console.error('[OnboardingConfigService] Error getting default onboarding profile:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPERS
  // ═══════════════════════════════════════════════════════════════

  private mapDocumentTypeFromSP(item: any): IDocumentType {
    let requiredForDepts: string[] = [];
    try {
      if (item.RequiredForDepartments) {
        requiredForDepts = JSON.parse(item.RequiredForDepartments);
      }
    } catch { /* ignore */ }

    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      Category: item.Category as DocumentCategory,
      IsRequired: item.IsRequired ?? false,
      RequiredForDepartments: requiredForDepts,
      SortOrder: item.SortOrder ?? 0,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapAssetTypeFromSP(item: any): IAssetType {
    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      Category: (item.Category as AssetCategory) || AssetCategory.Other,
      EstimatedCost: item.EstimatedCost,
      IsReturnable: item.IsReturnable ?? true,
      DefaultQuantity: item.DefaultQuantity ?? 1,
      RequiresApproval: item.RequiresApproval ?? false,
      ApprovalThreshold: item.ApprovalThreshold,
      LeadTimeDays: item.LeadTimeDays,
      SortOrder: item.SortOrder ?? 0,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapSystemAccessTypeFromSP(item: any): ISystemAccessType {
    let availableRoles: string[] = [];
    try {
      if (item.AvailableRoles) {
        availableRoles = JSON.parse(item.AvailableRoles);
      }
    } catch { /* ignore */ }

    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      Category: item.Category as SystemAccessCategory,
      DefaultRole: item.DefaultRole,
      AvailableRoles: availableRoles,
      LicenseCostMonthly: item.LicenseCostMonthly,
      ProvisioningInstructions: item.ProvisioningInstructions,
      DeprovisioningInstructions: item.DeprovisioningInstructions,
      RequiresApproval: item.RequiresApproval ?? false,
      SortOrder: item.SortOrder ?? 0,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapTrainingCourseFromSP(item: any): ITrainingCourse {
    let mandatoryForDepts: string[] = [];
    try {
      if (item.MandatoryForDepartments) {
        mandatoryForDepts = JSON.parse(item.MandatoryForDepartments);
      }
    } catch { /* ignore */ }

    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      Category: item.Category as TrainingCategory,
      DeliveryMethod: item.DeliveryMethod as TrainingDeliveryMethod,
      DurationHours: item.DurationHours,
      IsMandatory: item.IsMandatory ?? false,
      MandatoryForDepartments: mandatoryForDepts,
      ExpirationMonths: item.ExpirationMonths,
      ContentUrl: item.ContentUrl,
      Provider: item.Provider,
      EstimatedCost: item.EstimatedCost,
      SortOrder: item.SortOrder ?? 0,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapPolicyPackFromSP(item: any): IPolicyPack {
    const parseIds = (val: any): number[] => {
      if (!val) return [];
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    };

    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      Department: item.Department,
      JobTitle: item.JobTitle,
      DocumentTypeIds: parseIds(item.DocumentTypeIds),
      AssetTypeIds: parseIds(item.AssetTypeIds),
      SystemAccessTypeIds: parseIds(item.SystemAccessTypeIds),
      TrainingCourseIds: parseIds(item.TrainingCourseIds),
      IsDefault: item.IsDefault ?? false,
      SortOrder: item.SortOrder ?? 0,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapDepartmentFromSP(item: any): IDepartment {
    return {
      Id: item.Id,
      Title: item.Title || '',
      Code: item.Code,
      ManagerId: item.ManagerId,
      DefaultPolicyPackId: item.DefaultPolicyPackId,
      CostCenter: item.CostCenter,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapOnboardingProfileFromSP(item: any): IOnboardingProfile {
    const parseIds = (val: any): number[] => {
      if (!val) return [];
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    };

    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      ProfileType: (item.ProfileType as OnboardingProfileType) || OnboardingProfileType.Department,
      Department: item.Department,
      JobTitle: item.JobTitle,
      DocumentTypeIds: parseIds(item.DocumentTypeIds),
      AssetTypeIds: parseIds(item.AssetTypeIds),
      SystemAccessTypeIds: parseIds(item.SystemAccessTypeIds),
      TrainingCourseIds: parseIds(item.TrainingCourseIds),
      Icon: item.Icon,
      Color: item.Color,
      IsDefault: item.IsDefault ?? false,
      SortOrder: item.SortOrder ?? 0,
      IsActive: item.IsActive ?? true,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }
}
