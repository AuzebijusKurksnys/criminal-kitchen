
import { Link, useLocation } from 'react-router-dom';
import { getRestaurantConfig } from '../data/store';

const navigation = [
  { name: 'Stock', href: '/inventory' },
  { name: 'Supplier Prices', href: '/supplier-prices' },
  { name: 'Invoices', href: '/invoices' },
  { name: 'Tech Cards', href: '/tech-cards', badge: 'beta' },
  { name: 'Journals', href: '/journals', badge: 'beta' },
  { name: 'Reports', href: '/reports', badge: 'beta' },
];

export function NavBar() {
  const location = useLocation();
  const restaurantConfig = getRestaurantConfig();
  
  return (
    <nav className="bg-gray-900 border-b border-gray-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-100">
                Kitchen Criminals
              </h1>
            </Link>
            
            <div className="hidden md:flex items-center space-x-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === '/inventory' && location.pathname === '/');
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-4 py-2 text-sm font-normal rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Restaurant selector and settings */}
          <div className="flex items-center space-x-4">
            <Link
              to="/settings"
              className={`p-2 text-gray-400 hover:text-gray-200 rounded-lg transition-colors ${
                location.pathname === '/settings' ? 'text-blue-400 bg-gray-800' : ''
              }`}
              title="Settings"
            >
              ⚙️
            </Link>
            
            <div className="text-sm text-gray-300">
              <span className="font-normal">{restaurantConfig.name}</span>
            </div>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden border-t border-gray-800 pt-4 pb-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href === '/inventory' && location.pathname === '/');
                
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 text-base font-normal rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center">
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
