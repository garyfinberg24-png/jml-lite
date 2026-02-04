// Document Service — Employee Document Management
// Handles document library operations including folder creation and file uploads

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import '@pnp/sp/files/folder';
import { JML_LIBRARIES } from '../constants/SharePointListNames';

export interface IEmployeeDocument {
  Id?: number;
  Name: string;
  ServerRelativeUrl: string;
  TimeCreated: Date;
  TimeLastModified: Date;
  Length: number;
  DocumentType?: string;
  UploadedBy?: string;
}

export interface IEmployeeFolder {
  Name: string;
  ServerRelativeUrl: string;
  ItemCount: number;
}

// Document categories for organizing employee files
export const DOCUMENT_CATEGORIES = [
  'ID Documents',
  'Contracts',
  'Certifications',
  'Tax Forms',
  'Background Checks',
  'Training Certificates',
  'Other',
] as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export class DocumentService {
  private sp: SPFI;
  private libraryName: string;

  constructor(sp: SPFI) {
    this.sp = sp;
    this.libraryName = JML_LIBRARIES.EMPLOYEE_DOCUMENTS;
  }

  /**
   * Check if the document library exists
   */
  public async libraryExists(): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(this.libraryName).select('Id')();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the root folder path for the library
   */
  private async getLibraryRootUrl(): Promise<string> {
    const list = await this.sp.web.lists.getByTitle(this.libraryName).rootFolder.select('ServerRelativeUrl')();
    return list.ServerRelativeUrl;
  }

  /**
   * Sanitize folder/file name for SharePoint
   */
  private sanitizeName(name: string): string {
    // Remove or replace invalid characters for SharePoint
    return name
      .replace(/[#%*:<>?\/\\|"]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Create employee folder structure
   * Creates: /EmployeeName/ID Documents, /EmployeeName/Contracts, etc.
   */
  public async createEmployeeFolder(employeeName: string): Promise<string | null> {
    try {
      const rootUrl = await this.getLibraryRootUrl();
      const sanitizedName = this.sanitizeName(employeeName);
      const employeeFolderUrl = `${rootUrl}/${sanitizedName}`;

      // Create main employee folder
      try {
        await this.sp.web.folders.addUsingPath(employeeFolderUrl);
      } catch (error: any) {
        // Folder may already exist, which is fine
        if (!error.message?.includes('already exists')) {
          throw error;
        }
      }

      // Create category subfolders
      for (const category of DOCUMENT_CATEGORIES) {
        const categoryFolderUrl = `${employeeFolderUrl}/${category}`;
        try {
          await this.sp.web.folders.addUsingPath(categoryFolderUrl);
        } catch (error: any) {
          // Subfolder may already exist
          if (!error.message?.includes('already exists')) {
            console.warn(`[DocumentService] Could not create folder ${category}:`, error);
          }
        }
      }

      console.log(`[DocumentService] Created folder structure for: ${employeeName}`);
      return employeeFolderUrl;
    } catch (error) {
      console.error('[DocumentService] Error creating employee folder:', error);
      return null;
    }
  }

  /**
   * Get all folders for an employee
   */
  public async getEmployeeFolders(employeeName: string): Promise<IEmployeeFolder[]> {
    try {
      const rootUrl = await this.getLibraryRootUrl();
      const sanitizedName = this.sanitizeName(employeeName);
      const employeeFolderUrl = `${rootUrl}/${sanitizedName}`;

      const folders = await this.sp.web.getFolderByServerRelativePath(employeeFolderUrl)
        .folders
        .select('Name', 'ServerRelativeUrl', 'ItemCount')();

      return folders.map((f: any) => ({
        Name: f.Name,
        ServerRelativeUrl: f.ServerRelativeUrl,
        ItemCount: f.ItemCount,
      }));
    } catch (error) {
      console.error('[DocumentService] Error getting employee folders:', error);
      return [];
    }
  }

  /**
   * Get all documents for an employee (across all categories)
   * Fetches files from all category subfolders
   */
  public async getEmployeeDocuments(employeeName: string): Promise<IEmployeeDocument[]> {
    try {
      const rootUrl = await this.getLibraryRootUrl();
      const sanitizedName = this.sanitizeName(employeeName);
      const employeeFolderUrl = `${rootUrl}/${sanitizedName}`;

      const allDocuments: IEmployeeDocument[] = [];

      // Get files from each category subfolder
      for (const category of DOCUMENT_CATEGORIES) {
        try {
          const categoryFolderUrl = `${employeeFolderUrl}/${category}`;
          const files = await this.sp.web.getFolderByServerRelativePath(categoryFolderUrl)
            .files
            .select('Name', 'ServerRelativeUrl', 'TimeCreated', 'TimeLastModified', 'Length')();

          files.forEach((f: any) => {
            allDocuments.push({
              Name: f.Name,
              ServerRelativeUrl: f.ServerRelativeUrl,
              TimeCreated: new Date(f.TimeCreated),
              TimeLastModified: new Date(f.TimeLastModified),
              Length: f.Length,
              DocumentType: category,
            });
          });
        } catch {
          // Category folder may not exist yet - continue to next category
        }
      }

      // Also get any files directly in the employee root folder (legacy uploads)
      try {
        const rootFiles = await this.sp.web.getFolderByServerRelativePath(employeeFolderUrl)
          .files
          .select('Name', 'ServerRelativeUrl', 'TimeCreated', 'TimeLastModified', 'Length')();

        rootFiles.forEach((f: any) => {
          allDocuments.push({
            Name: f.Name,
            ServerRelativeUrl: f.ServerRelativeUrl,
            TimeCreated: new Date(f.TimeCreated),
            TimeLastModified: new Date(f.TimeLastModified),
            Length: f.Length,
            DocumentType: 'Other',
          });
        });
      } catch {
        // Root folder may not have direct files
      }

      // Sort by most recently modified first
      allDocuments.sort((a, b) => b.TimeLastModified.getTime() - a.TimeLastModified.getTime());

      return allDocuments;
    } catch (error) {
      console.error('[DocumentService] Error getting employee documents:', error);
      return [];
    }
  }

  /**
   * Get documents in a specific category folder
   */
  public async getDocumentsByCategory(employeeName: string, category: DocumentCategory): Promise<IEmployeeDocument[]> {
    try {
      const rootUrl = await this.getLibraryRootUrl();
      const sanitizedName = this.sanitizeName(employeeName);
      const categoryFolderUrl = `${rootUrl}/${sanitizedName}/${category}`;

      const files = await this.sp.web.getFolderByServerRelativePath(categoryFolderUrl)
        .files
        .select('Name', 'ServerRelativeUrl', 'TimeCreated', 'TimeLastModified', 'Length')();

      return files.map((f: any) => ({
        Name: f.Name,
        ServerRelativeUrl: f.ServerRelativeUrl,
        TimeCreated: new Date(f.TimeCreated),
        TimeLastModified: new Date(f.TimeLastModified),
        Length: f.Length,
        DocumentType: category,
      }));
    } catch (error) {
      console.error(`[DocumentService] Error getting documents for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Upload a document to an employee's folder
   */
  public async uploadDocument(
    employeeName: string,
    category: DocumentCategory,
    file: File
  ): Promise<IEmployeeDocument | null> {
    try {
      const rootUrl = await this.getLibraryRootUrl();
      const sanitizedName = this.sanitizeName(employeeName);
      const sanitizedFileName = this.sanitizeName(file.name);
      const folderUrl = `${rootUrl}/${sanitizedName}/${category}`;

      // Ensure folder exists
      await this.createEmployeeFolder(employeeName);

      // Upload file
      const result = await this.sp.web.getFolderByServerRelativePath(folderUrl)
        .files
        .addUsingPath(sanitizedFileName, file, { Overwrite: true });

      console.log(`[DocumentService] Uploaded: ${sanitizedFileName} to ${category}`);

      return {
        Name: sanitizedFileName,
        ServerRelativeUrl: result.data?.ServerRelativeUrl || `${folderUrl}/${sanitizedFileName}`,
        TimeCreated: new Date(),
        TimeLastModified: new Date(),
        Length: file.size,
        DocumentType: category,
      };
    } catch (error) {
      console.error('[DocumentService] Error uploading document:', error);
      return null;
    }
  }

  /**
   * Delete a document
   */
  public async deleteDocument(serverRelativeUrl: string): Promise<boolean> {
    try {
      await this.sp.web.getFileByServerRelativePath(serverRelativeUrl).recycle();
      console.log(`[DocumentService] Deleted: ${serverRelativeUrl}`);
      return true;
    } catch (error) {
      console.error('[DocumentService] Error deleting document:', error);
      return false;
    }
  }

  /**
   * Get document count for an employee
   */
  public async getDocumentCount(employeeName: string): Promise<number> {
    try {
      const docs = await this.getEmployeeDocuments(employeeName);
      return docs.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get the direct link to an employee's document folder in SharePoint
   */
  public async getEmployeeFolderLink(employeeName: string): Promise<string | null> {
    try {
      const rootUrl = await this.getLibraryRootUrl();
      const sanitizedName = this.sanitizeName(employeeName);
      const web = await this.sp.web.select('Url')();
      return `${web.Url}/${rootUrl.split('/').pop()}/${sanitizedName}`;
    } catch (error) {
      console.error('[DocumentService] Error getting folder link:', error);
      return null;
    }
  }

  /**
   * Format file size for display
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
