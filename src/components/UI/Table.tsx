import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        {children}
      </table>
    </div>
  );
};

interface TheadProps {
  children: React.ReactNode;
  className?: string;
}

export const Thead: React.FC<TheadProps> = ({ children, className = '' }) => {
  return (
    <thead className={className}>
      {children}
    </thead>
  );
};

interface TbodyProps {
  children: React.ReactNode;
  className?: string;
}

export const Tbody: React.FC<TbodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-gray-200 ${className}`}>
      {children}
    </tbody>
  );
};

interface ThProps {
  children: React.ReactNode;
  className?: string;
}

export const Th: React.FC<ThProps> = ({ children, className = '' }) => {
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
};

interface TdProps {
  children: React.ReactNode;
  className?: string;
}

export const Td: React.FC<TdProps> = ({ children, className = '' }) => {
  return (
    <td className={`px-4 py-3 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
};

interface TrProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Tr: React.FC<TrProps> = ({ children, className = '', onClick }) => {
  return (
    <tr 
      className={`
        ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};