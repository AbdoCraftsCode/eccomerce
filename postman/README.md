# Postman Collection - Contact Us API

This folder contains Postman collection and environment files for testing the Contact Us API endpoints.

## Files

- **contact-us.postman_collection.json** - Complete API collection with all endpoints
- **environment.local.json** - Local development environment configuration

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select `contact-us.postman_collection.json`
4. Click **Import**

### 2. Import Environment

1. Click **Environments** in the left sidebar
2. Click **Import** button
3. Select `environment.local.json`
4. Click **Import**
5. Select "Contact Us - Local" from the environment dropdown (top right)

### 3. Configure Environment Variables

Click on "Contact Us - Local" environment and set:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | Base API URL | `http://localhost:3000/api/v1` |
| `authToken` | User authentication token | Get from login response |
| `adminToken` | Admin authentication token | Get from admin login |
| `language` | Preferred language | `en` or `ar` |
| `socketUrl` | Socket.IO server URL | `http://localhost:3000` |

### 4. Get Authentication Tokens

First, login as a user and admin to get tokens:

**User Login:**
```bash
POST http://localhost:3000/api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

Copy the token from response and paste into `authToken` variable.

**Admin Login:**
```bash
POST http://localhost:3000/api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

Copy the token from response and paste into `adminToken` variable.

## Collection Structure

### 1. User Endpoints
- **Get My Chat** - Fetch user's own chat with pagination

### 2. Admin Endpoints
- **Get All Chats (Admin)** - Fetch all chats (Admin/Owner only)
- **Get Chat by ID (Admin)** - Fetch specific chat by ID (Admin/Owner only)

### 3. Error Cases
- **Unauthorized Access** - Test without authentication
- **Admin Endpoint with User Token** - Test authorization
- **Invalid Chat ID** - Test validation

## Running Tests

The collection includes automated tests for each endpoint:

1. Select "Contact Us API" collection
2. Click **Run** button
3. Select environment "Contact Us - Local"
4. Click **Run Contact Us API**

Tests will verify:
- Status codes
- Response structure
- Required fields
- Data types
- Pagination
- Error handling

## Collection Variables

The collection automatically saves:
- `chatId` - From "Get My Chat" response
- `adminChatId` - From "Get All Chats" response

These are used in subsequent requests.

## Language Testing

To test Arabic responses:
1. Change `language` variable to `ar`
2. Run requests
3. Responses will contain Arabic messages

## Socket.IO Testing

For Socket.IO testing, use a Socket.IO client or browser extension:

**Connection:**
```javascript
io('http://localhost:3000', {
  auth: { token: 'YOUR_AUTH_TOKEN' }
});
```

**Send Message:**
```javascript
socket.emit('send-message', {
  content: "Test message",
  type: "text"
});
```

See `docs/contact-us-api.md` for complete Socket.IO documentation.

## Troubleshooting

### Token Expired
If you get 401 errors, refresh your tokens by logging in again.

### Connection Refused
Ensure the backend server is running on `http://localhost:3000`

### 403 Forbidden
Make sure you're using the correct token (admin token for admin endpoints)

## Additional Resources

- [Frontend Integration Guide](../docs/contact-us-api.md)
- [Implementation Plan](../.gemini/antigravity/brain/*/implementation_plan.md)

## Support

For issues or questions, contact the backend development team.
