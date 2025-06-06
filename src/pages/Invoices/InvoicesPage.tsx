import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Filter, Upload, Download } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge'; // ✅ Ensure this file exists
import EmptyState from '../../components/UI/EmptyState';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ✅ Explicitly import autotable

const InvoicesPage: React.FC = () => {
  const { invoices, getCustomerById, addInvoice, addItem } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'secondary',
      sent: 'info',
      paid: 'success',
      overdue: 'danger',
      cancelled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      jsonData.forEach((row: any) => {
        const newInvoice = {
          id: Math.random().toString(36).substr(2, 9),
          invoiceNumber: row.invoiceNumber || 'INV-XXX',
          customerId: row.customerId || '',
          date: row.date || new Date().toISOString(),
          dueDate: row.dueDate || new Date().toISOString(),
          total: parseFloat(row.total) || 0,
          status: row.status || 'draft',
        };
        addInvoice(newInvoice);
      });
    };
    reader.readAsBinaryString(file);
  };

  const handleItemsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      jsonData.forEach((row: any) => {
        const newItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: row.name || '',
          type: row.type || 'product',
          price: parseFloat(row.price) || 0,
          tax: parseFloat(row.tax) || 0,
          stockQuantity: parseInt(row.stockQuantity) || 0,
          unit: row.unit || 'units',
          description: row.description || ''
        };
        addItem(newItem);
      });
    };
    reader.readAsBinaryString(file);
  };

  const exportInvoiceAsPDF = (invoice: any, customer: any) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Invoice', 14, 22);

    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, 35);
    doc.text(`Customer: ${customer?.name || 'Unknown'}`, 14, 43);
    doc.text(`Date: ${format(new Date(invoice.date), 'MMM dd, yyyy')}`, 14, 51);
    doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`, 14, 59);

    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Amount']],
      body: [['Total', `$${invoice.total.toFixed(2)}`]],
    });

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const customer = getCustomerById(invoice.customerId);
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesFilter = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Invoices</h2>
          <Badge variant="info" className="ml-2">{invoices.length}</Badge>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/invoices/new')}>
            Create Invoice
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileUpload} />
            <Button variant="secondary" icon={<Upload size={16} />}>Import Invoices</Button>
          </label>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx, .xls" hidden onChange={handleItemsUpload} />
            <Button variant="secondary" icon={<Upload size={16} />}>Import Items</Button>
          </label>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number or customer..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="No invoices yet"
            description="Create your first invoice to get started. You can create an invoice from scratch or based on a sales order."
            action={{
              label: "Create Invoice",
              onClick: () => navigate('/invoices/new')
            }}
          />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={<Search size={48} />}
            title="No matching invoices"
            description="Try adjusting your search or filter to find what you're looking for."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm('');
                setStatusFilter('all');
              }
            }}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Invoice #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Due Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredInvoices.map((invoice) => {
                const customer = getCustomerById(invoice.customerId);
                return (
                  <Tr key={invoice.id} onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <Td className="font-medium text-blue-600">{invoice.invoiceNumber}</Td>
                    <Td>{customer?.name || 'Unknown'}</Td>
                    <Td>{format(new Date(invoice.date), 'MMM dd, yyyy')}</Td>
                    <Td>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</Td>
                    <Td className="font-medium">${invoice.total.toFixed(2)}</Td>
                    <Td>{getStatusBadge(invoice.status)}</Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Download size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          exportInvoiceAsPDF(invoice, customer);
                        }}
                      >
                        Download
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default InvoicesPage;