# Authentication and Authorization

## Overview

The monitoring backend uses Better Auth with MongoDB persistence. Auth routes are
mounted under:

```text
http://localhost:3000/api/auth
```

The implementation is in
[Auth/auth.js](../app/monitoring-backend/Auth/auth.js), and the Better Auth handler
is mounted in [src/server.js](../app/monitoring-backend/src/server.js).

The current configuration provides:

- Email/password authentication.
- A minimum password length of eight characters.
- Email verification disabled for local development.
- MongoDB-backed users, accounts, sessions, and verification records.
- `user` as the default role.
- `admin` as the elevated role.
- Better Auth admin endpoints protected by the authenticated admin role.
- Existing users without a role normalized to `user` during startup.

## API documentation

Better Auth provides native API documentation for all dynamically mounted auth,
admin, session, and two-factor routes.

| URL | Purpose |
|---|---|
| `http://localhost:3000/api/auth/reference` | Interactive Better Auth API reference |
| `http://localhost:3000/api/auth/open-api/generate-schema` | Generated Better Auth OpenAPI JSON |

The Express Swagger UI is available separately at:

```text
http://localhost:3000/api-docs
```

It documents the backend health and log-file routes. Better Auth routes are
documented through its native OpenAPI plugin rather than `swagger-autogen`
because those endpoints are mounted dynamically.

## Postman setup

Create a Postman environment with:

```text
baseUrl = http://localhost:3000
frontendOrigin = http://localhost:5173
```

For every request with a JSON body, add:

```http
Content-Type: application/json
Origin: http://localhost:5173
```

The `Origin` header is required by Better Auth's CSRF protection. Do not disable
CSRF protection to work around a missing header.

Enable Postman's cookie jar. A successful sign-in stores the session cookie, which
Postman must send with subsequent authenticated requests.

## Email/password endpoints

### Sign up

```http
POST {{baseUrl}}/api/auth/sign-up/email
```

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Password123!"
}
```

New users receive the `user` role.

### Sign in

```http
POST {{baseUrl}}/api/auth/sign-in/email
```

```json
{
  "email": "test@example.com",
  "password": "Password123!",
  "rememberMe": true
}
```

The response sets the Better Auth session cookie.

### Get the current session

```http
GET {{baseUrl}}/api/auth/get-session
```

No body. The request must include the session cookie.

### Sign out

```http
POST {{baseUrl}}/api/auth/sign-out
```

No body. The request must include the session cookie.

### Update the current user

```http
POST {{baseUrl}}/api/auth/update-user
```

```json
{
  "name": "Updated Test User"
}
```

### Change password

```http
POST {{baseUrl}}/api/auth/change-password
```

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!",
  "revokeOtherSessions": true
}
```

### Request a password reset

```http
POST {{baseUrl}}/api/auth/forget-password
```

```json
{
  "email": "test@example.com",
  "redirectTo": "http://localhost:5173/reset-password"
}
```

An email provider is not configured in the local backend, so this endpoint does
not currently deliver reset emails.

### Reset a password

```http
POST {{baseUrl}}/api/auth/reset-password
```

```json
{
  "token": "RESET_TOKEN",
  "newPassword": "NewPassword123!"
}
```

### Session management

All of these require the current session cookie:

```http
GET  {{baseUrl}}/api/auth/list-sessions
POST {{baseUrl}}/api/auth/revoke-sessions
POST {{baseUrl}}/api/auth/revoke-other-sessions
```

To revoke one session:

```http
POST {{baseUrl}}/api/auth/revoke-session
```

```json
{
  "token": "SESSION_TOKEN"
}
```

## Roles and admin endpoints

The admin plugin uses:

| Role | Meaning |
|---|---|
| `user` | Default role for normal accounts |
| `admin` | Elevated role allowed to use admin operations |

### Bootstrap the first admin

After signing up, copy the user's `id` from the sign-up or session response.
Add that ID to `.env`:

```text
ADMIN_USER_IDS=the-user-id
```

For multiple bootstrap administrators, use a comma-separated list:

```text
ADMIN_USER_IDS=first-user-id,second-user-id
```

Restart the backend after changing this variable. IDs listed in
`ADMIN_USER_IDS` are treated as administrators.

### Set a user's role

Once an administrator session exists:

```http
POST {{baseUrl}}/api/auth/admin/set-role
```

```json
{
  "userId": "TARGET_USER_ID",
  "role": "admin"
}
```

To demote a user:

```json
{
  "userId": "TARGET_USER_ID",
  "role": "user"
}
```

This request requires the administrator's session cookie and the `Origin` header.

### Other admin routes

These routes are provided by Better Auth's admin plugin and require an
administrator session unless stated otherwise:

```text
GET  /api/auth/admin/get-user?id=USER_ID
POST /api/auth/admin/create-user
POST /api/auth/admin/update-user
GET  /api/auth/admin/list-users
GET  /api/auth/admin/list-user-sessions
POST /api/auth/admin/ban-user
POST /api/auth/admin/unban-user
POST /api/auth/admin/impersonate-user
POST /api/auth/admin/stop-impersonating
POST /api/auth/admin/revoke-user-session
POST /api/auth/admin/revoke-user-sessions
POST /api/auth/admin/remove-user
POST /api/auth/admin/set-user-password
```

Create an account as an administrator:

```http
POST {{baseUrl}}/api/auth/admin/create-user
```

```json
{
  "name": "Managed User",
  "email": "managed@example.com",
  "password": "Password123!",
  "role": "user"
}
```

The exact request fields for ban, impersonation, session revocation, and user
updates should be sent according to the route being used. All admin routes use
the same session cookie and `Origin` header requirements.

## Important limitations

- No OAuth providers are configured.
- No email or SMTP provider is configured.
- No custom application routes currently enforce roles; the existing `/test` and
  `/health` routes are not admin-only.
- Custom admin/user application routes should check the authenticated session
  and the user's role before performing protected operations.
- `JWT_SECRET` and `JWT_EXPIRES_IN` are legacy variables and are not used by
  Better Auth.
