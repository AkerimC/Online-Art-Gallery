import React from 'react';
import { Heart } from 'lucide-react';
import soldImg from '../assets/sold.png';

const ArtworkCard = ({ art, isFav, onToggleFav, onShowDetails }) => {
  const isSold = art.is_sold === 1;

  return (
    <div className="glass-card art-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {isSold && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.4)',
          pointerEvents: 'none'
        }}>
          <img 
            src={soldImg} 
            alt="Sold" 
            style={{ width: '80%', transform: 'rotate(-15deg)', opacity: 0.9 }} 
          />
        </div>
      )}
      <img src={art.image} alt={art.title} className="art-image" style={{ filter: isSold ? 'grayscale(0.5)' : '' }} />
      <div className="card-body">
        <h3 className="card-title">{art.title}</h3>
        <p className="card-artist">By {art.artist} | {art.category}</p>
        <div className="card-footer">
          <span className="price">${art.price}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isSold && (
              <button className="icon-btn" onClick={() => onToggleFav(art.id)} style={{ color: isFav ? 'var(--accent)' : '' }}>
                <Heart fill={isFav ? 'currentColor' : 'none'} />
              </button>
            )}
            <button className="btn-primary" onClick={() => onShowDetails(art)}>
              {isSold ? 'View Details' : 'Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtworkCard;
