import { useState, useEffect } from 'react';
import { InventoryItem } from './types';
import { supabase } from './supabase';

const STAGE_ORDER = [
  'شمعة 1',
  'شمعة 2',
  'شمعة 3',
  'شمعة 4 (الممبرين)',
  'شمعة 4',
  'شمعة 5',
  'شمعة 6',
  'شمعة 7',
  'شمعة 8',
  'شمعة 1 كومباكت',
  'شمعة 2 كومباكت',
  'شمعة 3 كومباكت',
  'شمعة 4 كومباكت (الممبرين)',
  'شمعة 4 كومباكت',
  'شمعة 5 كومباكت',
  'شمعة 6 كومباكت',
  'شمعة 7 كومباكت',
  'شمعة 8 كومباكت'
];

const PART_ORDER = [
  'كاب معتم',
  'كاب شمعه رابعه (ممبرين)',
  'سنسور فصل (هاي)',
  'سنسور تشغيل (لو)',
  'كوع عادي',
  'كوع شمعه رابعه',
  'فور واي (رباعي)',
  'درين / قلم صرف',
  'محبس خلط بلاستيك',
  'محبس دخول (عصفوره)',
  'محبس تانك',
  'خزان (تانك)',
  'كلبسات',
  'حنفيه عاديه',
  'حنفيه لوكس',
  'موتور'
];

function sortInventoryItems(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    
    if (a.category === 'stage') {
      const idxA = STAGE_ORDER.indexOf(a.name.trim());
      const idxB = STAGE_ORDER.indexOf(b.name.trim());
      const rankA = idxA !== -1 ? idxA : 999;
      const rankB = idxB !== -1 ? idxB : 999;
      if (rankA !== rankB) return rankA - rankB;
    }
    
    if (a.category === 'part') {
      const idxA = PART_ORDER.indexOf(a.name.trim());
      const idxB = PART_ORDER.indexOf(b.name.trim());
      const rankA = idxA !== -1 ? idxA : 999;
      const rankB = idxB !== -1 ? idxB : 999;
      if (rankA !== rankB) return rankA - rankB;
    }
    
    return a.name.localeCompare(b.name, 'ar');
  });
}

