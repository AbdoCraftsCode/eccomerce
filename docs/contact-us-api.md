# Contact Us API - Frontend Integration Guide

This document provides comprehensive documentation for integrating the Contact Us (Chat Support) feature in your frontend application.

## Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [Socket.IO Events](#socketio-events)
3. [Authentication](#authentication)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Complete Integration Example](#complete-integration-example)

---

## REST API Endpoints

### Base URL
```
http://localhost:3000/api/v1/contactUs
```

### 1. Get User's Chat (User)

**Endpoint:** `GET /my-chat`

**Auth Required:** YES (User token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 50 | Messages per page (max 100) |

**Example Request:**
```javascript
fetch('http://localhost:3000/api/v1/contactUs/my-chat?page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer USER_TOKEN',
    'Accept-Language': 'en' // or 'ar' for Arabic
  }
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Chat fetched successfully",
  "data": {
    "_id": "chat_id",
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "profiePicture": { "secure_url": "...", "public_id": "..." }
    },
    "lastMessageSentAt": "2026-02-12T05:30:00Z",
    "totalMessages": 45,
    "messages": [
      {
        "_id": "msg_id",
        "content": "Hello, I need help",
        "type": "text",
        "senderType": "user",
        "senderId": "user_id",
        "createdAt": "2026-02-12T05:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### 2. Get All Chats (Admin Only)

**Endpoint:** `GET /admin/chats`

**Auth Required:** YES (Admin/Owner token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Chats per page (max 100) |

**Example Request:**
```javascript
fetch('http://localhost:3000/api/v1/contactUs/admin/chats?page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer ADMIN_TOKEN',
    'Accept-Language': 'en'
  }
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Chats fetched successfully",
  "data": [
    {
      "_id": "chat_id",
      "user": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "avatar": { "secure_url": "...", "public_id": "..." }
      },
      "lastMessage": {
        "content": "Hello",
        "type": "text",
        "senderType": "user"
      },
      "lastMessageSentAt": "2026-02-12T05:30:00Z",
      "totalMessages": 10,
      "createdAt": "2026-02-10T12:00:00Z",
      "updatedAt": "2026-02-12T05:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "meta": {
    "totalChats": 100,
    "sortedBy": "lastMessageSentAt",
    "order": "desc"
  }
}
```

---

### 3. Get Chat by ID (Admin Only)

**Endpoint:** `GET /admin/chats/:chatId`

**Auth Required:** YES (Admin/Owner token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chatId | string | Yes | MongoDB ObjectID of the chat |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 50 | Messages per page (max 100) |

**Example Request:**
```javascript
fetch('http://localhost:3000/api/v1/contactUs/admin/chats/65f8a3b2c4d5e6f7a8b9c0d1?page=1&limit=50', {
  headers: {
    'Authorization': 'Bearer ADMIN_TOKEN',
    'Accept-Language': 'en'
  }
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Chat fetched successfully",
  "data": {
    "_id": "chat_id",
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "profiePicture": { "secure_url": "...", "public_id": "..." }
    },
    "lastMessageSentAt": "2026-02-12T05:30:00Z",
    "totalMessages": 45,
    "messages": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 45,
      "pages": 1
    }
  }
}
```

---

### 4. Upload Image (User/Admin)

**Endpoint:** `POST /upload/image`

**Auth Required:** YES (User or Admin token)

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | file | Yes | Image file (jpg, jpeg, png, gif) |

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('image', imageFile); // imageFile is a File object

fetch('http://localhost:3000/api/v1/contactUs/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Accept-Language': 'en'
  },
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "public_id": "contact-us/images/abc123"
  }
}
```

**Use Case:** Upload image first, then send message via socket with the returned URL.

---

### 5. Upload Voice (User/Admin)

**Endpoint:** `POST /upload/voice`

**Auth Required:** YES (User or Admin token)

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| voice | file | Yes | Audio file (mp3, wav, ogg, webm) |

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('voice', voiceFile); // voiceFile is a File object

fetch('http://localhost:3000/api/v1/contactUs/upload/voice', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Accept-Language': 'en'
  },
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/.../voice.mp3",
    "public_id": "contact-us/voices/xyz789",
    "duration": 15
  }
}
```

**Use Case:** Upload voice first, then send message via socket with the returned URL and duration.

---

## Socket.IO Events

### Connection

**Server URL:**
```
ws://localhost:3000
```

**Authentication:**
Socket connections require authentication token in the connection query:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_AUTH_TOKEN'
  }
});
```

---

### Events to Listen

#### 1. `connection-success`
Emitted when successfully connected to the chat server.

**Payload:**
```json
{
  "success": true,
  "message": "Connected to chat server",
  "userId": "user_id",
  "username": "john_doe"
}
```

#### 2. `connection-error`
Emitted when connection fails (e.g., already connected from another device).

**Payload:**
```json
{
  "message": "User already connected from another device"
}
```

#### 3. `message-sent`
Emitted back to the sender when their message is successfully sent.

