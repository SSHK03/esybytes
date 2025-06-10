import { useEffect, useState } from "react";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalPayment, setModalPayment] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data);
    setLoading(false);
  };

  const handleAdd = () => {
    setModalPayment(null);
    setShowModal(true);
  };

  const handleEdit = (payment) => {
    setModalPayment(payment);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      await fetch(`/api/payments/${id}`, { method: "DELETE" });
      fetchPayments();
    }
  };

  const handleModalSave = async (payment) => {
    if (payment.id) {
      // Edit
      await fetch(`/api/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
    } else {
      // Add
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
    }
    setShowModal(false);
    fetchPayments();
  };

  const filtered = payments.filter(
    (p) =>
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.payment_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick={handleAdd}
        >
          + Add Payment
        </button>
      </div>
      <input
        className="mb-4 px-3 py-2 border rounded w-full"
        placeholder="Search payments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Payment #</th>
              <th className="py-2 px-4 text-left">Customer</th>
              <th className="py-2 px-4 text-left">Date</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">Amount</th>
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
                  No payments found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b hover:bg-blue-50">
                  <td className="py-2 px-4">{p.payment_number}</td>
                  <td className="py-2 px-4">{p.customer_name}</td>
                  <td className="py-2 px-4">{p.date}</td>
                  <td className="py-2 px-4">{p.status}</td>
                  <td className="py-2 px-4">{p.amount}</td>
                  <td className="py-2 px-4">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => handleEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(p.id)}
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
        <PaymentModal
          payment={modalPayment}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

// Modal component for Add/Edit
function PaymentModal({ payment, onClose, onSave }) {
  const [form, setForm] = useState(
    payment || {
      payment_number: "",
      customer_name: "",
      date: "",
      status: "",
      amount: "",
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
          {payment ? "Edit Payment" : "Add Payment"}
        </h2>
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="payment_number"
          placeholder="Payment #"
          value={form.payment_number}
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
          name="amount"
          placeholder="Amount"
          value={form.amount}
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