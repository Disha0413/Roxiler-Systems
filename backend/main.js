// Backend API Configuration
const API_BASE_URL = 'http://localhost:3001';

// Token storage
let authToken = null;

const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
};

// Backend API Service
const API = {
  async login(email, password) {
    const data = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store token
    if (data.token) {
      setAuthToken(data.token);
    }
    
    return data;
  },
  
  async signup(userData) {
    const data = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Store token
    if (data.token) {
      setAuthToken(data.token);
    }
    
    return data;
  },
  
  async updatePassword(userId, newPassword) {
    await apiCall(`/api/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
    return true;
  },

  async getUsers() {
    return await apiCall('/api/data/users', {
      method: 'GET',
    });
  },

  async getStores() {
    return await apiCall('/api/data/stores', {
      method: 'GET',
    });
  },

  async getRatings() {
    const ratings = await apiCall('/api/data/ratings', {
      method: 'GET',
    });
    
    // Transform to match frontend expectations
    return ratings.map(r => ({
      id: r.id,
      userId: r.user_id,
      storeId: r.store_id,
      rating: r.rating,
      userEmail: r.user_email
    }));
  },
  
  async submitRating(userId, storeId, rating, userEmail) {
    await apiCall('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ userId, storeId, rating }),
    });
    return true;
  },

  async addUser(userData) {
    await apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return true;
  },

  async addStore(storeData) {
    await apiCall('/api/admin/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
    return true;
  },
  
  logout() {
    setAuthToken(null);
  }
};


// Form Validation Utility
const validate = {
  name: (name) => {
    if (!name || name.length < 20) return 'Name must be at least 20 characters.';
    if (name.length > 60) return 'Name cannot exceed 60 characters.';
    return null;
  },
  address: (address) => {
    if (!address || address.length === 0) return 'Address is required.';
    if (address.length > 400) return 'Address cannot exceed 400 characters.';
    return null;
  },
  password: (password) => {
    if (!password || password.length < 8) return 'Password must be 8-16 characters.';
    if (password.length > 16) return 'Password must be 8-16 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[!@#$%^&*()]/.test(password)) return 'Password must include at least one special character (!@#$%^&*()).';
    return null;
  },
  email: (email) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format.';
    return null;
  },
  rating: (rating) => {
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5) return 'Rating must be between 1 and 5.';
    return null;
  }
};

// Reusable Components
const InputField = ({ label, type = 'text', value, onChange, error, placeholder, minLength, maxLength, required }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
      />
      {error && <p className="text-red-600 text-xs mt-1 absolute -bottom-5 left-0">{error}</p>}
    </div>
  </div>
);

const LucideIcon = ({ name, className = '', ...rest }) => {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }, [name, className]);

  return (
    <i data-lucide={name} className={className} aria-hidden="true" {...rest}></i>
  );
};

const PasswordUpdateModal = ({ userId, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const passwordError = validate.password(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await API.updatePassword(userId, newPassword);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Update Password</h3>
          <button onClick={onClose}><LucideIcon name="x" className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
              >
                {showPassword ? <LucideIcon name="eye-off" className="w-5 h-5" /> : <LucideIcon name="eye" className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">8-16 chars, 1 uppercase, 1 special char.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg pr-10"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Dashboards ---

const AdminDashboard = ({ user, onLogout }) => {
  const [users, setUsers] = React.useState([]);
  const [stores, setStores] = React.useState([]);
  const [ratings, setRatings] = React.useState([]);
  const [view, setView] = React.useState('dashboard');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterRole, setFilterRole] = React.useState('all');
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });
  const [showAddModal, setShowAddModal] = React.useState(null);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [formData, setFormData] = React.useState({});
  const [formErrors, setFormErrors] = React.useState({});

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await API.getUsers();
    const storeData = await API.getStores();
    const ratingData = await API.getRatings();
    setUsers(userData);
    setStores(storeData);
    setRatings(ratingData);
  };

  const handleSort = (key, currentView) => {
    if (currentView !== view) { // Reset sort when changing views
      setSortConfig({ key, direction: 'asc' });
      return;
    }
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        if (aVal.toLowerCase() < bVal.toLowerCase()) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal.toLowerCase() > bVal.toLowerCase()) return sortConfig.direction === 'asc' ? 1 : -1;
      } else {
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredUsers = sortData(users.filter(u => {
    // Only filter users when the view is 'users'
    if (view !== 'users') return true; 

    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  }));

  const filteredStores = sortData(stores.filter(s => {
    // Only filter stores when the view is 'stores'
    if (view !== 'stores') return true; 
    
    return s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.address.toLowerCase().includes(searchTerm.toLowerCase());
  }));

  const getStoreRating = (storeId) => {
    const storeRatings = ratings.filter(r => r.storeId === storeId);
    if (storeRatings.length === 0) return '0.0';
    return (storeRatings.reduce((sum, r) => sum + r.rating, 0) / storeRatings.length).toFixed(1);
  };

  const validateForm = (data, isStore = false) => {
    const errors = {};
    
    if (validate.name(data.name)) errors.name = validate.name(data.name);
    if (validate.email(data.email)) errors.email = validate.email(data.email);
    if (validate.address(data.address)) errors.address = validate.address(data.address);
    if (!isStore && validate.password(data.password)) errors.password = validate.password(data.password);
    if (!isStore && !data.role) errors.role = 'Role is required';
    
    return errors;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData, false);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      await API.addUser(formData);
      await loadData();
      setShowAddModal(null);
      setFormData({});
      setFormErrors({});
    } catch (err) {
      setFormErrors({ general: err.message });
    }
  };

  const handleAddStore = async (e) => {
    e.preventDefault();
    // Use dummy password for validation of store_owner account
    const errors = validateForm({ ...formData, password: 'Store@123', role: 'store_owner' }, true);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      // The mock API.addStore handles creating a user with 'store_owner' role and default password
      await API.addStore({ ...formData, password: 'Store@123' });
      await loadData();
      setShowAddModal(null);
      setFormData({});
      setFormErrors({});
    } catch (err) {
      setFormErrors({ general: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <LucideIcon name="store" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800"
            >
              <LucideIcon name="lock" className="w-4 h-4" />
              Change Password
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800"
            >
              <LucideIcon name="log-out" className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setView('dashboard'); setSearchTerm(''); setFilterRole('all'); setSortConfig({ key: null, direction: 'asc' }); }}
            className={'px-4 py-2 rounded ' + (view === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-white')}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setView('stores'); setSearchTerm(''); setFilterRole('all'); setSortConfig({ key: null, direction: 'asc' }); }}
            className={'px-4 py-2 rounded ' + (view === 'stores' ? 'bg-indigo-600 text-white' : 'bg-white')}
          >
            Stores
          </button>
          <button
            onClick={() => { setView('users'); setSearchTerm(''); setFilterRole('all'); setSortConfig({ key: null, direction: 'asc' }); }}
            className={'px-4 py-2 rounded ' + (view === 'users' ? 'bg-indigo-600 text-white' : 'bg-white')}
          >
            Users
          </button>
        </div>

        {view === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-indigo-600">{users.length}</p>
                </div>
                <LucideIcon name="users" className="w-12 h-12 text-indigo-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Stores</p>
                  <p className="text-3xl font-bold text-indigo-600">{stores.length}</p>
                </div>
                <LucideIcon name="store" className="w-12 h-12 text-indigo-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Ratings</p>
                  <p className="text-3xl font-bold text-indigo-600">{ratings.length}</p>
                </div>
                <LucideIcon name="star" className="w-12 h-12 text-indigo-600 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {view === 'stores' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Stores</h2>
              <button
                onClick={() => { setShowAddModal('store'); setFormData({}); setFormErrors({}); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                <LucideIcon name="plus" className="w-4 h-4" />
                Add Store
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <LucideIcon name="search" className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stores by name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('name', 'stores')}>
                      Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('email', 'stores')}>
                      Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('address', 'stores')}>
                      Address {sortConfig.key === 'address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map(store => (
                    <tr key={store.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{store.name}</td>
                      <td className="px-4 py-2">{store.email}</td>
                      <td className="px-4 py-2">{store.address}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <LucideIcon name="star" className="w-4 h-4 text-yellow-400 fill-current" />
                          {getStoreRating(store.id)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Users</h2>
              <button
                onClick={() => { setShowAddModal('user'); setFormData({}); setFormErrors({}); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                <LucideIcon name="plus" className="w-4 h-4" />
                Add User
              </button>
            </div>
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <LucideIcon name="search" className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="store_owner">Store Owner</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('name', 'users')}>
                      Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('email', 'users')}>
                      Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('address', 'users')}>
                      Address {sortConfig.key === 'address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort('role', 'users')}>
                      Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left">Store Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{u.name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">{u.address}</td>
                      <td className="px-4 py-2">
                        <span className={'px-2 py-1 rounded text-xs font-medium ' + (
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'store_owner' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        )}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {u.role === 'store_owner' ? (
                          <div className="flex items-center gap-1">
                            <LucideIcon name="star" className="w-4 h-4 text-yellow-400 fill-current" />
                            {getStoreRating(u.storeId)}
                          </div>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add {showAddModal === 'user' ? 'User' : 'Store'}</h3>
              <button onClick={() => { setShowAddModal(null); setFormData({}); setFormErrors({}); }}>
                <LucideIcon name="x" className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={showAddModal === 'user' ? handleAddUser : handleAddStore} className="space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {formErrors.general}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (20-60 chars)
                </label>
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                {formErrors.email && <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (max 400 chars)
                </label>
                <textarea
                  placeholder="Address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="2"
                  required
                />
                {formErrors.address && <p className="text-red-600 text-xs mt-1">{formErrors.address}</p>}
              </div>
              
              {showAddModal === 'user' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (8-16 chars, 1 uppercase, 1 special)
                    </label>
                    <input
                      type="password"
                      placeholder="Password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                    {formErrors.password && <p className="text-red-600 text-xs mt-1">{formErrors.password}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role || ''}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="user">Normal User</option>
                    </select>
                    {formErrors.role && <p className="text-red-600 text-xs mt-1">{formErrors.role}</p>}
                  </div>
                </>
              )}
              
              {showAddModal === 'store' && (
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  Default password for the new store owner will be: <strong>Store@123</strong>
                </p>
              )}
              
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Add {showAddModal === 'user' ? 'User' : 'Store'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <PasswordUpdateModal
          userId={user.id}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            alert('Password updated successfully!');
          }}
        />
      )}
    </div>
  );
};

const UserDashboard = ({ user, onLogout }) => {
  const [stores, setStores] = React.useState([]);
  const [ratings, setRatings] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [currentRating, setCurrentRating] = React.useState({ storeId: null, rating: '' });
  const [ratingError, setRatingError] = React.useState(null);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const storeData = await API.getStores();
    const ratingData = await API.getRatings();
    setStores(storeData);
    setRatings(ratingData);
  };

  const getUserRating = (storeId) => {
    const rating = ratings.find(r => r.userId === user.id && r.storeId === storeId);
    return rating ? rating.rating : '-';
  };

  const getOverallRating = (storeId) => {
    const storeRatings = ratings.filter(r => r.storeId === storeId);
    if (storeRatings.length === 0) return '0.0';
    return (storeRatings.reduce((sum, r) => sum + r.rating, 0) / storeRatings.length).toFixed(1);
  };

  const handleRatingChange = (storeId, value) => {
    setCurrentRating({ storeId, rating: value });
    setRatingError(null);
  };

  const handleSubmitRating = async (e, storeId) => {
    e.preventDefault();
    const ratingValue = Number(currentRating.rating);
    const error = validate.rating(ratingValue);
    
    if (error) {
      setRatingError(error);
      return;
    }

    try {
      await API.submitRating(user.id, storeId, ratingValue, user.email);
      await loadData(); // Reload data to show updated rating
      setCurrentRating({ storeId: null, rating: '' });
      setRatingError(null);
      alert('Rating submitted successfully!');
    } catch (err) {
      setRatingError(err.message || 'Failed to submit rating.');
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        if (aVal.toLowerCase() < bVal.toLowerCase()) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal.toLowerCase() > bVal.toLowerCase()) return sortConfig.direction === 'asc' ? 1 : -1;
      } else {
        // Custom sort for rating
        if (sortConfig.key === 'rating') {
            const ratingA = parseFloat(getOverallRating(a.id));
            const ratingB = parseFloat(getOverallRating(b.id));
            if (ratingA < ratingB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (ratingA > ratingB) return sortConfig.direction === 'asc' ? 1 : -1;
        } else {
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  };

  const filteredStores = sortData(stores.filter(s => {
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.address.toLowerCase().includes(term);
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <LucideIcon name="users" className="w-8 h-8" />
            <h1 className="text-xl font-bold">User Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Welcome, {user.name}</span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 bg-green-700 px-4 py-2 rounded hover:bg-green-800"
            >
              <LucideIcon name="lock" className="w-4 h-4" />
              Change Password
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-green-700 px-4 py-2 rounded hover:bg-green-800"
            >
              <LucideIcon name="log-out" className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">All Registered Stores</h2>
        
        <div className="mb-6">
          <div className="relative">
            <LucideIcon name="search" className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search stores by Name or Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('name')}>
                  Store Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('address')}>
                  Address {sortConfig.key === 'address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => handleSort('rating')}>
                  Overall Rating {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Your Rating</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map(store => (
                <tr key={store.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{store.name}</td>
                  <td className="px-4 py-3">{store.address}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <LucideIcon name="star" className="w-4 h-4 text-yellow-400 fill-current" />
                      {getOverallRating(store.id)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getUserRating(store.id)}
                  </td>
                  <td className="px-4 py-3">
                    <form onSubmit={(e) => handleSubmitRating(e, store.id)} className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="5"
                        placeholder={getUserRating(store.id) !== '-' ? 'Modify' : '1-5'}
                        value={currentRating.storeId === store.id ? currentRating.rating : ''}
                        onChange={(e) => handleRatingChange(store.id, e.target.value)}
                        className="w-20 px-2 py-1 border rounded-lg text-sm"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400 transition"
                        disabled={currentRating.storeId !== store.id || !currentRating.rating}
                      >
                        {getUserRating(store.id) !== '-' ? 'Update' : 'Submit'}
                      </button>
                    </form>
                    {currentRating.storeId === store.id && ratingError && (
                      <p className="text-red-600 text-xs mt-1">{ratingError}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPasswordModal && (
        <PasswordUpdateModal
          userId={user.id}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            alert('Password updated successfully!');
          }}
        />
      )}
    </div>
  );
};

const StoreOwnerDashboard = ({ user, onLogout }) => {
  const [store, setStore] = React.useState(null);
  const [storeRatings, setStoreRatings] = React.useState([]);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  
  React.useEffect(() => {
    loadData();
  }, [user.storeId]);

  const loadData = async () => {
    const allStores = await API.getStores();
    const allRatings = await API.getRatings();
    
    const ownerStore = allStores.find(s => s.id === user.storeId);
    setStore(ownerStore);

    const ratingsForStore = allRatings.filter(r => r.storeId === user.storeId);
    setStoreRatings(ratingsForStore);
  };

  const averageRating = storeRatings.length > 0 
    ? (storeRatings.reduce((sum, r) => sum + r.rating, 0) / storeRatings.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-orange-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <LucideIcon name="store" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Store Owner Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Welcome, {user.name}</span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 bg-orange-700 px-4 py-2 rounded hover:bg-orange-800"
            >
              <LucideIcon name="lock" className="w-4 h-4" />
              Change Password
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-orange-700 px-4 py-2 rounded hover:bg-orange-800"
            >
              <LucideIcon name="log-out" className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">{store?.name || 'Loading Store...'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Average Store Rating</p>
                <div className="flex items-end gap-2">
                    <p className="text-4xl font-bold text-orange-600">{averageRating}</p>
                    <LucideIcon name="star" className="w-6 h-6 text-yellow-400 fill-current mb-1" />
                </div>
              </div>
              <LucideIcon name="star" className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Ratings Submitted</p>
                <p className="text-4xl font-bold text-orange-600">{storeRatings.length}</p>
              </div>
              <LucideIcon name="users" className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-4">Users Who Have Submitted Ratings</h3>
        
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">User Email</th>
                <th className="px-4 py-3 text-left">Rating</th>
              </tr>
            </thead>
            <tbody>
              {storeRatings.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{r.userEmail}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <LucideIcon name="star" className="w-4 h-4 text-yellow-400 fill-current" />
                      {r.rating}
                    </div>
                  </td>
                </tr>
              ))}
              {storeRatings.length === 0 && (
                <tr>
                  <td colSpan="2" className="px-4 py-4 text-center text-gray-500">
                    No ratings have been submitted for your store yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPasswordModal && (
        <PasswordUpdateModal
          userId={user.id}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            alert('Password updated successfully!');
          }}
        />
      )}
    </div>
  );
};

// --- Login/Signup Components ---

const Login = ({ onLogin, onShowSignup }) => {
  const [email, setEmail] = React.useState('admin@app.com');
  const [password, setPassword] = React.useState('Admin@123');
  const [error, setError] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const user = await API.login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-indigo-600 mb-6">Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          
          <InputField
            label="Email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <InputField
            label="Password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Log In
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onShowSignup} className="text-indigo-600 hover:text-indigo-800 font-medium">
            Sign Up
          </button>
        </p>
        <div className="mt-4 pt-4 border-t text-sm text-gray-500 space-y-1">
            <p>Demo Credentials (User: <span className="font-mono text-xs bg-gray-200 p-1 rounded">jane@user.com</span>, Pass: <span className="font-mono text-xs bg-gray-200 p-1 rounded">User@123</span>)</p>
            <p>Demo Credentials (Admin: <span className="font-mono text-xs bg-gray-200 p-1 rounded">admin@app.com</span>, Pass: <span className="font-mono text-xs bg-gray-200 p-1 rounded">Admin@123</span>)</p>
            <p>Demo Credentials (Store Owner: <span className="font-mono text-xs bg-gray-200 p-1 rounded">megamart@owner.com</span>, Pass: <span className="font-mono text-xs bg-gray-200 p-1 rounded">Store@123</span>)</p>
        </div>
      </div>
    </div>
  );
};

const Signup = ({ onSignup, onShowLogin }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    address: '',
    password: ''
  });
  const [formErrors, setFormErrors] = React.useState({});
  const [error, setError] = React.useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors({ ...formErrors, [e.target.name]: null }); // Clear error on change
  };

  const validateForm = () => {
    const errors = {};
    if (validate.name(formData.name)) errors.name = validate.name(formData.name);
    if (validate.email(formData.email)) errors.email = validate.email(formData.email);
    if (validate.address(formData.address)) errors.address = validate.address(formData.address);
    if (validate.password(formData.password)) errors.password = validate.password(formData.password);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const user = await API.signup(formData);
      onSignup(user);
    } catch (err) {
      setError(err.message || 'Signup failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-indigo-600 mb-6">Sign Up (Normal User)</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          
          <InputField
            label="Name (20-60 chars)"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            error={formErrors.name}
            minLength="20"
            maxLength="60"
            required
          />
          
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            error={formErrors.email}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address (max 400 chars)
            </label>
            <textarea
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg ${formErrors.address ? 'border-red-500' : 'border-gray-300'}`}
              rows="2"
              maxLength="400"
              required
            />
            {formErrors.address && <p className="text-red-600 text-xs mt-1">{formErrors.address}</p>}
          </div>
          
          <InputField
            label="Password (8-16 chars, 1 uppercase, 1 special)"
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            error={formErrors.password}
            minLength="8"
            maxLength="16"
            required
          />
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Register
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button onClick={onShowLogin} className="text-indigo-600 hover:text-indigo-800 font-medium">
            Log In
          </button>
        </p>
      </div>
    </div>
  );
};


// --- Main App Component ---

function App() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [showSignup, setShowSignup] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleSignup = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    API.logout();
    setCurrentUser(null);
    setShowSignup(false);
  };

  if (!currentUser) {
    if (showSignup) {
      return <Signup onSignup={handleSignup} onShowLogin={() => setShowSignup(false)} />;
    }
    return <Login onLogin={handleLogin} onShowSignup={() => setShowSignup(true)} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'store_owner') {
    return <StoreOwnerDashboard user={currentUser} onLogout={handleLogout} />;
  }

  return <UserDashboard user={currentUser} onLogout={handleLogout} />;
}