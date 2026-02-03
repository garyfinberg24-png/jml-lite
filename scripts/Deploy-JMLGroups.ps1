# Deploy-JMLGroups.ps1
# Creates SharePoint groups for DWx JML Lite RBAC
# Prerequisite: Already connected via Connect-PnPOnline to JMLLite site
#
# Role Hierarchy:
#   User    → Dashboard, My Onboarding, Search, Help (default for all site members)
#   Manager → + Onboarding, Transfers, Offboarding, Reporting
#   Admin   → + Admin Center

Write-Host "=== DWx JML Lite — Group Provisioning ===" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# Initial Users to Add
# ═══════════════════════════════════════════════════════════════
$initialUsers = @(
    "gf_admin@mf7m.onmicrosoft.com",
    "chrisb@mf7m.onmicrosoft.com"
)

# ─────────────────────────────────────────────────────────────
# Helper: Ensure a SharePoint group exists
# ─────────────────────────────────────────────────────────────
function Ensure-SPGroup {
    param(
        [string]$GroupName,
        [string]$Description,
        [string]$PermissionLevel = "Read"
    )
    $group = Get-PnPGroup -Identity $GroupName -ErrorAction SilentlyContinue
    if ($null -eq $group) {
        $owner = (Get-PnPWeb).Title + " Owners"
        New-PnPGroup -Title $GroupName -Description $Description -Owner $owner
        Write-Host "  Created group: $GroupName" -ForegroundColor Green

        # Assign permission level to the group
        Set-PnPGroupPermissions -Identity $GroupName -AddRole $PermissionLevel
        Write-Host "  Assigned '$PermissionLevel' permissions to $GroupName" -ForegroundColor Cyan
    } else {
        Write-Host "  Exists: $GroupName" -ForegroundColor Gray
    }
}

# ─────────────────────────────────────────────────────────────
# Helper: Add users to a group
# ─────────────────────────────────────────────────────────────
function Add-UsersToGroup {
    param(
        [string]$GroupName,
        [string[]]$Users
    )
    foreach ($user in $Users) {
        if ([string]::IsNullOrWhiteSpace($user)) { continue }
        try {
            Add-PnPGroupMember -LoginName $user -Group $GroupName -ErrorAction Stop
            Write-Host "    + Added: $user" -ForegroundColor Green
        } catch {
            if ($_.Exception.Message -like "*already exists*" -or $_.Exception.Message -like "*is already a member*") {
                Write-Host "    ~ Already member: $user" -ForegroundColor Gray
            } else {
                Write-Host "    ! Warning: Could not add $user — $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
}

# ═════════════════════════════════════════════════════════════
# Create Groups
# ═════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "Creating JML Admin group..." -ForegroundColor White
Ensure-SPGroup `
    -GroupName "JML Admin" `
    -Description "JML Lite administrators — full access to all views including Admin Center and configuration management" `
    -PermissionLevel "Full Control"

Write-Host ""
Write-Host "Creating JML Manager group..." -ForegroundColor White
Ensure-SPGroup `
    -GroupName "JML Manager" `
    -Description "JML Lite managers — access to Onboarding, Transfers, Offboarding, and Reporting workflows" `
    -PermissionLevel "Contribute"

# ═════════════════════════════════════════════════════════════
# Add Users to Groups
# ═════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "Adding users to JML Admin..." -ForegroundColor White
Add-UsersToGroup -GroupName "JML Admin" -Users $initialUsers

Write-Host ""
Write-Host "Adding users to JML Manager..." -ForegroundColor White
Add-UsersToGroup -GroupName "JML Manager" -Users $initialUsers

# ═════════════════════════════════════════════════════════════
# Summary
# ═════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "=== Group Provisioning Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Groups created:" -ForegroundColor White
Write-Host "  JML Admin   — Full Control" -ForegroundColor Cyan
Write-Host "               Views: Dashboard, Onboarding, My Onboarding, Transfers, Offboarding, Reporting, Search, Admin, Help" -ForegroundColor Gray
Write-Host ""
Write-Host "  JML Manager — Contribute" -ForegroundColor Cyan
Write-Host "               Views: Dashboard, Onboarding, My Onboarding, Transfers, Offboarding, Reporting, Search, Help" -ForegroundColor Gray
Write-Host ""
Write-Host "Users added to both groups:" -ForegroundColor White
foreach ($user in $initialUsers) {
    Write-Host "  - $user" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Role Hierarchy:" -ForegroundColor White
Write-Host "  Admin (Level 2)   : All features + Admin Center" -ForegroundColor Cyan
Write-Host "  Manager (Level 1) : Onboarding, Transfers, Offboarding, Reporting + User views" -ForegroundColor Cyan
Write-Host "  User (Level 0)    : Dashboard, My Onboarding, Search, Help (default for all site members)" -ForegroundColor Cyan
Write-Host ""
Write-Host "To add more users manually:" -ForegroundColor White
Write-Host '  Add-PnPGroupMember -LoginName "user@domain.com" -Group "JML Admin"' -ForegroundColor Yellow
Write-Host '  Add-PnPGroupMember -LoginName "user@domain.com" -Group "JML Manager"' -ForegroundColor Yellow
Write-Host ""
