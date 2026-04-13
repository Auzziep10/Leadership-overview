import { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import type { User, Role } from '../types';
import { fetchRoles, fetchUsers, createRole, updateUserRoleAndHierarchy, createTeamAccount } from '../services/firestoreService';

export function TeamHierarchy() {
  const [view, setView] = useState<'hierarchy' | 'roles'>('hierarchy');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regWait, setRegWait] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [editReportsTo, setEditReportsTo] = useState('');
  const [editSystemRole, setEditSystemRole] = useState('staff');

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, u] = await Promise.all([fetchRoles(), fetchUsers()]);
      setRoles(r);
      setUsers(u);
    } catch(e) {
      console.error("Failed to load generic data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateRole = async () => {
    const name = window.prompt("Enter new Role name (e.g. Director):");
    if (!name) return;
    const levelStr = window.prompt("Enter hierarchy level (0 = Top-level/Owner, 1 = Executive, etc):");
    if (!levelStr) return;
    const level = parseInt(levelStr, 10);
    
    await createRole(name, isNaN(level) ? 99 : level);
    loadData();
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditRoleId(user.role_id || '');
    setEditReportsTo(user.reports_to || '');
    setEditSystemRole(user.role || 'staff');
  };

  const saveEditPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await updateUserRoleAndHierarchy(editingUser.id, editRoleId, editReportsTo, editSystemRole);
    setEditingUser(null);
    loadData();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegWait(true);
    try {
      await createTeamAccount(regEmail, regPass, regName);
      setIsRegistering(false);
      setRegEmail('');
      setRegPass('');
      setRegName('');
      loadData();
    } catch(err: any) {
      alert("Failed to register account: " + err.message);
    }
    setRegWait(false);
  };

  const renderHierarchyNode = (user: User, depth: number = 0) => {
    const directReports = users.filter(u => u.reports_to === user.id);
    const userRole = roles.find(r => r.id === user.role_id);
    
    return (
      <div key={user.id} style={{ marginLeft: depth > 0 ? '40px' : '0' }}>
        <div className="card-container" style={{ padding: '16px 24px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div className="card-left" style={{ flex: '1', gap: '24px', minWidth: '280px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, #18181b, #3f3f46)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              fontWeight: 800,
              fontFamily: 'var(--font-serif)'
            }}>
              {user.initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className="card-title" style={{ fontSize: '16px' }}>{user.name}</div>
              <div className="card-subtitle">{userRole ? userRole.name : user.role || 'No Role'} • SYSTEM TIER: {(user.role || 'staff').toUpperCase()}</div>
              
              <div style={{ fontSize: '10px', color: 'var(--color-zinc-500)', marginTop: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✉️ {user.email || 'No Email Record'}</span>
                {user.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📞 {user.phone}</span>}
              </div>

              <div style={{ fontSize: '9px', color: 'var(--color-zinc-400)', marginTop: '4px' }}>ID: {user.id}</div>
            </div>
          </div>
          <div className="card-right" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <button className="pill-button" style={{ padding: '8px 16px', minWidth: '80px' }} onClick={() => handleEditUser(user)}>
              Edit Placement
            </button>
          </div>
        </div>
        
        {directReports.length > 0 && (
          <div style={{ paddingLeft: '20px', borderLeft: '2px solid var(--color-zinc-200)', marginLeft: '18px' }}>
            {directReports.map(report => renderHierarchyNode(report, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const topLevelUsers = users.filter(u => !u.reports_to);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '13px', fontWeight: 600 }}>Loading Team Data...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        <button 
          onClick={() => setView('hierarchy')}
          style={{ 
            padding: '8px 24px', 
            borderRadius: '99px',
            border: '1px solid var(--color-zinc-200)',
            background: view === 'hierarchy' ? 'var(--color-zinc-900)' : 'white',
            color: view === 'hierarchy' ? 'white' : 'var(--color-zinc-600)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Visual Hierarchy
        </button>
        <button 
          onClick={() => setView('roles')}
          style={{ 
            padding: '8px 24px', 
            borderRadius: '99px',
            border: '1px solid var(--color-zinc-200)',
            background: view === 'roles' ? 'var(--color-zinc-900)' : 'white',
            color: view === 'roles' ? 'white' : 'var(--color-zinc-600)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Manage Roles
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
         <button onClick={() => setIsRegistering(true)} style={{ background: 'var(--color-zinc-900)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>
           Register New Account +
         </button>
      </div>

      {view === 'hierarchy' ? (
        <div style={{ padding: '24px', background: 'white', borderRadius: '40px', border: '1px solid var(--color-zinc-200)' }}>
           <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', marginBottom: '32px' }}>Org Chart</h2>
           {topLevelUsers.length === 0 ? (
             <div style={{ textAlign: 'center', color: 'var(--color-zinc-500)', fontSize: '12px', padding: '40px' }}>
               No leadership assigned yet. Edit a user's placement to set them at the top of the hierarchy.
               <br/><br/>
               {users.map(u => renderHierarchyNode(u, 0))}
             </div>
           ) : (
             topLevelUsers.map(user => renderHierarchyNode(user, 0))
           )}
        </div>
      ) : (
        <div style={{ padding: '24px', background: 'white', borderRadius: '40px', border: '1px solid var(--color-zinc-200)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
             <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Defined Roles</h2>
             <button className="auth-button" onClick={handleCreateRole}>Create Role +</button>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             {roles.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)' }}>No custom roles modeled.</div>}
             {roles.map(role => (
               <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '16px' }}>
                 <div>
                   <div style={{ fontWeight: 600 }}>{role.name}</div>
                   <div style={{ fontSize: '11px', color: 'var(--color-zinc-500)', marginTop: '4px' }}>Hierarchy Level: {role.level} | ID: {role.id}</div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <Modal isOpen={isRegistering} onClose={() => setIsRegistering(false)} title="Register Team Account">
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)' }}>Create an isolated staff account. Their role will default to base staff until explicitly promoted.</div>
          <input type="text" placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <input type="email" placeholder="Staff Email Address" value={regEmail} onChange={e => setRegEmail(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <input type="password" placeholder="Temporary Password (min 6 chars)" value={regPass} onChange={e => setRegPass(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <button type="submit" disabled={regWait} className="auth-button" style={{ opacity: regWait ? 0.7 : 1 }}>
            {regWait ? 'Registering...' : 'Provision Account'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit Placement for ${editingUser?.name}`}>
        <form onSubmit={saveEditPlacement} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Job Role</label>
            <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)} style={{ padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
              <option value="">No Role / Unassigned</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reports To (Manager)</label>
            <select value={editReportsTo} onChange={e => setEditReportsTo(e.target.value)} style={{ padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
              <option value="">Top Level (No Manager)</option>
              {users.filter(u => u.id !== editingUser?.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Access Tier</label>
            <select value={editSystemRole} onChange={e => setEditSystemRole(e.target.value)} style={{ padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
              <option value="staff">Staff (Limited Access)</option>
              <option value="admin">Admin (Standard Dashboard Access)</option>
              <option value="owner">Owner (Full Operations Access)</option>
            </select>
          </div>

          <button type="submit" className="auth-button" style={{ marginTop: '8px' }}>Save Layout Changes</button>
        </form>
      </Modal>
    </div>
  );
}
