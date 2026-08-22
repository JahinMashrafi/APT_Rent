# 🏠 APT Rent

<p align="center">
  <strong>Web-Based Apartment Rental Management System</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Progress-yellow">
  <img src="https://img.shields.io/badge/Duration-8%20Weeks-blue">
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB">
  <img src="https://img.shields.io/badge/Backend-Node.js-339933">
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1">
</p>

---

## ✨ Overview

APT Rent is a modern web-based apartment rental management
system connecting **Tenants, Owners, and Administrators**.

### 🎯 What does APT Rent provide?

| 🏠 Property | 📅 Appointments | 📄 Contracts |
|---|---|---|
| Search & Filter | Viewing Requests | Digital Contracts |
| Map Discovery | Approval / Denial | Digital Signatures |

| 💳 Payments | 🔧 Maintenance | 🔐 Security |
|---|---|---|
| Rent Payments | Service Requests | JWT |
| Invoices | Status Tracking | RBAC |
| Receipts | Owner Monitoring | Secure APIs |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| 🎨 Frontend | React.js + Tailwind CSS |
| ⚙️ Backend | Node.js + Express.js |
| 🗄️ Database | PostgreSQL + Supabase |
| 🔐 Authentication | JWT |
| 💳 Payments | Stripe Test / Mock |
| 🗺️ Maps | Map Service API |
| 🧪 Testing | Postman |
| 🚀 Frontend Hosting | Vercel |
| 🚀 Backend Hosting | Render |

---

# 📅 Development Roadmap

> **8 Weeks → Design → Development → Testing → Deployment**

---

## 🟢 Week 01 — Foundation

**Architecture • Database • Environment**

<details>
<summary>🗄️ Database Setup</summary>

- [x] Design database schema
- [x] Create `User` table
- [x] Create `Property` table
- [x] Create `Appointment` table
- [x] Create `Contract` table
- [x] Create `Payment` table
- [x] Create `Maintenance` table
- [x] Define primary keys
- [x] Define foreign keys
- [x] Define relationships
- [x] Add constraints

</details>

<details>
<summary>⚙️ Development Environment</summary>

- [x] Initialize React project
- [x] Configure Tailwind CSS
- [x] Initialize Node.js backend
- [x] Configure Express
- [x] Configure environment variables
- [x] Connect render: postgress
- [x] Configure Git repository
- [x] Configure Vercel
- [x] Configure Render

</details>

<details>
<summary>🔌 External Services</summary>

- [ ] Configure Map API
- [ ] Configure Stripe test environment
- [ ] Verify API credentials
- [ ] Test external services

</details>

**Week 01:** `⬜ Started`

---

## 🟡 Week 02 — Authentication

**Backend Foundation • JWT • User Roles**

<details>
<summary>🔐 Authentication</summary>

- [x] User registration
- [x] User login
- [x] User logout
- [x] Password hashing
- [x] JWT generation
- [x] JWT validation
- [x] Authentication middleware
- [x] Protected routes
- [x] Authentication error handling

</details>

<details>
<summary>🎨 Authentication UI</summary>

- [x] Login page
- [x] Registration page
- [x] Form validation
- [x] Authentication state
- [x] Protected frontend routes

</details>

<details>
<summary>👥 User Roles</summary>

- [ ] Tenant role
- [ ] Owner role
- [ ] Admin role
- [ ] Role-based dashboard routing

</details>

**Week 02:** `⬜ Not Started`

---

## 🟠 Week 03 — APIs & RBAC

**REST API • Permissions • Dashboards**

<details>
<summary>🏠 Property API</summary>

- [ ] `GET /api/properties`
- [ ] `GET /api/properties/:id`
- [ ] `POST /api/properties`
- [ ] `PUT /api/properties/:id`
- [ ] `DELETE /api/properties/:id`
- [ ] Property ownership validation
- [ ] Error handling
- [ ] API testing

</details>

<details>
<summary>📅 Appointment API</summary>

- [ ] Create appointment
- [ ] Retrieve appointments
- [ ] Approve appointment
- [ ] Deny appointment
- [ ] Validate permissions
- [ ] Handle appointment conflicts

</details>

<details>
<summary>🛡️ RBAC</summary>

- [ ] Tenant permissions
- [ ] Owner permissions
- [ ] Admin permissions
- [ ] Protected Tenant endpoints
- [ ] Protected Owner endpoints
- [ ] Protected Admin endpoints
- [ ] Unauthorized access testing

</details>

<details>
<summary>📊 Dashboards</summary>

- [ ] Tenant dashboard
- [ ] Owner dashboard
- [ ] Admin dashboard
- [ ] Responsive layouts
- [ ] Authentication integration

</details>

**Week 03:** `⬜ Not Started`

---

## 🔵 Week 04 — Property Discovery

**Search • Filters • Maps**

<details>
<summary>🔎 Search & Filtering</summary>

- [ ] Property search
- [ ] Price filtering
- [ ] Availability filtering
- [ ] Search parameters
- [ ] Property listing UI
- [ ] Property details page

</details>

<details>
<summary>🗺️ Map Integration</summary>

- [ ] Integrate map service
- [ ] Display property locations
- [ ] Location selection
- [ ] Map-based search
- [ ] Five-kilometer radius search
- [ ] Display nearby properties

</details>

