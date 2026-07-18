# Apex Print Hub - Backend API

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your credentials.
3. Start the server:
   ```bash
   npm run dev
   ```

## Admin Dashboard
Access the admin dashboard at `/admin`
Default credentials (set in `.env` to override):
- User: `admin`
- Pass: `password123`

## Endpoints
- `POST /api/contact` - Submit contact form
- `POST /api/quote` - Request quote (auto-calculates estimate)
- `GET /api/currency/rates` - Get live exchange rates

*Payments deferred to Phase 2.*
