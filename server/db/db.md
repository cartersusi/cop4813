# User Management Database Schema Documentation

## Core Tables

### `users`
Primary table containing user account information and authentication data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | User's chosen username |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| `email_verified` | BOOLEAN | DEFAULT 0 | Whether email has been verified |
| `password_hash` | VARCHAR(255) | NOT NULL | PBKDF2 hashed password |
| `salt` | VARCHAR(255) | | Salt used for password hashing |
| `first_name` | VARCHAR(100) | | User's first name |
| `last_name` | VARCHAR(100) | | User's last name |
| `avatar_url` | VARCHAR(500) | | URL to user's profile picture |
| `bio` | TEXT | | User's biography/description |
| `is_active` | BOOLEAN | DEFAULT 1 | Account active status |
| `is_deleted` | BOOLEAN | DEFAULT 0 | Soft delete flag |
| `current_results` | INTEGER | FK to results.id | Reference to current personality test results |
| `last_login_at` | TIMESTAMP | | Last successful login timestamp |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation date |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last profile update |

**Indexes:**
- `idx_users_email` (UNIQUE) - Fast email lookups
- `idx_users_username` (UNIQUE) - Fast username lookups  
- `idx_users_active_deleted` - Query active/non-deleted users

## Authentication & Session Management

### `user_sessions`
Manages active user sessions for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR(255) | PRIMARY KEY | UUID session token |
| `user_id` | INTEGER | NOT NULL, FK to users.id | Owner of the session |
| `device_info` | VARCHAR(500) | | Browser/device information |
| `ip_address` | VARCHAR(45) | | IP address of the session |
| `is_active` | BOOLEAN | DEFAULT 1 | Session active status |
| `expires_at` | TIMESTAMP | NOT NULL | Session expiration time |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Session creation time |
| `last_accessed_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last activity timestamp |

**Indexes:**
- `idx_sessions_user_active` - Query user's active sessions
- `idx_sessions_expires` - Clean up expired sessions

### `password_reset_tokens`
Temporary tokens for password reset functionality.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Token identifier |
| `user_id` | INTEGER | NOT NULL, FK to users.id | User requesting reset |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | Secure reset token |
| `expires_at` | TIMESTAMP | NOT NULL | Token expiration time |
| `used_at` | TIMESTAMP | | When token was used (if applicable) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Token creation time |

### `email_verification_tokens`
Tokens for email address verification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Token identifier |
| `user_id` | INTEGER | NOT NULL, FK to users.id | User verifying email |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | Verification token |
| `email` | VARCHAR(255) | NOT NULL | Email being verified |
| `expires_at` | TIMESTAMP | NOT NULL | Token expiration time |
| `verified_at` | TIMESTAMP | | Verification completion time |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Token creation time |

## Role-Based Access Control (RBAC)

### `roles`
Defines available user roles in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Role identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Role name (e.g., 'admin', 'user') |
| `description` | TEXT | | Human-readable role description |
| `is_active` | BOOLEAN | DEFAULT 1 | Role availability status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Role creation time |

**Default Roles:**
- `admin` - Full system administrator
- `moderator` - Content moderation privileges  
- `user` - Standard user privileges
- `premium_user` - Premium user with extended features

### `permissions`
Defines granular permissions for system resources.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Permission identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Permission name |
| `description` | TEXT | | Human-readable description |
| `resource` | VARCHAR(100) | | Resource type (users, posts, results) |
| `action` | VARCHAR(50) | | Action type (create, read, update, delete) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Permission creation time |

### `role_permissions`
Junction table linking roles to their permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `role_id` | INTEGER | PRIMARY KEY, FK to roles.id | Role identifier |
| `permission_id` | INTEGER | PRIMARY KEY, FK to permissions.id | Permission identifier |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Assignment time |

### `user_roles`
Junction table assigning roles to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | INTEGER | PRIMARY KEY, FK to users.id | User identifier |
| `role_id` | INTEGER | PRIMARY KEY, FK to roles.id | Role identifier |
| `assigned_by` | INTEGER | FK to users.id | Who assigned this role |
| `assigned_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Assignment time |
| `expires_at` | TIMESTAMP | | Optional role expiration |

