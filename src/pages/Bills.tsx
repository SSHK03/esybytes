import { useEffect, useState } from "react";

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalBill, setModalBill] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    const res = await fetch("/api/bills");
    const data = await res.json();
    setBills(data);
    setLoading(false);
  };

  const handleAdd = () => {
    setModalBill(null);
    setShowModal(true);
  };

  const handleEdit = (bill) => {
    setModalBill(bill);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      await fetch(`/api/bills/${id}`, { method: "DELETE" });
      fetchBills();
    }
  };

  const handleModalSave = async (bill) => {
    if (bill.id) {
      // Edit
      await fetch(`/api/bills/${bill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bill),
      });
    } else {
      // Add
      await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bill),
      });
    }
    setShowModal(false);
    fetchBills();
  };

  const filtered = bills.filter(
    (bill) =>
      bill.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      bill.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
      bill.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bills</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick={handleAdd}
        >
          + Add Bill
        </button>
      </div>
      <input
        className="mb-4 px-3 py-2 border rounded w-full"
        placeholder="Search bills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Bill #</th>
              <th className="py-2 px-4 text-left">Vendor</th>
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
                  No bills found.
                </td>
              </tr>
            ) : (
              filtered.map((bill) => (
                <tr key={bill.id} className="border-b hover:bg-blue-50">
                  <td className="py-2 px-4">{bill.bill_number}</td>
                  <td className="py-2 px-4">{bill.vendor_name}</td>
                  <td className="py-2 px-4">{bill.date}</td>
                  <td className="py-2 px-4">{bill.status}</td>
                  <td className="py-2 px-4">{bill.total}</td>
                  <td className="py-2 px-4">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => handleEdit(bill)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(bill.id)}
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
        <BillModal
          bill={modalBill}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

// Modal component for Add/Edit
function BillModal({ bill, onClose, onSave }) {
  const [form, setForm] = useState(
    bill || {
      bill_number: "",
      vendor_name: "",
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
          {bill ? "Edit Bill" : "Add Bill"}
        </h2>
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="bill_number"
          placeholder="Bill #"
          value={form.bill_number}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="vendor_name"
          placeholder="Vendor"
          value={form.vendor_name}
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