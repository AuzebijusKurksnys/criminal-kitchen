# Criminal Kitchen - Kitchen Management Platform

## Overview
Criminal Kitchen is a comprehensive kitchen management platform designed for restaurants and food service businesses. The system provides inventory management, supplier pricing, invoice processing, and compliance tracking in a modern, web-based interface.

## System Architecture
- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Deployment**: Vercel
- **State Management**: React hooks + Supabase client
- **AI Integration**: OpenAI GPT-4 Vision API for invoice processing

## Core Domains

### 1. Inventory Management
- Product/SKU management with units (pcs, kg, g, l, ml)
- Stock level tracking and minimum stock alerts
- Category organization and search/filtering
- Bulk operations (selection, deletion)

### 2. Supplier & Pricing
- Supplier directory management
- Per-product supplier pricing with VAT support
- Preferred supplier enforcement (one per product)
- Invoice-based price updates
- Multi-currency support (EUR default)

### 3. Invoice Processing
- PDF/photo upload with AI-powered data extraction
- Automatic product matching and creation
- Inventory quantity updates from invoices
- Supplier price updates from invoice data
- Duplicate invoice prevention

### 4. Compliance & Journals
- Temperature checks (fridges/freezers/lines)
- Cleaning logs and equipment maintenance
- Audit trail and reporting
- Schedule management and assignments

### 5. Tech Cards & Recipes
- Recipe management with ingredient lists
- Cost calculation based on supplier prices
- Yield percentage tracking
- Allergen and nutritional information

## Current Status: MVP Complete ✅

### ✅ Completed Features
- Full inventory CRUD operations
- Supplier management system
- Invoice processing with AI extraction
- VAT-aware supplier pricing
- Bulk operations and filtering
- Database schema and RLS policies
- User authentication and authorization
- File storage and management
- Responsive UI with TailwindCSS

### 🚧 In Progress
- Enhanced reporting and analytics
- Advanced filtering and search
- Performance optimizations

### 📋 Planned Features
- POS integration (SmartOn+ adapter)
- Purchase order generation
- Advanced AI matching with embeddings
- Multi-tenant support
- Mobile app
- Advanced reporting and exports

## Quick Start
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run development server: `npm run dev`
5. Build for production: `npm run build`

## Documentation Index
- [System Architecture](./architecture.md)
- [Database Schema](./database-schema.md)
- [API Reference](./api-reference.md)
- [User Guide](./user-guide.md)
- [Developer Guide](./developer-guide.md)
- [Deployment Guide](./deployment-guide.md)
- [Troubleshooting](./troubleshooting.md)

## Support
For technical support or feature requests, please contact the development team or create an issue in the repository.
