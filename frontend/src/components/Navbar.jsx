import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Bell, LogOut, X, Check, XCircle } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingIOUs, setPendingIOUs] = useState([]);

  useEffect(() => {
    fetchPendingIOUs();
  }, []);

  const fetchPendingIOUs = async () => {
    try {
      const res = await axios.get('/api/transactions');
      // Filter IOUs where current user is targeted and it's pending
      const pending = res.data.filter(t => 
        t.group === null && 
        t.splits[0].user._id === user._id && 
        t.splits[0].status === 'PENDING'
      );
      setPendingIOUs(pending);
    } catch (error) {
      console.error(error);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/transactions/${id}/approve`);
      fetchPendingIOUs();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`/api/transactions/${id}/reject`);
      fetchPendingIOUs();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <nav className="top-nav">
        <Link to="/" className="nav-brand">
          <div style={{ background: 'var(--primary)', width: '24px', height: '24px', borderRadius: '6px' }}></div>
          UnitySplit
        </Link>
        
        <div className="nav-actions">
          <div className="bell-icon" onClick={() => setShowNotifications(true)}>
            <Bell size={24} />
            {pendingIOUs.length > 0 && <div className="notification-dot"></div>}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: '500' }}>{user.name}</span>
            <button onClick={logout} className="btn-secondary" style={{ padding: '6px 12px', border: 'none', background: 'transparent' }} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowNotifications(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} color="var(--primary)" /> Pending Approvals
            </h3>
            
            <div className="card-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {pendingIOUs.length === 0 ? (
                <div className="empty-state">No pending requests right now.</div>
              ) : (
                pendingIOUs.map(iou => (
                  <div key={iou._id} className="item-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{iou.paidBy.name}</span> requested 
                      <span className="debt-negative"> ₹{iou.amount}</span> for "{iou.description}"
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button className="btn-success full-width" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleApprove(iou._id)}>
                        <Check size={16} /> Approve
                      </button>
                      <button className="btn-danger full-width" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => handleReject(iou._id)}>
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
