# 🚗 DrivEase

DrivEase is a full-stack web application that modernizes the process of registering and managing driving schools. Instead of requiring students to visit schools in person, the platform allows them to browse schools, register online, submit enrollment requests, and manage their driving journey digitally.

The project is being developed as part of an internship and aims to demonstrate modern full-stack software development practices using Angular, Node.js, Express, and PostgreSQL.

---

# Features

## Student

- Browse available driving schools
- View school details
- Create an account
- Secure login using JWT authentication
- Submit enrollment requests
- View enrollment status
- Access personal dashboard

---

## Driving School Admin

- Manage enrolled students
- Accept or reject enrollment requests
- Manage instructors
- Manage lesson schedules
- View school information

---

## Instructor

- View assigned lesson schedules
- View assigned students

---

## Platform Admin

- Manage registered driving schools
- Approve or remove schools
- Manage platform data
- Confirmation dialog before destructive actions

---

# Tech Stack

## Frontend

- Angular
- TypeScript
- HTML
- CSS
- Angular Reactive Forms

## Backend

- Node.js
- Express.js
- JWT Authentication
- bcrypt

## Database

- PostgreSQL

---

# Project Structure

```
DrivEase
│
├── frontend/
│   ├── Angular Components
│   ├── Services
│   ├── Guards
│   ├── Assets
│   └── Routing
│
├── backend/
│   ├── Express API
│   ├── Routes
│   ├── Controllers
│   ├── Database
│   ├── Middleware
│   └── Authentication
│
└── README.md
```

---

# Authentication

The application uses:

- JWT (JSON Web Tokens)
- Password hashing with bcrypt
- Protected API routes
- Role-based authorization

---

# Database

PostgreSQL stores:

- Users
- Students
- Driving Schools
- Instructors
- Vehicles
- Lesson Schedules
- Enrollment Requests
- Student Enrollments

---

# Current Progress

✔ Landing Page

✔ Login

✔ Registration

✔ JWT Authentication

✔ Driving School Listing

✔ School Details

✔ Student Dashboard

✔ Platform Admin Dashboard

✔ Enrollment Request System

✔ Reusable Confirmation Dialog Component

✔ PostgreSQL Integration

✔ Responsive User Interface

---

# Planned Features

- Email verification
- Notifications
- Lesson calendar
- Driving lesson progress tracking
- Search and filtering
- School ratings and reviews
- Analytics dashboard
- File/document uploads

---

# Installation

## Clone the repository

```bash
git clone https://github.com/ZeQ1R/DeVenture.git
```

---

## Install frontend

```bash
cd frontend
npm install
ng serve
```

Runs on

```
http://localhost:4200
```

---

## Install backend

```bash
cd backend
npm install
npm start
```

Runs on

```
http://localhost:3000
```

---

# Environment Variables

Create a `.env` file inside the backend folder.

Example:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=drivease
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret
```

> Do not commit your `.env` file to GitHub.

---

# Screenshots

Screenshots will be added as the project progresses.

---

# Future Improvements

- Docker support
- Unit testing
- End-to-end testing
- CI/CD pipeline
- Cloud deployment
- REST API documentation
- Mobile responsive improvements

---

# Author

**Zeqir Xheladini**

Computer Science Student

Built as an internship project to demonstrate full-stack software engineering skills using Angular, Node.js, Express, and PostgreSQL.
