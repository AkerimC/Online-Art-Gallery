import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [reports, setReports] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: 10 });

  const fetchTickets = () => fetch('/api/tickets').then(res => res.json()).then(setTickets);
  const fetchCoupons = () => fetch('/api/admin/coupons').then(res => res.json()).then(setCoupons);

  useEffect(() => {
    fetch('/api/admin/reports').then(res => res.json()).then(setReports);
    fetchTickets();
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code) return;
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCoupon)
    });
    if (res.ok) {
      alert('Coupon created successfully!');
      setNewCoupon({ code: '', discount_percent: 10 });
      fetchCoupons();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create coupon');
    }
  };

  const handleReply = async (ticketId) => {
    const text = replyText[ticketId];
    if (!text) return;
    const res = await fetch(`/api/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: text })
    });
    if (res.ok) {
      alert('Reply sent successfully!');
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
      fetchTickets();
    }
  };

  if (!reports) return <div className="page-header"><h2>Loading reports...</h2></div>;

  return (
    <div style={{padding:'2rem'}}>
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p className="text-muted">System-wide reports and statistics</p>
      </div>

      <div className="grid-container" style={{gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))'}}>
        <div className="glass-card p-4" style={{textAlign:'center'}}>
          <h3>Total Sales</h3>
          <p className="text-accent" style={{fontSize:'2.5rem', fontWeight:'800'}}>
            ${reports.financials?.total_sales || 0}
          </p>
        </div>
      </div>

      <div style={{marginTop:'3rem'}}>
        <h3>Artwork Performance</h3>
        <div className="glass-card" style={{marginTop:'1rem', overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--glass-border)'}}>
                <th style={{padding:'1rem', textAlign:'left'}}>Title</th>
                <th style={{padding:'1rem'}}>Views</th>
                <th style={{padding:'1rem'}}>Favorites</th>
                <th style={{padding:'1rem'}}>Comments</th>
                <th style={{padding:'1rem'}}>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {reports.artwork_stats?.map((art, i) => (
                <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <td style={{padding:'1rem'}}>{art.title}</td>
                  <td style={{padding:'1rem', textAlign:'center'}}>{art.views}</td>
                  <td style={{padding:'1rem', textAlign:'center'}}>{art.favs}</td>
                  <td style={{padding:'1rem', textAlign:'center'}}>{art.comment_count}</td>
                  <td style={{padding:'1rem', textAlign:'center'}}>{Number(art.avg_rating || 0).toFixed(1)} ★</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:'3rem'}}>
        <h3>Workshop Occupancy</h3>
        <div className="grid-container">
          {reports.workshop_stats?.map((ws, i) => (
            <div key={i} className="glass-card p-4">
              <h4>{ws.title}</h4>
              <div style={{marginTop:'1rem', background:'rgba(255,255,255,0.1)', borderRadius:'10px', height:'10px'}}>
                <div style={{
                  width: `${Math.min(ws.occupancy_rate, 100)}%`,
                  background: 'var(--accent)',
                  height: '100%',
                  borderRadius: '10px'
                }}></div>
              </div>
              <p style={{marginTop:'0.5rem', fontSize:'0.9rem'}}>
                {ws.booked} / {ws.capacity} Participants ({Number(ws.occupancy_rate || 0).toFixed(1)}%)
              </p>
              <div style={{marginTop:'1rem', display:'flex', justifyContent:'space-between', fontSize:'0.9rem', color:'var(--text-muted)'}}>
                <span>Reservations: {ws.total_reservations}</span>
                <span>Comments: {ws.comment_count}</span>
                <span>Rating: {Number(ws.avg_rating || 0).toFixed(1)} ★</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:'3rem'}}>
        <h3>Support Tickets</h3>
        <div className="grid-container" style={{gridTemplateColumns:'1fr'}}>
          {tickets.length === 0 ? <p className="text-muted">No support tickets found.</p> : (
            tickets.map(t => (
              <div key={t.id} className="glass-card p-4">
                <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--glass-border)', paddingBottom:'0.5rem', marginBottom:'0.5rem'}}>
                  <h4 style={{margin:0}}>User ID: {t.user_id} | {t.subject}</h4>
                  <span style={{color: t.status === 'Open' ? '#ffaa00' : 'var(--accent)', fontWeight:'bold'}}>{t.status}</span>
                </div>
                <p className="text-muted" style={{fontStyle:'italic', marginBottom:'1rem'}}>"{t.message}"</p>
                
                {t.admin_reply ? (
                  <div style={{ background: 'rgba(171, 246, 45, 0.1)', borderLeft: '4px solid var(--accent)', padding: '1rem', borderRadius: '4px' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent)' }}>Your Reply:</p>
                    <p style={{ fontSize: '0.95rem', margin: 0 }}>{t.admin_reply}</p>
                  </div>
                ) : (
                  <div style={{display:'flex', gap:'1rem', marginTop:'1rem'}}>
                    <input 
                      type="text" 
                      placeholder="Write your reply..." 
                      style={{flex:'1', padding:'0.5rem', background:'var(--glass-bg)', border:'1px solid var(--glass-border)', color:'#fff', borderRadius:'4px'}}
                      value={replyText[t.id] || ''}
                      onChange={e => setReplyText({...replyText, [t.id]: e.target.value})}
                    />
                    <button className="btn-primary" onClick={() => handleReply(t.id)}>Send Reply</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{marginTop:'3rem'}}>
        <h3>Coupon Management</h3>
        <div style={{display:'flex', gap:'2rem', flexWrap:'wrap'}}>
          <div className="glass-card p-4" style={{flex:'1', minWidth:'300px'}}>
            <h4>Create New Coupon</h4>
            <form onSubmit={handleCreateCoupon} style={{marginTop:'1rem'}}>
              <div className="form-group">
                <label>Coupon Code</label>
                <input type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} required />
              </div>
              <div className="form-group">
                <label>Discount Percent (%)</label>
                <input type="number" min="1" max="100" value={newCoupon.discount_percent} onChange={e => setNewCoupon({...newCoupon, discount_percent: Number(e.target.value)})} required />
              </div>
              <button type="submit" className="btn-primary" style={{width:'100%'}}>Create Coupon</button>
            </form>
          </div>
          <div style={{flex:'2', minWidth:'300px'}}>
            <h4>Existing Coupons</h4>
            <div className="grid-container" style={{gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', marginTop:'1rem'}}>
              {coupons.length === 0 ? <p className="text-muted">No coupons found.</p> : (
                coupons.map(c => (
                  <div key={c.id} className="glass-card p-4" style={{textAlign:'center'}}>
                    <h3 style={{margin:0, color:'var(--accent)', letterSpacing:'1px'}}>{c.code}</h3>
                    <p style={{margin:'0.5rem 0 0 0', fontSize:'1.2rem'}}>{c.discount_percent}% OFF</p>
                    <span style={{fontSize:'0.8rem', color: c.is_active ? '#abf62d' : '#ff4444'}}>{c.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
