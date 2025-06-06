'use client';
import { useState, ChangeEvent, FormEvent } from 'react';

type Item = {
  name: string;
  quantity: number;
  rate: number;
  amount: number;
};

export default function NewInvoicePage() {
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState<Item[]>([
    { name: '', quantity: 1, rate: 0, amount: 0 },
  ]);

  const handleItemChange = (
    index: number,
    field: keyof Item,
    value: string
  ) => {
    const updatedItems = [...items];
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index][field] = Number(value);
    } else {
      updatedItems[index][field] = value;
    }

    updatedItems[index].amount =
      Number(updatedItems[index].quantity) * Number(updatedItems[index].rate);

    setItems(updatedItems);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log({ invoiceDate, dueDate, customer, items });
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Invoice</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label>Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setInvoiceDate(e.target.value)
            }
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDueDate(e.target.value)
            }
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div className="sm:col-span-2">
          <label>Customer</label>
          <select
            value={customer}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setCustomer(e.target.value)
            }
            required
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select Customer</option>
            <option value="customer1">Customer 1</option>
            <option value="customer2">Customer 2</option>
          </select>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Items</h2>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-5 gap-3 mb-2">
            <input
              placeholder="Item Name"
              value={item.name}
              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
              className="border px-2 py-1 rounded"
              required
            />
            <input
              type="number"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
              className="border px-2 py-1 rounded"
              required
            />
            <input
              type="number"
              placeholder="Rate"
              value={item.rate}
              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
              className="border px-2 py-1 rounded"
              required
            />
            <input
              type="number"
              value={item.amount.toFixed(2)}
              className="border px-2 py-1 rounded bg-gray-100"
              readOnly
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-blue-600 hover:underline"
        >
          + Add Item
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Save Invoice
        </button>
      </div>
    </form>
  );
}
