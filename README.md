# 🏠 APT Rent

> **Web-Based Apartment Rental Management System**

APT Rent is a web-based apartment rental management platform designed to digitize and simplify the rental lifecycle for **Tenants, Owners, and Administrators**.

The system provides property discovery, property listing management, viewing appointments, digital rental contracts, digital signatures, rent payments, invoices, receipts, and maintenance request tracking. These features are defined as part of the project's SRS scope.

---

## 📌 Project Information

| Item                     | Details                                      |
| ------------------------ | -------------------------------------------- |
| **Project Name**         | APT Rent                                     |
| **Project Type**         | Web-Based Apartment Rental Management System |
| **Course**               | CSE-3202 – Software Engineering Laboratory   |
| **Group**                | Group 03                                     |
| **SRS Version**          | 2.0                                          |
| **Development Duration** | 8 Weeks                                      |
| **Database**             | PostgreSQL / Supabase                        |
| **Frontend**             | React.js / Tailwind CSS                      |
| **Backend**              | Node.js / Express.js                         |
| **Authentication**       | JWT                                          |
| **Payment**              | Stripe Test/Mock Environment                 |
| **API Testing**          | Postman                                      |
| **Frontend Deployment**  | Vercel                                       |
| **Backend Deployment**   | Render                                       |

The technology stack and deployment choices follow the SRS.

---

# 🎯 Project Objectives

* [ ] Digitize the apartment rental process
* [ ] Provide centralized property information
* [ ] Allow Owners to manage property listings
* [ ] Allow Tenants to search and filter apartments
* [ ] Provide map-based property discovery
* [ ] Support five-kilometer radius-based property searches
* [ ] Allow Tenants to request property viewing appointments
* [ ] Allow Owners to approve or deny appointments
* [ ] Generate digital rental contracts
* [ ] Support digital signature data
* [ ] Process rent payments through a Stripe test/mock environment
* [ ] Generate invoices and digital receipts
* [ ] Allow Tenants to submit maintenance requests
* [ ] Allow Owners and Administrators to monitor maintenance requests
* [ ] Implement secure authentication and role-based authorization
* [ ] Test and deploy the complete system

The core project functions are based on the SRS requirements.

---

# 👥 User Roles

## Tenant

* [ ] Register an account
* [ ] Login and logout
* [ ] Search properties
* [ ] Filter available apartments
* [ ] View property details
* [ ] Search properties using map radius
* [ ] Request property viewing appointments
* [ ] View appointment status
* [ ] Sign rental contracts digitally
* [ ] Pay rent
* [ ] View invoices and receipts
* [ ] Submit maintenance requests

## Owner

* [ ] Register an account
* [ ] Login and logout
* [ ] Create property listings
* [ ] Update property information
* [ ] Delete property listings
* [ ] View tenant appointment requests
* [ ] Accept appointments
* [ ] Deny appointments
* [ ] Manage rental contracts
* [ ] View rental payments
* [ ] Monitor maintenance requests

## Administrator

* [ ] Manage users
* [ ] Monitor property listings
* [ ] Monitor appointments
* [ ] Monitor contracts
* [ ] Monitor payments
* [ ] Monitor maintenance requests
* [ ] Perform administrative actions required to maintain system integrity

The SRS specifies Tenant, Owner, and Administrator as the three system user classes.

---

# 🏗️ System Architecture

APT Rent follows a three-tier client-server architecture with external services.

```text
┌──────────────────────────────┐
│        React.js Frontend     │
│       Tailwind CSS UI        │
└──────────────┬───────────────┘
               │ HTTPS / REST
               ▼
┌──────────────────────────────┐
│     Node.js / Express.js     │
│        REST API              │
├──────────────────────────────┤
│ Authentication / JWT         │
│ RBAC                        │
│ Business Logic              │
└──────────────┬───────────────┘
               │ SQL
               ▼
┌──────────────────────────────┐
│    PostgreSQL / Supabase     │
└──────────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Stripe API  │  │ Map Service │
│ Test/Mock   │  │ Location    │
└─────────────┘  └─────────────┘
```

The SRS describes React/Tailwind as the presentation layer, Node.js/Express as the API layer, JWT authentication, PostgreSQL/Supabase as the data layer, and Stripe/map services as external integrations.

---

# 🛠️ Technology Stack

### Frontend

* [ ] React.js
* [ ] Tailwind CSS
* [ ] React Router
* [ ] Responsive UI
* [ ] Form validation
* [ ] API integration

