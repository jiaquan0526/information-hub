(function(){
    function getRepoInfo() {
        try {
            if (window.GH_OWNER && window.GH_REPO) {
                return { owner: window.GH_OWNER, repo: window.GH_REPO, branch: window.GH_BRANCH || 'main' };
            }
            const host = String(location.hostname||'');
            const path = String(location.pathname||'');
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
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
            const resp = await fetch(url, { headers, cache: 'no-store' });
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.content) {
                    const text = atob(String(data.content).replace(/\n/g, ''));
                    try { return { json: JSON.parse(text), sha: data.sha }; } catch(_) { return { json: null, sha: data.sha }; }
                }
            }
        } catch(_) {}
        try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`;
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
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
        const resp = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`GitHub write failed: ${resp.status} ${text}`);
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
    window.githubData = { readJson, writeJson, getSectionConfig, saveSectionConfig, getRepoInfo, getAuthHeaders };
})();


