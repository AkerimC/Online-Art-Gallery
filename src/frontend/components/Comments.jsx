import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

const Comments = ({ refId, type, user }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('recent');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const fetchComments = async () => {
    const res = await fetch(`/api/comments/${type}/${refId}?sort=${sort}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [refId, type, sort]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to comment.');
      return;
    }
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refId,
        type,
        user_id: user.id,
        user_name: user.name,
        text,
        rating
      })
    });
    const result = await res.json();
    if (res.ok) {
      setText('');
      setRating(5);
      setError('');
      fetchComments();
    } else {
      setError(result.error || 'Failed to submit comment.');
    }
  };

  const handleVote = async (commentId, action) => {
    if (!user) return setError('Please log in to vote.');
    const res = await fetch(`/api/comments/${commentId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (res.ok) fetchComments();
  };

  const handleAdminReply = async (commentId) => {
    const res = await fetch(`/api/comments/${commentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText })
    });
    if (res.ok) {
      setReplyingTo(null);
      setReplyText('');
      fetchComments();
    }
  };

  const avgRating = comments.length > 0 ? (comments.reduce((sum, c) => sum + c.rating, 0) / comments.length).toFixed(1) : 0;

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Comments & Reviews</h3>
        {comments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
            Average: {avgRating} <Star size={16} fill="var(--accent)" color="var(--accent)" /> ({comments.length} reviews)
          </div>
        )}
      </div>
      
      {error && <div style={{ color: '#ff4444', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,0,0,0.1)', borderRadius: '4px' }}>{error}</div>}
      
      {!user ? (
        <p className="text-muted">Please log in to leave a comment.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Rating</label>
            <select 
              value={rating} 
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--glass-bg)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
            >
              {[5,4,3,2,1].map(num => <option key={num} value={num}>{num} Stars</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Comment</label>
            <textarea 
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows="3"
              style={{ width: '100%', padding: '0.5rem', background: 'var(--glass-bg)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
            />
          </div>
          <button type="submit" className="btn-primary">Submit Review</button>
        </form>
      )}

      {comments.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: '0.5rem', background: 'var(--glass-bg)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px' }}
          >
            <option value="recent">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="highest">En Yüksek Puan</option>
            <option value="lowest">En Düşük Puan</option>
            <option value="helpful">En Faydalı</option>
          </select>
        </div>
      )}

      <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {comments.length === 0 ? (
          <p className="text-muted">No comments yet.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{c.user_name}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {c.rating} <Star size={14} fill="var(--accent)" color="var(--accent)" />
                </span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.text}</p>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="icon-btn" style={{ fontSize: '0.9rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }} onClick={() => handleVote(c.id, 'up')}>
                  <ThumbsUp size={16} /> {c.upvotes || 0}
                </button>
                <button className="icon-btn" style={{ fontSize: '0.9rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }} onClick={() => handleVote(c.id, 'down')}>
                  <ThumbsDown size={16} /> {c.downvotes || 0}
                </button>
                
                {user?.role === 'admin' && !c.admin_reply && (
                  <button className="icon-btn text-accent" style={{ fontSize: '0.9rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }} onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}>
                    <MessageSquare size={16} /> Reply
                  </button>
                )}
              </div>

              {replyingTo === c.id && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows="2"
                    placeholder="Type your reply..."
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--glass-bg)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px', marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-primary" onClick={() => handleAdminReply(c.id)}>Send Reply</button>
                    <button className="btn-secondary" onClick={() => setReplyingTo(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {c.admin_reply && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: '3px solid var(--accent)' }}>
                  <small className="text-accent" style={{ fontWeight: 'bold' }}>Admin Reply:</small>
                  <p style={{ margin: 0, marginTop: '0.5rem', fontSize: '0.95em', whiteSpace: 'pre-wrap' }}>{c.admin_reply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