### Backend

* [ ] Node.js
* [ ] Express.js
* [ ] RESTful APIs
* [ ] JWT authentication
* [ ] Password hashing
* [ ] RBAC middleware
* [ ] Input validation
* [ ] Error handling

### Database

* [ ] PostgreSQL
* [ ] Supabase
* [ ] Primary keys
* [ ] Foreign keys
* [ ] Constraints
* [ ] Database relationships

### External Services

* [ ] Stripe test/mock API
* [ ] Map service API

### Development & Deployment

* [ ] Git
* [ ] GitHub
* [ ] Postman
* [ ] Vercel
* [ ] Render

---

# 🗄️ Database

The main database entities defined by the SRS are:

* [ ] User
* [ ] Property
* [ ] Appointment
* [ ] Contract
* [ ] Payment
* [ ] Maintenance Request

The database uses PostgreSQL hosted through Supabase, with primary keys, foreign keys, constraints, and relationships for maintaining data integrity.

---

# 🔐 Authentication & Security

* [ ] User registration
* [ ] User login
* [ ] User logout
* [ ] Password hashing
* [ ] JWT generation
* [ ] JWT validation
* [ ] Role management
* [ ] RBAC middleware
* [ ] Protected API routes
* [ ] Protected frontend routes
* [ ] Input validation
* [ ] Input sanitization
* [ ] Authorization checks
* [ ] HTTPS in production
* [ ] Sensitive data protection
* [ ] Resource ownership validation
* [ ] Unauthorized request handling
* [ ] Security testing

The SRS requires JWT validation for protected API requests, RBAC for role-specific operations, secure password hashing, HTTPS in production, and authorization checks on resources.

---

# 📅 8-Week Development Roadmap

## Week 1 — Architecture, Database & Environment Setup

### Phase 1

* [ ] Conduct requirements analysis
* [ ] Review SRS requirements
* [ ] Finalize system architecture
* [ ] Design database structure
* [ ] Set up PostgreSQL database on Supabase
* [ ] Create `User` table
* [ ] Create `Property` table
* [ ] Create `Appointment` table
* [ ] Create `Contract` table
* [ ] Create `Payment` table
* [ ] Create `Maintenance` table
* [ ] Define primary keys
* [ ] Define foreign keys
* [ ] Define database relationships
* [ ] Add database constraints
* [ ] Initialize React.js frontend
* [ ] Configure Tailwind CSS
* [ ] Initialize Node.js backend
* [ ] Acquire Map Service API credentials
* [ ] Configure Stripe test environment
* [ ] Create frontend environment configuration
* [ ] Create backend environment configuration
* [ ] Set up Vercel deployment pipeline
* [ ] Set up Render deployment pipeline
* [ ] Configure Git repository
* [ ] Create initial project documentation

### Week 1 Complete

* [ ] **Week 1 completed**

---

# Week 2 — Backend Foundations & Authentication

### Phase 2

* [ ] Initialize Node.js project
* [ ] Install Express.js
* [ ] Configure Express server
* [ ] Create backend folder structure
* [ ] Configure environment variables
* [ ] Connect backend to Supabase
* [ ] Configure PostgreSQL database connection
* [ ] Implement password hashing
* [ ] Implement JWT generation
* [ ] Implement JWT validation
* [ ] Create authentication middleware
* [ ] Create Register API
* [ ] Create Login API
* [ ] Create Logout API
* [ ] Add authentication validation
* [ ] Add authentication error handling
* [ ] Build Login page
* [ ] Build Registration page
* [ ] Configure React Router
* [ ] Create protected routes
* [ ] Create Tenant dashboard shell
* [ ] Create Owner dashboard shell
* [ ] Create Admin dashboard shell
* [ ] Test authentication flow

The authentication APIs specified by the SRS are `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/logout`.

### Week 2 Complete

* [ ] **Week 2 completed**

---

# Week 3 — Core APIs & RBAC

### Phase 2 & 3

## Property APIs

* [ ] Create Property API
* [ ] Implement `GET /api/properties`
* [ ] Implement `GET /api/properties/:id`
* [ ] Implement `POST /api/properties`
* [ ] Implement `PUT /api/properties/:id`
* [ ] Implement `DELETE /api/properties/:id`
* [ ] Validate property ownership
* [ ] Add property error handling
* [ ] Test Property CRUD operations

## Appointment APIs

