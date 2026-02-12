# Socket.IO Events - Simple Reference

## 🔌 Connection

**Connect to:** `ws://localhost:3000`

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_AUTH_TOKEN' }
});
```

---

## 📥 Events to Listen (Receive)

### 1. connection-success
Fired when connected successfully.

**Response:**
```json
{
  "success": true,
  "message": "Connected to chat server",
  "userId": "user_id",
  "username": "john_doe"
}
```

---

### 2. connection-error
Fired when connection fails.

**Response:**
```json
{
  "message": "User already connected from another device"
}
```

---

### 3. message-sent
Fired back to sender after sending message.

**Response:**
```json
{
  "success": true,
  "message": {
    "_id": "msg_id",
    "content": "Hello",
    "type": "text",
    "senderType": "user",
    "senderId": {...},
    "createdAt": "2026-02-12T05:30:00Z",
    "chatId": "chat_id"
  }
}
```

---

### 4. new-message
Fired to recipients when they receive a message.

**Response:** Same as `message-sent`

---

### 5. message-error
Fired when message fails.

**Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

---

## 📤 Events to Emit (Send)

### 1. send-message

**Text Message (User):**
```json
{
  "content": "Hello, I need help",
  "type": "text"
}
```

**Text Message (Admin):**
```json
{
  "chatId": "chat_id",
  "content": "How can I help?",
  "type": "text"
}
```

**Image Message:**
```json
{
  "type": "image",
  "image": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "public_id": "contact-us/images/abc123"
  }
}
```

**Voice Message:**
```json
{
  "type": "voice",
  "voice": {
    "url": "https://res.cloudinary.com/.../voice.mp3",
    "public_id": "contact-us/voices/xyz789",
    "duration": 30
  }
}
```

---

## 🔄 Complete Flow

### User Sends Text Message
```javascript
// Send
socket.emit('send-message', {
  content: "Hello",
  type: "text"
});

// Listen for confirmation
socket.on('message-sent', (data) => {
  console.log('Message sent:', data);
});
```

### User Sends Image
```javascript
// 1. Upload image first
const formData = new FormData();
formData.append('image', imageFile);

const res = await fetch('/api/v1/contactUs/upload/image', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { data } = await res.json();

// 2. Send via socket
socket.emit('send-message', {
  type: 'image',
  image: {
    url: data.url,
    public_id: data.public_id
  }
});
```

### Admin Receives Message
```javascript
socket.on('new-message', (data) => {
  console.log('New message from user:', data.message);
  // Display message in chat
});
```

---

## 📝 Notes

- **Admin must include `chatId`** when sending messages
- **Upload files first** via REST API before sending image/voice
- **FCM notifications** are sent automatically to offline users
- **Language support** is automatic based on user preference
