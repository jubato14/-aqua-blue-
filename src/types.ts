export interface InventoryItem {
  id: string;
  name: string;
  category: 'stage' | 'part' | 'device';
  quantity: number;
  ownerId?: string;
}

export interface Stage {
  label: string;
  months: number;
  date: string;
}

export interface Visit {
  id: string | number;
  customerId: string | number;
  date: string;
  changedStages: string[];
  usedParts?: string[];
  spareParts: string;
  cost: string;
  notes: string;
  tds: string;
}

export interface Customer {
  id: string | number;
  name: string;
  phone1: string;
  phone2: string;
  phone3: string;
  region: string;
  addressDetail: string;
  deviceType: string;
  clientCode?: string;
  lastService: string;
  nextService: string;
  image: string;
  stages: Stage[];
  visitHistory: Visit[];
  status: 'active' | 'inactive';
  createdAt?: string;
}
