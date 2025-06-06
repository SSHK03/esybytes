import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Item {
  name: string;
  hsn: string;
  stockQuantity: number;
  type: string;
}

interface Props {
  items: Item[];
}

const LowStockNotification: React.FC<Props> = ({ items }) => {
  const lowStockItems = items.filter(
    item => item.type === 'product' && item.stockQuantity !== undefined && item.stockQuantity < 3
  );

  if (lowStockItems.length === 0) return null;

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded-md mb-6 shadow-sm">
      <div className="flex items-center mb-2 font-semibold">
        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-700" />
        Low Stock Warning
      </div>
      <ul className="text-sm list-disc pl-5">
        {lowStockItems.map((item, index) => (
          <li key={index}>
            <span className="font-medium">{item.name}</span> (HSN: {item.hsn}) — Only {item.stockQuantity} left
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LowStockNotification;