import { useState, useEffect } from 'react';
import { Customer, Stage, Visit } from './types';
import { migrateCustomer, serializeCustomerForDB } from './utils';
import { supabase, isSupabaseConfigured } from './supabase';

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const addDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const addMonths = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return formatDate(d);
};

export const getInitialSeedCustomers = (): Customer[] => {
  return [];
};

export function useCustomers(uid: string | undefined, addToTrash?: (type: 'customer' | 'visit' | 'inventory', data: any) => void) {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    // Read from localStorage synchronously on initial hook mount
    for (const key of ['aqua_blue_customers', 'customers']) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filter out any previous dummy seed customers if present
            const filtered = parsed.filter((c: any) => !String(c.id).startsWith('cust_seed_'));
            return filtered.map((c: any) => migrateCustomer(c));
          }
        } catch(e) {}
      }
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const persistToLocal = (newCustomers: Customer[]) => {
    try {
      localStorage.setItem('aqua_blue_customers', JSON.stringify(newCustomers));
    } catch(e) {
      console.error("Local storage save error:", e);
    }
  };

  const fetchCustomers = async () => {
    // 1. Check local storage first
    let validLocalData: Customer[] | null = null;
    for (const key of ['aqua_blue_customers', 'customers']) {
      const str = localStorage.getItem(key);
      if (str) {
        try {
          const arr = JSON.parse(str);
          if (Array.isArray(arr) && arr.length > 0) {
            validLocalData = arr.map((c: any) => migrateCustomer(c));
            break;
          }
        } catch(e) {}
      }
    }

    if (!validLocalData) {
      validLocalData = [];
    }

    if (!uid || !isSupabaseConfigured) {
      setCustomers(validLocalData);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.warn("Could not fetch customers from Supabase, keeping local data:", error.message);
        setCustomers(validLocalData);
      } else if (data && data.length > 0) {
        const filtered = data.filter((c: any) => !String(c.id).startsWith('cust_seed_'));
        const mapped = filtered.map((c: any) => migrateCustomer(c));
        setCustomers(mapped);
        persistToLocal(mapped);
      } else {
        setCustomers(validLocalData);
        persistToLocal(validLocalData);
      }
    } catch (err) {
      console.error("Supabase fetch exception:", err);
      setCustomers(validLocalData);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();

    if (!uid || !isSupabaseConfigured) return;

    const subscription = supabase
      .channel('public:customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [uid]);

  const syncToCloud = async (customerData: Customer) => {
    // Optimistically update state and localStorage
    setCustomers(prev => {
      const exists = prev.some(c => c.id === customerData.id);
      const next = exists ? prev.map(c => c.id === customerData.id ? customerData : c) : [customerData, ...prev];
      persistToLocal(next);
      return next;
    });

    if (!uid || !isSupabaseConfigured) return;

    setIsSyncing(true);
    try {
      const dbPayload = serializeCustomerForDB(customerData, uid);
      const { error } = await supabase
        .from('customers')
        .upsert(dbPayload);
      if (error) throw error;
    } catch (error: any) {
      console.warn("Failed to sync customer to cloud:", error?.message || error);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteCustomer = async (id: string | number) => {
    const c = customers.find(x => x.id === id);
    if (c && addToTrash) addToTrash('customer', c);
    
    // Optimistic delete in state and local storage
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    persistToLocal(updated);
    
    if (uid && isSupabaseConfigured) {
      try {
        await supabase.from('customers').delete().eq('id', id.toString());
      } catch (e) {
        console.error("Error deleting customer on server:", e);
      }
    }
  };

  const toggleStatus = (id: string | number) => {
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    const updated = { ...cust, status: cust.status === 'active' ? 'inactive' : 'active' };
    syncToCloud(updated as Customer);
  };

  const handleBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customers, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "AquaBlue_Customers_Backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreFromJson = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedCustomers = JSON.parse(text) as Customer[];
        if (!Array.isArray(importedCustomers)) throw new Error("Invalid format");
        
        const mapped = importedCustomers.map((c: any) => migrateCustomer(c));
        setCustomers(mapped);
        persistToLocal(mapped);

        if (uid && isSupabaseConfigured) {
          setIsSyncing(true);
          let successCount = 0;
          for (const data of mapped) {
            const dbPayload = serializeCustomerForDB(data, uid);
            const { error } = await supabase.from('customers').upsert(dbPayload);
            if (!error) successCount++;
          }
          alert(`تمت استعادة ${successCount} عميل بنجاح إلى النظام والمزامنة السحابية!`);
        } else {
          alert(`تمت استعادة ${mapped.length} عميل بنجاح محلياً!`);
        }
      } catch (err: any) {
        alert("حدث خطأ أثناء قراءة الملف: " + err.message);
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
  };

  return { customers, setCustomers, isSyncing, syncToCloud, deleteCustomer, toggleStatus, handleBackup, handleRestoreFromJson, fetchCustomers };
}
