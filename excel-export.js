// Excel Export Utility for Information Hub
class ExcelExporter {
    constructor() {
        this.workbook = null;
    }

    // Create Excel file from hub data
    async exportToExcel() {
        try {
            let data;
            try {
                if (window.hubDatabase && window.hubDatabaseReady && hubDatabase.exportAllData) {
                    data = await hubDatabase.exportAllData();
                }
            } catch (_) {}
            if (!data) {
                const usersLS = JSON.parse(localStorage.getItem('hubUsers') || '[]');
                const infoHub = JSON.parse(localStorage.getItem('informationHub') || '{}');
                const activities = JSON.parse(localStorage.getItem('hubActivities') || '[]');
                const sections = Object.keys(infoHub).map(id => ({
                    id,
                    sectionId: id,
                    name: infoHub[id]?.name || id,
                    icon: infoHub[id]?.icon || '',
                    color: infoHub[id]?.color || '',
                    data: infoHub[id] || { playbooks: [], boxLinks: [], dashboards: [] }
                }));
                const resources = [];
                Object.entries(infoHub).forEach(([sectionId, s]) => {
                    ['playbooks','boxLinks','dashboards'].forEach(type => {
                        (s?.[type] || []).forEach(r => resources.push({ ...r, sectionId, type }));
                    });
                });
                data = {
                    users: usersLS.map(u => this._withPermissionDefaults(u)),
                    sections,
                    resources,
                    activities,
                    views: [],
                    exportDate: new Date().toISOString(),
                    totalRecords: {
                        users: usersLS.length,
                        sections: sections.length,
                        resources: resources.length,
                        activities: activities.length,
                        views: 0
                    }
                };
            } else {
                data.users = (data.users || []).map(u => this._withPermissionDefaults(u));
                data.resources = Array.isArray(data.resources) ? data.resources : [];
            }

            this.workbook = XLSX.utils.book_new();

            // Export Users
            this.exportUsers(data.users);
            this.exportUserAccess(data.users, data.sections);

            // Export Sections
            this.exportSections(data.sections);

            // Export Resources
            this.exportResources(data.resources);

            // Export Activities
            this.exportActivities(data.activities);

            // Export Views (usage)
            this.exportViews(data.views || []);

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
        const sectionData = (sections || []).map(section => ({
            'Section ID': section.sectionId,
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

    exportResources(resources) {
        const resourceData = (resources || []).map(resource => ({
            'ID': resource.id,
            'Title': resource.title,
            'Description': resource.description || '',
            'URL': resource.url,
            'Type': resource.type,
            'Section': resource.sectionId,
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
            const sectionIds = Array.from(new Set((sections || []).map(s => s.sectionId || s.id).filter(Boolean)));
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
                        'Section': sectionId,
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

            // 1) Duration events (derived from CLOSE_* descriptions)
            const durationRows = activities
                .filter(a => a && (a.action === 'CLOSE_SECTION' || a.action === 'CLOSE_HUB'))
                .map(a => {
                    const match = (a.description || '').match(/(\d+)s\b/);
                    const seconds = match ? parseInt(match[1], 10) : '';
                    const sectionMatch = (a.description || '').match(/section\s+([\w-]+)/i);
                    const sectionId = a.action === 'CLOSE_SECTION' && sectionMatch ? sectionMatch[1] : '';
                    return {
                        'User ID': a.userId,
                        'Username': a.username || (usersById[a.userId]?.username || ''),
                        'Action': a.action,
                        'Section': sectionId,
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
                return {
                    'User ID': v.userId,
                    'Username': usersById[v.userId]?.username || '',
                    'Resource ID': v.resourceId,
                    'Resource Title': res.title || '',
                    'Section': res.sectionId || '',
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
            const [section, resources] = await Promise.all([
                hubDatabase.getSection(sectionId),
                hubDatabase.getResourcesBySection(sectionId)
            ]);

            if (!section) {
                throw new Error('Section not found');
            }

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

            const fileName = `${section.name.replace(/\s+/g, '_')}_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(this.workbook, fileName);

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
            const [user, activities] = await Promise.all([
                hubDatabase.getUser(userId),
                hubDatabase.getActivities()
            ]);

            if (!user) {
                throw new Error('User not found');
            }

            const userActivities = activities.filter(a => a.userId === userId);

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

            const fileName = `${user.username}_Data_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(this.workbook, fileName);

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

    _withPermissionDefaults(user) {
        const role = (user.role || 'user').toLowerCase();
        const defaults = {
            admin: { canManageUsers: true, canEditAllSections: true, canDeleteResources: true, canViewAuditLog: true, canManageRoles: true, sections: ['costing','supply-planning','operations','quality','hr','it','sales','compliance'], editableSections: ['costing','supply-planning','operations','quality','hr','it','sales','compliance'] },
            manager: { canManageUsers: false, canEditAllSections: false, canDeleteResources: true, canViewAuditLog: false, canManageRoles: false, sections: ['costing','supply-planning','operations','quality'], editableSections: ['costing','supply-planning','operations','quality'] },
            user: { canManageUsers: false, canEditAllSections: false, canDeleteResources: false, canViewAuditLog: false, canManageRoles: false, sections: ['costing','supply-planning'], editableSections: [] }
        };
        const perms = user.permissions || defaults[role] || defaults.user;
        return { ...user, role, permissions: { sections: perms.sections || [], editableSections: perms.editableSections || [], ...perms } };
    }
}

// Initialize Excel exporter
const excelExporter = new ExcelExporter();
window.excelExporter = excelExporter;

