import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Plus, Users, ArrowRight, CheckCircle2, Copy, Check } from 'lucide-react';

const GroupView = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlement, setSettlement] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseData, setExpenseData] = useState({ description: '', amount: '' });
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
    fetchSettlement();
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const res = await axios.get(`/api/groups/${id}`);
      setGroup(res.data.group);
      setTransactions(res.data.transactions);
      if (res.data.group && selectedParticipants.length === 0) {
         setSelectedParticipants(res.data.group.members.map(m => m._id));
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchSettlement = async () => {
    try {
      const res = await axios.get(`/api/groups/${id}/settle`);
      setSettlement(res.data.settlement);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseData.description || !expenseData.amount || selectedParticipants.length === 0) return;

    try {
      await axios.post(`/api/groups/${id}/expenses`, {
        description: expenseData.description,
        amount: Number(expenseData.amount),
        participants: selectedParticipants
      });
      setExpenseData({ description: '', amount: '' });
      setShowAddExpense(false);
      fetchGroupDetails();
      fetchSettlement();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleParticipant = (userId) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter(pId => pId !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const handleCopyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!group) return <div>Group not found</div>;

  return (
    <div className="app-layout">
      <Navbar />
      
      <main className="main-content">
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {group.name}
                {group.inviteCode && (
                  <span 
                    onClick={handleCopyCode}
                    style={{ 
                      fontSize: '1rem', 
                      background: 'rgba(59, 130, 246, 0.15)', 
                      padding: '4px 12px', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: 'pointer',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: 'var(--primary)'
                    }}
                    title="Click to copy invite code"
                  >
                    Code: <strong>{group.inviteCode}</strong>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </span>
                )}
              </h1>
              <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} /> {group.members.length} Members
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddExpense(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Add Expense
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Expenses List */}
          <div>
            <h2 className="section-title">Recent Expenses</h2>
            <div className="card-list">
              {transactions.length === 0 ? (
                <div className="empty-state">No expenses yet. Add one to get started!</div>
              ) : (
                transactions.map(t => (
                  <div key={t._id} className="item-card glass-panel" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{t.description}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Paid by <span style={{ color: 'var(--primary)' }}>{t.paidBy._id === user._id ? 'You' : t.paidBy.name}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>₹{t.amount}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Settlement Panel */}
          <div>
            <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '100px' }}>
              <h2 className="section-title" style={{ color: 'var(--accent)' }}>Smart Settlement</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Optimized minimum cash flow to settle all debts.
              </p>
              
              <div className="card-list">
                {settlement.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    <CheckCircle2 size={40} style={{ color: 'var(--accent)', opacity: 0.5, margin: '0 auto 1rem' }} />
                    <p>All settled up!</p>
                  </div>
                ) : (
                  settlement.map((edge, index) => {
                    // Find actual names from group members
                    const fromUser = group.members.find(m => m._id === edge.from);
                    const toUser = group.members.find(m => m._id === edge.to);
                    
                    const fromName = fromUser?._id === user._id ? 'You' : fromUser?.name || 'Unknown';
                    const toName = toUser?._id === user._id ? 'You' : toUser?.name || 'Unknown';

                    return (
                      <div key={index} style={{ 
                        background: 'rgba(15, 23, 42, 0.4)', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '500' }}>{fromName}</span>
                          <ArrowRight size={16} color="var(--primary)" />
                          <span style={{ fontWeight: '500' }}>{toName}</span>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent)' }}>
                          ₹{edge.amount}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="modal-overlay" onClick={() => setShowAddExpense(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>Add New Expense</h3>
            <form onSubmit={handleAddExpense}>
              <div className="input-group">
                <label>Description (What was it for?)</label>
                <input 
                  type="text" 
                  value={expenseData.description} 
                  onChange={(e) => setExpenseData({...expenseData, description: e.target.value})} 
                  placeholder="Dinner, Tickets, etc."
                  required 
                />
              </div>
              
              <div className="input-group">
                <label>Total Amount Paid</label>
                <input 
                  type="number" 
                  value={expenseData.amount} 
                  onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})} 
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required 
                />
              </div>

              <div className="input-group">
                <label>Split Between</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '0.5rem', border: '1px solid var(--border-light)' }}>
                  {group.members.map(m => (
                     <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', cursor: 'pointer' }} onClick={() => toggleParticipant(m._id)}>
                        <input type="checkbox" checked={selectedParticipants.includes(m._id)} readOnly style={{ cursor: 'pointer' }} />
                        <span>{m.name} {m._id === user._id && '(You)'}</span>
                     </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary full-width" onClick={() => setShowAddExpense(false)}>Cancel</button>
                <button type="submit" className="btn-primary full-width">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupView;
