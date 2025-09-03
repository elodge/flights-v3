# Daysheets Flight Management System

A professional flight management system built with Next.js, designed for artists and crews to manage their flight operations efficiently.

## 🚀 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: React Query (@tanstack/react-query)
- **Backend**: Supabase (auth, database, storage)

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zcnvpckrxyytrbumrpeh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnZwY2tyeHl5dHJidW1ycGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjQxMDcsImV4cCI6MjA3MjQwMDEwN30.XViR6bade9nwxXu41MM4a10gzCQsLAKmf5M0nXcQrFY
   ```

4. Set up the database schema:
   - Go to your Supabase dashboard: https://supabase.com/dashboard/project/zcnvpckrxyytrbumrpeh
   - Navigate to **SQL Editor**
   - Copy and paste the contents of `supabase-schema.sql` and run it
   - This will create all the necessary tables, indexes, and sample data

5. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
├── app/                      # Next.js App Router
│   ├── (client)/            # Client portal routes
│   │   └── c/               # Client dashboard
│   ├── (employee)/          # Employee portal routes
│   │   └── a/               # Employee dashboard
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── header.tsx           # Global header
│   └── providers.tsx        # App providers
├── lib/                     # Utility libraries
│   ├── supabase.ts          # Supabase client setup
│   └── utils.ts             # Utility functions
└── tailwind.config.ts       # Tailwind configuration
```

## 🎨 Features

### Landing Page
- Clean, professional design with two portal options
- Client Portal for flight information access
- Employee Portal for flight management

### Global Layout
- Sticky header with navigation
- Artist selector (placeholder)
- Notifications button (placeholder)
- Account menu (placeholder)
- Responsive container with max-width

### Portal-Specific Layouts
- **Client Portal**: Blue-themed layout for customers
- **Employee Portal**: Green-themed layout for staff

### UI Components
Ready-to-use shadcn/ui components:
- Button, Card, Dialog, Table
- Dropdown Menu, Avatar, Separator
- Tooltip, Sonner (toast notifications)

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Setup
The project is configured with:
- TypeScript strict mode
- ESLint with Next.js config
- Tailwind CSS with custom design system
- Dark mode support via CSS classes

### Supabase Integration
- Browser and server clients configured
- Ready for authentication, database, and storage operations
- Environment variables for secure configuration

## 🚦 Getting Started

1. Set up your Supabase project at [supabase.com](https://supabase.com)
2. Add your Supabase URL and anon key to `.env.local`
3. Run `npm run dev` to start development
4. Visit `http://localhost:3000` to see the application

The application includes:
- Landing page at `/`
- Client portal at `/c`
- Employee portal at `/a`

## 📝 Next Steps

- Set up Supabase database schema
- Implement authentication flows
- Build flight management features
- Add real-time updates
- Implement role-based access control