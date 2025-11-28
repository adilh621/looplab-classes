# LoopLab Classes - Comprehensive Repository Breakdown

## 📋 Project Overview

**LoopLab Classes** is a Next.js-based parent portal application for managing coding/coaching classes. It allows parents to:
- View and manage their student's information
- Book coaching sessions via Calendly integration
- View session notes from coaches
- Track upcoming and past sessions

Coaches can also manage and publish session notes for parents to view.

---

## 🛠 Technology Stack

### Core Framework
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **PostCSS** - CSS processing with Tailwind plugin

### Key Dependencies
- **react-calendly** (^4.4.0) - Calendly widget integration for booking sessions

### Development Tools
- **ESLint** - Code linting (Next.js config)
- **Node.js** - Runtime environment

---

## 📁 Project Structure

```
looplab-classes/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Home page (auth status checker)
│   │   ├── layout.tsx         # Root layout with metadata
│   │   ├── globals.css        # Global Tailwind styles
│   │   ├── login/             # Authentication pages
│   │   │   └── page.tsx       # Login form
│   │   ├── sign-up/           # Account creation
│   │   │   └── page.tsx       # Invite-based signup
│   │   ├── dashboard/         # Main parent portal
│   │   │   └── page.tsx       # Dashboard with sessions & booking
│   │   ├── notes/             # Parent-facing notes
│   │   │   └── [sessionId]/   # Dynamic route for session notes
│   │   │       └── page.tsx
│   │   └── coach/             # Coach-only section
│   │       └── notes/         # Coach note management
│   │           └── page.tsx
│   └── lib/                   # Utility modules
│       ├── api.ts             # Backend API base URL helper
│       └── auth.ts            # Auth types & utilities
├── middleware.ts              # Route protection middleware
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── postcss.config.mjs         # PostCSS/Tailwind config
└── eslint.config.mjs          # ESLint configuration
```

---

## 🔐 Authentication & Authorization

### Authentication Flow
1. **Backend-based authentication** - Sessions handled by external backend API
2. **Cookie-based sessions** - Uses HTTP-only cookies for session management
3. **Middleware protection** - Routes protected via Next.js middleware

### Protected Routes
- `/dashboard` - Requires authentication (checked in middleware)
- `/coach/notes` - Requires authentication + coach email check (`adilh621+looplab@gmail.com`)
- `/notes/[sessionId]` - Implicitly protected (redirects to login if needed)

### Auth Endpoints Used
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /session/me` - Get current user session
- `POST /auth/claim-invite-password` - Claim invite and set password

### Middleware (`middleware.ts`)
- Runs on Edge runtime
- Protects `/dashboard` route
- Validates session via backend `/session/me` endpoint
- Redirects to `/login?redirect=<original_path>` if unauthenticated

---

## 🌐 API Integration

### Backend Configuration
- **Base URL**: Set via `NEXT_PUBLIC_BACKEND_URL` environment variable
- **Default fallback**: `http://127.0.0.1:8000` (development)
- **API helper**: `getApiBase()` in `src/lib/api.ts`

### API Endpoints Used

