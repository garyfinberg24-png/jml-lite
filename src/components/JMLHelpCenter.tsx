/**
 * JMLHelpCenter - Comprehensive Help Documentation
 *
 * Provides complete documentation for all JML Lite features including:
 * - Getting Started guides
 * - Feature-specific articles
 * - FAQs
 * - Keyboard shortcuts
 * - Support contact
 */
import * as React from 'react';
import { useState } from 'react';
import { Icon } from '@fluentui/react/lib/Icon';

type HelpTab = 'home' | 'getting-started' | 'features' | 'faq' | 'shortcuts' | 'support';

// Theme colors
const JOINER_COLOR = '#005BAA';
const MOVER_COLOR = '#ea580c';
const LEAVER_COLOR = '#d13438';

// Help article interface
interface IHelpArticle {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  content: string[];
  steps?: { title: string; description: string }[];
}

// Getting started articles
const gettingStartedArticles: IHelpArticle[] = [
  {
    id: 'overview',
    title: 'JML Lite Overview',
    category: 'Getting Started',
    icon: 'Info',
    color: JOINER_COLOR,
    content: [
      'JML Lite is a comprehensive employee lifecycle management system designed to streamline the processes of onboarding new employees (Joiners), managing internal transfers (Movers), and offboarding departing employees (Leavers).',
      'The application is part of the DWx (Digital Workplace Excellence) suite by First Digital, providing a modern, user-friendly interface for HR teams and managers.',
    ],
    steps: [
      { title: 'Dashboard', description: 'View key metrics, pending tasks, and recent activity across all JML processes.' },
      { title: 'Process Wizards', description: 'Step-by-step guided workflows for onboarding, transfers, and offboarding.' },
      { title: 'Task Management', description: 'Track and complete assigned tasks with clear due dates and priorities.' },
      { title: 'Approvals', description: 'Review and approve pending requests with full audit trail.' },
      { title: 'Reporting', description: 'Generate reports and export data for compliance and analytics.' },
    ],
  },
  {
    id: 'roles',
    title: 'Understanding User Roles',
    category: 'Getting Started',
    icon: 'People',
    color: JOINER_COLOR,
    content: [
      'JML Lite uses a role-based access control system with three levels of access. Your role determines which features and data you can access.',
    ],
    steps: [
      { title: 'User Role', description: 'Basic access for new hires. Can view My Onboarding portal, use Search, and access Help Center. Ideal for employees completing their own onboarding tasks.' },
      { title: 'Manager Role', description: 'Full operational access. Can initiate and manage all JML processes, approve requests, manage tasks, view reports, and access analytics. Assigned to HR team members and line managers.' },
      { title: 'Admin Role', description: 'Complete system access. Includes all Manager capabilities plus Admin Center access for system configuration, document types, asset types, training courses, and policy packs.' },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigating the Application',
    category: 'Getting Started',
    icon: 'Nav2DMapView',
    color: JOINER_COLOR,
    content: [
      'JML Lite features an intuitive navigation system with a main menu bar and quick-access header icons.',
    ],
    steps: [
      { title: 'Main Navigation', description: 'The horizontal menu bar below the header provides access to Dashboard, Onboarding, Transfers, Offboarding, Approvals, Task Manager, Reporting, and Analytics.' },
      { title: 'Header Icons', description: 'Quick access icons in the header include Recently Viewed, Search, Admin (Admins only), Help, and Notifications.' },
      { title: 'Recently Viewed', description: 'Click the clock icon to see recently viewed records across all JML processes for quick access.' },
      { title: 'Notifications', description: 'The bell icon shows system notifications and activity alerts. A red badge indicates unread notifications.' },
    ],
  },
];

// Feature articles
const featureArticles: IHelpArticle[] = [
  {
    id: 'onboarding',
    title: 'Onboarding New Employees',
    category: 'Onboarding',
    icon: 'AddFriend',
    color: JOINER_COLOR,
    content: [
      'The Onboarding module guides you through the complete process of bringing new employees into the organization. The 8-step wizard ensures nothing is missed.',
    ],
    steps: [
      { title: 'Step 1: Employee Details', description: 'Enter the new hire\'s personal information including name, contact details, and emergency contacts.' },
      { title: 'Step 2: Job & Department', description: 'Specify job title, department, manager, and reporting structure.' },
      { title: 'Step 3: Start Date & Location', description: 'Set the start date, work location, and any hybrid/remote arrangements.' },
      { title: 'Step 4: Documentation', description: 'Select required documents (contracts, policies, tax forms) and track completion.' },
      { title: 'Step 5: System Access', description: 'Configure IT accounts, email, and application access permissions.' },
      { title: 'Step 6: Equipment & Assets', description: 'Assign hardware (laptop, phone, badge) and track asset allocation.' },
      { title: 'Step 7: Training', description: 'Assign mandatory and role-specific training courses.' },
      { title: 'Step 8: Review & Submit', description: 'Review all information and submit the onboarding record.' },
    ],
  },
  {
    id: 'myonboarding',
    title: 'My Onboarding (New Hire Portal)',
    category: 'Onboarding',
    icon: 'Contact',
    color: JOINER_COLOR,
    content: [
      'My Onboarding is a self-service portal designed specifically for new employees. It provides a personalized view of your onboarding journey and tasks.',
    ],
    steps: [
      { title: 'Welcome Dashboard', description: 'See your start date, assigned manager, and team information at a glance.' },
      { title: 'Task Checklist', description: 'View all assigned onboarding tasks with due dates and completion status.' },
      { title: 'Document Submission', description: 'Upload required documents directly through the portal.' },
      { title: 'Training Progress', description: 'Track your mandatory training completion and access learning materials.' },
      { title: 'Meet Your Team', description: 'View your team members and organizational structure.' },
      { title: 'Getting Help', description: 'Contact your HR representative or onboarding buddy for assistance.' },
    ],
  },
  {
    id: 'mover',
    title: 'Managing Internal Transfers',
    category: 'Transfers',
    icon: 'Sync',
    color: MOVER_COLOR,
    content: [
      'The Transfers module handles internal employee movements including department changes, role changes, location transfers, and promotions.',
    ],
    steps: [
      { title: 'Step 1: Employee Selection', description: 'Search and select the employee being transferred.' },
      { title: 'Step 2: Transfer Type', description: 'Specify the type: Department Transfer, Role Change, Location Move, or Promotion.' },
      { title: 'Step 3: New Position', description: 'Enter the new job title, department, manager, and location.' },
      { title: 'Step 4: System Access Changes', description: 'Review and update application access permissions for the new role.' },
      { title: 'Step 5: Asset Transfer', description: 'Handle any equipment or asset reassignments between departments.' },
      { title: 'Step 6: Review & Submit', description: 'Confirm all changes and set the effective date.' },
    ],
  },
  {
    id: 'offboarding',
    title: 'Offboarding Departing Employees',
    category: 'Offboarding',
    icon: 'UserRemove',
    color: LEAVER_COLOR,
    content: [
      'The Offboarding module ensures a smooth and compliant separation process for employees leaving the organization.',
    ],
    steps: [
      { title: 'Step 1: Employee & Termination Type', description: 'Select the employee and specify: Resignation, Termination, Retirement, Contract End, or Transfer Out.' },
      { title: 'Step 2: Last Working Day', description: 'Set the official last day and any notice period details.' },
      { title: 'Step 3: Asset Return', description: 'Create a checklist of all assets (laptop, phone, keys, badge) to be returned with condition tracking.' },
      { title: 'Step 4: System Access Revocation', description: 'Schedule and track the removal of all IT access and accounts.' },
      { title: 'Step 5: Knowledge Transfer', description: 'Document handover tasks and knowledge transfer requirements.' },
      { title: 'Step 6: Exit Interview', description: 'Schedule the exit interview and record feedback.' },
      { title: 'Step 7: Review & Submit', description: 'Verify all offboarding tasks and submit for processing.' },
    ],
  },
  {
    id: 'taskmanager',
    title: 'Task Manager',
    category: 'Task Management',
    icon: 'TaskList',
    color: JOINER_COLOR,
    content: [
      'The Task Manager provides a centralized view of all your assigned tasks across onboarding, transfer, and offboarding processes.',
    ],
    steps: [
      { title: 'Task Overview', description: 'View all tasks in a list or Kanban board format with drag-and-drop status updates.' },
      { title: 'Filtering', description: 'Filter tasks by process type (Onboarding/Transfer/Offboarding), status, priority, or due date.' },
      { title: 'Task Details', description: 'Click any task to view full details, related employee information, and completion requirements.' },
      { title: 'Bulk Actions', description: 'Select multiple tasks to update status, reassign, or mark as complete.' },
      { title: 'Due Date Alerts', description: 'Tasks approaching or past due date are highlighted. Overdue tasks show a red indicator.' },
    ],
  },
  {
    id: 'approvals',
    title: 'Approvals Workflow',
    category: 'Approvals',
    icon: 'Taskboard',
    color: JOINER_COLOR,
    content: [
      'The Approvals module shows all pending requests requiring your review and decision.',
    ],
    steps: [
      { title: 'Pending Queue', description: 'View all requests awaiting your approval with key details and submission date.' },
      { title: 'Review Details', description: 'Click to expand and review the full request with all supporting information.' },
      { title: 'Approve or Reject', description: 'Make your decision with optional comments. All actions are logged for audit.' },
      { title: 'Delegation', description: 'Delegate approval authority to a colleague when you\'re unavailable.' },
      { title: 'History', description: 'View your past approval decisions with timestamps and any comments provided.' },
    ],
  },
  {
    id: 'reporting',
    title: 'Reporting & Analytics',
    category: 'Reporting',
    icon: 'ReportDocument',
    color: JOINER_COLOR,
    content: [
      'Generate comprehensive reports on JML activities for compliance, planning, and management insights.',
    ],
    steps: [
      { title: 'Standard Reports', description: 'Pre-built reports include Monthly JML Summary, Pending Tasks Report, Compliance Report, and Department Activity.' },
      { title: 'Date Filtering', description: 'Filter all reports by date range, department, or status.' },
      { title: 'Export Options', description: 'Export reports to Excel (XLSX), CSV, or PDF format for sharing.' },
      { title: 'Scheduled Reports', description: 'Set up automatic report generation and email delivery on a recurring schedule.' },
      { title: 'Analytics Dashboard', description: 'View interactive charts showing trends, completion rates, and processing times.' },
    ],
  },
  {
    id: 'search',
    title: 'Search Functionality',
    category: 'Search',
    icon: 'Search',
    color: JOINER_COLOR,
    content: [
      'The Search feature allows you to quickly find employees across all JML processes.',
    ],
    steps: [
      { title: 'Quick Search', description: 'Enter employee name, job title, or department in the search box and press Enter.' },
      { title: 'Filters', description: 'Narrow results by process type (Onboarding/Transfer/Offboarding), status, department, or date range.' },
      { title: 'Sort Options', description: 'Sort results by relevance, most recent, name (A-Z), or key date.' },
      { title: 'Recent Searches', description: 'Access your recent search terms for quick repeat queries.' },
      { title: 'Result Details', description: 'Click any result to view the full record details.' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin Center Configuration',
    category: 'Administration',
    icon: 'Settings',
    color: JOINER_COLOR,
    content: [
      'The Admin Center (accessible to Admin role only) provides system configuration options.',
    ],
    steps: [
      { title: 'Onboarding Configuration', description: 'Manage document types, system access types, training courses, and policy packs.' },
      { title: 'Mover Configuration', description: 'Configure transfer types, approval workflows, and system access templates.' },
      { title: 'Offboarding Configuration', description: 'Set up termination types, asset return categories, and exit interview templates.' },
      { title: 'User Management', description: 'View and manage user roles (via SharePoint groups: JML Admin, JML Manager).' },
      { title: 'Audit Trail', description: 'View system audit logs showing all changes with user and timestamp.' },
    ],
  },
];

// FAQ items
const faqItems = [
  {
    category: 'General',
    questions: [
      { q: 'What is JML Lite?', a: 'JML Lite is an employee lifecycle management application that streamlines the processes of onboarding (Joiners), internal transfers (Movers), and offboarding (Leavers). It\'s part of the DWx suite by First Digital.' },
      { q: 'What roles are available in JML Lite?', a: 'There are three roles: User (basic access for new hires), Manager (full JML operational access), and Admin (system configuration access). Roles are controlled via SharePoint groups.' },
      { q: 'How do I get a different role?', a: 'Contact your HR administrator or IT team to request a role change. They will add you to the appropriate SharePoint group (JML Admin or JML Manager).' },
      { q: 'Can I use JML Lite on mobile devices?', a: 'Yes, JML Lite is responsive and works on tablets and mobile devices through your web browser. For best experience, use a modern browser like Edge or Chrome.' },
    ],
  },
  {
    category: 'Onboarding',
    questions: [
      { q: 'How do I start an onboarding process?', a: 'Navigate to Onboarding and click the "Start Onboarding" button. Follow the 8-step wizard to enter all required information for the new employee.' },
      { q: 'Can I save an onboarding and continue later?', a: 'Yes, click "Save Draft" at any step. The record will be saved with "Not Started" status and you can resume from the Onboarding list.' },
      { q: 'How do I assign training to a new hire?', a: 'In Step 7 of the Onboarding Wizard, select from the available training courses. Mandatory training is pre-selected based on the department and role.' },
      { q: 'What documents are typically required?', a: 'Common documents include: Employment Contract, Tax Forms, ID Verification, Emergency Contact Form, and Policy Acknowledgements. Document requirements are configured by your Admin.' },
      { q: 'How does the new employee access My Onboarding?', a: 'New employees with User role can access the My Onboarding portal after their account is created. They\'ll see their personalized task list and can complete self-service items.' },
    ],
  },
  {
    category: 'Transfers',
    questions: [
      { q: 'What types of transfers can be processed?', a: 'JML Lite supports: Department Transfer, Role Change, Location Move, Promotion, and combinations of these. Select the appropriate type in Step 2 of the Transfer Wizard.' },
      { q: 'How do I update system access for a transfer?', a: 'In Step 4 of the Transfer Wizard, you\'ll see the current access permissions. Add new access needed for the role and remove access no longer required.' },
      { q: 'Can I transfer assets between departments?', a: 'Yes, Step 5 of the Transfer Wizard handles asset transfers. You can reassign equipment from the old department to the new one or return items as needed.' },
      { q: 'When does the transfer become effective?', a: 'You set the Effective Date in Step 6. All changes will be logged against this date for audit purposes.' },
    ],
  },
  {
    category: 'Offboarding',
    questions: [
      { q: 'How do I start an offboarding process?', a: 'Navigate to Offboarding and click "Start Offboarding". Select the departing employee and follow the 7-step wizard.' },
      { q: 'What termination types are available?', a: 'Standard types include: Resignation, Termination, Retirement, Contract End, and Transfer Out. Your Admin can configure additional types.' },
      { q: 'How do I track asset returns?', a: 'Step 3 of the Offboarding Wizard creates an asset return checklist. Mark each item as returned, and note the condition. Lost or damaged items are flagged.' },
      { q: 'When is system access removed?', a: 'System access revocation is typically scheduled for the Last Working Day. Step 4 lets you review and confirm all accounts to be disabled.' },
      { q: 'Are exit interviews mandatory?', a: 'This depends on your organization\'s policy. Step 6 allows you to schedule an exit interview and record the feedback for departing employees.' },
    ],
  },
  {
    category: 'Tasks & Approvals',
    questions: [
      { q: 'How do I see my assigned tasks?', a: 'Navigate to Task Manager to see all your assigned tasks. You can filter by process type, status, or due date.' },
      { q: 'How do I complete a task?', a: 'Click on the task to open details, complete the required action, then click "Mark Complete". Add any notes if required.' },
      { q: 'What happens when I approve a request?', a: 'The request moves to the next stage of processing. An audit entry is created with your name, timestamp, and any comments you provided.' },
      { q: 'Can I delegate my approvals?', a: 'Yes, in the Approvals section, use the Delegate feature to assign your approval authority to a colleague for a specified period.' },
    ],
  },
];

// Keyboard shortcuts
const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['Alt', 'D'], action: 'Go to Dashboard' },
    { keys: ['Alt', 'O'], action: 'Go to Onboarding' },
    { keys: ['Alt', 'M'], action: 'Go to Transfers (Movers)' },
    { keys: ['Alt', 'L'], action: 'Go to Offboarding (Leavers)' },
    { keys: ['Alt', 'T'], action: 'Go to Task Manager' },
    { keys: ['Alt', 'S'], action: 'Open Search' },
    { keys: ['Alt', 'H'], action: 'Open Help Center' },
  ]},
  { category: 'Actions', items: [
    { keys: ['Ctrl', 'S'], action: 'Save current form' },
    { keys: ['Ctrl', 'Enter'], action: 'Submit / Confirm' },
    { keys: ['Escape'], action: 'Close panel / Cancel' },
    { keys: ['Tab'], action: 'Move to next field' },
    { keys: ['Shift', 'Tab'], action: 'Move to previous field' },
  ]},
  { category: 'Search', items: [
    { keys: ['/'], action: 'Focus search box (when on Search page)' },
    { keys: ['Enter'], action: 'Execute search' },
    { keys: ['Ctrl', 'F'], action: 'Filter results' },
  ]},
];

