import { useEffect, useState } from "react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalInvoice, setModalInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setInvoices(data);
    setLoading(false);
  };

  const handleAdd = () => {
    setModalInvoice(null);
    setShowModal(true);
  };

  const handleEdit = (invoice) => {
    setModalInvoice(invoice);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      fetchInvoices();
    }
  };

  const handleModalSave = async (invoice) => {
    if (invoice.id) {
      // Edit
      await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
    } else {
      // Add
      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
    }
    setShowModal(false);
    fetchInvoices();
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick={handleAdd}
        >
          + Add Invoice
        </button>
      </div>
      <input
        className="mb-4 px-3 py-2 border rounded w-full"
        placeholder="Search invoices..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Invoice #</th>
              <th className="py-2 px-4 text-left">Customer</th>
              <th className="py-2 px-4 text-left">Date</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">Total</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-blue-50">
                  <td className="py-2 px-4">{inv.invoice_number}</td>
                  <td className="py-2 px-4">{inv.customer_name}</td>
                  <td className="py-2 px-4">{inv.date}</td>
                  <td className="py-2 px-4">{inv.status}</td>
                  <td className="py-2 px-4">{inv.total}</td>
                  <td className="py-2 px-4">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => handleEdit(inv)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(inv.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <InvoiceModal
          invoice={modalInvoice}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

// Modal component for Add/Edit
function InvoiceModal({ invoice, onClose, onSave }) {
  const [form, setForm] = useState(
    invoice || {
      invoice_number: "",
      customer_name: "",
      date: "",
      status: "",
      total: "",
    }
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <form
        className="bg-white p-6 rounded shadow-lg w-full max-w-md"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold mb-4">
          {invoice ? "Edit Invoice" : "Add Invoice"}
        </h2>
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="invoice_number"
          placeholder="Invoice #"
          value={form.invoice_number}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="customer_name"
          placeholder="Customer"
          value={form.customer_name}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="date"
          type="date"
          placeholder="Date"
          value={form.date}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="status"
          placeholder="Status"
          value={form.status}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="total"
          placeholder="Total"
          value={form.total}
          onChange={handleChange}
          required
        />
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
} 