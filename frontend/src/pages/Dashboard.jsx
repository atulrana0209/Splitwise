import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRightLeft, Target, LogIn } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/api/groups');
      setGroups(res.data.groups || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(res.data.users || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    try {
      await axios.post('/api/groups', {
        name: newGroupName,
        members: selectedMembers
      });
      setNewGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
      fetchGroups();
    } catch (error) {
      console.error(error);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!inviteCode.trim()) return;
    
    try {
      await axios.post('/api/groups/join', { inviteCode });
      setInviteCode('');
      setShowJoinGroup(false);
      fetchGroups();
    } catch (error) {
      setJoinError(error.response?.data?.message || 'Failed to join group');
    }
  };

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      
      <main className="main-content">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome, {user.name}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Here's what's happening with your expenses.</p>

        <div className="dashboard-grid">
          {/* Main Content Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '2rem' }}>
              <h2 className="section-title"><Users size={24} /> Your Groups</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => setShowJoinGroup(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 16px' }}>
                  <LogIn size={18} /> Join Group
                </button>
                <button className="btn-primary" onClick={() => setShowCreateGroup(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 16px' }}>
                  <Plus size={18} /> New Group
                </button>
              </div>
            </div>

            <div className="card-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {groups.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <Users size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <h3>No groups yet</h3>
                  <p style={{ marginTop: '0.5rem' }}>Create a group to start sharing expenses with friends.</p>
                </div>
              ) : (
                groups.map(group => (
                  <Link to={`/group/${group._id}`} key={group._id} className="item-card glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                      <Target size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{group.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{group.members.length} members</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Can add quick IOUs or summary here later if needed */}
          </div>
        </div>
      </main>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="input-group">
                <label>Group Name</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)} 
                  placeholder="Trip to Goa"
                  required 
                />
              </div>
              
              <div className="input-group">
                <label>Add Friends</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '0.5rem', border: '1px solid var(--border-light)' }}>
                  {users.map(u => (
                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '4px' }} onClick={() => toggleMember(u._id)} className={selectedMembers.includes(u._id) ? 'selected-member' : ''}>
                      <input 
                        type="checkbox" 
                        checked={selectedMembers.includes(u._id)} 
                        onChange={() => {}} 
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary full-width" onClick={() => setShowCreateGroup(false)}>Cancel</button>
                <button type="submit" className="btn-primary full-width">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div className="modal-overlay" onClick={() => setShowJoinGroup(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>Join Group via Code</h3>
            {joinError && <div className="error-message" style={{ marginBottom: '1rem' }}>{joinError}</div>}
            
            <form onSubmit={handleJoinGroup}>
              <div className="input-group">
                <label>Invite Code</label>
                <input 
                  type="text" 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value)} 
                  placeholder="e.g. jB_8aLkP"
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary full-width" onClick={() => {
                  setShowJoinGroup(false);
                  setJoinError('');
                  setInviteCode('');
                }}>Cancel</button>
                <button type="submit" className="btn-primary full-width">Join Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
