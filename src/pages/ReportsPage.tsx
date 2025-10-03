
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';

export function ReportsPage() {
  const reportSections = [
    {
      title: 'Inventory Reports',
      description: 'Stock levels, low stock alerts, and inventory summaries',
      reports: [
        { name: 'Current Stock Levels', description: 'Complete inventory with quantities and values' },
        { name: 'Low Stock Report', description: 'Items below minimum stock thresholds' },
        { name: 'Inventory Valuation', description: 'Total inventory value based on supplier prices' },
        { name: 'Category Analysis', description: 'Stock distribution by product categories' },
      ]
    },
    {
      title: 'Supplier & Pricing Reports',
      description: 'Supplier performance and pricing analysis',
      reports: [
        { name: 'Supplier Price List', description: 'All supplier prices with preferred suppliers highlighted' },
        { name: 'Price Comparison', description: 'Compare prices across suppliers for each product' },
        { name: 'Supplier Performance', description: 'Analysis of supplier reliability and pricing trends' },
        { name: 'Cost Analysis', description: 'Ingredient costs and price change tracking' },
      ]
    },
    {
      title: 'Compliance Reports',
      description: 'Journal logs and compliance monitoring',
      reports: [
        { name: 'Temperature Logs', description: 'All temperature checks with anomaly highlighting' },
        { name: 'Cleaning Schedule', description: 'Cleaning log compliance and missed tasks' },
        { name: 'Equipment Maintenance', description: 'Equipment check history and issues tracking' },
        { name: 'Compliance Summary', description: 'Overall compliance status and trends' },
      ]
    },
    {
      title: 'Financial Reports',
      description: 'Cost analysis and profitability insights',
      reports: [
        { name: 'Recipe Costing', description: 'Tech card costs and margin analysis' },
        { name: 'Variance Report', description: 'Expected vs actual stock consumption' },
        { name: 'Profit Margin Analysis', description: 'Menu item profitability with suggested pricing' },
        { name: 'Purchase Recommendations', description: 'Optimal purchase quantities and suppliers' },
      ]
    }
  ];

  const exportFormats = [
    { format: 'PDF', description: 'Print-ready reports with charts and formatting' },
    { format: 'Excel', description: 'Spreadsheet format for further analysis' },
    { format: 'CSV', description: 'Raw data export for integration with other systems' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports & Exports</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 text-sm text-yellow-700">
                <p className="font-medium">Reports Feature (Beta)</p>
                <p>
                  This is a skeleton implementation. Full reporting functionality with PDF/Excel generation, charts, and scheduled reports will be implemented in the next iteration.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {reportSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-100">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.reports.map((report, reportIndex) => (
                    <div key={reportIndex} className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-100">{report.name}</h4>
                        <button
                          disabled
                          className="btn-secondary btn-sm opacity-50 cursor-not-allowed"
                        >
                          Generate
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                      
                      <div className="flex space-x-2">
                        {exportFormats.map((format, formatIndex) => (
                          <button
                            key={formatIndex}
                            disabled
                            className="inline-flex items-center px-2 py-1 border border-gray-700 rounded text-xs font-medium text-gray-400 bg-gray-800 cursor-not-allowed"
                            title={format.description}
                          >
                            {format.format}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 text-sm text-blue-700">
                <p className="font-medium">Coming Soon</p>
                <ul className="mt-2 space-y-1">
                  <li>• Automated report scheduling and email delivery</li>
                  <li>• Interactive charts and data visualization</li>
                  <li>• Custom date ranges and filtering options</li>
                  <li>• Report templates for different management levels</li>
                  <li>• Integration with accounting and POS systems</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
