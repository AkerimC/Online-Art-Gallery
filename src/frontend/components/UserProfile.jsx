import React, { useState, useEffect } from 'react';

const UserProfile = ({ user, onLogout, onUpdateUser }) => {
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [editingRes, setEditingRes] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', participants: 1 });

  // Profile update state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user.name, email: user.email });
  
  // Password update state
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });

  // Comparisons state
  const [comparisons, setComparisons] = useState([]);
  const [catalog, setCatalog] = useState({ artworks: [], workshops: [] });

  const fetchData = async () => {
    if (!user) return;
    const resOrders = await fetch(`/api/orders/${user.id}`);
    if (resOrders.ok) setOrders(await resOrders.json());

    const resResv = await fetch(`/api/reservations/${user.id}`);
    if (resResv.ok) setReservations(await resResv.json());

    const resTickets = await fetch(`/api/tickets/user/${user.id}`);
    if (resTickets.ok) setTickets(await resTickets.json());

    const resComps = await fetch(`/api/comparisons/${user.id}`);
    if (resComps.ok) setComparisons(await resComps.json());

    const resArt = await fetch('/api/artworks');
    const resWork = await fetch('/api/workshops');
    if (resArt.ok && resWork.ok) {
      setCatalog({ artworks: await resArt.json(), workshops: await resWork.json() });
    }
  };

  useEffect(() => {
    fetchData();
    setProfileForm({ name: user.name, email: user.email });
  }, [user]);

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    const res = await fetch(`/api/reservations/cancel/${id}`, { method: 'PUT' });
    if (res.ok) fetchData();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/reservations/${editingRes.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setEditingRes(null);
      fetchData();
    }
  };

  const startEditing = (r) => {
    setEditingRes(r);
    setEditForm({ date: r.date || '', time: r.time || '', participants: r.participants || 1 });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm)
    });
    if (res.ok) {
      alert('Profile updated successfully!');
      onUpdateUser({ ...user, name: profileForm.name, email: profileForm.email });
      setEditingProfile(false);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update profile');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/users/${user.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordForm)
    });
    if (res.ok) {
      alert('Password changed successfully!');
      setEditingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to change password');
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, ...ticketForm })
    });
    if (res.ok) {
      alert('Support ticket submitted successfully!');
      setTicketForm({ subject: '', message: '' });
      fetchData();
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h2>Welcome, {user.name}</h2>
        <p>{user.email} (Role: {user.role})</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={() => setEditingProfile(true)}>Edit Profile</button>
          <button className="btn-secondary" onClick={() => setEditingPassword(true)}>Change Password</button>
          <button className="btn-primary" style={{ background: '#ff4444', color: '#fff' }} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h3>Your Purchased Items</h3>
        <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {orders.length === 0 ? <p className="text-muted">No orders yet.</p> : (
            orders.map(o => (
              <div key={o.id} className="glass-card p-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <h4>Order #{o.id}</h4>
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{o.status}</span>
                </div>
                {o.items && o.items.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
                    {o.items.map((item, i) => (
                      <li key={i} style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                        - {item.title} <span className="text-muted">(${item.price})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-muted">Total: ${o.total}</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Paid via: {o.payment_method}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h3>Your Workshop Reservations</h3>
        <div className="grid-container" style={{ gridTemplateColumns: '1fr' }}>
          {reservations.length === 0 ? <p className="text-muted">No reservations yet.</p> : (
            reservations.map(r => (
              <div key={r.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4>Workshop ID: {r.workshop_id}</h4>
                  <p className="text-muted">Date: {r.date} | Time: {r.time}</p>
                  <p className="text-muted">Participants: {r.participants} | Total: ${r.total}</p>
                  <p style={{ color: r.status === 'Cancelled' ? '#ff4444' : 'var(--accent)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                    Status: {r.status}
                  </p>
                </div>

                {r.status === 'Active' && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" onClick={() => startEditing(r)}>Edit</button>
                    <button className="btn-primary" style={{ background: '#ff4444', color: '#fff' }} onClick={() => handleCancel(r.id)}>Cancel</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h3>Your Saved Comparisons</h3>
        <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {comparisons.length === 0 ? <p className="text-muted">No saved comparisons.</p> : (
            comparisons.map(c => {
              const ids = JSON.parse(c.item_ids || '[]');
              const items = ids.map(id => {
                if (c.type === 'artwork') return catalog.artworks.find(a => a.id === id);
                return catalog.workshops.find(w => w.id === id);
              }).filter(Boolean);

              return (
                <div key={c.id} className="glass-card p-4">
                  <h4 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>{c.type} Comparison</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {items.map((item, i) => (
                      <li key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.title}</span>
                        <span className="text-accent">${item.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h3>Customer Support</h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div className="glass-card p-4" style={{ flex: '1', minWidth: '300px' }}>
            <h4>Submit a Ticket</h4>
            <form onSubmit={handleTicketSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" value={ticketForm.subject} onChange={e => setTicketForm({...ticketForm, subject: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea rows="4" value={ticketForm.message} onChange={e => setTicketForm({...ticketForm, message: e.target.value})} required></textarea>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Send Ticket</button>
            </form>
          </div>
          <div style={{ flex: '2', minWidth: '300px' }}>
            <h4>Your Tickets</h4>
            {tickets.length === 0 ? <p className="text-muted" style={{marginTop:'1rem'}}>No tickets yet.</p> : (
              <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                {tickets.map(t => (
                  <div key={t.id} className="glass-card p-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>{t.subject}</span>
                      <span style={{ color: t.status === 'Open' ? '#ffaa00' : 'var(--accent)' }}>{t.status}</span>
                    </div>
                    <p className="text-muted" style={{ fontStyle: 'italic', marginBottom: '1rem' }}>"{t.message}"</p>
                    {t.admin_reply && (
                      <div style={{ background: 'rgba(171, 246, 45, 0.1)', borderLeft: '4px solid var(--accent)', padding: '1rem', borderRadius: '4px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent)' }}>Admin Reply:</p>
                        <p style={{ fontSize: '0.95rem' }}>{t.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingRes && (
        <div className="modal-overlay active" onClick={() => setEditingRes(null)}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setEditingRes(null)}>×</button>
            <h3>Update Reservation</h3>
            <form onSubmit={handleUpdate} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Participants</label>
                <input type="number" min="1" value={editForm.participants} onChange={e => setEditForm({...editForm, participants: Number(e.target.value)})} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {editingProfile && (
        <div className="modal-overlay active" onClick={() => setEditingProfile(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setEditingProfile(false)}>×</button>
            <h3>Edit Profile</h3>
            <form onSubmit={handleUpdateProfile} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Update Profile</button>
            </form>
          </div>
        </div>
      )}

      {editingPassword && (
        <div className="modal-overlay active" onClick={() => setEditingPassword(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setEditingPassword(false)}>×</button>
            <h3>Change Password</h3>
            <form onSubmit={handleUpdatePassword} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Change Password</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
