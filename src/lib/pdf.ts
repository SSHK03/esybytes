import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Customer, LineItem } from '../types';
import { format } from 'date-fns';

export const generateInvoicePDF = (invoice: Invoice, customer: Customer) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  
  // Company Info
  doc.setFontSize(20);
  doc.text('Ajuun Tex', 20, 20);
  
  doc.setFontSize(10);
  doc.text('Invoice Number:', 20, 40);
  doc.text(invoice.invoiceNumber, 80, 40);
  
  doc.text('Date:', 20, 45);
  doc.text(format(new Date(invoice.date), 'dd/MM/yyyy'), 80, 45);
  
  doc.text('Due Date:', 20, 50);
  doc.text(format(new Date(invoice.dueDate), 'dd/MM/yyyy'), 80, 50);
  
  // Customer Info
  doc.text('Bill To:', 20, 65);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name, 20, 70);
  doc.setFont('helvetica', 'normal');
  if (customer.companyName) doc.text(customer.companyName, 20, 75);
  if (customer.billingAddress) {
    const addressLines = customer.billingAddress.split('\n');
    addressLines.forEach((line, index) => {
      doc.text(line, 20, 80 + (index * 5));
    });
  }
  
  // Items Table
  const tableData = invoice.items.map((item: LineItem) => [
    item.description,
    item.quantity.toString(),
    `₹${item.price.toFixed(2)}`,
    `${item.tax}%`,
    `₹${item.total.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: 100,
    head: [['Description', 'Quantity', 'Price', 'Tax', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [26, 54, 93] }
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.text('Subtotal:', 140, finalY + 10);
  doc.text(`₹${invoice.subtotal.toFixed(2)}`, 170, finalY + 10);
  
  doc.text('Tax:', 140, finalY + 15);
  doc.text(`₹${invoice.taxTotal.toFixed(2)}`, 170, finalY + 15);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 140, finalY + 20);
  doc.text(`₹${invoice.total.toFixed(2)}`, 170, finalY + 20);
  doc.setFont('helvetica', 'normal');
  
  // Notes
  if (invoice.notes) {
    doc.text('Notes:', 20, finalY + 35);
    doc.setFontSize(9);
    doc.text(invoice.notes, 20, finalY + 40);
  }
  
  // Terms and Conditions
  const terms = `
    Terms and Conditions:
    1. Payment is due by the date specified above
    2. Please include invoice number in payment reference
    3. Make all checks payable to Ajuun Tex
  `;
  
  if (finalY + 80 > pageHeight) {
    doc.addPage();
    doc.text(terms, 20, 20);
  } else {
    doc.text(terms, 20, finalY + 60);
  }
  
  return doc;
};