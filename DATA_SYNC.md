## Information Hub – GitHub Sync Design

This document describes how data is synchronized to GitHub so that all users share the same state across devices.

### Overview
- GitHub is the shared source of truth for users, sections, resources, and section configurations.
- Changes by admins/managers are written to GitHub immediately (mandatory) and mirrored locally for performance.
- Audit log and view counters are batched to GitHub roughly hourly and pruned to a 7‑day retention window.
- All clients auto-refresh from GitHub about every 60 seconds (and when a tab becomes visible) to pull updates.

### Prerequisites
1) GitHub token available in the browser (one-time by an admin/manager):
   - Stored in `localStorage.githubToken` or set as `window.GH_TOKEN` at runtime.
2) Repo metadata available (only needed if not on `*.github.io`):
   ```html
   <script>
     window.GH_OWNER = 'your-org-or-user';
     window.GH_REPO = 'playbook-hub';
     window.GH_BRANCH = 'main';
   </script>
   ```

### File Layout in GitHub
- `data/users.json`
  - Array of users. Example object:
    ```json
    {
      "id": 123456789,
      "username": "jdoe",
      "password": "<hashed-or-omitted>",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "admin|manager|user",
      "permissions": {
        "canManageUsers": true,
        "canEditAllSections": true,
        "canDeleteResources": true,
        "canViewAuditLog": true,
        "canManageRoles": true,
        "sections": ["costing", "supply-planning", ...],
        "editableSections": ["costing", "operations", ...]
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-02T12:34:56.000Z"
    }
    ```

- `data/sections.json` (Admin “Manage Sections”) – Array of section cards for the hub:
  ```json
  {
    "id": "operations",
    "name": "Operations",
    "icon": "fas fa-cogs",
    "image": "https://.../ops.svg",   // optional; overrides icon
    "visible": true,
    "order": 3,
    "intro": "Process improvement, SOPs, and maintenance guidance."
  }
  ```

- `data/section-configs.json` – Per-section tabs/types and categories (what appears as tabs in a section):
  ```json
  {
    "operations": {
      "types": [
        { "id": "playbooks", "name": "Playbooks", "icon": "fas fa-book" },
        { "id": "box-links", "name": "Box Links", "icon": "fas fa-link" },
        { "id": "dashboards", "name": "Dashboards", "icon": "fas fa-chart-bar" },
        { "id": "reports", "name": "Reports", "icon": "fas fa-file-alt" }
      ],
      "categories": ["process", "procedure", "guide", "template", "checklist"]
    }
  }
  ```

- `data/resources/<sectionId>.json` – Per-section resource content (grouped by type id):
  ```json
  {
    "updatedAt": "2025-01-02T12:34:56.000Z",
    "playbooks": [
      {
        "id": "operations:playbooks:kz3...",
        "title": "SOP: Shift Handover",
        "description": "Checklist and owners",
        "url": "https://example.com/sop.pdf",
        "tags": ["sop", "handover"],
        "category": "procedure",
        "createdAt": "2025-01-02T12:30:00.000Z",
        "updatedAt": "2025-01-02T12:34:56.000Z",
        "userId": 123456789
      }
    ],
    "boxLinks": [],
    "dashboards": []
  }
  ```

- `data/audit-log.json` – Audit entries (hourly-batched; pruned to 7 days):
  ```json
  {
    "id": "1700000000000-xyz",
    "userId": 123456789,
    "username": "jdoe",
    "action": "OPEN_SECTION|VIEW_RESOURCE|...",
    "description": "Opened section operations",
    "timestamp": "2025-01-02T12:00:00.000Z",
    "ip": "<optional>"
  }
  ```

- `data/views.json` – Aggregated resource usage (hourly-batched; pruned to 7 days):
  ```json
  {
    "id": "123456789:operations:playbooks:kz3...",
    "userId": 123456789,
    "resourceId": "operations:playbooks:kz3...",
    "count": 12,
    "firstViewedAt": "2025-01-01T09:00:00.000Z",
    "lastViewedAt": "2025-01-02T12:00:00.000Z"
  }
  ```

### Sync Behavior
- Mandatory sync (write fails if GitHub write fails):
  - Users add/edit/delete and permission changes → `data/users.json`
  - Resources add/edit/delete → `data/resources/<sectionId>.json`
  - Manage Sections (visible/invisible, order, icon/image, intro, create/delete) → `data/sections.json`
  - Section “Customize” (tabs/categories) → currently best‑effort; can be switched to mandatory if desired.

- Batched hourly sync (with 7‑day retention):
  - Audit log → `data/audit-log.json`
  - View counters → `data/views.json`

- Auto-refresh:
  - Clients fetch from GitHub every ~60s and on tab focus.

### Failure Modes
- If a mandatory GitHub write fails, the UI blocks the change and shows an error. No local divergence is allowed.
- If hourly batch fails, data remains queued locally and will retry on the next hourly tick.

### Security Notes
- Store only needed user information. Avoid storing plaintext passwords in the repo; prefer hashed or keep password-only locally if possible.
- Restrict token scope to the repository and avoid exposing tokens to regular users.

### Operations
- Force update visibility/order or resource edits by retrying once network stabilizes.
- For immediate propagation, the other user can manually refresh; otherwise their client will auto-pull within ~60s.