* [ ] Create Appointment API
* [ ] Implement appointment creation
* [ ] Implement appointment retrieval
* [ ] Implement appointment acceptance
* [ ] Implement appointment denial
* [ ] Validate appointment permissions
* [ ] Test appointment APIs

## RBAC

* [ ] Create RBAC middleware
* [ ] Define Tenant permissions
* [ ] Define Owner permissions
* [ ] Define Admin permissions
* [ ] Protect Tenant endpoints
* [ ] Protect Owner endpoints
* [ ] Protect Admin endpoints
* [ ] Test unauthorized access
* [ ] Test authorized access

## Dashboard

* [ ] Build Tenant dashboard
* [ ] Build Owner dashboard
* [ ] Build Admin dashboard
* [ ] Add responsive dashboard layouts
* [ ] Connect dashboards to authentication

### 5-Kilometer Search

* [ ] Design radius-search logic
* [ ] Implement five-kilometer radius calculation
* [ ] Add location parameters
* [ ] Test radius-search results
* [ ] Handle invalid location data

The SRS explicitly requires property discovery within a five-kilometer radius of a selected location.

### Week 3 Complete

* [ ] **Week 3 completed**

---

# Week 4 — Frontend Integration & Property Discovery

### Phase 3

## Property Discovery

* [ ] Refine property database queries
* [ ] Implement property search
* [ ] Implement property filtering
* [ ] Add price filtering
* [ ] Add availability filtering
* [ ] Add search parameters
* [ ] Connect React frontend to Property APIs
* [ ] Display property listings
* [ ] Display property details
* [ ] Enable Owners to create listings
* [ ] Enable Owners to update listings
* [ ] Enable Owners to delete listings
* [ ] Enable Tenants to view listings

## Map Integration

* [ ] Integrate map service
* [ ] Display property locations
* [ ] Add location selection
* [ ] Implement map-based search
* [ ] Implement five-kilometer radius search
* [ ] Display matching properties

## UI & Validation

* [ ] Add property form validation
* [ ] Add API error handling
* [ ] Add loading states
* [ ] Add empty states
* [ ] Add responsive property cards
* [ ] Test property discovery workflow
* [ ] Test property CRUD workflow

### Week 4 Complete

* [ ] **Week 4 completed**

---

# Week 5 — Appointments & Digital Contracts

### Phase 4

## Appointments

* [ ] Build appointment request UI
* [ ] Allow Tenants to request property viewing
* [ ] Display available appointment information
* [ ] Allow Owners to view requests
* [ ] Allow Owners to approve requests
* [ ] Allow Owners to deny requests
* [ ] Display appointment status
* [ ] Validate appointment dates
* [ ] Validate appointment permissions
* [ ] Handle appointment conflicts
* [ ] Test appointment workflow

## Digital Contracts

* [ ] Design contract data structure
* [ ] Implement contract generation
* [ ] Populate property information
* [ ] Populate Owner information
* [ ] Populate Tenant information
* [ ] Store contract information
* [ ] Secure contract data
* [ ] Implement contract retrieval
* [ ] Implement digital signature data storage
* [ ] Build contract review UI
* [ ] Build contract signing UI
* [ ] Implement contract status
* [ ] Test contract generation
* [ ] Test contract signing

The SRS requires digital contracts containing property, owner, and tenant information and storage of associated digital signature data.

### Week 5 Complete

* [ ] **Week 5 completed**

---

# Week 6 — Payments & Maintenance

### Phase 4

## 💳 Payments

* [ ] Configure Stripe test/mock environment
* [ ] Integrate Stripe API
* [ ] Create payment API
* [ ] Implement rent payment processing
* [ ] Validate payment authorization
* [ ] Store payment records
* [ ] Store transaction ID
* [ ] Implement payment status
* [ ] Handle successful payments
* [ ] Handle failed payments
* [ ] Prevent duplicate payment records
* [ ] Generate digital invoices
* [ ] Generate digital receipts
* [ ] Display payment history
* [ ] Display payment details
* [ ] Test successful payment
* [ ] Test failed payment
* [ ] Test payment authorization

The SRS specifies Stripe as a test/mock payment gateway and requires payment status, transaction IDs, invoices, and receipts.

## 🔧 Maintenance

* [ ] Create Maintenance Request API
* [ ] Create maintenance request form
* [ ] Allow Tenants to submit requests
* [ ] Allow Tenants to view request status
* [ ] Allow Owners to monitor requests
* [ ] Allow Admins to monitor requests
* [ ] Implement maintenance status
* [ ] Implement maintenance updates
* [ ] Add maintenance validation
* [ ] Add maintenance authorization
* [ ] Test maintenance submission
* [ ] Test maintenance status updates

