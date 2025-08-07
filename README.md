
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

* **Endpoint:** `POST /post/save`
```json
{
  "postId": "685691110f598dbd55acec11",
}
```
* ** Endpoint: **  `GET /get/save` fetch saved post for a user
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
### GET Own Sotry
* **Endpoint:** `GET /user/story/self`

---
### 16. Get Story of following users

* **EndPoint:** `GET /user/story`
---

### 17. Create Showcase

* ** EndPoint:** `POST /showcase/create`
```
Formdata
{
  logo : imagefile,
  bannerImage : imagefile,
  images: [multipleimages],
  category:App
  projectTitle:new project
  tagline:creating first showcsas
  description:jaskdlfjklsdjflksad
  problem:akdsjflkadsj fkladsj 
  solution:lfkjdskf jsajsdk jsdklfj sdlfj sdljf 
  revenueModel:dfsd kjfsldlkfl j fjsdlk fkljs
  demoVideoLink:sdj fksdflksdfas
  tags:[fkasjd,fskjfd]
  projectLinks:sadkjfkdsjfkldsajf kadslf
}
```
---
### 18. GET Showcase

* ** EndPoint:** `GET /showcase/get`
---

### 19. Get news 
* **Endponts:** `GET /news?limit={number}&category={string}`
--- 

### 20. Delete post
* **Endpoint :** `DELETE /post/:postId`
---

### 21. DELETE Story
* **Endpoint :** `DELETE /user/story/:storyId`
---

### 22. Create Portfolio 
* **Endpoin :** `POST /user/portfolio/
```
 Formdata : {
  logo : file
  description
  link
 } 
```
---

### 23. Get user showcase 
* **Endpoint :** `/get /showcase/user`
---
