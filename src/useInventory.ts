import { useState, useEffect } from 'react';
import { InventoryItem } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

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
  'هاوسنج',
  'كلبسات',
  'حنفيه عاديه',
  'حنفيه لوكس',
  'موتور'
];

export function sortInventoryItems(items: InventoryItem[]): InventoryItem[] {
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

export const getInitialSeedInventory = (): InventoryItem[] => [
  // المراحل والشمعات القياسية
  { id: 'inv_s1', name: 'شمعة 1', category: 'stage', quantity: 0 },
  { id: 'inv_s2', name: 'شمعة 2', category: 'stage', quantity: 0 },
  { id: 'inv_s3', name: 'شمعة 3', category: 'stage', quantity: 0 },
  { id: 'inv_s4_mem', name: 'شمعة 4 (الممبرين)', category: 'stage', quantity: 0 },
  { id: 'inv_s4', name: 'شمعة 4', category: 'stage', quantity: 0 },
  { id: 'inv_s5', name: 'شمعة 5', category: 'stage', quantity: 0 },
  { id: 'inv_s6', name: 'شمعة 6', category: 'stage', quantity: 0 },
  { id: 'inv_s7', name: 'شمعة 7', category: 'stage', quantity: 0 },
  { id: 'inv_s8', name: 'شمعة 8', category: 'stage', quantity: 0 },

  // شمعات الكومباكت
  { id: 'inv_sc1', name: 'شمعة 1 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc2', name: 'شمعة 2 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc3', name: 'شمعة 3 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc4_mem', name: 'شمعة 4 كومباكت (الممبرين)', category: 'stage', quantity: 0 },
  { id: 'inv_sc4', name: 'شمعة 4 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc5', name: 'شمعة 5 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc6', name: 'شمعة 6 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc7', name: 'شمعة 7 كومباكت', category: 'stage', quantity: 0 },
  { id: 'inv_sc8', name: 'شمعة 8 كومباكت', category: 'stage', quantity: 0 },

  // قطع الغيار
  { id: 'inv_p_motor', name: 'موتور', category: 'part', quantity: 0 },
  { id: 'inv_p_tank', name: 'خزان (تانك)', category: 'part', quantity: 0 },
  { id: 'inv_p_housing', name: 'هاوسنج', category: 'part', quantity: 0 },
  { id: 'inv_p_cap_dark', name: 'كاب معتم', category: 'part', quantity: 0 },
  { id: 'inv_p_cap_s4', name: 'كاب شمعه رابعه (ممبرين)', category: 'part', quantity: 0 },
  { id: 'inv_p_sens_hi', name: 'سنسور فصل (هاي)', category: 'part', quantity: 0 },
  { id: 'inv_p_sens_lo', name: 'سنسور تشغيل (لو)', category: 'part', quantity: 0 },
  { id: 'inv_p_elbow_std', name: 'كوع عادي', category: 'part', quantity: 0 },
  { id: 'inv_p_elbow_s4', name: 'كوع شمعه رابعه', category: 'part', quantity: 0 },
  { id: 'inv_p_fourway', name: 'فور واي (رباعي)', category: 'part', quantity: 0 },
  { id: 'inv_p_drain', name: 'درين / قلم صرف', category: 'part', quantity: 0 },
  { id: 'inv_p_valve_mix', name: 'محبس خلط بلاستيك', category: 'part', quantity: 0 },
  { id: 'inv_p_valve_in', name: 'محبس دخول (عصفوره)', category: 'part', quantity: 0 },
  { id: 'inv_p_valve_tank', name: 'محبس تانك', category: 'part', quantity: 0 },
  { id: 'inv_p_clips', name: 'كلبسات', category: 'part', quantity: 0 },
  { id: 'inv_p_tap_std', name: 'حنفيه عاديه', category: 'part', quantity: 0 },
  { id: 'inv_p_tap_lux', name: 'حنفيه لوكس', category: 'part', quantity: 0 },

  // الأجهزة الكاملة
  { id: 'inv_d_7std', name: 'فلتر 7 مراحل R.O استاندارد', category: 'device', quantity: 0 },
  { id: 'inv_d_7cmp', name: 'فلتر 7 مراحل كومباكت', category: 'device', quantity: 0 },
  { id: 'inv_d_6std', name: 'فلتر 6 مراحل R.O', category: 'device', quantity: 0 }
];

export function useInventory(uid: string | undefined, addToTrash?: (type: 'customer' | 'visit' | 'inventory', data: any) => void) {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    for (const key of ['aqua_blue_inventory', 'inventory']) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return sortInventoryItems(parsed);
        } catch(e) {}
      }
    }
    const seed = getInitialSeedInventory();
    try {
      localStorage.setItem('aqua_blue_inventory', JSON.stringify(seed));
    } catch(e) {}
    return sortInventoryItems(seed);
  });

  const persistToLocal = (items: InventoryItem[]) => {
    try {
      localStorage.setItem('aqua_blue_inventory', JSON.stringify(items));
    } catch(e) {
      console.error("Local storage save error:", e);
    }
  };

  const fetchInventory = async () => {
    let validLocal: InventoryItem[] | null = null;
    for (const key of ['aqua_blue_inventory', 'inventory']) {
      const str = localStorage.getItem(key);
      if (str) {
        try {
          const arr = JSON.parse(str);
          if (Array.isArray(arr) && arr.length > 0) {
            validLocal = arr;
            break;
          }
        } catch(e) {}
      }
    }

    if (!validLocal || validLocal.length === 0) {
      validLocal = getInitialSeedInventory();
      persistToLocal(validLocal);
    }

    if (!uid || !isSupabaseConfigured) {
      setInventory(sortInventoryItems(validLocal));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*');
        
      if (error) {
        console.warn("Could not fetch inventory from Supabase, using local cache:", error.message);
        setInventory(sortInventoryItems(validLocal));
        return;
      }

      if (data && data.length > 0) {
        setInventory(sortInventoryItems(data as InventoryItem[]));
        persistToLocal(data as InventoryItem[]);
      } else {
        // Empty cloud inventory: seed with default items
        console.log("Supabase inventory empty, seeding default inventory items...");
        setInventory(sortInventoryItems(validLocal));
        persistToLocal(validLocal);
        const inserts = validLocal.map(item => ({
          ...item,
          id: `${uid}_${item.id}`,
          ownerId: uid
        }));
        try {
          await supabase.from('inventory').upsert(inserts);
        } catch(e) {}
      }
    } catch (err) {
      console.error("Exception loading inventory:", err);
      setInventory(sortInventoryItems(validLocal));
    }
  };

  useEffect(() => {
    fetchInventory();

    if (!uid || !isSupabaseConfigured) return;

    const subscription = supabase
      .channel('public:inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [uid]);

  const updateItemQuantity = async (id: string, newQuantity: number) => {
    setInventory(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, quantity: newQuantity } : i);
      persistToLocal(updated);
      return sortInventoryItems(updated);
    });

    if (uid && isSupabaseConfigured) {
      try {
        await supabase.from('inventory').update({ quantity: newQuantity }).eq('id', id);
      } catch (error) {
        console.warn("Could not sync inventory update to Supabase:", error);
      }
    }
  };

  const addInventoryItem = async (item: InventoryItem) => {
    const newId = item.id || 'inv_' + Date.now();
    const finalItem: InventoryItem = { ...item, id: newId, ownerId: uid };

    setInventory(prev => {
      const updated = [...prev, finalItem];
      persistToLocal(updated);
      return sortInventoryItems(updated);
    });

    if (uid && isSupabaseConfigured) {
      try {
        await supabase.from('inventory').upsert({
          ...finalItem,
          id: uid ? `${uid}_${newId}` : newId,
          ownerId: uid
        });
      } catch (err) {
        console.warn("Failed to add inventory item to cloud:", err);
      }
    }
  };

  const deleteInventoryItem = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item && addToTrash) addToTrash('inventory', item);

    setInventory(prev => {
      const updated = prev.filter(i => i.id !== id);
      persistToLocal(updated);
      return updated;
    });

    if (uid && isSupabaseConfigured) {
      try {
        await supabase.from('inventory').delete().eq('id', id);
      } catch (error) {
        console.warn("Failed to delete inventory item from cloud:", error);
      }
    }
  };

  const deductItems = async (stages: string[], parts: string[], isCompact?: boolean) => {
    let currentInventory = [...inventory];
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

      let item = currentInventory.find(i => 
        i.category === 'stage' && 
        candidates.some(c => i.name.trim() === c.trim())
      );

      const fallbackNumMatch = stageLabel.match(/\d+/);
      const isFallbackNum123 = fallbackNumMatch ? (fallbackNumMatch[0] === '1' || fallbackNumMatch[0] === '2' || fallbackNumMatch[0] === '3') : false;
      if (!item && (isCompact || stageLabel.includes('كومباكت')) && isFallbackNum123) {
        if (fallbackNumMatch) {
          const num = fallbackNumMatch[0];
          item = currentInventory.find(i => 
            i.category === 'stage' && 
            i.name.includes(num) && 
            i.name.includes('كومباكت')
          );
        }
      }

      if (!item) {
        item = currentInventory.find(i => i.category === 'stage' && i.name === stageLabel);
      }

      if (item && item.quantity > 0) {
        const newQty = item.quantity - 1;
        currentInventory = currentInventory.map(i => i.id === item!.id ? { ...i, quantity: newQty } : i);
        updates.push({ ...item, quantity: newQty, ownerId: uid });
      }
    });
    
    parts.forEach(partName => {
      const item = currentInventory.find(i => i.category === 'part' && i.name === partName);
      if (item && item.quantity > 0) {
        const newQty = item.quantity - 1;
        currentInventory = currentInventory.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
        updates.push({ ...item, quantity: newQty, ownerId: uid });
      }
    });

    if (updates.length > 0) {
      setInventory(sortInventoryItems(currentInventory));
      persistToLocal(currentInventory);

      if (uid && isSupabaseConfigured) {
        try {
          await supabase.from('inventory').upsert(updates);
        } catch (err) {
          console.error("Failed to deduct items on database server:", err);
        }
      }
    }
  };

  return { inventory: sortInventoryItems(inventory), updateItemQuantity, addInventoryItem, deleteInventoryItem, deductItems, fetchInventory };
}
