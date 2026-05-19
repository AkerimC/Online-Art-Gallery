import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [reports, setReports] = useState(null);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(res => res.json())
      .then(setReports);
  }, []);

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
                <th style={{padding:'1rem'}}>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {reports.artwork_stats?.map((art, i) => (
                <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <td style={{padding:'1rem'}}>{art.title}</td>
                  <td style={{padding:'1rem', textAlign:'center'}}>{art.views}</td>
                  <td style={{padding:'1rem', textAlign:'center'}}>{art.favs}</td>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
