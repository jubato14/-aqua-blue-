import { Customer, Stage, Visit } from './types';

export const SHEETDB_URL = 'https://sheetdb.io/api/v1/5ka0lgj5swzd3';

export function getInitialFormData(): Omit<Customer, 'id'> {
  return {
    name: '', phone1: '', phone2: '', phone3: '', region: '', addressDetail: '',
    deviceType: '7 مراحل R.O', lastService: new Date().toISOString().split('T')[0], 
    nextService: '', image: '', stages: [], visitHistory: [], status: 'active'
  };
}

export function getInitialVisitData(): Visit {
  return {
    id: 0, customerId: 0, date: new Date().toISOString().split('T')[0],
    changedStages: [], usedParts: [], spareParts: '', cost: '', notes: '', tds: ''
  };
}

export const deviceOptions = [
  '3 مراحل', '3 مراحل كومباكت',
  '5 مراحل F', '5 مراحل R.O', 
  '5 مراحل كومباكت F', '5 مراحل كومباكت R.O',
  '6 مراحل F', '6 مراحل R.O', '6 مراحل كومباكت R.O',
  '7 مراحل F', '7 مراحل R.O', 
  '7 مراحل كومباكت F', '7 مراحل كومباكت R.O',
  '8 مراحل R.O', '8 مراحل F'
];

export const getStagesBreakdown = (deviceType: string): Pick<Stage, 'label' | 'months'>[] => {
  const isCompact = deviceType.includes('كومباكت');
  const base = [
    { label: isCompact ? 'شمعة 1 كومباكت' : 'شمعة 1', months: 3 }, 
    { label: isCompact ? 'شمعة 2 كومباكت' : 'شمعة 2', months: 3 }, 
    { label: isCompact ? 'شمعة 3 كومباكت' : 'شمعة 3', months: 3 }
  ];
  const isF = deviceType.includes('F');
  const s4Label = isF ? 'شمعة 4' : 'شمعة 4 (الممبرين)';
  const s4Months = isF ? 12 : 18;
  if (deviceType.includes('5')) return [...base, {label: s4Label, months: s4Months}, {label: 'شمعة 5', months: 12}];
  if (deviceType.includes('6')) return [...base, {label: s4Label, months: s4Months}, {label: 'شمعة 5', months: 12}, {label: 'شمعة 6', months: 15}];
  if (deviceType.includes('7')) return [...base, {label: s4Label, months: s4Months}, {label: 'شمعة 5', months: 12}, {label: 'شمعة 6', months: 15}, {label: 'شمعة 7', months: 18}];
  if (deviceType.includes('8')) return [...base, {label: s4Label, months: s4Months}, {label: 'شمعة 5', months: 12}, {label: 'شمعة 6', months: 15}, {label: 'شمعة 7', months: 18}, {label: 'شمعة 8', months: 24}];
  return base;
};

export const serializeCustomerForDB = (c: any, ownerId: string) => {
  let dbAddressDetail = c.addressDetail || '';
  if (c.clientCode) {
    dbAddressDetail = JSON.stringify({ detail: c.addressDetail, clientCode: c.clientCode });
  }

  return {
    id: c.id?.toString(),
    name: c.name || '',
    phone1: c.phone1 || '',
    phone2: c.phone2 || '',
    phone3: c.phone3 || '',
    region: c.region || '',
    addressDetail: dbAddressDetail,
    deviceType: c.deviceType || '',
    lastService: c.lastService || null,
    nextService: c.nextService || null,
    image: c.image || '',
    stages: c.stages || [],
    status: c.status || 'active',
    visitHistory: c.visitHistory || [],
    ownerId,
    ...(c.createdAt && { createdAt: c.createdAt }),
    updatedAt: new Date().toISOString()
  };
};

export function migrateCustomer(c: any): Customer {
  let region = c.region || '';
  let addressDetail = c.addressDetail || '';
  let clientCode = c.clientCode || '';
  let createdAt = c.createdAt || c.installDate || new Date().toISOString(); 
  
  if (addressDetail && typeof addressDetail === 'string' && addressDetail.startsWith('{')) {
    try {
      const parsed = JSON.parse(addressDetail);
      addressDetail = parsed.detail !== undefined ? parsed.detail : addressDetail;
      clientCode = parsed.clientCode || clientCode;
    } catch(e) {
      // Not JSON
    }
  }

  if (c.address) {
    if (typeof c.address === 'string' && c.address.startsWith('{')) {
      try {
        const parsed = JSON.parse(c.address);
        region = parsed.region || region;
        addressDetail = parsed.addressDetail || addressDetail;
        clientCode = parsed.clientCode || clientCode;
        createdAt = parsed.createdAt || createdAt;
      } catch(e) {
        if (!addressDetail) addressDetail = c.address;
      }
    } else {
       if (!addressDetail) addressDetail = c.address;
    }
  }

  let migrated = { 
     ...c, 
     region, 
     addressDetail, 
     clientCode, 
     createdAt,
     visitHistory: c.visitHistory || [], 
     status: c.status || 'active' 
  };
  
  // Remove the unneeded address key if it exists to avoid type confusion
  delete migrated.address;

  if (!migrated.stages || migrated.stages.length === 0) {
    const breakdown = getStagesBreakdown(migrated.deviceType);
    migrated.stages = breakdown.map((s: any) => {
      const d = new Date(migrated.lastService || new Date());
      d.setMonth(d.getMonth() + s.months);
      return { ...s, date: d.toISOString().split('T')[0] };
    });
  }
  return migrated as Customer;
}

