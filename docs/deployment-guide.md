# Deployment Guide - Criminal Kitchen

## Overview
This guide covers the deployment process for Criminal Kitchen, including environment setup, build configuration, and deployment to various platforms.

## Prerequisites

### Required Accounts
- **GitHub**: Source code repository
- **Supabase**: Database and backend services
- **Vercel**: Frontend deployment (recommended)
- **OpenAI**: AI invoice processing service

### Required Tools
- **Git**: Version control
- **Node.js**: Runtime environment
- **npm**: Package manager
- **Vercel CLI**: Deployment tool (optional)

## Environment Setup

### 1. Supabase Project Setup

#### Create New Project
1. Log into [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and region
4. Set project name (e.g., "criminal-kitchen")
5. Set database password
6. Wait for project initialization

#### Configure Environment Variables
```bash
# Get from Supabase project settings
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Database Schema Setup
1. **Run Migrations**: Execute database schema migrations
2. **Enable RLS**: Configure Row Level Security policies
3. **Set Up Storage**: Configure file storage buckets
4. **Test Connection**: Verify database connectivity

### 2. OpenAI API Setup

#### Get API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create new API key
4. Copy and secure the key

#### Configure Environment
```bash
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 3. Environment File Configuration

#### Development (.env.local)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Development Settings
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
```

#### Production (.env.production)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Production Settings
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
```

## Build Configuration

### 1. Vite Configuration

#### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 2. Package.json Scripts

#### Development Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:dev": "tsc && vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

#### Build Process
```bash
# Install dependencies
npm install

# Type checking
npm run type-check

# Build for production
npm run build

# Preview build
npm run preview
```

## Deployment Options

### 1. Vercel Deployment (Recommended)

#### Automatic Deployment
1. **Connect Repository**: Link GitHub repository to Vercel
2. **Configure Build**: Set build command and output directory
3. **Environment Variables**: Add production environment variables
4. **Deploy**: Automatic deployment on push to main branch

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_OPENAI_API_KEY": "@openai_api_key"
  },
  "functions": {
    "src/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### 2. Netlify Deployment

#### Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Environment Variables
- Set in Netlify dashboard
- Use build-time environment variables
- Secure sensitive information

### 3. AWS S3 + CloudFront

#### S3 Bucket Setup
1. Create S3 bucket for static hosting
2. Enable static website hosting
3. Configure bucket policy for public read access
4. Upload built files

#### CloudFront Distribution
1. Create CloudFront distribution
2. Set S3 bucket as origin
3. Configure custom domain (optional)
4. Set up SSL certificate

#### Deployment Script
```bash
#!/bin/bash
# deploy.sh

# Build the application
npm run build

# Sync with S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 4. Docker Deployment

#### Dockerfile
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  criminal-kitchen:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## Environment-Specific Configurations

### 1. Development Environment

#### Local Development
```bash
# Start development server
npm run dev

# Access at http://localhost:5173
# Hot reload enabled
# Source maps available
```

#### Development Database
- Use development Supabase project
- Separate from production data
- Enable debug logging
- Allow test data creation

### 2. Staging Environment

#### Staging Setup
```bash
# Build for staging
npm run build:staging

# Deploy to staging URL
# Test with production-like data
# Validate all features
```

#### Staging Configuration
- Use staging Supabase project
- Mirror production schema
- Test data migration scripts
- Performance testing

### 3. Production Environment

#### Production Build
```bash
# Production build
npm run build

# Optimized for performance
# Minified code
# No source maps
# Production environment variables
```

#### Production Considerations
- **Performance**: Optimize bundle size
- **Security**: Secure environment variables
- **Monitoring**: Error tracking and analytics
- **Backup**: Database and file backups

## Security Configuration

### 1. Environment Variables

#### Secure Storage
- Never commit secrets to Git
- Use platform-specific secret management
- Rotate keys regularly
- Monitor for exposure

#### Access Control
- Limit API key permissions
- Use least privilege principle
- Monitor API usage
- Set up alerts for anomalies

### 2. CORS Configuration

#### Supabase CORS
```sql
-- Configure allowed origins
INSERT INTO auth.config (key, value) 
VALUES ('cors_origins', '["https://yourdomain.com", "https://www.yourdomain.com"]');
```

#### Frontend CORS
```typescript
// Configure allowed origins in frontend
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];

