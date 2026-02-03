# Deploy-JMLLists.ps1
# Creates all SharePoint lists for DWx JML Lite
# Prerequisite: Already connected via Connect-PnPOnline to JMLLite site

Write-Host "=== DWx JML Lite — List Provisioning ===" -ForegroundColor Cyan

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
        Add-PnPField -List $ListName -DisplayName $FieldName -InternalName $FieldName -Type $Type -Required:$Required -ErrorAction SilentlyContinue
        Write-Host "  Added field: $FieldName ($Type)" -ForegroundColor Cyan
    }
}

function Ensure-ChoiceField {
    param([string]$ListName, [string]$FieldName, [string[]]$Choices, [bool]$Required = $false)
    $field = Get-PnPField -List $ListName -Identity $FieldName -ErrorAction SilentlyContinue
    if ($null -eq $field) {
        Add-PnPField -List $ListName -DisplayName $FieldName -InternalName $FieldName -Type Choice -Choices $Choices -Required:$Required -ErrorAction SilentlyContinue
        Write-Host "  Added choice field: $FieldName" -ForegroundColor Cyan
    }
}

# ══════════════════════════════════════════════════════════════════
# JML_Onboarding — Employee onboarding tracking
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_Onboarding" "Employee onboarding tracking"
Ensure-Field "JML_Onboarding" "CandidateId" "Number" $true
Ensure-Field "JML_Onboarding" "CandidateName" "Text" $true
Ensure-Field "JML_Onboarding" "JobTitle" "Text" $true
Ensure-Field "JML_Onboarding" "Department" "Text"
Ensure-Field "JML_Onboarding" "HiringManagerId" "Number"
Ensure-Field "JML_Onboarding" "StartDate" "DateTime" $true
Ensure-ChoiceField "JML_Onboarding" "Status" @("Not Started","In Progress","Completed","On Hold","Cancelled") $true
Ensure-Field "JML_Onboarding" "CompletionPercentage" "Number"
Ensure-Field "JML_Onboarding" "TotalTasks" "Number"
Ensure-Field "JML_Onboarding" "CompletedTasks" "Number"
Ensure-Field "JML_Onboarding" "DueDate" "DateTime"
Ensure-Field "JML_Onboarding" "CompletedDate" "DateTime"
Ensure-Field "JML_Onboarding" "AssignedToId" "Number"
Ensure-Field "JML_Onboarding" "Notes" "Note"

# ══════════════════════════════════════════════════════════════════
# JML_OnboardingTasks — Onboarding task checklist items
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_OnboardingTasks" "Onboarding task checklist items"
Ensure-Field "JML_OnboardingTasks" "OnboardingId" "Number" $true
Ensure-Field "JML_OnboardingTasks" "Description" "Note"
Ensure-ChoiceField "JML_OnboardingTasks" "Category" @("Documentation","System Access","Equipment","Training","Orientation","Compliance") $true
Ensure-ChoiceField "JML_OnboardingTasks" "Status" @("Pending","In Progress","Completed","Blocked","Not Applicable") $true
Ensure-Field "JML_OnboardingTasks" "AssignedToId" "Number"
Ensure-Field "JML_OnboardingTasks" "DueDate" "DateTime"
Ensure-Field "JML_OnboardingTasks" "CompletedDate" "DateTime"
Ensure-Field "JML_OnboardingTasks" "CompletedById" "Number"
Ensure-ChoiceField "JML_OnboardingTasks" "Priority" @("Low","Medium","High")
Ensure-Field "JML_OnboardingTasks" "EstimatedHours" "Number"
Ensure-Field "JML_OnboardingTasks" "ActualHours" "Number"
Ensure-Field "JML_OnboardingTasks" "DocumentUrl" "Text"
Ensure-Field "JML_OnboardingTasks" "SortOrder" "Number"
Ensure-Field "JML_OnboardingTasks" "Notes" "Note"

# ══════════════════════════════════════════════════════════════════
# JML_OnboardingTemplates — Reusable onboarding task templates
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_OnboardingTemplates" "Reusable onboarding task templates"
Ensure-Field "JML_OnboardingTemplates" "Description" "Note"
Ensure-Field "JML_OnboardingTemplates" "Department" "Text"
Ensure-Field "JML_OnboardingTemplates" "JobTitle" "Text"
Ensure-Field "JML_OnboardingTemplates" "IsActive" "Boolean"
Ensure-Field "JML_OnboardingTemplates" "TasksJSON" "Note"
Ensure-Field "JML_OnboardingTemplates" "EstimatedDurationDays" "Number"

