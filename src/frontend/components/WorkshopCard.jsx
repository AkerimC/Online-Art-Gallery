import React from 'react';
import { Calendar } from 'lucide-react';

const WorkshopCard = ({ ws, onBook }) => (
  <div className="glass-card workshop-card">
    <div className="card-body">
      <h3 className="card-title">{ws.title}</h3>
      <p className="card-artist">Instructor: {ws.instructor}</p>
      <p className="text-muted" style={{marginBottom:'0.5rem'}}>
        <Calendar style={{width:'16px', height:'16px', marginRight:'5px'}} />
        {ws.date} | {ws.time}
      </p>
      <div className="card-footer">
        <span className="price">${ws.price}</span>
        <button className="btn-primary" onClick={() => onBook(ws)}>Book Now</button>
      </div>
    </div>
  </div>
);

export default WorkshopCard;
