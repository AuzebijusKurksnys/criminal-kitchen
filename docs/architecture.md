# System Architecture

## Overview
Criminal Kitchen follows a modern, scalable architecture pattern with clear separation of concerns and modular design.

## Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (React)       │◄──►│   (Supabase)    │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Components    │    │   Database      │    │   OpenAI API    │
│   Pages         │    │   (PostgreSQL)  │    │   (GPT-4 Vision)│
│   Hooks         │    │   Storage       │    │                 │
│   Utils         │    │   Auth          │    └─────────────────┘
└─────────────────┘    └─────────────────┘
```

## Frontend Architecture

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── Table.tsx       # Data table with sorting/filtering
│   ├── Select.tsx      # Dropdown selection component
│   ├── SearchInput.tsx # Search input with debouncing
│   ├── Card.tsx        # Content container component
│   ├── Toast.tsx       # Notification system
│   └── ConfirmDialog.tsx # Confirmation dialogs
├── pages/              # Route-based page components
│   ├── InventoryPage.tsx
│   ├── SupplierPricesPage.tsx
│   ├── InvoicesPage.tsx
│   └── InvoiceReviewPage.tsx
├── inventory/          # Inventory-specific components
├── suppliers/          # Supplier management components
├── data/              # Data layer and business logic
├── services/          # External service integrations
├── utils/             # Utility functions and helpers
└── lib/               # Third-party library configurations
```

### State Management
- **Local State**: React hooks (`useState`, `useEffect`)
- **Global State**: Supabase client for real-time data
- **Form State**: Controlled components with validation
- **Cache**: Supabase built-in caching and optimistic updates

### Routing
- **React Router v6**: Client-side routing with nested routes
- **Route Guards**: Authentication-based access control
- **Dynamic Routes**: Parameterized routes for CRUD operations

## Backend Architecture

### Supabase Services
1. **Database (PostgreSQL)**
   - Relational data with foreign key constraints
   - Row Level Security (RLS) policies
   - Real-time subscriptions
   - Automatic API generation

2. **Authentication**
   - Email/password authentication
   - JWT token management
   - Role-based access control
   - Session management

3. **Storage**
   - File upload and management
   - Image processing and optimization
   - Secure file access with RLS
   - Automatic cleanup policies

4. **Edge Functions**
   - Serverless compute for complex operations
   - AI integration endpoints
   - Background processing tasks
   - External API integrations

### Database Design Principles
- **Normalization**: 3NF compliance for data integrity
- **Constraints**: Check constraints for business rules
- **Indexing**: Strategic indexes for performance
- **Partitioning**: Future-ready for large datasets

## Data Flow

### 1. User Authentication
```
User Login → Supabase Auth → JWT Token → Protected Routes
```

### 2. Data Fetching
```
Component Mount → Supabase Query → RLS Policy Check → Data Return
```

### 3. Data Updates
```
User Input → Validation → Supabase Mutation → RLS Policy Check → Database Update → Real-time Broadcast
```

### 4. File Processing
```
File Upload → Supabase Storage → AI Processing → Data Extraction → Database Update
```

## Security Architecture

### Row Level Security (RLS)
- **User Isolation**: Users can only access their own data
- **Role-based Access**: Different permissions for different user types
- **Data Validation**: Input sanitization and type checking
- **Audit Logging**: Track all data modifications

### API Security
- **JWT Authentication**: Secure token-based authentication
- **CORS Configuration**: Restricted cross-origin requests
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Server-side validation for all inputs

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Lazy loading of route components
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: Efficient rendering of large datasets
- **Image Optimization**: Lazy loading and compression

### Backend Optimization
- **Database Indexing**: Strategic indexes for common queries
- **Connection Pooling**: Efficient database connection management
- **Caching**: Redis integration for frequently accessed data
- **Query Optimization**: Efficient SQL with proper joins

## Scalability Features

### Horizontal Scaling
- **Stateless Design**: No server-side state dependencies
- **CDN Integration**: Global content delivery
- **Database Sharding**: Future-ready for large datasets
- **Microservices**: Modular architecture for independent scaling

### Vertical Scaling
- **Resource Optimization**: Efficient memory and CPU usage
- **Async Processing**: Non-blocking operations
- **Batch Operations**: Bulk data processing
- **Queue Management**: Background task processing

## Monitoring and Observability

### Application Monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time and throughput
- **User Analytics**: Usage patterns and behavior
- **Health Checks**: System status monitoring

### Infrastructure Monitoring
- **Database Performance**: Query execution times
- **Storage Usage**: File storage and bandwidth
- **API Limits**: Rate limiting and quota usage
- **Security Events**: Authentication and authorization logs

## Future Architecture Considerations

### Microservices Migration
- **Service Decomposition**: Break down into domain services
- **API Gateway**: Centralized routing and authentication
- **Event Sourcing**: CQRS pattern for complex workflows
- **Message Queues**: Asynchronous service communication

### Cloud-Native Features
- **Containerization**: Docker and Kubernetes deployment
- **Service Mesh**: Istio for service-to-service communication
- **Auto-scaling**: Dynamic resource allocation
- **Multi-region**: Global deployment and data replication