# ══════════════════════════════════════════════════════════════════
# JML_Mover — Employee internal transfer tracking
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_Mover" "Employee internal transfer tracking"
Ensure-Field "JML_Mover" "EmployeeId" "Number" $true
Ensure-Field "JML_Mover" "EmployeeName" "Text" $true
Ensure-Field "JML_Mover" "EmployeeEmail" "Text"
Ensure-Field "JML_Mover" "CurrentJobTitle" "Text" $true
Ensure-Field "JML_Mover" "CurrentDepartment" "Text"
Ensure-Field "JML_Mover" "CurrentLocation" "Text"
Ensure-Field "JML_Mover" "CurrentManagerId" "Number"
Ensure-Field "JML_Mover" "NewJobTitle" "Text" $true
Ensure-Field "JML_Mover" "NewDepartment" "Text"
Ensure-Field "JML_Mover" "NewLocation" "Text"
Ensure-Field "JML_Mover" "NewManagerId" "Number"
Ensure-ChoiceField "JML_Mover" "MoverType" @("Department Transfer","Role Change","Location Change","Promotion","Demotion","Lateral Move","Team Restructure","Other") $true
Ensure-Field "JML_Mover" "EffectiveDate" "DateTime" $true
Ensure-ChoiceField "JML_Mover" "Status" @("Not Started","In Progress","Completed","On Hold","Cancelled") $true
Ensure-Field "JML_Mover" "Reason" "Note"
Ensure-Field "JML_Mover" "CompletionPercentage" "Number"
Ensure-Field "JML_Mover" "TotalTasks" "Number"
Ensure-Field "JML_Mover" "CompletedTasks" "Number"
Ensure-Field "JML_Mover" "CurrentSalary" "Number"
Ensure-Field "JML_Mover" "NewSalary" "Number"
Ensure-Field "JML_Mover" "SalaryChangePercentage" "Number"
Ensure-Field "JML_Mover" "AssignedToId" "Number"
Ensure-Field "JML_Mover" "HRContactId" "Number"
Ensure-Field "JML_Mover" "Notes" "Note"
Ensure-Field "JML_Mover" "ApprovalRequired" "Boolean"
Ensure-Field "JML_Mover" "ApprovedById" "Number"
Ensure-Field "JML_Mover" "ApprovalDate" "DateTime"

# ══════════════════════════════════════════════════════════════════
# JML_MoverTasks — Mover task checklist items
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_MoverTasks" "Mover task checklist items"
Ensure-Field "JML_MoverTasks" "MoverId" "Number" $true
Ensure-Field "JML_MoverTasks" "Description" "Note"
Ensure-ChoiceField "JML_MoverTasks" "Category" @("System Access","Asset Transfer","Documentation","Training","Knowledge Transfer","Orientation","Compliance","Other") $true
Ensure-ChoiceField "JML_MoverTasks" "Status" @("Pending","In Progress","Completed","Blocked","Not Applicable") $true
Ensure-Field "JML_MoverTasks" "AssignedToId" "Number"
Ensure-Field "JML_MoverTasks" "DueDate" "DateTime"
Ensure-Field "JML_MoverTasks" "CompletedDate" "DateTime"
Ensure-Field "JML_MoverTasks" "CompletedById" "Number"
Ensure-ChoiceField "JML_MoverTasks" "Priority" @("Low","Medium","High")
Ensure-Field "JML_MoverTasks" "SortOrder" "Number"
Ensure-Field "JML_MoverTasks" "Notes" "Note"
Ensure-Field "JML_MoverTasks" "RelatedSystemAccessId" "Number"
Ensure-ChoiceField "JML_MoverTasks" "SystemAccessAction" @("Grant","Revoke","Modify","No Change")
Ensure-Field "JML_MoverTasks" "RelatedAssetId" "Number"

