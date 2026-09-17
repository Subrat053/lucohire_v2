# 01_PROJECT_OVERVIEW.md

## Project: Lucohire

### Project Purpose
Lucohire is a full-featured AI-powered hiring and job platform that connects service providers (freelancers, consultants) with recruiters (companies, agencies) looking to hire talent. The platform supports:
- Provider panels for showcasing skills and services
- Recruiter panels for posting jobs and finding candidates
- Admin management of users, plans, and content
- Payment processing via Stripe and Razorpay
- AI-powered features (resume parsing, career coaching, job matching)
- WhatsApp Business API integration
- Job scraping and pipeline automation

### Architecture
**Overall Structure:** Separate frontend (React) and backend (Node.js/Express) application with MongoDB as the primary database.

**Frontend:** React 18 with Vite build tool, React Router for routing, Tailwind CSS for styling, and numerous UI libraries (DnD, Recharts, Lucide icons, etc.).

**Backend:** Node.js with Express.js framework, Mongoose ODM for MongoDB, JWT authentication, and extensive middleware for authorization, rate limiting, and validation.

### Main Modules

1. **Authentication & Authorization**
   - Email/password registration and login
   - Google OAuth integration
   - WhatsApp OTP login
   - Email verification and password reset
   - Role-based access control (provider/recruiter/admin/manager)

2. **User Management**
   - Provider profiles with skills, pricing, portfolio
   - Recruiter profiles with company information
   - User subscriptions and plans
   - Referral and commission system

3. **Job & Matching**
   - Job posting and applications
   - Provider-candidate matching
   - Search and filtering with multiple criteria
   - AI-powered job recommendations

4. **Payment & Subscriptions**
   - Stripe and Razorpay integration
   - Provider and recruiter plan purchases
   - Subscription management and renewals
   - Commission and referral tracking

5. **Admin Panel**
   - User management
   - Plan and pricing management
   - Content moderation
   - System settings and logs
   - Crawler and scraper management

6. **AI & Automation**
   - Resume parsing (Gemini, Anthropic, OpenAI)
   - AI career coaching and insights
   - Job matching and ranking
   - Pipeline automation and web scraping
   - Translation and OCR services

7. **Communication**
   - Email via SMTP (Hostinger) and Resend
   - SMS/WhatsApp via Meta Cloud API
   - Socket.io real-time notifications
   - Bulk outreach campaigns

8. **Search & Discovery**
   - Typesense-powered search
   - Geo-spatial search with Geoapify
   - Skill-based filtering
   - Rating and trust score filtering

### Technology Stack

**Frontend:**
- React 18.3.1
- Vite 5.4.10 (build tool)
- React Router DOM 6.30.3 (routing)
- Tailwind CSS 4.2.1 (styling)
- Redux-like state management via context providers
- Axios (HTTP client)
- Socket.io-client (realtime)
- Recharts (data visualization)
- React Hook Form (implied via validation)

**Backend:**
- Node.js with Express 4.21.0
- MongoDB with Mongoose 8.7.0 (ODM)
- JWT (jsonwebtoken 9.0.2) for authentication
- bcryptjs 2.4.3 for password hashing
- Mongoose field encryption for sensitive data

**Database:**
- MongoDB Atlas (cloud)
- Native MongoDB queries via Mongoose

**Third-Party Services:**
- Cloudinary (file/media storage)
- Stripe (payments)
- Razorpay (payments, especially India market)
- Google Maps/Places (location services)
- Geoapify (geo services)
- Firebase (auth and messaging)
- OpenAI (AI features)
- Anthropic Claude (AI features)
- Gemini (AI features, resume parsing)
- Typesense (search engine)
- Redis/Upstash (caching and queues)
- SendGrid/Resend (email)
- Meta WhatsApp Business API
- Apify (web scraping)
- Nodemailer (SMTP email)
- Google Cloud Translation/Vision
- Google OAuth 2.0

**Infrastructure:**
- Nodemon (development hot reload)
- Docker (potentially, not explicitly configured)
- Git for version control

### Repository Structure (Key Directories)

```
backend/
├── config/           # Configuration files
├── controllers/      # API controllers
├── models/          # MongoDB Mongoose models
├── routes/          # Express routes
├── services/        # Business logic services
├── middleware/      # Express middleware
├── utils/           # Utility functions
├── jobs/            # Background job definitions
├── workers/         # Worker processes
├── queues/          # Queue definitions (BullMQ)
├── cron/            # Scheduled tasks
├── modules/         # Feature modules (AI, external jobs)
├── uploads/         # File storage
├── .env             # Environment variables
├── package.json     # Dependencies

frontend/
├── src/
│   ├── pages/       # Page components
│   ├── components/  # Reusable UI components
│   ├── routes/      # Route definitions
│   ├── context/     # React context providers
│   ├── services/    # API client services
│   ├── hooks/       # Custom React hooks
│   ├── config/      # Frontend configuration
│   ├── assets/      # Static assets
│   └── translations/
├── package.json     # Frontend dependencies
├── .env             # Frontend environment variables
├── vite.config.js   # Vite configuration

deploy/
└── nginx/           # Nginx configuration
```

### Major Dependencies (Backend)

Key npm packages:
- express, cors, helmet, compression
- mongoose, bcryptjs, jsonwebtoken
- cloudinary, multer (file upload)
- bullmq (queue system)
- nodemailer, resend (email)
- Stripe, razorpay (payments)
- openai, anthropic, google-generative-ai (AI)
- typesense (search)
- redis (caching/queues)
- google-auth-library (OAuth)
- firebase-admin (Firebase)
- googleapis (Google services)
- playwright (web scraping)
- apify (scraping)

### Major Dependencies (Frontend)

Key npm packages:
- react, react-dom
- react-router-dom
- @tailwindcss/vite, tailwindcss
- axios (HTTP client)
- socket.io-client
- recharts (charts)
- lucide-react (icons)
- react-quill (rich text editor)
- react-select (select component)
- date-fns (date handling)
- html2pdf.js, jspdf (PDF generation)

### Application Boundaries

**Frontend-Backend Contract:**
- API base URL: `http://localhost:5000/api` (development)
- API versioning: `/api/v1/` for many endpoints
- Authentication: Bearer JWT tokens sent in `Authorization` header
- CORS: Configurable origins from environment variables
- File uploads: Multipart/form-data to `/api/profile/photo` and `/api/profile/resume` endpoints

**Backend-Database:**
- MongoDB with proper schema validation
- Mongoose middleware for pre/post save operations
- Indexes for performance on frequently queried fields

**External Services Integration:**
- Payment gateways (Stripe/Razorpay) - server-side only
- AI services (OpenAI/Anthropic/Gemini) - API keys required
- Email services - SMTP configured
- WhatsApp Business - Meta Cloud API configured
- Cloudinary - for file storage
- Maps APIs - Google Places, Geoapify

### Key Environment Variables (Critical)

See `docs/08_ENVIRONMENT_VARIABLES.md` for complete list, but critical vars include:
- `MONGO_URI` - MongoDB connection
- `JWT_SECRET` - JWT signing secret
- `CLOUDINARY_*` - File storage
- `STRIPE_*` / `RAZORPAY_*` - Payment processing
- `GOOGLE_*` - OAuth and Maps
- `SMTP_*` - Email configuration
- `REDIS_URL` - Cache/queue backend

### Repository History
- Multiple documentation files exist in `documentation/` directory indicating prior audit efforts
- Current state appears to be actively developed with frequent additions of AI features
- Both provider (freelancer) and recruiter (company) workflows are supported
- Admin panel with extensive management capabilities