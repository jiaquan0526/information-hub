(function(){
    function encodePathSegments(path) {
        try {
            return String(path)
                .split('/')
                .map(function(segment){ return encodeURIComponent(segment); })
                .join('/');
        } catch(_) {
            return String(path || '');
        }
    }
    function getRepoInfo() {
        try {
            if (window.GH_OWNER && window.GH_REPO) {
                return { owner: window.GH_OWNER, repo: window.GH_REPO, branch: window.GH_BRANCH || 'main' };
            }
            const host = String(location.hostname||'');
            const path = String(location.pathname||'');
            // Support user.github.io/repo and org.github.io/repo
            if (/github\.io$/i.test(host)) {
                const parts = path.split('/').filter(Boolean);
                if (parts.length > 0) {
                    const repo = parts[0];
                    const owner = host.split('.')[0];
                    return { owner, repo, branch: 'main' };
                }
            }
        } catch(_) {}
        return null;
    }
    function getAuthHeaders() {
        let token = null;
        try {
            if (window.GH_TOKEN) token = window.GH_TOKEN;
            if (!token) {
                const raw = localStorage.getItem('githubToken');
                if (raw) {
                    try { const obj = JSON.parse(raw); token = obj.token || obj.access_token || raw; } catch(_) { token = raw; }
                }
            }
            if (!token) {
                const sess = localStorage.getItem('hubSession');
                if (sess) {
                    try { const d = JSON.parse(sess); token = d.githubToken || d.token || null; } catch(_) {}
                }
            }
        } catch(_) {}
        const headers = { 'Accept': 'application/vnd.github+json' };
        if (token) headers['Authorization'] = 'token ' + token;
        return headers;
    }
    async function readJson(path) {
        const info = getRepoInfo();
        if (!info) return { json: null, sha: null };
        const { owner, repo } = info;
        const branch = info.branch || 'main';
        const headers = getAuthHeaders();
        // Try contents API to get sha
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePathSegments(path)}?ref=${encodeURIComponent(branch)}`;
            const resp = await fetch(url, { headers, cache: 'no-store' });
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.content) {
                    const text = atob(String(data.content).replace(/\n/g, ''));
                    try { return { json: JSON.parse(text), sha: data.sha }; } catch(_) { return { json: null, sha: data.sha }; }
                }
            }
        } catch(_) {}
        // Fallback to raw
        try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodePathSegments(path)}`;
            const resp = await fetch(rawUrl, { cache: 'no-store' });
            if (resp.ok) {
                const text = await resp.text();
                try { return { json: JSON.parse(text), sha: null }; } catch(_) { return { json: null, sha: null }; }
            }
        } catch(_) {}
        return { json: null, sha: null };
    }
    async function writeJson(path, obj, message = 'Update data', sha = null) {
        const info = getRepoInfo();
        if (!info) throw new Error('GitHub repo info not found');
        const { owner, repo } = info;
        const branch = info.branch || 'main';
        const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
        const body = { message, content, branch };
        if (sha) body.sha = sha;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePathSegments(path)}`;
        const resp = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`GitHub write failed: ${resp.status} ${text}`);
        }

	// ---- Higher-level helpers for Hub data stored in the repo ----
	// File layout (suggested):
	// - data/section-configs.json  { [sectionId]: { types:[...], categories:[...] } }
	// - data/users.json            [ { id, username, role, permissions, ... } ]
	// - data/resources/<sectionId>.json  { updatedAt, <typeId>: [resource, ...], ... }

	function _ensureResourceContainer(json, sectionId) {
		const base = (json && typeof json === 'object') ? { ...json } : {};
		if (!base.updatedAt) base.updatedAt = new Date().toISOString();
		return base;
	}

	function _findResourceIndex(list, resource) {
		if (!Array.isArray(list)) return -1;
		// Prefer by id when present
		if (resource && resource.id !== undefined && resource.id !== null && resource.id !== '') {
			const idStr = String(resource.id);
			const idxById = list.findIndex(r => String(r && r.id) === idStr);
			if (idxById >= 0) return idxById;
		}
		// Fallback: by canonical pairing of title+url
		try {
			const title = String(resource?.title || '').trim().toLowerCase();
			let url = String(resource?.url || '').trim();
			if (url && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) url = 'https://' + url;
			const pair = `t:${title}|u:${url.toLowerCase()}`;
			return list.findIndex(r => {
				const t = String(r?.title || '').trim().toLowerCase();
				let u = String(r?.url || '').trim();
				if (u && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) u = 'https://' + u;
				return pair === `t:${t}|u:${u.toLowerCase()}`;
			});
		} catch(_) { return -1; }
	}

	async function readUsers() {
		return readJson('data/users.json');
	}

	async function writeUsers(users, message = 'Update users', sha = null) {
		const arr = Array.isArray(users) ? users : [];
		return writeJson('data/users.json', arr, message, sha || null);
	}

	async function upsertUser(user) {
		const current = await readUsers();
		let list = Array.isArray(current.json) ? [...current.json] : [];
		const byId = (user && user.id !== undefined && user.id !== null && user.id !== '');
		let idx = -1;
		if (byId) idx = list.findIndex(u => String(u && u.id) === String(user.id));
		if (idx < 0 && user && user.username) {
			idx = list.findIndex(u => String(u && u.username).toLowerCase() === String(user.username).toLowerCase());
		}
		if (idx >= 0) list[idx] = { ...list[idx], ...user };
		else list.push(user);
		return writeUsers(list, `Upsert user: ${user?.username || user?.id || 'user'}`, current.sha || null);
	}

	async function deleteUserById(userId) {
		const current = await readUsers();
		let list = Array.isArray(current.json) ? [...current.json] : [];
		list = list.filter(u => String(u && u.id) !== String(userId));
		return writeUsers(list, `Delete user: ${userId}`, current.sha || null);
	}

	async function readSectionResources(sectionId) {
		const safeId = String(sectionId || '').trim();
		if (!safeId) return { json: null, sha: null };
		return readJson(`data/resources/${encodePathSegments(safeId)}.json`);
	}

	async function writeSectionResources(sectionId, resourcesObj, message = 'Update resources', sha = null) {
		const safeId = String(sectionId || '').trim();
		if (!safeId) throw new Error('sectionId required');
		const obj = _ensureResourceContainer(resourcesObj || {}, safeId);
		obj.updatedAt = new Date().toISOString();
		return writeJson(`data/resources/${encodePathSegments(safeId)}.json`, obj, message, sha || null);
	}

	async function getResourcesByType(sectionId, typeId) {
		const current = await readSectionResources(sectionId);
		const json = _ensureResourceContainer(current.json || {}, sectionId);
		// typeId can be 'playbooks', 'boxLinks', 'dashboards', or custom ids
		const key = String(typeId || '').trim();
		const arr = Array.isArray(json[key]) ? json[key] : [];
		return arr;
	}

	async function upsertResource(sectionId, typeId, resource) {
		const current = await readSectionResources(sectionId);
		const json = _ensureResourceContainer(current.json || {}, sectionId);
		const key = String(typeId || '').trim();
		const list = Array.isArray(json[key]) ? [...json[key]] : [];
		const idx = _findResourceIndex(list, resource);
		const now = new Date().toISOString();
		const next = { ...resource };
		if (!next.createdAt) next.createdAt = now;
		next.updatedAt = now;
		if (idx >= 0) list[idx] = { ...list[idx], ...next };
		else list.unshift(next);
		json[key] = list;
		return writeSectionResources(sectionId, json, `Upsert ${key} in ${sectionId}`, current.sha || null);
	}

	async function deleteResource(sectionId, resourceId) {
		const current = await readSectionResources(sectionId);
		const json = _ensureResourceContainer(current.json || {}, sectionId);
		let changed = false;
		Object.keys(json).forEach(k => {
			if (!Array.isArray(json[k])) return;
			const before = json[k].length;
			json[k] = json[k].filter(r => String(r && r.id) !== String(resourceId));
			if (json[k].length !== before) changed = true;
		});
		if (!changed) return { changed: false };
		await writeSectionResources(sectionId, json, `Delete resource ${resourceId} in ${sectionId}`, current.sha || null);
		return { changed: true };
	}

	// ---- Sections (Manage Sections) ----
	// Stored in data/sections.json as an array of { id, name, icon, image, visible, order, intro }
	async function readSections() {
		return readJson('data/sections.json');
	}

	async function writeSections(sections, message = 'Update sections', sha = null) {
		const list = Array.isArray(sections) ? sections : [];
		return writeJson('data/sections.json', list, message, sha || null);
	}

	async function upsertSection(section) {
		const current = await readSections();
		let list = Array.isArray(current.json) ? [...current.json] : [];
		const id = String(section?.id || '').trim();
		if (!id) throw new Error('section.id required');
		const idx = list.findIndex(s => String(s?.id) === id);
		if (idx >= 0) list[idx] = { ...list[idx], ...section };
		else list.push(section);
		return writeSections(list, `Upsert section: ${id}`, current.sha || null);
	}

	async function deleteSectionById(sectionId) {
		const current = await readSections();
		let list = Array.isArray(current.json) ? [...current.json] : [];
		list = list.filter(s => String(s?.id) !== String(sectionId));
		return writeSections(list, `Delete section: ${sectionId}`, current.sha || null);
	}

	async function setSectionsOrder(orderList) {
		// orderList: array of { id, order }
		const current = await readSections();
		let list = Array.isArray(current.json) ? [...current.json] : [];
		const map = new Map(orderList.map(o => [String(o.id), Number(o.order) || 0]));
		list = list.map(s => ({ ...s, order: map.has(String(s.id)) ? map.get(String(s.id)) : (s.order || 0) }));
		// Normalize to 1..N
		list.sort((a,b) => (a.order||0) - (b.order||0)).forEach((s, i) => { s.order = i + 1; });
		return writeSections(list, 'Reorder sections', current.sha || null);
	}

	// ---- Audit log (hourly, 7-day retention suggested) ----
	function _pruneToDays(list, days, tsKey) {
		try {
			const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
			return (Array.isArray(list) ? list : []).filter(it => {
				const t = Date.parse(it?.[tsKey] || it?.timestamp || 0) || 0;
				return t >= cutoff;
			});
		} catch(_) { return Array.isArray(list) ? list : []; }
	}

	async function readAudit() { return readJson('data/audit-log.json'); }
	async function writeAudit(entries, message = 'Update audit log', sha = null) {
		const list = Array.isArray(entries) ? entries : [];
		return writeJson('data/audit-log.json', list, message, sha || null);
	}
	function _dedupeAudit(list) {
		const seen = new Set();
		const out = [];
		for (const a of (Array.isArray(list) ? list : [])) {
			const id = a && a.id ? `id:${a.id}` : `k:${a.username || ''}|${a.action || ''}|${a.description || ''}|${a.timestamp || ''}`;
			if (seen.has(id)) continue;
			seen.add(id); out.push(a);
		}
		return out;
	}
	async function upsertAudit(entries, retentionDays = 7) {
		const current = await readAudit();
		const existing = Array.isArray(current.json) ? current.json : [];
		// Merge then prune to retention
		let merged = existing.concat(Array.isArray(entries) ? entries : []);
		merged = _dedupeAudit(merged);
		merged.sort((a,b) => (Date.parse(b?.timestamp||0)||0) - (Date.parse(a?.timestamp||0)||0));
		merged = _pruneToDays(merged, retentionDays, 'timestamp');
		return writeAudit(merged, 'Upsert audit entries', current.sha || null);
	}

	// ---- Views aggregation (hourly, 7-day retention suggested) ----
	async function readViewsAgg() { return readJson('data/views.json'); }
	async function writeViewsAgg(items, message = 'Update views', sha = null) {
		const list = Array.isArray(items) ? items : [];
		return writeJson('data/views.json', list, message, sha || null);
	}
	function _mergeViews(existing, incoming) {
		const byId = new Map();
		for (const v of (Array.isArray(existing) ? existing : [])) {
			if (!v) continue; byId.set(String(v.id || `${v.userId||'anon'}:${v.resourceId||''}`), { ...v });
		}
		for (const v of (Array.isArray(incoming) ? incoming : [])) {
			if (!v) continue;
			const key = String(v.id || `${v.userId||'anon'}:${v.resourceId||''}`);
			const prev = byId.get(key);
			if (!prev) { byId.set(key, { ...v, id: key }); continue; }
			const count = (Number(prev.count||0) + Number(v.count||0));
			const firstViewedAt = ((Date.parse(prev.firstViewedAt||0)||0) <= (Date.parse(v.firstViewedAt||0)||0)) ? prev.firstViewedAt : v.firstViewedAt;
			const lastViewedAt = ((Date.parse(prev.lastViewedAt||0)||0) >= (Date.parse(v.lastViewedAt||0)||0)) ? prev.lastViewedAt : v.lastViewedAt;
			byId.set(key, { ...prev, ...v, id: key, count, firstViewedAt, lastViewedAt });
		}
		return Array.from(byId.values());
	}
	async function upsertViewsAgg(items, retentionDays = 7) {
		const current = await readViewsAgg();
		let existing = Array.isArray(current.json) ? current.json : [];
		let merged = _mergeViews(existing, items);
		// Prune: keep entries whose lastViewedAt within retention
		merged = _pruneToDays(merged, retentionDays, 'lastViewedAt');
		// Sort by lastViewedAt desc
		merged.sort((a,b) => (Date.parse(b?.lastViewedAt||0)||0) - (Date.parse(a?.lastViewedAt||0)||0));
		return writeViewsAgg(merged, 'Upsert views aggregate', current.sha || null);
	}
        return await resp.json();
    }
    async function getSectionConfig(sectionId) {
        const { json } = await readJson('data/section-configs.json');
        if (json && typeof json === 'object' && json[sectionId]) return json[sectionId];
        return null;
    }
    async function saveSectionConfig(sectionId, cfg) {
        const current = await readJson('data/section-configs.json');
        const next = current.json && typeof current.json === 'object' ? { ...current.json } : {};
        next[sectionId] = cfg;
        return writeJson('data/section-configs.json', next, `Update section config: ${sectionId}`, current.sha || null);
    }
    window.githubData = {
        readJson,
        writeJson,
        getSectionConfig,
        saveSectionConfig,
		// Users
		readUsers,
		writeUsers,
		upsertUser,
		deleteUserById,
		// Sections
		readSections,
		writeSections,
		upsertSection,
		deleteSectionById,
		setSectionsOrder,
		// Resources
		readSectionResources,
		writeSectionResources,
		getResourcesByType,
		upsertResource,
		deleteResource,
		// Low-level helpers
		getRepoInfo,
		getAuthHeaders
    };
})();