The SRS defines maintenance submission, tenant status viewing, Owner monitoring, and Administrator monitoring as maintenance requirements.

### Week 6 Complete

* [ ] **Week 6 completed**

---

# Week 7 — Quality Assurance & Testing

### Phase 4

## 🧪 API Testing

* [ ] Create Postman collection
* [ ] Test Register API
* [ ] Test Login API
* [ ] Test Logout API
* [ ] Test Property APIs
* [ ] Test Appointment APIs
* [ ] Test Contract APIs
* [ ] Test Payment APIs
* [ ] Test Maintenance APIs
* [ ] Test valid requests
* [ ] Test invalid requests
* [ ] Test missing parameters
* [ ] Test invalid authentication
* [ ] Test unauthorized requests
* [ ] Test forbidden requests
* [ ] Verify HTTP status codes

The SRS identifies Postman as the API testing tool and includes API, integration, security, performance, and unit testing in its testing strategy.

## 🔗 Integration Testing

* [ ] Test frontend-to-backend communication
* [ ] Verify API responses
* [ ] Verify database persistence
* [ ] Verify database relationships
* [ ] Test authentication flow
* [ ] Test RBAC flow
* [ ] Test property discovery
* [ ] Test map search
* [ ] Test appointment workflow
* [ ] Test contract workflow
* [ ] Test payment workflow
* [ ] Test maintenance workflow

## 🔒 Security Testing

* [ ] Audit JWT validation
* [ ] Audit RBAC restrictions
* [ ] Test password security
* [ ] Test input validation
* [ ] Test input sanitization
* [ ] Test authorization checks
* [ ] Test resource ownership
* [ ] Test protected endpoints
* [ ] Test unauthorized access
* [ ] Verify sensitive data protection
* [ ] Verify HTTPS production configuration

## 📱 UI Testing

* [ ] Fix UI bugs
* [ ] Test desktop layout
* [ ] Test tablet layout
* [ ] Test mobile layout
* [ ] Test responsive navigation
* [ ] Test forms
* [ ] Test loading states
* [ ] Test error messages
* [ ] Test empty states
* [ ] Verify consistent UI

## 🐛 Bug Fixing

* [ ] Record discovered bugs
* [ ] Prioritize bugs
* [ ] Fix critical bugs
* [ ] Fix medium-priority bugs
* [ ] Fix low-priority bugs
* [ ] Retest fixed features
* [ ] Perform regression testing
* [ ] Perform final QA review

### Week 7 Complete

* [ ] **Week 7 completed**

---

# Week 8 — Final Deployment & Presentation

### Phase 5

## 🚀 Backend Deployment

* [ ] Finalize backend code
* [ ] Prepare production configuration
* [ ] Deploy backend to Render
* [ ] Configure Supabase database URL
* [ ] Configure JWT secret
* [ ] Configure Stripe test keys
* [ ] Configure Map Service API key
* [ ] Configure production environment variables
* [ ] Verify environment variables
* [ ] Test production backend
* [ ] Verify production API endpoints

## 🌐 Frontend Deployment

* [ ] Finalize frontend code
* [ ] Create production build
* [ ] Deploy frontend to Vercel
* [ ] Configure production API URL
* [ ] Verify frontend-backend connection
* [ ] Verify production routing
* [ ] Test production authentication
* [ ] Test production property discovery

## ✅ End-to-End Verification

* [ ] Test user registration
* [ ] Test user login
* [ ] Test user logout
* [ ] Test Tenant dashboard
* [ ] Test Owner dashboard
* [ ] Test Admin dashboard
* [ ] Test property creation
* [ ] Test property update
* [ ] Test property deletion
* [ ] Test property search
* [ ] Test property filtering
* [ ] Test five-kilometer search
* [ ] Test map search
* [ ] Test appointments
* [ ] Test appointment approval
* [ ] Test appointment denial
* [ ] Test digital contracts
* [ ] Test digital signatures
* [ ] Test rent payments
* [ ] Test payment status
* [ ] Test invoices
* [ ] Test receipts
* [ ] Test maintenance requests
* [ ] Test maintenance status
* [ ] Verify authorization across all modules
* [ ] Perform complete end-to-end testing
* [ ] Verify live deployment stability

## 📚 Documentation

