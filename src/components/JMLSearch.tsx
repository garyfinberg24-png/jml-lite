/**
 * JMLSearch - JML Lite Search
 *
 * A comprehensive search interface for finding employees across all JML processes.
 * Features:
 * - Full-text search across Onboarding, Mover, and Offboarding SharePoint lists
 * - Filters by process type, status, department, date range
 * - Recent searches (persisted in localStorage)
 * - Relevance scoring and sorting
 */
import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { OnboardingService } from '../services/OnboardingService';
import { MoverService } from '../services/MoverService';
import { OffboardingService } from '../services/OffboardingService';
import { OnboardingStatus } from '../models/IOnboarding';
import { MoverStatus } from '../models/IMover';
import { OffboardingStatus } from '../models/IOffboarding';

interface IProps {
  sp: SPFI;
  onNavigate?: (view: string, params?: Record<string, unknown>) => void;
}

// Search result interface
interface ISearchResult {
  id: number;
  type: 'onboarding' | 'mover' | 'offboarding';
  title: string;
  subtitle: string;
  highlights: string[];
  status?: string;
  department?: string;
  keyDate: Date | null;
  lastModified: Date;
  relevanceScore: number;
}

// Filter state interface
interface ISearchFilters {
  types: string[];
  status: string[];
  department: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
}

// localStorage key for recent searches
const RECENT_SEARCHES_KEY = 'jml_recent_searches';

// Theme colors
const JOINER_COLOR = '#005BAA';
const MOVER_COLOR = '#ea580c';
const LEAVER_COLOR = '#d13438';

// Type options
const typeOptions = [
  { key: 'onboarding', text: 'Onboarding (Joiners)', icon: 'AddFriend', color: JOINER_COLOR },
  { key: 'mover', text: 'Transfers (Movers)', icon: 'Sync', color: MOVER_COLOR },
  { key: 'offboarding', text: 'Offboarding (Leavers)', icon: 'UserRemove', color: LEAVER_COLOR },
];

// Status options for each type
const onboardingStatuses = [OnboardingStatus.NotStarted, OnboardingStatus.InProgress, OnboardingStatus.Completed, OnboardingStatus.OnHold, OnboardingStatus.Cancelled];
const moverStatuses = [MoverStatus.NotStarted, MoverStatus.InProgress, MoverStatus.Completed, MoverStatus.OnHold, MoverStatus.Cancelled];
const offboardingStatuses = [OffboardingStatus.NotStarted, OffboardingStatus.InProgress, OffboardingStatus.Completed, OffboardingStatus.OnHold, OffboardingStatus.Cancelled];

// Sort options
const sortOptions: IDropdownOption[] = [
  { key: 'relevance', text: 'Most Relevant' },
  { key: 'recent', text: 'Most Recent' },
  { key: 'name', text: 'Name A-Z' },
  { key: 'date', text: 'By Key Date' },
];

/**
 * Calculate a simple relevance score based on how well the query matches
 */
const calculateRelevance = (query: string, ...fields: (string | undefined | null)[]): number => {
  if (!query) return 0.5;
  const lowerQuery = query.toLowerCase();
  let score = 0;
  let matchCount = 0;

  for (const field of fields) {
    if (!field) continue;
    const lowerField = field.toLowerCase();

    if (lowerField === lowerQuery) {
      score += 1.0;
      matchCount++;
    } else if (lowerField.startsWith(lowerQuery)) {
      score += 0.9;
      matchCount++;
    } else if (lowerField.includes(lowerQuery)) {
      score += 0.7;
      matchCount++;
    } else {
      const queryWords = lowerQuery.split(/\s+/);
      const fieldWords = lowerField.split(/\s+/);
      const wordMatches = queryWords.filter(qw => fieldWords.some(fw => fw.includes(qw)));
      if (wordMatches.length > 0) {
        score += 0.3 + (0.3 * wordMatches.length / queryWords.length);
        matchCount++;
      }
    }
  }

  return matchCount > 0 ? Math.min(score / matchCount, 1.0) : 0;
};

