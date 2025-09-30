// Excel Export Utility for Information Hub
class ExcelExporter {
    constructor() {
        this.workbook = null;
        this._xlsxReady = false;
    }

    _buildLocalSnapshot() {
        try {
            const users = JSON.parse(localStorage.getItem('hubUsers') || '[]');
            const activities = JSON.parse(localStorage.getItem('hubActivities') || '[]');
            let views = [];
            try { views = JSON.parse(localStorage.getItem('views') || '[]'); } catch (_) { views = []; }
            const hub = JSON.parse(localStorage.getItem('informationHub') || '{}');
            // Derive section names from sectionOrder if available
            let sectionOrder = [];
            try { sectionOrder = JSON.parse(localStorage.getItem('sectionOrder') || '[]'); } catch (_) { sectionOrder = []; }
            const nameById = {};
            (sectionOrder || []).forEach(s => { if (s && s.id) nameById[s.id] = s.name || s.id; });

            const sections = Object.entries(hub).map(([sid, s]) => ({ sectionId: sid, id: sid, name: s?.name || nameById[sid] || sid, icon: s?.icon || '', color: s?.color || '' }));
            const resources = [];
            // Newer structure
            Object.entries(hub).forEach(([sid, s]) => {
                ['playbooks','boxLinks','dashboards'].forEach(type => (s?.[type] || []).forEach(r => resources.push({ ...r, sectionId: sid, type })));
                // Include any custom types stored under other keys
                Object.keys(s || {}).forEach(k => {
                    if (k === 'updatedAt' || k === 'playbooks' || k === 'boxLinks' || k === 'dashboards' || k === 'name' || k === 'icon' || k === 'color') return;
                    (s[k] || []).forEach(r => resources.push({ ...r, sectionId: sid, type: k }));
                });
            });
            // Legacy per-section keys: section_<id>
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key || !/^section_/i.test(key)) continue;
                    const sid = key.replace(/^section_/i, '');
                    try {
                        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
                        ['playbooks','boxLinks','dashboards'].forEach(type => (parsed?.[type] || []).forEach(r => resources.push({ ...r, sectionId: sid, type })));
                        const nm = nameById[sid] || (parsed && parsed.name) || sid;
                        if (!sections.find(s => String(s.sectionId) === String(sid))) {
                            sections.push({ sectionId: sid, id: sid, name: nm, icon: parsed?.icon || '', color: parsed?.color || '' });
                        }
                    } catch (_) {}
                }
            } catch (_) {}
            return {
                users,
                sections,
                resources,
                activities,
                views,
                exportDate: new Date().toISOString(),
                source: 'localStorage',
                totalRecords: {
                    users: users.length,
                    sections: sections.length,
                    resources: resources.length,
                    activities: activities.length,
                    views: views.length
                }
            };
        } catch (_) {
            return { users: [], sections: [], resources: [], activities: [], views: [], exportDate: new Date().toISOString(), source: 'none', totalRecords: { users: 0, sections: 0, resources: 0, activities: 0, views: 0 } };
        }
    }

    async _waitForDbReady(maxMs = 10000) {
        try {
            const started = Date.now();
            while (Date.now() - started < maxMs) {
                if (window.hubDatabase && window.hubDatabaseReady) return true;
                await new Promise(r => setTimeout(r, 100));
            }
        } catch (_) {}
        return !!(window.hubDatabase && window.hubDatabaseReady);
    }

    _downloadTextFile(fileName, content, mime = 'application/json') {
        try {
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (_) { return false; }
    }

    async ensureXlsxLoaded() {
        if (this._xlsxReady && typeof XLSX !== 'undefined') return;
        if (typeof XLSX === 'undefined') {
            const sources = [
                'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
                'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
            ];
            const loadWithTimeout = (src, timeoutMs = 6000) => new Promise((resolve, reject) => {
                try {
                    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
                    const script = document.createElement('script');
                    script.src = src;
                    script.async = true;
                    script.onload = () => { clearTimeout(timer); resolve(); };
                    script.onerror = () => { clearTimeout(timer); reject(new Error('failed')); };
                    document.head.appendChild(script);
                } catch (e) { reject(e); }
            });
            let loaded = false;
            for (const src of sources) {
                try {
                    await loadWithTimeout(src);
                    if (typeof XLSX !== 'undefined') { loaded = true; break; }
                } catch (_) { /* try next */ }
            }
            if (!loaded) throw new Error('Failed to load XLSX library. Check your internet connection.');
        }
        this._xlsxReady = true;
    }

    // Create Excel file (Supabase only for data; no GitHub/local fallbacks)
    async exportToExcel() {
        try {
            // 1) Try to load XLSX; if it fails, produce a JSON export instead
            try {
                await this.ensureXlsxLoaded();
            } catch (e) {
                // XLSX unavailable: fallback to JSON built from Supabase only
                await this._waitForDbReady(4000);
                if (!(window.hubDatabase && window.hubDatabaseReady && typeof hubDatabase.exportAllData === 'function')) {
                    throw new Error('Database unavailable for export');
                }
                const payload = await hubDatabase.exportAllData();
                payload.source = 'database';
                const jsonName = `Information_Hub_Export_${new Date().toISOString().split('T')[0]}.json`;
                this._downloadTextFile(jsonName, JSON.stringify(payload, null, 2));
                return { success: true, fileName: jsonName, fallback: 'json' };
            }

            // 2) Supabase DB data only
            let data = null;
            try {
                await this._waitForDbReady(10000);
                await this._waitForDbReady(10000);
                if (window.hubDatabase && window.hubDatabaseReady && typeof hubDatabase.exportAllData === 'function') {
                    const db = await hubDatabase.exportAllData();
                    const sectionsNorm = (db.sections || []).map(s => {
                        const id = String(s.section_id || s.sectionId || s.id || '').trim();
                        return { sectionId: id, id, name: s.name || id, icon: s.icon || '', color: s.color || '', data: { playbooks: [], boxLinks: [], dashboards: [] } };
                    });
                    const resourcesNorm = (db.resources || []).map(r => ({ ...r, sectionId: r.sectionId || r.section_id }));
                    const countsBySection = new Map();
                    resourcesNorm.forEach(r => {
                        const sid = String(r.sectionId || '');
                        if (!countsBySection.has(sid)) countsBySection.set(sid, { playbooks: 0, boxLinks: 0, dashboards: 0 });
                        const c = countsBySection.get(sid);
                        if (r.type === 'playbooks') c.playbooks++;
                        else if (r.type === 'boxLinks') c.boxLinks++;
                        else if (r.type === 'dashboards') c.dashboards++;
                    });
                    sectionsNorm.forEach(s => { const c = countsBySection.get(String(s.sectionId)) || { playbooks: 0, boxLinks: 0, dashboards: 0 }; s.data = { ...s.data, ...c }; });
                    data = {
                        users: (db.users || []).map(u => this._normalizePermissions(u)),
                        sections: sectionsNorm,
                        resources: resourcesNorm,
                        activities: db.activities || [],
                        views: db.views || [],
                        exportDate: db.exportDate || new Date().toISOString(),
                        source: 'database',
                        totalRecords: db.totalRecords || {
                            users: (db.users || []).length,
                            sections: sectionsNorm.length,
                            resources: resourcesNorm.length,
                            activities: (db.activities || []).length,
                            views: (db.views || []).length
                        }
                    };
                }
            } catch (_) {}
            // If DB unavailable or empty, stop (no fallbacks by design)
            if (!data) throw new Error('Database unavailable for export');

            this.workbook = XLSX.utils.book_new();

            // Export Users
            this.exportUsers(data.users);
            this.exportUserAccess(data.users, data.sections);

            // Export Sections
            this.exportSections(data.sections);

            // Export Resources (use section names)
            this.exportResources(data.resources, data.sections);

            // Export Activities
            this.exportActivities(data.activities);

            // Skip exporting Views to avoid RLS/empty data delays

            // Export Usage summaries
            this.exportUsageSummary(data);

            // Export Summary
            this.exportSummary(data);

            // Generate and download file
            const fileName = `Information_Hub_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(this.workbook, fileName);

            return {
                success: true,
                fileName: fileName,
                totalRecords: data.totalRecords
            };
        } catch (error) {
            console.error('Excel export failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    exportUsers(users) {
        const userData = (users || []).map(user => ({
            'ID': user.id,
            'Username': user.username,
            'Name': user.name || '',
            'Email': user.email || '',
            'Role': user.role,
            'Can Manage Users': user.permissions?.canManageUsers ? 'Yes' : 'No',
            'Can Edit All Sections': user.permissions?.canEditAllSections ? 'Yes' : 'No',
            'Can Delete Resources': user.permissions?.canDeleteResources ? 'Yes' : 'No',
            'Can View Audit Log': user.permissions?.canViewAuditLog ? 'Yes' : 'No',
            'Can Manage Roles': user.permissions?.canManageRoles ? 'Yes' : 'No',
            'Accessible Sections': (user.permissions?.sections || []).join(', '),
            'Editable Sections': (user.permissions?.editableSections || []).join(', '),
            'Created At': user.createdAt ? new Date(user.createdAt).toLocaleString() : ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(userData);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Users');
    }

    exportSections(sections) {
        const byId = {};
        (sections || []).forEach(s => { byId[String(s.sectionId || s.id || '')] = s; });
        const sectionData = (sections || []).map(section => ({
            'Section ID': section.sectionId || section.id,
            'Name': section.name,
            'Icon': section.icon,
            'Color': section.color,
            'Playbooks Count': section.data?.playbooks ? section.data.playbooks.length : 0,
            'Box Links Count': section.data?.boxLinks ? section.data.boxLinks.length : 0,
            'Dashboards Count': section.data?.dashboards ? section.data.dashboards.length : 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(sectionData);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Sections');
    }

    exportResources(resources, sections) {
        const nameById = {};
        (sections || []).forEach(s => { const id = String(s.sectionId || s.id || ''); if (id) nameById[id] = s.name || id; });
        const resourceData = (resources || []).map(resource => ({
            'ID': resource.id,
            'Title': resource.title,
            'Description': resource.description || '',
            'URL': resource.url,
            'Type': resource.type,
            'Section': nameById[String(resource.sectionId || '')] || String(resource.sectionId || ''),
            'Category': resource.category || '',
            'Tags': resource.tags ? resource.tags.join(', ') : '',
            'Created By': resource.userId,
            'Created At': resource.createdAt ? new Date(resource.createdAt).toLocaleString() : '',
            'Updated At': resource.updatedAt ? new Date(resource.updatedAt).toLocaleString() : ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(resourceData);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Resources');
    }

    exportUserAccess(users, sections) {
        try {
            const nameById = {};
            (sections || []).forEach(s => { const id = String(s.sectionId || s.id || ''); if (id) nameById[id] = s.name || id; });
            // Build canonical section id set: sections + any in users' permissions
            const idSet = new Set();
            (sections || []).forEach(s => { const id = s.sectionId || s.id; if (id) idSet.add(id); });
            (users || []).forEach(u => {
                (u.permissions?.sections || []).forEach(id => id && idSet.add(id));
                (u.permissions?.editableSections || []).forEach(id => id && idSet.add(id));
            });
            const sectionIds = Array.from(idSet);
            if (sectionIds.length === 0 || users.length === 0) return;
            const rows = [];
            users.forEach(user => {
                const perms = user.permissions || {};
                const canEditAll = !!perms.canEditAllSections;
                const editable = new Set(perms.editableSections || []);
                const viewable = new Set(perms.sections || []);
                sectionIds.forEach(sectionId => {
                    const canView = canEditAll || viewable.has(sectionId) ? 'Yes' : 'No';
                    const canEdit = canEditAll || editable.has(sectionId) ? 'Yes' : 'No';
                    const canDelete = perms.canDeleteResources ? 'Yes' : 'No';
                    rows.push({
                        'User ID': user.id,
                        'Username': user.username,
                        'Role': user.role,
                        'Section ID': sectionId,
                        'Section Name': nameById[String(sectionId)] || String(sectionId),
                        'Can View': canView,
                        'Can Edit': canEdit,
                        'Can Delete': canDelete
                    });
                });
            });
            if (rows.length > 0) {
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(this.workbook, ws, 'User Access');
            }
        } catch (e) {
            console.warn('exportUserAccess skipped:', e);
        }
    }

    exportViews(views) {
        if (!views || views.length === 0) return;
        const viewData = views.map(v => ({
            'User ID': v.userId,
            'Resource ID': v.resourceId,
            'Count': v.count,
            'First Viewed At': v.firstViewedAt ? new Date(v.firstViewedAt).toLocaleString() : '',
            'Last Viewed At': v.lastViewedAt ? new Date(v.lastViewedAt).toLocaleString() : ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(viewData);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Views');
    }

    exportUsageSummary(data) {
        try {
            const activities = data.activities || [];
            const usersById = {};
            (data.users || []).forEach(u => { usersById[u.id] = u; });
            const nameById = {};
            (data.sections || []).forEach(s => { const id = String(s.sectionId || s.id || ''); if (id) nameById[id] = s.name || id; });

            // 1) Duration events (derived from CLOSE_* descriptions)
            const durationRows = activities
                .filter(a => a && (a.action === 'CLOSE_SECTION' || a.action === 'CLOSE_HUB'))
                .map(a => {
                    const match = (a.description || '').match(/(\d+)s\b/);
                    const seconds = match ? parseInt(match[1], 10) : '';
                    const sectionMatch = (a.description || '').match(/section\s+([\w-]+)/i);
                    const sectionId = a.action === 'CLOSE_SECTION' && sectionMatch ? sectionMatch[1] : '';
                    const sectionName = sectionId ? (nameById[String(sectionId)] || sectionId) : '';
                    return {
                        'User ID': a.userId,
                        'Username': a.username || (usersById[a.userId]?.username || ''),
                        'Action': a.action,
                        'Section': sectionName,
                        'Duration (s)': seconds,
                        'Timestamp': a.timestamp ? new Date(a.timestamp).toLocaleString() : ''
                    };
                });
            if (durationRows.length > 0) {
                const wsDur = XLSX.utils.json_to_sheet(durationRows);
                XLSX.utils.book_append_sheet(this.workbook, wsDur, 'Usage Duration');
            }

            // 2) Action counts per user
            const counts = new Map(); // key: userId|action -> count
            activities.forEach(a => {
                if (!a || !a.userId || !a.action) return;
                const key = `${a.userId}|${a.action}`;
                counts.set(key, (counts.get(key) || 0) + 1);
            });
            const countRows = Array.from(counts.entries()).map(([key, count]) => {
                const [userIdStr, action] = key.split('|');
                const userId = isNaN(parseInt(userIdStr, 10)) ? userIdStr : parseInt(userIdStr, 10);
                const user = usersById[userId];
                return {
                    'User ID': userId,
                    'Username': user?.username || '',
                    'Action': action,
                    'Count': count
                };
            }).sort((a, b) => String(a.Username).localeCompare(String(b.Username)) || String(a.Action).localeCompare(String(b.Action)));
            if (countRows.length > 0) {
                const wsCounts = XLSX.utils.json_to_sheet(countRows);
                XLSX.utils.book_append_sheet(this.workbook, wsCounts, 'Usage Action Counts');
            }

            // 3) Views joined with resource info (user-friendly)
            const resourcesById = {};
            (data.resources || []).forEach(r => { resourcesById[r.id] = r; });
            const prettyViews = (data.views || []).map(v => {
                const res = resourcesById[v.resourceId] || {};
                const sectionName = res.sectionId ? (nameById[String(res.sectionId)] || res.sectionId) : '';
                return {
                    'User ID': v.userId,
                    'Username': usersById[v.userId]?.username || '',
                    'Resource ID': v.resourceId,
                    'Resource Title': res.title || '',
                    'Section': sectionName,
                    'Type': res.type || '',
                    'Count': v.count,
                    'First Viewed At': v.firstViewedAt ? new Date(v.firstViewedAt).toLocaleString() : '',
                    'Last Viewed At': v.lastViewedAt ? new Date(v.lastViewedAt).toLocaleString() : ''
                };
            });
            if (prettyViews.length > 0) {
                const wsPretty = XLSX.utils.json_to_sheet(prettyViews);
                XLSX.utils.book_append_sheet(this.workbook, wsPretty, 'Views Detailed');
            }
        } catch (e) {
            console.warn('exportUsageSummary skipped:', e);
        }
    }

    exportActivities(activities) {
        const activityData = (activities || []).map(activity => ({
            'ID': activity.id,
            'User ID': activity.userId,
            'Username': activity.username,
            'Action': activity.action,
            'Description': activity.description,
            'Timestamp': activity.timestamp ? new Date(activity.timestamp).toLocaleString() : '',
            'IP Address': activity.ip || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(activityData);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Activities');
    }

    exportSummary(data) {
        const summaryData = [
            { 'Metric': 'Total Users', 'Count': data.totalRecords?.users || 0 },
            { 'Metric': 'Total Sections', 'Count': data.totalRecords?.sections || 0 },
            { 'Metric': 'Total Resources', 'Count': data.totalRecords?.resources || 0 },
            { 'Metric': 'Total Activities', 'Count': data.totalRecords?.activities || 0 },
            { 'Metric': 'Export Date', 'Count': data.exportDate ? new Date(data.exportDate).toLocaleString() : new Date().toLocaleString() },
            { 'Metric': 'Playbooks', 'Count': (data.resources || []).filter(r => r.type === 'playbooks').length },
            { 'Metric': 'Box Links', 'Count': (data.resources || []).filter(r => r.type === 'boxLinks').length },
            { 'Metric': 'Dashboards', 'Count': (data.resources || []).filter(r => r.type === 'dashboards').length }
        ];

        const worksheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Summary');
    }

    // Export specific section data
    async exportSectionToExcel(sectionId) {
        try {
            try {
                await this.ensureXlsxLoaded();
            } catch (e) {
                // Fallback to JSON when XLSX can't be loaded
                const payload = { sectionId, section: null, resources: [], usersWithAccess: [] };
                try {
                    const hub = JSON.parse(localStorage.getItem('informationHub') || '{}');
                    if (hub && hub[sectionId]) {
                        payload.section = { id: sectionId, name: hub[sectionId].name || sectionId };
                        ['playbooks','boxLinks','dashboards'].forEach(t => (hub[sectionId][t]||[]).forEach(r => payload.resources.push({ ...r, type: t })));
                    }
                } catch(_) {}
                try {
                    const lsUsers = JSON.parse(localStorage.getItem('hubUsers') || '[]');
                    payload.usersWithAccess = (lsUsers || []).filter(u => (u.permissions?.canEditAllSections) || (u.permissions?.sections || []).includes(sectionId)).map(u => ({ id: u.id, username: u.username, role: u.role || 'user', name: u.name || '', email: u.email || '' }));
                } catch(_) {}
                const jsonName = `${sectionId}_Export_${new Date().toISOString().split('T')[0]}.json`;
                this._downloadTextFile(jsonName, JSON.stringify(payload, null, 2));
                return { success: true, fileName: jsonName, fallback: 'json' };
            }
            let section = null;
            let resources = [];
            try {
                if (window.hubDatabase && hubDatabase.getSection) {
                    section = await hubDatabase.getSection(sectionId);
                }
            } catch (_) {}
            try {
                if (window.hubDatabase && hubDatabase.getResourcesBySection) {
                    resources = await hubDatabase.getResourcesBySection(sectionId);
                }
            } catch (_) { resources = []; }

            // Fallback: derive section + resources from localStorage if DB is empty
            if (!section) {
                try {
                    let name = sectionId;
                    try {
                        const order = JSON.parse(localStorage.getItem('sectionOrder') || '[]');
                        const found = (order || []).find(s => String(s.id) === String(sectionId));
                        if (found && found.name) name = found.name;
                    } catch (_) {}
                    try {
                        const hub = JSON.parse(localStorage.getItem('informationHub') || '{}');
                        if (hub && hub[sectionId] && hub[sectionId].name) name = hub[sectionId].name;
                        if (resources.length === 0 && hub && hub[sectionId]) {
                            const s = hub[sectionId];
                            ['playbooks','boxLinks','dashboards'].forEach(type => {
                                (s[type] || []).forEach(r => resources.push({ ...r, sectionId, type }));
                            });
                        }
                    } catch (_) {}
                    section = { sectionId, id: sectionId, name, icon: '', color: '', data: { playbooks: [], boxLinks: [], dashboards: [] } };
                } catch (_) {}
            }

            if (!section) {
                throw new Error('Section not found');
            }

            // Users with access to this section (DB + localStorage)
            let usersWithAccess = [];
            try {
                let usersDb = [];
                try { if (window.hubDatabase && hubDatabase.getAllUsers) usersDb = await hubDatabase.getAllUsers(); } catch (_) { usersDb = []; }
                let usersLs = [];
                try { usersLs = JSON.parse(localStorage.getItem('hubUsers') || '[]'); } catch (_) { usersLs = []; }
                const byId = new Map((usersDb || []).map(u => [u.id, u]));
                (usersLs || []).forEach(u => { if (!byId.has(u.id)) byId.set(u.id, u); });
                const merged = Array.from(byId.values());
                usersWithAccess = merged.filter(u => (u?.permissions?.canEditAllSections) || (u?.permissions?.sections || []).includes(sectionId))
                    .map(u => ({ id: u.id, username: u.username, role: u.role || 'user', name: u.name || '', email: u.email || '' }));
            } catch (_) { usersWithAccess = []; }

            this.workbook = XLSX.utils.book_new();

            // Section info
            const sectionInfo = [{
                'Section ID': section.sectionId,
                'Name': section.name,
                'Icon': section.icon,
                'Color': section.color,
                'Total Resources': resources.length
            }];

            const sectionWorksheet = XLSX.utils.json_to_sheet(sectionInfo);
            XLSX.utils.book_append_sheet(this.workbook, sectionWorksheet, 'Section Info');

            // Resources by type
            const types = ['playbooks', 'boxLinks', 'dashboards'];
            for (const type of types) {
                const typeResources = resources.filter(r => r.type === type);
                if (typeResources.length > 0) {
                    const typeData = typeResources.map(resource => ({
                        'Title': resource.title,
                        'Description': resource.description || '',
                        'URL': resource.url,
                        'Category': resource.category || '',
                        'Tags': resource.tags ? resource.tags.join(', ') : '',
                        'Created At': new Date(resource.createdAt).toLocaleString()
                    }));

                    const worksheet = XLSX.utils.json_to_sheet(typeData);
                    XLSX.utils.book_append_sheet(this.workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));
                }
            }

            // Users with access
            try {
                const usersWs = XLSX.utils.json_to_sheet(usersWithAccess);
                XLSX.utils.book_append_sheet(this.workbook, usersWs, 'Users With Access');
            } catch (_) {}

            // Skip Views sheet in section export

            const fileName = `${section.name.replace(/\s+/g, '_')}_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            try {
                XLSX.writeFile(this.workbook, fileName);
            } catch (e) {
                // Last-resort fallback to JSON
                const payload = { sectionId, section: { id: section.sectionId || section.id, name: section.name }, resources };
                const jsonName = `${section.sectionId || section.id}_Export_${new Date().toISOString().split('T')[0]}.json`;
                this._downloadTextFile(jsonName, JSON.stringify(payload, null, 2));
                return { success: true, fileName: jsonName, fallback: 'json' };
            }

            return {
                success: true,
                fileName: fileName,
                sectionName: section.name,
                resourceCount: resources.length
            };
        } catch (error) {
            console.error('Section export failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Export user-specific data
    async exportUserDataToExcel(userId) {
        try {
            try {
                await this.ensureXlsxLoaded();
            } catch (e) {
                // Fallback to JSON when XLSX can't be loaded
                const payload = { userId, user: null, activities: [], accessibleResources: [] };
                try {
                    const lsUsers = JSON.parse(localStorage.getItem('hubUsers') || '[]');
                    payload.user = (lsUsers || []).find(u => String(u.id) === String(userId)) || null;
                    const acts = JSON.parse(localStorage.getItem('hubActivities') || '[]');
                    payload.activities = (acts || []).filter(a => a.userId === userId);
                    if (payload.user) {
                        const perms = payload.user.permissions || {};
                        const canAll = !!perms.canEditAllSections;
                        const allowed = new Set(perms.sections || []);
                        const hub = JSON.parse(localStorage.getItem('informationHub') || '{}');
                        Object.entries(hub).forEach(([sid, s]) => {
                            if (!canAll && !allowed.has(sid)) return;
                            ['playbooks','boxLinks','dashboards'].forEach(type => {
                                (s?.[type] || []).forEach(r => payload.accessibleResources.push({ ...r, sectionId: sid, type }));
                            });
                        });
                    }
                } catch(_) {}
                const jsonName = `User_${userId}_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
                this._downloadTextFile(jsonName, JSON.stringify(payload, null, 2));
                return { success: true, fileName: jsonName, fallback: 'json' };
            }
            let user = null;
            let activities = [];
            try { if (window.hubDatabase && hubDatabase.getUser) user = await hubDatabase.getUser(userId); } catch(_) {}
            try { if (window.hubDatabase && hubDatabase.getActivities) activities = await hubDatabase.getActivities(); } catch(_) { activities = []; }

            if (!user) {
                // Fallback: find in localStorage
                try {
                    const lsUsers = JSON.parse(localStorage.getItem('hubUsers') || '[]');
                    user = (lsUsers || []).find(u => String(u.id) === String(userId) || String(u.username) === String(userId));
                } catch (_) {}
            }
            if (!user) throw new Error('User not found');

            const userActivities = activities.filter(a => a.userId === userId);

            // Build section name mapping from sectionOrder
            let nameById = {};
            try {
                const order = JSON.parse(localStorage.getItem('sectionOrder') || '[]');
                (order || []).forEach(s => { if (s && s.id) nameById[s.id] = s.name || s.id; });
            } catch (_) {}

            this.workbook = XLSX.utils.book_new();

            // User info
            const userInfo = [{
                'ID': user.id,
                'Username': user.username,
                'Name': user.name || '',
                'Email': user.email || '',
                'Role': user.role,
                'Created At': new Date(user.createdAt).toLocaleString()
            }];

            const userWorksheet = XLSX.utils.json_to_sheet(userInfo);
            XLSX.utils.book_append_sheet(this.workbook, userWorksheet, 'User Info');

            // User activities
            if (userActivities.length > 0) {
                const activityData = userActivities.map(activity => ({
                    'Action': activity.action,
                    'Description': activity.description,
                    'Timestamp': new Date(activity.timestamp).toLocaleString(),
                    'IP Address': activity.ip || ''
                }));

                const activityWorksheet = XLSX.utils.json_to_sheet(activityData);
                XLSX.utils.book_append_sheet(this.workbook, activityWorksheet, 'Activities');
            }

            // Accessible resources for this user
            try {
                const perms = user.permissions || {};
                const canAll = !!perms.canEditAllSections;
                const allowed = new Set(perms.sections || []);
                const hub = JSON.parse(localStorage.getItem('informationHub') || '{}');
                const accessibleResources = [];
                Object.entries(hub).forEach(([sid, s]) => {
                    if (!canAll && !allowed.has(sid)) return;
                    ['playbooks','boxLinks','dashboards'].forEach(type => {
                        (s?.[type] || []).forEach(r => accessibleResources.push({ ...r, sectionId: sid, type }));
                    });
                });
                if (accessibleResources.length > 0) {
                    const wsRes = XLSX.utils.json_to_sheet(accessibleResources.map(r => ({
                        'Title': r.title,
                        'Type': r.type,
                        'Section': r.sectionId,
                        'URL': r.url || '',
                        'Category': r.category || '',
                        'Tags': Array.isArray(r.tags) ? r.tags.join(', ') : ''
                    })));
                    XLSX.utils.book_append_sheet(this.workbook, wsRes, 'Accessible Resources');
                }
            } catch (_) {}

            // Skip Views in user data export

            const fileName = `${user.username}_Data_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            try {
                XLSX.writeFile(this.workbook, fileName);
            } catch (e) {
                const payload = { userId, user, activities: userActivities };
                const jsonName = `User_${user.username}_Data_Export_${new Date().toISOString().split('T')[0]}.json`;
                this._downloadTextFile(jsonName, JSON.stringify(payload, null, 2));
                return { success: true, fileName: jsonName, fallback: 'json' };
            }

            return {
                success: true,
                fileName: fileName,
                username: user.username,
                activityCount: userActivities.length
            };
        } catch (error) {
            console.error('User data export failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    _normalizePermissions(user) {
        const role = (user.role || 'user').toLowerCase();
        const perms = user.permissions || {};
        return { ...user, role, permissions: { sections: perms.sections || [], editableSections: perms.editableSections || [], ...perms } };
    }
}

// Initialize Excel exporter
const excelExporter = new ExcelExporter();
window.excelExporter = excelExporter;

