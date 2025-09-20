// Section Page JavaScript - Handles individual section functionality
class SectionManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.currentSection = this.getCurrentSectionFromURL();
        this.currentTab = 'playbooks';
        this.sectionConfig = this.loadSectionConfig();
        this._bc = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('hub-sync') : null;
        this.init();
    }

    // Content activity logger for section page (writes to localStorage)
    logContentActivity(action, resourceType, title) {
        try {
            const username = this.currentUser?.username || 'Unknown';
            const type = (resourceType === 'boxLinks') ? 'boxlink'
                       : (resourceType === 'playbooks') ? 'playbook'
                       : (resourceType === 'dashboards') ? 'dashboard'
                       : String(resourceType || 'resource');
            const entry = {
                username,
                action: action || 'updated',
                section: this.currentSection || 'general',
                type,
                title: title || '',
                timestamp: new Date().toISOString()
            };
            const list = JSON.parse(localStorage.getItem('hubActivities') || '[]');
            list.unshift(entry);
            if (list.length > 1000) list.length = 1000;
            localStorage.setItem('hubActivities', JSON.stringify(list));
        } catch (_) {}
    }

    getCurrentUser() {
        const session = localStorage.getItem('hubSession');
        if (session) {
            return JSON.parse(session);
        }
        return null;
    }

    init() {
        if (!this.validateSession()) {
            return;
        }
        this.checkAccess();
        // Section session start
        this.sectionSessionStartMs = Date.now();
        // One-time migration: ensure all resources in this section have stable unique IDs
        try { this.ensureResourceIdsForCurrentSection(); } catch (_) {}
        this.loadSectionData();
        this.bindEvents();
        this.renderDynamicUI();
        // Ensure filters are cleared on entry to avoid stale search/category narrowing results
        try {
            const searchInput = document.getElementById('searchInput');
            const categoryFilter = document.getElementById('categoryFilter');
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = '';
        } catch (_) {}
        // Show content early to avoid spinner stuck on minor errors
        const loadingEl = document.getElementById('loadingScreen');
        const contentEl = document.getElementById('mainContent');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        try {
            this.renderCurrentTab();
        } catch (e) {
            console.error('Error rendering tab:', e);
        }
        // usage logging for resource clicks
        this.bindResourceClickLogging();
        this.setupSectionSessionLogging();
    }

    // Avoid UI hangs if optional DB promises never resolve
    async _safeDbCall(promise, timeoutMs = 1500) {
        try {
            await Promise.race([
                promise,
                new Promise((resolve) => setTimeout(resolve, timeoutMs))
            ]);
        } catch (_) {
            // Ignore DB errors/timeouts silently; localStorage is already updated
        }
    }

    async _safeDbFetch(promise, timeoutMs = 1500, fallback = []) {
        try {
            return await Promise.race([
                promise.catch(() => fallback),
                new Promise((resolve) => setTimeout(() => resolve(fallback), Math.min(timeoutMs, 800)))
            ]);
        } catch (_) {
            return fallback;
        }
    }

    // Avoid UI hangs if optional DB promises never resolve
    async _safeDbCall(promise, timeoutMs = 1500) {
        try {
            await Promise.race([
                promise,
                new Promise((resolve) => setTimeout(resolve, timeoutMs))
            ]);
        } catch (_) {
            // Ignore DB errors/timeouts silently; localStorage is already updated
        }
    }
    normalizeUrl(possibleUrl) {
        try {
            const raw = String(possibleUrl || '').trim();
            if (!raw) return raw;
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
                return 'https://' + raw;
            }
            return raw;
        } catch (_) { return possibleUrl; }
    }

    checkAccess() {
        if (!this.currentUser) {
            window.location.href = 'auth.html';
            return;
        }

        // Admins or users with global edit can always view sections
        if (this.currentUser.role === 'admin' || this.currentUser.permissions?.canEditAllSections) {
            return;
        }

        if (!this.currentUser.permissions.sections.includes(this.currentSection)) {
            alert('You do not have access to this section');
            window.location.href = 'index.html';
            return;
        }
    }

    loadSectionData() {
        // Load section information: prefer dynamic config from sectionOrder
        let sectionConfig = null;
        try {
            const savedOrder = localStorage.getItem('sectionOrder');
            if (savedOrder) {
                const parsed = JSON.parse(savedOrder);
                sectionConfig = parsed.find(s => s.id === this.currentSection) || null;
            }
        } catch (_) {}

        if (!sectionConfig) {
            const defaults = {
                'costing': { name: 'Costing', icon: 'fas fa-calculator', intro: 'Guides and tools for cost analysis, budgeting, and ROI planning.' },
                'supply-planning': { name: 'Supply Planning', icon: 'fas fa-truck', intro: 'Demand forecasting, inventory optimization, and supplier planning resources.' },
                'operations': { name: 'Operations', icon: 'fas fa-cogs', intro: 'Process improvement, SOPs, production metrics, and maintenance guidance.' },
                'quality': { name: 'Quality Management', icon: 'fas fa-check-circle', intro: 'Quality management practices, control procedures, and compliance standards.' },
                'hr': { name: 'Human Resources', icon: 'fas fa-users', intro: 'People operations policies, templates, onboarding, and workforce resources.' },
                'it': { name: 'IT & Technology', icon: 'fas fa-laptop-code', intro: 'IT systems, tooling, security, and operational best practices.' },
                'sales': { name: 'Sales & Marketing', icon: 'fas fa-chart-line', intro: 'Sales playbooks, marketing assets, and performance dashboards.' },
                'compliance': { name: 'Compliance & Legal', icon: 'fas fa-gavel', intro: 'Policies, legal, and regulatory guidance with reusable templates.' }
            };
            sectionConfig = defaults[this.currentSection] || { name: this.currentSection, icon: 'fas fa-th-large', intro: '' };
        }

        const nameEl = document.getElementById('sectionName');
        const iconEl = document.getElementById('sectionIcon');
        if (nameEl) nameEl.textContent = sectionConfig.name || this.currentSection;
        if (iconEl) {
            if (sectionConfig.image) {
                try {
                    iconEl.outerHTML = `<img id="sectionIcon" src="${sectionConfig.image}" style="width:22px;height:22px;object-fit:contain;margin-right:8px;" />`;
                } catch (_) {
                    iconEl.className = this.normalizeIconClass(sectionConfig.icon || 'fa-solid fa-table-cells-large');
                }
            } else {
                iconEl.className = this.normalizeIconClass(sectionConfig.icon || 'fa-solid fa-table-cells-large');
            }
        }
        document.title = `${sectionConfig.name || this.currentSection} - Information Hub`;

        // Intro text
        const introEl = document.getElementById('sectionIntro');
        if (introEl) {
            const intro = (sectionConfig.intro || '').trim();
            introEl.textContent = intro;
            introEl.style.display = intro ? 'block' : 'none';
        }

        // Apply persistent background image per section (defer heavy images)
        try {
            const disable = (() => { try { return localStorage.getItem('disableBackgrounds') === '1' || localStorage.getItem('disableBackgrounds') === 'true'; } catch(_) { return false; } })();
            const key = 'sectionBackgrounds';
            const raw = localStorage.getItem(key);
            const map = raw ? JSON.parse(raw) : {};
            let img = map[this.currentSection];
            const container = document.querySelector('.container');
            const preferList = [
                'background-pic/159484_L.png','background-pic/162053_L.png','background-pic/162054_L.png','background-pic/162058_L.png',
                'background-pic/162062_L.png','background-pic/168817_L.png','background-pic/171327_Y.png','background-pic/537081_L.png',
                'background-pic/537082_K.png','background-pic/560846_L.png'
            ];
            const heavyList = [
                'background-pic/SU24CBY_FESTIVAL_B_LONGFORM_GIF_1920x1080.gif','background-pic/SU25CBY_RST_GROUP.gif'
            ];
            if (!img) {
                const idx = Math.abs(this._hash(this.currentSection)) % preferList.length;
                img = preferList[idx];
            }
            if (container) {
                container.style.borderRadius = '12px';
                container.style.backgroundImage = 'linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92))';
                const applyBg = () => {
                    try {
                        if (disable) return; // skip applying heavy backgrounds if disabled
                        const chosen = heavyList.includes(img) ? preferList[0] : img;
                        // WebP/CDN optimization disabled; use original image
                        container.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url('${chosen}')`;
                        container.style.backgroundSize = 'cover';
                        container.style.backgroundPosition = 'center';
                    } catch(_) {}
                };
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(applyBg, { timeout: 1200 });
                } else {
                    setTimeout(applyBg, 200);
                }
            }
        } catch (_) {}
    }

    // Normalize FA icon class (simple copy from index page)
    normalizeIconClass(cls) {
        if (!cls || typeof cls !== 'string') return 'fa-solid fa-table-cells-large';
        let c = cls.trim();
        if (/\bfa-(solid|regular|light|thin|duotone|brands)\b/.test(c)) return c;
        c = c.replace(/\bfas\b/, 'fa-solid').replace(/\bfar\b/, 'fa-regular').replace(/\bfab\b/, 'fa-brands');
        if (!/\bfa-\w+\b/.test(c) || !/\bfa-\w+\b.*\bfa-/.test('fa ' + c)) {
            if (!/\bfa-(solid|regular|brands)\b/.test(c)) {
                c = 'fa-solid ' + c;
            }
        }
        return c;
    }

    _hash(str) {
        let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return h;
    }

    // Add session validation on page load
    validateSession() {
        const session = localStorage.getItem('hubSession');
        if (!session) {
            window.location.href = 'auth.html';
            return false;
        }
        
        try {
            const sessionData = JSON.parse(session);
            // Check if session is still valid (you can add expiration logic here)
            return true;
        } catch (e) {
            localStorage.removeItem('hubSession');
            window.location.href = 'auth.html';
            return false;
        }
    }

    getCurrentSectionFromURL() {
        // Extract section from URL or use stored section
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('section') || localStorage.getItem('currentSection') || 'costing';
    }

    bindEvents() {
        // Tab switching
        window.switchTab = (tabName) => this.switchTab(tabName);
        // Customize
        window.customizeSection = () => this.openCustomizeModal();
        // Search and filter
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterResources());
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterResources());
        }
        // Add resource
        window.addResource = (type) => this.addResource(type);
        // Edit and delete resources
        window.editResource = (type, id) => this.editResource(type, id);
        window.deleteResource = (type, id) => this.deleteResource(type, id);
        // Back to hub
        window.goBackToHub = () => this.goBackToHub();
        // Live update section config across tabs/windows
        window.addEventListener('storage', (e) => {
            try {
                if (e && e.key === `section_config_${this.currentSection}`) {
                    this.sectionConfig = this.loadSectionConfig();
                    this.renderDynamicUI();
                    this.renderCurrentTab();
                }
            } catch (_) {}
        });
    }

    setupSectionSessionLogging() {
        const logClose = () => {
            if (this._sectionSessionLogged) return;
            this._sectionSessionLogged = true;
            const durationMs = Date.now() - (this.sectionSessionStartMs || Date.now());
            try {
                if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                    hubDatabase.saveActivity({
                        id: Date.now().toString(),
                        userId: this.currentUser.id,
                        username: this.currentUser.username,
                        action: 'CLOSE_SECTION',
                        description: `Closed section ${this.currentSection} after ${Math.round(durationMs/1000)}s`,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (_) {}
        };
        window.addEventListener('beforeunload', logClose);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) logClose();
        });
        // Log open
        try {
            if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                hubDatabase.saveActivity({
                    id: Date.now().toString(),
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    action: 'OPEN_SECTION',
                    description: `Opened section ${this.currentSection}`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {}
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab appearance
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const ev = (typeof event !== 'undefined' ? event : window.event);
        if (ev && ev.target) {
            ev.target.classList.add('active');
        } else {
            const activeTab = document.querySelector(`.nav-tab[onclick*="${tabName}"]`);
            if (activeTab) activeTab.classList.add('active');
        }

        // Show/hide content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${tabName}-section`).classList.add('active');

        // Reset filters on tab change so counts and visible items match expectations
        try {
            const searchInput = document.getElementById('searchInput');
            const categoryFilter = document.getElementById('categoryFilter');
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = '';
        } catch (_) {}

        // Render the appropriate content
        this.renderCurrentTab();

        // Log tab switch as activity
        try {
            if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                hubDatabase.saveActivity({
                    id: Date.now().toString(),
                    userId: this.currentUser.id,
                    username: this.currentUser.username,
                    action: 'SWITCH_SECTION_TAB',
                    description: `Switched to tab ${tabName} in section ${this.currentSection}`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (_) {}
    }

    renderCurrentTab() {
        this.renderResources(this.currentTab);
    }

    async renderResources(type) {
        const gridId = `${type.replace('-', '-')}-grid`;
        const grid = document.getElementById(gridId);
        const emptyState = document.getElementById('emptyState');
        const addBtn = document.querySelector(`#${type}-section .add-resource-btn`);
        
        if (!grid) return;

        // Show/hide add button based on permissions
        if (addBtn) {
            addBtn.style.display = this.canEditResource() ? 'inline-flex' : 'none';
        }

        // Render locally first for instant feedback
        const localResources = await this.getResourcesLocalOnly(type);
        const localFiltered = this.getFilteredResources(localResources);
        if (localFiltered.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            grid.style.display = 'grid';
            emptyState.style.display = 'none';
            grid.innerHTML = localFiltered.map(resource => this.createResourceCard(resource, type)).join('');
        }

        // Then merge with DB in background and update if changed
        setTimeout(async () => {
            try {
                const resources = await this.getResources(type);
                const filteredResources = this.getFilteredResources(resources);
                const html = filteredResources.map(resource => this.createResourceCard(resource, type)).join('');
                if (grid.innerHTML !== html) {
                    if (filteredResources.length === 0) {
                        grid.style.display = 'none';
                        emptyState.style.display = 'block';
                    } else {
                        grid.style.display = 'grid';
                        emptyState.style.display = 'none';
                        grid.innerHTML = html;
                    }
                }
            } catch (_) {}
        }, 0);
    }

    async getResources(type) {
        const storageType = this.mapToStorageType(type);
        let dbResources = [];
        try {
            if (window.hubDatabase && hubDatabase.getResourcesByType &&
                (storageType === 'playbooks' || storageType === 'boxLinks' || storageType === 'dashboards')) {
                dbResources = await this._safeDbFetch(
                    hubDatabase.getResourcesByType(this.currentSection, storageType),
                    1500,
                    []
                );
            }
        } catch (error) {
            console.warn('DB not ready, using localStorage fallback');
        }

        // LocalStorage: support defaults + custom types under section_<id>.custom[storageType]
        const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[],"custom":{}}');
        const custom = sectionData.custom || {};
        const lsArray = (sectionData[storageType] || custom[storageType] || []);
        const lsSection = lsArray.map(r => ({ ...r, type: storageType, sectionId: this.currentSection }));

        const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
        const hubSection = hubData[this.currentSection] || { playbooks: [], boxLinks: [], dashboards: [], custom: {} };
        const lsHubArray = (hubSection[storageType] || (hubSection.custom || {})[storageType] || []);
        const lsHub = lsHubArray.map(r => ({ ...r, type: storageType, sectionId: this.currentSection }));

        const lsResources = [...lsHub, ...lsSection];

        // Merge by id, prefer the most recently updated/created item
        const byId = new Map();
        const consider = (candidate) => {
            if (!candidate || candidate.id === undefined || candidate.id === null) return;
            const key = String(candidate.id);
            const existing = byId.get(key);
            if (!existing) {
                byId.set(key, candidate);
                return;
            }
            const tExisting = Date.parse(existing.updatedAt || existing.createdAt || 0) || 0;
            const tCandidate = Date.parse(candidate.updatedAt || candidate.createdAt || 0) || 0;
            byId.set(key, tCandidate >= tExisting ? candidate : existing);
        };
        lsResources.forEach(consider);
        dbResources.forEach(consider);
        return Array.from(byId.values());
    }

    // Local-only fast resource fetch (no DB calls)
    async getResourcesLocalOnly(type) {
        const storageType = this.mapToStorageType(type);
        const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[]}');
        const lsSection = (sectionData[storageType] || []).map(r => ({ ...r, type: storageType, sectionId: this.currentSection }));
        const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
        const hubSection = hubData[this.currentSection] || { playbooks: [], boxLinks: [], dashboards: [] };
        const lsHub = (hubSection[storageType] || []).map(r => ({ ...r, type: storageType, sectionId: this.currentSection }));
        const byId = new Map();
        [...lsHub, ...lsSection].forEach(r => {
            if (r && r.id !== undefined && r.id !== null) byId.set(String(r.id), r);
        });
        return Array.from(byId.values());
    }

    async getSectionData() {
        try {
            const section = window.hubDatabase && hubDatabase.getSection
                ? await this._safeDbFetch(hubDatabase.getSection(this.currentSection), 1500, null)
                : null;
            return section ? section.data : { playbooks: [], boxLinks: [], dashboards: [] };
        } catch (error) {
            console.error('Error loading section data:', error);
            return { playbooks: [], boxLinks: [], dashboards: [] };
        }
    }

    createResourceCard(resource, type) {
        const storageType = this.mapToStorageType(type);
        const label = storageType === 'playbooks' ? 'PLAYBOOK' : storageType === 'boxLinks' ? 'BOX LINK' : 'DASHBOARD';
        const iconClass = storageType === 'playbooks' ? 'fas fa-book' : storageType === 'boxLinks' ? 'fas fa-link' : 'fas fa-chart-bar';

        const canEdit = this.canEditResource() && (this.isAdmin() || this.isResourceOwner(resource));
        const canDelete = this.currentUser && this.currentUser.permissions.canDeleteResources && (this.isAdmin() || this.isResourceOwner(resource)) && this.canEditResource();

        return `
            <div class="resource-card" data-id="${resource.id}">
                <div class="resource-header">
                    <div>
                        <h3 class="resource-title">${this.escapeHtml(resource.title)}</h3>
                    </div>
                    <div class="resource-type">${label}</div>
                </div>
                
                ${resource.description ? `<p class="resource-description">${this.escapeHtml(resource.description)}</p>` : ''}
                
                <a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="resource-url">
                    <i class="${iconClass}"></i> ${this.escapeHtml(resource.url)}
                </a>
                
                <div class="resource-meta">
                    ${resource.tags && resource.tags.length > 0 ? `
                        <div class="resource-tags">
                            ${resource.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="resource-footer">
                    <span>Added: ${new Date(resource.createdAt).toLocaleDateString()}</span>
                    <div>
                        ${canEdit ? `
                            <button class="action-btn edit-btn" onclick="editResource('${type}', '${resource.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="action-btn delete-btn" onclick="deleteResource('${type}', '${resource.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Hook clicks to record usage
    bindResourceClickLogging() {
        document.body.addEventListener('click', async (e) => {
            const anchor = e.target.closest('a.resource-url');
            if (!anchor) return;
            const card = anchor.closest('.resource-card');
            if (!card) return;
            const resourceId = card.getAttribute('data-id');
            try {
                if (window.hubDatabase && hubDatabase.recordView) {
                    await hubDatabase.recordView(this.currentUser?.id || null, resourceId);
                }
                if (window.hubDatabase && hubDatabase.saveActivity && this.currentUser) {
                    await hubDatabase.saveActivity({
                        id: Date.now().toString(),
                        userId: this.currentUser.id,
                        username: this.currentUser.username,
                        action: 'VIEW_RESOURCE',
                        description: `Viewed resource ${resourceId} in section ${this.currentSection}`,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (_) {}
        });
    }

    getFilteredResources(resources) {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';

        return resources.filter(resource => {
            const title = (resource.title || '').toLowerCase();
            const description = (resource.description || '').toLowerCase();
            const url = (resource.url || '').toLowerCase();
            const matchesSearch = !searchTerm ||
                title.includes(searchTerm) ||
                description.includes(searchTerm) ||
                (resource.tags && resource.tags.some(tag => String(tag).toLowerCase().includes(searchTerm))) ||
                url.includes(searchTerm);

            const matchesCategory = !categoryFilter || resource.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }

    filterResources() {
        this.renderCurrentTab();
    }

    // Resource Management
    addResource(type) {
        if (!this.canEditResource()) {
            this.showMessage('You do not have permission to add resources', 'error');
            return;
        }

        const modal = this.createResourceModal(type);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    canEditResource() {
        if (!this.currentUser) return false;
        return this.currentUser.permissions.canEditAllSections || 
               this.currentUser.permissions.editableSections.includes(this.currentSection);
    }

    canDeleteResource() {
        if (!this.currentUser) return false;
        return this.currentUser.permissions.canDeleteResources && this.canEditResource();
    }

    isResourceOwner(resource) {
        if (!this.currentUser || !resource) return false;
        // Treat legacy resources without userId as editable by section editors
        const ownerId = resource.userId;
        if (ownerId === undefined || ownerId === null || ownerId === '' || ownerId === 0) return true;
        return String(ownerId) === String(this.currentUser.id || '');
    }

    isAdmin() {
        if (!this.currentUser) return false;
        return this.currentUser.role === 'admin' || this.currentUser.permissions.canEditAllSections === true;
    }
    
    createResourceModal(type) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New ${type.replace('-', ' ').toUpperCase()}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="resourceForm">
                    <div class="form-group">
                        <label for="resourceTitle">Title *</label>
                        <input type="text" id="resourceTitle" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="resourceDescription">Description</label>
                        <textarea id="resourceDescription" name="description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="resourceUrl">URL *</label>
                        <input type="text" id="resourceUrl" name="url" required>
                    </div>
                    <div class="form-group">
                        <label for="resourceCategory">Category</label>
                        <select id="resourceCategory" name="category">
                            <option value="process">Process</option>
                            <option value="procedure">Procedure</option>
                            <option value="guide">Guide</option>
                            <option value="template">Template</option>
                            <option value="checklist">Checklist</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="resourceTags">Tags (comma-separated)</label>
                        <input type="text" id="resourceTags" name="tags" placeholder="e.g., analysis, framework, financial">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Resource</button>
                    </div>
                </form>
            </div>
        `;

        // Handle form submission
        const form = modal.querySelector('#resourceForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const success = await this.saveResource(type, form);
            if (success) {
                modal.remove();
            }
        });

        return modal;
    }

    async saveResource(type, form) {
        const formData = new FormData(form);
        const resource = {
            id: this.generateResourceId(this.mapToStorageType(type)),
            title: String(formData.get('title') || '').trim(),
            description: formData.get('description') || '',
            url: this.normalizeUrl(formData.get('url')),
            category: formData.get('category'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            createdAt: new Date().toISOString(),
            userId: this.currentUser?.id || 0
        };

        // Validate URL
        if (!this.isValidUrl(resource.url)) {
            this.showMessage('Please enter a valid URL', 'error');
            return false;
        }

        await this.addResourceToSection(type, resource);
        // Log content creation
        try { this.logContentActivity('created', this.mapToStorageType(type), resource.title); } catch(_) {}
        this.renderCurrentTab();
        this.showMessage(`${type.replace('-', ' ')} added successfully!`, 'success');
        return true;
    }

    async addResourceToSection(type, resource) {
        try {
            const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[],"custom":{}}');
            const resourceType = this.mapToStorageType(type);
            if (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards') {
                if (!sectionData[resourceType]) sectionData[resourceType] = [];
                sectionData[resourceType].push(resource);
            } else {
                if (!sectionData.custom) sectionData.custom = {};
                if (!sectionData.custom[resourceType]) sectionData.custom[resourceType] = [];
                sectionData.custom[resourceType].push(resource);
            }
            localStorage.setItem(`section_${this.currentSection}`, JSON.stringify(sectionData));
            // Signal hub to refresh
            this._notifyHub({ type: 'RESOURCE_CHANGE', action: 'create', resourceType });

            // Compatibility hubData
            const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
            if (!hubData[this.currentSection]) {
                hubData[this.currentSection] = { playbooks: [], boxLinks: [], dashboards: [], custom: {} };
            }
            if (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards') {
                if (!hubData[this.currentSection][resourceType]) hubData[this.currentSection][resourceType] = [];
                hubData[this.currentSection][resourceType].push(resource);
            } else {
                if (!hubData[this.currentSection].custom) hubData[this.currentSection].custom = {};
                if (!hubData[this.currentSection].custom[resourceType]) hubData[this.currentSection].custom[resourceType] = [];
                hubData[this.currentSection].custom[resourceType].push(resource);
            }
            localStorage.setItem('informationHub', JSON.stringify(hubData));
            this._notifyHub({ type: 'RESOURCE_CHANGE', action: 'create', resourceType });

            if (window.hubDatabase && hubDatabase.saveResource &&
                (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards')) {
                this._safeDbCall(hubDatabase.saveResource({
                    ...resource,
                    sectionId: this.currentSection,
                    type: resourceType,
                    userId: this.currentUser?.id || 0
                }));
            }
            console.log('Resource saved successfully');
        } catch (error) {
            console.error('Error saving resource:', error);
            this.showMessage('Error saving resource', 'error');
        }
    }

    async editResource(type, id) {
        if (!this.canEditResource()) {
            this.showMessage('You do not have permission to edit resources', 'error');
            return;
        }

        // Use merged source (DB + local) so DB-only items are editable
        const resources = await this.getResources(type);
        const resource = resources.find(r => String(r.id) === String(id));
        if (!resource) return;

        if (!this.isAdmin() && !this.isResourceOwner(resource)) {
            this.showMessage('You can only edit resources assigned to you', 'error');
            return;
        }

        const modal = this.createEditModal(type, resource);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createEditModal(type, resource) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        const tagsString = Array.isArray(resource.tags) ? resource.tags.join(', ') : '';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit ${type.replace('-', ' ').toUpperCase()}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="editResourceForm">
                    <input type="hidden" name="__origId" value="${this.escapeHtml(resource.id || '')}">
                    <input type="hidden" name="__origTitle" value="${this.escapeHtml(resource.title || '')}">
                    <input type="hidden" name="__origUrl" value="${this.escapeHtml(resource.url || '')}">
                    <div class="form-group">
                        <label for="editResourceTitle">Title *</label>
                        <input type="text" id="editResourceTitle" name="title" value="${this.escapeHtml(resource.title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="editResourceDescription">Description</label>
                        <textarea id="editResourceDescription" name="description" rows="3">${this.escapeHtml(resource.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editResourceUrl">URL *</label>
                        <input type="text" id="editResourceUrl" name="url" value="${this.escapeHtml(resource.url || '')}" required>
                    </div>
                    <div class="form-group">
                        <label for="editResourceCategory">Category</label>
                        <select id="editResourceCategory" name="category">
                            <option value="process" ${resource.category === 'process' ? 'selected' : ''}>Process</option>
                            <option value="procedure" ${resource.category === 'procedure' ? 'selected' : ''}>Procedure</option>
                            <option value="guide" ${resource.category === 'guide' ? 'selected' : ''}>Guide</option>
                            <option value="template" ${resource.category === 'template' ? 'selected' : ''}>Template</option>
                            <option value="checklist" ${resource.category === 'checklist' ? 'selected' : ''}>Checklist</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editResourceTags">Tags (comma-separated)</label>
                        <input type="text" id="editResourceTags" name="tags" value="${this.escapeHtml(tagsString)}" placeholder="e.g., analysis, framework, financial">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary" onclick="(function(btn){var f=btn.closest('form'); if(!f) return; if(typeof f.requestSubmit==='function'){ f.requestSubmit(); } else { f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); }})(this)">Update Resource</button>
                    </div>
                </form>
            </div>
        `;

        // Handle form submission
        const form = modal.querySelector('#editResourceForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const cancelBtn = form.querySelector('.btn.btn-secondary');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Updating...'; }
            if (cancelBtn) cancelBtn.disabled = true;
            let finished = false;
            const reenable = () => {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update Resource'; }
                if (cancelBtn) cancelBtn.disabled = false;
            };
            const fallback = setTimeout(() => {
                if (!finished) {
                    reenable();
                    this.showMessage('Update is taking longer than expected. Please try again.', 'error');
                }
            }, 2500);
            try {
                const success = await this.updateResource(type, resource.id, form).catch(err => { this.showMessage(`Update failed: ${err?.message || err}`, 'error'); return false; });
                finished = true;
                clearTimeout(fallback);
                reenable();
                if (success) {
                    try {
                        const hdr = modal.querySelector('.modal-header h2');
                        if (hdr) {
                            const note = document.createElement('span');
                            note.style.fontSize = '0.9rem';
                            note.style.marginLeft = '10px';
                            note.textContent = '✓ Saved';
                            hdr.appendChild(note);
                        }
                    } catch (_) {}
                    setTimeout(() => modal.remove(), 400);
                }
            } finally {
                // Ensure buttons are restored in any case
                if (!finished) {
                    clearTimeout(fallback);
                    reenable();
                }
            }
        });

        return modal;
    }

    async updateResource(type, id, form) {
        const formData = new FormData(form);
        const existingResources = await this.getResourcesLocalOnly(type);
        // Prefer hidden original fields to avoid id mismatch
        const origId = formData.get('__origId');
        const origTitle = String(formData.get('__origTitle') || '');
        const origUrl = String(formData.get('__origUrl') || '');
        let original = existingResources.find(r => String(r.id) === String(origId)) || {};
        if (!original || !original.id) {
            original = existingResources.find(r => `${r.title || ''}|${r.url || ''}` === `${origTitle}|${origUrl}`) || {};
        }
        const updatedResource = {
            id: original.id || id || this.generateResourceId(this.mapToStorageType(type)),
            title: String(formData.get('title') || '').trim(),
            description: formData.get('description') || '',
            url: this.normalizeUrl(formData.get('url')),
            category: formData.get('category'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            createdAt: original.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: original.userId || this.currentUser?.id || 0
        };

        // Validate URL
        if (!this.isValidUrl(updatedResource.url)) {
            this.showMessage('Please enter a valid URL', 'error');
            return false;
        }

        await this.updateResourceInSection(type, id, updatedResource, original);
        // Log content update
        try { this.logContentActivity('updated', this.mapToStorageType(type), updatedResource.title); } catch(_) {}
        this.renderCurrentTab();
        this.showMessage(`${type.replace('-', ' ')} updated successfully!`, 'success');
        return true;
    }

    // Generate stable unique IDs for resources in this section: sectionId:type:time:random
    generateResourceId(storageType) {
        try {
            const ts = Date.now().toString(36);
            let rand = '';
            try {
                const arr = new Uint32Array(2);
                (window.crypto || window.msCrypto).getRandomValues(arr);
                rand = Array.from(arr).map(n => n.toString(36)).join('');
            } catch (_) {
                rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
            }
            const type = storageType || 'resource';
            return `${this.currentSection}:${type}:${ts}:${rand}`;
        } catch (_) {
            return `${this.currentSection}:${storageType || 'resource'}:${Date.now()}`;
        }
    }

    // Assign missing IDs to legacy resources in this section across local stores and DB (best-effort)
    async ensureResourceIdsForCurrentSection() {
        const sectionId = this.currentSection;
        const types = ['playbooks', 'boxLinks', 'dashboards'];
        try {
            // Per-section store
            let sectionData = {};
            try { sectionData = JSON.parse(localStorage.getItem(`section_${sectionId}`) || '{}'); } catch(_) { sectionData = {}; }
            let changed = false;
            for (const t of types) {
                const arr = Array.isArray(sectionData[t]) ? sectionData[t] : [];
                for (const r of arr) {
                    if (r.id === undefined || r.id === null || r.id === '') {
                        r.id = this.generateResourceId(t);
                        changed = true;
                        try { if (window.hubDatabase && hubDatabase.saveResource) hubDatabase.saveResource({ ...r, sectionId, type: t, userId: r.userId || this.currentUser?.id || 0 }); } catch(_) {}
                    }
                }
                sectionData[t] = arr;
            }
            if (changed) {
                localStorage.setItem(`section_${sectionId}`, JSON.stringify(sectionData));
            }
        } catch(_) {}

        try {
            // informationHub store
            let hub = {};
            try { hub = JSON.parse(localStorage.getItem('informationHub') || '{}'); } catch(_) { hub = {}; }
            hub[sectionId] = hub[sectionId] || { playbooks: [], boxLinks: [], dashboards: [], custom: {} };
            let changedHub = false;
            for (const t of types) {
                const arr = Array.isArray(hub[sectionId][t]) ? hub[sectionId][t] : [];
                for (const r of arr) {
                    if (r.id === undefined || r.id === null || r.id === '') {
                        r.id = this.generateResourceId(t);
                        changedHub = true;
                        try { if (window.hubDatabase && hubDatabase.saveResource) hubDatabase.saveResource({ ...r, sectionId, type: t, userId: r.userId || this.currentUser?.id || 0 }); } catch(_) {}
                    }
                }
                hub[sectionId][t] = arr;
            }
            if (changedHub) {
                localStorage.setItem('informationHub', JSON.stringify(hub));
            }
        } catch(_) {}
    }

    async updateResourceInSection(type, id, updatedResource, original) {
        try {
            const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[],"custom":{}}');
            const resourceType = this.mapToStorageType(type);

            const updateInArray = (arr) => {
                if (!arr) return;
                const matchById = (r) => String(r.id) === String(id);
                let index = arr.findIndex(matchById);
                if (index === -1 && original) {
                    const origKey = `${original.title || ''}|${original.url || ''}`;
                    index = arr.findIndex(r => `${r.title || ''}|${r.url || ''}` === origKey);
                }
                if (index !== -1) arr[index] = updatedResource; else arr.push(updatedResource);
            };

            if (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards') {
                updateInArray(sectionData[resourceType]);
            } else {
                if (!sectionData.custom) sectionData.custom = {};
                if (!sectionData.custom[resourceType]) sectionData.custom[resourceType] = [];
                updateInArray(sectionData.custom[resourceType]);
            }
            localStorage.setItem(`section_${this.currentSection}`, JSON.stringify(sectionData));
            this._notifyHub({ type: 'RESOURCE_CHANGE', action: 'update', resourceType });

            const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
            if (!hubData[this.currentSection]) {
                hubData[this.currentSection] = { playbooks: [], boxLinks: [], dashboards: [], custom: {} };
            }
            const updateHubArray = (arr) => {
                if (!arr) return;
                const matchByIdHub = (r) => String(r.id) === String(id);
                let hubIndex = arr.findIndex(matchByIdHub);
                if (hubIndex === -1 && original) {
                    const origKey = `${original.title || ''}|${original.url || ''}`;
                    hubIndex = arr.findIndex(r => `${r.title || ''}|${r.url || ''}` === origKey);
                }
                if (hubIndex !== -1) arr[hubIndex] = updatedResource; else arr.push(updatedResource);
            };
            if (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards') {
                if (!hubData[this.currentSection][resourceType]) hubData[this.currentSection][resourceType] = [];
                updateHubArray(hubData[this.currentSection][resourceType]);
            } else {
                if (!hubData[this.currentSection].custom) hubData[this.currentSection].custom = {};
                if (!hubData[this.currentSection].custom[resourceType]) hubData[this.currentSection].custom[resourceType] = [];
                updateHubArray(hubData[this.currentSection].custom[resourceType]);
            }
            localStorage.setItem('informationHub', JSON.stringify(hubData));
            this._notifyHub({ type: 'RESOURCE_CHANGE', action: 'update', resourceType });

            if (window.hubDatabase && hubDatabase.saveResource &&
                (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards')) {
                this._safeDbCall(hubDatabase.saveResource({
                    ...updatedResource,
                    sectionId: this.currentSection,
                    type: resourceType,
                    userId: this.currentUser?.id || 0
                }));
            }

            console.log('Resource updated successfully');
        } catch (error) {
            console.error('Error updating resource:', error);
            this.showMessage('Error updating resource', 'error');
        }
    }

    async deleteResource(type, id) {
        if (!this.canDeleteResource()) {
            this.showMessage('You do not have permission to delete resources', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this resource?')) return;

        const resources = await this.getResources(type);
        const resource = resources.find(r => String(r.id) === String(id));
        if (!this.isAdmin() && !this.isResourceOwner(resource)) {
            this.showMessage('You can only delete resources assigned to you', 'error');
            return;
        }

        await this.removeResourceFromSection(type, id);
        // Log content deletion (use original resource title if available)
        try { this.logContentActivity('deleted', this.mapToStorageType(type), resource?.title || ''); } catch(_) {}
        this.renderCurrentTab();
        this.showMessage(`${type.replace('-', ' ')} deleted successfully!`, 'success');
    }

    async removeResourceFromSection(type, id) {
        try {
            const sectionData = JSON.parse(localStorage.getItem(`section_${this.currentSection}`) || '{"playbooks":[],"boxLinks":[],"dashboards":[],"custom":{}}');
            const resourceType = this.mapToStorageType(type);

            const removeFromArray = (arr) => {
                if (!arr) return;
                return arr.filter(r => String(r.id) !== String(id));
            };

            if (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards') {
                sectionData[resourceType] = removeFromArray(sectionData[resourceType]);
            } else {
                if (!sectionData.custom) sectionData.custom = {};
                sectionData.custom[resourceType] = removeFromArray(sectionData.custom[resourceType] || []);
            }
            localStorage.setItem(`section_${this.currentSection}`, JSON.stringify(sectionData));
            this._notifyHub({ type: 'RESOURCE_CHANGE', action: 'delete', resourceType });

            const hubData = JSON.parse(localStorage.getItem('informationHub') || '{}');
            if (!hubData[this.currentSection]) {
                hubData[this.currentSection] = { playbooks: [], boxLinks: [], dashboards: [], custom: {} };
            }
            if (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards') {
                hubData[this.currentSection][resourceType] = removeFromArray(hubData[this.currentSection][resourceType]);
            } else {
                if (!hubData[this.currentSection].custom) hubData[this.currentSection].custom = {};
                hubData[this.currentSection].custom[resourceType] = removeFromArray(hubData[this.currentSection].custom[resourceType] || []);
            }
            localStorage.setItem('informationHub', JSON.stringify(hubData));
            this._notifyHub({ type: 'RESOURCE_CHANGE', action: 'delete', resourceType });

            if (window.hubDatabase && hubDatabase.deleteResource &&
                (resourceType === 'playbooks' || resourceType === 'boxLinks' || resourceType === 'dashboards')) {
                await hubDatabase.deleteResource(id);
            }

            console.log('Resource deleted successfully');
        } catch (error) {
            console.error('Error deleting resource:', error);
            this.showMessage('Error deleting resource', 'error');
        }
    }

    // Utility Functions
    mapToStorageType(type) {
        const raw = String(type || '').toLowerCase();
        // For default known types
        if (raw.includes('playbook')) return 'playbooks';
        if (raw.includes('box')) return 'boxLinks';
        if (raw.includes('dash')) return 'dashboards';
        if (raw === 'playbooks' || raw === 'boxlinks' || raw === 'dashboards') {
            if (raw === 'boxlinks') return 'boxLinks';
            return raw;
        }
        // For custom types, store using the id as-is under a generic bucket
        return raw;
    }
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Insert at the top of the container
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    goBackToHub() {
        // Signal hub to refresh stats immediately on return
        this._notifyHub({ type: 'NAV_BACK' });
        const go = () => { window.location.href = 'index.html'; };
        try {
            if (document.startViewTransition) {
                document.startViewTransition(() => go());
            } else {
                const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (!prefersReduced) {
                    document.body.classList.add('fade-out');
                    setTimeout(go, 150);
                } else {
                    go();
                }
            }
        } catch (_) { go(); }
    }

    loadSectionConfig() {
        try {
            const key = `section_config_${this.currentSection}`;
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        // Default config matching existing tabs/categories
        return {
            types: [
                { id: 'playbooks', name: 'Playbooks', icon: 'fas fa-book' },
                { id: 'box-links', name: 'Box Links', icon: 'fas fa-link' },
                { id: 'dashboards', name: 'Dashboards', icon: 'fas fa-chart-bar' }
            ],
            categories: ['process','procedure','guide','template','checklist']
        };
    }

    saveSectionConfig(cfg) {
        try {
            const key = `section_config_${this.currentSection}`;
            localStorage.setItem(key, JSON.stringify(cfg));
            this.sectionConfig = cfg;
            this._notifyHub({ type: 'SECTION_CUSTOMIZE' });
        } catch (_) {}
    }

    renderDynamicUI() {
        // Customize button visibility
        const customizeBtn = document.getElementById('customizeBtn');
        if (customizeBtn) {
            customizeBtn.style.display = this.isAdmin() ? 'inline-flex' : 'none';
        }
        // Render tabs
        const tabs = document.getElementById('navTabs');
        if (tabs) {
            tabs.innerHTML = this.sectionConfig.types.map((t, idx) => {
                const active = (idx === 0 ? 'active' : '');
                return `<div class="nav-tab ${active}" onclick="switchTab('${t.id}')">
                    <i class="${this.normalizeIconClass(t.icon || '')}"></i> ${this.escapeHtml(t.name || t.id)}
                </div>`;
            }).join('');
            // set default current tab to first type id
            if (this.sectionConfig.types[0]) {
                this.currentTab = this.sectionConfig.types[0].id;
            }
        }
        // Render category filter
        const catSel = document.getElementById('categoryFilter');
        if (catSel) {
            const options = ['<option value="">All Categories</option>'].concat(
                (this.sectionConfig.categories || []).map(c => `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c.charAt(0).toUpperCase()+c.slice(1))}</option>`) 
            );
            catSel.innerHTML = options.join('');
        }
        // Render content sections containers
        const wrap = document.getElementById('dynamic-sections');
        if (wrap) {
            wrap.innerHTML = this.sectionConfig.types.map((t, idx) => {
                const active = (idx === 0 ? 'active' : '');
                return `<div class="content-section ${active}" id="${t.id}-section">
                    <button class="add-resource-btn" onclick="addResource('${t.id}')" style="display: none;">
                        <i class="fas fa-plus"></i> Add ${this.escapeHtml(t.name || t.id)}
                    </button>
                    <div class="resource-grid" id="${t.id}-grid"></div>
                </div>`;
            }).join('');
        }
    }

    openCustomizeModal() {
        if (!this.isAdmin()) {
            this.showMessage('You do not have permission to customize', 'error');
            return;
        }
        const cfg = this.sectionConfig;
        const modal = document.createElement('div');
        modal.className = 'modal';
        const typesJson = this.escapeHtml(JSON.stringify(cfg.types, null, 2));
        const cats = this.escapeHtml((cfg.categories || []).join(', '));
        modal.innerHTML = `
            <div class="modal-content" style="max-width:720px;">
                <div class="modal-header">
                    <h2>Customize Section</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p style="margin:8px 0 6px 0;">Resource Types (JSON array of { id, name, icon }):</p>
                    <textarea id="cfgTypes" rows="10" style="width:100%; font-family:monospace;">${typesJson}</textarea>
                    <p style="margin:12px 0 6px 0;">Categories (comma-separated):</p>
                    <input id="cfgCats" type="text" style="width:100%;" value="${cats}" />
                </div>
                <div class="form-actions" style="padding:12px 16px 18px 16px;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveCfgBtn">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
        modal.querySelector('#saveCfgBtn').addEventListener('click', () => {
            try {
                const types = JSON.parse(modal.querySelector('#cfgTypes').value || '[]');
                const catsRaw = modal.querySelector('#cfgCats').value || '';
                const categories = catsRaw.split(',').map(s => s.trim()).filter(Boolean);
                if (!Array.isArray(types) || types.length === 0) {
                    this.showMessage('Provide at least one type', 'error');
                    return;
                }
                const validTypes = types.map(t => ({ id: String(t.id || '').trim() || 'type', name: String(t.name || t.id || 'Type').trim(), icon: String(t.icon || '').trim() }));
                const cfgNew = { types: validTypes, categories };
                this.saveSectionConfig(cfgNew);
                this.renderDynamicUI();
                this.renderCurrentTab();
                this.showMessage('Section customized', 'success');
                modal.remove();
            } catch (e) {
                this.showMessage('Invalid JSON for types', 'error');
            }
        });
    }

    _notifyHub(message) {
        try {
            if (this._bc) {
                this._bc.postMessage({
                    source: 'section',
                    sectionId: this.currentSection,
                    timestamp: Date.now(),
                    ...message
                });
            }
        } catch (_) {}
        // Fallback flag so hub can pick it up even without BroadcastChannel
        try { localStorage.setItem('refreshHubNow', '1'); } catch(_) {}
        try { localStorage.setItem('hubLastChange', String(Date.now())); } catch(_) {}
    }
}

// Initialize section manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SectionManager();
});
