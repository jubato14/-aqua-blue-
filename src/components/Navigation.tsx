import React from 'react';
import { Home, Users, Archive, Package, Trash2, User } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
  pendingUsersCount?: number;
}

export function Navigation({ activeTab, setActiveTab, userRole = 'user', pendingUsersCount = 0 }: NavigationProps) {
  const showCustomers = userRole === 'owner' || userRole === 'customer_service' || userRole === 'user';
  const showInventory = userRole === 'owner' || userRole === 'storekeeper' || userRole === 'customer_service' || userRole === 'user';
  const showArchive = userRole === 'owner' || userRole === 'customer_service' || userRole === 'user';
  const showTrash = userRole === 'owner' || userRole === 'user';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 flex items-center justify-around px-2 pb-safe shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] z-50">
      <div className="max-w-md mx-auto w-full flex justify-around items-center px-1 gap-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex flex-col items-center gap-1 group w-12"
        >
          <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
            <Home size={18} strokeWidth={2.5}/>
          </div>
          <span className={`text-[9px] font-black ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>الرئيسية</span>
        </button>

        {showCustomers && (
          <button
            onClick={() => setActiveTab('customers')}
            className="flex flex-col items-center gap-1 group w-12"
          >
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform ${activeTab === 'customers' ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
              <Users size={18} strokeWidth={2.5}/>
            </div>
            <span className={`text-[9px] font-black ${activeTab === 'customers' ? 'text-blue-600' : 'text-slate-400'}`}>العملاء</span>
          </button>
        )}

        {showInventory && (
          <button
            onClick={() => setActiveTab('inventory')}
            className="flex flex-col items-center gap-1 group w-12"
          >
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform ${activeTab === 'inventory' ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
              <Package size={18} strokeWidth={2.5}/>
            </div>
            <span className={`text-[9px] font-black ${activeTab === 'inventory' ? 'text-blue-600' : 'text-slate-400'}`}>المخزن</span>
          </button>
        )}

        {showArchive && (
          <button
            onClick={() => setActiveTab('inactive')}
            className="flex flex-col items-center gap-1 group w-12"
          >
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform ${activeTab === 'inactive' ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
              <Archive size={18} strokeWidth={2.5}/>
            </div>
            <span className={`text-[9px] font-black ${activeTab === 'inactive' ? 'text-blue-600' : 'text-slate-400'}`}>الأرشيف</span>
          </button>
        )}

        {showTrash && (
          <button
            onClick={() => setActiveTab('trash')}
            className="flex flex-col items-center gap-1 group w-12"
          >
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform ${activeTab === 'trash' ? 'bg-red-100 text-red-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
              <Trash2 size={18} strokeWidth={2.5}/>
            </div>
            <span className={`text-[9px] font-black ${activeTab === 'trash' ? 'text-red-600' : 'text-slate-400'}`}>المهملات</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('me')}
          className="flex flex-col items-center gap-1 group w-12 relative"
        >
          {userRole === 'owner' && pendingUsersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white shadow-sm animate-bounce">
              {pendingUsersCount}
            </span>
          )}
          <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-transform ${activeTab === 'me' ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:scale-110'}`}>
            <User size={18} strokeWidth={2.5}/>
          </div>
          <span className={`text-[9px] font-black ${activeTab === 'me' ? 'text-blue-600' : 'text-slate-400'}`}>أنا</span>
        </button>
      </div>
    </nav>
  );
}
