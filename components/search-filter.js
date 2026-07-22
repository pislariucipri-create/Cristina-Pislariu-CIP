// ═══════════════════════════════════════════════════════════════
// ADVANCED SEARCH & FILTERING SYSTEM
// Unified search and filtering across all pages
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yexvpbgkrzerkizscgfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q52fh6Xa3yNm3q0akTrKKw_7AlxLrCU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Search configuration for different data types
const SEARCH_CONFIGS = {
    patients: {
        fields: ['name', 'email', 'age'],
        label: 'Caută pacienți...',
        placeholder: 'Nume, email, vârstă...'
    },
    sessions: {
        fields: ['date', 'obs'],
        label: 'Caută ședințe...',
        placeholder: 'Data, observații...'
    },
    reports: {
        fields: ['month', 'progrese', 'dificultati'],
        label: 'Caută rapoarte...',
        placeholder: 'Lună, progrese, dificultăți...'
    },
    archived: {
        fields: ['name', 'email', 'archived_at'],
        label: 'Caută în arhivă...',
        placeholder: 'Nume, email, data arhivării...'
    }
};

// Current search state
let searchState = {
    query: '',
    filters: {},
    sortField: null,
    sortDirection: 'asc'
};

// Initialize search component
function initializeSearch(configKey, containerId, resultsCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const config = SEARCH_CONFIGS[configKey];
    if (!config) return;
    
    const searchHTML = `
        <div class="search-component" style="margin-bottom: 1.5rem;">
            <div class="search-bar" style="position: relative;">
                <span class="search-icon" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</span>
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="${config.placeholder}"
                    style="width: 100%; padding: 12px 12px 12px 40px; border: 1px solid #e8e0d8; border-radius: 12px; font-size: 0.95rem; outline: none; transition: 0.3s;"
                    oninput="handleSearch('${configKey}', this.value)"
                />
                <button 
                    onclick="clearSearch('${configKey}')"
                    style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.5; display: none;"
                    id="clearSearchBtn"
                >×</button>
            </div>
            
            <div class="filter-bar" style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                <select 
                    id="sortSelect" 
                    onchange="handleSort('${configKey}', this.value)"
                    style="padding: 8px 12px; border: 1px solid #e8e0d8; border-radius: 8px; font-size: 0.85rem; background: white;"
                >
                    <option value="">Sortează după...</option>
                    ${config.fields.map(field => `
                        <option value="${field}">${field.charAt(0).toUpperCase() + field.slice(1)}</option>
                    `).join('')}
                </select>
                
                <button 
                    onclick="toggleSortDirection('${configKey}')"
                    style="padding: 8px 12px; border: 1px solid #e8e0d8; border-radius: 8px; background: white; cursor: pointer;"
                    id="sortDirectionBtn"
                >⬆️</button>
                
                <button 
                    onclick="resetSearch('${configKey}')"
                    style="padding: 8px 12px; border: 1px solid #e8e0d8; border-radius: 8px; background: white; cursor: pointer;"
                >🔄 Reset</button>
            </div>
            
            <div class="search-stats" style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                <span id="searchStats">Se caută...</span>
            </div>
        </div>
    `;
    
    container.innerHTML = searchHTML;
    
    // Store callback for this search instance
    if (!window.searchCallbacks) window.searchCallbacks = {};
    window.searchCallbacks[configKey] = resultsCallback;
}

// Handle search input
function handleSearch(configKey, query) {
    searchState.query = query.toLowerCase();
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (query) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    applySearch(configKey);
}

// Clear search
function clearSearch(configKey) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        handleSearch(configKey, '');
    }
}

// Handle sort selection
function handleSort(configKey, field) {
    searchState.sortField = field;
    applySearch(configKey);
}

// Toggle sort direction
function toggleSortDirection(configKey) {
    searchState.sortDirection = searchState.sortDirection === 'asc' ? 'desc' : 'asc';
    const btn = document.getElementById('sortDirectionBtn');
    if (btn) {
        btn.textContent = searchState.sortDirection === 'asc' ? '⬆️' : '⬇️';
    }
    applySearch(configKey);
}

// Reset search
function resetSearch(configKey) {
    searchState = {
        query: '',
        filters: {},
        sortField: null,
        sortDirection: 'asc'
    };
    
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    applySearch(configKey);
}

// Apply search and filters
function applySearch(configKey) {
    const callback = window.searchCallbacks?.[configKey];
    if (!callback) return;
    
    const results = callback(searchState);
    updateSearchStats(results.length, configKey);
}

// Update search statistics
function updateSearchStats(count, configKey) {
    const statsEl = document.getElementById('searchStats');
    if (statsEl) {
        statsEl.textContent = `${count} rezultat(e) găsit(e)`;
    }
}

// Generic search function for arrays
function searchArray(data, query, fields) {
    if (!query) return data;
    
    return data.filter(item => {
        return fields.some(field => {
            const value = item[field];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(query);
        });
    });
}

// Generic sort function
function sortArray(data, field, direction) {
    if (!field) return data;
    
    return [...data].sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
        } else {
            comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return direction === 'desc' ? -comparison : comparison;
    });
}