# ══════════════════════════════════════════════════════════════════
# JML_MoverSystemAccess — System access changes for transfers
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_MoverSystemAccess" "System access changes for transfers"
Ensure-Field "JML_MoverSystemAccess" "MoverId" "Number" $true
Ensure-Field "JML_MoverSystemAccess" "SystemAccessTypeId" "Number"
Ensure-Field "JML_MoverSystemAccess" "SystemName" "Text" $true
Ensure-ChoiceField "JML_MoverSystemAccess" "Action" @("Grant","Revoke","Modify","No Change") $true
Ensure-Field "JML_MoverSystemAccess" "CurrentRole" "Text"
Ensure-Field "JML_MoverSystemAccess" "NewRole" "Text"
Ensure-ChoiceField "JML_MoverSystemAccess" "Status" @("Pending","In Progress","Completed","Blocked","Not Applicable") $true
Ensure-Field "JML_MoverSystemAccess" "ProcessedDate" "DateTime"
Ensure-Field "JML_MoverSystemAccess" "ProcessedById" "Number"
Ensure-Field "JML_MoverSystemAccess" "Notes" "Note"

# ══════════════════════════════════════════════════════════════════
# JML_Offboarding — Employee offboarding tracking
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_Offboarding" "Employee offboarding tracking"
Ensure-Field "JML_Offboarding" "EmployeeId" "Number" $true
Ensure-Field "JML_Offboarding" "EmployeeName" "Text" $true
Ensure-Field "JML_Offboarding" "EmployeeEmail" "Text"
Ensure-Field "JML_Offboarding" "JobTitle" "Text" $true
Ensure-Field "JML_Offboarding" "Department" "Text"
Ensure-Field "JML_Offboarding" "ManagerId" "Number"
Ensure-Field "JML_Offboarding" "LastWorkingDate" "DateTime" $true
Ensure-ChoiceField "JML_Offboarding" "TerminationType" @("Resignation","Termination","Redundancy","Retirement","Contract End","Other") $true
Ensure-ChoiceField "JML_Offboarding" "Status" @("Not Started","In Progress","Completed","On Hold","Cancelled") $true
Ensure-Field "JML_Offboarding" "CompletionPercentage" "Number"
Ensure-Field "JML_Offboarding" "TotalTasks" "Number"
Ensure-Field "JML_Offboarding" "CompletedTasks" "Number"
Ensure-Field "JML_Offboarding" "ExitInterviewDate" "DateTime"
Ensure-Field "JML_Offboarding" "ExitInterviewCompleted" "Boolean"
Ensure-Field "JML_Offboarding" "ExitInterviewNotes" "Note"
Ensure-Field "JML_Offboarding" "FinalPaymentProcessed" "Boolean"
Ensure-Field "JML_Offboarding" "ReferenceEligible" "Boolean"
Ensure-Field "JML_Offboarding" "RehireEligible" "Boolean"
Ensure-Field "JML_Offboarding" "AssignedToId" "Number"
Ensure-Field "JML_Offboarding" "Notes" "Note"

# ══════════════════════════════════════════════════════════════════
# JML_OffboardingTasks — Offboarding task checklist items
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_OffboardingTasks" "Offboarding task checklist items"
Ensure-Field "JML_OffboardingTasks" "OffboardingId" "Number" $true
Ensure-Field "JML_OffboardingTasks" "Description" "Note"
Ensure-ChoiceField "JML_OffboardingTasks" "Category" @("Asset Return","System Access","Documentation","Exit Interview","Knowledge Transfer","Final Pay","Other") $true
Ensure-ChoiceField "JML_OffboardingTasks" "Status" @("Pending","In Progress","Completed","Blocked","Not Applicable") $true
Ensure-Field "JML_OffboardingTasks" "AssignedToId" "Number"
Ensure-Field "JML_OffboardingTasks" "DueDate" "DateTime"
Ensure-Field "JML_OffboardingTasks" "CompletedDate" "DateTime"
Ensure-Field "JML_OffboardingTasks" "CompletedById" "Number"
Ensure-ChoiceField "JML_OffboardingTasks" "Priority" @("Low","Medium","High")
Ensure-Field "JML_OffboardingTasks" "SortOrder" "Number"
Ensure-Field "JML_OffboardingTasks" "Notes" "Note"
Ensure-Field "JML_OffboardingTasks" "RelatedAssetId" "Number"
Ensure-Field "JML_OffboardingTasks" "RelatedSystemAccessId" "Number"

