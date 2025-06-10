import { useEffect, useState } from "react";

export default function Items() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const handleAdd = () => {
    setModalItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setModalItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await fetch(`/api/items/${id}`, { method: "DELETE" });
      fetchItems();
    }
  };

  const handleModalSave = async (item) => {
    if (item.id) {
      // Edit
      await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    } else {
      // Add
      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    }
    setShowModal(false);
    fetchItems();
  };

  const filtered = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Items</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick={handleAdd}
        >
          + Add Item
        </button>
      </div>
      <input
        className="mb-4 px-3 py-2 border rounded w-full"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">SKU</th>
              <th className="py-2 px-4 text-left">Type</th>
              <th className="py-2 px-4 text-left">Price</th>
              <th className="py-2 px-4 text-left">Quantity</th>
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
                  No items found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-b hover:bg-blue-50">
                  <td className="py-2 px-4">{item.name}</td>
                  <td className="py-2 px-4">{item.sku}</td>
                  <td className="py-2 px-4">{item.type}</td>
                  <td className="py-2 px-4">{item.price}</td>
                  <td className="py-2 px-4">{item.quantity}</td>
                  <td className="py-2 px-4">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(item.id)}
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
        <ItemModal
          item={modalItem}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

// Modal component for Add/Edit
function ItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item || {
      name: "",
      sku: "",
      type: "product",
      price: "",
      quantity: "",
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
          {item ? "Edit Item" : "Add Item"}
        </h2>
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="sku"
          placeholder="SKU"
          value={form.sku}
          onChange={handleChange}
          required
        />
        <select
          className="mb-3 px-3 py-2 border rounded w-full"
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <option value="product">Product</option>
          <option value="service">Service</option>
        </select>
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="price"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          required
        />
        <input
          className="mb-3 px-3 py-2 border rounded w-full"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
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