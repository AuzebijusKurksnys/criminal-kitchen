# User Guide - Criminal Kitchen

## Getting Started

### First Time Setup
1. **Access the System**: Navigate to your Criminal Kitchen instance
2. **Login**: Use your provided credentials
3. **Initial Setup**: Complete the first-time setup wizard
4. **Add Suppliers**: Begin by adding your key suppliers
5. **Import Products**: Add your existing inventory or start fresh

### Navigation Overview
- **Dashboard**: Overview of key metrics and recent activity
- **Inventory**: Product management and stock tracking
- **Suppliers**: Vendor management and pricing
- **Invoices**: Document processing and management
- **Compliance**: Temperature checks, cleaning logs, equipment
- **Reports**: Analytics and export functionality

## Inventory Management

### Adding Products
1. Navigate to **Inventory** → **Add Product**
2. Fill in required fields:
   - **SKU**: Unique product identifier (e.g., CHICK-001)
   - **Name**: Product name (e.g., Chicken Breast)
   - **Unit**: Measurement unit (kg, g, l, ml, pcs)
   - **Quantity**: Current stock level
   - **Min Stock**: Minimum stock threshold for alerts
   - **Category**: Product classification (e.g., Meat, Dry, Fresh)
   - **Notes**: Additional information

3. Click **Save** to create the product

### Managing Product Categories
- **Meat**: Fresh and frozen meat products
- **Dry**: Grains, flour, spices, dry goods
- **Fresh**: Vegetables, fruits, dairy
- **Frozen**: Frozen vegetables, meats, prepared foods
- **Beverages**: Drinks, juices, alcoholic beverages
- **Cleaning**: Cleaning supplies and chemicals

### Stock Level Management
- **Current Stock**: Real-time quantity display
- **Low Stock Alerts**: Automatic notifications when below minimum
- **Stock Updates**: Manual adjustments and corrections
- **Stock History**: Track all quantity changes over time

### Bulk Operations
1. **Select Products**: Use checkboxes to select multiple products
2. **Bulk Actions**: 
   - Delete selected products
   - Update categories
   - Export to CSV
   - Print labels

### Search and Filtering
- **Quick Search**: Search by name or SKU
- **Advanced Filters**:
  - Category filter
  - Stock level filter (low, zero, in-stock, overstocked)
  - Unit type filter
  - Date range filter

## Supplier Management

### Adding Suppliers
1. Navigate to **Suppliers** → **Add Supplier**
2. Enter supplier information:
   - **Name**: Company name (e.g., Foodlevel, UAB)
   - **Email**: Contact email address
   - **Phone**: Contact phone number
   - **Notes**: Additional information

### Managing Supplier Prices
1. **Select Product**: Choose a product from the dropdown
2. **View Prices**: See all supplier prices for the selected product
3. **Add Price**: Enter new supplier price information
4. **Set Preferred**: Mark one supplier as preferred per product

### Price Management Features
- **VAT Support**: Automatic VAT calculations (21% default)
- **Price History**: Track price changes over time
- **Currency Support**: Multi-currency pricing (EUR default)
- **Invoice Linking**: Link prices to source invoices

### Preferred Supplier System
- **One Preferred Per Product**: Only one supplier can be marked as preferred
- **Automatic Updates**: Changing preferred supplier updates all related data
- **Cost Calculations**: Tech cards use preferred supplier prices

## Invoice Processing

### Uploading Invoices
1. **Drag & Drop**: Drag PDF or image files to the upload area
2. **Camera Upload**: Use device camera to capture invoice images
3. **File Requirements**:
   - **Formats**: PDF, JPG, PNG, HEIC
   - **Size**: Maximum 10MB per file
   - **Quality**: Clear, readable text and numbers

### AI-Powered Data Extraction
The system uses OpenAI GPT-4 Vision to automatically extract:
- **Invoice Details**: Number, date, supplier
- **Line Items**: Product names, quantities, prices
- **Totals**: Subtotal, VAT, discount, grand total
- **Payment Terms**: Due dates, payment methods