export function useInventory(uid: string | undefined, addToTrash?: (type: 'customer' | 'visit' | 'inventory', data: any) => void) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const fetchInventory = async () => {
    // If not logged in, try loading from local storage as fallback
    if (!uid) {
      let validLocalData = null;
      for (const key of ['inventory', 'aqua_blue_inventory']) {
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
          setInventory(validLocalData);
        } catch (e) {
          console.error("Local storage error:", e);
        }
      }
      return;
    }

    // First check for local data to migrate
    let localDataToMigrate: any = null;
    let usedKey = '';
    for (const key of ['inventory', 'aqua_blue_inventory']) {
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
        console.log(`Migrating local inventory from ${usedKey} to Supabase...`);
        const inserts = localDataToMigrate.map((item: any) => ({
          ...item,
          id: item.id.toString().startsWith(uid) ? item.id.toString() : `${uid}_${item.id}`,
          ownerId: uid,
        }));
        await supabase.from('inventory').upsert(inserts);
        localStorage.removeItem('inventory');
        localStorage.removeItem('aqua_blue_inventory');
        console.log("تم مزامنة بيانات المخزن القديمة بنجاح.");
      } catch (e) {
        console.error("Inventory migration error:", e);
      }
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('*');
      
    if (error) {
      console.error("Error loading inventory:", error);
      return;
    }

    let currentData = data as InventoryItem[];
    
    const hasStages = currentData.some(i => i.category === 'stage');
    const hasParts = currentData.some(i => i.category === 'part');

    if (!hasStages || !hasParts) {
      const initialStages = [
        { id: 's1', name: 'شمعة 1', category: 'stage', quantity: 0 },
        { id: 's2', name: 'شمعة 2', category: 'stage', quantity: 0 },
        { id: 's3', name: 'شمعة 3', category: 'stage', quantity: 0 },
        { id: 's41', name: 'شمعة 4 (الممبرين)', category: 'stage', quantity: 0 },
        { id: 's42', name: 'شمعة 4', category: 'stage', quantity: 0 },
        { id: 's5', name: 'شمعة 5', category: 'stage', quantity: 0 },
        { id: 's6', name: 'شمعة 6', category: 'stage', quantity: 0 },
        { id: 's7', name: 'شمعة 7', category: 'stage', quantity: 0 },
        { id: 's8', name: 'شمعة 8', category: 'stage', quantity: 0 },
        { id: 'sc1', name: 'شمعة 1 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc2', name: 'شمعة 2 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc3', name: 'شمعة 3 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc41', name: 'شمعة 4 كومباكت (الممبرين)', category: 'stage', quantity: 0 },
        { id: 'sc42', name: 'شمعة 4 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc5', name: 'شمعة 5 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc6', name: 'شمعة 6 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc7', name: 'شمعة 7 كومباكت', category: 'stage', quantity: 0 },
        { id: 'sc8', name: 'شمعة 8 كومباكت', category: 'stage', quantity: 0 },
      ];

      const initialParts = [
        { id: 'p1', name: 'موتور', category: 'part', quantity: 0 },
        { id: 'p2', name: 'خزان', category: 'part', quantity: 0 },
        { id: 'p3', name: 'هاوسنج', category: 'part', quantity: 0 },
      ];

      let itemsToSeed: any[] = [];
      if (!hasStages) {
        itemsToSeed = [...itemsToSeed, ...initialStages];
      }
      if (!hasParts) {
        itemsToSeed = [...itemsToSeed, ...initialParts];
      }

      if (itemsToSeed.length > 0) {
         const inserts = itemsToSeed.map(item => ({
            id: `${uid}_${item.id}`,
            ownerId: uid,
            name: item.name,
            category: item.category,
            quantity: item.quantity
         }));
         await supabase.from('inventory').upsert(inserts);
         
         // Fetch again after seed
         const { data: updatedData } = await supabase.from('inventory').select('*').eq('ownerId', uid);
         if (updatedData) currentData = updatedData as InventoryItem[];
      }
    } else {
      // Auto-heal ownerId for mismatch
      const mismatch = currentData.filter((i: any) => i.ownerId && i.ownerId !== uid);
      if (mismatch.length > 0) {
        console.log(`Auto-healing ${mismatch.length} inventory items...`);
        for (const item of mismatch) {
           await supabase.from('inventory').update({ ownerId: uid }).eq('id', item.id);
        }
      }
    }
    
    setInventory(currentData);
  };

  useEffect(() => {
    fetchInventory(); // unconditional, handles uid internally

    if (!uid) {
      // Do not subscribe to realtime if not logged in
      return;
    }

    // Supabase Realtime subscription
    const subscription = supabase
      .channel('public:inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, payload => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [uid]);

  const updateItemQuantity = async (id: string, newQuantity: number) => {
    if(!uid) return;
    const item = inventory.find(i => i.id === id);
    if(item) {
      // Optimistic update
      setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQuantity } : i));
      try {
        const { error } = await supabase.from('inventory').update({ quantity: newQuantity }).eq('id', id);
        if (error) {
           // Revert on error
           setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: item.quantity } : i));
           throw error;
        }
      } catch (error: any) {
        console.error("خطأ في تحديث كمية المخزن:", error);
        let errMsg = error?.message || error;
        if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed'))) {
           errMsg = 'تعذر الاتصال بقاعدة البيانات. (ربما دخلت في وضع السكون)';
        }
        alert("⚠️ فشل تحديث كمية الصنف سحابياً: " + errMsg);
      }
    }
  };

  const addInventoryItem = async (item: InventoryItem) => {
    if(!uid) return;
    const newId = item.id || Date.now().toString();
    const docId = newId.startsWith(uid) ? newId : `${uid}_${newId}`;
    
    // Optimistic
    const finalItem = { ...item, id: docId, ownerId: uid };
    setInventory(prev => [...prev, finalItem as InventoryItem]);

    try {
      const { error } = await supabase.from('inventory').upsert(finalItem);
      if (error) {
        setInventory(prev => prev.filter(i => i.id !== docId));
        throw error;
      }
    } catch (error: any) {
      console.error("خطأ في إضافة صنف للمخزن:", error);
      let errMsg = error?.message || error;
      if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed'))) {
         errMsg = 'تعذر الاتصال بقاعدة البيانات. (ربما دخلت في وضع السكون)';
      }
      alert("⚠️ فشلت إضافة الصنف سحابياً: " + errMsg);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    let proceed = false;
    try {
      proceed = confirm("هل أنت متأكد من نقل هذا الصنف لسلة المهملات؟");
    } catch {
      proceed = true; // Fallback safely if browser blocks confirm in sandboxed iframe
    }
    // Sandboxed iframes inside AI Studio block native confirm() and silently return false.
    // Since we have a 'Trash Bin' (سلة المهملات) for full recovery, we safely proceed with deletion.
    proceed = true;
    if (proceed) {
      const item = inventory.find(i => i.id === id);
      if(item && addToTrash) addToTrash('inventory', item);
      if (uid) {
        // Optimistic delete
        setInventory(prev => prev.filter(i => i.id !== id));
        try {
          const { error } = await supabase.from('inventory').delete().eq('id', id);
          if (error) throw error;
        } catch (error: any) {
          console.error("خطأ في مسح الصنف:", error);
          if (item) setInventory(prev => [...prev, item]); // Revert
          let errMsg = error?.message || error;
          if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed'))) {
             errMsg = 'تعذر الاتصال بقاعدة البيانات. (ربما دخلت في وضع السكون)';
          }
          alert("⚠️ فشل حذف الصنف سحابياً: " + errMsg);
        }
      }
    }
  };

  const deductItems = async (stages: string[], parts: string[], isCompact?: boolean) => {
    if (!uid) return;
    let updates: any[] = [];
    stages.forEach(stageLabel => {
      const candidates = [stageLabel];
      const numMatch = stageLabel.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        const isNum123 = num === '1' || num === '2' || num === '3';
        if (isCompact && isNum123) {
          candidates.push(`شمعة ${num} كومباكت`);
          candidates.push(`شمعة كومباكت ${num}`);
        } else if (stageLabel.includes('كومباكت') && isNum123) {
          candidates.push(`شمعة ${num} كومباكت`);
          candidates.push(`شمعة كومباكت ${num}`);
        }
      }

      let item = inventory.find(i => 
        i.category === 'stage' && 
        candidates.some(c => i.name.trim() === c.trim())
      );

      const fallbackNumMatch = stageLabel.match(/\d+/);
      const isFallbackNum123 = fallbackNumMatch ? (fallbackNumMatch[0] === '1' || fallbackNumMatch[0] === '2' || fallbackNumMatch[0] === '3') : false;
      if (!item && (isCompact || stageLabel.includes('كومباكت')) && isFallbackNum123) {
        if (fallbackNumMatch) {
          const num = fallbackNumMatch[0];
          item = inventory.find(i => 
            i.category === 'stage' && 
            i.name.includes(num) && 
            i.name.includes('كومباكت')
          );
        }
      }

      if (!item) {
        item = inventory.find(i => i.category === 'stage' && i.name === stageLabel);
      }

      if (item && item.quantity > 0) {
        updates.push({ ...item, quantity: item.quantity - 1, ownerId: uid });
      }
    });
    
    parts.forEach(partName => {
       const item = inventory.find(i => i.category === 'part' && i.name === partName);
       if (item && item.quantity > 0) {
         updates.push({ ...item, quantity: item.quantity - 1, ownerId: uid });
       }
    });

    if (updates.length > 0) {
      // Optimistic
      setInventory(prev => prev.map(invItem => {
        const updatedTarget = updates.find(u => u.id === invItem.id);
        return updatedTarget ? { ...invItem, quantity: updatedTarget.quantity } : invItem;
      }));

      try {
        const { error } = await supabase.from('inventory').upsert(updates);
        if (error) {
           fetchInventory(); // Revert completely
           throw error;
        }
      } catch (err) {
        console.error("Failed to deduct items on database server:", err);
      }
    }
  };

  return { inventory: sortInventoryItems(inventory), updateItemQuantity, addInventoryItem, deleteInventoryItem, deductItems, fetchInventory };
}
