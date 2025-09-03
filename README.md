# Daysheets Flight Management System

A comprehensive flight management platform for tour operators, artists, and travel coordinators to streamline flight bookings, passenger management, and tour logistics.

## 🚀 Features

### 🎭 **Artist & Tour Management**
- **Multi-Artist Support**: Manage multiple artists and their tours
- **Tour & Event Tracking**: Separate workflows for tours and standalone events
- **Personnel Management**: Track tour personnel with roles and VIP status
- **Document Management**: Store and version itineraries, invoices, and travel documents

### ✈️ **Flight Operations**
- **Navitas Integration**: Parse flight information from Navitas text blocks
- **Option Management**: Create, compare, and recommend flight options
- **Split Itineraries**: Handle complex multi-segment flights
- **Hold Management**: 24-hour flight holds with automatic expiry tracking
- **Group & Individual Bookings**: Flexible passenger assignment options

### 👥 **Role-Based Access**
- **Client Portal** (`/c`): Artists view their tours and make selections
- **Employee Portal** (`/a`): Agents and admins manage all operations
- **Secure Authentication**: Supabase Auth with role-based permissions

### 🎨 **Modern UI/UX**
- **Responsive Design**: Desktop-first with mobile compatibility
- **Dark Mode Support**: Built-in theme switching
- **Real-time Updates**: Live notifications and status updates
- **Intuitive Navigation**: Clean, professional interface

## 🏗️ Architecture

### **Frontend**
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Query** for data fetching

### **Backend**
- **Supabase** for database and authentication
- **PostgreSQL** with Row-Level Security (RLS)
- **Server Actions** for mutations
- **Edge Functions** ready for custom logic

### **Database Schema**
```
📊 15 Tables:
├── users (auth integration)
├── artists & artist_assignments
├── projects (tours/events)
├── legs (flight segments)
├── tour_personnel (passengers)
├── leg_passengers (assignments)
├── options & option_components
├── selections & holds
├── pnrs & documents
└── chat_messages & notifications
```

## 🛠️ Development Setup

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Supabase account

### **Installation**

```bash
# Clone the repository
git clone https://github.com/elodge/flights-v3.git
cd flights-v3

# Install dependencies
npm install

# Environment setup
cp .env.example .env.local
```

### **Environment Variables**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Testing
E2E_CLIENT_EMAIL=test_client@example.com
E2E_CLIENT_PASSWORD=password123
E2E_AGENT_EMAIL=test_agent@example.com
E2E_AGENT_PASSWORD=password123
```

### **Database Setup**

```bash
# Apply database migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Generate TypeScript types
npm run db:types
```

### **Development**

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

## 📱 Usage

### **Getting Started**

1. **Login** at `/login` with your credentials
2. **Client Users**: Redirected to `/c` to view tours and make selections
3. **Employees**: Redirected to `/a` to manage all operations

### **Employee Workflow**

1. **Dashboard** (`/a`): View all tours grouped by artist
2. **Tour Management** (`/a/tour/[id]`): 
   - View legs, personnel, and documents
   - Add/remove tour personnel
3. **Leg Management** (`/a/tour/[id]/leg/[legId]`):
   - Assign passengers to flights
   - Parse Navitas text to create options
   - Set holds and manage bookings

### **Client Workflow**

1. **Dashboard** (`/c`): View assigned tours and projects
2. **Project View** (`/c/project/[id]`): See flight legs and options
3. **Leg Details** (`/c/project/[id]/legs/[legId]`): Make flight selections

## 🧪 Testing

### **Test Coverage**
- **Unit Tests**: Core business logic and utilities
- **Integration Tests**: Component interactions and data flow
- **E2E Tests**: Complete user workflows
- **RLS Tests**: Database security validation

### **Running Tests**

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## 📚 Documentation

- **[Database Setup](./DATABASE_SETUP.md)**: Schema and migration guide
- **[Sample Data Guide](./SAMPLE_DATA_GUIDE.md)**: Test data and seeding
- **[Testing Guide](./TESTING_GUIDE.md)**: Comprehensive testing documentation
- **[Seeding Instructions](./SEEDING_INSTRUCTIONS.md)**: Data setup procedures

## 🚀 Deployment

### **Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Environment Setup**
1. Connect your Supabase project
2. Set environment variables in deployment platform
3. Configure domain and SSL

### **Database Configuration**
1. Apply migrations to production database
2. Set up RLS policies
3. Configure authentication providers

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Code formatting on save
- **Conventional Commits**: Semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Getting Help**
- **Documentation**: Check the docs folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions

### **Contact**
- **Repository**: [https://github.com/elodge/flights-v3](https://github.com/elodge/flights-v3)
- **Issues**: [https://github.com/elodge/flights-v3/issues](https://github.com/elodge/flights-v3/issues)

---

**Built with ❤️ for the entertainment industry**

*Streamlining tour logistics, one flight at a time.*