export const JMLHelpCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HelpTab>('home');
  const [selectedArticle, setSelectedArticle] = useState<IHelpArticle | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { key: HelpTab; label: string; icon: string }[] = [
    { key: 'home', label: 'Home', icon: 'Home' },
    { key: 'getting-started', label: 'Getting Started', icon: 'Rocket' },
    { key: 'features', label: 'Features', icon: 'WebComponents' },
    { key: 'faq', label: 'FAQs', icon: 'QuestionCircle' },
    { key: 'shortcuts', label: 'Shortcuts', icon: 'KeyboardClassic' },
    { key: 'support', label: 'Support', icon: 'Headset' },
  ];

  // Filter articles based on search
  const filterArticles = (articles: IHelpArticle[]): IHelpArticle[] => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.content.some(c => c.toLowerCase().includes(query)) ||
      (a.steps && a.steps.some(s => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)))
    );
  };

  // Render article detail view
  const renderArticle = (article: IHelpArticle): JSX.Element => (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <button
        onClick={() => setSelectedArticle(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: JOINER_COLOR, fontSize: '13px', marginBottom: '16px', padding: 0,
        }}
      >
        <Icon iconName="ChevronLeft" />
        Back to {activeTab === 'getting-started' ? 'Getting Started' : 'Features'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: article.color, color: '#fff', fontSize: '24px',
        }}>
          <Icon iconName={article.icon} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#8a8886', textTransform: 'uppercase', marginBottom: '4px' }}>
            {article.category}
          </div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1a1a1a' }}>
            {article.title}
          </h2>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {article.content.map((para, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '16px 0 0 0', fontSize: '14px', lineHeight: '1.7', color: '#323130' }}>
            {para}
          </p>
        ))}

        {article.steps && article.steps.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
              {article.id.includes('wizard') || article.steps[0].title.startsWith('Step') ? 'Steps' : 'Key Features'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {article.steps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '16px', padding: '16px',
                  background: '#f9f9f9', borderRadius: '8px',
                  borderLeft: `4px solid ${article.color}`,
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: article.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 600, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#605e5c', lineHeight: '1.5' }}>
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render article cards
  const renderArticleCards = (articles: IHelpArticle[]): JSX.Element => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {articles.map(article => (
        <div
          key={article.id}
          onClick={() => setSelectedArticle(article)}
          style={{
            background: '#fff', borderRadius: '8px', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer',
            border: '1px solid #edebe9', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            e.currentTarget.style.borderColor = article.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.borderColor = '#edebe9';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: article.color, color: '#fff', fontSize: '18px',
            }}>
              <Icon iconName={article.icon} />
            </div>
            <div style={{ fontSize: '11px', color: '#8a8886', textTransform: 'uppercase', fontWeight: 500 }}>
              {article.category}
            </div>
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
            {article.title}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#605e5c', lineHeight: '1.5' }}>
            {article.content[0].substring(0, 120)}...
          </p>
          <div style={{
            marginTop: '12px', fontSize: '13px', color: JOINER_COLOR,
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            Read more <Icon iconName="ChevronRight" style={{ fontSize: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
        borderRadius: '12px', padding: '40px', marginBottom: '24px',
        color: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon iconName="Help" style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 600 }}>Help Center</h1>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              Find answers, guides, and support for JML Lite
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ maxWidth: '500px' }}>
          <div style={{
            display: 'flex', background: '#fff', borderRadius: '8px',
            padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              style={{
                flex: 1, padding: '10px 16px', border: 'none', outline: 'none',
                fontSize: '14px', background: 'transparent',
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
              }}
            />
            <button style={{
              padding: '8px 20px', border: 'none', borderRadius: '6px',
              background: JOINER_COLOR, color: '#fff', cursor: 'pointer',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Icon iconName="Search" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        borderBottom: '1px solid #edebe9', overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedArticle(null); }}
            style={{
              padding: '12px 20px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? JOINER_COLOR : '#605e5c',
              borderBottom: activeTab === tab.key ? `3px solid ${JOINER_COLOR}` : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
            }}
          >
            <Icon iconName={tab.icon} style={{ fontSize: 14 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'home' && (
        <div>
          {/* Quick Links */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Quick Links
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
            {[
              { icon: 'Rocket', label: 'Getting Started', tab: 'getting-started' as HelpTab },
              { icon: 'AddFriend', label: 'Onboarding Guide', tab: 'features' as HelpTab, articleId: 'onboarding' },
              { icon: 'Sync', label: 'Transfer Guide', tab: 'features' as HelpTab, articleId: 'mover' },
              { icon: 'UserRemove', label: 'Offboarding Guide', tab: 'features' as HelpTab, articleId: 'offboarding' },
              { icon: 'QuestionCircle', label: 'FAQs', tab: 'faq' as HelpTab },
              { icon: 'Headset', label: 'Get Support', tab: 'support' as HelpTab },
            ].map((link, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveTab(link.tab);
                  if (link.articleId) {
                    const article = featureArticles.find(a => a.id === link.articleId);
                    if (article) setSelectedArticle(article);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px', background: '#fff', borderRadius: '8px',
                  border: '1px solid #edebe9', cursor: 'pointer',
                  transition: 'all 0.2s ease', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = JOINER_COLOR; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#edebe9'; }}
              >
                <Icon iconName={link.icon} style={{ fontSize: 20, color: JOINER_COLOR }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>{link.label}</span>
              </button>
            ))}
          </div>

          {/* Popular Articles */}
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Popular Articles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
            {[
              ...gettingStartedArticles.slice(0, 2),
              featureArticles.find(a => a.id === 'onboarding')!,
              featureArticles.find(a => a.id === 'myonboarding')!,
            ].map(article => (
              <div
                key={article.id}
                onClick={() => {
                  setActiveTab(gettingStartedArticles.includes(article) ? 'getting-started' : 'features');
                  setSelectedArticle(article);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', background: '#fff', borderRadius: '6px',
                  border: '1px solid #edebe9', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9f9f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
              >
                <Icon iconName={article.icon} style={{ fontSize: 18, color: article.color }} />
                <span style={{ fontSize: '14px', color: '#1a1a1a' }}>{article.title}</span>
                <Icon iconName="ChevronRight" style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8886' }} />
              </div>
            ))}
          </div>

          {/* Need More Help */}
          <div style={{
            background: '#f9f9f9', borderRadius: '8px', padding: '24px',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <Icon iconName="Headset" style={{ fontSize: 32, color: JOINER_COLOR }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                Need more help?
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#605e5c' }}>
                Contact HR Support for personalized assistance
              </p>
            </div>
            <button
              onClick={() => setActiveTab('support')}
              style={{
                padding: '10px 20px', background: JOINER_COLOR, color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500,
              }}
            >
              Contact Support
            </button>
          </div>
        </div>
      )}

      {activeTab === 'getting-started' && (
        selectedArticle ? renderArticle(selectedArticle) : (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
              Getting Started with JML Lite
            </h2>
            <p style={{ fontSize: '14px', color: '#605e5c', marginBottom: '24px' }}>
              New to JML Lite? Start here to learn the basics of employee lifecycle management.
            </p>
            {renderArticleCards(filterArticles(gettingStartedArticles))}
          </div>
        )
      )}

      {activeTab === 'features' && (
        selectedArticle ? renderArticle(selectedArticle) : (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
              Feature Guides
            </h2>
            <p style={{ fontSize: '14px', color: '#605e5c', marginBottom: '24px' }}>
              Detailed guides for each JML Lite feature and workflow.
            </p>
            {renderArticleCards(filterArticles(featureArticles))}
          </div>
        )
      )}

      {activeTab === 'faq' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Frequently Asked Questions
          </h2>
          {faqItems.map((category, catIdx) => (
            <div key={catIdx} style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '15px', fontWeight: 600, color: JOINER_COLOR,
                margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Icon iconName="Tag" style={{ fontSize: 14 }} />
                {category.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {category.questions.map((faq, i) => {
                  const faqKey = `${catIdx}-${i}`;
                  const isExpanded = expandedFaq === faqKey;
                  return (
                    <div
                      key={i}
                      style={{
                        background: '#fff', borderRadius: '8px',
                        border: '1px solid #edebe9', overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : faqKey)}
                        style={{
                          width: '100%', padding: '16px 20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
                          {faq.q}
                        </span>
                        <Icon
                          iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                          style={{ fontSize: 12, color: '#8a8886' }}
                        />
                      </button>
                      {isExpanded && (
                        <div style={{
                          padding: '0 20px 16px 20px',
                          fontSize: '13px', color: '#605e5c', lineHeight: '1.6',
                          borderTop: '1px solid #edebe9', marginTop: '-1px', paddingTop: '16px',
                        }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'shortcuts' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Keyboard Shortcuts
          </h2>
          <p style={{ fontSize: '14px', color: '#605e5c', marginBottom: '24px' }}>
            Use these keyboard shortcuts to navigate and work faster in JML Lite.
          </p>
          {shortcuts.map((category, catIdx) => (
            <div key={catIdx} style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '15px', fontWeight: 600, color: JOINER_COLOR,
                margin: '0 0 12px 0',
              }}>
                {category.category}
              </h3>
              <div style={{
                background: '#fff', borderRadius: '8px',
                border: '1px solid #edebe9', overflow: 'hidden',
              }}>
                {category.items.map((shortcut, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 20px',
                      borderBottom: i < category.items.length - 1 ? '1px solid #edebe9' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#1a1a1a' }}>{shortcut.action}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <kbd style={{
                            padding: '4px 8px', background: '#f3f2f1', borderRadius: '4px',
                            fontSize: '12px', fontFamily: 'monospace', color: '#323130',
                            border: '1px solid #d2d0ce',
                          }}>
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span style={{ color: '#8a8886', fontSize: '12px' }}>+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'support' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px 0' }}>
            Get Support
          </h2>
          <p style={{ fontSize: '14px', color: '#605e5c', marginBottom: '24px' }}>
            Need help with JML Lite? Our support team is here to assist you.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {/* HR Support */}
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #edebe9',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '10px',
                background: JOINER_COLOR, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', fontSize: '20px',
              }}>
                <Icon iconName="People" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                HR Support
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#605e5c', lineHeight: '1.5' }}>
                For questions about onboarding, transfers, offboarding processes, or policy clarifications.
              </p>
              <a
                href="mailto:hr.support@company.com"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: JOINER_COLOR, fontSize: '14px', textDecoration: 'none',
                }}
              >
                <Icon iconName="Mail" />
                hr.support@company.com
              </a>
            </div>

            {/* IT Support */}
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #edebe9',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '10px',
                background: MOVER_COLOR, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', fontSize: '20px',
              }}>
                <Icon iconName="Settings" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                IT Support
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#605e5c', lineHeight: '1.5' }}>
                For technical issues with the JML Lite application, system access problems, or bug reports.
              </p>
              <a
                href="mailto:it.helpdesk@company.com"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: MOVER_COLOR, fontSize: '14px', textDecoration: 'none',
                }}
              >
                <Icon iconName="Mail" />
                it.helpdesk@company.com
              </a>
            </div>

            {/* Training */}
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #edebe9',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '10px',
                background: '#107c10', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', fontSize: '20px',
              }}>
                <Icon iconName="Education" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                Training Resources
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#605e5c', lineHeight: '1.5' }}>
                Request training sessions for your team or access recorded webinars and tutorials.
              </p>
              <a
                href="mailto:learning@company.com"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: '#107c10', fontSize: '14px', textDecoration: 'none',
                }}
              >
                <Icon iconName="Mail" />
                learning@company.com
              </a>
            </div>
          </div>

          {/* Submit Request Form */}
          <div style={{
            background: '#fff', borderRadius: '8px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #edebe9',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
              Submit a Support Request
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '6px' }}>
                  Request Type
                </label>
                <select style={{
                  width: '100%', padding: '10px 12px', borderRadius: '4px',
                  border: '1px solid #8a8886', fontSize: '14px',
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
                }}>
                  <option>Question / How To</option>
                  <option>Report a Bug</option>
                  <option>Feature Request</option>
                  <option>Access Request</option>
                  <option>Training Request</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '6px' }}>
                  Priority
                </label>
                <select style={{
                  width: '100%', padding: '10px 12px', borderRadius: '4px',
                  border: '1px solid #8a8886', fontSize: '14px',
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
                }}>
                  <option>Low - Not urgent</option>
                  <option>Medium - Affects work</option>
                  <option>High - Work blocked</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '6px' }}>
                Subject
              </label>
              <input
                type="text"
                placeholder="Brief summary of your request"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '4px',
                  border: '1px solid #8a8886', fontSize: '14px',
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Please describe your issue or question in detail..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '4px',
                  border: '1px solid #8a8886', fontSize: '14px', resize: 'vertical',
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button style={{
              padding: '10px 24px', background: JOINER_COLOR, color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}>
              Submit Request
            </button>
          </div>

          {/* Additional Resources */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px 0' }}>
              Additional Resources
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[
                { icon: 'Document', label: 'User Manual (PDF)' },
                { icon: 'Video', label: 'Video Tutorials' },
                { icon: 'Documentation', label: 'Release Notes' },
                { icon: 'Group', label: 'Community Forum' },
              ].map((resource, i) => (
                <button
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', background: '#f9f9f9', borderRadius: '6px',
                    border: '1px solid #edebe9', cursor: 'pointer',
                    fontSize: '13px', color: '#323130',
                  }}
                >
                  <Icon iconName={resource.icon} style={{ color: JOINER_COLOR }} />
                  {resource.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JMLHelpCenter;