export const calculateNextServiceFromStages = (stages: Stage[]) => {
  if (!stages || stages.length === 0) return '9999-12-31';
  let earliest = stages[0].date;
  for(let s of stages) { if(s.date < earliest) earliest = s.date; }
  return earliest;
};

export const isDue = (dateStr: string) => {
  if(!dateStr || dateStr === '9999-12-31' || dateStr === 'cancelled') return false;
  const d = new Date(dateStr); 
  const today = new Date(); 
  today.setHours(0,0,0,0);
  return d <= today;
};

export const getRemainingDaysText = (dateStr: string) => {
  if(!dateStr || dateStr === '9999-12-31' || dateStr === 'cancelled') return '';
  const d = new Date(dateStr); 
  const today = new Date(); 
  today.setHours(0,0,0,0);
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `متأخر منذ ${Math.abs(diffDays)} أيام`;
  } else if (diffDays === 0) {
    return 'الزيارة اليوم';
  } else if (diffDays === 1) {
    return 'الزيارة غداً';
  } else if (diffDays === 2) {
    return 'يتبقى يومان';
  } else {
    return `يتبقى ${diffDays} أيام`;
  }
};

export const isApproaching = (dateStr: string) => {
  if(!dateStr || dateStr === '9999-12-31' || dateStr === 'cancelled') return false;
  if(isDue(dateStr)) return false;
  const d = new Date(dateStr); 
  const today = new Date(); 
  today.setHours(0,0,0,0);
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 7;
};

export const isStage4 = (stageLabel?: string, index?: number): boolean => {
  if (index === 3) return true;
  if (!stageLabel) return false;
  const normalized = stageLabel.trim();
  return (
    normalized.includes('شمعة 4') ||
    normalized.includes('الممبرين') ||
    normalized.includes('شمعة الرابعة') ||
    normalized.includes('المرحلة الرابعة') ||
    /شمعة\s*4/i.test(normalized) ||
    /مرحلة\s*4/i.test(normalized)
  );
};

export const getCustomerLatestTds = (customer?: Customer | null): number | null => {
  if (!customer?.visitHistory || customer.visitHistory.length === 0) return null;
  const visitWithTds = customer.visitHistory.find(v => v.tds !== undefined && v.tds !== null && String(v.tds).trim() !== '' && !isNaN(parseFloat(String(v.tds))));
  if (!visitWithTds) return null;
  const val = parseFloat(String(visitWithTds.tds));
  return isNaN(val) ? null : val;
};

export const isCustomerStageDue = (stage: Stage, index: number, customer?: Customer | null): boolean => {
  if (isDue(stage.date)) return true;
  if (customer && isStage4(stage.label, index)) {
    // If stage 4 was postponed to a future date, do not mark it due today
    if (!isDue(stage.date)) {
      return false;
    }
    const latestTds = getCustomerLatestTds(customer);
    if (latestTds !== null && latestTds > 100) {
      return true;
    }
  }
  return false;
};

export const getNearestUpcomingStageDate = (customer?: Customer | null): string => {
  const todayStr = new Date().toISOString().split('T')[0];
  if (!customer?.stages || customer.stages.length === 0) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 3);
    return fallback.toISOString().split('T')[0];
  }

  const s4Index = customer.stages.findIndex((s, idx) => isStage4(s.label, idx));
  const otherStages = customer.stages.filter((_, idx) => idx !== s4Index);
  
  if (otherStages.length === 0) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 3);
    return fallback.toISOString().split('T')[0];
  }

  const s4Date = s4Index !== -1 ? customer.stages[s4Index].date : '';
  const baseDate = (s4Date && s4Date > todayStr) ? s4Date : todayStr;

  // 1. Look for other stages that have a date strictly in the future (> baseDate)
  const futureDates = otherStages
    .map(s => s.date)
    .filter(d => d && d > baseDate && d !== '9999-12-31' && d !== 'cancelled')
    .sort();

  if (futureDates.length > 0) {
    return futureDates[0];
  }

  // 2. Look for other stages with a date > todayStr
  const afterTodayDates = otherStages
    .map(s => s.date)
    .filter(d => d && d > todayStr && d !== '9999-12-31' && d !== 'cancelled')
    .sort();

  if (afterTodayDates.length > 0) {
    return afterTodayDates[0];
  }

  // 3. Fallback: 3 months from today (standard filter maintenance interval)
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 3);
  return fallback.toISOString().split('T')[0];
};