// Advanced filter builder
function buildFilterHTML(filters, containerId, applyCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const filterHTML = `
        <div class="advanced-filters" style="background: #f8f5f0; padding: 1rem; border-radius: 12px; margin-top: 1rem;">
            <h4 style="margin: 0 0 1rem; font-family: var(--font-serif);">Filtre Avansate</h4>
            ${filters.map(filter => `
                <div class="filter-item" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.3rem; font-weight: 700; font-size: 0.85rem;">${filter.label}</label>
                    ${filter.type === 'select' ? `
                        <select 
                            data-filter="${filter.field}"
                            onchange="updateFilter('${filter.field}', this.value)"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"
                        >
                            <option value="">Toate</option>
                            ${filter.options.map(opt => `
                                <option value="${opt.value}">${opt.label}</option>
                            `).join('')}
                        </select>
                    ` : filter.type === 'date' ? `
                        <input 
                            type="date" 
                            data-filter="${filter.field}"
                            onchange="updateFilter('${filter.field}', this.value)"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"
                        />
                    ` : filter.type === 'range' ? `
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input 
                                type="number" 
                                data-filter="${filter.field}_min"
                                placeholder="Min"
                                onchange="updateFilter('${filter.field}_min', this.value)"
                                style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"
                            />
                            <span>-</span>
                            <input 
                                type="number" 
                                data-filter="${filter.field}_max"
                                placeholder="Max"
                                onchange="updateFilter('${filter.field}_max', this.value)"
                                style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"
                            />
                        </div>
                    ` : `
                        <input 
                            type="text" 
                            data-filter="${filter.field}"
                            placeholder="${filter.placeholder || ''}"
                            oninput="updateFilter('${filter.field}', this.value)"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"
                        />
                    `}
                </div>
            `).join('')}
            
            <button 
                onclick="applyFilters()"
                style="width: 100%; padding: 10px; background: var(--verde-sage); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;"
            >Aplică Filtre</button>
        </div>
    `;
    
    container.innerHTML = filterHTML;
    
    // Store apply callback
    window.filterApplyCallback = applyCallback;
}

// Update filter value
function updateFilter(field, value) {
    searchState.filters[field] = value;
}

// Apply all filters
function applyFilters() {
    if (window.filterApplyCallback) {
        window.filterApplyCallback(searchState);
    }
}

// Filter data based on current filters
function filterData(data, filters) {
    return data.filter(item => {
        return Object.entries(filters).every(([field, value]) => {
            if (!value) return true;
            
            // Handle range filters
            if (field.endsWith('_min')) {
                const baseField = field.replace('_min', '');
                const itemValue = item[baseField];
                return itemValue >= parseFloat(value);
            }
            
            if (field.endsWith('_max')) {
                const baseField = field.replace('_max', '');
                const itemValue = item[baseField];
                return itemValue <= parseFloat(value);
            }
            
            // Handle date filters
            if (field.includes('date') || field.includes('at')) {
                const itemValue = item[field];
                if (!itemValue) return false;
                const itemDate = new Date(itemValue);
                const filterDate = new Date(value);
                return itemDate >= filterDate;
            }
            
            // Handle regular filters
            const itemValue = item[field];
            if (itemValue === null || itemValue === undefined) return false;
            
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
    });
}

// Quick search for patients
function quickSearchPatients(query, patients) {
    if (!query) return patients;
    
    const lowerQuery = query.toLowerCase();
    return patients.filter(patient => {
        return (
            (patient.name || '').toLowerCase().includes(lowerQuery) ||
            (patient.email || '').toLowerCase().includes(lowerQuery) ||
            String(patient.age || '').includes(lowerQuery)
        );
    });
}

// Quick search for sessions
function quickSearchSessions(query, sessions) {
    if (!query) return sessions;
    
    const lowerQuery = query.toLowerCase();
    return sessions.filter(session => {
        return (
            (session.date || '').toLowerCase().includes(lowerQuery) ||
            (session.obs || '').toLowerCase().includes(lowerQuery)
        );
    });
}

// Add search to existing page
function addSearchToPage(configKey, data, renderCallback) {
    // Create search container if it doesn't exist
    let searchContainer = document.getElementById('searchContainer');
    if (!searchContainer) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'searchContainer';
        
        // Insert after header
        const header = document.querySelector('header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(searchContainer, header.nextSibling);
        } else {
            document.body.insertBefore(searchContainer, document.body.firstChild);
        }
    }
    
    initializeSearch(configKey, 'searchContainer', (searchState) => {
        let filteredData = searchArray(data, searchState.query, SEARCH_CONFIGS[configKey].fields);
        
        if (Object.keys(searchState.filters).length > 0) {
            filteredData = filterData(filteredData, searchState.filters);
        }
        
        if (searchState.sortField) {
            filteredData = sortArray(filteredData, searchState.sortField, searchState.sortDirection);
        }
        
        renderCallback(filteredData);
        return filteredData;
    });
    
    // Initial render
    renderCallback(data);
}

// Debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.handleSearch = debounce(handleSearch, 300);
window.clearSearch = clearSearch;
window.handleSort = handleSort;
window.toggleSortDirection = toggleSortDirection;
window.resetSearch = resetSearch;
window.updateFilter = updateFilter;
window.applyFilters = applyFilters;
