import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><X /></button>
        {title && <h2>{title}</h2>}
        <div id="modal-body" className="modal-body" style={{marginTop:'1rem'}}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
