import React from 'react';
import { MessageCircle } from 'lucide-react';

const Navbar = ({ currentView, setView, user, favCount, cartCount }) => (
  <nav className="glass-nav">
    <div className="logo"><h1>Aura<span>.</span></h1></div>
    <ul className="nav-links">
      <li><a href="#" onClick={() => setView('home')} className={currentView === 'home' ? 'active' : ''}>Discover</a></li>
      <li><a href="#" onClick={() => setView('events')} className={currentView === 'events' ? 'active' : ''}>Workshops</a></li>
      {user?.role === 'admin' && (
        <li><a href="#" onClick={() => setView('admin')} className={currentView === 'admin' ? 'active' : ''} style={{color:'var(--accent)'}}>Admin Panel</a></li>
      )}
      <li><a href="#" onClick={() => setView('favorites')} className={currentView === 'favorites' ? 'active' : ''}>Favorites {favCount > 0 && `(${favCount})`}</a></li>
      <li><a href="#" onClick={() => setView('cart')} className={currentView === 'cart' ? 'active' : ''}>Cart {cartCount > 0 && `(${cartCount})`}</a></li>
    </ul>
    <div className="nav-actions">
      <button className="icon-btn" onClick={() => { 
        setView('profile'); 
        setTimeout(() => document.getElementById('support-section')?.scrollIntoView({behavior: 'smooth'}), 100); 
      }}><MessageCircle /></button>
      <button className="btn-primary" onClick={() => setView('profile')}>
        {user ? 'Profile' : 'Login / Register'}
      </button>
    </div>
  </nav>
);

export default Navbar;
