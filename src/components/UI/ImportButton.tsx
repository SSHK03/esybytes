import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import Button from './Button';

interface ImportButtonProps {
  onImport: (data: any[]) => void;
  className?: string;
}

const ImportButton: React.FC<ImportButtonProps> = ({ onImport, className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        onImport(json);
      };
      reader.readAsBinaryString(file);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <Button
        variant="outline"
        icon={<Upload size={16} />}
        onClick={() => fileInputRef.current?.click()}
        className={className}
      >
        Import Excel
      </Button>
    </>
  );
};

export default ImportButton;