# Upload Endpoints Summary

## New Endpoints Created

Two new upload endpoints have been added to the Contact Us API:

### 1. POST /contactUs/upload/image
- **Purpose:** Upload images before sending via socket
- **Auth:** Required (User or Admin)
- **Form Field:** `image`
- **Supported Formats:** jpg, jpeg, png, gif
- **Cloudinary Folder:** `contact-us/images`
- **Response:**
  ```json
  {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "public_id": "contact-us/images/abc123"
  }
  ```

### 2. POST /contactUs/upload/voice
- **Purpose:** Upload voice files before sending via socket
- **Auth:** Required (User or Admin)
- **Form Field:** `voice`
- **Supported Formats:** mp3, wav, ogg, webm
- **Cloudinary Folder:** `contact-us/voices`
- **Response:**
  ```json
  {
    "url": "https://res.cloudinary.com/.../voice.mp3",
    "public_id": "contact-us/voices/xyz789",
    "duration": 15
  }
  ```

## Integration Flow

1. **Upload file** → Call POST `/upload/image` or `/upload/voice`
2. **Get URL** → Receive Cloudinary URL in response
3. **Send message** → Emit socket event with the URL

```javascript
// Step 1: Upload
const formData = new FormData();
formData.append('image', file);

const uploadRes = await fetch('/api/v1/contactUs/upload/image', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { data } = await uploadRes.json();

// Step 2: Send via socket
socket.emit('send-message', {
 type: 'image',
  image: {
    url: data.url,
    public_id: data.public_id
  }
});
```

## Files Modified/Created

1. ✅ `helpers/upload.helper.js` - Upload logic
2. ✅ `contactUs.controller.js` - Upload controllers
3. ✅ `contactUs.routes.js` - Upload routes
4. ✅ `helpers/responseMessages.js` - Upload messages
5. ✅ `docs/contact-us-api.md` - Documentation updated
