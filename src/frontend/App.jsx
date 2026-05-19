import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ArtworkCard from './components/ArtworkCard';
import WorkshopCard from './components/WorkshopCard';
import Modal from './components/Modal';
import AuthForm from './components/AuthForm';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import Comments from './components/Comments';
import { Star, Trash2, Calendar } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null); 
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');

  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetch('/api/artworks').then(res => res.json()).then(setArtworks);
    fetch('/api/workshops').then(res => res.json()).then(setWorkshops);
  }, []);

  const toggleFavorite = async (id) => {
    if (!user) return alert('Please login');
    const isFav = favorites.includes(id);
    const method = isFav ? 'DELETE' : 'POST';
    const url = isFav ? `/api/favorites/${user.id}/${id}` : '/api/favorites';
    const body = isFav ? null : JSON.stringify({ user_id: user.id, artwork_id: id });

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (res.ok) {
      setFavorites(prev => isFav ? prev.filter(f => f !== id) : [...prev, id]);
    }
  };

  const addToCart = (item, type) => {
    setCart(prev => [...prev, { ...item, type }]);
    setSelectedItem(null);
    alert('Added to cart!');
  };

  const handleAuth = async (action, data) => {
    const res = await fetch(`/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      if (action === 'login') {
        setUser(result.user);
        if (result.user.role === 'admin') setView('admin');
        else setView('home');
        fetch(`/api/favorites/${result.user.id}`).then(r => r.json()).then(setFavorites);
      } else {
        alert('Registered! Please login.');
      }
    } else {
      alert(result.error);
    }
  };

  const applyCoupon = async () => {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.discount > 0) {
        setDiscount(data.discount);
        alert(`Coupon applied! ${data.discount}% off.`);
      } else {
        setDiscount(0);
        alert('Invalid or expired coupon.');
      }
    }
  };

  const checkout = async () => {
    if (!user) return setView('profile');
    if (cart.length === 0) return;
    
    if (!confirm(`Are you sure you want to complete this purchase using ${paymentMethod}?`)) return;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        total: cart.reduce((sum, i) => sum + i.price, 0) * (1 - discount / 100),
        items: cart,
        payment_method: paymentMethod
      })
    });
    if (res.ok) {
      setCart([]);
      setDiscount(0);
      setCouponCode('');
      alert('Order placed successfully!');
      setView('home');
    }
  };

  const bookWorkshop = async (ws, count, date, time, method) => {
    if (!user) return setView('profile');

    if (!confirm(`Confirm reservation for ${count} participants using ${method}?`)) return;

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        workshop_id: ws.id,
        participants: count,
        total: ws.price * count,
        date: date,
        time: time,
        payment_method: method
      })
    });
    if (res.ok) {
      setSelectedItem(null);
      alert('Reservation created successfully!');
      setView('home');
    }
  };

  const toggleCompare = (item) => {
    setSelectedForCompare(prev => {
      if (prev.find(i => i.id === item.id)) {
        return prev.filter(i => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const saveComparison = async () => {
    if (!user) return setView('profile');
    const type = view === 'home' ? 'artwork' : 'workshop';
    const res = await fetch('/api/comparisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        type: type,
        item_ids: selectedForCompare.map(i => i.id)
      })
    });
    if (res.ok) {
      alert('Comparison saved successfully!');
    }
  };

  return (
    <div className="app-container">
      <Navbar 
        currentView={view} 
        setView={setView} 
        user={user} 
        favCount={favorites.length} 
        cartCount={cart.length} 
      />
      
      <main id="app-content">
        {view === 'home' && (
          <>
            <div className="page-header" style={{ position: 'relative' }}>
              <h2>Explore the Collection</h2>
              <p className="text-muted">Curated artworks from visionary creators</p>
              <div style={{ position: 'absolute', top: '20px', right: '0' }}>
                <button className={`btn-${compareMode ? 'primary' : 'secondary'}`} onClick={() => {
                  setCompareMode(!compareMode);
                  if (compareMode) setSelectedForCompare([]);
                }}>
                  {compareMode ? 'Cancel Compare' : 'Compare Artworks'}
                </button>
                {compareMode && selectedForCompare.length > 0 && (
                  <button className="btn-primary" style={{ marginLeft: '1rem' }} onClick={() => setView('compare')}>
                    Compare Selected ({selectedForCompare.length})
                  </button>
                )}
              </div>
            </div>
            
            {artworks.filter(a => a.is_campaign).length > 0 && (
              <div style={{ marginBottom: '4rem' }}>
                <h3 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star fill="var(--accent)" /> Special Campaigns & Offers
                </h3>
                <div className="grid-container" style={{ marginTop: '1rem' }}>
                  {artworks.filter(a => a.is_campaign).map(art => (
                    <ArtworkCard 
                      key={`camp-${art.id}`} 
                      art={art} 
                      isFav={favorites.includes(art.id)}
                      onToggleFav={toggleFavorite}
                      onShowDetails={(item) => { setSelectedItem(item); setItemType('artwork'); }}
                      compareMode={compareMode}
                      isSelectedForCompare={!!selectedForCompare.find(i => i.id === art.id)}
                      onToggleCompare={toggleCompare}
                    />
                  ))}
                </div>
              </div>
            )}

            <h3>All Artworks</h3>
            <div className="grid-container" style={{ marginTop: '1rem' }}>
              {artworks.map(art => (
                <ArtworkCard 
                  key={art.id} 
                  art={art} 
                  isFav={favorites.includes(art.id)}
                  onToggleFav={toggleFavorite}
                  onShowDetails={(item) => { setSelectedItem(item); setItemType('artwork'); }}
                  compareMode={compareMode}
                  isSelectedForCompare={!!selectedForCompare.find(i => i.id === art.id)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          </>
        )}

        {view === 'events' && (
          <>
            <div className="page-header" style={{ position: 'relative' }}>
              <h2>Workshops & Events</h2>
              <p className="text-muted">Learn from the masters themselves.</p>
              <div style={{ position: 'absolute', top: '20px', right: '0' }}>
                <button className={`btn-${compareMode ? 'primary' : 'secondary'}`} onClick={() => {
                  setCompareMode(!compareMode);
                  if (compareMode) setSelectedForCompare([]);
                }}>
                  {compareMode ? 'Cancel Compare' : 'Compare Workshops'}
                </button>
                {compareMode && selectedForCompare.length > 0 && (
                  <button className="btn-primary" style={{ marginLeft: '1rem' }} onClick={() => setView('compare')}>
                    Compare Selected ({selectedForCompare.length})
                  </button>
                )}
              </div>
            </div>
            <div className="grid-container">
              {workshops.map(ws => (
                <WorkshopCard 
                  key={ws.id} 
                  ws={ws} 
                  onBook={(item) => { setSelectedItem(item); setItemType('workshop'); }}
                  compareMode={compareMode}
                  isSelectedForCompare={!!selectedForCompare.find(i => i.id === ws.id)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          </>
        )}

        {view === 'favorites' && (
          <>
            <div className="page-header"><h2>Your Favorites</h2></div>
            <div className="grid-container">
              {artworks.filter(a => favorites.includes(a.id)).map(art => (
                <ArtworkCard 
                  key={art.id} 
                  art={art} 
                  isFav={true}
                  onToggleFav={toggleFavorite}
                  onShowDetails={(item) => { setSelectedItem(item); setItemType('artwork'); }}
                />
              ))}
            </div>
          </>
        )}

        {view === 'compare' && (
          <div style={{ padding: '2rem' }}>
            <div className="page-header">
              <h2>Comparison</h2>
              <button className="btn-secondary" onClick={() => setView('home')}>Back</button>
              <button className="btn-primary" style={{ marginLeft: '1rem' }} onClick={saveComparison}>Save Comparison</button>
            </div>
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Feature</th>
                    {selectedForCompare.map(item => (
                      <th key={item.id} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <img src={item.image || 'https://via.placeholder.com/150'} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                        <br />{item.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>Price</td>
                    {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem', color: 'var(--accent)' }}>${item.price}</td>)}
                  </tr>
                  {selectedForCompare[0]?.category !== undefined && (
                    <>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Category</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.category}</td>)}
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Artist</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.artist}</td>)}
                      </tr>
                    </>
                  )}
                  {selectedForCompare[0]?.capacity !== undefined && (
                    <>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Date & Time</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.date} | {item.time}</td>)}
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Instructor</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.instructor}</td>)}
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Capacity</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.booked} / {item.capacity} booked</td>)}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'compare' && (
          <div style={{ padding: '2rem' }}>
            <div className="page-header">
              <h2>Comparison</h2>
              <button className="btn-secondary" onClick={() => setView('home')}>Back</button>
              <button className="btn-primary" style={{ marginLeft: '1rem' }} onClick={saveComparison}>Save Comparison</button>
            </div>
            <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Feature</th>
                    {selectedForCompare.map(item => (
                      <th key={item.id} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                        {item.image && <><img src={item.image} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} /><br /></>}
                        {item.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>Price</td>
                    {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem', color: 'var(--accent)' }}>${item.price}</td>)}
                  </tr>
                  {selectedForCompare[0]?.category !== undefined && (
                    <>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Category</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.category}</td>)}
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Artist</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.artist}</td>)}
                      </tr>
                    </>
                  )}
                  {selectedForCompare[0]?.capacity !== undefined && (
                    <>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Date & Time</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.date} | {item.time}</td>)}
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Instructor</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.instructor}</td>)}
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>Capacity</td>
                        {selectedForCompare.map(item => <td key={item.id} style={{ padding: '1rem' }}>{item.booked} / {item.capacity} booked</td>)}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'cart' && (
          <div style={{padding:'2rem'}}>
            <div className="page-header"><h2>Your Cart</h2></div>
            {cart.length === 0 ? <p style={{textAlign:'center'}}>Your cart is empty.</p> : (
              <div style={{display:'grid', gap:'1rem'}}>
                {cart.map((item, idx) => (
                  <div key={idx} className="glass-card p-4" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <h4>{item.title}</h4>
                      <p className="text-muted">{item.type}</p>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                      <span className="text-accent">${item.price}</span>
                      <button className="icon-btn" onClick={() => setCart(cart.filter((_, i) => i !== idx))}><Trash2 /></button>
                    </div>
                  </div>
                ))}
                <div style={{textAlign:'right', marginTop:'2rem'}}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
                    <input 
                      type="text" 
                      placeholder="Coupon Code" 
                      value={couponCode} 
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      style={{ padding: '0.5rem', background: 'var(--glass-bg)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
                    />
                    <button className="btn-secondary" onClick={applyCoupon}>Apply</button>
                  </div>
                  <h3>Subtotal: ${cart.reduce((sum, i) => sum + i.price, 0)}</h3>
                  {discount > 0 && <h3 style={{ color: 'var(--accent)' }}>Discount: {discount}%</h3>}
                  <h2>Total: ${(cart.reduce((sum, i) => sum + i.price, 0) * (1 - discount / 100)).toFixed(2)}</h2>
                  <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'1rem', marginTop:'1rem'}}>
                    <label>Payment Method:</label>
                    <select 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{padding:'0.5rem', background:'var(--glass-bg)', color:'#fff', border:'1px solid var(--glass-border)', borderRadius:'4px'}}
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="PayPal">PayPal</option>
                    </select>
                    <button className="btn-primary" style={{padding:'0.8rem 2rem'}} onClick={checkout}>Confirm & Pay</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'profile' && (
          user ? (
            <UserProfile 
              user={user} 
              onLogout={() => { setUser(null); setFavorites([]); setView('home'); }} 
              onUpdateUser={setUser} 
              onViewComparison={(items) => { setSelectedForCompare(items); setView('compare'); }}
            />
          ) : <AuthForm onAuth={handleAuth} />
        )}

        {view === 'admin' && <AdminDashboard />}
      </main>

      <Modal 
        isOpen={!!selectedItem} 
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title}
      >
        {itemType === 'artwork' && selectedItem && (
          <>
            <img src={selectedItem.image} style={{width:'100%', height:'300px', objectFit:'cover', borderRadius:'8px'}} />
            <p className="text-muted">By {selectedItem.artist}</p>
            <p style={{margin:'1rem 0'}}>{selectedItem.description}</p>
            {!selectedItem.is_sold && (
              <button className="btn-primary" onClick={() => addToCart(selectedItem, 'Artwork')}>
                Add to Cart (${selectedItem.price})
              </button>
            )}
            <Comments refId={selectedItem.id} type="artwork" user={user} />
          </>
        )}
        {itemType === 'workshop' && selectedItem && (
          <>
            <p className="text-muted">Instructor: {selectedItem.instructor}</p>
            <p style={{margin:'1rem 0'}}>{selectedItem.description}</p>
            <div className="form-group">
                <label>Date</label>
                <input type="date" id="w-date-modal" defaultValue={selectedItem.date} style={{width:'100%', padding:'0.5rem', background:'var(--glass-bg)', color:'#fff', border:'1px solid var(--glass-border)', borderRadius:'4px'}} />
            </div>
            <div className="form-group">
                <label>Time</label>
                <input type="time" id="w-time-modal" defaultValue={selectedItem.time} style={{width:'100%', padding:'0.5rem', background:'var(--glass-bg)', color:'#fff', border:'1px solid var(--glass-border)', borderRadius:'4px'}} />
            </div>
            <div className="form-group">
                <label>Participants</label>
                <input type="number" id="p-count-modal" defaultValue="1" min="1" style={{width:'100%', padding:'0.5rem', background:'var(--glass-bg)', color:'#fff', border:'1px solid var(--glass-border)', borderRadius:'4px'}} />
            </div>
            <div className="form-group">
                <label>Payment Method</label>
                <select id="w-payment-modal" defaultValue="Credit Card" style={{width:'100%', padding:'0.5rem', background:'var(--glass-bg)', color:'#fff', border:'1px solid var(--glass-border)', borderRadius:'4px'}}>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="PayPal">PayPal</option>
                </select>
            </div>
            <button className="btn-primary" style={{marginTop:'1rem', width:'100%'}} onClick={() => {
              const count = document.getElementById('p-count-modal').value;
              const date = document.getElementById('w-date-modal').value;
              const time = document.getElementById('w-time-modal').value;
              const method = document.getElementById('w-payment-modal').value;
              bookWorkshop(selectedItem, parseInt(count), date, time, method);
            }}>
              Confirm Reservation (${selectedItem.price})
            </button>
            <Comments refId={selectedItem.id} type="workshop" user={user} />
          </>
        )}
      </Modal>
    </div>
  );
}