/**
 * Create a highlight snippet from content matching the query
 */
const createHighlight = (query: string, ...fields: (string | undefined | null)[]): string => {
  if (!query) return '';
  const lowerQuery = query.toLowerCase();

  for (const field of fields) {
    if (!field) continue;
    if (field.toLowerCase().includes(lowerQuery)) {
      const idx = field.toLowerCase().indexOf(lowerQuery);
      const start = Math.max(0, idx - 40);
      const end = Math.min(field.length, idx + query.length + 40);
      let snippet = field.substring(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < field.length) snippet = snippet + '...';
      return snippet;
    }
  }

  for (const field of fields) {
    if (field && field.length > 0) {
      return field.length > 100 ? field.substring(0, 100) + '...' : field;
    }
  }
  return '';
};

/**
 * Client-side text filter
 */
const matchesQuery = (query: string, ...fields: (string | undefined | null)[]): boolean => {
  if (!query || !query.trim()) return true;
  const lowerQuery = query.toLowerCase().trim();
  return fields.some(f => f && f.toLowerCase().includes(lowerQuery));
};

export const JMLSearch: React.FC<IProps> = ({ sp }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ISearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<ISearchFilters>({
    types: [],
    status: [],
    department: [],
    dateFrom: null,
    dateTo: null,
  });

  // Recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quick filter state
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  // Departments collected from results
  const [departments, setDepartments] = useState<string[]>([]);

  // Service refs
  const onboardingSvcRef = useRef<OnboardingService | null>(null);
  const moverSvcRef = useRef<MoverService | null>(null);
  const offboardingSvcRef = useRef<OffboardingService | null>(null);

  if (!onboardingSvcRef.current) onboardingSvcRef.current = new OnboardingService(sp);
  if (!moverSvcRef.current) moverSvcRef.current = new MoverService(sp);
  if (!offboardingSvcRef.current) offboardingSvcRef.current = new OffboardingService(sp);

  // Save a search term to recent searches
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const updated = [term, ...prev.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, 8);
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // Perform search against SharePoint lists
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);

    const typesToSearch = filters.types.length > 0 ? filters.types : ['onboarding', 'mover', 'offboarding'];
    const allResults: ISearchResult[] = [];
    const allDepartments = new Set<string>();

    try {
      const fetchPromises: Promise<void>[] = [];

      // Onboarding search
      if (typesToSearch.includes('onboarding')) {
        fetchPromises.push(
          onboardingSvcRef.current!.getOnboardings().then(onboardings => {
            for (const o of onboardings) {
              if (!matchesQuery(query, o.CandidateName, o.JobTitle, o.Department, o.Notes)) continue;

              // Status filter
              if (filters.status.length > 0 && o.Status && !filters.status.includes(o.Status)) continue;

              // Department filter
              if (filters.department.length > 0 && o.Department && !filters.department.includes(o.Department)) continue;

              // Date filter
              const modified = o.Modified ? new Date(o.Modified) : new Date();
              if (filters.dateFrom && modified < filters.dateFrom) continue;
              if (filters.dateTo && modified > filters.dateTo) continue;

              if (o.Department) allDepartments.add(o.Department);

              const relevance = calculateRelevance(query, o.CandidateName, o.JobTitle, o.Department);
              if (relevance > 0) {
                const startDate = o.StartDate ? new Date(o.StartDate) : null;
                allResults.push({
                  id: o.Id!,
                  type: 'onboarding',
                  title: o.CandidateName || 'Unknown Employee',
                  subtitle: `${o.JobTitle || 'No Title'} • ${o.Department || 'No Department'} • Starts ${startDate ? startDate.toLocaleDateString() : 'TBD'}`,
                  highlights: [createHighlight(query, o.Notes, o.CandidateName, o.JobTitle)].filter(Boolean),
                  status: o.Status,
                  department: o.Department,
                  keyDate: startDate,
                  lastModified: modified,
                  relevanceScore: relevance,
                });
              }
            }
          }).catch(err => {
            console.warn('[JMLSearch] Error searching onboardings:', err?.message || err);
          })
        );
      }

      // Mover search
      if (typesToSearch.includes('mover')) {
        fetchPromises.push(
          moverSvcRef.current!.getMovers().then(movers => {
            for (const m of movers) {
              if (!matchesQuery(query, m.EmployeeName, m.CurrentJobTitle, m.NewJobTitle, m.CurrentDepartment, m.NewDepartment, m.Notes, m.Reason)) continue;

              // Status filter
              if (filters.status.length > 0 && m.Status && !filters.status.includes(m.Status)) continue;

              // Department filter (check both current and new)
              if (filters.department.length > 0) {
                const matchesDept = (m.CurrentDepartment && filters.department.includes(m.CurrentDepartment)) ||
                                   (m.NewDepartment && filters.department.includes(m.NewDepartment));
                if (!matchesDept) continue;
              }

              // Date filter
              const modified = m.Modified ? new Date(m.Modified) : new Date();
              if (filters.dateFrom && modified < filters.dateFrom) continue;
              if (filters.dateTo && modified > filters.dateTo) continue;

              if (m.CurrentDepartment) allDepartments.add(m.CurrentDepartment);
              if (m.NewDepartment) allDepartments.add(m.NewDepartment);

              const relevance = calculateRelevance(query, m.EmployeeName, m.CurrentJobTitle, m.NewJobTitle, m.CurrentDepartment, m.NewDepartment);
              if (relevance > 0) {
                const effectiveDate = m.EffectiveDate ? new Date(m.EffectiveDate) : null;
                allResults.push({
                  id: m.Id!,
                  type: 'mover',
                  title: m.EmployeeName || 'Unknown Employee',
                  subtitle: `${m.CurrentDepartment || '?'} → ${m.NewDepartment || '?'} • ${m.MoverType || 'Transfer'} • Effective ${effectiveDate ? effectiveDate.toLocaleDateString() : 'TBD'}`,
                  highlights: [createHighlight(query, m.Reason, m.Notes, m.EmployeeName)].filter(Boolean),
                  status: m.Status,
                  department: m.NewDepartment || m.CurrentDepartment,
                  keyDate: effectiveDate,
                  lastModified: modified,
                  relevanceScore: relevance,
                });
              }
            }
          }).catch(err => {
            console.warn('[JMLSearch] Error searching movers:', err?.message || err);
          })
        );
      }

      // Offboarding search
      if (typesToSearch.includes('offboarding')) {
        fetchPromises.push(
          offboardingSvcRef.current!.getOffboardings().then(offboardings => {
            for (const o of offboardings) {
              if (!matchesQuery(query, o.EmployeeName, o.JobTitle, o.Department, o.Notes, o.TerminationType)) continue;

              // Status filter
              if (filters.status.length > 0 && o.Status && !filters.status.includes(o.Status)) continue;

              // Department filter
              if (filters.department.length > 0 && o.Department && !filters.department.includes(o.Department)) continue;

              // Date filter
              const modified = o.Modified ? new Date(o.Modified) : new Date();
              if (filters.dateFrom && modified < filters.dateFrom) continue;
              if (filters.dateTo && modified > filters.dateTo) continue;

              if (o.Department) allDepartments.add(o.Department);

              const relevance = calculateRelevance(query, o.EmployeeName, o.JobTitle, o.Department, o.TerminationType);
              if (relevance > 0) {
                const lastDay = o.LastWorkingDate ? new Date(o.LastWorkingDate) : null;
                allResults.push({
                  id: o.Id!,
                  type: 'offboarding',
                  title: o.EmployeeName || 'Unknown Employee',
                  subtitle: `${o.JobTitle || 'No Title'} • ${o.Department || 'No Department'} • Last Day ${lastDay ? lastDay.toLocaleDateString() : 'TBD'}`,
                  highlights: [createHighlight(query, o.Notes, o.TerminationType, o.EmployeeName)].filter(Boolean),
                  status: o.Status,
                  department: o.Department,
                  keyDate: lastDay,
                  lastModified: modified,
                  relevanceScore: relevance,
                });
              }
            }
          }).catch(err => {
            console.warn('[JMLSearch] Error searching offboardings:', err?.message || err);
          })
        );
      }

      await Promise.all(fetchPromises);

      // Sort by relevance
      allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      setResults(allResults);
      setDepartments(Array.from(allDepartments).sort());
      saveRecentSearch(query);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[JMLSearch] Search error:', errMsg);
      setSearchError('An error occurred while searching. Some results may be incomplete.');
      setResults(allResults);
    } finally {
      setIsSearching(false);
    }
  }, [filters, saveRecentSearch]);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        break;
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'date':
        sorted.sort((a, b) => {
          if (!a.keyDate && !b.keyDate) return 0;
          if (!a.keyDate) return 1;
          if (!b.keyDate) return -1;
          return a.keyDate.getTime() - b.keyDate.getTime();
        });
        break;
      case 'relevance':
      default:
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
    }
    return sorted;
  }, [results, sortBy]);

  // Handle search submit
  const handleSearch = useCallback(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle filter checkbox change
  const handleFilterChange = (filterType: keyof ISearchFilters, value: string, checked: boolean): void => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[];
      let newValues: string[];

      if (checked) {
        newValues = [...currentValues, value];
      } else {
        newValues = currentValues.filter(v => v !== value);
      }

      return { ...prev, [filterType]: newValues };
    });
  };

  // Clear all filters
  const clearFilters = (): void => {
    setFilters({
      types: [],
      status: [],
      department: [],
      dateFrom: null,
      dateTo: null,
    });
    setQuickFilter(null);
  };

  // Handle quick filter
  const handleQuickFilter = (type: string): void => {
    if (quickFilter === type) {
      setQuickFilter(null);
      setFilters(prev => ({ ...prev, types: [] }));
    } else {
      setQuickFilter(type);
      setFilters(prev => ({ ...prev, types: [type] }));
    }
  };

  // Get icon color by type
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      onboarding: JOINER_COLOR,
      mover: MOVER_COLOR,
      offboarding: LEAVER_COLOR,
    };
    return colors[type] || JOINER_COLOR;
  };

  // Get icon by type
  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      onboarding: 'AddFriend',
      mover: 'Sync',
      offboarding: 'UserRemove',
    };
    return icons[type] || 'Contact';
  };

  // Get type label
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      onboarding: 'Onboarding',
      mover: 'Transfer',
      offboarding: 'Offboarding',
    };
    return labels[type] || type;
  };

  // Get status badge color
  const getStatusColor = (status: string): { bg: string; text: string } => {
    const lowerStatus = (status || '').toLowerCase();
    const colors: Record<string, { bg: string; text: string }> = {
      'not started': { bg: '#f3f2f1', text: '#605e5c' },
      'pending': { bg: '#fff4ce', text: '#8a6914' },
      'pending approval': { bg: '#fff4ce', text: '#8a6914' },
      'in progress': { bg: '#deecf9', text: '#0078d4' },
      'scheduled': { bg: '#deecf9', text: '#0078d4' },
      'exit interview': { bg: '#e8d4f8', text: '#8764b8' },
      'completed': { bg: '#dff6dd', text: '#107c10' },
      'cancelled': { bg: '#f3f2f1', text: '#605e5c' },
    };
    return colors[lowerStatus] || { bg: '#f3f2f1', text: '#605e5c' };
  };

  // Re-search when filters change
  useEffect(() => {
    if (hasSearched && searchQuery) {
      performSearch(searchQuery);
    }
  }, [filters]);

  // Count active filters
  const activeFilterCount = filters.types.length + filters.status.length + filters.department.length +
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  // Get all applicable statuses based on selected types
  const applicableStatuses = useMemo(() => {
    const types = filters.types.length > 0 ? filters.types : ['onboarding', 'mover', 'offboarding'];
    const statuses = new Set<string>();
    if (types.includes('onboarding')) onboardingStatuses.forEach(s => statuses.add(s));
    if (types.includes('mover')) moverStatuses.forEach(s => statuses.add(s));
    if (types.includes('offboarding')) offboardingStatuses.forEach(s => statuses.add(s));
    return Array.from(statuses);
  }, [filters.types]);

  return (
    <div style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Hero Section with Search */}
      <div style={{
        background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
        borderRadius: '12px',
        padding: '40px',
        marginBottom: '24px',
        color: '#ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon iconName="Search" style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 600 }}>Search JML Lite</h1>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              Find employees across onboarding, transfers, and offboarding processes
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '700px' }}>
          <div style={{
            display: 'flex', gap: '8px', background: '#fff', borderRadius: '8px',
            padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by employee name, job title, department..."
              style={{
                flex: 1, padding: '12px 16px', border: 'none', outline: 'none',
                fontSize: '15px', background: 'transparent',
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: '10px 24px', border: 'none', borderRadius: '6px',
                background: JOINER_COLOR, color: '#fff', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Icon iconName="Search" />
              Search
            </button>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            {typeOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleQuickFilter(opt.key)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  border: quickFilter === opt.key ? '1px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: quickFilter === opt.key ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: '#ffffff',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Icon iconName={opt.icon} />
                {opt.text}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        {!hasSearched && recentSearches.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: '10px' }}>
              Recent Searches
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {recentSearches.map((search, index) => (
                <span
                  key={index}
                  onClick={() => {
                    setSearchQuery(search);
                    performSearch(search);
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: '6px 12px', borderRadius: '16px',
                    fontSize: '13px', color: '#ffffff', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <Icon iconName="History" style={{ fontSize: 12 }} />
                  {search}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Results Area */}
      {hasSearched && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
          {/* Filters Panel */}
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '8px',
            padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            height: 'fit-content', position: 'sticky', top: '20px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600 }}>
              Filters
              {activeFilterCount > 0 && (
                <span style={{ marginLeft: '8px', color: JOINER_COLOR }}>({activeFilterCount})</span>
              )}
            </h3>

            {/* Process Type Filter */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '10px' }}>
                Process Type
              </div>
              {typeOptions.map(opt => (
                <label key={opt.key} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '8px', cursor: 'pointer', fontSize: '13px',
                }}>
                  <input
                    type="checkbox"
                    checked={filters.types.includes(opt.key)}
                    onChange={(e) => handleFilterChange('types', opt.key, e.target.checked)}
                    style={{ accentColor: opt.color }}
                  />
                  <Icon iconName={opt.icon} style={{ color: opt.color, fontSize: 14 }} />
                  {opt.text.split(' ')[0]}
                </label>
              ))}
            </div>

            {/* Status Filter */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '10px' }}>
                Status
              </div>
              {applicableStatuses.map(status => (
                <label key={status} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '6px', cursor: 'pointer', fontSize: '13px',
                }}>
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={(e) => handleFilterChange('status', status, e.target.checked)}
                  />
                  {status}
                </label>
              ))}
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '10px' }}>
                  Department
                </div>
                {departments.slice(0, 8).map(dept => (
                  <label key={dept} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '6px', cursor: 'pointer', fontSize: '13px',
                  }}>
                    <input
                      type="checkbox"
                      checked={filters.department.includes(dept)}
                      onChange={(e) => handleFilterChange('department', dept, e.target.checked)}
                    />
                    {dept}
                  </label>
                ))}
              </div>
            )}

            {/* Date Filter */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#323130', marginBottom: '10px' }}>
                Last Modified
              </div>
              <DatePicker
                placeholder="From date"
                value={filters.dateFrom || undefined}
                onSelectDate={(date) => setFilters(prev => ({ ...prev, dateFrom: date || null }))}
                styles={{ root: { marginBottom: '8px' } }}
              />
              <DatePicker
                placeholder="To date"
                value={filters.dateTo || undefined}
                onSelectDate={(date) => setFilters(prev => ({ ...prev, dateTo: date || null }))}
              />
            </div>

            {activeFilterCount > 0 && (
              <div
                onClick={clearFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: JOINER_COLOR, fontSize: '13px', cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                <Icon iconName="Cancel" />
                Clear all filters
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div style={{ minHeight: '400px' }}>
            {/* Error banner */}
            {searchError && (
              <div style={{
                backgroundColor: '#fde7e9', border: '1px solid #f1bbbc',
                borderRadius: '4px', padding: '12px 16px', marginBottom: '16px',
                color: '#a80000', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Icon iconName="Warning" />
                {searchError}
              </div>
            )}

            {isSearching ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: '60px',
              }}>
                <Spinner size={SpinnerSize.large} label="Searching across all JML data..." />
              </div>
            ) : sortedResults.length > 0 ? (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '14px', color: '#605e5c' }}>
                    {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                  </span>
                  <Dropdown
                    placeholder="Sort by"
                    selectedKey={sortBy}
                    options={sortOptions}
                    onChange={(_, option) => setSortBy(option?.key as string || 'relevance')}
                    styles={{ root: { width: 160 } }}
                  />
                </div>

                {sortedResults.map(result => (
                  <div
                    key={`${result.type}-${result.id}`}
                    style={{
                      backgroundColor: '#ffffff', borderRadius: '8px',
                      padding: '20px', marginBottom: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      border: '1px solid #edebe9',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      e.currentTarget.style.borderColor = getTypeColor(result.type);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#edebe9';
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px',
                    }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: getTypeColor(result.type), color: '#fff',
                        fontSize: '18px', flexShrink: 0,
                      }}>
                        <Icon iconName={getTypeIcon(result.type)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#1a1a1a', marginBottom: '4px' }}>
                          {result.title}
                        </div>
                        <div style={{ fontSize: '13px', color: '#605e5c' }}>
                          {result.subtitle}
                        </div>
                      </div>
                      {result.status && (
                        <span style={{
                          padding: '4px 10px', borderRadius: '4px',
                          fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
                          backgroundColor: getStatusColor(result.status).bg,
                          color: getStatusColor(result.status).text,
                        }}>
                          {result.status}
                        </span>
                      )}
                    </div>

                    {result.highlights.length > 0 && result.highlights[0] && (
                      <div style={{
                        fontSize: '13px', color: '#605e5c', lineHeight: '1.5',
                        padding: '10px 12px', backgroundColor: '#f9f9f9',
                        borderRadius: '4px', borderLeft: `3px solid ${getTypeColor(result.type)}`,
                        marginBottom: '12px',
                      }}>
                        {result.highlights[0]}
                      </div>
                    )}

                    <div style={{
                      display: 'flex', gap: '16px', fontSize: '12px', color: '#8a8886',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon iconName={getTypeIcon(result.type)} />
                        {getTypeLabel(result.type)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon iconName="Calendar" />
                        Modified {result.lastModified.toLocaleDateString()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon iconName="Equalizer" />
                        {Math.round(result.relevanceScore * 100)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{
                textAlign: 'center', padding: '60px 40px', color: '#605e5c',
                background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <Icon iconName="SearchIssue" style={{ fontSize: 64, color: '#c8c6c4', marginBottom: '16px' }} />
                <div style={{ fontSize: '18px', fontWeight: 500, color: '#1a1a1a', marginBottom: '8px' }}>
                  No results found
                </div>
                <div style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                  We couldn&apos;t find anything matching &quot;{searchQuery}&quot;.
                  Try different keywords or adjust your filters.
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    style={{
                      marginTop: '16px', padding: '8px 16px', border: `1px solid ${JOINER_COLOR}`,
                      borderRadius: '4px', background: 'transparent', color: JOINER_COLOR,
                      cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JMLSearch;
