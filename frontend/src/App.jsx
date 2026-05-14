import React, { useState, useEffect } from 'react';
import api from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard states
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', team: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, feedback: '' });

  useEffect(() => {
    // Only Admins and Managers can fetch the employee directory
    if (token && currentUser?.role !== 'EMPLOYEE') {
      fetchUsers();
    } else if (token && currentUser?.role === 'EMPLOYEE') {
      fetchMyReviews();
    }
  }, [token, currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    } catch (err) {
      alert('Invalid credentials. Please check your email and password.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    setSelectedUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchMyReviews = async () => {
    try {
      const res = await api.get('/performance_reviews', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', newUser);
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'EMPLOYEE', team: '' });
      fetchUsers();
    } catch (err) {
      alert('Failed to add employee');
    }
  };

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    try {
      const res = await api.get(`/performance_reviews?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch user reviews', err);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/performance_reviews', {
        user_id: selectedUser.id,
        rating: parseInt(newReview.rating),
        feedback: newReview.feedback
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewReview({ rating: 5, feedback: '' });
      viewUserDetails(selectedUser); // Refresh reviews
    } catch (err) {
      alert('Failed to add review');
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
        <h2>ACME Inc. Platform</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="email" 
            placeholder="admin@acme.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            style={{ padding: '8px' }}
          />
          <input 
            type="password" 
            placeholder="password123" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            style={{ padding: '8px' }}
          />
          <button type="submit" style={{ padding: '10px', cursor: 'pointer', background: '#0056b3', color: 'white', border: 'none' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h2>ACME Inc. - Welcome, {currentUser.name} ({currentUser.role})</h2>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>Logout</button>
      </header>

      <main style={{ marginTop: '20px' }}>
        {currentUser.role === 'EMPLOYEE' ? (
          <div>
            <h3>My Performance & Development</h3>
            <p>Welcome to the employee self-service portal. Here you will be able to view your performance reviews and manage your development plans.</p>
            <h4 style={{ marginTop: '20px' }}>My Reviews</h4>
            {reviews.length > 0 ? (
              <ul style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
                {reviews.map(r => (
                  <li key={r.id} style={{ marginBottom: '10px' }}>
                    <strong>Rating: {r.rating}/5</strong> - {r.feedback} <br/>
                    <small>Date: {new Date(r.review_date).toLocaleDateString()}</small>
                  </li>
                ))}
              </ul>
            ) : <p>No performance reviews yet.</p>}
          </div>
        ) : (
          <div>
            {selectedUser ? (
              <div>
                <button onClick={() => setSelectedUser(null)} style={{ marginBottom: '15px', cursor: 'pointer', padding: '5px 10px' }}>&larr; Back to Directory</button>
                <div style={{ background: '#f0f8ff', padding: '15px', borderRadius: '5px' }}>
                  <h3 style={{ marginTop: 0 }}>{selectedUser.name}'s Profile</h3>
                  <p><strong>Email:</strong> {selectedUser.email} | <strong>Team:</strong> {selectedUser.team} | <strong>Role:</strong> {selectedUser.role}</p>
                </div>

                <h4 style={{ marginTop: '20px' }}>Performance Reviews</h4>
                {reviews.length > 0 ? (
                  <ul style={{ paddingLeft: '20px' }}>
                    {reviews.map(r => (
                      <li key={r.id} style={{ marginBottom: '10px' }}>
                        <strong>Rating: {r.rating}/5</strong> - {r.feedback} <br/>
                        <small>Date: {new Date(r.review_date).toLocaleDateString()}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p>No reviews found for this employee.</p>}

                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
                  <h4 style={{ marginTop: 0 }}>Add New Review</h4>
                  <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label>
                      Rating (1-5):
                      <input type="number" min="1" max="5" value={newReview.rating} onChange={e => setNewReview({...newReview, rating: e.target.value})} required style={{ marginLeft: '10px', padding: '5px' }} />
                    </label>
                    <textarea placeholder="Feedback..." value={newReview.feedback} onChange={e => setNewReview({...newReview, feedback: e.target.value})} required rows="3" style={{ padding: '8px', width: '100%', maxWidth: '400px' }} />
                    <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>Submit Review</button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Employee Directory</h3>
                  <button onClick={() => setShowAddUser(!showAddUser)} style={{ padding: '8px 16px', cursor: 'pointer', background: showAddUser ? '#dc3545' : '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {showAddUser ? 'Cancel' : '+ Add Employee'}
                  </button>
                </div>

                {showAddUser && (
                  <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginTop: '15px', border: '1px solid #ddd' }}>
                    <h4 style={{ marginTop: 0 }}>Register New Employee</h4>
                    <form onSubmit={handleAddUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required style={{ padding: '8px', flex: '1 1 45%' }}/>
                      <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required style={{ padding: '8px', flex: '1 1 45%' }}/>
                      <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required style={{ padding: '8px', flex: '1 1 45%' }}/>
                      <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ padding: '8px', flex: '1 1 45%' }}>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <input type="text" placeholder="Team" value={newUser.team} onChange={e => setNewUser({...newUser, team: e.target.value})} required style={{ padding: '8px', flex: '1 1 100%' }}/>
                      <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Save Employee</button>
                    </form>
                  </div>
                )}

                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Name</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Email</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Role</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Team</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{user.name}</td>
                        <td style={{ padding: '10px' }}>{user.email}</td>
                        <td style={{ padding: '10px' }}>{user.role}</td>
                        <td style={{ padding: '10px' }}>{user.team}</td>
                        <td style={{ padding: '10px' }}>
                          <button onClick={() => viewUserDetails(user)} style={{ padding: '5px 10px', cursor: 'pointer', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px' }}>Manage Profile</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}