#### Authentication
- `GET /session/me` - Get current user info
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/claim-invite-password` - Claim invite

#### User Management
- `PATCH /me` - Update user profile/intake info

#### Sessions
- `GET /sessions?limit_past=10&limit_upcoming=5` - Get user's sessions

#### Session Notes
- `GET /session-notes/by-session/{sessionId}` - Get notes for session
- `GET /session-notes?session_booking_id={id}` - Alternative endpoint
- `POST /session-notes` - Create note (coach only)
- `PATCH /session-notes/{id}` - Update note status
- `DELETE /session-notes/{id}` - Delete note (coach only)

### Data Types

#### User (`Me` type)
```typescript
{
  authenticated: boolean;
  email?: string | null;
  name?: string | null;
  intake?: ClientIntake | null;
}
```

#### Client Intake
```typescript
{
  id: number;
  email: string;
  parent_name?: string | null;
  student_name?: string | null;
  student_age?: number | null;
  phone?: string | null;
  timezone?: string | null;
  preferred_days?: string[] | null;
  preferred_times?: string[] | null;
  course?: string | null;
  service?: string | null;
  status: string;
  // ... more fields
}
```

#### Session Booking
```typescript
{
  id: number;
  start_utc: string | null;
  end_utc: string | null;
  location_type: string | null;
  join_url: string | null;
  reschedule_url: string | null;
  cancel_url: string | null;
  calendly_event_uuid?: string | null;
  calendly_invitee_uuid?: string | null;
  status?: string | null;
}
```

#### Session Note
```typescript
{
  id: number;
  session_booking_id: number;
  coach_name?: string | null;
  status: "draft" | "published";
  visibility: "private" | "parent" | "parent_and_student";
  title?: string | null;
  content_md: string;
  created_at: string;
  updated_at: string;
  emailed_to?: string[] | null;
  email_sent_at?: string | null;
}
```

---

## 🎯 Key Features & Pages

### 1. Home Page (`/`)
- **Purpose**: Landing page with auth status check
- **Features**:
  - Displays welcome message if authenticated
  - Shows login/signup buttons if not authenticated
  - Logout functionality
  - Link to dashboard or invite page

### 2. Login Page (`/login`)
- **Features**:
  - Email/password login form
  - Pre-fills email from query params
  - Redirect support via `redirect` query param
  - Error handling
  - Sets session cookie on success

### 3. Sign-Up Page (`/sign-up`)
- **Features**:
  - Invite-based account creation
  - Requires `token` query parameter from invite email
  - Password creation (min 8 characters)
  - Email pre-filled from query params
  - Redirects to login after successful signup

### 4. Dashboard (`/dashboard`) ⭐ **Core Feature**
- **Protected**: Yes (middleware)
- **Features**:

  #### Account Information Section
  - Parent name, email, timezone, phone
  - Editable student info (name, age, service)
  - Intake status display

  #### Preferred Days
  - Editable list of preferred session days
  - Stored as array of weekday strings

  #### Sessions List
  - **Upcoming sessions**: White cards with action buttons
    - Join link (if available)
    - Reschedule link
    - Cancel link
  - **Past sessions**: Rose-colored cards
    - Link to view instructor notes
  - Displays date/time range, location type

  #### Calendly Integration
  - Embedded Calendly widget (`https://calendly.com/adilh621/code-coaching`)
  - Pre-fills parent name and email
  - 720px height embedded widget
  - Full booking flow inline

  #### Edit Modals
  - **Student Info Modal**: Edit name, age, service
  - **Preferred Days Modal**: Multi-select weekday checkboxes

### 5. Session Notes - Parent View (`/notes/[sessionId]`)
- **Purpose**: View published notes from past sessions
- **Features**:
  - Fetches notes for specific session ID
  - Only shows published notes with `parent` or `parent_and_student` visibility
  - Displays note title, coach name, timestamp
  - Renders markdown content as plain text
  - Back link to dashboard

### 6. Coach Notes (`/coach/notes`) 🔒 **Coach Only**
- **Access Control**: Hardcoded email check (`adilh621+looplab@gmail.com`)
- **Features**:

  #### Note Management
  - Load notes by Booking ID (query param or input)
  - Create new notes with:
    - Title (optional)
    - Markdown content
    - Visibility level (private/parent/parent_and_student)
    - Status (draft/published)
    - Email notification toggle

  #### Existing Notes
  - List all notes for a booking
  - Toggle status (draft ↔ published)
  - Delete notes
  - View note previews (truncated if >800 chars)

  #### Workflow
  - Create draft → Edit → Publish (optionally email parent)
  - Notes persist across sessions

---

## 🔧 Configuration Details

### Environment Variables
Required environment variable:
- `NEXT_PUBLIC_BACKEND_URL` - Backend API base URL (defaults to `http://127.0.0.1:8000`)

### TypeScript Config
- Target: ES2017
- Strict mode enabled
- Path aliases: `@/*` → `./src/*`
- Next.js plugin enabled

### Next.js Config
- Minimal configuration (default settings)
- Uses App Router (Next.js 13+ style)

### Tailwind CSS
- Version 4 (latest)
- Configured via PostCSS
- Imported in `globals.css` with `@import "tailwindcss"`
- Utility classes used throughout

---

## 📦 Dependencies Breakdown

### Production Dependencies
```json
{
  "next": "15.5.2",              // Next.js framework
  "react": "19.1.0",             // React library
  "react-dom": "19.1.0",         // React DOM renderer
  "react-calendly": "^4.4.0"     // Calendly widget integration
}
```

### Development Dependencies
```json
{
  "@eslint/eslintrc": "^3",           // ESLint config compatibility
  "@tailwindcss/postcss": "^4",       // Tailwind PostCSS plugin
  "@types/node": "^20",               // Node.js type definitions
  "@types/react": "^19",              // React type definitions
  "@types/react-dom": "^19",          // React DOM type definitions
  "eslint": "^9",                     // ESLint linter
  "eslint-config-next": "15.5.2",     // Next.js ESLint config
  "tailwindcss": "^4",                // Tailwind CSS framework
  "typescript": "^5"                  // TypeScript compiler
}
```