# ══════════════════════════════════════════════════════════════════
# JML_AssetReturn — Asset return tracking for offboarding
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_AssetReturn" "Asset return tracking for offboarding"
Ensure-Field "JML_AssetReturn" "OffboardingId" "Number" $true
Ensure-Field "JML_AssetReturn" "AssetTypeId" "Number"
Ensure-Field "JML_AssetReturn" "AssetName" "Text" $true
Ensure-Field "JML_AssetReturn" "AssetTag" "Text"
Ensure-Field "JML_AssetReturn" "Quantity" "Number"
Ensure-ChoiceField "JML_AssetReturn" "Status" @("Pending Return","Returned","Damaged","Lost","Written Off") $true
Ensure-Field "JML_AssetReturn" "ReturnedDate" "DateTime"
Ensure-Field "JML_AssetReturn" "ReceivedById" "Number"
Ensure-ChoiceField "JML_AssetReturn" "Condition" @("Excellent","Good","Fair","Poor","Non-Functional")
Ensure-Field "JML_AssetReturn" "ConditionNotes" "Note"
Ensure-Field "JML_AssetReturn" "RequiresDataWipe" "Boolean"
Ensure-Field "JML_AssetReturn" "DataWipeCompleted" "Boolean"
Ensure-Field "JML_AssetReturn" "DataWipeDate" "DateTime"

# ══════════════════════════════════════════════════════════════════
# JML_DocumentTypes — Document type configuration for onboarding
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_DocumentTypes" "Document type configuration for onboarding"
Ensure-Field "JML_DocumentTypes" "Description" "Note"
Ensure-ChoiceField "JML_DocumentTypes" "Category" @("HR","Finance","Compliance","Legal","IT")
Ensure-Field "JML_DocumentTypes" "IsRequired" "Boolean"
Ensure-Field "JML_DocumentTypes" "RequiredForDepartments" "Note"
Ensure-Field "JML_DocumentTypes" "SortOrder" "Number"
Ensure-Field "JML_DocumentTypes" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_AssetTypes — Asset type configuration for onboarding
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_AssetTypes" "Asset type configuration for onboarding"
Ensure-Field "JML_AssetTypes" "Description" "Note"
Ensure-ChoiceField "JML_AssetTypes" "Category" @("Hardware","Software","Furniture","Access","Other") $true
Ensure-Field "JML_AssetTypes" "EstimatedCost" "Number"
Ensure-Field "JML_AssetTypes" "IsReturnable" "Boolean"
Ensure-Field "JML_AssetTypes" "DefaultQuantity" "Number"
Ensure-Field "JML_AssetTypes" "RequiresApproval" "Boolean"
Ensure-Field "JML_AssetTypes" "ApprovalThreshold" "Number"
Ensure-Field "JML_AssetTypes" "LeadTimeDays" "Number"
Ensure-Field "JML_AssetTypes" "SortOrder" "Number"
Ensure-Field "JML_AssetTypes" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_SystemAccessTypes — System access type configuration
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_SystemAccessTypes" "System access type configuration"
Ensure-Field "JML_SystemAccessTypes" "Description" "Note"
Ensure-ChoiceField "JML_SystemAccessTypes" "Category" @("Core","Department","Optional","Admin")
Ensure-Field "JML_SystemAccessTypes" "DefaultRole" "Text"
Ensure-Field "JML_SystemAccessTypes" "AvailableRoles" "Note"
Ensure-Field "JML_SystemAccessTypes" "LicenseCostMonthly" "Number"
Ensure-Field "JML_SystemAccessTypes" "ProvisioningInstructions" "Note"
Ensure-Field "JML_SystemAccessTypes" "DeprovisioningInstructions" "Note"
Ensure-Field "JML_SystemAccessTypes" "RequiresApproval" "Boolean"
Ensure-Field "JML_SystemAccessTypes" "SortOrder" "Number"
Ensure-Field "JML_SystemAccessTypes" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_TrainingCourses — Training course configuration
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_TrainingCourses" "Training course configuration"
Ensure-Field "JML_TrainingCourses" "Description" "Note"
Ensure-ChoiceField "JML_TrainingCourses" "Category" @("Orientation","Safety","Compliance","Technical","Soft Skills")
Ensure-ChoiceField "JML_TrainingCourses" "DeliveryMethod" @("In-Person","Online Self-Paced","Online Live","Blended")
Ensure-Field "JML_TrainingCourses" "DurationHours" "Number"
Ensure-Field "JML_TrainingCourses" "IsMandatory" "Boolean"
Ensure-Field "JML_TrainingCourses" "MandatoryForDepartments" "Note"
Ensure-Field "JML_TrainingCourses" "ExpirationMonths" "Number"
Ensure-Field "JML_TrainingCourses" "ContentUrl" "Text"
Ensure-Field "JML_TrainingCourses" "Provider" "Text"
Ensure-Field "JML_TrainingCourses" "EstimatedCost" "Number"
Ensure-Field "JML_TrainingCourses" "SortOrder" "Number"
Ensure-Field "JML_TrainingCourses" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_PolicyPacks — Onboarding policy pack bundles
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_PolicyPacks" "Onboarding policy pack bundles"
Ensure-Field "JML_PolicyPacks" "Description" "Note"
Ensure-Field "JML_PolicyPacks" "Department" "Text"
Ensure-Field "JML_PolicyPacks" "JobTitle" "Text"
Ensure-Field "JML_PolicyPacks" "DocumentTypeIds" "Note"
Ensure-Field "JML_PolicyPacks" "AssetTypeIds" "Note"
Ensure-Field "JML_PolicyPacks" "SystemAccessTypeIds" "Note"
Ensure-Field "JML_PolicyPacks" "TrainingCourseIds" "Note"
Ensure-Field "JML_PolicyPacks" "IsDefault" "Boolean"
Ensure-Field "JML_PolicyPacks" "SortOrder" "Number"
Ensure-Field "JML_PolicyPacks" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_Departments — Department configuration
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_Departments" "Department configuration"
Ensure-Field "JML_Departments" "Code" "Text"
Ensure-Field "JML_Departments" "ManagerId" "Number"
Ensure-Field "JML_Departments" "DefaultPolicyPackId" "Number"
Ensure-Field "JML_Departments" "CostCenter" "Text"
Ensure-Field "JML_Departments" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_Configuration — Application configuration settings
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_Configuration" "Application configuration settings"
Ensure-Field "JML_Configuration" "ConfigKey" "Text" $true
Ensure-Field "JML_Configuration" "ConfigValue" "Note"
Ensure-ChoiceField "JML_Configuration" "Category" @("Navigation","General","Display","Notifications")
Ensure-Field "JML_Configuration" "IsActive" "Boolean"

