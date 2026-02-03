# Seed-JMLSampleData.ps1
# Seeds all JML_ lists with rich, realistic South African sample data (15 items per list)
# Prerequisite: Already connected via Connect-PnPOnline to JMLLite site

Write-Host "=== DWx JML Lite — Seeding Sample Data ===" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# Helper: date offsets
# ═══════════════════════════════════════════════════════════════
$today = Get-Date
function DateOffset([int]$days) { return $today.AddDays($days) }

# ═══════════════════════════════════════════════════════════════
# 1. JML_Departments (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host "Seeding JML_Departments..." -ForegroundColor White

$departments = @(
    @{ Title = "Engineering"; Code = "ENG"; CostCenter = "CC-1001"; IsActive = $true },
    @{ Title = "Finance"; Code = "FIN"; CostCenter = "CC-1002"; IsActive = $true },
    @{ Title = "Human Resources"; Code = "HR"; CostCenter = "CC-1003"; IsActive = $true },
    @{ Title = "Marketing"; Code = "MKT"; CostCenter = "CC-1004"; IsActive = $true },
    @{ Title = "Sales"; Code = "SAL"; CostCenter = "CC-1005"; IsActive = $true },
    @{ Title = "Operations"; Code = "OPS"; CostCenter = "CC-1006"; IsActive = $true },
    @{ Title = "Legal"; Code = "LEG"; CostCenter = "CC-1007"; IsActive = $true },
    @{ Title = "Information Technology"; Code = "IT"; CostCenter = "CC-1008"; IsActive = $true },
    @{ Title = "Customer Success"; Code = "CS"; CostCenter = "CC-1009"; IsActive = $true },
    @{ Title = "Product Management"; Code = "PM"; CostCenter = "CC-1010"; IsActive = $true },
    @{ Title = "Design"; Code = "DES"; CostCenter = "CC-1011"; IsActive = $true },
    @{ Title = "Quality Assurance"; Code = "QA"; CostCenter = "CC-1012"; IsActive = $true },
    @{ Title = "Data Analytics"; Code = "ANA"; CostCenter = "CC-1013"; IsActive = $true },
    @{ Title = "Information Security"; Code = "SEC"; CostCenter = "CC-1014"; IsActive = $true },
    @{ Title = "Executive Office"; Code = "EXEC"; CostCenter = "CC-1000"; IsActive = $true }
)

