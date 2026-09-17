# Lucohire Platform

Lucohire is an AI-powered Recruitment, Service Worker Marketplace, and Job Discovery Platform. It connects job seekers, recruiters, service providers, and partners with intelligent candidate matching, automated resume processing, and multi-channel communication tools.

## System Architecture

The project is structured as a full-stack monorepo:

- **Frontend**: Built with React 18, Vite 5, Tailwind CSS, React Router DOM v6, and Recharts.
- **Backend**: Built with Node.js, Express.js, Socket.io, BullMQ worker queues, and MongoDB (via Mongoose).
- **AI Services**: Integrates OpenAI, Anthropic Claude, Google Gemini, and Google Cloud Vision for resume parsing, AI career coaching, and automated candidate matching.
- **Data & Crawling Pipeline**: Multi-source ingestion engine supported by Typesense search, Redis caching, and web scrapers.

## Project Structure

```text
Lucohire/
├── backend/            # Express REST API, background workers, AI services, models
├── frontend/           # React single-page application (UI & Admin portals)
├── deploy/             # Server deployment templates (Nginx configurations)
├── docs/               # Architecture & system design documentation
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **MongoDB**: Local instance or MongoDB Atlas cluster
- **Redis**: Local Redis server or Upstash Redis instance

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Lucohire
   ```

2. **Set up Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   Edit `backend/.env` with your actual local database URI and API credentials.

3. **Set up Frontend**:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   ```
   Edit `frontend/.env` with your API endpoint configuration.

### Running Development Servers

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

## Security & Deployment Note

- Never commit `.env` files or active API credentials to source control.
- Copy `.env.example` templates to `.env` in both `backend` and `frontend` before running locally.
- For deployment configurations, see `deploy/nginx/lucohire.conf`.

## License

Proprietary — All rights reserved.
