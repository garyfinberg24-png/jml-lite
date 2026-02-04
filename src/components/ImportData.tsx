import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import * as XLSX from 'xlsx';
import { JML_LISTS } from '../constants/SharePointListNames';

interface IProps {
  sp: SPFI;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// Theme colors
const JOINER_COLOR = '#005BAA';
const MOVER_COLOR = '#ea580c';
const LEAVER_COLOR = '#d13438';

// List configurations with field mappings
const LIST_CONFIGS: Record<string, {
  name: string;
  listKey: keyof typeof JML_LISTS;
  color: string;
  category: 'onboarding' | 'mover' | 'offboarding' | 'config';
  requiredFields: string[];
  fieldMappings: Record<string, string>;
}> = {
  onboarding: {
    name: 'Onboarding Records',
    listKey: 'ONBOARDING',
    color: JOINER_COLOR,
    category: 'onboarding',
    requiredFields: ['EmployeeName', 'StartDate'],
    fieldMappings: {
      'EmployeeName': 'Title',
      'Employee Name': 'Title',
      'Name': 'Title',
      'StartDate': 'StartDate',
      'Start Date': 'StartDate',
      'Department': 'Department',
      'Manager': 'Manager',
      'JobTitle': 'JobTitle',
      'Job Title': 'JobTitle',
      'Status': 'Status',
    }
  },
  onboardingTasks: {
    name: 'Onboarding Tasks',
    listKey: 'ONBOARDING_TASKS',
    color: JOINER_COLOR,
    category: 'onboarding',
    requiredFields: ['TaskName'],
    fieldMappings: {
      'TaskName': 'Title',
      'Task Name': 'Title',
      'Task': 'Title',
      'Name': 'Title',
      'Category': 'Category',
      'AssignedTo': 'AssignedTo',
      'Assigned To': 'AssignedTo',
      'DueDate': 'DueDate',
      'Due Date': 'DueDate',
      'Status': 'Status',
      'Priority': 'Priority',
    }
  },
  onboardingTemplates: {
    name: 'Onboarding Templates',
    listKey: 'ONBOARDING_TEMPLATES',
    color: JOINER_COLOR,
    category: 'onboarding',
    requiredFields: ['TemplateName'],
    fieldMappings: {
      'TemplateName': 'Title',
      'Template Name': 'Title',
      'Name': 'Title',
      'Description': 'Description',
      'Department': 'Department',
      'IsActive': 'IsActive',
      'Active': 'IsActive',
    }
  },
  mover: {
    name: 'Mover/Transfer Records',
    listKey: 'MOVER',
    color: MOVER_COLOR,
    category: 'mover',
    requiredFields: ['EmployeeName', 'EffectiveDate'],
    fieldMappings: {
      'EmployeeName': 'Title',
      'Employee Name': 'Title',
      'Name': 'Title',
      'EffectiveDate': 'EffectiveDate',
      'Effective Date': 'EffectiveDate',
      'FromDepartment': 'FromDepartment',
      'From Department': 'FromDepartment',
      'ToDepartment': 'ToDepartment',
      'To Department': 'ToDepartment',
      'TransferType': 'TransferType',
      'Transfer Type': 'TransferType',
      'Status': 'Status',
    }
  },
  moverTasks: {
    name: 'Mover Tasks',
    listKey: 'MOVER_TASKS',
    color: MOVER_COLOR,
    category: 'mover',
    requiredFields: ['TaskName'],
    fieldMappings: {
      'TaskName': 'Title',
      'Task Name': 'Title',
      'Task': 'Title',
      'Name': 'Title',
      'Category': 'Category',
      'AssignedTo': 'AssignedTo',
      'Assigned To': 'AssignedTo',
      'DueDate': 'DueDate',
      'Due Date': 'DueDate',
      'Status': 'Status',
    }
  },
  offboarding: {
    name: 'Offboarding Records',
    listKey: 'OFFBOARDING',
    color: LEAVER_COLOR,
    category: 'offboarding',
    requiredFields: ['EmployeeName', 'LastDay'],
    fieldMappings: {
      'EmployeeName': 'Title',
      'Employee Name': 'Title',
      'Name': 'Title',
      'LastDay': 'LastDay',
      'Last Day': 'LastDay',
      'LeavingDate': 'LastDay',
      'Leaving Date': 'LastDay',
      'Department': 'Department',
      'Reason': 'Reason',
      'ExitInterview': 'ExitInterview',
      'Exit Interview': 'ExitInterview',
      'Status': 'Status',
    }
  },
  offboardingTasks: {
    name: 'Offboarding Tasks',
    listKey: 'OFFBOARDING_TASKS',
    color: LEAVER_COLOR,
    category: 'offboarding',
    requiredFields: ['TaskName'],
    fieldMappings: {
      'TaskName': 'Title',
      'Task Name': 'Title',
      'Task': 'Title',
      'Name': 'Title',
      'Category': 'Category',
      'AssignedTo': 'AssignedTo',
      'Assigned To': 'AssignedTo',
      'DueDate': 'DueDate',
      'Due Date': 'DueDate',
      'Status': 'Status',
    }
  },
  assetReturn: {
    name: 'Asset Returns',
    listKey: 'ASSET_RETURN',
    color: LEAVER_COLOR,
    category: 'offboarding',
    requiredFields: ['AssetName'],
    fieldMappings: {
      'AssetName': 'Title',
      'Asset Name': 'Title',
      'Asset': 'Title',
      'Name': 'Title',
      'AssetType': 'AssetType',
      'Asset Type': 'AssetType',
      'SerialNumber': 'SerialNumber',
      'Serial Number': 'SerialNumber',
      'ReturnedDate': 'ReturnedDate',
      'Returned Date': 'ReturnedDate',
      'Condition': 'Condition',
    }
  },
  documentTypes: {
    name: 'Document Types',
    listKey: 'DOCUMENT_TYPES',
    color: '#6b7280',
    category: 'config',
    requiredFields: ['Name'],
    fieldMappings: {
      'Name': 'Title',
      'DocumentType': 'Title',
      'Document Type': 'Title',
      'Description': 'Description',
      'Category': 'Category',
      'IsRequired': 'IsRequired',
      'Required': 'IsRequired',
    }
  },
  assetTypes: {
    name: 'Asset Types',
    listKey: 'ASSET_TYPES',
    color: '#6b7280',
    category: 'config',
    requiredFields: ['Name'],
    fieldMappings: {
      'Name': 'Title',
      'AssetType': 'Title',
      'Asset Type': 'Title',
      'Description': 'Description',
      'Category': 'Category',
    }
  },
  systemAccessTypes: {
    name: 'System Access Types',
    listKey: 'SYSTEM_ACCESS_TYPES',
    color: '#6b7280',
    category: 'config',
    requiredFields: ['Name'],
    fieldMappings: {
      'Name': 'Title',
      'SystemName': 'Title',
      'System Name': 'Title',
      'Description': 'Description',
      'Category': 'Category',
      'ApprovalRequired': 'ApprovalRequired',
      'Approval Required': 'ApprovalRequired',
    }
  },
  trainingCourses: {
    name: 'Training Courses',
    listKey: 'TRAINING_COURSES',
    color: '#6b7280',
    category: 'config',
    requiredFields: ['Name'],
    fieldMappings: {
      'Name': 'Title',
      'CourseName': 'Title',
      'Course Name': 'Title',
      'Description': 'Description',
      'Duration': 'Duration',
      'IsRequired': 'IsRequired',
      'Required': 'IsRequired',
      'Category': 'Category',
    }
  },
  policyPacks: {
    name: 'Policy Packs',
    listKey: 'POLICY_PACKS',
    color: '#6b7280',
    category: 'config',
    requiredFields: ['Name'],
    fieldMappings: {
      'Name': 'Title',
      'PolicyName': 'Title',
      'Policy Name': 'Title',
      'Description': 'Description',
      'DocumentLink': 'DocumentLink',
      'Document Link': 'DocumentLink',
    }
  },
  departments: {
    name: 'Departments',
    listKey: 'DEPARTMENTS',
    color: '#6b7280',
    category: 'config',
    requiredFields: ['Name'],
    fieldMappings: {
      'Name': 'Title',
      'DepartmentName': 'Title',
      'Department Name': 'Title',
      'Department': 'Title',
      'Description': 'Description',
      'Manager': 'Manager',
      'CostCenter': 'CostCenter',
      'Cost Center': 'CostCenter',
    }
  },
};

export const ImportData: React.FC<IProps> = ({ sp }) => {
  const [selectedList, setSelectedList] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate dropdown options grouped by category
  const listOptions: IDropdownOption[] = [
    { key: 'header-onboarding', text: 'Onboarding', itemType: 1 },
    ...Object.entries(LIST_CONFIGS)
      .filter(([, config]) => config.category === 'onboarding')
      .map(([key, config]) => ({ key, text: config.name })),
    { key: 'divider1', text: '-', itemType: 2 },
    { key: 'header-mover', text: 'Transfers', itemType: 1 },
    ...Object.entries(LIST_CONFIGS)
      .filter(([, config]) => config.category === 'mover')
      .map(([key, config]) => ({ key, text: config.name })),
    { key: 'divider2', text: '-', itemType: 2 },
    { key: 'header-offboarding', text: 'Offboarding', itemType: 1 },
    ...Object.entries(LIST_CONFIGS)
      .filter(([, config]) => config.category === 'offboarding')
      .map(([key, config]) => ({ key, text: config.name })),
    { key: 'divider3', text: '-', itemType: 2 },
    { key: 'header-config', text: 'Configuration', itemType: 1 },
    ...Object.entries(LIST_CONFIGS)
      .filter(([, config]) => config.category === 'config')
      .map(([key, config]) => ({ key, text: config.name })),
  ];

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setImportResult(null);
    setPreviewData([]);

    try {
      const data = await readFile(selectedFile);
      if (data.length > 0) {
        setPreviewData(data.slice(0, 5)); // Preview first 5 rows
      }
    } catch (err) {
      setError(`Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const readFile = async (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('No data read from file'));
            return;
          }

          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData as Record<string, unknown>[]);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const mapFieldValue = (value: unknown): unknown => {
    // Handle Excel dates (numeric)
    if (typeof value === 'number' && value > 40000 && value < 60000) {
      const date = XLSX.SSF.parse_date_code(value);
      return new Date(date.y, date.m - 1, date.d).toISOString();
    }
    return value;
  };

  const mapRowToListItem = (row: Record<string, unknown>, config: typeof LIST_CONFIGS[string]): Record<string, unknown> => {
    const item: Record<string, unknown> = {};

    for (const [sourceField, targetField] of Object.entries(config.fieldMappings)) {
      if (row[sourceField] !== undefined) {
        item[targetField] = mapFieldValue(row[sourceField]);
      }
    }

    // Also try exact field names if not mapped
    for (const [key, value] of Object.entries(row)) {
      if (!item[key] && value !== undefined && value !== null && value !== '') {
        item[key] = mapFieldValue(value);
      }
    }

    return item;
  };

  const handleImport = async () => {
    if (!selectedList || !file) return;

    const config = LIST_CONFIGS[selectedList];
    if (!config) return;

    setImporting(true);
    setProgress(0);
    setError(null);
    setImportResult(null);

    try {
      const data = await readFile(file);
      const listName = JML_LISTS[config.listKey];
      const list = sp.web.lists.getByTitle(listName);

      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          const item = mapRowToListItem(row, config);

          // Ensure Title field exists (required by SharePoint)
          if (!item.Title) {
            throw new Error('Missing required Title field');
          }

          await list.items.add(item);
          result.success++;
        } catch (err) {
          result.failed++;
          result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }

        setProgress(((i + 1) / data.length) * 100);
      }

      setImportResult(result);
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    if (!selectedList) return;

    const config = LIST_CONFIGS[selectedList];
    if (!config) return;

    // Create template with header row
    const headers = Object.keys(config.fieldMappings).filter((key, index, self) => {
      // Get unique target fields
      const targetField = config.fieldMappings[key];
      const firstKey = Object.keys(config.fieldMappings).find(k => config.fieldMappings[k] === targetField);
      return firstKey === key;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, `${config.name.replace(/\s+/g, '_')}_Template.xlsx`);
  };

  const selectedConfig = selectedList ? LIST_CONFIGS[selectedList] : null;

  return (
    <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon iconName="CloudUpload" style={{ color: JOINER_COLOR }} />
        Import Data from XLSX/CSV
      </h3>
      <p style={{ color: '#605e5c', fontSize: '14px', margin: '0 0 24px 0' }}>
        Upload Excel or CSV files to bulk import data into JML lists
      </p>

      {/* Step 1: Select List */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          background: '#f5f5f5',
          padding: '8px 12px',
          borderRadius: '4px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: JOINER_COLOR,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
          }}>1</div>
          <span style={{ fontWeight: 500 }}>Select Target List</span>
        </div>
        <Dropdown
          placeholder="Select a list to import into..."
          options={listOptions}
          selectedKey={selectedList}
          onChange={(_, option) => {
            setSelectedList(option?.key as string || '');
            handleReset();
          }}
          styles={{
            dropdown: { width: '100%' },
          }}
        />
        {selectedConfig && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            <div style={{
              padding: '12px 16px',
              background: `${selectedConfig.color}10`,
              borderRadius: '6px',
              borderLeft: `3px solid ${selectedConfig.color}`,
              flex: 1,
            }}>
              <div style={{ fontSize: '12px', color: '#605e5c', marginBottom: '4px' }}>Target List</div>
              <div style={{ fontWeight: 500, color: selectedConfig.color }}>{JML_LISTS[selectedConfig.listKey]}</div>
            </div>
            <div style={{
              padding: '12px 16px',
              background: '#f5f5f5',
              borderRadius: '6px',
              flex: 1,
            }}>
              <div style={{ fontSize: '12px', color: '#605e5c', marginBottom: '4px' }}>Required Fields</div>
              <div style={{ fontWeight: 500, color: '#323130' }}>{selectedConfig.requiredFields.join(', ')}</div>
            </div>
            <DefaultButton
              iconProps={{ iconName: 'Download' }}
              text="Download Template"
              onClick={downloadTemplate}
              styles={{
                root: { height: 'auto', minHeight: '48px' }
              }}
            />
          </div>
        )}
      </div>

      {/* Step 2: Upload File */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          background: '#f5f5f5',
          padding: '8px 12px',
          borderRadius: '4px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: selectedList ? JOINER_COLOR : '#c4c4c4',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
          }}>2</div>
          <span style={{ fontWeight: 500 }}>Upload File</span>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={!selectedList}
          style={{ display: 'none' }}
        />

        {!file ? (
          <div
            onClick={() => selectedList && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${selectedList ? '#c4c4c4' : '#e5e5e5'}`,
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              cursor: selectedList ? 'pointer' : 'not-allowed',
              background: selectedList ? '#fafafa' : '#f5f5f5',
              transition: 'all 0.2s',
              opacity: selectedList ? 1 : 0.5,
            }}
          >
            <Icon iconName="ExcelDocument" style={{ fontSize: '48px', color: selectedList ? '#217346' : '#c4c4c4', marginBottom: '16px' }} />
            <div style={{ color: selectedList ? '#323130' : '#8a8886', fontWeight: 500, marginBottom: '8px' }}>
              {selectedList ? 'Click to upload XLSX or CSV file' : 'Select a list first'}
            </div>
            <div style={{ color: '#8a8886', fontSize: '13px' }}>
              Supports .xlsx, .xls, and .csv formats
            </div>
          </div>
        ) : (
          <div style={{
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '16px',
            background: '#f9f9f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon iconName="ExcelDocument" style={{ fontSize: '32px', color: '#217346' }} />
              <div>
                <div style={{ fontWeight: 500, color: '#323130' }}>{file.name}</div>
                <div style={{ fontSize: '12px', color: '#8a8886' }}>
                  {(file.size / 1024).toFixed(1)} KB • {previewData.length} rows previewed
                </div>
              </div>
            </div>
            <DefaultButton
              iconProps={{ iconName: 'Cancel' }}
              text="Remove"
              onClick={handleReset}
            />
          </div>
        )}
      </div>

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            background: '#f5f5f5',
            padding: '8px 12px',
            borderRadius: '4px',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: JOINER_COLOR,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}>3</div>
            <span style={{ fontWeight: 500 }}>Preview Data</span>
            <span style={{ fontSize: '12px', color: '#8a8886', marginLeft: 'auto' }}>Showing first 5 rows</span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e5e5e5', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {Object.keys(previewData[0]).map(key => (
                    <th key={key} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e5e5e5',
                      fontWeight: 600,
                      color: '#323130',
                      whiteSpace: 'nowrap',
                    }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((value, colIndex) => (
                      <td key={colIndex} style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        color: '#605e5c',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {String(value ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setError(null)}
          styles={{ root: { marginBottom: '16px' } }}
        >
          {error}
        </MessageBar>
      )}

      {/* Import Progress */}
      {importing && (
        <div style={{ marginBottom: '24px' }}>
          <ProgressIndicator
            label="Importing data..."
            description={`${Math.round(progress)}% complete`}
            percentComplete={progress / 100}
          />
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div style={{ marginBottom: '24px' }}>
          <MessageBar
            messageBarType={importResult.failed === 0 ? MessageBarType.success : MessageBarType.warning}
            styles={{ root: { marginBottom: '8px' } }}
          >
            Import complete: {importResult.success} successful, {importResult.failed} failed
          </MessageBar>
          {importResult.errors.length > 0 && (
            <div style={{
              background: '#fff4f4',
              border: '1px solid #fdd',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '150px',
              overflow: 'auto',
            }}>
              <div style={{ fontWeight: 500, color: '#a80000', marginBottom: '8px' }}>Errors:</div>
              {importResult.errors.slice(0, 10).map((err, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#605e5c', marginBottom: '4px' }}>
                  {err}
                </div>
              ))}
              {importResult.errors.length > 10 && (
                <div style={{ fontSize: '12px', color: '#8a8886', fontStyle: 'italic' }}>
                  ...and {importResult.errors.length - 10} more errors
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {importResult && (
          <DefaultButton
            text="Import Another"
            onClick={handleReset}
          />
        )}
        <PrimaryButton
          text={importing ? 'Importing...' : 'Start Import'}
          onClick={handleImport}
          disabled={!selectedList || !file || importing}
          iconProps={importing ? undefined : { iconName: 'CloudUpload' }}
          styles={{
            root: {
              background: selectedConfig?.color || JOINER_COLOR,
              borderColor: selectedConfig?.color || JOINER_COLOR,
            },
            rootHovered: {
              background: selectedConfig?.color || JOINER_COLOR,
              borderColor: selectedConfig?.color || JOINER_COLOR,
              opacity: 0.9,
            }
          }}
        >
          {importing && <Spinner size={SpinnerSize.small} style={{ marginRight: '8px' }} />}
        </PrimaryButton>
      </div>

      {/* Help Section */}
      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e5e5e5',
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#323130', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon iconName="Info" style={{ color: JOINER_COLOR }} />
          Import Tips
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#605e5c', fontSize: '13px', lineHeight: '1.6' }}>
          <li>Download the template for the correct column headers</li>
          <li>The first row must contain column headers</li>
          <li>Date fields should be in YYYY-MM-DD format or Excel date format</li>
          <li>Required fields vary by list type - check the template</li>
          <li>Duplicate entries may be created - check for existing data first</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportData;