---

## 🎨 Styling Approach

- **Framework**: Tailwind CSS utility classes
- **Design System**:
  - Rounded corners: `rounded-xl`, `rounded-2xl`, `rounded-lg`
  - Color scheme: Black/gray for primary, rose for past sessions
  - Spacing: Consistent padding (`p-4`, `p-6`) and gaps
  - Cards: Border + rounded + shadow-sm for elevation
- **Responsive**: Uses Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- **Layout**: Flexbox and Grid for layouts

---

## 🔄 User Flows

### Parent User Flow
1. Receive invite email → Click link with token
2. Sign up at `/sign-up?token=...&email=...` → Set password
3. Redirected to login → Log in
4. Access dashboard → View/edit profile, see sessions
5. Book new session via Calendly widget
6. View past session notes at `/notes/[sessionId]`

### Coach User Flow
1. Log in (must be coach email)
2. Access `/coach/notes`
3. Enter Booking ID or use query param
4. View existing notes or create new ones
5. Draft notes → Publish → Email sent to parent (optional)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (version not specified, but likely 18+)
- npm or compatible package manager
- Backend API running (or set `NEXT_PUBLIC_BACKEND_URL`)

### Setup Steps
1. Install dependencies: `npm install`
2. Set environment variable: `NEXT_PUBLIC_BACKEND_URL=<backend-url>`
3. Run development server: `npm run dev`
4. Access at `http://localhost:3000`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

---

## 🔍 Code Patterns & Conventions

### Client Components
- All interactive pages use `"use client"` directive
- Server components only in `layout.tsx`

### Error Handling
- Try-catch blocks with user-friendly error messages
- Loading states for async operations
- Mounted checks in `useEffect` to prevent state updates on unmounted components

### API Calls
- Uses `credentials: "include"` for cookie-based auth
- `cache: "no-store"` for fresh data
- Manual cookie forwarding in middleware (Edge runtime limitation)

### State Management
- Local component state with `useState`
- No global state management library
- Effects for data fetching

### Type Safety
- TypeScript types for all API responses
- Type guards and helpers for safe property access
- Avoids `any` types where possible

---

## 🔐 Security Considerations

1. **Authentication**: Session-based via backend
2. **Route Protection**: Middleware validates before rendering
3. **CSRF**: Handled by backend (cookie-based sessions)
4. **XSS**: React's built-in escaping, markdown rendered as plain text
5. **Coach Access**: Hardcoded email check (could be improved with role-based auth)

---

## 📝 Notable Implementation Details

### Calendly Integration
- Inline widget embedded in dashboard
- Pre-fills parent name and email from intake data
- UTM tracking for analytics
- Fixed 720px height container

### Session Notes Visibility
- Three-tier visibility system:
  - `private`: Staff only
  - `parent`: Visible to parent
  - `parent_and_student`: Visible to both
- Only published notes are shown to parents
- Draft notes are coach-only

### Preferred Days Parsing
- Handles multiple formats: JSON array, comma-separated, "/" separated, "and" separated
- Normalizes to array of weekday strings

### Date Formatting
- Uses `Intl.DateTimeFormat` for locale-aware formatting
- Format: "Weekday, Mon DD, HH:MM–HH:MM"

---

## 🐛 Known Limitations / Future Improvements

1. **Hardcoded Coach Email**: Should use role-based auth from backend
2. **No Markdown Rendering**: Notes shown as plain text (could use `react-markdown`)
3. **No Error Boundaries**: Could add React error boundaries for better error handling
4. **No Loading Skeletons**: Just "Loading…" text
5. **No Offline Support**: Fully dependent on backend
6. **Single Service Options**: Hardcoded "Coding" and "Math" options
7. **No Session Filtering**: All sessions shown, no pagination
8. **Limited Responsive Design**: Could be improved for mobile

---

## 📊 File Size & Complexity

- **Largest File**: `dashboard/page.tsx` (~555 lines) - Complex component with multiple modals and state
- **Most Complex**: Coach notes page with full CRUD operations
- **Simple Files**: API helpers, auth types, configuration files

---

## 🎯 Application Purpose

This is a **parent portal for a coaching/education service** (LoopLab) that:
- Manages student intake information
- Integrates with Calendly for session booking
- Allows coaches to write and publish session notes
- Provides parents with a dashboard to track their student's sessions and progress

The application serves as a **frontend client** that communicates with a separate backend API for all data operations, authentication, and business logic.

---

*Generated: Comprehensive repository breakdown for LoopLab Classes*