if (!allowedOrigins.includes(window.location.origin)) {
  throw new Error('Unauthorized origin');
}
```

### 3. SSL/TLS Configuration

#### Domain Configuration
- Use HTTPS for all production traffic
- Configure SSL certificates
- Set up HSTS headers
- Enable secure cookies

## Monitoring and Analytics

### 1. Error Tracking

#### Sentry Integration
```typescript
// Initialize Sentry
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.VITE_APP_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
```

#### Error Boundaries
```typescript
// React error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
}
```

### 2. Performance Monitoring

#### Web Vitals
```typescript
// Monitor Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

#### Performance Metrics
- Bundle size analysis
- Load time monitoring
- API response times
- User interaction metrics

### 3. Analytics

#### Google Analytics
```typescript
// Initialize GA4
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

## Backup and Recovery

### 1. Database Backups

#### Automated Backups
- Daily automated backups
- Point-in-time recovery
- Cross-region replication
- Backup verification

#### Manual Backups
```bash
# Export database schema
pg_dump -h your-host -U your-user -d your-db --schema-only > schema.sql

# Export data
pg_dump -h your-host -U your-user -d your-db --data-only > data.sql
```

### 2. File Storage Backups

#### Storage Bucket Backup
- Regular bucket snapshots
- Version control for files
- Cross-region replication
- Access log monitoring

### 3. Recovery Procedures

#### Database Recovery
1. Stop application
2. Restore from backup
3. Verify data integrity
4. Restart application

#### File Recovery
1. Identify missing files
2. Restore from backup
3. Update file references
4. Verify accessibility

## Troubleshooting

### 1. Common Deployment Issues

#### Build Failures
```bash
# Check TypeScript errors
npm run type-check

# Verify dependencies
npm ls

# Clear cache
npm run clean
rm -rf node_modules package-lock.json
npm install
```

#### Environment Variable Issues
- Verify variable names
- Check for typos
- Ensure proper escaping
- Validate in build process

#### Database Connection Issues
- Verify Supabase URL
- Check API key permissions
- Test network connectivity
- Validate RLS policies

### 2. Performance Issues

#### Bundle Size
```bash
# Analyze bundle
npm run build
npx vite-bundle-analyzer dist

# Optimize imports
# Use code splitting
# Implement lazy loading
```

#### Database Performance
- Check query performance
- Optimize indexes
- Monitor connection pool
- Review RLS policies

### 3. Security Issues

#### API Key Exposure
- Rotate exposed keys
- Review access logs
- Monitor usage patterns
- Set up alerts

#### CORS Issues
- Verify allowed origins
- Check preflight requests
- Validate credentials
- Test cross-origin requests

## Maintenance and Updates

### 1. Regular Maintenance

#### Dependency Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update major versions
npx npm-check-updates -u
npm install
```

#### Security Updates
- Monitor security advisories
- Update vulnerable packages
- Review access controls
- Test security measures

### 2. Version Management

#### Release Process
1. Create release branch
2. Update version numbers
3. Run full test suite
4. Deploy to staging
5. Deploy to production
6. Tag release

#### Rollback Procedures
1. Identify rollback point
2. Revert database changes
3. Deploy previous version
4. Verify functionality
5. Document incident

## Support and Resources

### 1. Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [React Documentation](https://react.dev/)

### 2. Community Support
- GitHub Issues
- Stack Overflow
- Discord communities
- Developer forums

### 3. Professional Support
- Platform support teams
- Consulting services
- Training programs
- Custom development