# ══════════════════════════════════════════════════════════════════
# JML_AuditTrail — System audit trail
# ══════════════════════════════════════════════════════════════════
Ensure-List "JML_AuditTrail" "System audit trail"
Ensure-Field "JML_AuditTrail" "Action" "Text"
Ensure-Field "JML_AuditTrail" "EntityType" "Text"
Ensure-Field "JML_AuditTrail" "EntityId" "Number"
Ensure-Field "JML_AuditTrail" "EntityTitle" "Text"
Ensure-Field "JML_AuditTrail" "Details" "Note"

Write-Host ""
Write-Host "=== All JML_ lists provisioned successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "Lists created:" -ForegroundColor White
Write-Host "  - JML_Onboarding" -ForegroundColor Cyan
Write-Host "  - JML_OnboardingTasks" -ForegroundColor Cyan
Write-Host "  - JML_OnboardingTemplates" -ForegroundColor Cyan
Write-Host "  - JML_Mover" -ForegroundColor Cyan
Write-Host "  - JML_MoverTasks" -ForegroundColor Cyan
Write-Host "  - JML_MoverSystemAccess" -ForegroundColor Cyan
Write-Host "  - JML_Offboarding" -ForegroundColor Cyan
Write-Host "  - JML_OffboardingTasks" -ForegroundColor Cyan
Write-Host "  - JML_AssetReturn" -ForegroundColor Cyan
Write-Host "  - JML_DocumentTypes" -ForegroundColor Cyan
Write-Host "  - JML_AssetTypes" -ForegroundColor Cyan
Write-Host "  - JML_SystemAccessTypes" -ForegroundColor Cyan
Write-Host "  - JML_TrainingCourses" -ForegroundColor Cyan
Write-Host "  - JML_PolicyPacks" -ForegroundColor Cyan
Write-Host "  - JML_Departments" -ForegroundColor Cyan
Write-Host "  - JML_Configuration" -ForegroundColor Cyan
Write-Host "  - JML_AuditTrail" -ForegroundColor Cyan