## Security & Auditing

### `user_security_logs`
Comprehensive audit log for security events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Log entry identifier |
| `user_id` | INTEGER | FK to users.id | User associated with event |
| `event_type` | VARCHAR(100) | NOT NULL | Event type (login, logout, password_change) |
| `ip_address` | VARCHAR(45) | | IP address of the event |
| `user_agent` | VARCHAR(500) | | Browser/client information |
| `success` | BOOLEAN | DEFAULT 1 | Whether event was successful |
| `failure_reason` | VARCHAR(255) | | Reason for failure (if applicable) |
| `metadata` | TEXT | | Additional event data (JSON format) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Event timestamp |

**Common Event Types:**
- `login` / `login_failed` - Authentication attempts
- `logout` - User logout
- `password_change` - Password updates
- `user_created` - New account creation
- `role_assigned` - Role changes

## Application Data

### `friends`
Social connections between users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | INTEGER | PRIMARY KEY, FK to users.id | User making/receiving request |
| `friend_user_id` | INTEGER | PRIMARY KEY, FK to users.id | Friend user |
| `status` | VARCHAR(20) | DEFAULT 'pending' | Friendship status |
| `requested_by` | INTEGER | NOT NULL, FK to users.id | Who initiated the request |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Request creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last status change |

**Friend Status Values:**
- `pending` - Friend request sent, awaiting response
- `accepted` - Friendship confirmed
- `blocked` - User has blocked the other

### `results`
Personality test results storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Result identifier |
| `user_id` | INTEGER | NOT NULL, FK to users.id | User who took the test |
| `extraversion` | REAL | | Extraversion score |
| `agreeableness` | REAL | | Agreeableness score |
| `conscientiousness` | REAL | | Conscientiousness score |
| `emotional_stability` | REAL | | Emotional stability score |
| `intellect_imagination` | REAL | | Intellect/imagination score |
| `test_version` | VARCHAR(50) | | Version of test taken |
| `is_current` | BOOLEAN | DEFAULT 0 | Is this the user's active result |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Test completion time |

### `posts`
User content posts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Post identifier |
| `title` | VARCHAR(255) | NOT NULL | Post title |
| `body` | TEXT | | Post content |
| `user_id` | INTEGER | NOT NULL, FK to users.id | Post author |
| `status` | VARCHAR(20) | DEFAULT 'draft' | Publication status |
| `visibility` | VARCHAR(20) | DEFAULT 'public' | Visibility level |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Post creation time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last edit time |

**Post Status Values:**
- `draft` - Unpublished draft
- `published` - Live post
- `archived` - Archived post
- `deleted` - Soft-deleted post

**Visibility Levels:**
- `public` - Visible to everyone
- `friends` - Visible to friends only
- `private` - Visible to author only

## Relationships & Foreign Keys

### Primary Relationships
- `users.current_results` → `results.id` (One-to-One)
- `user_sessions.user_id` → `users.id` (Many-to-One)
- `results.user_id` → `users.id` (Many-to-One)
- `posts.user_id` → `users.id` (Many-to-One)

### Authentication Relationships
- `password_reset_tokens.user_id` → `users.id`
- `email_verification_tokens.user_id` → `users.id`
- `user_security_logs.user_id` → `users.id`

### RBAC Relationships
- `user_roles.user_id` → `users.id`
- `user_roles.role_id` → `roles.id`
- `user_roles.assigned_by` → `users.id`
- `role_permissions.role_id` → `roles.id`
- `role_permissions.permission_id` → `permissions.id`

### Social Relationships
- `friends.user_id` → `users.id`
- `friends.friend_user_id` → `users.id`
- `friends.requested_by` → `users.id`
