import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, X, Power, RotateCw } from 'lucide-react';

const AdminTrigger = () => {
  const [clickCount, setClickCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleTrigger = () => {
    setClickCount(prev => prev + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setClickCount(0);
    }, 1000);

    if (clickCount + 1 >= 5) {
      setShowModal(true);
      setClickCount(0);
    }
  };

  const verifyPin = () => {
    if (pin === '0501') {
      setShowModal(false);
      navigate('/admin');
    } else {
      alert('Invalid Sequence Pin');
      setPin('');
    }
  };

  const handleAction = async (action: string) => {
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setLoading(true);
    try {
      const endpoint = action === 'shutdown' ? '/admin/shutdown' : '/admin/restart';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'Sahil@123' }),
      });
      
      if (response.ok) {
        alert('Command sent successfully');
      } else {
        throw new Error('Action failed');
      }
    } catch (e) {
      alert('Action failed');
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <div 
        onClick={handleTrigger}
        className="fixed top-0 left-0 w-24 h-24 z-[9999] cursor-default active:bg-white/5 transition-all"
        title="Admin Trigger"
      />

      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="bg-[#16161a] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-8 animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Lock size={20} />
                   </div>
                   <h2 className="text-xl font-bold">Kiosk Maintenance</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                   <X size={24} />
                </button>
             </div>

             <div className="space-y-4">
                <p className="text-sm text-gray-400 text-center font-medium">Enter Secure Pin to Unlock Dashboard</p>
                <div className="flex gap-2 justify-center">
                   {[...Array(4)].map((_, i) => (
                      <div key={i} className={`w-12 h-16 rounded-xl border ${pin.length > i ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/5'} flex items-center justify-center text-2xl font-bold`}>
                         {pin[i] ? '•' : ''}
                      </div>
                   ))}
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-4">
                   {[1,2,3,4,5,6,7,8,9,0].map(n => (
                      <button 
                        key={n}
                        onClick={() => pin.length < 4 && setPin(p => p + n)}
                        className={`py-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-primary/20 text-xl font-bold transition-all ${n === 0 && 'col-start-2'}`}
                      >
                         {n}
                      </button>
                   ))}
                   <button 
                      onClick={() => setPin('')}
                      className="py-4 rounded-xl bg-danger/10 text-danger font-bold text-xs uppercase tracking-widest hover:bg-danger/20"
                   >
                     Clear
                   </button>
                   <button 
                      onClick={verifyPin}
                      className="py-4 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-widest col-start-3 row-start-4 hover:bg-primary/80"
                   >
                     Enter
                   </button>
                </div>
             </div>

             <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                <button 
                  disabled={loading}
                  onClick={() => handleAction('shutdown')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-danger/10 hover:text-danger border border-white/5 group transition-all"
                >
                   <Power size={20} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Shutdown</span>
                </button>
                <button 
                  disabled={loading}
                  onClick={() => handleAction('restart')}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-primary/10 hover:text-primary border border-white/5 group transition-all"
                >
                   <RotateCw size={20} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Restart OS</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminTrigger;
