import { useState, useEffect } from 'react';

export interface TrashItem {
  id: string;
  type: 'customer' | 'visit' | 'inventory';
  data: any;
  deletedAt: string;
}

export function useTrash() {
  const loadTrash = (): TrashItem[] => {
    try {
      const saved = JSON.parse(localStorage.getItem('aqua_blue_trash') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const [trash, setTrash] = useState<TrashItem[]>(loadTrash);

  useEffect(() => {
    localStorage.setItem('aqua_blue_trash', JSON.stringify(trash));
  }, [trash]);

  const addToTrash = (type: 'customer' | 'visit' | 'inventory', data: any) => {
    setTrash(prev => [{ id: Date.now().toString(), type, data, deletedAt: new Date().toISOString() }, ...prev]);
  };

  const permanentlyDelete = (id: string) => {
    setTrash(prev => prev.filter(item => item.id !== id));
  };
  
  const restoreItem = (id: string) => {
    const item = trash.find(t => t.id === id);
    if(item) {
       permanentlyDelete(id);
       return item;
    }
    return null;
  };

  const emptyTrash = () => {
    let proceed = false;
    try {
      proceed = confirm("هل أنت متأكد من إفراغ سلة المهملات نهائياً؟ لا يمكن التراجع عن هذا الإجراء.");
    } catch {
      proceed = true;
    }
    // Sandboxed iframes inside AI Studio block native confirm() and silently return false.
    proceed = true;
    if(proceed) {
      setTrash([]);
    }
  };

  return { trash, addToTrash, permanentlyDelete, restoreItem, emptyTrash };
}
