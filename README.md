# Information Hub with Role-Based Access Control

A comprehensive information management system with user authentication, role-based permissions, and audit logging.

## 🔐 Authentication & User Management

### Default User Accounts

The system comes with three pre-configured user accounts for testing:

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| `admin` | `admin123` | Admin | Full access to all sections and admin functions |
| `manager` | `manager123` | Manager | Access to 4 sections, can delete resources |
| `user` | `user123` | User | Read-only access to 2 sections |

### User Roles & Permissions

#### 🔧 **Admin Role**
- **Full System Access**: All sections and resources
- **User Management**: Create, edit, delete users
- **Admin Panel**: Access to user management, permissions, audit log
- **Resource Management**: Full CRUD operations on all resources
- **Audit Logging**: View all system activities

**Accessible Sections**: All 8 sections (Costing, Supply Planning, Operations, Quality, HR, IT, Sales, Compliance)

#### 👔 **Manager Role**
- **Limited Section Access**: 4 core business sections
- **Resource Management**: Can add, edit, and delete resources in assigned sections
- **No User Management**: Cannot create or manage users
- **No Admin Panel**: Cannot access administrative functions

**Accessible Sections**: Costing, Supply Planning, Operations, Quality Management

#### 👤 **User Role**
- **Read-Only Access**: 2 basic sections only
- **Limited Resource Management**: Can only view resources
- **No Administrative Functions**: Cannot manage users or access admin panel

**Accessible Sections**: Costing, Supply Planning

## 🚀 Getting Started

### 1. **Login Process**
1. Open `auth.html` in your browser
2. Use one of the demo accounts or create a new user (admin only)
3. Click "Sign In" to access the hub

### 2. **Navigation**
- **Main Hub**: Overview of all sections with access indicators
- **Section Pages**: Detailed view of resources within each section
- **User Profile**: View your account details and permissions
- **Admin Panel**: Manage users and view audit logs (admin only)

### 3. **Resource Management**
- **Add Resources**: Click "Add" buttons to create new playbooks, box links, or dashboards
- **Edit Resources**: Click the edit icon on any resource card
- **Delete Resources**: Click the delete icon (if you have permission)
- **Search & Filter**: Use search bar and category filters to find resources

## 🛡️ Security Features

### Access Control
- **Section-Level Permissions**: Users can only access assigned sections
- **Resource-Level Permissions**: Edit/delete permissions based on role
- **Session Management**: Automatic logout and session validation
- **Permission Validation**: Server-side permission checks for all actions

### Audit Logging
- **User Activities**: Login, logout, resource creation, editing, deletion
- **Admin Actions**: User management, permission changes
- **Timestamp Tracking**: All activities logged with precise timestamps
- **User Identification**: Each log entry includes user information

### Data Security
- **Local Storage**: All data stored locally in browser
- **Session Tokens**: Secure session management
- **Permission Validation**: Every action validated against user permissions
- **Access Restrictions**: UI elements hidden/disabled based on permissions

## 📊 Admin Panel Features

### User Management
- **View All Users**: Complete list of system users
- **Add New Users**: Create users with specific roles and permissions
- **Edit User Details**: Modify user information and permissions
- **Delete Users**: Remove users from the system

### Permission Management
- **Role-Based Permissions**: Predefined permission sets for each role
- **Section Access Control**: Assign specific sections to users
- **Permission Inheritance**: Automatic permission assignment based on role

### Audit Log
- **Activity Tracking**: Complete log of all user activities
- **Filtering Options**: Filter by user, action type, or date
- **Real-Time Updates**: Live updates of system activities
- **Export Capabilities**: View and analyze audit data

## 🔧 Technical Implementation

### File Structure
```
playbook-hub/
├── auth.html              # Login page
├── index.html             # Main hub dashboard
├── styles.css             # Complete styling
├── auth-script.js         # Authentication system
├── hub-script.js          # Main application logic
├── section-script.js      # Section page functionality
└── README.md              # This documentation
```

### Key Components

#### Authentication System (`auth-script.js`)
- User login/logout functionality
- Session management
- Permission validation
- Audit logging

#### Main Hub (`hub-script.js`)
- Section navigation
- User interface updates
- Admin panel management
- Role-based access control

#### Section Management (`section-script.js`)
- Resource CRUD operations
- Permission-based UI updates
- Access validation
- Resource filtering

## 🎯 Usage Examples

### For Administrators
1. **Login** with admin credentials
2. **Access Admin Panel** to manage users
3. **Create New Users** with specific roles
4. **Monitor Audit Log** for system activities
5. **Manage All Resources** across all sections

### For Managers
1. **Login** with manager credentials
2. **Access Assigned Sections** (Costing, Supply Planning, Operations, Quality)
3. **Add/Edit Resources** in accessible sections
4. **Delete Resources** as needed
5. **View User Profile** for account details

### For Regular Users
1. **Login** with user credentials
2. **View Assigned Sections** (Costing, Supply Planning)
3. **Browse Resources** in accessible sections
4. **View Resource Details** and follow links
5. **Update Profile** information

## 🔄 Customization

### Adding New Roles
1. Update `getDefaultPermissions()` in `hub-script.js`
2. Add role-specific permission sets
3. Update UI elements to handle new roles
4. Test permission inheritance

### Modifying Section Access
1. Update user permissions in admin panel
2. Modify section access arrays
3. Update UI access controls
4. Test access restrictions

### Adding New Resource Types
1. Update section page templates
2. Add new resource type handling
3. Update permission checks
4. Test CRUD operations

## 🚨 Security Considerations

### Production Deployment
- **Server-Side Authentication**: Implement proper server-side authentication
- **Database Storage**: Move from localStorage to secure database
- **HTTPS**: Use secure connections for all communications
- **Password Hashing**: Implement proper password hashing
- **Session Management**: Use secure session tokens

### Access Control
- **Permission Validation**: Validate all permissions server-side
- **Input Sanitization**: Sanitize all user inputs
- **XSS Protection**: Implement proper XSS protection
- **CSRF Protection**: Add CSRF tokens for all forms

## 📈 Future Enhancements

### Planned Features
- **Multi-Factor Authentication**: Add 2FA support
- **Advanced Permissions**: Granular permission system
- **Resource Sharing**: Share resources between users
- **Notification System**: Real-time notifications
- **API Integration**: REST API for external integrations
- **Mobile App**: Native mobile application
- **Cloud Sync**: Cloud-based data synchronization

### Integration Options
- **LDAP/Active Directory**: Enterprise authentication
- **SSO Integration**: Single sign-on support
- **External Databases**: Connect to existing databases
- **Cloud Storage**: Integration with cloud storage services

---

**Ready to use!** 🎉 The Information Hub is now fully functional with comprehensive role-based access control, user management, and audit logging capabilities.

## 🚀 Deploy to GitHub Pages (Copy/Paste)

1) Create an empty public repo on GitHub (e.g., `YOUR_REPO_NAME`).
2) Upload these items from this folder to the repo root:
```
auth.html
index.html
styles.css
auth-script.js
hub-script.js
section-script.js
database.js
excel-export.js
logo.svg
redirect.html
start.html
.nojekyll
background-pic/            # images + manifest.json
```
3) In your repo: Settings → Pages → Source: Deploy from a branch; Branch: main; Folder: /
4) Wait a few minutes, then open: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

Notes:
- `.nojekyll` avoids Jekyll processing so static assets load correctly.
- All paths are relative; the app works under a subpath like `/YOUR_REPO_NAME/`.

