# Edify - Scholarship Management System (Server Side)

The **Edify** server-side repository provides the backend services for the Edify platform. It handles user authentication, data management, and secure operations, enabling seamless communication between the frontend and the database.


---

## 📜 Features

### 🔧 Core Features
- **User Authentication**:
  - Email/password-based authentication.
  - JWT token-based session management.
- **Role Management**:
  - Default roles: User, Moderator, Admin.
  - Role-based access control for API endpoints.
- **CRUD Operations**:
  - Scholarships: Add, edit, delete, and fetch scholarship data.
  - Applications: Manage applications and statuses.
  - Reviews: Manage user reviews for scholarships.
- **Payment Integration**:
  - Handle application fees securely using payment gateways (e.g., Stripe/SSL-Commerz).
- **Error Handling**:
  - Comprehensive error handling and validation for secure operations.

---

## 💻 Technologies Used

### Backend:
- **Node.js**: Server runtime.
- **Express.js**: Web framework for building APIs.

### Database:
- **MongoDB**: NoSQL database for storing data.
  - Secured using environment variables.

### Authentication:
- **Firebase Authentication**: For validating user credentials.
- **JWT**: For securing API routes.

### Payment Gateway:
- **Stripe**: Secure and flexible payment solutions.

---



## 🔒 Security

- Environment variables are used to secure sensitive keys.
- JWT ensures secure access to protected routes.
- Role-based middleware restricts access to sensitive endpoints.

---

## 📧 Contact

For any queries or suggestions, feel free to reach out:

- **Email**: zahid.official8@gmail.com
- **LinkedIn**: [https://www.linkedin.com/in/zahid-web](https://www.linkedin.com/in/zahid-web/) 