* [ ] Complete README
* [ ] Document system architecture
* [ ] Document database structure
* [ ] Document database relationships
* [ ] Document API endpoints
* [ ] Document authentication
* [ ] Document RBAC
* [ ] Document environment variables
* [ ] Prepare Postman collection
* [ ] Prepare API testing documentation
* [ ] Add screenshots
* [ ] Prepare demo materials
* [ ] Prepare presentation slides
* [ ] Prepare project demonstration
* [ ] Perform final project review
* [ ] Prepare academic submission

### Week 8 Complete

* [ ] **Week 8 completed**

---

# 📊 Overall Development Progress

| Week   | Development Area                     | Status        |
| ------ | ------------------------------------ | ------------- |
| Week 1 | Architecture, Database & Environment | ⬜ Not Started |
| Week 2 | Backend & Authentication             | ⬜ Not Started |
| Week 3 | APIs & RBAC                          | ⬜ Not Started |
| Week 4 | Frontend & Property Discovery        | ⬜ Not Started |
| Week 5 | Appointments & Contracts             | ⬜ Not Started |
| Week 6 | Payments & Maintenance               | ⬜ Not Started |
| Week 7 | Testing & QA                         | ⬜ Not Started |
| Week 8 | Deployment & Presentation            | ⬜ Not Started |

---

# 🏁 Final Project Checklist

## Core System

* [ ] Database completed
* [ ] Backend completed
* [ ] Frontend completed
* [ ] Authentication completed
* [ ] RBAC completed
* [ ] Property management completed
* [ ] Property search completed
* [ ] Property filtering completed
* [ ] Five-kilometer search completed
* [ ] Map-based search completed
* [ ] Appointment system completed
* [ ] Digital contract system completed
* [ ] Digital signature system completed
* [ ] Payment system completed
* [ ] Invoice generation completed
* [ ] Receipt generation completed
* [ ] Maintenance system completed

## Security

* [ ] Password hashing implemented
* [ ] JWT implemented
* [ ] JWT validation implemented
* [ ] RBAC implemented
* [ ] Input validation implemented
* [ ] Authorization checks implemented
* [ ] Sensitive data protected
* [ ] HTTPS configured for production
* [ ] Security testing completed

## Testing

* [ ] Unit testing completed
* [ ] Integration testing completed
* [ ] API testing completed
* [ ] Security testing completed
* [ ] Performance testing completed
* [ ] Responsive UI testing completed
* [ ] Regression testing completed
* [ ] End-to-end testing completed

## Deployment

* [ ] Supabase database deployed
* [ ] Backend deployed to Render
* [ ] Frontend deployed to Vercel
* [ ] Environment variables configured
* [ ] Production API verified
* [ ] Production frontend verified
* [ ] Frontend-backend connection verified
* [ ] Live system tested

## Academic Submission

* [ ] README completed
* [ ] SRS completed
* [ ] Architecture documentation completed
* [ ] Database documentation completed
* [ ] API documentation completed
* [ ] Postman collection completed
* [ ] Test documentation completed
* [ ] Screenshots prepared
* [ ] Presentation slides completed
* [ ] Project demonstration prepared
* [ ] Final review completed
* [ ] Academic submission completed

---

# 📈 Project Status

**Overall Completion:** `0%`

**Current Week:** `Week 1`

**Project Status:** `🚧 In Progress`

> **How to use this README:**
> Change each `- [ ]` to `- [x]` when the corresponding task has been completed and verified.

Example:

```markdown
- [x] Create User table
- [x] Create Property table
- [ ] Create Appointment table
```

---

# 📖 Reference

The project requirements, functional requirements, database design, API requirements, security requirements, testing strategy, deployment requirements, and project timeline are defined in the **APT Rent Software Requirements Specification, Version 2.0**.

---

## 👨‍💻 Project Team

| Member                   | Responsibility            |
| ------------------------ | ------------------------- |
| **MD Ratul Hasan Anik**  | Backend API & Services    |
| **Mashrafi Zaman Jahin** | Third-Party Integrations  |
| **Arian Parvez Teshan**  | Authentication & Security |
| **A S M Raiyan**         | Frontend & UI/UX          |

Team responsibilities are identified in the project's SRS.

---

# 📌 Project Scope

APT Rent currently focuses on a **web-based apartment rental management system**. Native Android/iOS applications, real-world legal verification, brokerage services, physical property inspection, real banking settlement, and automated legal contract validation are outside the current scope.

---

**APT Rent — CSE-3202 Software Engineering Laboratory — Group 03**