### Review and Approval Process
1. **AI Extraction**: Automatic data extraction from uploaded files
2. **Manual Review**: Review extracted data for accuracy
3. **Product Matching**: Match invoice items to existing products
4. **Approval**: Approve and process the invoice
5. **Inventory Update**: Automatic stock level updates

### Invoice Status Tracking
- **Pending**: Uploaded, awaiting processing
- **Processing**: AI extraction in progress
- **Review**: Manual review required
- **Approved**: Processed and inventory updated
- **Rejected**: Failed processing or invalid data

### Duplicate Prevention
- **Supplier + Invoice Number**: Unique combination enforced
- **Automatic Detection**: System prevents duplicate uploads
- **Error Messages**: Clear feedback on duplicate attempts

## Compliance Management

### Temperature Checks
1. **Add Check**: Navigate to **Compliance** → **Temperature Checks**
2. **Enter Details**:
   - **Location**: Fridge, freezer, cooking line
   - **Temperature**: Value in Celsius
   - **Notes**: Observations or issues
3. **Save**: Record the temperature check

### Cleaning Logs
1. **Log Cleaning**: Navigate to **Compliance** → **Cleaning Logs**
2. **Record Details**:
   - **Area**: Kitchen section or equipment
   - **Status**: Done or missed
   - **Notes**: Cleaning details or issues
3. **Schedule**: Set up recurring cleaning tasks

### Equipment Checks
1. **Check Equipment**: Navigate to **Compliance** → **Equipment Checks**
2. **Record Status**:
   - **Equipment**: Name or identifier
   - **Status**: OK or issue
   - **Notes**: Maintenance needs or problems
3. **Maintenance**: Track equipment maintenance history

## Tech Cards (Recipes)

### Creating Tech Cards
1. Navigate to **Tech Cards** → **Add Tech Card**
2. **Basic Information**:
   - **Name**: Recipe name
   - **Notes**: Preparation instructions
3. **Ingredients**: Add ingredient list with quantities
4. **Cost Calculation**: Automatic cost calculation based on supplier prices

### Ingredient Management
- **Product Selection**: Choose from existing inventory
- **Quantities**: Netto quantities with units
- **Yield Percentage**: Account for cooking losses
- **Cost Tracking**: Real-time cost updates

### Cost Calculations
- **Ingredient Costs**: Based on preferred supplier prices
- **Total Recipe Cost**: Sum of all ingredient costs
- **Suggested Price**: Target markup applied to cost
- **Margin Calculation**: Profit margin analysis

## Reporting and Analytics

### Inventory Reports
- **Stock Levels**: Current inventory status
- **Low Stock Alerts**: Products below minimum levels
- **Stock Movements**: Quantity change history
- **Category Analysis**: Inventory by category

### Supplier Reports
- **Price Comparisons**: Compare prices across suppliers
- **Price History**: Track price changes over time
- **Supplier Performance**: Analyze supplier reliability
- **Cost Analysis**: Impact of price changes

### Invoice Reports
- **Processing Status**: Track invoice processing
- **Supplier Analysis**: Invoice volume by supplier
- **Cost Tracking**: Total spending by period
- **VAT Analysis**: VAT amounts and compliance

### Export Options
- **CSV Export**: Download data for external analysis
- **PDF Reports**: Printable report formats
- **Data Integration**: Connect to external systems
- **Scheduled Reports**: Automated report generation

## System Settings

### User Preferences
- **Language**: English (Lithuanian coming soon)
- **Currency**: EUR (USD, GBP support planned)
- **Time Zone**: Local time zone settings
- **Notifications**: Email and in-app alerts

### Business Rules
- **VAT Rate**: Default VAT rate (21% for Lithuania)
- **Markup Multiplier**: Target profit margin (default: 4.0)
- **Stock Alerts**: Low stock notification thresholds
- **Auto-processing**: Automatic invoice processing settings

### Security Settings
- **Password Policy**: Password requirements and expiration
- **Session Management**: Login session duration
- **Access Control**: Role-based permissions
- **Audit Logging**: Track all system changes

