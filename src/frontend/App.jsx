import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ArtworkCard from './components/ArtworkCard';
import WorkshopCard from './components/WorkshopCard';
import Modal from './components/Modal';
import AuthForm from './components/AuthForm';
import AdminDashboard from './components/AdminDashboard';
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

  const checkout = async () => {
    if (!user) return setView('profile');
    if (cart.length === 0) return;
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        total: cart.reduce((sum, i) => sum + i.price, 0),
        items: cart,
        payment_method: 'Credit Card'
      })
    });
    if (res.ok) {
      setCart([]);
      alert('Order placed successfully!');
      setView('home');
    }
  };

  const bookWorkshop = async (ws, count) => {
    if (!user) return setView('profile');
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        workshop_id: ws.id,
        participants: count,
        total: ws.price * count
      })
    });
    if (res.ok) {
      setSelectedItem(null);
      alert('Reservation created!');
      setView('home');
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
            <div className="page-header">
              <h2>Explore the Collection</h2>
              <p className="text-muted">Curated artworks from visionary creators</p>
            </div>
            <div className="grid-container">
              {artworks.map(art => (
                <ArtworkCard 
                  key={art.id} 
                  art={art} 
                  isFav={favorites.includes(art.id)}
                  onToggleFav={toggleFavorite}
                  onShowDetails={(item) => { setSelectedItem(item); setItemType('artwork'); }}
                />
              ))}
            </div>
          </>
        )}

        {view === 'events' && (
          <>
            <div className="page-header">
              <h2>Workshops & Events</h2>
              <p className="text-muted">Learn from the masters themselves.</p>
            </div>
            <div className="grid-container">
              {workshops.map(ws => (
                <WorkshopCard 
                  key={ws.id} 
                  ws={ws} 
                  onBook={(item) => { setSelectedItem(item); setItemType('workshop'); }}
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
                  <h3>Total: ${cart.reduce((sum, i) => sum + i.price, 0)}</h3>
                  <button className="btn-primary" style={{marginTop:'1rem', padding:'1rem 2rem'}} onClick={checkout}>Checkout</button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'profile' && (
          user ? (
            <div className="page-header" style={{textAlign:'center'}}>
              <h2>Welcome, {user.name}</h2>
              <p>{user.email} (Role: {user.role})</p>
              <button className="btn-secondary" style={{marginTop:'1rem'}} onClick={() => { setUser(null); setFavorites([]); setView('home'); }}>Logout</button>
            </div>
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
          </>
        )}
        {itemType === 'workshop' && selectedItem && (
          <>
            <p className="text-muted">Instructor: {selectedItem.instructor}</p>
            <p><Calendar style={{width:'16px', verticalAlign:'middle', display:'inline', marginRight:'5px'}} /> {selectedItem.date} | {selectedItem.time}</p>
            <p style={{margin:'1rem 0'}}>{selectedItem.description}</p>
            <div className="form-group">
                <label>Participants</label>
                <input type="number" id="p-count-modal" defaultValue="1" min="1" style={{width:'100%', padding:'0.5rem', background:'var(--glass-bg)', color:'#fff', border:'1px solid var(--glass-border)'}} />
            </div>
            <button className="btn-primary" style={{marginTop:'1rem'}} onClick={() => {
              const count = document.getElementById('p-count-modal').value;
              bookWorkshop(selectedItem, parseInt(count));
            }}>
              Book Now (${selectedItem.price})
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