**Payload:**
```json
{
  "success": true,
  "message": {
    "_id": "message_id",
    "content": "Hello",
    "type": "text",
    "senderType": "user",
    "senderId": {...},
    "image": {},
    "voice": {},
    "createdAt": "2026-02-12T05:30:00Z",
    "chatId": "chat_id"
  }
}
```

#### 4. `new-message`
Emitted to recipient(s) when they receive a new message.

**Payload:** Same as `message-sent`

#### 5. `message-error`
Emitted when message sending fails.

**Payload:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

---

### Events to Emit

#### 1. `send-message`
Send a new message in the chat.

**User Payload:**
```javascript
socket.emit('send-message', {
  content: "Hello, I need help with my order",
  type: "text" // "text", "image", or "voice"
});
```

**Admin Payload:**
```javascript
socket.emit('send-message', {
  chatId: "chat_id", // Required for admin
  content: "How can I help you?",
  type: "text"
});
```

**Image Message:**
```javascript
socket.emit('send-message', {
  type: "image",
  image: {
    url: "https://cloudinary.com/...",
    public_id: "image_public_id"
  }
});
```

**Voice Message:**
```javascript
socket.emit('send-message', {
  type: "voice",
  voice: {
    url: "https://cloudinary.com/...",
    public_id: "voice_public_id",
    duration: 30 // seconds
  }
});
```

---

## Authentication

### User Authentication
Include the authentication token in the request headers:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_USER_TOKEN'
}
```

### Admin Authentication
Same as user authentication, but the token must belong to an Admin or Owner account.

### Language Support
Include the language preference in the headers:

```javascript
headers: {
  'Accept-Language': 'ar' // 'en' for English, 'ar' for Arabic
}
```

---

## Data Models

### Message Object
```typescript
interface Message {
  _id: string;
  content?: string;         // For text messages
  image?: {                 // For image messages
    url: string;
    public_id: string;
  };
  voice?: {                 // For voice messages
    url: string;
    public_id: string;
    duration: number;
  };
  type: 'text' | 'image' | 'voice';
  senderType: 'user' | 'admin';
  senderId: string | UserObject;
  createdAt: Date;
}
```

### Chat Object
```typescript
interface Chat {
  _id: string;
  user: UserObject;
  messages: Message[];
  lastMessageSentAt: Date;
  totalMessages: number;
  createdAt: Date;
  updatedAt: Date;
  pagination?: PaginationObject;
}
```

---

## Error Handling

### HTTP Error Responses

**400 - Bad Request**
```json
{
  "success": false,
  "message": "Invalid chat ID format"
}
```

**401 - Unauthorized**
```json
{
  "success": false,
  "message": "Not authenticated"
}
```

**403 - Forbidden**
```json
{
  "success": false,
  "message": "You are not authorized to access this resource"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "message": "Chat not found"
}
```

### Socket Error Events

Listen for `message-error` event:
```javascript
socket.on('message-error', (error) => {
  console.error('Message error:', error.message);
});
```

---

## Complete Integration Example

### React + Socket.IO Example

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatComponent() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connection-success', (data) => {
      console.log('Connected:', data);
    });

    newSocket.on('new-message', (data) => {
      setMessages(prev => [data.message, ...prev]);
    });

    newSocket.on('message-sent', (data) => {
      setMessages(prev => [data.message, ...prev]);
    });

    newSocket.on('message-error', (error) => {
      console.error('Error:', error.message);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  useEffect(() => {
    // Fetch chat history via REST API
    fetch('http://localhost:3000/api/v1/contactUs/my-chat?page=1&limit=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Language': 'en'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.data.messages);
        }
      });
  }, [token]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket) return;

    socket.emit('send-message', {
      content: inputMessage,
      type: 'text'
    });

    setInputMessage('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg._id} className={msg.senderType}>
            {msg.content}
            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
      <div className="input">
        <input
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

---

## Push Notifications (FCM)

The backend automatically sends Firebase Cloud Messaging (FCM) push notifications when:

1. **User sends message** → All admins receive notification
2. **Admin sends message** → The specific user receives notification

### Notification Payload
```json
{
  "notification": {
    "title": "New Customer Message" (or localized),
    "body": "John Doe sent you a message"
  },
  "data": {
    "type": "chat_message",
    "chatId": "chat_id"
  }
}
```

**Note:** Ensure users have granted FCM token which should be stored in the User model's `fcmToken` field.

---

## Best Practices

1. **Real-time Updates:** Use Socket.IO for real-time messaging
2. **Pagination:** Load chat history via REST API with pagination
3. **Reconnection:** Handle socket disconnections and reconnect automatically
4. **Error Handling:** Always listen for error events
5. **Loading States:** Show loading indicators while fetching data
6. **Optimistic UI:** Show sent messages immediately, confirm with `message-sent` event
7. **Language Support:** Always include `Accept-Language` header for localized responses

---

## Support

For issues or questions, please contact the backend team or refer to the Postman collection for additional examples.
