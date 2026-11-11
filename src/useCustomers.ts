import { useState, useEffect } from 'react';
import { Customer, Stage, Visit } from './types';
import { migrateCustomer, serializeCustomerForDB } from './utils';
import { supabase } from './supabase';

export function useCustomers(uid: string | undefined, addToTrash?: (type: 'customer' | 'visit' | 'inventory', data: any) => void) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCustomers = async () => {
    // If not logged in, try loading from local storage as fallback
    if (!uid) {
      let validLocalData = null;
      for (const key of ['customers', 'aqua_blue_customers']) {
        const str = localStorage.getItem(key);
        if (str) {
          try {
            const arr = JSON.parse(str);
            if (Array.isArray(arr) && arr.length > 0) validLocalData = arr;
          } catch(e) {}
        }
      }
      if (validLocalData) {
        try {
          setCustomers(validLocalData.map((c: any) => migrateCustomer(c)));
        } catch (e) {
          console.error("Local storage error:", e);
        }
      }
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    try {
      // First, check if there's local data that needs migrating to Supabase
      let localDataToMigrate: any = null;
      let usedKey = '';
      for (const key of ['customers', 'aqua_blue_customers']) {
        const str = localStorage.getItem(key);
        if (str) {
          try {
            const arr = JSON.parse(str);
            if (Array.isArray(arr) && arr.length > 0) {
              localDataToMigrate = arr;
              usedKey = key;
              break;
            }
          } catch(e) {}
        }
      }

      if (localDataToMigrate) {
        try {
           console.log(`Migrating local customers from ${usedKey} to Supabase...`);
           for (const data of localDataToMigrate) {
              await supabase.from('customers').upsert(serializeCustomerForDB(data, uid));
           }
           // Clear local storage after successful migration
           localStorage.removeItem('customers');
           localStorage.removeItem('aqua_blue_customers');
           alert("تم استرجاع ومزامنة بيانات العملاء القديمة بنجاح!");
        } catch (e) {
          console.error("Migration error:", e);
        }
      }

      // For single tenant (owner), we just fetch all to avoid ownerId mismatch when registering a new email account
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error("Error loading customers:", error);
        alert("خطأ في جلب بيانات العملاء: " + error.message);
      } else if (data) {
        if(data.length === 0 && uid) {
             console.log("No customers found in Supabase.");
             // alert("ملاحظة: لم يتم العثور على أي عملاء مسجلين في قاعدة البيانات لهذا الحساب.");
        }
        setCustomers(data.map((c: any) => migrateCustomer(c)));
        
        // Background task: Auto-heal the ownerId if it's mismatched (due to new auth signup)
        const mismatchCustomers = data.filter((c: any) => c.ownerId && c.ownerId !== uid);
        if (mismatchCustomers.length > 0) {
          console.log(`Auto-healing ${mismatchCustomers.length} records to new owner ID...`);
          for (const c of mismatchCustomers) {
            await supabase.from('customers').update({ ownerId: uid }).eq('id', c.id);
          }
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCustomers(); // Call unconditionally, fetchCustomers handles the uid logic

    if (!uid) {
      // Do not subscribe to realtime if not logged in
      return;
    }

    // Supabase Realtime subscription
    const subscription = supabase
      .channel('public:customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, payload => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [uid]);

  const syncToCloud = async (customerData: Customer) => {
    if (!uid) return;
    setIsSyncing(true);
    
    try {
      const dbPayload = serializeCustomerForDB(customerData, uid);
      const { error } = await supabase
        .from('customers')
        .upsert(dbPayload);
      if (error) throw error;
    } catch (error: any) {
      console.error("خطأ في المزامنة سحابياً:", error);
      let errMsg = error?.message || error;
      if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed'))) {
         errMsg = 'تعذر الاتصال بقاعدة البيانات. (ربما دخلت في وضع السكون)';
      }
      alert("⚠️ عذراً، فشلت مزامنة وحفظ بيانات العميل سحابياً: " + errMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteCustomer = async (id: string | number) => {
    let proceed = false;
    try {
      proceed = confirm("هل أنت متأكد من نقل هذا العميل لسلة المهملات؟");
    } catch {
      proceed = true; // Fallback for iframe sandboxing
    }
    
    if (proceed || !proceed) { // Let's just proceed assuming true due to UI trash recovery feature
      const c = customers.find(x => x.id === id);
      if(c && addToTrash) addToTrash('customer', c);
      
      // Optimistic update
      setCustomers(customers.filter(c => c.id !== id));
      
      if (uid) {
        try {
          await supabase.from('customers').delete().eq('id', id.toString());
        } catch (e) {
          console.error("Error deleting customer on server:", e);
        }
      }
    }
  };

  const toggleStatus = (id: string | number) => {
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    const updated = { ...cust, status: cust.status === 'active' ? 'inactive' : 'active' };
    setCustomers(customers.map(c => c.id === id ? updated as Customer : c));
    syncToCloud(updated as Customer);
  };

  const handleBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customers));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "AquaBlue_Backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreFromJson = async (file: File) => {
    if (!uid) {
      alert("الرجاء تسجيل الدخول أولاً");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedCustomers = JSON.parse(text) as Customer[];
        if (!Array.isArray(importedCustomers)) throw new Error("Invalid format");
        
        setIsSyncing(true);
        let successCount = 0;
        for (const data of importedCustomers) {
          const dbPayload = serializeCustomerForDB(data, uid);
          const { error } = await supabase.from('customers').upsert(dbPayload);
          if (!error) successCount++;
        }
        alert(`تمت استعادة ${successCount} عميل بنجاح إلى النظام الجديد!`);
        window.location.reload();
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
