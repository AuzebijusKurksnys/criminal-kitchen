
import { Link, useLocation } from 'react-router-dom';
import { getRestaurantConfig } from '../data/store';

const navigation = [
  { name: 'Inventory', href: '/inventory' },
  { name: 'Supplier Prices', href: '/supplier-prices' },
  { name: 'Tech Cards', href: '/tech-cards', badge: 'beta' },
  { name: 'Journals', href: '/journals', badge: 'beta' },
  { name: 'Reports', href: '/reports', badge: 'beta' },
];

export function NavBar() {
  const location = useLocation();
  const restaurantConfig = getRestaurantConfig();
  
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Šefas. Virtuvė
              </h1>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === '/inventory' && location.pathname === '/');
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Restaurant selector */}
          <div className="flex items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{restaurantConfig.name}</span>
            </div>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden border-t border-gray-200 pt-4 pb-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href === '/inventory' && location.pathname === '/');
                
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
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
