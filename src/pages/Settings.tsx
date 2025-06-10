import { useState } from "react";

export default function Settings() {
  // Example state for user/org settings
  const [user, setUser] = useState({ name: "", email: "" });
  const [org, setOrg] = useState({ name: "", email: "" });

  // Example handlers (replace with real API calls)
  const handleUserChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };
  const handleOrgChange = (e) => {
    setOrg({ ...org, [e.target.name]: e.target.value });
  };
  const handleUserSave = (e) => {
    e.preventDefault();
    // TODO: Save user settings via API
    alert("User settings saved!");
  };
  const handleOrgSave = (e) => {
    e.preventDefault();
    // TODO: Save org settings via API
    alert("Organization settings saved!");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">User Settings</h2>
        <form onSubmit={handleUserSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              className="w-full px-3 py-2 border rounded"
              name="name"
              value={user.name}
              onChange={handleUserChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="w-full px-3 py-2 border rounded"
              name="email"
              value={user.email}
              onChange={handleUserChange}
              required
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" type="submit">
            Save User Settings
          </button>
        </form>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Organization Settings</h2>
        <form onSubmit={handleOrgSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization Name</label>
            <input
              className="w-full px-3 py-2 border rounded"
              name="name"
              value={org.name}
              onChange={handleOrgChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Organization Email</label>
            <input
              className="w-full px-3 py-2 border rounded"
              name="email"
              value={org.email}
              onChange={handleOrgChange}
              required
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700" type="submit">
            Save Organization Settings
          </button>
        </form>
      </div>
    </div>
  );
} 