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
  return [
    {
      id: 'cust_seed_101',
      name: 'أحمد محمود إبراهيم',
      phone1: '01012345678',
      phone2: '01223456789',
      phone3: '',
      region: 'مصر الجديدة',
      addressDetail: 'شارع النزهة - عمارة 15 - الدور 3',
      deviceType: '7 مراحل R.O',
      clientCode: '458129',
      status: 'active',
      lastService: addMonths(-3),
      nextService: addDays(-2), // مستحق الصيانة الآن (متأخر يومين)
      image: '',
      stages: [
        { label: 'شمعة 1', date: addDays(-2), months: 3 },
        { label: 'شمعة 2', date: addDays(5), months: 3 },
        { label: 'شمعة 3', date: addDays(5), months: 3 },
        { label: 'شمعة 4 (الممبرين)', date: addMonths(8), months: 18 },
        { label: 'شمعة 5', date: addMonths(4), months: 12 },
        { label: 'شمعة 6', date: addMonths(7), months: 15 },
        { label: 'شمعة 7', date: addMonths(9), months: 18 }
      ],
      visitHistory: [
        {
          id: 1714567890001,
          customerId: 'cust_seed_101',
          date: addMonths(-3),
          changedStages: ['شمعة 1', 'شمعة 2', 'شمعة 3'],
          usedParts: ['هاوسنج'],
          spareParts: 'تغيير هاوسنج المرحلة الأولى لمنع التسريب',
          cost: '350',
          tds: '115', // أملاح عالية لتفعيل تنبيه الشمعة الرابعة (الممبرين)
          notes: 'ضغط الموتور سليم، تم قياس الأملاح 115 TDS والتنبيه بضرورة استبدال الممبرين قريباً'
        }
      ],
      createdAt: addMonths(-9)
    },
    {
      id: 'cust_seed_102',
      name: 'د. محمد سامي الشريف',
      phone1: '01156789012',
      phone2: '01098765432',
      phone3: '',
      region: 'مدينة نصر',
      addressDetail: 'شارع عباس العقاد - أمام الحديقة الدولية - برج الأطباء',
      deviceType: '7 مراحل كومباكت R.O',
      clientCode: '629143',
      status: 'active',
      lastService: addMonths(-3),
      nextService: addDays(4), // قادم خلال 4 أيام (يقترب موعده)
      image: '',
      stages: [
        { label: 'شمعة 1 كومباكت', date: addDays(4), months: 3 },
        { label: 'شمعة 2 كومباكت', date: addDays(4), months: 3 },
        { label: 'شمعة 3 كومباكت', date: addDays(4), months: 3 },
        { label: 'شمعة 4 (الممبرين)', date: addMonths(6), months: 18 },
        { label: 'شمعة 5', date: addMonths(4), months: 12 },
        { label: 'شمعة 6', date: addMonths(7), months: 15 },
        { label: 'شمعة 7', date: addMonths(10), months: 18 }
      ],
      visitHistory: [
        {
          id: 1714567890002,
          customerId: 'cust_seed_102',
          date: addMonths(-3),
          changedStages: ['شمعة 1 كومباكت', 'شمعة 2 كومباكت'],
          usedParts: ['كوع عادي'],
          spareParts: 'كوع سريع 1/4 بوصة',
          cost: '280',
          tds: '42',
          notes: 'حالة الجهاز والكومباكت ممتازة، نسبة الأملاح نقية جداً 42 TDS'
        }
      ],
      createdAt: addMonths(-12)
    },
    {
      id: 'cust_seed_103',
      name: 'م. طارق فاروق عفيفي',
      phone1: '01289012345',
      phone2: '',
      phone3: '',
      region: 'التجمع الخامس',
      addressDetail: 'حي النرجس عمارات - عمارة 42 - شقة 4',
      deviceType: '7 مراحل R.O',
      clientCode: '831204',
      status: 'active',
      lastService: addMonths(-4),
      nextService: addDays(-5), // متأخر 5 أيام
      image: '',
      stages: [
        { label: 'شمعة 1', date: addDays(-5), months: 3 },
        { label: 'شمعة 2', date: addDays(-5), months: 3 },
        { label: 'شمعة 3', date: addDays(-5), months: 3 },
        { label: 'شمعة 4 (الممبرين)', date: addMonths(5), months: 18 },
        { label: 'شمعة 5', date: addMonths(2), months: 12 },
        { label: 'شمعة 6', date: addMonths(5), months: 15 },
        { label: 'شمعة 7', date: addMonths(8), months: 18 }
      ],
      visitHistory: [
        {
          id: 1714567890003,
          customerId: 'cust_seed_103',
          date: addMonths(-4),
          changedStages: ['شمعة 1'],
          usedParts: ['محبس تانك'],
          spareParts: 'استبدال محبس خزان 1/4 بلاستيك أصلي',
          cost: '190',
          tds: '35',
          notes: 'تم ضبط ضغط هواء التانك على 7 PSI وتغيير الشمعة الأولى'
        }
      ],
      createdAt: addMonths(-14)
    },
    {
      id: 'cust_seed_104',
      name: 'الحاجة سميحة عبدالجواد',
      phone1: '01099887766',
      phone2: '',
      phone3: '',
      region: 'المعادي',
      addressDetail: 'شارع 105 المعادي - عمارة الهدى',
      deviceType: '6 مراحل R.O',
      clientCode: '194825',
      status: 'active',
      lastService: addMonths(-1),
      nextService: addMonths(2),
      image: '',
      stages: [
        { label: 'شمعة 1', date: addMonths(2), months: 3 },
        { label: 'شمعة 2', date: addMonths(2), months: 3 },
        { label: 'شمعة 3', date: addMonths(2), months: 3 },
        { label: 'شمعة 4 (الممبرين)', date: addMonths(11), months: 18 },
        { label: 'شمعة 5', date: addMonths(6), months: 12 },
        { label: 'شمعة 6', date: addMonths(9), months: 15 }
      ],
      visitHistory: [
        {
          id: 1714567890004,
          customerId: 'cust_seed_104',
          date: addMonths(-1),
          changedStages: ['شمعة 1', 'شمعة 2', 'شمعة 3', 'شمعة 5'],
          usedParts: [],
          spareParts: '',
          cost: '420',
          tds: '26',
          notes: 'زيارة صيانة دورية شاملة، المياه نقية ومذاق ممتاز'
        }
      ],
      createdAt: addMonths(-18)
    },
    {
      id: 'cust_seed_105',
      name: 'شركة النيل للخدمات الهندسية',
      phone1: '01554321098',
      phone2: '01200112233',
      phone3: '',
      region: 'المهندسين',
      addressDetail: 'شارع جامعة الدول العربية - برج الأطباء - الدور 7',
      deviceType: '8 مراحل R.O',
      clientCode: '772159',
      status: 'active',
      lastService: addMonths(-2),
      nextService: addDays(12),
      image: '',
      stages: [
        { label: 'شمعة 1', date: addDays(12), months: 3 },
        { label: 'شمعة 2', date: addDays(12), months: 3 },
        { label: 'شمعة 3', date: addDays(12), months: 3 },
        { label: 'شمعة 4 (الممبرين)', date: addMonths(7), months: 18 },
        { label: 'شمعة 5', date: addMonths(4), months: 12 },
        { label: 'شمعة 6', date: addMonths(7), months: 15 },
        { label: 'شمعة 7', date: addMonths(10), months: 18 },
        { label: 'شمعة 8', date: addMonths(14), months: 24 }
      ],
      visitHistory: [
        {
          id: 1714567890005,
          customerId: 'cust_seed_105',
          date: addMonths(-2),
          changedStages: ['شمعة 1', 'شمعة 2'],
          usedParts: ['سنسور فصل (هاي)'],
          spareParts: 'حساس فصل هاي بريشر كوري',
          cost: '310',
          tds: '38',
          notes: 'صيانة دورية للمكتب وتغيير حساس الفصل وضبط الأوتوماتيك'
        }
      ],
      createdAt: addMonths(-20)
    }
  ];
};

export function useCustomers(uid: string | undefined, addToTrash?: (type: 'customer' | 'visit' | 'inventory', data: any) => void) {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    // Read from localStorage synchronously on initial hook mount
    for (const key of ['aqua_blue_customers', 'customers']) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((c: any) => migrateCustomer(c));
          }
        } catch(e) {}
      }
    }
    // Return rich initial seed customers so app never opens empty
    const seeds = getInitialSeedCustomers();
    try {
      localStorage.setItem('aqua_blue_customers', JSON.stringify(seeds));
    } catch(e) {}
    return seeds;
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

    if (!validLocalData || validLocalData.length === 0) {
      validLocalData = getInitialSeedCustomers();
      persistToLocal(validLocalData);
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
        const mapped = data.map((c: any) => migrateCustomer(c));
        setCustomers(mapped);
        persistToLocal(mapped);
      } else {
        // Supabase has zero records, let's seed the default customers to Supabase
        console.log("Supabase empty, seeding default customers to database...");
        setCustomers(validLocalData);
        persistToLocal(validLocalData);
        for (const item of validLocalData) {
          try {
            await supabase.from('customers').upsert(serializeCustomerForDB(item, uid));
          } catch(e) {}
        }
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