<details>
<summary>🏡 Owner Property Management</summary>

- [ ] Create property
- [ ] Edit property
- [ ] Delete property
- [ ] Property form validation
- [ ] Property ownership validation

</details>

**Week 04:** `⬜ Not Started`

---

## 🟣 Week 05 — Appointments & Contracts

**Viewing Requests • Digital Contracts**

<details>
<summary>📅 Appointments</summary>

- [ ] Tenant appointment request
- [ ] Owner appointment dashboard
- [ ] Approve appointment
- [ ] Deny appointment
- [ ] Appointment status
- [ ] Date validation
- [ ] Conflict handling

</details>

<details>
<summary>📄 Digital Contracts</summary>

- [ ] Contract data model
- [ ] Contract generation
- [ ] Property information
- [ ] Owner information
- [ ] Tenant information
- [ ] Contract retrieval
- [ ] Digital signature storage
- [ ] Contract review UI
- [ ] Contract signing UI
- [ ] Contract status

</details>

**Week 05:** `⬜ Not Started`

---

## 🟤 Week 06 — Payments & Maintenance

**Stripe • Invoices • Maintenance**

<details>
<summary>💳 Payments</summary>

- [ ] Configure Stripe
- [ ] Payment API
- [ ] Rent payment
- [ ] Payment authorization
- [ ] Transaction ID
- [ ] Payment status
- [ ] Successful payment handling
- [ ] Failed payment handling
- [ ] Duplicate payment protection
- [ ] Invoice generation
- [ ] Receipt generation
- [ ] Payment history

</details>

<details>
<summary>🔧 Maintenance</summary>

- [ ] Maintenance request API
- [ ] Maintenance request form
- [ ] Tenant submission
- [ ] Tenant status tracking
- [ ] Owner monitoring
- [ ] Admin monitoring
- [ ] Maintenance status
- [ ] Maintenance updates
- [ ] Authorization
- [ ] Validation

</details>

**Week 06:** `⬜ Not Started`

---

## 🧪 Week 07 — Testing & QA

**Testing • Security • Bug Fixes**

<details>
<summary>🧪 API Testing</summary>

- [ ] Create Postman collection
- [ ] Authentication APIs
- [ ] Property APIs
- [ ] Appointment APIs
- [ ] Contract APIs
- [ ] Payment APIs
- [ ] Maintenance APIs
- [ ] Invalid request testing
- [ ] Unauthorized request testing
- [ ] HTTP status verification

</details>

<details>
<summary>🔗 Integration Testing</summary>

- [ ] Frontend ↔ Backend
- [ ] Backend ↔ Database
- [ ] Authentication flow
- [ ] RBAC flow
- [ ] Property workflow
- [ ] Appointment workflow
- [ ] Contract workflow
- [ ] Payment workflow
- [ ] Maintenance workflow

</details>

<details>
<summary>🔒 Security Testing</summary>

- [ ] JWT validation
- [ ] RBAC restrictions
- [ ] Password security
- [ ] Input validation
- [ ] Input sanitization
- [ ] Authorization checks
- [ ] Resource ownership
- [ ] Protected endpoints
- [ ] Sensitive data protection

</details>

<details>
<summary>🐛 Bug Fixing</summary>

- [ ] Record bugs
- [ ] Prioritize bugs
- [ ] Fix critical bugs
- [ ] Fix medium bugs
- [ ] Fix low-priority bugs
- [ ] Regression testing
- [ ] Final QA

</details>

**Week 07:** `⬜ Not Started`

---

## 🚀 Week 08 — Deployment & Finalization

**Production • Documentation • Presentation**

<details>
<summary>🌐 Deployment</summary>

- [ ] Deploy database
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Configure production environment variables
- [ ] Verify API
- [ ] Verify frontend
- [ ] Verify frontend ↔ backend connection

</details>

<details>
<summary>✅ End-to-End Testing</summary>

- [ ] Registration
- [ ] Login
- [ ] Tenant workflow
- [ ] Owner workflow
- [ ] Admin workflow
- [ ] Property workflow
- [ ] Search workflow
- [ ] Appointment workflow
- [ ] Contract workflow
- [ ] Payment workflow
- [ ] Maintenance workflow

</details>

<details>
<summary>📚 Documentation</summary>

- [ ] README
- [ ] Architecture documentation
- [ ] Database documentation
- [ ] API documentation
- [ ] Authentication documentation
- [ ] RBAC documentation
- [ ] Postman collection
- [ ] Screenshots
- [ ] Presentation slides
- [ ] Demo preparation

</details>

**Week 08:** `⬜ Not Started`

---

# 📊 Overall Progress

| Week | Phase | Status |
|---|---|---|
| 01 | 🏗️ Foundation | ⬜ |
| 02 | 🔐 Authentication | ⬜ |
| 03 | ⚙️ APIs & RBAC | ⬜ |
| 04 | 🗺️ Property Discovery | ⬜ |
| 05 | 📄 Contracts | ⬜ |
| 06 | 💳 Payments & Maintenance | ⬜ |
| 07 | 🧪 Testing & QA | ⬜ |
| 08 | 🚀 Deployment | ⬜ |

### Current Status

```text
Progress: ░░░░░░░░░░ 0%

🚧 Project Status: In Progress
📅 Current Phase: Week 01
