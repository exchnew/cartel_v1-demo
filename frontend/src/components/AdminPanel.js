import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/admin/login`, credentials);
      if (response.data.success) {
        localStorage.setItem('admin_token', response.data.data.access_token);
        localStorage.setItem('admin_user', JSON.stringify(response.data.data.user));
        onLogin(response.data.data.user);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-form">
        <h1>CARTEL Admin Panel</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [partners, setPartners] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showEditExchangeModal, setShowEditExchangeModal] = useState(false);
  const [showViewExchangeModal, setShowViewExchangeModal] = useState(false);
  const [showEditPartnerModal, setShowEditPartnerModal] = useState(false);
  const [showCreatePartnerModal, setShowCreatePartnerModal] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [editingExchange, setEditingExchange] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);

  // Get authentication headers
  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('admin_token')}`
    }
  });

  // Load dashboard data
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/stats`, getAuthHeaders());
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  };

  // Load partners
  const loadPartners = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/partners`, getAuthHeaders());
      setPartners(response.data.data);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
    setLoading(false);
  };

  // Load exchanges
  const loadExchanges = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/exchanges`, getAuthHeaders());
      setExchanges(response.data.data);
    } catch (error) {
      console.error('Error loading exchanges:', error);
    }
    setLoading(false);
  };

  // Load tokens
  const loadTokens = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/tokens`, getAuthHeaders());
      setTokens(response.data.data);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
    setLoading(false);
  };

  // Load settings
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/settings`, getAuthHeaders());
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'partners') loadPartners();
    if (activeTab === 'exchanges') loadExchanges();
    if (activeTab === 'tokens') loadTokens();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab]);

  // Exchange operations
  const handleEditExchange = (exchange) => {
    setSelectedExchange(exchange);
    setEditingExchange({
      from_amount: exchange.from_amount,
      to_amount: exchange.to_amount,
      receiving_address: exchange.receiving_address,
      refund_address: exchange.refund_address || '',
      status: exchange.status,
      deposit_hash: exchange.deposit_hash || '',
      withdrawal_hash: exchange.withdrawal_hash || '',
      partner_commission: exchange.partner_commission || 0,
      company_commission: exchange.company_commission || 0,
      actual_received_amount: exchange.actual_received_amount || '',
      actual_sent_amount: exchange.actual_sent_amount || '',
      node_address: exchange.node_address || '',
      memo: exchange.memo || '',
      notes: exchange.notes || ''
    });
    setShowEditExchangeModal(true);
  };

  const handleViewExchange = (exchange) => {
    setSelectedExchange(exchange);
    setShowViewExchangeModal(true);
  };

  const handleUpdateExchange = async () => {
    if (!selectedExchange || !editingExchange) return;
    
    try {
      setLoading(true);
      await axios.put(
        `${API}/admin/exchanges/${selectedExchange.id}`, 
        editingExchange,
        getAuthHeaders()
      );
      
      // Reload exchanges
      await loadExchanges();
      setShowEditExchangeModal(false);
      setSelectedExchange(null);
      setEditingExchange(null);
    } catch (error) {
      console.error('Error updating exchange:', error);
    }
    setLoading(false);
  };

  // Partner operations
  const handleEditPartner = (partner) => {
    setSelectedPartner(partner);
    setEditingPartner({
      name: partner.name,
      email: partner.email,
      company: partner.company || '',
      commission_rate: partner.commission_rate,
      status: partner.status,
      payout_address: partner.payout_address || '',
      payout_currency: partner.payout_currency || '',
      min_payout: partner.min_payout
    });
    setShowEditPartnerModal(true);
  };

  const handleCreatePartner = () => {
    setEditingPartner({
      name: '',
      email: '',
      company: '',
      commission_rate: 30,
      payout_address: '',
      payout_currency: '',
      min_payout: 50
    });
    setShowCreatePartnerModal(true);
  };

  const handleUpdatePartner = async () => {
    if (!selectedPartner || !editingPartner) return;
    
    try {
      setLoading(true);
      await axios.put(
        `${API}/admin/partners/${selectedPartner.id}`, 
        editingPartner,
        getAuthHeaders()
      );
      
      await loadPartners();
      setShowEditPartnerModal(false);
      setSelectedPartner(null);
      setEditingPartner(null);
    } catch (error) {
      console.error('Error updating partner:', error);
    }
    setLoading(false);
  };

  const handleCreatePartnerSubmit = async () => {
    if (!editingPartner) return;
    
    try {
      setLoading(true);
      await axios.post(
        `${API}/admin/partners`, 
        editingPartner,
        getAuthHeaders()
      );
      
      await loadPartners();
      setShowCreatePartnerModal(false);
      setEditingPartner(null);
    } catch (error) {
      console.error('Error creating partner:', error);
    }
    setLoading(false);
  };

  const handleDeletePartner = async (partnerId) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API}/admin/partners/${partnerId}`, getAuthHeaders());
      await loadPartners();
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
    setLoading(false);
  };

  // Token operations
  const handleToggleToken = async (token) => {
    try {
      setLoading(true);
      await axios.put(
        `${API}/admin/tokens/${token.id}`,
        { is_active: !token.is_active },
        getAuthHeaders()
      );
      await loadTokens();
    } catch (error) {
      console.error('Error toggling token:', error);
    }
    setLoading(false);
  };

  const handleToggleTokenVisibility = async (token) => {
    try {
      setLoading(true);
      await axios.put(
        `${API}/admin/tokens/${token.id}`,
        { is_visible: !token.is_visible },
        getAuthHeaders()
      );
      await loadTokens();
    } catch (error) {
      console.error('Error toggling token visibility:', error);
    }
    setLoading(false);
  };

  // Settings operations
  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      await axios.put(`${API}/admin/settings`, settings, getAuthHeaders());
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
    }
    setLoading(false);
  };

  // Dashboard Tab Content
  const DashboardContent = () => (
    <div className="admin-content">
      <h2>Dashboard</h2>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Exchanges</h3>
            <p className="stat-value">{stats.total_exchanges}</p>
          </div>
          <div className="stat-card">
            <h3>Active Partners</h3>
            <p className="stat-value">{stats.active_partners}</p>
          </div>
          <div className="stat-card">
            <h3>Today's Exchanges</h3>
            <p className="stat-value">{stats.today_exchanges}</p>
          </div>
          <div className="stat-card">
            <h3>Monthly Exchanges</h3>
            <p className="stat-value">{stats.monthly_exchanges}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Partners Tab Content
  const PartnersContent = () => (
    <div className="admin-content">
      <h2>Partners Management</h2>
      <div className="table-actions">
        <button 
          className="btn-create"
          onClick={handleCreatePartner}
        >
          <i className="fas fa-plus"></i> Create Partner
        </button>
      </div>
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Commission</th>
              <th>Status</th>
              <th>API Key</th>
              <th>Referral Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(partner => (
              <tr key={partner.id}>
                <td>{partner.name}</td>
                <td>{partner.email}</td>
                <td>{partner.commission_rate}%</td>
                <td className={`status ${partner.status}`}>{partner.status}</td>
                <td className="api-key">{partner.api_key}</td>
                <td>{partner.referral_code}</td>
                <td>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEditPartner(partner)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDeletePartner(partner.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Exchanges Tab Content
  const ExchangesContent = () => (
    <div className="admin-content">
      <h2>Exchanges Management</h2>
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>From → To</th>
              <th>Отправка</th>
              <th>К получению</th>
              <th>Status</th>
              <th>Partner</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exchanges.map(exchange => (
              <tr key={exchange.id}>
                <td className="exchange-id">{exchange.id.slice(0, 8)}...</td>
                <td>{exchange.from_currency} → {exchange.to_currency}</td>
                <td>{exchange.from_amount} {exchange.from_currency}</td>
                <td>{exchange.to_amount} {exchange.to_currency}</td>
                <td className={`status ${exchange.status}`}>{exchange.status}</td>
                <td>{exchange.partner_id || 'Direct'}</td>
                <td>{new Date(exchange.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEditExchange(exchange)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-view"
                    onClick={() => handleViewExchange(exchange)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Tokens Tab Content
  const TokensContent = () => (
    <div className="admin-content">
      <h2>Currency Tokens Management</h2>
      <div className="tokens-grid">
        {tokens.map(token => (
          <div key={token.id} className="token-card">
            <div className="token-header">
              <h3>{token.currency}</h3>
              <div className="token-controls">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={token.is_active}
                    onChange={() => handleToggleToken(token)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <p>{token.name}</p>
            <p>Network: {token.network}</p>
            <p>Min: {token.min_amount} | Max: {token.max_amount}</p>
            <p>
              <span className={token.is_visible ? 'text-green' : 'text-red'}>
                {token.is_visible ? 'Visible on site' : 'Hidden from site'}
              </span>
            </p>
            <div className="token-actions">
              <button 
                className={`btn-toggle ${token.is_visible ? 'btn-hide' : 'btn-show'}`}
                onClick={() => handleToggleTokenVisibility(token)}
              >
                {token.is_visible ? 'Hide' : 'Show'}
              </button>
              <button className="btn-upload">Upload Icon</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Settings Tab Content
  const SettingsContent = () => (
    <div className="admin-content">
      <h2>System Settings</h2>
      {settings && (
        <div className="settings-form">
          <div className="settings-section">
            <h3>Rate Settings</h3>
            <div className="form-group">
              <label>Rate Markup Percentage:</label>
              <input 
                type="number" 
                value={settings.rate_markup_percentage}
                onChange={(e) => setSettings({
                  ...settings, 
                  rate_markup_percentage: parseFloat(e.target.value)
                })}
              />
            </div>
            <div className="form-group">
              <label>Partner Rate Difference:</label>
              <input 
                type="number" 
                value={settings.partner_rate_difference}
                onChange={(e) => setSettings({
                  ...settings, 
                  partner_rate_difference: parseFloat(e.target.value)
                })}
              />
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Commission Settings</h3>
            <div className="form-group">
              <label>Default Floating Fee (%):</label>
              <input 
                type="number" 
                value={settings.default_floating_fee}
                onChange={(e) => setSettings({
                  ...settings, 
                  default_floating_fee: parseFloat(e.target.value)
                })}
              />
            </div>
            <div className="form-group">
              <label>Default Fixed Fee (%):</label>
              <input 
                type="number" 
                value={settings.default_fixed_fee}
                onChange={(e) => setSettings({
                  ...settings, 
                  default_fixed_fee: parseFloat(e.target.value)
                })}
              />
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Minimum Deposits</h3>
            {Object.entries(settings.min_deposits || {}).map(([currency, amount]) => (
              <div key={currency} className="form-group">
                <label>{currency} Minimum:</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setSettings({
                    ...settings,
                    min_deposits: {
                      ...settings.min_deposits,
                      [currency]: parseFloat(e.target.value)
                    }
                  })}
                />
              </div>
            ))}
          </div>
          
          <button 
            className="btn-save"
            onClick={handleUpdateSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>CARTEL Admin Panel</h1>
        </div>
        <div className="admin-header-right">
          <span>Welcome, {user.username}</span>
          <button onClick={onLogout} className="btn-logout">Logout</button>
        </div>
      </header>
      
      <div className="admin-layout">
        <nav className="admin-sidebar">
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''}>
              <button onClick={() => setActiveTab('dashboard')}>
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </button>
            </li>
            <li className={activeTab === 'partners' ? 'active' : ''}>
              <button onClick={() => setActiveTab('partners')}>
                <i className="fas fa-users"></i> Partners
              </button>
            </li>
            <li className={activeTab === 'exchanges' ? 'active' : ''}>
              <button onClick={() => setActiveTab('exchanges')}>
                <i className="fas fa-exchange-alt"></i> Exchanges
              </button>
            </li>
            <li className={activeTab === 'tokens' ? 'active' : ''}>
              <button onClick={() => setActiveTab('tokens')}>
                <i className="fas fa-coins"></i> Tokens
              </button>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''}>
              <button onClick={() => setActiveTab('settings')}>
                <i className="fas fa-cog"></i> Settings
              </button>
            </li>
          </ul>
        </nav>
        
        <main className="admin-main">
          {loading && <div className="loading">Loading...</div>}
          
          {activeTab === 'dashboard' && <DashboardContent />}
          {activeTab === 'partners' && <PartnersContent />}
          {activeTab === 'exchanges' && <ExchangesContent />}
          {activeTab === 'tokens' && <TokensContent />}
          {activeTab === 'settings' && <SettingsContent />}
        </main>
      </div>

      {/* Edit Exchange Modal */}
      {showEditExchangeModal && selectedExchange && editingExchange && (
        <div className="modal-overlay" onClick={() => setShowEditExchangeModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Exchange: {selectedExchange.id.slice(0, 8)}...</h3>
              <button 
                className="close-modal"
                onClick={() => setShowEditExchangeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>From Amount:</label>
                  <input
                    type="number"
                    value={editingExchange.from_amount}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      from_amount: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>To Amount:</label>
                  <input
                    type="number"
                    value={editingExchange.to_amount}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      to_amount: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Receiving Address:</label>
                <input
                  type="text"
                  value={editingExchange.receiving_address}
                  onChange={(e) => setEditingExchange({
                    ...editingExchange,
                    receiving_address: e.target.value
                  })}
                />
              </div>
              
              <div className="form-group">
                <label>Refund Address:</label>
                <input
                  type="text"
                  value={editingExchange.refund_address}
                  onChange={(e) => setEditingExchange({
                    ...editingExchange,
                    refund_address: e.target.value
                  })}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    value={editingExchange.status}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      status: e.target.value
                    })}
                  >
                    <option value="waiting">Waiting</option>
                    <option value="received">Payment Received</option>
                    <option value="exchanging">Exchanging</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Node Address:</label>
                  <input
                    type="text"
                    value={editingExchange.node_address}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      node_address: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Deposit Hash:</label>
                  <input
                    type="text"
                    value={editingExchange.deposit_hash}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      deposit_hash: e.target.value
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Withdrawal Hash:</label>
                  <input
                    type="text"
                    value={editingExchange.withdrawal_hash}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      withdrawal_hash: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Partner Commission:</label>
                  <input
                    type="number"
                    value={editingExchange.partner_commission}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      partner_commission: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Company Commission:</label>
                  <input
                    type="number"
                    value={editingExchange.company_commission}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      company_commission: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Actual Received:</label>
                  <input
                    type="number"
                    value={editingExchange.actual_received_amount}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      actual_received_amount: e.target.value
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Actual Sent:</label>
                  <input
                    type="number"
                    value={editingExchange.actual_sent_amount}
                    onChange={(e) => setEditingExchange({
                      ...editingExchange,
                      actual_sent_amount: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Memo:</label>
                <input
                  type="text"
                  value={editingExchange.memo}
                  onChange={(e) => setEditingExchange({
                    ...editingExchange,
                    memo: e.target.value
                  })}
                />
              </div>
              
              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  value={editingExchange.notes}
                  onChange={(e) => setEditingExchange({
                    ...editingExchange,
                    notes: e.target.value
                  })}
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowEditExchangeModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={handleUpdateExchange}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Exchange Modal */}
      {showViewExchangeModal && selectedExchange && (
        <div className="modal-overlay" onClick={() => setShowViewExchangeModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Exchange Details: {selectedExchange.id}</h3>
              <button 
                className="close-modal"
                onClick={() => setShowViewExchangeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Exchange ID:</label>
                <span>{selectedExchange.id}</span>
              </div>
              <div className="detail-group">
                <label>From → To:</label>
                <span>{selectedExchange.from_currency} → {selectedExchange.to_currency}</span>
              </div>
              <div className="detail-group">
                <label>Amounts:</label>
                <span>{selectedExchange.from_amount} → {selectedExchange.to_amount}</span>
              </div>
              <div className="detail-group">
                <label>Receiving Address:</label>
                <span className="address-value">{selectedExchange.receiving_address}</span>
              </div>
              {selectedExchange.refund_address && (
                <div className="detail-group">
                  <label>Refund Address:</label>
                  <span className="address-value">{selectedExchange.refund_address}</span>
                </div>
              )}
              <div className="detail-group">
                <label>Status:</label>
                <span className={`status ${selectedExchange.status}`}>{selectedExchange.status}</span>
              </div>
              <div className="detail-group">
                <label>Created:</label>
                <span>{new Date(selectedExchange.created_at).toLocaleString()}</span>
              </div>
              {selectedExchange.deposit_address && (
                <div className="detail-group">
                  <label>Deposit Address:</label>
                  <span className="address-value">{selectedExchange.deposit_address}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowViewExchangeModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Partner Modal */}
      {showEditPartnerModal && selectedPartner && editingPartner && (
        <div className="modal-overlay" onClick={() => setShowEditPartnerModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Partner: {selectedPartner.name}</h3>
              <button 
                className="close-modal"
                onClick={() => setShowEditPartnerModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    name: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingPartner.email}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Company:</label>
                <input
                  type="text"
                  value={editingPartner.company}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    company: e.target.value
                  })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Commission Rate (%):</label>
                  <input
                    type="number"
                    value={editingPartner.commission_rate}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      commission_rate: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    value={editingPartner.status}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      status: e.target.value
                    })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Payout Address:</label>
                <input
                  type="text"
                  value={editingPartner.payout_address}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    payout_address: e.target.value
                  })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payout Currency:</label>
                  <input
                    type="text"
                    value={editingPartner.payout_currency}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      payout_currency: e.target.value
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Min Payout:</label>
                  <input
                    type="number"
                    value={editingPartner.min_payout}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      min_payout: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowEditPartnerModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={handleUpdatePartner}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Partner Modal */}
      {showCreatePartnerModal && editingPartner && (
        <div className="modal-overlay" onClick={() => setShowCreatePartnerModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Partner</h3>
              <button 
                className="close-modal"
                onClick={() => setShowCreatePartnerModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    name: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingPartner.email}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Company:</label>
                <input
                  type="text"
                  value={editingPartner.company}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    company: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Commission Rate (%):</label>
                <input
                  type="number"
                  value={editingPartner.commission_rate}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    commission_rate: parseFloat(e.target.value)
                  })}
                />
              </div>
              <div className="form-group">
                <label>Payout Address:</label>
                <input
                  type="text"
                  value={editingPartner.payout_address}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    payout_address: e.target.value
                  })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payout Currency:</label>
                  <input
                    type="text"
                    value={editingPartner.payout_currency}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      payout_currency: e.target.value
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Min Payout:</label>
                  <input
                    type="number"
                    value={editingPartner.min_payout}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      min_payout: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowCreatePartnerModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={handleCreatePartnerSubmit}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Admin Component
const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-app">
      {user ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <AdminLogin onLogin={handleLogin} />
      )}
    </div>
  );
};

export default AdminPanel;