
````markdown
# 📱 Social App API Collection

This repository contains API documentation for the **Social App** backend, exported via Postman Collection. The collection covers user authentication, profile management, posting, commenting, events, and more.

## 🌐 Base URLs

- **Local:** `http://localhost:4000`
- **Variable Used:** `{{local}}` or `{{base_URL}}`

---

## 🔐 Authentication

### 1. Signup

- **Endpoint:** `POST /auth/signup`
- **Body:**

```json
{
  "name": "shubham",
  "email": "abcddddd@gmail.com",
  "password": "123",
  "confirmPassword": "123"
}
````

* **Response:**

```json
{
  "success": true,
  "message": "User created successfully"
}
```

---

### 2. Login

* **Endpoint:** `POST /auth/login`
* **Body:**

```json
{
  "email": "abcddddd@gmail.com",
  "password": "123"
}
```

* **Response:**

```json
{
  "success": true,
  "token": "your_jwt_token"
}
```

---

## 👤 User APIs

### 3. Update User Profile

* **Endpoint:** `POST /user/update`
* **Body:**

```json
{
  "bio": "Software Developer",
  "address": "Pune, India",
  "profileImage": null
}
```

---

### 4. Get Current User

* **Endpoint:** `GET /user/getUser`

---

### 5. Follow a User

* **Endpoint:** `POST /user/follow`
* **Body:**

```json
{
  "postId": "68069ce16a3d44d7b7a12e89"
}
```

---

## 📝 Post APIs

### 6. Create Post

* **Endpoint:** `POST /post/createPost`
* **Body:**

```json
{
  "discription": "New post",
  "media": "new media",
  "postType": "public"
}
```

---

### 7. Get Post 

* **Endpoint:** `GET /post/:postId`

* **Endpoint:** `GET /post/user`

* **Endpoint:** `GET /post/all/allPosts/?filter`

EX :- `/post/all/allPosts/?filter=0` --> all without filter
      `/post/all/allPosts/?filter=1` --> lastest posts

---
---
### 8. Like Post

* **Endpoint:** `POST /post/like`
* **Body:**

```json
{
  "postId": "685691110f598dbd55acec11"
}
```

---

### 9. Comment on Post

* **Endpoint:** `POST /post/comment`
* **Body:**

```json
{
  "postId": "685691110f598dbd55acec11",
  "text": "Hi good post"
}
```

---

### 10. Get Comments for a Post

* **Endpoint:** `GET /post/comment/:postId`

---

### 11. Save Post 

* **Endpoint:** `POST /post/savePost`
```json
{
  "postId": "685691110f598dbd55acec11",
}
```

** Endpoint: **  `GET /get/save`
---

## 🎫 Ticket & Event APIs

### 12. Create Ticket

* **Endpoint:** `POST /event/createTicket`
* **Form Data:**

```
name: Prem
price: 200
remTicket: 100
```

---

### 13. Create Event

* **Endpoint:** `POST /event/createEvent`
* **Form Data:**

```
ticket: 6856a9af6d10d773b79a6b0f
title: new event
des: dsafsadfds
banner: <file>
date: asdfsdf
time: asdfsdfdsfsdf
isEventOnline: false
location: pune
organizer: Shham
speakerspeakers: 
```

---

### 14. Get Events

* **Endpoint:** `GET /event/getEvent`

---

---

### 15. Create Story 

* **Endpoint:** `POST /user/upload/story`

```
FormData --> one or multiple 
{
  media : File
}
```
---

---
### 16. Get Story of following users

* **EndPoint:** `GET /user/story`
---

## 🧪 Testing & Environment

* The collection uses environment variables like `{{local}}` and `{{base_URL}}`. Be sure to set them in your Postman environment before running the APIs.

---

## 📂 Importing to Postman

1. Download the `.postman_collection.json` file.
2. Open Postman.
3. Click `Import` > `File` and select the downloaded file.
4. Create a new environment and define `local` and `base_URL` variables accordingly.

---

## 📫 Feedback

Feel free to open issues or PRs for improvements. Let's build better APIs together! 🚀

```

