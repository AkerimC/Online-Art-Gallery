import React, { useState } from 'react';

const AuthForm = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth(isLogin ? 'login' : 'register', formData);
  };

  return (
    <div className="auth-container glass-card" style={{maxWidth:'400px', margin:'2rem auto', padding:'2rem'}}>
      <h2 style={{textAlign:'center', marginBottom:'1.5rem'}}>{isLogin ? 'Login to Aura' : 'Create Account'}</h2>
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              required 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
        )}
        <div className="form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            placeholder="you@example.com" 
            required 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            required 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
        </div>
        <button type="submit" className="btn-primary" style={{width:'100%', marginTop:'1rem'}}>
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <p style={{textAlign:'center', marginTop:'1rem', fontSize:'0.9rem'}}>
        <a href="#" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </a>
      </p>
    </div>
  );
};

export default AuthForm;