## Troubleshooting

### Common Issues

#### Invoice Upload Problems
- **File Size**: Ensure files are under 10MB
- **File Format**: Use supported formats (PDF, JPG, PNG)
- **Image Quality**: Ensure text is clear and readable
- **Network**: Check internet connection stability

#### Data Extraction Issues
- **Poor Quality**: Improve image quality or use PDF
- **Handwriting**: Printed text works better than handwriting
- **Language**: Currently optimized for English/Lithuanian
- **Format**: Standard invoice formats work best

#### Inventory Updates
- **Quantity Changes**: Verify invoice line item quantities
- **Product Matching**: Ensure correct product selection
- **Unit Consistency**: Check unit conversions
- **Approval Process**: Complete invoice approval workflow

### Getting Help
1. **In-App Help**: Use the help system within the application
2. **Documentation**: Refer to this user guide
3. **Support Team**: Contact technical support
4. **Training**: Request user training sessions

## Best Practices

### Inventory Management
- **Regular Updates**: Update stock levels daily
- **Category Organization**: Use consistent product categories
- **SKU Naming**: Follow established naming conventions
- **Stock Alerts**: Set appropriate minimum stock levels

### Invoice Processing
- **Quality Uploads**: Ensure clear, readable invoice images
- **Regular Processing**: Process invoices promptly
- **Review Process**: Always review extracted data
- **Data Validation**: Verify quantities and prices

### Supplier Management
- **Price Updates**: Keep supplier prices current
- **Preferred Suppliers**: Maintain accurate preferred supplier settings
- **Contact Information**: Keep supplier details updated
- **Performance Tracking**: Monitor supplier reliability

### Compliance
- **Regular Checks**: Perform compliance checks on schedule
- **Documentation**: Maintain detailed compliance records
- **Issue Tracking**: Follow up on compliance issues
- **Training**: Ensure staff understand compliance requirements

## Keyboard Shortcuts

### Navigation
- **Ctrl + 1**: Go to Inventory
- **Ctrl + 2**: Go to Suppliers
- **Ctrl + 3**: Go to Invoices
- **Ctrl + 4**: Go to Compliance
- **Ctrl + 5**: Go to Reports

### Common Actions
- **Ctrl + N**: New item (product, supplier, etc.)
- **Ctrl + S**: Save current form
- **Ctrl + F**: Search/filter
- **Ctrl + D**: Delete selected item
- **Ctrl + E**: Edit selected item

### Table Operations
- **Space**: Select/deselect row
- **Enter**: Edit selected row
- **Delete**: Delete selected row
- **Ctrl + A**: Select all rows
- **Escape**: Clear selection

## Mobile Usage

### Responsive Design
- **Mobile Optimized**: Works on all device sizes
- **Touch Friendly**: Optimized for touch interfaces
- **Responsive Tables**: Tables adapt to screen size
- **Mobile Forms**: Optimized form layouts

### Mobile Features
- **Camera Upload**: Direct camera integration for invoices
- **Touch Gestures**: Swipe and tap navigation
- **Offline Support**: Basic functionality without internet
- **Push Notifications**: Stock alerts and reminders

## Data Backup and Recovery

### Automatic Backups
- **Daily Backups**: Automatic database backups
- **File Storage**: Secure file backup system
- **Version History**: Track data changes over time
- **Recovery Points**: Multiple recovery options

### Manual Backup
- **Export Data**: Download data in various formats
- **Report Generation**: Create backup reports
- **Data Validation**: Verify backup integrity
- **Recovery Testing**: Test recovery procedures

## Future Features

### Planned Enhancements
- **POS Integration**: Connect to point-of-sale systems
- **Advanced AI**: Enhanced product matching
- **Mobile App**: Native mobile applications
- **Multi-tenant**: Support for multiple restaurants
- **Advanced Reporting**: Business intelligence features

### User Feedback
- **Feature Requests**: Submit enhancement ideas
- **Bug Reports**: Report system issues
- **User Surveys**: Participate in user research
- **Beta Testing**: Test new features early