foreach ($dept in $departments) {
    Add-PnPListItem -List "JML_Departments" -Values $dept | Out-Null
    Write-Host "  + $($dept.Title)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 2. JML_DocumentTypes (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_DocumentTypes..." -ForegroundColor White

$documentTypes = @(
    @{ Title = "ID Document / Passport"; Category = "HR"; Description = "South African ID book, ID card, or valid passport"; IsRequired = $true; SortOrder = 1; IsActive = $true },
    @{ Title = "Tax Number (IRP5 / IT3a)"; Category = "Finance"; Description = "SARS tax number documentation or previous employer IRP5"; IsRequired = $true; SortOrder = 2; IsActive = $true },
    @{ Title = "Bank Account Details"; Category = "Finance"; Description = "Bank confirmation letter or cancelled cheque for salary payments"; IsRequired = $true; SortOrder = 3; IsActive = $true },
    @{ Title = "Proof of Residence"; Category = "Compliance"; Description = "Utility bill, bank statement, or lease agreement dated within 3 months"; IsRequired = $true; SortOrder = 4; IsActive = $true },
    @{ Title = "Qualifications / Certifications"; Category = "HR"; Description = "Degree certificates, diplomas, professional certifications"; IsRequired = $false; SortOrder = 5; IsActive = $true },
    @{ Title = "Employment Contract (Signed)"; Category = "Legal"; Description = "Signed employment contract and any addendums"; IsRequired = $true; SortOrder = 6; IsActive = $true },
    @{ Title = "POPIA Consent Form"; Category = "Compliance"; Description = "Protection of Personal Information Act consent form"; IsRequired = $true; SortOrder = 7; IsActive = $true },
    @{ Title = "NDA / Confidentiality Agreement"; Category = "Legal"; Description = "Non-disclosure and confidentiality agreement"; IsRequired = $true; RequiredForDepartments = "Engineering,Product Management,Data Analytics"; SortOrder = 8; IsActive = $true },
    @{ Title = "Medical Aid Application"; Category = "HR"; Description = "Medical aid scheme application form if opting in"; IsRequired = $false; SortOrder = 9; IsActive = $true },
    @{ Title = "Retirement Fund Nomination"; Category = "Finance"; Description = "Pension/provident fund beneficiary nomination form"; IsRequired = $true; SortOrder = 10; IsActive = $true },
    @{ Title = "Emergency Contact Form"; Category = "HR"; Description = "Emergency contact details and next-of-kin information"; IsRequired = $true; SortOrder = 11; IsActive = $true },
    @{ Title = "Vehicle License (if applicable)"; Category = "Compliance"; Description = "Valid driver's license if role requires driving"; IsRequired = $false; RequiredForDepartments = "Sales,Operations"; SortOrder = 12; IsActive = $true },
    @{ Title = "Police Clearance Certificate"; Category = "Compliance"; Description = "SAPS police clearance certificate dated within 6 months"; IsRequired = $true; RequiredForDepartments = "Finance,Information Security,Executive Office"; SortOrder = 13; IsActive = $true },
    @{ Title = "Work Permit (Foreign Nationals)"; Category = "Legal"; Description = "Valid work permit or critical skills visa for non-SA citizens"; IsRequired = $false; SortOrder = 14; IsActive = $true },
    @{ Title = "Company Policy Acknowledgement"; Category = "Compliance"; Description = "Signed acknowledgement of IT, security, and HR policies"; IsRequired = $true; SortOrder = 15; IsActive = $true }
)

foreach ($doc in $documentTypes) {
    Add-PnPListItem -List "JML_DocumentTypes" -Values $doc | Out-Null
    Write-Host "  + $($doc.Title)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 3. JML_AssetTypes (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_AssetTypes..." -ForegroundColor White

$assetTypes = @(
    @{ Title = "Laptop — Standard"; Category = "Hardware"; Description = "Dell Latitude 5540 or equivalent business laptop"; EstimatedCost = 18000; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 5; SortOrder = 1; IsActive = $true },
    @{ Title = "Laptop — Developer"; Category = "Hardware"; Description = "MacBook Pro 14-inch or Dell XPS 15 for development roles"; EstimatedCost = 42000; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $true; ApprovalThreshold = 35000; LeadTimeDays = 10; SortOrder = 2; IsActive = $true },
    @{ Title = "Monitor — 27 inch"; Category = "Hardware"; Description = "Dell P2723QE 27-inch 4K USB-C monitor"; EstimatedCost = 8500; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 3; SortOrder = 3; IsActive = $true },
    @{ Title = "Monitor — Dual Setup"; Category = "Hardware"; Description = "Two Dell P2422H 24-inch monitors"; EstimatedCost = 9000; IsReturnable = $true; DefaultQuantity = 2; RequiresApproval = $false; LeadTimeDays = 3; SortOrder = 4; IsActive = $true },
    @{ Title = "Keyboard & Mouse"; Category = "Hardware"; Description = "Logitech MX Keys + MX Master 3 combo"; EstimatedCost = 4500; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 2; SortOrder = 5; IsActive = $true },
    @{ Title = "Headset — Standard"; Category = "Hardware"; Description = "Jabra Evolve2 40 USB headset"; EstimatedCost = 2800; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 2; SortOrder = 6; IsActive = $true },
    @{ Title = "Headset — Premium"; Category = "Hardware"; Description = "Jabra Evolve2 75 wireless headset with ANC"; EstimatedCost = 6500; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $true; ApprovalThreshold = 5000; LeadTimeDays = 5; SortOrder = 7; IsActive = $true },
    @{ Title = "Webcam"; Category = "Hardware"; Description = "Logitech C920 HD webcam"; EstimatedCost = 1800; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 2; SortOrder = 8; IsActive = $true },
    @{ Title = "Mobile Phone"; Category = "Hardware"; Description = "iPhone 14 or Samsung Galaxy S23 company phone"; EstimatedCost = 22000; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $true; ApprovalThreshold = 15000; LeadTimeDays = 5; SortOrder = 9; IsActive = $true },
    @{ Title = "Laptop Bag / Backpack"; Category = "Hardware"; Description = "Samsonite laptop backpack"; EstimatedCost = 1500; IsReturnable = $false; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 2; SortOrder = 10; IsActive = $true },
    @{ Title = "Docking Station"; Category = "Hardware"; Description = "Dell WD19TBS Thunderbolt dock"; EstimatedCost = 5500; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 3; SortOrder = 11; IsActive = $true },
    @{ Title = "Office Desk"; Category = "Furniture"; Description = "Height-adjustable standing desk"; EstimatedCost = 8000; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 10; SortOrder = 12; IsActive = $true },
    @{ Title = "Office Chair"; Category = "Furniture"; Description = "Ergonomic office chair (Herman Miller style)"; EstimatedCost = 6500; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 7; SortOrder = 13; IsActive = $true },
    @{ Title = "Access Card / Badge"; Category = "Access"; Description = "Building access card and employee ID badge"; EstimatedCost = 150; IsReturnable = $true; DefaultQuantity = 1; RequiresApproval = $false; LeadTimeDays = 1; SortOrder = 14; IsActive = $true },
    @{ Title = "Parking Bay"; Category = "Access"; Description = "Monthly parking bay allocation (if available)"; EstimatedCost = 1500; IsReturnable = $false; DefaultQuantity = 1; RequiresApproval = $true; ApprovalThreshold = 0; LeadTimeDays = 1; SortOrder = 15; IsActive = $true }
)

foreach ($asset in $assetTypes) {
    Add-PnPListItem -List "JML_AssetTypes" -Values $asset | Out-Null
    Write-Host "  + $($asset.Title)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 4. JML_SystemAccessTypes (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_SystemAccessTypes..." -ForegroundColor White

$systemAccessTypes = @(
    @{ Title = "Microsoft 365 (E3)"; Category = "Core"; Description = "Email, Teams, SharePoint, OneDrive, Office apps"; DefaultRole = "Standard User"; AvailableRoles = "Standard User,Power User,Admin"; LicenseCostMonthly = 650; ProvisioningInstructions = "Create user in Azure AD, assign M365 E3 license, add to relevant Teams channels"; DeprovisioningInstructions = "Disable account, convert mailbox to shared, remove from all Teams"; RequiresApproval = $false; SortOrder = 1; IsActive = $true },
    @{ Title = "Microsoft 365 (E5)"; Category = "Core"; Description = "E3 + advanced security, compliance, and analytics"; DefaultRole = "Standard User"; AvailableRoles = "Standard User,Security Admin,Compliance Admin"; LicenseCostMonthly = 1100; RequiresApproval = $true; SortOrder = 2; IsActive = $true },
    @{ Title = "Azure DevOps"; Category = "Department"; Description = "Source control, CI/CD pipelines, work item tracking"; DefaultRole = "Contributor"; AvailableRoles = "Reader,Contributor,Project Admin"; LicenseCostMonthly = 0; ProvisioningInstructions = "Add to relevant Azure DevOps org and projects"; RequiresApproval = $false; SortOrder = 3; IsActive = $true },
    @{ Title = "GitHub Enterprise"; Category = "Department"; Description = "Source code repositories and collaboration"; DefaultRole = "Member"; AvailableRoles = "Member,Maintainer,Admin"; LicenseCostMonthly = 350; RequiresApproval = $false; SortOrder = 4; IsActive = $true },
    @{ Title = "SAP SuccessFactors"; Category = "Core"; Description = "HR self-service, leave management, performance reviews"; DefaultRole = "Employee"; AvailableRoles = "Employee,Manager,HR Admin"; LicenseCostMonthly = 250; RequiresApproval = $false; SortOrder = 5; IsActive = $true },
    @{ Title = "SAP S/4HANA"; Category = "Department"; Description = "ERP system for Finance and Operations"; DefaultRole = "Display Only"; AvailableRoles = "Display Only,Transaction User,Super User"; LicenseCostMonthly = 800; RequiresApproval = $true; SortOrder = 6; IsActive = $true },
    @{ Title = "Power BI Pro"; Category = "Department"; Description = "Business intelligence and reporting dashboards"; DefaultRole = "Viewer"; AvailableRoles = "Viewer,Creator,Admin"; LicenseCostMonthly = 180; RequiresApproval = $false; SortOrder = 7; IsActive = $true },
    @{ Title = "Salesforce CRM"; Category = "Department"; Description = "Customer relationship management for Sales team"; DefaultRole = "Standard User"; AvailableRoles = "Standard User,Admin"; LicenseCostMonthly = 1500; RequiresApproval = $false; SortOrder = 8; IsActive = $true },
    @{ Title = "Jira / Confluence"; Category = "Department"; Description = "Project management and documentation wiki"; DefaultRole = "User"; AvailableRoles = "User,Admin"; LicenseCostMonthly = 120; RequiresApproval = $false; SortOrder = 9; IsActive = $true },
    @{ Title = "Figma"; Category = "Department"; Description = "Design collaboration and prototyping tool"; DefaultRole = "Viewer"; AvailableRoles = "Viewer,Editor,Admin"; LicenseCostMonthly = 200; RequiresApproval = $false; SortOrder = 10; IsActive = $true },
    @{ Title = "Azure Portal"; Category = "Admin"; Description = "Cloud infrastructure management"; DefaultRole = "Reader"; AvailableRoles = "Reader,Contributor,Owner"; LicenseCostMonthly = 0; RequiresApproval = $true; SortOrder = 11; IsActive = $true },
    @{ Title = "ServiceNow"; Category = "Department"; Description = "IT service management and ticketing"; DefaultRole = "Requester"; AvailableRoles = "Requester,Fulfiller,Admin"; LicenseCostMonthly = 300; RequiresApproval = $false; SortOrder = 12; IsActive = $true },
    @{ Title = "Slack"; Category = "Optional"; Description = "Team messaging and collaboration"; DefaultRole = "Member"; AvailableRoles = "Member,Admin"; LicenseCostMonthly = 130; RequiresApproval = $false; SortOrder = 13; IsActive = $true },
    @{ Title = "VPN Access"; Category = "Core"; Description = "GlobalProtect VPN for remote access"; DefaultRole = "Standard"; AvailableRoles = "Standard,Full Tunnel"; LicenseCostMonthly = 0; ProvisioningInstructions = "Add to VPN user group in Azure AD"; DeprovisioningInstructions = "Remove from VPN group, revoke certificates"; RequiresApproval = $false; SortOrder = 14; IsActive = $true },
    @{ Title = "Building Management System"; Category = "Admin"; Description = "Access to building HVAC and security controls"; DefaultRole = "Viewer"; AvailableRoles = "Viewer,Operator,Admin"; LicenseCostMonthly = 0; RequiresApproval = $true; SortOrder = 15; IsActive = $true }
)

foreach ($sys in $systemAccessTypes) {
    Add-PnPListItem -List "JML_SystemAccessTypes" -Values $sys | Out-Null
    Write-Host "  + $($sys.Title)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 5. JML_TrainingCourses (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_TrainingCourses..." -ForegroundColor White

$trainingCourses = @(
    @{ Title = "Company Orientation"; Category = "Orientation"; Description = "Introduction to company history, values, and culture"; DeliveryMethod = "In-Person"; DurationHours = 4; IsMandatory = $true; ExpirationMonths = 0; Provider = "Internal HR"; EstimatedCost = 0; SortOrder = 1; IsActive = $true },
    @{ Title = "POPIA Awareness"; Category = "Compliance"; Description = "Protection of Personal Information Act training"; DeliveryMethod = "Online Self-Paced"; DurationHours = 2; IsMandatory = $true; ExpirationMonths = 12; ContentUrl = "https://training.example.com/popia"; Provider = "Internal Compliance"; EstimatedCost = 0; SortOrder = 2; IsActive = $true },
    @{ Title = "Information Security Fundamentals"; Category = "Compliance"; Description = "Cybersecurity awareness, phishing prevention, password hygiene"; DeliveryMethod = "Online Self-Paced"; DurationHours = 3; IsMandatory = $true; ExpirationMonths = 12; ContentUrl = "https://training.example.com/infosec"; Provider = "KnowBe4"; EstimatedCost = 500; SortOrder = 3; IsActive = $true },
    @{ Title = "Health & Safety Induction"; Category = "Safety"; Description = "OHS Act requirements, emergency procedures, first aid locations"; DeliveryMethod = "In-Person"; DurationHours = 2; IsMandatory = $true; ExpirationMonths = 24; Provider = "Internal H&S"; EstimatedCost = 0; SortOrder = 4; IsActive = $true },
    @{ Title = "Anti-Harassment & Diversity"; Category = "Compliance"; Description = "Workplace harassment prevention and diversity training"; DeliveryMethod = "Online Self-Paced"; DurationHours = 2; IsMandatory = $true; ExpirationMonths = 12; Provider = "Internal HR"; EstimatedCost = 0; SortOrder = 5; IsActive = $true },
    @{ Title = "Microsoft 365 Essentials"; Category = "Technical"; Description = "Teams, SharePoint, OneDrive, Outlook basics"; DeliveryMethod = "Online Self-Paced"; DurationHours = 4; IsMandatory = $true; MandatoryForDepartments = "All"; ContentUrl = "https://learn.microsoft.com/training/m365"; Provider = "Microsoft Learn"; EstimatedCost = 0; SortOrder = 6; IsActive = $true },
    @{ Title = "Azure DevOps for Developers"; Category = "Technical"; Description = "Git workflows, PR reviews, CI/CD pipelines"; DeliveryMethod = "Online Live"; DurationHours = 8; IsMandatory = $false; MandatoryForDepartments = "Engineering,Quality Assurance"; Provider = "Internal Engineering"; EstimatedCost = 0; SortOrder = 7; IsActive = $true },
    @{ Title = "Agile/Scrum Foundations"; Category = "Soft Skills"; Description = "Agile methodology, Scrum ceremonies, sprint planning"; DeliveryMethod = "In-Person"; DurationHours = 8; IsMandatory = $false; MandatoryForDepartments = "Engineering,Product Management,Design"; Provider = "Scrum.org"; EstimatedCost = 2500; SortOrder = 8; IsActive = $true },
    @{ Title = "Manager Essentials"; Category = "Soft Skills"; Description = "Performance management, feedback, 1-on-1s, team leadership"; DeliveryMethod = "Blended"; DurationHours = 16; IsMandatory = $false; Provider = "GIBS"; EstimatedCost = 8000; SortOrder = 9; IsActive = $true },
    @{ Title = "First Aid Level 1"; Category = "Safety"; Description = "Department of Labour accredited first aid training"; DeliveryMethod = "In-Person"; DurationHours = 8; IsMandatory = $false; ExpirationMonths = 36; Provider = "St John Ambulance SA"; EstimatedCost = 1500; SortOrder = 10; IsActive = $true },
    @{ Title = "Fire Warden Training"; Category = "Safety"; Description = "Fire safety, evacuation procedures, extinguisher use"; DeliveryMethod = "In-Person"; DurationHours = 4; IsMandatory = $false; ExpirationMonths = 24; Provider = "SAQCC"; EstimatedCost = 800; SortOrder = 11; IsActive = $true },
    @{ Title = "Power BI Fundamentals"; Category = "Technical"; Description = "Building reports and dashboards in Power BI"; DeliveryMethod = "Online Self-Paced"; DurationHours = 6; IsMandatory = $false; MandatoryForDepartments = "Data Analytics,Finance"; ContentUrl = "https://learn.microsoft.com/training/powerbi"; Provider = "Microsoft Learn"; EstimatedCost = 0; SortOrder = 12; IsActive = $true },
    @{ Title = "Customer Service Excellence"; Category = "Soft Skills"; Description = "Customer communication, conflict resolution, service recovery"; DeliveryMethod = "Online Live"; DurationHours = 4; IsMandatory = $false; MandatoryForDepartments = "Customer Success,Sales"; Provider = "Internal CS"; EstimatedCost = 0; SortOrder = 13; IsActive = $true },
    @{ Title = "B-BBEE Awareness"; Category = "Compliance"; Description = "Broad-Based Black Economic Empowerment Act overview"; DeliveryMethod = "Online Self-Paced"; DurationHours = 2; IsMandatory = $false; ExpirationMonths = 24; Provider = "Internal Finance"; EstimatedCost = 0; SortOrder = 14; IsActive = $true },
    @{ Title = "Interview Skills for Hiring Managers"; Category = "Soft Skills"; Description = "Structured interviewing, bias awareness, candidate assessment"; DeliveryMethod = "In-Person"; DurationHours = 4; IsMandatory = $false; Provider = "Internal HR"; EstimatedCost = 0; SortOrder = 15; IsActive = $true }
)

foreach ($course in $trainingCourses) {
    Add-PnPListItem -List "JML_TrainingCourses" -Values $course | Out-Null
    Write-Host "  + $($course.Title)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 6. JML_PolicyPacks (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_PolicyPacks..." -ForegroundColor White

$policyPacks = @(
    @{ Title = "Standard Employee Pack"; Description = "Default onboarding bundle for all employees"; IsDefault = $true; DocumentTypeIds = "1,2,3,4,6,7,10,11,15"; AssetTypeIds = "1,3,5,6,8,14"; SystemAccessTypeIds = "1,5,14"; TrainingCourseIds = "1,2,3,4,5,6"; SortOrder = 1; IsActive = $true },
    @{ Title = "Software Developer Pack"; Department = "Engineering"; Description = "Developer-specific tools and access"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,15"; AssetTypeIds = "2,4,5,7,8,10,11,14"; SystemAccessTypeIds = "1,3,4,5,9,11,14"; TrainingCourseIds = "1,2,3,4,5,6,7,8"; SortOrder = 2; IsActive = $true },
    @{ Title = "Finance Team Pack"; Department = "Finance"; Description = "Finance and accounting specific requirements"; DocumentTypeIds = "1,2,3,4,6,7,10,11,13,15"; AssetTypeIds = "1,3,5,6,8,14"; SystemAccessTypeIds = "1,5,6,7,14"; TrainingCourseIds = "1,2,3,4,5,6,12,14"; SortOrder = 3; IsActive = $true },
    @{ Title = "HR Team Pack"; Department = "Human Resources"; Description = "Human Resources specific access and training"; DocumentTypeIds = "1,2,3,4,6,7,10,11,15"; AssetTypeIds = "1,3,5,6,8,14"; SystemAccessTypeIds = "1,5,7,14"; TrainingCourseIds = "1,2,3,4,5,6,9,14,15"; SortOrder = 4; IsActive = $true },
    @{ Title = "Sales Team Pack"; Department = "Sales"; Description = "Sales-specific CRM access and mobile"; DocumentTypeIds = "1,2,3,4,6,7,10,11,12,15"; AssetTypeIds = "1,3,5,6,8,9,10,14"; SystemAccessTypeIds = "1,5,8,14"; TrainingCourseIds = "1,2,3,4,5,6,13"; SortOrder = 5; IsActive = $true },
    @{ Title = "Executive Pack"; Department = "Executive Office"; Description = "C-suite and senior leadership"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,13,15"; AssetTypeIds = "2,3,5,7,8,9,10,12,13,14,15"; SystemAccessTypeIds = "1,2,5,6,7,8,11,14"; TrainingCourseIds = "1,2,3,4,5,6,9"; SortOrder = 6; IsActive = $true },
    @{ Title = "Designer Pack"; Department = "Design"; Description = "UX/UI designers and creative team"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,15"; AssetTypeIds = "2,4,5,7,8,10,14"; SystemAccessTypeIds = "1,3,5,9,10,14"; TrainingCourseIds = "1,2,3,4,5,6,8"; SortOrder = 7; IsActive = $true },
    @{ Title = "QA Engineer Pack"; Department = "Quality Assurance"; Description = "QA and test automation engineers"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,15"; AssetTypeIds = "2,4,5,6,8,10,11,14"; SystemAccessTypeIds = "1,3,4,5,9,14"; TrainingCourseIds = "1,2,3,4,5,6,7,8"; SortOrder = 8; IsActive = $true },
    @{ Title = "Data Analytics Pack"; Department = "Data Analytics"; Description = "Data analysts and scientists"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,15"; AssetTypeIds = "2,4,5,6,8,10,11,14"; SystemAccessTypeIds = "1,3,5,7,11,14"; TrainingCourseIds = "1,2,3,4,5,6,12"; SortOrder = 9; IsActive = $true },
    @{ Title = "InfoSec Pack"; Department = "Information Security"; Description = "Information security analysts"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,13,15"; AssetTypeIds = "2,4,5,7,8,10,14"; SystemAccessTypeIds = "1,2,3,5,11,14"; TrainingCourseIds = "1,2,3,4,5,6"; SortOrder = 10; IsActive = $true },
    @{ Title = "Customer Success Pack"; Department = "Customer Success"; Description = "Customer success and support roles"; DocumentTypeIds = "1,2,3,4,6,7,10,11,15"; AssetTypeIds = "1,3,5,6,8,14"; SystemAccessTypeIds = "1,5,8,12,14"; TrainingCourseIds = "1,2,3,4,5,6,13"; SortOrder = 11; IsActive = $true },
    @{ Title = "Marketing Pack"; Department = "Marketing"; Description = "Marketing and communications team"; DocumentTypeIds = "1,2,3,4,6,7,10,11,15"; AssetTypeIds = "1,3,5,6,8,14"; SystemAccessTypeIds = "1,5,7,10,13,14"; TrainingCourseIds = "1,2,3,4,5,6"; SortOrder = 12; IsActive = $true },
    @{ Title = "Operations Pack"; Department = "Operations"; Description = "Operations and facilities management"; DocumentTypeIds = "1,2,3,4,6,7,10,11,12,15"; AssetTypeIds = "1,3,5,6,8,9,14"; SystemAccessTypeIds = "1,5,12,14,15"; TrainingCourseIds = "1,2,3,4,5,6,10,11"; SortOrder = 13; IsActive = $true },
    @{ Title = "Legal Pack"; Department = "Legal"; Description = "Legal counsel and compliance officers"; DocumentTypeIds = "1,2,3,4,6,7,8,10,11,13,15"; AssetTypeIds = "1,3,5,6,8,14"; SystemAccessTypeIds = "1,5,9,14"; TrainingCourseIds = "1,2,3,4,5,6,14"; SortOrder = 14; IsActive = $true },
    @{ Title = "Contractor Pack"; Description = "Temporary contractors and consultants (limited access)"; DocumentTypeIds = "1,4,6,7,8,15"; AssetTypeIds = "1,5,14"; SystemAccessTypeIds = "1,3,14"; TrainingCourseIds = "1,2,3,4,5"; SortOrder = 15; IsActive = $true }
)

foreach ($pack in $policyPacks) {
    Add-PnPListItem -List "JML_PolicyPacks" -Values $pack | Out-Null
    Write-Host "  + $($pack.Title)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 7. JML_Onboarding (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_Onboarding..." -ForegroundColor White

$onboardings = @(
    @{ Title = "Onboarding — Thandi Mkhize"; CandidateId = 1; CandidateName = "Thandi Mkhize"; JobTitle = "Senior Software Engineer"; Department = "Engineering"; StartDate = DateOffset 14; Status = "In Progress"; CompletionPercentage = 45; TotalTasks = 12; CompletedTasks = 5; DueDate = DateOffset 28; Notes = "High-priority hire from Dimension Data. Strong Azure background. Assigned buddy: Sipho Nkosi." },
    @{ Title = "Onboarding — Johan van der Berg"; CandidateId = 2; CandidateName = "Johan van der Berg"; JobTitle = "Lead Developer"; Department = "Engineering"; StartDate = DateOffset 21; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 12; CompletedTasks = 0; DueDate = DateOffset 35; Notes = "Senior hire from BBD. Will lead the platform team. Negotiating signing bonus." },
    @{ Title = "Onboarding — Priya Naidoo"; CandidateId = 3; CandidateName = "Priya Naidoo"; JobTitle = "UX/UI Designer"; Department = "Design"; StartDate = DateOffset 30; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 10; CompletedTasks = 0; DueDate = DateOffset 44; Notes = "Relocating from Durban to Cape Town. Company assisting with relocation." },
    @{ Title = "Onboarding — David Mokoena"; CandidateId = 4; CandidateName = "David Mokoena"; JobTitle = "SharePoint Developer"; Department = "Engineering"; StartDate = DateOffset -7; Status = "In Progress"; CompletionPercentage = 75; TotalTasks = 12; CompletedTasks = 9; DueDate = DateOffset 7; Notes = "On track for completion. Excellent first week. Already contributing to Sprint." },
    @{ Title = "Onboarding — Fatima Ismail"; CandidateId = 5; CandidateName = "Fatima Ismail"; JobTitle = "Data Analyst"; Department = "Data Analytics"; StartDate = DateOffset 7; Status = "In Progress"; CompletionPercentage = 25; TotalTasks = 11; CompletedTasks = 3; DueDate = DateOffset 21; Notes = "Joined from Derivco. Waiting on Power BI Pro license." },
    @{ Title = "Onboarding — Sipho Dlamini"; CandidateId = 6; CandidateName = "Sipho Dlamini"; JobTitle = "DevOps Engineer"; Department = "Engineering"; StartDate = DateOffset 35; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 13; CompletedTasks = 0; DueDate = DateOffset 49; Notes = "Coming from DVT. Azure certification pending — completing AZ-104 before start." },
    @{ Title = "Onboarding — Lerato Molefe"; CandidateId = 7; CandidateName = "Lerato Molefe"; JobTitle = "Project Manager"; Department = "Product Management"; StartDate = DateOffset -21; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 10; CompletedTasks = 10; DueDate = DateOffset -7; CompletedDate = DateOffset -5; Notes = "Fully onboarded. Already leading the digital transformation programme." },
    @{ Title = "Onboarding — Anika Botha"; CandidateId = 8; CandidateName = "Anika Botha"; JobTitle = "Cybersecurity Analyst"; Department = "Information Security"; StartDate = DateOffset 14; Status = "In Progress"; CompletionPercentage = 30; TotalTasks = 14; CompletedTasks = 4; DueDate = DateOffset 28; Notes = "Critical hire for security team. Police clearance in progress." },
    @{ Title = "Onboarding — Andile Zuma"; CandidateId = 9; CandidateName = "Andile Zuma"; JobTitle = "Business Analyst"; Department = "Product Management"; StartDate = DateOffset -30; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 10; CompletedTasks = 10; DueDate = DateOffset -16; CompletedDate = DateOffset -14; Notes = "Strong onboarding. Already well integrated into the PMO team." },
    @{ Title = "Onboarding — Sarah O'Connor"; CandidateId = 10; CandidateName = "Sarah O'Connor"; JobTitle = "Financial Accountant"; Department = "Finance"; StartDate = DateOffset 45; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 12; CompletedTasks = 0; DueDate = DateOffset 59; Notes = "CA(SA) from Woolworths FS. Delayed start due to notice period." },
    @{ Title = "Onboarding — Kabelo Mabena"; CandidateId = 11; CandidateName = "Kabelo Mabena"; JobTitle = "QA Automation Engineer"; Department = "Quality Assurance"; StartDate = DateOffset 7; Status = "In Progress"; CompletionPercentage = 50; TotalTasks = 12; CompletedTasks = 6; DueDate = DateOffset 21; Notes = "Playwright expert. Short notice period from freelancing." },
    @{ Title = "Onboarding — Michelle du Plessis"; CandidateId = 12; CandidateName = "Michelle du Plessis"; JobTitle = "HR Business Partner"; Department = "Human Resources"; StartDate = DateOffset 21; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 10; CompletedTasks = 0; DueDate = DateOffset 35; Notes = "Background check cleared. SABPP registered. Cape Town based." },
    @{ Title = "Onboarding — Nkosi Mthembu"; CandidateId = 13; CandidateName = "Nkosi Mthembu"; JobTitle = "Cloud Solutions Architect"; Department = "Engineering"; StartDate = DateOffset 28; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 14; CompletedTasks = 0; DueDate = DateOffset 42; Notes = "Senior strategic hire. Executive-level onboarding. Dual-cloud certified." },
    @{ Title = "Onboarding — Zanele Khumalo"; CandidateId = 14; CandidateName = "Zanele Khumalo"; JobTitle = "Software Developer"; Department = "Engineering"; StartDate = DateOffset -45; Status = "Cancelled"; CompletionPercentage = 15; TotalTasks = 12; CompletedTasks = 2; Notes = "Onboarding cancelled — candidate withdrew after accepting Amazon counter-offer." },
    @{ Title = "Onboarding — Pieter Joubert"; CandidateId = 15; CandidateName = "Pieter Joubert"; JobTitle = "Marketing Coordinator"; Department = "Marketing"; StartDate = DateOffset -60; Status = "On Hold"; CompletionPercentage = 60; TotalTasks = 10; CompletedTasks = 6; Notes = "Onboarding paused — employee on extended sick leave since week 2." }
)

foreach ($onb in $onboardings) {
    Add-PnPListItem -List "JML_Onboarding" -Values $onb | Out-Null
    Write-Host "  + $($onb.CandidateName) [$($onb.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 8. JML_OnboardingTasks (15 items - sample from first onboarding)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_OnboardingTasks..." -ForegroundColor White

$onboardingTasks = @(
    @{ Title = "Collect ID Document"; OnboardingId = 1; Description = "Obtain certified copy of South African ID or passport"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 7; CompletedDate = DateOffset 5; SortOrder = 1 },
    @{ Title = "Collect Tax Documentation"; OnboardingId = 1; Description = "Obtain SARS tax number and previous IRP5"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 7; CompletedDate = DateOffset 6; SortOrder = 2 },
    @{ Title = "Bank Details Confirmation"; OnboardingId = 1; Description = "Collect bank confirmation letter for payroll"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 7; CompletedDate = DateOffset 5; SortOrder = 3 },
    @{ Title = "Sign Employment Contract"; OnboardingId = 1; Description = "Review and sign employment contract with HR"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 0; CompletedDate = DateOffset -2; SortOrder = 4 },
    @{ Title = "POPIA Consent Form"; OnboardingId = 1; Description = "Sign POPIA consent form for data processing"; Category = "Documentation"; Status = "Completed"; Priority = "Medium"; DueDate = DateOffset 7; CompletedDate = DateOffset 5; SortOrder = 5 },
    @{ Title = "Provision M365 Account"; OnboardingId = 1; Description = "Create Azure AD account and assign M365 E3 license"; Category = "System Access"; Status = "In Progress"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 6; Notes = "Waiting on license allocation from IT" },
    @{ Title = "Azure DevOps Access"; OnboardingId = 1; Description = "Add to Azure DevOps organisation and relevant projects"; Category = "System Access"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 7 },
    @{ Title = "GitHub Enterprise Access"; OnboardingId = 1; Description = "Add to GitHub org and appropriate repositories"; Category = "System Access"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 8 },
    @{ Title = "Order Developer Laptop"; OnboardingId = 1; Description = "MacBook Pro 14-inch with M3 Pro chip"; Category = "Equipment"; Status = "In Progress"; Priority = "High"; DueDate = DateOffset 10; SortOrder = 9; Notes = "Order placed with Digicape. Expected delivery Thu." },
    @{ Title = "Order Monitor Setup"; OnboardingId = 1; Description = "Dual Dell 24-inch monitor setup with dock"; Category = "Equipment"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 12; SortOrder = 10 },
    @{ Title = "Complete POPIA Training"; OnboardingId = 1; Description = "Complete online POPIA awareness training"; Category = "Training"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 21; SortOrder = 11 },
    @{ Title = "Complete InfoSec Training"; OnboardingId = 1; Description = "Complete information security fundamentals (KnowBe4)"; Category = "Training"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 21; SortOrder = 12 },
    @{ Title = "Attend Company Orientation"; OnboardingId = 4; Description = "Attend in-person orientation session with HR"; Category = "Orientation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset -5; CompletedDate = DateOffset -5; SortOrder = 1 },
    @{ Title = "Meet with Buddy"; OnboardingId = 4; Description = "Initial meeting with assigned onboarding buddy"; Category = "Orientation"; Status = "Completed"; Priority = "Medium"; DueDate = DateOffset -3; CompletedDate = DateOffset -4; SortOrder = 2 },
    @{ Title = "Complete OHS Induction"; OnboardingId = 4; Description = "Complete occupational health and safety induction"; Category = "Compliance"; Status = "Completed"; Priority = "High"; DueDate = DateOffset -1; CompletedDate = DateOffset -2; SortOrder = 3 }
)

foreach ($task in $onboardingTasks) {
    Add-PnPListItem -List "JML_OnboardingTasks" -Values $task | Out-Null
    Write-Host "  + $($task.Title) [$($task.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 9. JML_Mover (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_Mover..." -ForegroundColor White

$movers = @(
    @{ Title = "Transfer — Themba Ndlovu"; EmployeeId = 101; EmployeeName = "Themba Ndlovu"; EmployeeEmail = "themba.ndlovu@company.co.za"; CurrentJobTitle = "Software Developer"; CurrentDepartment = "Engineering"; CurrentLocation = "Johannesburg"; NewJobTitle = "Senior Software Developer"; NewDepartment = "Engineering"; NewLocation = "Johannesburg"; MoverType = "Promotion"; EffectiveDate = DateOffset 1; Status = "In Progress"; CompletionPercentage = 60; TotalTasks = 8; CompletedTasks = 5; CurrentSalary = 650000; NewSalary = 800000; SalaryChangePercentage = 23; Notes = "Promoted after strong performance review. Lead role on payment platform." },
    @{ Title = "Transfer — Nomvula Dube"; EmployeeId = 102; EmployeeName = "Nomvula Dube"; EmployeeEmail = "nomvula.dube@company.co.za"; CurrentJobTitle = "Data Analyst"; CurrentDepartment = "Data Analytics"; CurrentLocation = "Johannesburg"; NewJobTitle = "Data Engineer"; NewDepartment = "Engineering"; NewLocation = "Johannesburg"; MoverType = "Department Transfer"; EffectiveDate = DateOffset 14; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 10; CompletedTasks = 0; CurrentSalary = 520000; NewSalary = 620000; SalaryChangePercentage = 19; Notes = "Moving to Engineering to build data pipelines. Requires Azure DevOps access." },
    @{ Title = "Transfer — Willem Pretorius"; EmployeeId = 103; EmployeeName = "Willem Pretorius"; EmployeeEmail = "willem.pretorius@company.co.za"; CurrentJobTitle = "Sales Representative"; CurrentDepartment = "Sales"; CurrentLocation = "Cape Town"; NewJobTitle = "Sales Representative"; NewDepartment = "Sales"; NewLocation = "Johannesburg"; MoverType = "Location Change"; EffectiveDate = DateOffset 30; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 12; CompletedTasks = 0; CurrentSalary = 480000; NewSalary = 520000; SalaryChangePercentage = 8; Notes = "Relocating to Gauteng for family reasons. Company assisting with relocation costs." },
    @{ Title = "Transfer — Blessing Moyo"; EmployeeId = 104; EmployeeName = "Blessing Moyo"; EmployeeEmail = "blessing.moyo@company.co.za"; CurrentJobTitle = "Customer Support Specialist"; CurrentDepartment = "Customer Success"; CurrentLocation = "Durban"; NewJobTitle = "Customer Success Manager"; NewDepartment = "Customer Success"; NewLocation = "Durban"; MoverType = "Promotion"; EffectiveDate = DateOffset -7; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 8; CompletedTasks = 8; CurrentSalary = 320000; NewSalary = 450000; SalaryChangePercentage = 41; Notes = "Promoted to manage enterprise accounts. All access updated." },
    @{ Title = "Transfer — Lindiwe Sithole"; EmployeeId = 105; EmployeeName = "Lindiwe Sithole"; EmployeeEmail = "lindiwe.sithole@company.co.za"; CurrentJobTitle = "Marketing Specialist"; CurrentDepartment = "Marketing"; CurrentLocation = "Johannesburg"; NewJobTitle = "Product Marketing Manager"; NewDepartment = "Product Management"; NewLocation = "Johannesburg"; MoverType = "Department Transfer"; EffectiveDate = DateOffset 7; Status = "In Progress"; CompletionPercentage = 40; TotalTasks = 10; CompletedTasks = 4; CurrentSalary = 450000; NewSalary = 580000; SalaryChangePercentage = 29; Notes = "Moving to PM to lead go-to-market for new product line." },
    @{ Title = "Transfer — Ruan van Wyk"; EmployeeId = 106; EmployeeName = "Ruan van Wyk"; EmployeeEmail = "ruan.vanwyk@company.co.za"; CurrentJobTitle = "Team Lead — QA"; CurrentDepartment = "Quality Assurance"; CurrentLocation = "Cape Town"; NewJobTitle = "QA Manager"; NewDepartment = "Quality Assurance"; NewLocation = "Johannesburg"; MoverType = "Promotion"; EffectiveDate = DateOffset 21; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 11; CompletedTasks = 0; CurrentSalary = 720000; NewSalary = 850000; SalaryChangePercentage = 18; ApprovalRequired = $true; Notes = "Promoted to head QA nationally. Relocating to JHB head office." },
    @{ Title = "Transfer — Ntombi Zwane"; EmployeeId = 107; EmployeeName = "Ntombi Zwane"; EmployeeEmail = "ntombi.zwane@company.co.za"; CurrentJobTitle = "Junior Accountant"; CurrentDepartment = "Finance"; CurrentLocation = "Johannesburg"; NewJobTitle = "Accountant"; NewDepartment = "Finance"; NewLocation = "Johannesburg"; MoverType = "Role Change"; EffectiveDate = DateOffset -14; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 6; CompletedTasks = 6; CurrentSalary = 380000; NewSalary = 480000; SalaryChangePercentage = 26; Notes = "Completed SAICA articles. Updated to full accountant role." },
    @{ Title = "Transfer — Michael Johnson"; EmployeeId = 108; EmployeeName = "Michael Johnson"; EmployeeEmail = "michael.johnson@company.co.za"; CurrentJobTitle = "Solutions Architect"; CurrentDepartment = "Engineering"; CurrentLocation = "Johannesburg"; NewJobTitle = "Principal Architect"; NewDepartment = "Engineering"; NewLocation = "Johannesburg"; MoverType = "Promotion"; EffectiveDate = DateOffset 14; Status = "In Progress"; CompletionPercentage = 20; TotalTasks = 9; CompletedTasks = 2; CurrentSalary = 1200000; NewSalary = 1450000; SalaryChangePercentage = 21; ApprovalRequired = $true; ApprovalDate = DateOffset -5; Notes = "Promoted to Principal level. CTO approved. Executive package." },
    @{ Title = "Transfer — Kefilwe Mabuza"; EmployeeId = 109; EmployeeName = "Kefilwe Mabuza"; EmployeeEmail = "kefilwe.mabuza@company.co.za"; CurrentJobTitle = "HR Coordinator"; CurrentDepartment = "Human Resources"; CurrentLocation = "Johannesburg"; NewJobTitle = "HR Business Partner"; NewDepartment = "Human Resources"; NewLocation = "Cape Town"; MoverType = "Promotion"; EffectiveDate = DateOffset 45; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 12; CompletedTasks = 0; CurrentSalary = 420000; NewSalary = 580000; SalaryChangePercentage = 38; Notes = "Promoted to HRBP for CT office. Relocation support approved." },
    @{ Title = "Transfer — Craig Williams"; EmployeeId = 110; EmployeeName = "Craig Williams"; EmployeeEmail = "craig.williams@company.co.za"; CurrentJobTitle = "Engineering Manager"; CurrentDepartment = "Engineering"; CurrentLocation = "Johannesburg"; NewJobTitle = "Director of Engineering"; NewDepartment = "Engineering"; NewLocation = "Johannesburg"; MoverType = "Promotion"; EffectiveDate = DateOffset 30; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 10; CompletedTasks = 0; CurrentSalary = 1400000; NewSalary = 1800000; SalaryChangePercentage = 29; ApprovalRequired = $true; Notes = "Executive promotion. Board approval pending." },
    @{ Title = "Transfer — Precious Mthethwa"; EmployeeId = 111; EmployeeName = "Precious Mthethwa"; EmployeeEmail = "precious.mthethwa@company.co.za"; CurrentJobTitle = "Frontend Developer"; CurrentDepartment = "Engineering"; CurrentLocation = "Durban"; NewJobTitle = "Frontend Developer"; NewDepartment = "Design"; NewLocation = "Cape Town"; MoverType = "Team Restructure"; EffectiveDate = DateOffset 14; Status = "In Progress"; CompletionPercentage = 35; TotalTasks = 11; CompletedTasks = 4; CurrentSalary = 550000; NewSalary = 580000; SalaryChangePercentage = 5; Notes = "Moving to Design team as part of frontend reorg. Design System focus." },
    @{ Title = "Transfer — Jan de Beer"; EmployeeId = 112; EmployeeName = "Jan de Beer"; EmployeeEmail = "jan.debeer@company.co.za"; CurrentJobTitle = "Senior Accountant"; CurrentDepartment = "Finance"; CurrentLocation = "Cape Town"; NewJobTitle = "Finance Manager"; NewDepartment = "Finance"; NewLocation = "Cape Town"; MoverType = "Promotion"; EffectiveDate = DateOffset -21; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 8; CompletedTasks = 8; CurrentSalary = 680000; NewSalary = 850000; SalaryChangePercentage = 25; Notes = "Promoted to Finance Manager. Now oversees CT finance team." },
    @{ Title = "Transfer — Thulani Ngcobo"; EmployeeId = 113; EmployeeName = "Thulani Ngcobo"; EmployeeEmail = "thulani.ngcobo@company.co.za"; CurrentJobTitle = "IT Support Technician"; CurrentDepartment = "Information Technology"; CurrentLocation = "Johannesburg"; NewJobTitle = "Junior DevOps Engineer"; NewDepartment = "Engineering"; NewLocation = "Johannesburg"; MoverType = "Department Transfer"; EffectiveDate = DateOffset 7; Status = "In Progress"; CompletionPercentage = 70; TotalTasks = 10; CompletedTasks = 7; CurrentSalary = 320000; NewSalary = 450000; SalaryChangePercentage = 41; Notes = "Internal upskilling success story. Completed Azure certs, moving to Engineering." },
    @{ Title = "Transfer — Sandra Nel"; EmployeeId = 114; EmployeeName = "Sandra Nel"; EmployeeEmail = "sandra.nel@company.co.za"; CurrentJobTitle = "Operations Coordinator"; CurrentDepartment = "Operations"; CurrentLocation = "Johannesburg"; NewJobTitle = "Operations Coordinator"; NewDepartment = "Operations"; NewLocation = "Johannesburg"; MoverType = "Lateral Move"; EffectiveDate = DateOffset -30; Status = "Cancelled"; CompletionPercentage = 15; TotalTasks = 6; CompletedTasks = 1; CurrentSalary = 380000; NewSalary = 380000; SalaryChangePercentage = 0; Notes = "Transfer cancelled — employee resigned before effective date." },
    @{ Title = "Transfer — Mohammed Patel"; EmployeeId = 115; EmployeeName = "Mohammed Patel"; EmployeeEmail = "mohammed.patel@company.co.za"; CurrentJobTitle = "Compliance Officer"; CurrentDepartment = "Legal"; CurrentLocation = "Johannesburg"; NewJobTitle = "Senior Compliance Manager"; NewDepartment = "Legal"; NewLocation = "Johannesburg"; MoverType = "Promotion"; EffectiveDate = DateOffset 60; Status = "On Hold"; CompletionPercentage = 0; TotalTasks = 9; CompletedTasks = 0; CurrentSalary = 720000; NewSalary = 900000; SalaryChangePercentage = 25; Notes = "Promotion on hold pending external regulatory audit completion." }
)

foreach ($mov in $movers) {
    Add-PnPListItem -List "JML_Mover" -Values $mov | Out-Null
    Write-Host "  + $($mov.EmployeeName) — $($mov.MoverType) [$($mov.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 10. JML_MoverTasks (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_MoverTasks..." -ForegroundColor White

$moverTasks = @(
    @{ Title = "Update job title in SAP SuccessFactors"; MoverId = 1; Description = "Change job title from Software Developer to Senior Software Developer"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 0; CompletedDate = DateOffset -1; SortOrder = 1 },
    @{ Title = "Update reporting line"; MoverId = 1; Description = "Update manager assignment in HR system"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 0; CompletedDate = DateOffset -1; SortOrder = 2 },
    @{ Title = "Update Azure DevOps permissions"; MoverId = 1; Description = "Upgrade to project admin for lead responsibilities"; Category = "System Access"; Status = "Completed"; Priority = "Medium"; SystemAccessAction = "Modify"; DueDate = DateOffset 1; CompletedDate = DateOffset 0; SortOrder = 3 },
    @{ Title = "Add to Engineering Leads Teams channel"; MoverId = 1; Description = "Add to private Teams channel for engineering leadership"; Category = "System Access"; Status = "Completed"; Priority = "Medium"; SystemAccessAction = "Grant"; DueDate = DateOffset 1; CompletedDate = DateOffset 1; SortOrder = 4 },
    @{ Title = "Update salary band in payroll"; MoverId = 1; Description = "Process salary increase in finance system"; Category = "Documentation"; Status = "Completed"; Priority = "High"; DueDate = DateOffset 0; CompletedDate = DateOffset 0; SortOrder = 5 },
    @{ Title = "Manager Essentials training"; MoverId = 1; Description = "Enroll in leadership training programme"; Category = "Training"; Status = "In Progress"; Priority = "Medium"; DueDate = DateOffset 30; SortOrder = 6; Notes = "Training scheduled for next month at GIBS" },
    @{ Title = "Announce promotion internally"; MoverId = 1; Description = "Coordinate announcement with internal comms"; Category = "Other"; Status = "Pending"; Priority = "Low"; DueDate = DateOffset 7; SortOrder = 7 },
    @{ Title = "Update business cards"; MoverId = 1; Description = "Order new business cards with updated title"; Category = "Other"; Status = "Pending"; Priority = "Low"; DueDate = DateOffset 14; SortOrder = 8 },
    @{ Title = "Revoke Marketing systems access"; MoverId = 5; Description = "Remove access to HubSpot and marketing tools"; Category = "System Access"; Status = "Completed"; Priority = "High"; SystemAccessAction = "Revoke"; DueDate = DateOffset 7; CompletedDate = DateOffset 6; SortOrder = 1 },
    @{ Title = "Grant Jira/Confluence access"; MoverId = 5; Description = "Add to Product Management workspace in Jira"; Category = "System Access"; Status = "Completed"; Priority = "High"; SystemAccessAction = "Grant"; DueDate = DateOffset 7; CompletedDate = DateOffset 7; SortOrder = 2 },
    @{ Title = "Knowledge transfer — brand guidelines"; MoverId = 5; Description = "Hand over brand assets and guidelines to marketing team"; Category = "Knowledge Transfer"; Status = "In Progress"; Priority = "Medium"; DueDate = DateOffset 10; SortOrder = 3 },
    @{ Title = "Update physical desk location"; MoverId = 5; Description = "Reassign desk to Product floor"; Category = "Asset Transfer"; Status = "Pending"; Priority = "Low"; DueDate = DateOffset 10; SortOrder = 4 },
    @{ Title = "Revoke Cape Town building access"; MoverId = 3; Description = "Deactivate Cape Town office access card"; Category = "System Access"; Status = "Pending"; Priority = "High"; SystemAccessAction = "Revoke"; DueDate = DateOffset 30; SortOrder = 1 },
    @{ Title = "Grant Johannesburg building access"; MoverId = 3; Description = "Provision access card for JHB office"; Category = "System Access"; Status = "Pending"; Priority = "High"; SystemAccessAction = "Grant"; DueDate = DateOffset 28; SortOrder = 2 },
    @{ Title = "Coordinate relocation logistics"; MoverId = 3; Description = "Arrange moving company and temporary accommodation"; Category = "Other"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 25; SortOrder = 3; Notes = "R50k relocation budget approved by Finance" }
)

foreach ($task in $moverTasks) {
    Add-PnPListItem -List "JML_MoverTasks" -Values $task | Out-Null
    Write-Host "  + $($task.Title) [$($task.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 11. JML_MoverSystemAccess (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_MoverSystemAccess..." -ForegroundColor White

$moverSystemAccess = @(
    @{ Title = "Azure DevOps — Themba Ndlovu"; MoverId = 1; SystemName = "Azure DevOps"; Action = "Modify"; CurrentRole = "Contributor"; NewRole = "Project Admin"; Status = "Completed"; ProcessedDate = DateOffset 0; Notes = "Upgraded for lead responsibilities" },
    @{ Title = "Engineering Leads Teams — Themba Ndlovu"; MoverId = 1; SystemName = "Microsoft Teams"; Action = "Grant"; NewRole = "Member"; Status = "Completed"; ProcessedDate = DateOffset 1; Notes = "Added to Engineering Leads private channel" },
    @{ Title = "Azure Portal — Nomvula Dube"; MoverId = 2; SystemName = "Azure Portal"; Action = "Grant"; NewRole = "Contributor"; Status = "Pending"; Notes = "Required for data pipeline work in Engineering" },
    @{ Title = "GitHub Enterprise — Nomvula Dube"; MoverId = 2; SystemName = "GitHub Enterprise"; Action = "Grant"; NewRole = "Member"; Status = "Pending"; Notes = "Add to data-platform repo" },
    @{ Title = "Power BI — Nomvula Dube"; MoverId = 2; SystemName = "Power BI"; Action = "No Change"; CurrentRole = "Creator"; NewRole = "Creator"; Status = "Completed"; Notes = "Retains existing Power BI access" },
    @{ Title = "HubSpot — Lindiwe Sithole"; MoverId = 5; SystemName = "HubSpot"; Action = "Revoke"; CurrentRole = "Marketing Manager"; Status = "Completed"; ProcessedDate = DateOffset 6; Notes = "Marketing access no longer required" },
    @{ Title = "Jira — Lindiwe Sithole"; MoverId = 5; SystemName = "Jira"; Action = "Grant"; NewRole = "Product Manager"; Status = "Completed"; ProcessedDate = DateOffset 7; Notes = "Added to Product Management project" },
    @{ Title = "Confluence — Lindiwe Sithole"; MoverId = 5; SystemName = "Confluence"; Action = "Grant"; NewRole = "Editor"; Status = "Completed"; ProcessedDate = DateOffset 7; Notes = "Added to PM wiki space" },
    @{ Title = "Salesforce — Willem Pretorius"; MoverId = 3; SystemName = "Salesforce CRM"; Action = "Modify"; CurrentRole = "Cape Town Sales"; NewRole = "Gauteng Sales"; Status = "Pending"; Notes = "Update territory assignment" },
    @{ Title = "Building Access — Willem Pretorius (CPT)"; MoverId = 3; SystemName = "Building Management"; Action = "Revoke"; CurrentRole = "Cape Town Office"; Status = "Pending"; Notes = "Revoke on last day in CPT office" },
    @{ Title = "Building Access — Willem Pretorius (JHB)"; MoverId = 3; SystemName = "Building Management"; Action = "Grant"; NewRole = "Johannesburg Office"; Status = "Pending"; Notes = "Provision before arrival date" },
    @{ Title = "SAP S/4HANA — Ntombi Zwane"; MoverId = 7; SystemName = "SAP S/4HANA"; Action = "Modify"; CurrentRole = "Junior User"; NewRole = "Transaction User"; Status = "Completed"; ProcessedDate = DateOffset -12; Notes = "Upgraded access for full accountant role" },
    @{ Title = "Azure AD Admin — Thulani Ngcobo"; MoverId = 13; SystemName = "Azure AD"; Action = "Grant"; NewRole = "User Admin (Limited)"; Status = "In Progress"; Notes = "Gradual handover from IT Support role" },
    @{ Title = "Azure DevOps — Thulani Ngcobo"; MoverId = 13; SystemName = "Azure DevOps"; Action = "Grant"; NewRole = "Contributor"; Status = "Completed"; ProcessedDate = DateOffset 5; Notes = "Added to Platform team projects" },
    @{ Title = "ServiceNow — Thulani Ngcobo"; MoverId = 13; SystemName = "ServiceNow"; Action = "Revoke"; CurrentRole = "Fulfiller"; Status = "In Progress"; Notes = "Transitioning tickets to replacement in IT Support" }
)

foreach ($access in $moverSystemAccess) {
    Add-PnPListItem -List "JML_MoverSystemAccess" -Values $access | Out-Null
    Write-Host "  + $($access.Title) — $($access.Action) [$($access.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 12. JML_Offboarding (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_Offboarding..." -ForegroundColor White

$offboardings = @(
    @{ Title = "Offboarding — Xolani Mabaso"; EmployeeId = 201; EmployeeName = "Xolani Mabaso"; EmployeeEmail = "xolani.mabaso@company.co.za"; JobTitle = "Software Developer"; Department = "Engineering"; LastWorkingDate = DateOffset 14; TerminationType = "Resignation"; Status = "In Progress"; CompletionPercentage = 40; TotalTasks = 12; CompletedTasks = 5; ExitInterviewDate = DateOffset 10; ExitInterviewCompleted = $false; RehireEligible = $true; ReferenceEligible = $true; Notes = "Leaving for overseas opportunity in Germany. Good performer, amicable departure." },
    @{ Title = "Offboarding — Charmaine van der Merwe"; EmployeeId = 202; EmployeeName = "Charmaine van der Merwe"; EmployeeEmail = "charmaine.vdm@company.co.za"; JobTitle = "Marketing Manager"; Department = "Marketing"; LastWorkingDate = DateOffset 7; TerminationType = "Resignation"; Status = "In Progress"; CompletionPercentage = 65; TotalTasks = 11; CompletedTasks = 7; ExitInterviewDate = DateOffset 5; ExitInterviewCompleted = $true; ExitInterviewNotes = "Leaving for competitor. Concerned about career progression. Feedback shared with HR leadership."; RehireEligible = $true; ReferenceEligible = $true; Notes = "Senior departure. Handover in progress to acting manager." },
    @{ Title = "Offboarding — Bongani Khumalo"; EmployeeId = 203; EmployeeName = "Bongani Khumalo"; EmployeeEmail = "bongani.khumalo@company.co.za"; JobTitle = "Sales Executive"; Department = "Sales"; LastWorkingDate = DateOffset -7; TerminationType = "Termination"; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 13; CompletedTasks = 13; ExitInterviewCompleted = $false; FinalPaymentProcessed = $true; RehireEligible = $false; ReferenceEligible = $false; Notes = "Termination for cause — policy violation. All access revoked immediately. Legal review completed." },
    @{ Title = "Offboarding — Amanda Botha"; EmployeeId = 204; EmployeeName = "Amanda Botha"; EmployeeEmail = "amanda.botha@company.co.za"; JobTitle = "Executive Assistant"; Department = "Executive Office"; LastWorkingDate = DateOffset 30; TerminationType = "Retirement"; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 10; CompletedTasks = 0; ExitInterviewDate = DateOffset 25; RehireEligible = $false; ReferenceEligible = $true; Notes = "30 years of service. Retirement celebration planned. Knowledge transfer to successor critical." },
    @{ Title = "Offboarding — Peter Daniels"; EmployeeId = 205; EmployeeName = "Peter Daniels"; EmployeeEmail = "peter.daniels@company.co.za"; JobTitle = "IT Support Technician"; Department = "Information Technology"; LastWorkingDate = DateOffset -14; TerminationType = "Redundancy"; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 12; CompletedTasks = 12; ExitInterviewDate = DateOffset -20; ExitInterviewCompleted = $true; ExitInterviewNotes = "Understands business decision. Appreciative of severance package and career support."; FinalPaymentProcessed = $true; RehireEligible = $true; ReferenceEligible = $true; Notes = "Section 189 retrenchment. Full severance paid. Outplacement support provided." },
    @{ Title = "Offboarding — Nandi Zulu"; EmployeeId = 206; EmployeeName = "Nandi Zulu"; EmployeeEmail = "nandi.zulu@company.co.za"; JobTitle = "UX Designer"; Department = "Design"; LastWorkingDate = DateOffset 21; TerminationType = "Resignation"; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 11; CompletedTasks = 0; ExitInterviewDate = DateOffset 17; RehireEligible = $true; ReferenceEligible = $true; Notes = "Joining fintech startup as Head of Design. Counter-offer declined." },
    @{ Title = "Offboarding — Mark Thompson"; EmployeeId = 207; EmployeeName = "Mark Thompson"; EmployeeEmail = "mark.thompson@company.co.za"; JobTitle = "Contract Developer"; Department = "Engineering"; LastWorkingDate = DateOffset 0; TerminationType = "Contract End"; Status = "In Progress"; CompletionPercentage = 80; TotalTasks = 9; CompletedTasks = 7; ExitInterviewCompleted = $false; RehireEligible = $true; ReferenceEligible = $true; Notes = "12-month contract ending as planned. May extend or convert — pending budget approval." },
    @{ Title = "Offboarding — Sizwe Mkhize"; EmployeeId = 208; EmployeeName = "Sizwe Mkhize"; EmployeeEmail = "sizwe.mkhize@company.co.za"; JobTitle = "Operations Manager"; Department = "Operations"; LastWorkingDate = DateOffset -21; TerminationType = "Resignation"; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 14; CompletedTasks = 14; ExitInterviewDate = DateOffset -28; ExitInterviewCompleted = $true; ExitInterviewNotes = "Left for family business. Positive exit. Offered consulting arrangement for transition."; FinalPaymentProcessed = $true; RehireEligible = $true; ReferenceEligible = $true; Notes = "Smooth handover to successor. All assets returned in excellent condition." },
    @{ Title = "Offboarding — Rachel Nkomo"; EmployeeId = 209; EmployeeName = "Rachel Nkomo"; EmployeeEmail = "rachel.nkomo@company.co.za"; JobTitle = "HR Coordinator"; Department = "Human Resources"; LastWorkingDate = DateOffset 45; TerminationType = "Resignation"; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 10; CompletedTasks = 0; ExitInterviewDate = DateOffset 40; RehireEligible = $true; ReferenceEligible = $true; Notes = "Relocating to UK with spouse. Extended notice period agreed." },
    @{ Title = "Offboarding — Hennie Venter"; EmployeeId = 210; EmployeeName = "Hennie Venter"; EmployeeEmail = "hennie.venter@company.co.za"; JobTitle = "Financial Controller"; Department = "Finance"; LastWorkingDate = DateOffset 60; TerminationType = "Resignation"; Status = "Not Started"; CompletionPercentage = 0; TotalTasks = 15; CompletedTasks = 0; ExitInterviewDate = DateOffset 55; RehireEligible = $true; ReferenceEligible = $true; Notes = "Senior Finance departure. 3-month notice period. Critical year-end handover required." },
    @{ Title = "Offboarding — Thabiso Moloi"; EmployeeId = 211; EmployeeName = "Thabiso Moloi"; EmployeeEmail = "thabiso.moloi@company.co.za"; JobTitle = "Junior Developer"; Department = "Engineering"; LastWorkingDate = DateOffset -3; TerminationType = "Resignation"; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 10; CompletedTasks = 10; ExitInterviewDate = DateOffset -10; ExitInterviewCompleted = $true; ExitInterviewNotes = "Received offer 40% above current salary. Noted compensation review needed for junior roles."; FinalPaymentProcessed = $true; RehireEligible = $true; ReferenceEligible = $true; Notes = "Lost to competitor on salary. Triggered engineering compensation review." },
    @{ Title = "Offboarding — Lisa van Niekerk"; EmployeeId = 212; EmployeeName = "Lisa van Niekerk"; EmployeeEmail = "lisa.vanniekerk@company.co.za"; JobTitle = "Legal Counsel"; Department = "Legal"; LastWorkingDate = DateOffset 90; TerminationType = "Resignation"; Status = "On Hold"; CompletionPercentage = 5; TotalTasks = 12; CompletedTasks = 1; ExitInterviewDate = DateOffset 85; RehireEligible = $true; ReferenceEligible = $true; Notes = "Resignation accepted but on hold — exploring internal opportunities. May rescind." },
    @{ Title = "Offboarding — Samuel Okonkwo"; EmployeeId = 213; EmployeeName = "Samuel Okonkwo"; EmployeeEmail = "samuel.okonkwo@company.co.za"; JobTitle = "Data Scientist"; Department = "Data Analytics"; LastWorkingDate = DateOffset 14; TerminationType = "Resignation"; Status = "In Progress"; CompletionPercentage = 30; TotalTasks = 11; CompletedTasks = 3; ExitInterviewDate = DateOffset 10; RehireEligible = $true; ReferenceEligible = $true; Notes = "Joining Google in Dublin. Knowledge transfer of ML models critical." },
    @{ Title = "Offboarding — Mpho Letsie"; EmployeeId = 214; EmployeeName = "Mpho Letsie"; EmployeeEmail = "mpho.letsie@company.co.za"; JobTitle = "Customer Success Specialist"; Department = "Customer Success"; LastWorkingDate = DateOffset -30; TerminationType = "Termination"; Status = "Completed"; CompletionPercentage = 100; TotalTasks = 11; CompletedTasks = 11; ExitInterviewCompleted = $false; FinalPaymentProcessed = $true; RehireEligible = $false; ReferenceEligible = $false; Notes = "Termination during probation. Performance not meeting expectations. Handled per probation terms." },
    @{ Title = "Offboarding — Johan Pretorius"; EmployeeId = 215; EmployeeName = "Johan Pretorius"; EmployeeEmail = "johan.pretorius@company.co.za"; JobTitle = "Project Manager"; Department = "Product Management"; LastWorkingDate = DateOffset 28; TerminationType = "Other"; Status = "In Progress"; CompletionPercentage = 15; TotalTasks = 12; CompletedTasks = 2; ExitInterviewDate = DateOffset 24; RehireEligible = $true; ReferenceEligible = $true; Notes = "Mutual separation. Negotiated exit package. Handover to replacement already identified." }
)

foreach ($off in $offboardings) {
    Add-PnPListItem -List "JML_Offboarding" -Values $off | Out-Null
    Write-Host "  + $($off.EmployeeName) — $($off.TerminationType) [$($off.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 13. JML_OffboardingTasks (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_OffboardingTasks..." -ForegroundColor White

$offboardingTasks = @(
    @{ Title = "Disable M365 Account"; OffboardingId = 1; Description = "Disable Azure AD account and convert mailbox to shared"; Category = "System Access"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 1 },
    @{ Title = "Revoke Azure DevOps Access"; OffboardingId = 1; Description = "Remove from all Azure DevOps organisations"; Category = "System Access"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 2 },
    @{ Title = "Revoke GitHub Access"; OffboardingId = 1; Description = "Remove from GitHub org and transfer repo ownership"; Category = "System Access"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 3 },
    @{ Title = "Return Laptop"; OffboardingId = 1; Description = "Collect MacBook Pro and wipe data"; Category = "Asset Return"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 4 },
    @{ Title = "Return Monitors"; OffboardingId = 1; Description = "Collect dual monitor setup"; Category = "Asset Return"; Status = "Completed"; Priority = "Medium"; CompletedDate = DateOffset -2; SortOrder = 5 },
    @{ Title = "Return Access Card"; OffboardingId = 1; Description = "Collect building access card and ID badge"; Category = "Asset Return"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 14; SortOrder = 6 },
    @{ Title = "Code Review & Handover"; OffboardingId = 1; Description = "Review open PRs and hand over to team"; Category = "Knowledge Transfer"; Status = "In Progress"; Priority = "High"; DueDate = DateOffset 10; SortOrder = 7; Notes = "Meeting scheduled for Wednesday" },
    @{ Title = "Documentation Update"; OffboardingId = 1; Description = "Update Confluence docs for owned services"; Category = "Knowledge Transfer"; Status = "In Progress"; Priority = "Medium"; DueDate = DateOffset 12; SortOrder = 8 },
    @{ Title = "Exit Interview"; OffboardingId = 1; Description = "Conduct exit interview with HR"; Category = "Exit Interview"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 10; SortOrder = 9 },
    @{ Title = "Process Final Pay"; OffboardingId = 1; Description = "Calculate final salary, leave payout, and any owed expenses"; Category = "Final Pay"; Status = "Pending"; Priority = "High"; DueDate = DateOffset 14; SortOrder = 10 },
    @{ Title = "UIF Letter"; OffboardingId = 1; Description = "Prepare UI-19 form for UIF registration"; Category = "Documentation"; Status = "Pending"; Priority = "Medium"; DueDate = DateOffset 14; SortOrder = 11 },
    @{ Title = "Certificate of Employment"; OffboardingId = 1; Description = "Prepare certificate of employment letter"; Category = "Documentation"; Status = "Pending"; Priority = "Low"; DueDate = DateOffset 14; SortOrder = 12 },
    @{ Title = "Revoke VPN Access"; OffboardingId = 3; Description = "Remove from VPN user group immediately"; Category = "System Access"; Status = "Completed"; Priority = "High"; CompletedDate = DateOffset -7; SortOrder = 1; Notes = "Immediate revocation due to termination" },
    @{ Title = "Revoke All System Access"; OffboardingId = 3; Description = "Emergency revocation of all system access"; Category = "System Access"; Status = "Completed"; Priority = "High"; CompletedDate = DateOffset -7; SortOrder = 2 },
    @{ Title = "Collect Company Phone"; OffboardingId = 3; Description = "Recover company-issued iPhone immediately"; Category = "Asset Return"; Status = "Completed"; Priority = "High"; CompletedDate = DateOffset -7; SortOrder = 3 }
)

foreach ($task in $offboardingTasks) {
    Add-PnPListItem -List "JML_OffboardingTasks" -Values $task | Out-Null
    Write-Host "  + $($task.Title) [$($task.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 14. JML_AssetReturn (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_AssetReturn..." -ForegroundColor White

$assetReturns = @(
    @{ Title = "MacBook Pro — Xolani Mabaso"; OffboardingId = 1; AssetName = "MacBook Pro 14-inch M3"; AssetTag = "LAP-2023-0847"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $true; DataWipeCompleted = $false },
    @{ Title = "Dell Monitor x2 — Xolani Mabaso"; OffboardingId = 1; AssetName = "Dell P2422H 24-inch Monitor"; AssetTag = "MON-2023-0234,MON-2023-0235"; Quantity = 2; Status = "Returned"; ReturnedDate = DateOffset -2; Condition = "Good"; ConditionNotes = "Minor scratch on bezel of one unit"; RequiresDataWipe = $false },
    @{ Title = "Jabra Headset — Xolani Mabaso"; OffboardingId = 1; AssetName = "Jabra Evolve2 75"; AssetTag = "AUD-2023-0089"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $false },
    @{ Title = "Access Card — Xolani Mabaso"; OffboardingId = 1; AssetName = "Building Access Card"; AssetTag = "ACC-EMP-0847"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $false },
    @{ Title = "Dell Laptop — Charmaine vdM"; OffboardingId = 2; AssetName = "Dell Latitude 5540"; AssetTag = "LAP-2022-0512"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $true; DataWipeCompleted = $false },
    @{ Title = "iPhone 14 — Charmaine vdM"; OffboardingId = 2; AssetName = "iPhone 14 Pro"; AssetTag = "PHN-2023-0045"; Quantity = 1; Status = "Returned"; ReturnedDate = DateOffset -1; Condition = "Excellent"; RequiresDataWipe = $true; DataWipeCompleted = $true; DataWipeDate = DateOffset 0 },
    @{ Title = "Dell Laptop — Bongani Khumalo"; OffboardingId = 3; AssetName = "Dell Latitude 5540"; AssetTag = "LAP-2022-0623"; Quantity = 1; Status = "Returned"; ReturnedDate = DateOffset -7; Condition = "Good"; RequiresDataWipe = $true; DataWipeCompleted = $true; DataWipeDate = DateOffset -6 },
    @{ Title = "iPhone 13 — Bongani Khumalo"; OffboardingId = 3; AssetName = "iPhone 13"; AssetTag = "PHN-2022-0078"; Quantity = 1; Status = "Returned"; ReturnedDate = DateOffset -7; Condition = "Fair"; ConditionNotes = "Cracked screen protector, phone itself intact"; RequiresDataWipe = $true; DataWipeCompleted = $true; DataWipeDate = DateOffset -6 },
    @{ Title = "Access Card — Bongani Khumalo"; OffboardingId = 3; AssetName = "Building Access Card"; AssetTag = "ACC-EMP-0623"; Quantity = 1; Status = "Returned"; ReturnedDate = DateOffset -7; RequiresDataWipe = $false },
    @{ Title = "MacBook Air — Amanda Botha"; OffboardingId = 4; AssetName = "MacBook Air M2"; AssetTag = "LAP-2023-0234"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $true },
    @{ Title = "Parking Card — Amanda Botha"; OffboardingId = 4; AssetName = "Parking Bay Access Card"; AssetTag = "PRK-EXEC-012"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $false },
    @{ Title = "Dell Laptop — Peter Daniels"; OffboardingId = 5; AssetName = "Dell Latitude 5430"; AssetTag = "LAP-2021-0892"; Quantity = 1; Status = "Returned"; ReturnedDate = DateOffset -15; Condition = "Good"; RequiresDataWipe = $true; DataWipeCompleted = $true; DataWipeDate = DateOffset -14 },
    @{ Title = "IT Toolkit — Peter Daniels"; OffboardingId = 5; AssetName = "IT Support Toolkit"; AssetTag = "TLS-IT-0023"; Quantity = 1; Status = "Returned"; ReturnedDate = DateOffset -15; Condition = "Good"; RequiresDataWipe = $false },
    @{ Title = "MacBook Pro — Samuel Okonkwo"; OffboardingId = 13; AssetName = "MacBook Pro 16-inch M2"; AssetTag = "LAP-2023-0156"; Quantity = 1; Status = "Pending Return"; RequiresDataWipe = $true; Notes = "Contains proprietary ML models — secure wipe required" },
    @{ Title = "Dell Monitors — Sizwe Mkhize"; OffboardingId = 8; AssetName = "Dell U2722D Monitor"; AssetTag = "MON-2022-0089,MON-2022-0090"; Quantity = 2; Status = "Returned"; ReturnedDate = DateOffset -22; Condition = "Excellent"; RequiresDataWipe = $false }
)

foreach ($asset in $assetReturns) {
    Add-PnPListItem -List "JML_AssetReturn" -Values $asset | Out-Null
    Write-Host "  + $($asset.AssetName) [$($asset.Status)]" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# 15. JML_Configuration (15 items)
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Seeding JML_Configuration..." -ForegroundColor White

$configurations = @(
    @{ Title = "App Version"; ConfigKey = "app_version"; ConfigValue = "1.0.0"; Category = "General"; IsActive = $true },
    @{ Title = "App Name"; ConfigKey = "app_name"; ConfigValue = "JML Lite"; Category = "General"; IsActive = $true },
    @{ Title = "Company Name"; ConfigKey = "company_name"; ConfigValue = "First Digital"; Category = "General"; IsActive = $true },
    @{ Title = "Default Onboarding Days"; ConfigKey = "default_onboarding_days"; ConfigValue = "14"; Category = "General"; IsActive = $true },
    @{ Title = "Default Offboarding Days"; ConfigKey = "default_offboarding_days"; ConfigValue = "14"; Category = "General"; IsActive = $true },
    @{ Title = "Enable Teams Notifications"; ConfigKey = "enable_teams_notifications"; ConfigValue = "true"; Category = "Notifications"; IsActive = $true },
    @{ Title = "Teams Webhook URL"; ConfigKey = "teams_webhook_url"; ConfigValue = "https://company.webhook.office.com/webhookb2/..."; Category = "Notifications"; IsActive = $true },
    @{ Title = "Enable Email Notifications"; ConfigKey = "enable_email_notifications"; ConfigValue = "true"; Category = "Notifications"; IsActive = $true },
    @{ Title = "HR Email Address"; ConfigKey = "hr_email"; ConfigValue = "hr@firstdigital.co.za"; Category = "Notifications"; IsActive = $true },
    @{ Title = "IT Support Email"; ConfigKey = "it_support_email"; ConfigValue = "itsupport@firstdigital.co.za"; Category = "Notifications"; IsActive = $true },
    @{ Title = "Show Dashboard Stats"; ConfigKey = "show_dashboard_stats"; ConfigValue = "true"; Category = "Display"; IsActive = $true },
    @{ Title = "Date Format"; ConfigKey = "date_format"; ConfigValue = "dd MMM yyyy"; Category = "Display"; IsActive = $true },
    @{ Title = "Theme Color"; ConfigKey = "theme_color"; ConfigValue = "#005BAA"; Category = "Display"; IsActive = $true },
    @{ Title = "Visible Nav Items"; ConfigKey = "visible_nav_items"; ConfigValue = "dashboard,onboarding,myonboarding,mover,offboarding,jmlreporting,search,admin,help"; Category = "Navigation"; IsActive = $true },
    @{ Title = "Enable Audit Logging"; ConfigKey = "enable_audit_logging"; ConfigValue = "true"; Category = "General"; IsActive = $true }
)

foreach ($config in $configurations) {
    Add-PnPListItem -List "JML_Configuration" -Values $config | Out-Null
    Write-Host "  + $($config.ConfigKey)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "=== Sample Data Seeding Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Lists seeded (15 items each):" -ForegroundColor White
Write-Host "  - JML_Departments" -ForegroundColor Cyan
Write-Host "  - JML_DocumentTypes" -ForegroundColor Cyan
Write-Host "  - JML_AssetTypes" -ForegroundColor Cyan
Write-Host "  - JML_SystemAccessTypes" -ForegroundColor Cyan
Write-Host "  - JML_TrainingCourses" -ForegroundColor Cyan
Write-Host "  - JML_PolicyPacks" -ForegroundColor Cyan
Write-Host "  - JML_Onboarding" -ForegroundColor Cyan
Write-Host "  - JML_OnboardingTasks" -ForegroundColor Cyan
Write-Host "  - JML_Mover" -ForegroundColor Cyan
Write-Host "  - JML_MoverTasks" -ForegroundColor Cyan
Write-Host "  - JML_MoverSystemAccess" -ForegroundColor Cyan
Write-Host "  - JML_Offboarding" -ForegroundColor Cyan
Write-Host "  - JML_OffboardingTasks" -ForegroundColor Cyan
Write-Host "  - JML_AssetReturn" -ForegroundColor Cyan
Write-Host "  - JML_Configuration" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total: 225+ sample items across 15 lists" -ForegroundColor Yellow
