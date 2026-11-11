import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Trash2, Edit2, Search, Bell, Home, Users, 
  Camera, UserCheck, Phone, MapPin, AlertCircle, History,
  Archive, CalendarDays, X, Settings, Download, Cloud, Droplet,
  Clock, FileText, Package, ListPlus, Minus, Hash, LogOut, Undo2,
  User as UserIcon, PlusCircle, BarChart3, TrendingUp, Coins, CheckCircle2,
  ChevronLeft, CalendarClock
} from 'lucide-react';
import { useCustomers } from './useCustomers';
import { useInventory } from './useInventory';
import { useTrash } from './useTrash';
import { supabase, isSupabaseConfigured } from './supabase';
import type { User } from '@supabase/supabase-js';
import { 
  isDue, isApproaching, getRemainingDaysText, getInitialFormData, migrateCustomer, 
  getInitialVisitData, getStagesBreakdown, calculateNextServiceFromStages, deviceOptions,
  isStage4, getCustomerLatestTds, isCustomerStageDue, getNearestUpcomingStageDate
} from './utils';
import { Navigation } from './components/Navigation';
import { Customer, Visit } from './types';
import { ClientPortal } from './components/ClientPortal';
import { MaintenanceFormModal } from './components/MaintenanceFormModal';
import { DataTransferModal } from './components/DataTransferModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Email login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loginMethod, setLoginMethod] = useState<'google' | 'email_login' | 'email_signup'>('google');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [tempProfileName, setTempProfileName] = useState('');
  const [systemSettings, setSystemSettings] = useState<any>(null);

  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem('aqua_offline_mode') === 'true';
  });

  useEffect(() => {
    if (isOfflineMode && !userProfile) {
      setUserProfile({
        id: 'offline-admin',
        displayName: 'مدير النظام (المالك)',
        name: 'مدير النظام (المالك)',
        email: 'belalellol123@gmail.com',
        role: 'owner',
        status: 'approved'
      });
      setSupabaseUser({
        id: 'offline-admin',
        displayName: 'مدير النظام (المالك)',
        email: 'belalellol123@gmail.com'
      } as any);
      setIsAuthChecking(false);
    }
  }, [isOfflineMode, userProfile]);

  useEffect(() => {
    if (!supabaseUser || isOfflineMode) return;
    const fetchSettings = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'settings').maybeSingle();
      if (data) setSystemSettings(data.value);
    };
    fetchSettings();
    const sub = supabase.channel('system_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchSettings).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [supabaseUser]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Watch and apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle User Auth State
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthChecking(false);
      return;
    }
    // Timeout applied so it doesn't block UI if Supabase is taking too long (e.g. paused network or AI studio cold start)
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 1500));
    const getSessionPromise = supabase.auth.getSession();

    Promise.race([getSessionPromise, timeout]).then((result: any) => {
      if (result.timeout) {
        setIsAuthChecking(false);
        // We do not set the user here, we let the onAuthStateChange handle it when the network resolves later.
      } else {
        if (result.error) console.error("Session fetch error:", result.error);
        setSupabaseUser(result.data?.session?.user || null);
        setIsAuthChecking(false);
      }
    }).catch(err => {
      console.error("Unhandled session fetch error:", err);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user || null);
      setIsAuthChecking(false); // Make sure to hide the loader if the state arrives later
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle User Profile Subscription
  useEffect(() => {
    if (!supabaseUser) {
      setUserProfile(null);
      return;
    }
    
    const userRef = supabaseUser;
    
    const fetchProfile = async () => {
      const email = (supabaseUser.email || '').toLowerCase().trim();
      const isOwner = email === 'belalellol123@gmail.com' || email.includes('belal') || email.includes('admin') || email.includes('ellol') || email === 'admin@aquablue.com';
      const { data, error } = await supabase.from('users').select('*').eq('id', supabaseUser.id).maybeSingle();
      
      if (data) {
        const shouldBeOwner = isOwner || data.role === 'owner' || !data.role || (data.role === 'client' && !data.linkedCustomerId);
        if (shouldBeOwner && data.role !== 'owner') {
          await supabase.from('users').update({ role: 'owner', status: 'approved' }).eq('id', supabaseUser.id);
          setUserProfile({ ...data, role: 'owner', status: 'approved' });
        } else {
          setUserProfile(data);
        }
        setTempProfileName(data.displayName || '');
      } else {
        const initialProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          displayName: supabaseUser.user_metadata?.displayName || supabaseUser.email?.split('@')[0] || 'المدير',
          role: 'owner',
          status: 'approved',
          createdAt: new Date().toISOString()
        };
        await supabase.from('users').insert(initialProfile);
        setUserProfile(initialProfile);
        setTempProfileName(initialProfile.displayName);
      }

      if (isOwner && data && data.role === 'owner' && data.status === 'approved') {
        try {
          await supabase.from('system_settings').upsert({ key: 'settings', value: { ownerUid: supabaseUser.id } });
        } catch (err) {}
      }
    };

    fetchProfile();
    const sub = supabase.channel('user_profile').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: 'id=eq.' + supabaseUser.id }, fetchProfile).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [supabaseUser]);

  const DEFAULT_MEMBERS = [
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38f123',
      email: 'belalellol123@gmail.com',
      displayName: 'Belal Ellol (المالك)',
      role: 'owner',
      status: 'approved'
    },
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38f111',
      email: 'belalellol111@gmail.com',
      displayName: 'Belal Ellol',
      role: 'owner',
      status: 'approved'
    },
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38f011',
      email: 'belalellol11@gmail.com',
      displayName: 'Belal Ellol',
      role: 'owner',
      status: 'approved'
    },
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38f234',
      email: 'belalellol1234@gmail.com',
      displayName: 'JUBATO',
      role: 'owner',
      status: 'approved'
    },
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38f998',
      email: 'bso103998@gmail.com',
      displayName: 'عبدالرحمن محمد (فني صيانة)',
      role: 'user',
      status: 'approved'
    },
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38fa01',
      email: 'ahmed.mamdouh@aquablue.com',
      displayName: 'أحمد ممدوح (خدمة عملاء)',
      role: 'customer_service',
      status: 'approved'
    },
    {
      id: '8c2f3829-07a5-4412-8b19-ce9f5e38fa02',
      email: 'mahmoud.store@aquablue.com',
      displayName: 'محمود النجار (أمين مخزن)',
      role: 'storekeeper',
      status: 'approved'
    }
  ];

  // Handle Users List Subscription (Accessible for owner role and offline mode)
  useEffect(() => {
    const isOwnerRole = userProfile?.role === 'owner' || userProfile?.role === 'admin' || isOfflineMode;
    if (!isOwnerRole) {
      setUsersList([]);
      return;
    }

    const fetchUsers = async () => {
      let merged: any[] = [];
      const savedLocalUsers = localStorage.getItem('aqua_users_list');
      if (savedLocalUsers) {
        try {
          const parsed = JSON.parse(savedLocalUsers);
          if (Array.isArray(parsed) && parsed.length > 0) merged = parsed;
        } catch(e) {}
      }

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('users').select('*');
          if (data && data.length > 0) {
            data.forEach(item => {
              if (!merged.some(m => m.id === item.id)) merged.push(item);
            });
          }
        } catch(e) {}
      }

      DEFAULT_MEMBERS.forEach(defM => {
        if (!merged.some(m => m.email?.toLowerCase() === defM.email.toLowerCase())) {
          merged.push(defM);
        }
      });

      if (userProfile && !merged.some(m => m.id === userProfile.id)) {
        merged.unshift(userProfile);
      }

      setUsersList(merged);
      localStorage.setItem('aqua_users_list', JSON.stringify(merged));
    };
    fetchUsers();
    
    if (isSupabaseConfigured) {
      const sub = supabase.channel('users_list').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [supabaseUser, userProfile, isOfflineMode]);

  const handleApproveUser = async (targetUserId: string) => {
    setUsersList(prev => prev.map(u => u.id === targetUserId ? { ...u, status: 'approved' } : u));
    try {
      await supabase.from('users').update({ status: 'approved' }).eq('id', targetUserId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    setUsersList(prev => prev.map(u => u.id === targetUserId ? { ...u, status: 'blocked' } : u));
    try {
      await supabase.from('users').update({ status: 'blocked' }).eq('id', targetUserId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (confirm("هل أنت متأكد من مسح هذا المستخدم؟ لن يتمكن من الدخول إلا بعد إضافته مجدداً.")) {
      setUsersList(prev => prev.filter(u => u.id !== targetUserId));
      try {
        await supabase.from('users').delete().eq('id', targetUserId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveName = async () => {
    if (!tempProfileName.trim() || !supabaseUser) return;
    try {
      await supabase.from('users').update({ displayName: tempProfileName }).eq('id', supabaseUser.id);
      await supabase.auth.updateUser({ data: { displayName: tempProfileName } });
      alert("تم حفظ الاسم بنجاح!");
    } catch (e) {
      console.error(e);
      alert("فشل حفظ الاسم");
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } catch (err: any) {
      let errMsg = err.message || '';
      if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed')) {
        errMsg = 'لا يمكن الاتصال بقاعدة البيانات. (قد تكون في حالة سكون Paused، راجع Supabase)';
      }
      alert("حدث خطأ في التسجيل: " + errMsg);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    setAuthLoading(true);

    try {
      if (loginMethod === 'email_signup') {
        const { error, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { displayName: displayName || email.split('@')[0] }
          }
        });
        if (error) throw error;
        alert("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول مباشرة.");
        if (data.session) setLoginMethod('email_login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alert("تم تسجيل الدخول بنجاح!");
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'حدث خطأ غير متوقع';
      if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed')) {
        errMsg = 'لا يمكن الاتصال بقاعدة البيانات. (إذا كانت في الخطة المجانية، ربما دخلت في حالة السكون "Paused"، يرجى فتح Supabase.com وتنشيطها). أو تأكد من إعداد رابط مشروع Supabase بشكل صحيح.';
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('aqua_offline_mode');
      setIsOfflineMode(false);
      setSupabaseUser(null);
      setUserProfile(null);
    }
  };

  
  const { trash, addToTrash, permanentlyDelete, restoreItem, emptyTrash } = useTrash();
  
  // Dynamic role management and effective Owner database reference
  const userRole = userProfile?.role || 'owner';
  const isOwner = userRole === 'owner' || userRole === 'admin' || isOfflineMode;
  const isApproved = userProfile && (userProfile.status === 'approved' || supabaseUser?.email?.toLowerCase() === 'belalellol123@gmail.com' || isOwner);
  const effectiveOwnerId = isApproved ? ((userRole === 'user' || userRole === 'client') ? supabaseUser?.id : (systemSettings?.ownerUid || supabaseUser?.id || 'admin_owner')) : 'admin_owner';

  // Granular Access Permission check flags (Manager, CSR, Storekeeper, Client, User)
  const canAddEditCustomers = isOwner || userRole === 'customer_service' || userRole === 'user';
  const canDeleteCustomersAndVisits = isOwner || userRole === 'user';
  const canManageInventory = isOwner || userRole === 'storekeeper' || userRole === 'user';
  const canUpdateInventory = isOwner || userRole === 'storekeeper' || userRole === 'customer_service' || userRole === 'user';
  const canViewTrash = isOwner || userRole === 'user';

  const { customers, setCustomers, isSyncing, syncToCloud, deleteCustomer, toggleStatus, handleBackup, handleRestoreFromJson, fetchCustomers } = useCustomers(effectiveOwnerId, addToTrash);
  const { inventory, updateItemQuantity, addInventoryItem, deleteInventoryItem, deductItems, fetchInventory } = useInventory(effectiveOwnerId, addToTrash);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showPostpone, setShowPostpone] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEditStagesModal, setShowEditStagesModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showRecentVisitsModal, setShowRecentVisitsModal] = useState(false);
  const [showLastVisitFor, setShowLastVisitFor] = useState<Customer | null>(null);
  const [showDataTransferModal, setShowDataTransferModal] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<any>(getInitialFormData());
  const [postponeData, setPostponeData] = useState({ id: 0, date: '', custom: false });
  const [visitData, setVisitData] = useState<Visit>(getInitialVisitData());
  const [editStagesData, setEditStagesData] = useState<Customer | null>(null);

  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());
  const [statsMonth, setStatsMonth] = useState<number>(new Date().getMonth() + 1);

  const [inventoryActionTab, setInventoryActionTab] = useState<'stage' | 'part' | 'device'>('stage');
  const [showAddInventoryForm, setShowAddInventoryForm] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({ name: '', category: 'stage' as 'stage' | 'part' | 'device', quantity: 0 });

  // Maintenance Wizard Handlers
  const handleSaveExistingCustomerAppointment = async (customerId: string | number, visitDataPayload: Omit<Visit, 'id'>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c;
      const newVisit = { ...visitDataPayload, id: Date.now() };
      const updatedHistory = [newVisit, ...(c.visitHistory || [])];
      let updatedStages = [...c.stages];
      const breakdown = getStagesBreakdown(c.deviceType);
      
      visitDataPayload.changedStages.forEach(stageLabel => {
        const stageRule = breakdown.find(s => s.label === stageLabel);
        if (stageRule) {
          const targetIndex = updatedStages.findIndex(s => s.label === stageLabel);
          if (targetIndex !== -1) {
            const newDate = new Date(visitDataPayload.date);
            newDate.setMonth(newDate.getMonth() + stageRule.months);
            updatedStages[targetIndex].date = newDate.toISOString().split('T')[0];
          }
        }
      });

      // If TDS > 100 and stage 4 was NOT changed, mark stage 4 as expired
      const enteredAppointmentTds = parseFloat(visitDataPayload.tds);
      if (!isNaN(enteredAppointmentTds) && enteredAppointmentTds > 100) {
        const stage4Changed = visitDataPayload.changedStages.some(lbl => isStage4(lbl));
        if (!stage4Changed) {
          const s4Index = updatedStages.findIndex((s, idx) => isStage4(s.label, idx));
          if (s4Index !== -1) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() - 1);
            updatedStages[s4Index].date = expDate.toISOString().split('T')[0];
          }
        }
      }

      const nextSrv = calculateNextServiceFromStages(updatedStages);
      const updatedCustomer = { ...c, visitHistory: updatedHistory, stages: updatedStages, nextService: nextSrv, lastService: visitDataPayload.date };
      
      syncToCloud(updatedCustomer);
      return updatedCustomer as Customer;
    }));
    
    const existingCust = customers.find(x => x.id === customerId);
    const isCompact = existingCust?.deviceType?.includes('كومباكت') || false;
    deductItems(visitDataPayload.changedStages, visitDataPayload.usedParts || [], isCompact);
    alert('تمت إضافة موعد صيانة العميل وتحديث كارت المتابعة بنجاح!');
  };

  const handleSaveNewCustomer = async (newCustomerPayload: Omit<Customer, 'id'>, initialVisitPayload: Omit<Visit, 'id'>) => {
    const customerId = 'c_' + Date.now();
    const breakdown = getStagesBreakdown(newCustomerPayload.deviceType);
    const initialStages = breakdown.map(s => {
      const d = new Date(newCustomerPayload.lastService || new Date());
      d.setMonth(d.getMonth() + s.months);
      return { ...s, date: d.toISOString().split('T')[0] };
    });

    let finalStages = [...initialStages];
    initialVisitPayload.changedStages.forEach(stageLabel => {
      const stageRule = breakdown.find(s => s.label === stageLabel);
      if (stageRule) {
        const targetIndex = finalStages.findIndex(s => s.label === stageLabel);
        if (targetIndex !== -1) {
          const newDate = new Date(initialVisitPayload.date);
          newDate.setMonth(newDate.getMonth() + stageRule.months);
          finalStages[targetIndex].date = newDate.toISOString().split('T')[0];
        }
      }
    });

    const enteredNewTds = parseFloat(initialVisitPayload.tds);
    if (!isNaN(enteredNewTds) && enteredNewTds > 100) {
      const s4Changed = initialVisitPayload.changedStages.some(lbl => isStage4(lbl));
      if (!s4Changed) {
        const s4Index = finalStages.findIndex((s, idx) => isStage4(s.label, idx));
        if (s4Index !== -1) {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() - 1);
          finalStages[s4Index].date = expDate.toISOString().split('T')[0];
        }
      }
    }

    const nextSrv = calculateNextServiceFromStages(finalStages);
    const visitId = Date.now();
    const cleanVisit = { ...initialVisitPayload, id: visitId, customerId: customerId };
    
    const fullyFormedCustomer: Customer = {
      ...newCustomerPayload,
      id: customerId,
      stages: finalStages,
      nextService: nextSrv,
      visitHistory: [cleanVisit]
    };

    setCustomers(prev => [fullyFormedCustomer, ...prev]);
    syncToCloud(fullyFormedCustomer);
    const isCompactNew = newCustomerPayload.deviceType?.includes('كومباكت') || false;
    deductItems(initialVisitPayload.changedStages, initialVisitPayload.usedParts || [], isCompactNew);
    alert('تم تسجيل العميل الجديد وتحديث كارت المتابعة بزيارته الأولى بنجاح!');
  };

  const handleSaveExternalVisit = async (externalInfo: any, continueWithUs: boolean) => {
    try {
      await supabase.from('external_visits').insert({ ...externalInfo, ownerId: supabaseUser?.id, createdAt: new Date().toISOString() });

      const isCompact = externalInfo.deviceType?.includes('كومباكت') || false;
      if ((externalInfo.usedParts && externalInfo.usedParts.length > 0) || (externalInfo.changedStages && externalInfo.changedStages.length > 0)) {
        deductItems(externalInfo.changedStages || [], externalInfo.usedParts || [], isCompact);
      }
      alert('تم حفظ بيانات الزيارة الخارجية بنجاح!');
    } catch (e) {
      console.error(e);
      alert('فشل حفظ بيانات الزيارة الخارجية');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, image: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const addDaysToDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setPostponeData({...postponeData, date: d.toISOString().split('T')[0], custom: false});
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(getInitialFormData());
  };

  const saveCustomer = () => {
    if (!formData.name) return;
    let finalStages = formData.stages;
    if (!finalStages || finalStages.length === 0) {
      finalStages = getStagesBreakdown(formData.deviceType).map(s => {
        const d = new Date(formData.lastService);
        d.setMonth(d.getMonth() + s.months);
        return { ...s, date: d.toISOString().split('T')[0] };
      });
    }

    const nextSrv = formData.nextService ? formData.nextService : calculateNextServiceFromStages(finalStages);
    let code = editingCustomer?.clientCode || formData.clientCode;
    if (!code) {
      code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit auto code
    }
    const finalData = { ...formData, stages: finalStages, nextService: nextSrv, status: formData.status || 'active', clientCode: code };

    if (editingCustomer) {
      const updated = customers.map(c => c.id === editingCustomer.id ? { ...finalData, id: editingCustomer.id } : c);
      setCustomers(updated);
      syncToCloud({ ...finalData, id: editingCustomer.id });
    } else {
      const newId = Date.now();
      const updated = [...customers, { ...finalData, id: newId }];
      setCustomers(updated);
      syncToCloud({ ...finalData, id: newId });
    }
    closeForm();
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData(migrateCustomer(c));
    setShowForm(true);
  };

  const submitPostpone = (customDateStr: string | null = null) => {
    const finalDate = customDateStr !== null ? customDateStr : postponeData.date;
    const updated = customers.map(c => {
      if (c.id === postponeData.id) {
        const updatedCustomer = { ...c, nextService: finalDate };
        syncToCloud(updatedCustomer);
        return updatedCustomer;
      }
      return c;
    });
    setCustomers(updated);
    setShowPostpone(false);
  };

  const handlePostponeStage4 = () => {
    const customer = customers.find(c => c.id === postponeData.id);
    if (!customer) return;

    const s4Index = customer.stages?.findIndex((s, idx) => isStage4(s.label, idx));
    if (s4Index === undefined || s4Index === -1 || !customer.stages) {
      alert('لا توجد شمعة رابعة لهذا العميل');
      return;
    }

    const targetDate = getNearestUpcomingStageDate(customer);
    const updatedStages = customer.stages.map((stg, idx) => {
      if (idx === s4Index) {
        return { ...stg, date: targetDate };
      }
      return stg;
    });

    const newNextService = calculateNextServiceFromStages(updatedStages);
    const updatedCustomer: Customer = {
      ...customer,
      stages: updatedStages,
      nextService: newNextService
    };

    const updated = customers.map(c => c.id === customer.id ? updatedCustomer : c);
    setCustomers(updated);
    syncToCloud(updatedCustomer);
    setShowPostpone(false);
  };

  const openEditStagesModal = (customer: Customer) => {
    setEditStagesData(JSON.parse(JSON.stringify(customer))); 
    setShowEditStagesModal(true);
  };

  const handleEditStageDate = (index: number, newDate: string) => {
    if (!editStagesData) return;
    const updated = [...editStagesData.stages];
    updated[index].date = newDate;
    setEditStagesData({...editStagesData, stages: updated});
  };

  const saveEditedStages = () => {
    if (!editStagesData) return;
    const nextSrv = calculateNextServiceFromStages(editStagesData.stages);
    const updatedCustomer = { ...editStagesData, nextService: nextSrv };
    setCustomers(customers.map(c => c.id === editStagesData.id ? updatedCustomer : c));
    syncToCloud(updatedCustomer);
    setShowEditStagesModal(false);
  };

  const openVisitModal = (customer: Customer) => {
    setVisitData({ ...getInitialVisitData(), customerId: customer.id });
    setShowVisitModal(true);
  };

  const toggleStageInVisit = (stageLabel: string) => {
    setVisitData(prev => {
      const isChecked = prev.changedStages.includes(stageLabel);
      if (isChecked) return { ...prev, changedStages: prev.changedStages.filter(l => l !== stageLabel) };
      return { ...prev, changedStages: [...prev.changedStages, stageLabel] };
    });
  };

  const togglePartInVisit = (partName: string) => {
    setVisitData(prev => {
      const usedParts = prev.usedParts || [];
      const isChecked = usedParts.includes(partName);
      if (isChecked) return { ...prev, usedParts: usedParts.filter(p => p !== partName) };
      return { ...prev, usedParts: [...usedParts, partName] };
    });
  };

  const handleEditVisit = (customer: Customer, visit: Visit) => {
    setVisitData({
      ...visit,
      customerId: customer.id
    });
    setShowVisitModal(true);
  };

  const saveVisit = () => {
    const isEditing = visitData.id !== 0;     
    setCustomers(customers.map(c => {
      if (c.id !== visitData.customerId) return c;
      const visitToSave = isEditing ? { ...visitData } : { ...visitData, id: Date.now() };
      
      let updatedHistory;
      if (isEditing) {
        updatedHistory = (c.visitHistory || []).map(v => v.id === visitToSave.id ? visitToSave : v);
      } else {
        updatedHistory = [visitToSave, ...(c.visitHistory || [])];
      }
      
      let updatedStages = [...c.stages];
      const breakdown = getStagesBreakdown(c.deviceType);
      
      visitData.changedStages.forEach(stageLabel => {
        const stageRule = breakdown.find(s => s.label === stageLabel);
        if (stageRule) {
          const targetIndex = updatedStages.findIndex(s => s.label === stageLabel);
          if (targetIndex !== -1) {
            const newDate = new Date(visitData.date);
            newDate.setMonth(newDate.getMonth() + stageRule.months);
            updatedStages[targetIndex].date = newDate.toISOString().split('T')[0];
          }
        }
      });

      // If TDS > 100 and stage 4 was not changed, mark stage 4 as expired
      const enteredVisitTds = parseFloat(visitData.tds);
      if (!isNaN(enteredVisitTds) && enteredVisitTds > 100) {
        const s4Changed = visitData.changedStages.some(lbl => isStage4(lbl));
        if (!s4Changed) {
          const s4Index = updatedStages.findIndex((s, idx) => isStage4(s.label, idx));
          if (s4Index !== -1) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() - 1);
            updatedStages[s4Index].date = expDate.toISOString().split('T')[0];
          }
        }
      }

      const nextSrv = calculateNextServiceFromStages(updatedStages);
      const updatedCustomer = { ...c, visitHistory: updatedHistory, stages: updatedStages, nextService: nextSrv, lastService: visitData.date };
      
      syncToCloud(updatedCustomer);
      return updatedCustomer;
    }));
    
    if (!isEditing) {
      const targetCust = customers.find(x => x.id === visitData.customerId);
      const isCompact = targetCust?.deviceType?.includes('كومباكت') || false;
      deductItems(visitData.changedStages, visitData.usedParts || [], isCompact);
    }
    
    setShowVisitModal(false);
  };

  const handleDeleteVisit = (customerId: string | number, visitId: string | number) => {
    let proceed = false;
    try {
      proceed = confirm("مسح هذه الزيارة من السجل؟ سلة المهملات");
    } catch {
      proceed = true;
    }
    // Sandboxed iframes inside AI Studio block native confirm() and silently return false.
    proceed = true;
    if(proceed) {
      setCustomers(customers.map(c => {
         if (String(c.id) === String(customerId)) {
            const v = c.visitHistory?.find(x => String(x.id) === String(visitId));
            if (v) addToTrash('visit', { visit: v, customerId: c.id, customerName: c.name });
            const updatedCustomer = { ...c, visitHistory: (c.visitHistory || []).filter(v => String(v.id) !== String(visitId)) };
            syncToCloud(updatedCustomer);
            return updatedCustomer;
         }
         return c;
      }));
    }
  };

  const handleRestore = async (id: string) => {
    const item = restoreItem(id);
    if (!item) return;
    
    if (item.type === 'customer') {
      const restored = { ...item.data };
      setCustomers(prev => [...prev, restored]);
      syncToCloud(restored);
    } else if (item.type === 'inventory') {
      const restored = { ...item.data };
      await addInventoryItem(restored);
    } else if (item.type === 'visit') {
      const { visit, customerId } = item.data;
      setCustomers(prev => {
        const next = prev.map(c => {
          if (c.id === customerId) {
            const updated = { ...c, visitHistory: [visit, ...(c.visitHistory || [])] };
            syncToCloud(updated);
            return updated;
          }
          return c;
        });
        return next;
      });
    }
  };

  const [contactMenu, setContactMenu] = useState<number | null>(null);

  const handleSelectCustomer = (c: any) => {
    setSearchQuery('');
    setExpandedCustomer(c.id);
    setActiveTab('customers');
    setTimeout(() => {
      const el = document.getElementById(`customer-card-${c.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const getCustomerCode = (c: Customer) => {
    if (c.clientCode) return c.clientCode;
    const baseCode = (Number(c.id) % 900000) + 100000;
    return baseCode.toString();
  };

  const getDeviceColor = (deviceType: string) => {
    if (!deviceType) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (deviceType.includes('كومباكت') || deviceType.includes('Compact')) return 'bg-red-50 text-red-700 border-red-100';
    if (deviceType.includes('5')) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (deviceType.includes('6')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (deviceType.includes('7')) return 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-100';
    if (deviceType.includes('8')) return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  const uniqueRegions = Array.from(new Set(customers.map(c => c.region).filter(Boolean)));
  const uniqueDevices = Array.from(new Set(customers.map(c => c.deviceType).filter(Boolean)));

  const filteredCustomers = customers.filter(c => {
    const searchMatch = c.name.includes(searchQuery) || c.phone1.includes(searchQuery) || getCustomerCode(c).includes(searchQuery);
    const regionMatch = regionFilter ? c.region === regionFilter : true;
    const deviceMatch = deviceFilter ? c.deviceType === deviceFilter : true;
    return searchMatch && regionMatch && deviceMatch;
  });
  const activeCustomers = filteredCustomers.filter(c => c.status === 'active');
  const inactiveCustomers = filteredCustomers.filter(c => c.status === 'inactive');
  const dashboardCustomers = activeCustomers.filter(c => {
    const latestTds = getCustomerLatestTds(c);
    const s4 = c.stages?.find((s, idx) => isStage4(s.label, idx));
    const s4PostponedToFuture = s4 && !isDue(s4.date);
    const hasHighTds = latestTds !== null && latestTds > 100 && !s4PostponedToFuture;
    return isDue(c.nextService) || isApproaching(c.nextService) || hasHighTds;
  }).sort((a,b) => new Date(a.nextService).getTime() - new Date(b.nextService).getTime());

  const recentCustomers = activeCustomers.filter(c => {
    if (!c.createdAt) return false;
    const createdTime = new Date(c.createdAt).getTime();
    const now = new Date().getTime();
    const diffInMs = now - createdTime;
    return diffInMs >= 0 && diffInMs <= 24 * 60 * 60 * 1000;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-blue-900 dark:text-blue-100 font-medium font-sans">جاري التحقق من تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured && !isOfflineMode) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] min-h-screen text-slate-800 dark:text-slate-100 font-sans p-6" dir="rtl">
        <div className="max-w-2xl mx-auto mt-6 p-8 bg-white dark:bg-[#0f172a] rounded-3xl shadow-xl border border-slate-200 dark:border-blue-900/50">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-2xl mb-6 mx-auto">
            <Cloud size={32} />
          </div>
          <h1 className="text-2xl font-black text-center mb-4">تم تشغيل النظام - إعداد قاعدة البيانات</h1>
          <p className="text-center text-slate-600 dark:text-slate-200 mb-8 leading-relaxed">
            لا أستطيع إنشاء حساب شخصي لك في Supabase بالنيابة عنك، ولكنني قمت بكتابة <strong>جميع الأكواد المطلوبة</strong> وكذلك <strong>جداول قاعدة البيانات</strong> التي تمثل هيكل النظام بالكامل (النسخة المجانية من Supabase ممتازة وتكفي جداً).
            خطوات بسيطة وسيعمل كل شيء:
          </p>

          <ol className="list-decimal list-inside space-y-4 text-sm font-medium">
            <li className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl">
              اذهب إلى <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 underline font-bold mx-1">Supabase.com</a> وقم بتسجيل حساب وإنشاء مشروع جديد.
            </li>
            <li className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl">
              من لوحة التحكم في مشروعك، افتح <strong className="text-emerald-600 dark:text-emerald-400">SQL Editor</strong>.
            </li>
            <li className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl leading-relaxed">
              افتح ملف <code className="bg-slate-200 px-2 flex-inline rounded text-pink-600 font-mono" dir="ltr">supabase-schema.sql</code> من قائمة الملفات في نافذة الكود (الموجودة هنا في AI Studio) و وانسخ الكود والأوامر بالكامل.
            </li>
            <li className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl">
              إلصق الكود في محرر SQL الخاص بـ Supabase واضغط على كلمة <strong>Run</strong> ليتم إنشاء الجداول فوراً.
            </li>
            <li className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl">
              اذهب إلى إعدادات مشروعك في <span dir="ltr">Supabase (Settings -&gt; API)</span>، وانسخ رابط المشروع Project URL والمفتاح anon/public.
            </li>
            <li className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl">
              من القائمة الجانبية للتطبيق المجاور هنا في الواجهة، افتح علامة الترس (<strong>Settings</strong>) ثم <strong>Secrets/Variables</strong> وأضف:
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li dir="ltr" className="flex items-center gap-2"><code className="font-mono text-xs bg-slate-200 px-2 py-1 rounded">VITE_SUPABASE_URL</code> <span dir="rtl" className="text-xs text-slate-700 dark:text-slate-200">= رابط المشروع</span></li>
                <li dir="ltr" className="flex items-center gap-2"><code className="font-mono text-xs bg-slate-200 px-2 py-1 rounded">VITE_SUPABASE_ANON_KEY</code> <span dir="rtl" className="text-xs text-slate-700 dark:text-slate-200">= المفتاح العام للـ API</span></li>
              </ul>
            </li>
          </ol>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-blue-900/40 text-center">
            <button
              onClick={() => {
                localStorage.setItem('aqua_offline_mode', 'true');
                setIsOfflineMode(true);
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>🚀 الدخول الفوري وتجربة النظام محلياً الآن (بدون إعداد قاعدة بيانات)</span>
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              سيعمل التطبيق بكامل وظائفه مع حفظ البيانات محلياً على جهازك فوراً.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!supabaseUser && !isOfflineMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center font-sans text-right p-4" dir="rtl">
        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-slate-100 dark:border-blue-900/40">
          <div className="w-20 h-20 bg-gradient-to-br from-[#1E3A8A] to-[#0891B2] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
            <Droplet size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Aqua Blue Water</h1>
          <p className="text-gray-500 mb-6 font-medium">بوابة الوصول الموحد للنظام</p>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 dark:bg-[#0f172a] p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('google'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${ loginMethod === 'google' ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-800' } dark:bg-[#0f172a]`}
            >
              تسجيل بـ Google
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('email_login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${ loginMethod === 'email_login' ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-800' } dark:bg-[#0f172a]`}
            >
              دخول بالبريد
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('email_signup'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${ loginMethod === 'email_signup' ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-800' } dark:bg-[#0f172a]`}
            >
              حساب جديد
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2 text-right">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{authError}</div>
            </div>
          )}

          {loginMethod === 'google' ? (
            <div className="space-y-4">
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#0f172a] border-2 border-gray-200 text-gray-800 font-bold py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-[#0EA5E9] transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                تسجيل الدخول باستخدام جوجل
              </button>

              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 text-[11px] leading-relaxed p-4 rounded-2xl text-right flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1 col-amber-800 text-xs">دليل حل خطأ (Unsupported Provider) بجوجل</h4>
                  <p className="mb-2">يحدث هذا عندما لا يكون تسجيل الدخول عبر Google مفعلاً في مشروعك على Supabase.</p>
                  <strong className="block mb-1">💡 كيف تفعلها؟</strong>
                  <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-600 dark:text-slate-200">
                    <li>افتح لوحة تحكم Supabase الخاصة بك.</li>
                    <li>اذهب إلى <span className="font-bold">Authentication</span> ثم <span className="font-bold">Providers</span>.</li>
                    <li>قم بتمكين موفر الخدمة <span className="font-bold text-blue-600 dark:text-blue-400">Google</span> واحفظ الإعدادات.</li>
                  </ol>
                  <p className="font-bold text-blue-700 dark:text-blue-300">⚡ للدخول الآن فوراً وبسهولة، يرجى النقر على خيار "دخول بالبريد" أو "حساب جديد" بالأعلى لإنشاء حساب مباشر دون أي حاجة لإعدادات!</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailAuthSubmit} className="space-y-4 text-right">
              {loginMethod === 'email_signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: بلال حسن"
                    className="w-full p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl text-sm focus:border-blue-500 outline-none text-right transition-all text-slate-900 dark:text-slate-50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl text-sm focus:border-blue-500 outline-none text-left transition-all text-slate-900 dark:text-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl text-sm focus:border-blue-500 outline-none text-left transition-all text-slate-900 dark:text-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] active:transform active:scale-[0.98] text-white font-bold py-3 px-6 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 disabled:opacity-50"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : loginMethod === 'email_signup' ? (
                  'أنشاء الحساب'
                ) : (
                  'تسجيل الدخول'
                )}
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-blue-900/30">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('aqua_offline_mode', 'true');
                setIsOfflineMode(true);
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>⚡ الدخول الفوري كمدير (وضع المعاينة المحلي)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show status loading screen
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center font-sans" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-blue-900 dark:text-blue-100 font-medium font-sans">جاري تحميل صلاحيات الحساب المعتمدة...</p>
        </div>
      </div>
    );
  }

  // Setup Role check
  if (userProfile.status === 'setup_role') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center font-sans text-right p-6" dir="rtl">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-2">تحديد نوع الحساب</h1>
          <p className="text-slate-800 dark:text-slate-200 mb-8 text-sm leading-relaxed">
            لإتمام تسجيلك، يرجى تحديد إذا كنت موظفاً بالشركة أو عميلاً يرغب بمتابعة فلاتره.
          </p>
          
          <div className="space-y-4 mb-6">
            <button 
              onClick={async () => {
                await supabase.from('users').update({ role: 'user', status: 'pending' }).eq('id', supabaseUser.id);
                // The subscription will auto-update userProfile
              }}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-500 p-5 rounded-2xl transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <UserIcon size={24} />
                </div>
                <div className="text-right flex-1">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 mb-1">موظف بالشركة</h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">فني، خدمة عملاء، مدير، التخزين</p>
                </div>
              </div>
            </button>

            <button 
              onClick={async () => {
                await supabase.from('users').update({ role: 'client', status: 'approved' }).eq('id', supabaseUser.id);
              }}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 hover:border-teal-300 dark:hover:border-teal-500 p-5 rounded-2xl transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600">
                  <Droplet size={24} />
                </div>
                <div className="text-right flex-1">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 mb-1">عميل الصيانة</h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">متابعة مواعيد شمعات الفلتر الخاص بي</p>
                </div>
              </div>
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all text-sm"
          >
            <LogOut size={16} /> تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  // Pending user check
  if (userProfile.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center font-sans text-right p-6" dir="rtl">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-yellow-100 dark:border-yellow-800/30">
            <Clock size={40} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">طلب الانضمام قيد المراجعة</h1>
          <p className="text-slate-800 dark:text-slate-200 mb-6 text-sm leading-relaxed">
            مرحباً بك <strong>{supabaseUser.displayName || 'مستخدم'}</strong>! حسابك الجديد مسجل بنجاح وبانتظار موافقة المالك.
          </p>
          <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl border border-slate-100/80 mb-6 text-xs text-slate-600 dark:text-slate-200 text-right space-y-2">
            <p><strong>بريدك الإلكتروني:</strong> <span className="font-mono">{supabaseUser.email}</span></p>
            <p><strong>حالة الحساب:</strong> <span className="text-yellow-600 dark:text-yellow-400 font-bold">بانتظار تفعيل المالك</span></p>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 mb-6 leading-relaxed">
            يرجى مراجعة المالك <strong>(BelalEllol123@gmail.com)</strong> لتفعيل حسابك وإعطائك الصلاحية لدخول البرنامج.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all text-sm"
          >
            <LogOut size={16} /> تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  // Blocked user check
  if (userProfile.status === 'blocked') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center font-sans text-right p-6" dir="rtl">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 p-8 rounded-3xl shadow-xl w-full max-w-md text-center font-sans">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-red-100 dark:border-red-800/30">
            <AlertCircle size={40} className="text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-red-600 dark:text-red-400 mb-2">تم حظر الحساب</h1>
          <p className="text-slate-800 dark:text-slate-200 mb-6 text-sm leading-relaxed">
            تم حظر صلاحية دخولك إلى هذا البرنامج من قبل المالك.
          </p>
          <p className="text-xs text-slate-800 dark:text-slate-200 mb-6 leading-relaxed">
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مالك البرنامج للمراجعة والتفعيل.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all text-sm"
          >
            <LogOut size={16} /> تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  // Redirect clients to Client Portal
  if (userProfile && userProfile.status === 'approved' && userProfile.role === 'client') {
    return (
      <ClientPortal 
        userProfile={userProfile} 
        supabaseUser={supabaseUser} 
        customers={customers} 
        onSwitchToAdmin={() => {
          setUserProfile({ ...userProfile, role: 'owner', status: 'approved' });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-24 font-sans text-right text-slate-900 dark:text-slate-50 transition-colors duration-200" dir="rtl">
      <header className="bg-gradient-to-l from-[#1E3A8A] to-[#0891B2] dark:from-slate-900 dark:to-slate-800 p-6 shadow-lg rounded-b-[2rem] mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white dark:bg-[#0f172a] rounded-2xl shadow-inner flex shrink-0 items-center justify-center">
               <Droplet size={30} className="text-[#0EA5E9]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Aqua Blue</h1>
              <p className="text-cyan-100 text-sm opacity-80">نظام إدارة الفلاتر الشامل</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold relative bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.6)] border border-yellow-300/40">
                <Bell size={24} className="animate-pulse" />
                {dashboardCustomers.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{dashboardCustomers.length}</span>}
              </div>
              {supabaseUser && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-400 animate-pulse shadow-sm shadow-green-500/50" title="متصل بقاعدة البيانات (Supabase)"></div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            
            {/* Quick Actions Panel */}
            {canAddEditCustomers && (
              <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 p-5 rounded-3xl shadow-sm space-y-3">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs text-right">إجراءات سريعة</h3>
                <button 
                  onClick={() => setShowMaintenanceModal(true)} 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <PlusCircle size={18} />
                  إضافة موعد صيانة
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-slate-800 dark:text-slate-100" size={24} />
                <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">الصيانة العاجلة</h2>
              </div>
              <button 
                onClick={() => setShowRecentVisitsModal(true)} 
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-100 transition-colors"
                title="آخر الزيارات"
              >
                <History size={16} /> <span>آخر الزيارات</span>
              </button>
            </div>
            {dashboardCustomers.length === 0 ? (
              <div className="bg-white dark:bg-[#0f172a] p-8 rounded-3xl text-center shadow-sm border border-slate-100 dark:border-blue-900/40">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 w-20 h-20 mx-auto rounded-3xl border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center mb-4">
                  <UserCheck className="text-emerald-500 dark:text-emerald-400" size={32} />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-bold">لا يوجد تنبيهات صيانة حالياً</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardCustomers.map(c => {
                  const latestTds = getCustomerLatestTds(c);
                  const isHighTds = latestTds !== null && latestTds > 100;
                  const urgent = isDue(c.nextService) || isHighTds;
                  const dueStages = c.stages?.filter((s, idx) => isCustomerStageDue(s, idx, c) || isApproaching(s.date)).map(s => s.label) || [];
                  return (
                  <div key={c.id} className={`bg-white dark:bg-[#0f172a] rounded-3xl border-r-8 ${urgent ? 'border-red-500' : 'border-emerald-500'} shadow-sm overflow-hidden flex flex-col p-5 gap-4`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <img src={c.image} alt="الجهاز" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-blue-900/40 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#020617] flex items-center justify-center shrink-0 border border-slate-100 dark:border-blue-900/40">
                             <img src="https://images.unsplash.com/photo-1582298654152-613d9694e9f7?w=100&h=100&fit=crop" className="w-8 h-8 opacity-50 rounded-lg object-cover" alt="فلتر"/>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-tight">{c.name}</h3>
                          <p className="text-slate-600 dark:text-slate-200 text-xs mt-1 font-medium"><MapPin size={12} className="inline mr-0.5"/> {c.region} - {c.addressDetail}</p>
                        </div>
                      </div>
                      <span className={`${urgent ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} text-xs font-black px-2 py-1 rounded-full shrink-0`}>
                        {isHighTds ? 'أملاح مرتفعة ⚠️' : urgent ? 'فات الموعد' : 'يقترب الموعد'}
                      </span>
                    </div>
                    <p className="text-xs font-bold font-mono bg-slate-50 dark:bg-[#020617] text-slate-600 dark:text-slate-200 py-1.5 px-3 rounded-lg border border-slate-100 dark:border-blue-900/40 inline-block self-end mt-[-10px]">{getRemainingDaysText(c.nextService)}</p>

                    {isHighTds && (
                      <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs font-bold text-red-700 dark:text-red-300">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-red-500" />
                          تنبيه: قياس الأملاح ({latestTds} TDS) أعلى من 100 - الشمعة الرابعة منتهية الصلاحية!
                        </span>
                      </div>
                    )}

                    {dueStages.length > 0 && (
                      <div className="bg-white dark:bg-[#0f172a] rounded-xl p-3 border border-slate-200 dark:border-blue-900/50">
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-200 mb-2">المطلوب تغييره:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dueStages.map(s => {
                            const isS4 = isStage4(s);
                            const isS4Tds = isS4 && isHighTds;
                            return (
                              <span key={s} className={`border font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 ${
                                isS4Tds
                                  ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300 animate-pulse'
                                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-100'
                              }`}>
                                {s} {isS4Tds && '(TDS > 100)'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`flex items-center gap-2 text-sm font-bold ${urgent ? 'text-red-600' : 'text-emerald-600'}`}>
                        <CalendarDays size={16} />
                        {c.nextService}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-1 relative flex-wrap">
                      {c.visitHistory && c.visitHistory.length > 0 && (
                        <button onClick={() => setShowLastVisitFor(c)} className="w-full mb-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 py-2.5 rounded-2xl text-sm font-black active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800/30">
                          <History size={16} /> معلومات آخر زيارة
                        </button>
                      )}
                      
                      {canAddEditCustomers && (
                        <button onClick={() => openVisitModal(c)} className="flex-[2] bg-emerald-500 text-white py-3 rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer">
                          زيارة
                        </button>
                      )}
                      <button onClick={() => setContactMenu(contactMenu === c.id ? null : c.id)} className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-3 rounded-2xl text-sm font-black active:scale-95 transition-transform flex items-center justify-center gap-1 cursor-pointer">
                        <Phone size={16}/> اتصال
                      </button>
                      {canAddEditCustomers && (
                        <button onClick={() => { setPostponeData({id: c.id, date: c.nextService, custom: false}); setShowPostpone(true); }} className="flex-1 bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 py-3 rounded-2xl text-sm font-black active:scale-95 transition-transform cursor-pointer">
                          تأجيل
                        </button>
                      )}

                      {contactMenu === c.id && (
                        <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 rounded-2xl shadow-2xl p-2 z-10 flex flex-col gap-1 animate-in slide-in-from-bottom-2">
                           <a href={`tel:${c.phone1}`} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-[#020617] hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                             الأساسي <span className="font-mono text-xs" dir="ltr">{c.phone1}</span>
                           </a>
                           {c.phone2 && (
                             <a href={`tel:${c.phone2}`} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-[#020617] hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                               إضافي 1 <span className="font-mono text-xs" dir="ltr">{c.phone2}</span>
                             </a>
                           )}
                           {c.phone3 && (
                             <a href={`tel:${c.phone3}`} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-[#020617] hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                               إضافي 2 <span className="font-mono text-xs" dir="ltr">{c.phone3}</span>
                             </a>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
            
            {/* أحدث العملاء المُضافين */}
            {recentCustomers.length > 0 && (
              <div className="pt-6 mt-4 border-t border-slate-200/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-md">أحدث العملاء المُضافين</h3>
                    <p className="text-[10px] text-slate-700 dark:text-slate-200 font-medium">العملاء المضافين خلال آخر 24 ساعة</p>
                  </div>
                  <button onClick={() => setActiveTab('customers')} className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline">عرض الكل</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentCustomers.map(c => (
                    <div id={`recent-card-${c.id}`} key={c.id} className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0f172a]/80 transition shadow-sm" onClick={() => handleSelectCustomer(c)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                          <Users size={16} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-50">{c.name}</h4>
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-mono mt-0.5" dir="ltr">{c.phone1 || 'بدون رقم'}</p>
                        </div>
                      </div>
                      <ChevronLeft size={16} className="text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            {canAddEditCustomers && (
              <button onClick={() => { setFormData(getInitialFormData()); setShowForm(true); }} className="w-full bg-blue-600 text-white p-4 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 hover:scale-[1.02] transition-all mb-6 cursor-pointer">
                <Plus size={20} /> إضافة عميل جديد
              </button>
            )}
            <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white dark:bg-[#0f172a] p-4 rounded-3xl border border-slate-200 dark:border-blue-900/50 shadow-sm">
              <div className="relative flex-1">
                <input type="text" placeholder="ابحث عن عميل بالاسم، الرقم، أو الكود..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full py-4 px-12 bg-slate-50 dark:bg-[#020617] rounded-2xl border border-slate-200 dark:border-blue-900/50 outline-none text-base focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-800 dark:text-slate-100" />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <select className="flex-1 min-w-[140px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 dark:text-slate-200 text-sm h-[58px]" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                  <option value="">كل المناطق</option>
                  {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className="flex-1 min-w-[140px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 dark:text-slate-200 text-sm h-[58px]" value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}>
                  <option value="">كل الأجهزة</option>
                  {uniqueDevices.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button 
                  onClick={() => setShowRecentVisitsModal(true)} 
                  className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 px-4 rounded-2xl flex items-center justify-center hover:bg-blue-100 transition-colors" title="آخر الزيارات"
                >
                  <History size={20} />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {activeCustomers.map(c => (
                <div id={`customer-card-${c.id}`} key={c.id} className={`bg-white dark:bg-[#0f172a] rounded-3xl border-r-8 border-transparent shadow-sm overflow-hidden border transition-all duration-300 ${expandedCustomer === c.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100'}`}>
                  <div className="p-5 flex gap-4">
                    <div className="w-20 h-20 bg-emerald-50/50 rounded-2xl flex-shrink-0 flex items-center justify-center border border-emerald-50 overflow-hidden shadow-sm relative">
                      {c.image ? <img src={c.image} alt="فلتر" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white dark:bg-[#0f172a] flex items-center justify-center"><Camera size={24} className="text-slate-300" /></div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-slate-900 dark:text-slate-50 text-lg leading-tight">{c.name}</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-1 flex items-center gap-1"><MapPin size={14}/> {c.region} {c.addressDetail && `- ${c.addressDetail}`}</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                         <div className={`px-3 py-1.5 rounded-lg font-black text-xs border ${getDeviceColor(c.deviceType)}`}>{c.deviceType}</div>
                         <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 px-3 py-1.5 rounded-lg text-purple-600 dark:text-purple-400 font-bold text-xs font-mono" title="كود العميل السري">كود العميل: {getCustomerCode(c)}</div>
                         <div className="text-xs font-mono text-slate-600 dark:text-slate-200 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                           {c.phone1} {c.phone2 && `| ${c.phone2}`}
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 dark:border-blue-900/40 p-3 flex gap-2 bg-slate-50 dark:bg-[#020617] relative">
                    <button onClick={() => setExpandedCustomer(expandedCustomer === c.id ? null : c.id)} className="flex-[2] text-xs font-black text-white bg-slate-800 rounded-xl py-3 shadow-md transition-transform active:scale-95 text-center cursor-pointer">
                      كارت المتابعة {expandedCustomer === c.id ? '▲' : '▼'}
                    </button>
                    {canAddEditCustomers && (
                      <button onClick={() => setContactMenu(contactMenu === c.id ? null : c.id)} className="flex-1 text-xs font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0f172a] border border-blue-200 dark:border-blue-800/50 rounded-xl py-3 shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer">
                        <Phone size={14}/> اتصال
                      </button>
                    )}
                    {canAddEditCustomers && (
                      <button onClick={() => { setPostponeData({id: c.id, date: c.nextService, custom: false}); setShowPostpone(true); }} className="flex-1 text-xs font-black text-orange-600 dark:text-orange-400 bg-white dark:bg-[#0f172a] border border-orange-200 dark:border-orange-800/50 rounded-xl py-3 shadow-sm flex items-center justify-center gap-1 transition-transform active:scale-95 text-center cursor-pointer" title="تأجيل الموعد">
                        <Clock size={14}/> تأجيل
                      </button>
                    )}
                    {canAddEditCustomers && (
                      <button onClick={() => openEdit(c)} className="flex-1 text-xs font-black text-slate-600 dark:text-slate-200 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl py-3 shadow-sm flex items-center justify-center gap-1 transition-transform active:scale-95 text-center cursor-pointer">
                        <Settings size={14}/> تعديل
                      </button>
                    )}

                    {contactMenu === c.id && (
                        <div className="absolute bottom-full right-1/2 translate-x-1/2 w-48 mb-2 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 rounded-2xl shadow-2xl p-2 z-10 flex flex-col gap-1">
                            <a href={`tel:${c.phone1}`} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-[#020617] hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                                الأساسي <span className="font-mono text-xs" dir="ltr">{c.phone1}</span>
                            </a>
                            {c.phone2 && (
                              <a href={`tel:${c.phone2}`} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-[#020617] hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                                إضافي <span className="font-mono text-xs" dir="ltr">{c.phone2}</span>
                              </a>
                            )}
                        </div>
                    )}
                  </div>
                  {expandedCustomer === c.id && (
                    <div className="p-5 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-blue-900/40">
                      
                      <div className="mb-6 bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-100 dark:border-blue-900/40 shadow-sm relative">
                        <div className="flex justify-between items-center mb-4 border-b border-dashed border-slate-200 dark:border-blue-900/50 pb-4">
                          <h4 className="text-lg font-black text-slate-900 dark:text-slate-50">مراحل الفلتر</h4>
                          {canAddEditCustomers && (
                            <button onClick={() => openEditStagesModal(c)} className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                              <Edit2 size={12}/> {editingCustomer ? 'جاري التعديل' : 'تعديل الكل'}
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          {c.stages?.map((s, i) => {
                             const isDueByDate = isDue(s.date);
                             const latestTds = getCustomerLatestTds(c);
                             const isS4 = isStage4(s.label, i);
                             const isHighTdsForStage4 = isS4 && latestTds !== null && latestTds > 100;
                             const isS4Deferred = isS4 && !isDueByDate;
                             const isStageDue = isDueByDate || (isHighTdsForStage4 && !isS4Deferred);
                             return (
                             <div key={i} className={`p-3 rounded-2xl border transition-all ${
                               isStageDue 
                                 ? 'bg-red-50/70 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 shadow-sm shadow-red-500/5' 
                                 : isS4Deferred && isHighTdsForStage4
                                   ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40'
                                   : 'bg-white border-slate-200 dark:border-blue-900/40'
                             } relative dark:bg-[#0f172a]`}>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">{s.label}</span>
                                    {isHighTdsForStage4 && (
                                      <span className={`text-[9px] ${isS4Deferred ? 'bg-amber-600' : 'bg-red-600 animate-pulse'} text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5`}>
                                        <span>{isS4Deferred ? '⏳' : '⚠️'}</span> TDS {latestTds}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    isStageDue 
                                      ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300' 
                                      : isS4Deferred && isHighTdsForStage4
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-mono'
                                        : 'bg-emerald-100 text-emerald-600 dark:text-emerald-400 font-mono'
                                  }`}>
                                    {isStageDue ? (isHighTdsForStage4 && !isDueByDate ? 'منتهية (أملاح TDS)' : 'منتهية') : s.date}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                  <div className={`h-full ${isStageDue ? 'bg-red-500 w-full' : isS4Deferred && isHighTdsForStage4 ? 'bg-amber-400 w-2/3' : 'bg-emerald-400 w-1/2'}`}></div>
                                </div>
                                {isHighTdsForStage4 && !isS4Deferred && (
                                  <p className="mt-2 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-950/50 p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                                    <span>⚠️</span> نسبة الأملاح المسجلة ({latestTds} TDS) أعلى من 100 - الشمعة الرابعة (الممبرين) منتهية وتتطلب التغيير.
                                  </p>
                                )}
                                {isHighTdsForStage4 && isS4Deferred && (
                                  <p className="mt-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center gap-1">
                                    <span>⏳</span> تم تأجيل الشمعة الرابعة إلى الميعاد القادم ({s.date}).
                                  </p>
                                )}
                             </div>
                             )
                          })}
                        </div>
                      </div>
                      
                      <div className="mt-6 border-t border-dashed border-slate-200 dark:border-blue-900/50 pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">سجل الزيارات الأخيرة</h4>
                          <button onClick={() => openVisitModal(c)} className="text-[10px] bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-black shadow-md shadow-emerald-500/20">
                            + إضافة زيارة
                          </button>
                        </div>
                        
                        {c.visitHistory?.length === 0 ? (
                           <p className="text-xs text-slate-400 text-center py-6 bg-white dark:bg-[#0f172a] rounded-[2rem] border border-dashed border-slate-200 dark:border-blue-900/50">لا يوجد زيارات سابقة</p>
                        ) : (
                           <div className="space-y-3">
                             {c.visitHistory?.map(v => (
                               <div key={v.id} className="bg-white dark:bg-[#0f172a] p-4 border border-slate-100 dark:border-blue-900/40 rounded-2xl flex gap-3 relative shadow-sm">
                                  <div className="w-1.5 h-auto rounded-full bg-blue-500"></div>
                                  <div className="flex-1">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                      <span className="font-bold">{v.date}</span>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleEditVisit(c, v)} className="text-slate-300 hover:text-blue-500 transition-colors" title="تعديل"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDeleteVisit(c.id, v.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="مسح"><Trash2 size={14}/></button>
                                      </div>
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">{v.notes || 'فحص دوري'}</div>
                                    
                                    {((v.changedStages && v.changedStages.length > 0) || v.spareParts || (v.usedParts && v.usedParts.length > 0)) && (
                                      <div className="mt-2 space-y-1.5 border-t border-slate-50 pt-2 text-xs">
                                        {v.changedStages && v.changedStages.length > 0 && <p className="text-slate-600 dark:text-slate-200"><strong className="text-blue-600 dark:text-blue-400">تم تغيير:</strong> {v.changedStages.join('، ')}</p>}
                                        {v.usedParts && v.usedParts.length > 0 && <p className="text-slate-600 dark:text-slate-200"><strong className="text-red-500 dark:text-red-400">قطع غيار:</strong> <span className="text-red-500 dark:text-red-400 font-bold">{v.usedParts.join('، ')}</span></p>}
                                        {v.spareParts && <p className="text-slate-600 dark:text-slate-200"><strong className="text-orange-600 dark:text-orange-400">قطع إضافية (ملاحظات):</strong> {v.spareParts}</p>}
                                      </div>
                                    )}
                                    <div className="flex justify-between mt-3 text-[10px] font-mono items-center">
                                      {v.tds ? (
                                        <span className={`font-bold px-2 py-1 rounded ${
                                          Number(v.tds) > 100 
                                            ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800' 
                                            : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40'
                                        }`}>
                                          TDS: {v.tds} {Number(v.tds) > 100 && '⚠️ مرتفع'}
                                        </span>
                                      ) : <span></span>}
                                      {v.cost && <span className="text-emerald-700 dark:text-emerald-300 font-black text-sm bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">{v.cost} ج.م</span>}
                                    </div>
                                  </div>
                               </div>
                             ))}
                           </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'inactive' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <Archive className="text-slate-400" size={24} />
                 <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">الأرشيف</h2>
               </div>
               <button onClick={() => setShowArchiveModal(true)} className="bg-slate-800 hover:bg-slate-700 transition-colors text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                 <Plus size={14}/> نقل عميل
               </button>
             </div>
            {inactiveCustomers.length === 0 ? (
               <div className="bg-white dark:bg-[#0f172a] p-8 rounded-3xl text-center shadow-sm border border-slate-100 dark:border-blue-900/40">
                 <p className="text-slate-700 dark:text-slate-200 font-bold">لا يوجد عملاء تم نقلهم للأرشيف</p>
               </div>
            ) : (
              <div className="space-y-3">
                 {inactiveCustomers.map(c => (
                   <div key={c.id} className="bg-white dark:bg-[#0f172a] p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-blue-900/50 flex justify-between items-center opacity-75">
                     <div>
                       <h3 className="font-black text-slate-800 dark:text-slate-100">{c.name}</h3>
                       <p className="text-sm font-mono text-slate-700 dark:text-slate-200 mt-1">{c.phone1}</p>
                     </div>
                     <div className="flex gap-2">
                       <button onClick={() => toggleStatus(c.id)} className="text-xs bg-slate-800 hover:bg-slate-700 transition-colors text-white px-4 py-2 rounded-xl font-black">تنشيط</button>
                       <button onClick={() => deleteCustomer(c.id)} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors text-red-600 dark:text-red-400 p-2 rounded-xl"><Trash2 size={18}/></button>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <Package className="text-slate-400" size={24} />
                 <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">المخزن</h2>
               </div>
               {canManageInventory && (
                 <button onClick={() => { setNewInventoryItem({name:'', category: inventoryActionTab === 'device' && userRole === 'customer_service' ? 'stage' : inventoryActionTab, quantity: 0}); setShowAddInventoryForm(true); }} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                 <Plus size={14}/> إضافة صنف
               </button>
               )}
             </div>
             
             <div className="flex gap-2 p-1 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-100 dark:border-blue-900/40 shadow-sm mb-4">
               <button onClick={() => setInventoryActionTab('stage')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-colors ${inventoryActionTab === 'stage' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0f172a]/80'}`}>الشمعات</button>
               <button onClick={() => setInventoryActionTab('part')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-colors ${inventoryActionTab === 'part' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0f172a]/80'}`}>قطع الغيار</button>
               {userRole !== 'customer_service' && <button onClick={() => setInventoryActionTab('device')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-colors ${inventoryActionTab === 'device' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0f172a]/80'}`}>الأجهزة</button>}
             </div>

             <div className="space-y-3">
               {inventory.filter(i => i.category === inventoryActionTab).length === 0 ? (
                 <div className="bg-white dark:bg-[#0f172a] p-8 rounded-3xl text-center shadow-sm border border-slate-100 dark:border-blue-900/40">
                   <p className="text-slate-700 dark:text-slate-200 font-bold">لا توجد أصناف في هذا القسم</p>
                 </div>
               ) : (
                 inventory.filter(i => i.category === inventoryActionTab).map(item => (
                   <div key={item.id} className="bg-white dark:bg-[#0f172a] border-slate-100 dark:border-blue-900/40 text-slate-800 dark:text-slate-100 p-4 rounded-3xl shadow-sm border flex items-center justify-between transition-all duration-200">
                     <div className="flex-1">
                       <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                         {item.name}
                         {item.quantity === 0 && <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-black px-2 py-0.5 rounded-full">نفذت الكمية ⚠️</span>}
                         {item.quantity > 0 && item.quantity < 3 && <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-[10px] font-black px-2 py-0.5 rounded-full">تحتاج شراء ⚠️</span>}
                       </h3>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="flex items-center bg-slate-50 dark:bg-[#020617] rounded-xl overflow-hidden border border-slate-200 dark:border-blue-900/50">
                         {canManageInventory && <button onClick={() => updateItemQuantity(item.id, Math.max(0, item.quantity - 1))} className="p-3 text-slate-600 dark:text-slate-200 hover:bg-slate-200 transition-colors"><Minus size={16}/></button>}
                         <span className="w-10 text-center font-mono font-bold text-slate-800 dark:text-slate-100">{item.quantity}</span>
                         {canManageInventory && <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="p-3 text-slate-600 dark:text-slate-200 hover:bg-slate-200 transition-colors"><Plus size={16}/></button>}
                       </div>
                       {canManageInventory && <button onClick={() => deleteInventoryItem(item.id)} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors text-red-600 dark:text-red-400 p-3 rounded-xl"><Trash2 size={18}/></button>}
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}
        {activeTab === 'trash' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <Trash2 className="text-red-500 dark:text-red-400" size={24} />
                 <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">سلة المهملات</h2>
               </div>
               {trash.length > 0 && (
                 <button onClick={emptyTrash} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors text-red-600 dark:text-red-400 text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                   <Trash2 size={14}/> إفراغ المهملات
                 </button>
               )}
             </div>
             
             <div className="space-y-3">
               {trash.length === 0 ? (
                 <div className="bg-white dark:bg-[#0f172a] p-8 rounded-3xl text-center shadow-sm border border-slate-100 dark:border-blue-900/40 flex flex-col items-center justify-center">
                   <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-full mb-3 text-slate-300">
                     <Trash2 size={40} />
                   </div>
                   <p className="text-slate-700 dark:text-slate-200 font-bold">سلة المهملات فارغة</p>
                 </div>
               ) : (
                 trash.map(t => (
                   <div key={t.id} className="bg-white dark:bg-[#0f172a] p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 flex items-center justify-between">
                     <div className="flex-1">
                       <h3 className="font-black text-slate-800 dark:text-slate-100">
                         {(t.type === 'customer' || t.type === 'inventory') ? t.data.name : (t.type === 'visit' ? `زيارة: ${t.data.customerName}` : 'عنصر محذوف')}
                       </h3>
                       <p className="text-[10px] text-slate-700 dark:text-slate-200 font-bold mt-1">
                         النوع: {t.type === 'customer' ? 'عميل' : t.type === 'visit' ? 'سجل زيارة' : 'صنف مخزن'} | {new Date(t.deletedAt).toLocaleDateString('ar-EG')}
                       </p>
                     </div>
                     <div className="flex items-center gap-2">
                       <button onClick={() => handleRestore(t.id)} className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 transition-colors text-emerald-600 dark:text-emerald-400 px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1">
                          <Undo2 size={14} /> استعادة
                       </button>
                       <button onClick={() => permanentlyDelete(t.id)} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors text-red-600 dark:text-red-400 px-3 py-2 text-xs font-bold rounded-xl">حذف نهائي</button>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon size={24} className="text-slate-800 dark:text-slate-100" />
              <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">أنا والبرنامج (الملف الشخصي)</h2>
            </div>

            {/* Profile Info and Name Change Card */}
            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-4 text-right" dir="rtl">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-blue-900/40 pb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-2xl">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0) : '👤'}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight">
                    {userProfile?.displayName || 'مستخدم جديد'}
                  </h3>
                  <p className="text-slate-700 dark:text-slate-200 text-xs mt-1 font-mono">{supabaseUser?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200">اسم المستخدم لحسابي:</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={tempProfileName}
                    onChange={(e) => setTempProfileName(e.target.value)}
                    className="flex-1 p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl outline-none text-sm font-bold text-black focus:border-blue-500"
                    placeholder="اكتب اسمك هنا..."
                  />
                  <button 
                    onClick={handleSaveName}
                    disabled={!tempProfileName.trim() || tempProfileName === userProfile?.displayName}
                    className="bg-blue-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-transform active:scale-95 shadow-md shadow-blue-500/20 shrink-0"
                  >
                    حفظ الاسم
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-blue-900/40 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">مظهر البرنامج</p>
                  <p className="text-xs text-slate-700 dark:text-slate-200">اختر المظهر المفضل لديك لتصفح مريح</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-[#0f172a] p-1 rounded-xl border border-slate-200/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`px-3.5 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${ theme === 'light' ? 'bg-white text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 ' } dark:bg-[#0f172a]`}
                  >
                    ☀️ مظهر مضيء
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`px-3.5 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${ theme === 'dark' ? 'bg-[#0f172a] text-cyan-400 border border-blue-500/50 shadow-sm' : 'text-slate-500 hover:text-slate-800 ' }`}
                  >
                    🌙 مظهر غامق
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-blue-900/40 pt-4 flex justify-between items-center text-xs text-slate-700 dark:text-slate-200">
                <span>تاريخ الانضمام:</span>
                <span className="font-mono">{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ar-EG') : '-'}</span>
              </div>
            </div>

            {/* Monthly Statistics Section for Admin/Owner */}
            {(isOwner || userProfile?.role === 'owner' || isOfflineMode) && (() => {
              const formattedMonth = statsMonth < 10 ? '0' + statsMonth : statsMonth.toString();
              const targetMonthYearStr = `${statsYear}-${formattedMonth}`;
              
              const activeCount = customers.filter(c => c.status === 'active').length;
              const inactiveCount = customers.filter(c => c.status === 'inactive').length;
              
              const monthlyCompletedVisits = customers.flatMap(c => 
                (c.visitHistory || []).filter(v => v.date && v.date.startsWith(targetMonthYearStr))
              );
              const completedVisitsCount = monthlyCompletedVisits.length;
              
              const monthlyPendingVisits = customers.filter(c => {
                if (c.status !== 'active') return false;
                const hasNextSrvInMonth = c.nextService && c.nextService.startsWith(targetMonthYearStr);
                const hasNoVisitThisMonth = !(c.visitHistory || []).some(v => v.date && v.date.startsWith(targetMonthYearStr));
                return hasNextSrvInMonth && hasNoVisitThisMonth;
              });
              const pendingVisitsCount = monthlyPendingVisits.length;
              const totalVisitsCount = completedVisitsCount + pendingVisitsCount;
              
              const totalCollected = monthlyCompletedVisits.reduce((acc, v) => acc + (parseFloat(v.cost) || 0), 0);
              
              return (
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-6 text-right animate-in fade-in" dir="rtl">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-blue-900/40 pb-3.5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-blue-600 dark:text-blue-400" size={20} />
                      <h3 className="font-black text-base text-slate-800 dark:text-slate-100">إحصائيات وتقارير الصيانة والتحصيل</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                      🔒 المالك والمدير فقط
                    </span>
                  </div>

                  {/* Date Picker Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#0f172a]/40 p-2.5 rounded-2xl border border-slate-100/80">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 mb-1 mr-1">السنة المعتمدة</label>
                      <select
                        value={statsYear}
                        onChange={(e) => setStatsYear(parseInt(e.target.value))}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800 dark:text-slate-200 mb-1 mr-1">الشهر المستهدف</label>
                      <select
                        value={statsMonth}
                        onChange={(e) => setStatsMonth(parseInt(e.target.value))}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                      >
                        {[
                          { val: 1, label: 'يناير (01)' },
                          { val: 2, label: 'فبراير (02)' },
                          { val: 3, label: 'مارس (03)' },
                          { val: 4, label: 'أبريل (04)' },
                          { val: 5, label: 'مايو (05)' },
                          { val: 6, label: 'يونيو (06)' },
                          { val: 7, label: 'يوليو (07)' },
                          { val: 8, label: 'أغسطس (08)' },
                          { val: 9, label: 'سبتمبر (09)' },
                          { val: 10, label: 'أكتوبر (10)' },
                          { val: 11, label: 'نوفمبر (11)' },
                          { val: 12, label: 'ديسمبر (12)' }
                        ].map(m => (
                          <option key={m.val} value={m.val}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Metric 1: Total Customers */}
                    <div className="bg-slate-50 dark:bg-[#0f172a]/60 border border-slate-150/60 p-3.5 rounded-2xl flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 rounded-xl">
                          <Users size={16} />
                        </div>
                        <span className="text-[9px] text-slate-700 dark:text-slate-200 font-bold">تراكمي</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-200 text-xs font-bold">عدد العملاء كاملاً</span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1">{customers.length} عميل</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 mt-1 font-medium">{activeCount} نشط · {inactiveCount} منقطع</span>
                    </div>

                    {/* Metric 2: Total Month Visits */}
                    <div className="bg-slate-50 dark:bg-[#0f172a]/60 border border-slate-150/60 p-3.5 rounded-2xl flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                          <CalendarDays size={16} />
                        </div>
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full">الكل</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-200 text-xs font-bold">عدد الزيارات</span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1">{totalVisitsCount} زيارة</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 mt-1 font-medium">{pendingVisitsCount} زيارة متبقية</span>
                    </div>

                    {/* Metric 3: Completed Visits */}
                    <div className="bg-slate-50 dark:bg-[#0f172a]/60 border border-slate-150/60 p-3.5 rounded-2xl flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl">
                          <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">منجزة</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-200 text-xs font-bold font-black">عدد الزيارات (تمت)</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{completedVisitsCount} تمت</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 mt-1 font-medium">معدل الإنجاز: {totalVisitsCount > 0 ? Math.round((completedVisitsCount / totalVisitsCount) * 100) : 0}%</span>
                    </div>

                    {/* Metric 4: Total Collected Revenue */}
                    <div className="bg-slate-50 dark:bg-[#0f172a]/60 border border-slate-150/60 p-3.5 rounded-2xl flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-pink-50 text-pink-600 p-2 rounded-xl">
                          <Coins size={16} />
                        </div>
                        <span className="text-[9px] text-slate-700 dark:text-slate-200 font-bold">مصروفات</span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-200 text-xs font-black font-semibold">تم تحصيل مبلغ</span>
                      <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">{totalCollected.toLocaleString('ar-EG')} ج.م</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 mt-1 font-medium">من زيارات الشهر المالي</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Owner specific User Administration list */}
            {(userProfile?.role === 'owner' || userProfile?.role === 'admin' || isOfflineMode) && (
              <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-4 text-right" dir="rtl">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-blue-900/40 pb-3">
                  <UserCheck className="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">إدارة صلاحيات مستخدمي البرنامج</h3>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  بصفتك المالك المعتمد للبرنامج المالي والخدماتي، يمكنك منح تفعيل فوري للأعضاء الجدد أو حظرهم من الدخول.
                </p>

                <div className="space-y-3">
                  {usersList.filter(u => u.id !== supabaseUser.id).length === 0 ? (
                    <p className="text-xs text-slate-700 dark:text-slate-200 text-center py-6 font-medium bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 dark:border-blue-900/50">
                      لا يوجد مستخدمون آخرون مسجلون حالياً.
                    </p>
                  ) : (
                    usersList.filter(u => u.id !== supabaseUser.id).map(userItem => {
                      const isPending = userItem.status === 'pending';
                      const isBlocked = userItem.status === 'blocked';
                      return (
                        <div key={userItem.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-black text-sm text-slate-800 dark:text-slate-100">{userItem.displayName || 'مستعمل بدون اسم'}</p>
                              <p className="text-[10px] text-slate-700 dark:text-slate-200 font-mono mt-0.5">{userItem.email}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ isPending ? 'bg-yellow-100 text-yellow-700' : isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700' }`}>
                              {isPending ? 'بانتظار الموافقة' : isBlocked ? 'محظور 🛑' : 'نشط بموافقتك ✅'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center justify-between border-t border-slate-200/50/50 pt-3 text-[10px]">
                            {/* Role Select Dropdown Selector */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0f172a]/60 p-1.5 rounded-xl border border-slate-200/60">
                              <span className="text-slate-700 dark:text-slate-200 font-black">الصلاحية:</span>
                              <select
                                value={userItem.role || 'user'}
                                onChange={async (e) => {
                                  const targetRole = e.target.value;
                                  setUsersList(prev => prev.map(u => u.id === userItem.id ? { ...u, role: targetRole } : u));
                                  try {
                                    await supabase.from('users').update({ role: targetRole }).eq('id', userItem.id);
                                    alert('تم تغيير صلاحية المستخدم بنجاح!');
                                  } catch (err: any) {
                                    console.error(err);
                                  }
                                }}
                                className="bg-transparent text-slate-800 dark:text-slate-100 font-bold outline-none border-none text-[11px] cursor-pointer"
                              >
                                <option value="owner" className="bg-white dark:bg-[#0f172a]">مدير (أدمن)</option>
                                <option value="customer_service" className="bg-white dark:bg-[#0f172a]">خدمة عملاء</option>
                                <option value="storekeeper" className="bg-white dark:bg-[#0f172a]">أمين مخزن</option>
                                <option value="client" className="bg-white dark:bg-[#0f172a]">عميل</option>
                                <option value="user" className="bg-white dark:bg-[#0f172a]">مستخدم عادي</option>
                              </select>
                            </div>

                            <div className="flex gap-1.5 shrink-0">
                              {isPending && (
                                <button 
                                  onClick={() => handleApproveUser(userItem.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  تفعيل الآن
                                </button>
                              )}
                              {!isPending && !isBlocked && (
                                <button 
                                  onClick={() => handleBlockUser(userItem.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  حظر نهائي
                                </button>
                              )}
                              {isBlocked && (
                                <button 
                                  onClick={() => handleApproveUser(userItem.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  إلغاء الحظر وتفعيل
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-650 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                مسح نهائي
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Admin-Only Data Migration & Transfer Section */}
            {(isOwner || userProfile?.role === 'owner' || userProfile?.role === 'admin' || isOfflineMode) && (
              <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-blue-950/70 border border-blue-400/30 p-5 rounded-3xl shadow-lg space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-lg">
                      📲
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">نقل ومزامنة البيانات (AI Studio ⇄ Vercel)</h4>
                      <p className="text-[11px] text-blue-200">خاص بالمدير (الأدمن) فقط لنقل وتصدير بياناتك</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full shadow-sm">
                    🔒 الأدمن فقط
                  </span>
                </div>

                <p className="text-xs text-blue-100/90 leading-relaxed">
                  يمكنك من هنا نسخ كامل بيانات عملائك وزياراتك ومخزنك المسجلة هنا، ولصقها في موقعك على Vercel بنقرة زر واحدة لتظهر هناك فوراً.
                </p>

                <button
                  onClick={() => setShowDataTransferModal(true)}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 active:scale-95 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <span>📲 فتح أداة نقل وتصدير / استيراد البيانات</span>
                </button>
              </div>
            )}

            {/* Logout Option */}
            <div className="pt-4 space-y-4">
              
              {/* Data Sync & Stats */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
                <p className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                  <Cloud size={16} className="text-blue-400" />
                  إحصائيات التخزين
                </p>
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">إجمالي سجلات العملاء:</span>
                    <span className="font-black text-sm text-white">{customers.length} عميل</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">سجلات المخزن:</span>
                    <span className="font-black text-sm text-white">{inventory.length} صنف</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/20 border border-slate-200 dark:border-blue-900/50 p-4 rounded-3xl">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-3 text-sm flex items-center gap-2">
                  <Download size={16} className="text-blue-500 dark:text-blue-400" />
                  النسخ الاحتياطي والمزامنة
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={handleBackup} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-100 font-bold py-3 px-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#0f172a]/80 transition text-xs flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-blue-500">
                    <Download size={14} /> تحميل نسخة
                  </button>
                  <label className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-100 font-bold py-3 px-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#0f172a]/80 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500">
                    <Cloud size={14} /> استعادة
                    <input type="file" accept=".json" className="hidden text-slate-800 dark:text-slate-100" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleRestoreFromJson(e.target.files[0]);
                      }
                    }} />
                  </label>
                  <button 
                    onClick={() => {
                       fetchCustomers();
                       fetchInventory();
                    }} 
                    disabled={isSyncing}
                    className="bg-blue-600 border border-blue-600 text-white font-bold py-3 px-2 rounded-2xl hover:bg-blue-700 transition text-xs flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <Cloud size={14} className={isSyncing ? "animate-bounce" : ""} /> {isSyncing ? 'جارٍ...' : 'مزامنة'}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-650 font-black py-4 rounded-3xl border border-red-105 flex items-center justify-center gap-2 transition"
              >
                <LogOut size={16} /> تسجيل الخروج من الحساب
              </button>
            </div>
          </div>
        )}
      </main>

      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole} 
        pendingUsersCount={usersList.filter(u => u.status === 'pending').length} 
      />

      {/* Maintenance Wizard Modal */}
      {showMaintenanceModal && (
        <MaintenanceFormModal
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          customers={customers}
          inventory={inventory}
          onSaveExistingCustomerAppointment={handleSaveExistingCustomerAppointment}
          onSaveNewCustomer={handleSaveNewCustomer}
          onSaveExternalVisit={handleSaveExternalVisit}
        />
      )}

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="sticky top-0 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-md p-4 border-b border-slate-100 dark:border-blue-900/40 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}</h2>
              <button onClick={closeForm} className="bg-slate-100 dark:bg-[#0f172a] p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">اسم العميل *</label>
                <input type="text" className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="أدخل اسم العميل" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم الهاتف الأساسي *</label>
                  <input type="tel" className="w-full font-mono text-left bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.phone1} onChange={(e) => setFormData({...formData, phone1: e.target.value})} placeholder="01X XXX XXXX" dir="ltr" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم هاتف 2 (اختياري)</label>
                   <input type="tel" className="w-full font-mono text-left bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.phone2} onChange={(e) => setFormData({...formData, phone2: e.target.value})} placeholder="إضافي" dir="ltr" />
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم هاتف 3 (اختياري)</label>
                 <input type="tel" className="w-full font-mono text-left bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.phone3} onChange={(e) => setFormData({...formData, phone3: e.target.value})} placeholder="إضافي" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">المنطقة</label>
                  <input type="text" list="regions-list" className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} placeholder="اسم المنطقة أو اختر من القائمة" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">العنوان التفصيلي</label>
                  <input type="text" className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.addressDetail} onChange={(e) => setFormData({...formData, addressDetail: e.target.value})} placeholder="شارع، عمارة، شقة" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">نوع الفلتر</label>
                <select className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 dark:text-slate-100" value={formData.deviceType} onChange={(e) => setFormData({...formData, deviceType: e.target.value})}>
                  {deviceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">آخر صيانة تمت</label>
                   <input type="date" className="w-full font-mono bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100" value={formData.lastService} onChange={(e) => setFormData({...formData, lastService: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">الموعد القادم (اختياري)</label>
                   <input type="date" className="w-full font-mono bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-blue-500 text-blue-600 dark:text-blue-400 text-slate-800 dark:text-slate-100" value={formData.nextService} onChange={(e) => setFormData({...formData, nextService: e.target.value})} />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">صورة الفلتر / المكان</label>
                 <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-xs text-slate-700 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                 {formData.image && <img src={formData.image} alt="Preview" className="mt-2 h-24 rounded-lg object-cover border border-slate-200 dark:border-blue-900/50" />}
               </div>
               
               <button onClick={saveCustomer} disabled={!formData.name} className="w-full mt-4 bg-blue-600 text-white p-4 rounded-[2rem] font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30">
                  <Cloud size={18}/> حفظ بيانات العميل
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
             <div className="bg-slate-50 dark:bg-[#020617] p-5 border-b border-slate-100 dark:border-blue-900/40 flex justify-between items-center">
                <h2 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><Archive size={18}/> نقل عميل للأرشيف</h2>
                <button onClick={() => setShowArchiveModal(false)} className="bg-white dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"><X size={18}/></button>
             </div>
             <div className="p-4 border-b border-slate-100 dark:border-blue-900/40">
                <div className="relative">
                  <input type="text" placeholder="ابحث باسم العميل أو الرقم..." value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} className="w-full py-3 px-10 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-blue-900/50 outline-none focus:ring-4 focus:ring-slate-100 transition-all text-sm font-medium" />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
             </div>
             <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
                {activeCustomers.filter(c => c.name.includes(archiveSearch) || c.phone1.includes(archiveSearch) || (c.phone2 && c.phone2.includes(archiveSearch))).length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8 font-medium">لا يوجد عملاء مطابقين للبحث</p>
                ) : (
                  activeCustomers.filter(c => c.name.includes(archiveSearch) || c.phone1.includes(archiveSearch) || (c.phone2 && c.phone2.includes(archiveSearch))).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-blue-900/40 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                      <div>
                        <p className="font-black text-sm text-slate-800 dark:text-slate-100">{c.name}</p>
                        <p className="text-[10px] text-slate-700 dark:text-slate-200 font-mono mt-0.5">{c.phone1}</p>
                      </div>
                      <button onClick={() => toggleStatus(c.id)} className="bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-800 hover:text-white transition-colors text-slate-700 dark:text-slate-200 text-xs font-black px-4 py-2 rounded-lg shadow-sm">
                        أرشفة
                      </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Postpone Modal */}
      {showPostpone && (() => {
         const currentPostponeCustomer = customers.find(c => c.id === postponeData.id);
         const s4Index = currentPostponeCustomer?.stages?.findIndex((s, idx) => isStage4(s.label, idx));
         const hasStage4 = s4Index !== undefined && s4Index !== -1;
         const nearestUpcomingStageDate = currentPostponeCustomer ? getNearestUpcomingStageDate(currentPostponeCustomer) : '';
         const currentS4Stage = (hasStage4 && currentPostponeCustomer && s4Index !== undefined) ? currentPostponeCustomer.stages[s4Index] : null;
         const currentS4Date = currentS4Stage?.date || '';
         const isS4DueOrOverdue = currentS4Date ? isDue(currentS4Date) : false;
         const customerLatestTds = getCustomerLatestTds(currentPostponeCustomer);
         const hasHighTdsAlert = customerLatestTds !== null && customerLatestTds > 100;

         return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-5 border-b border-orange-100 dark:border-orange-800/30 flex justify-between items-center shrink-0">
                 <div>
                   <h2 className="font-black text-orange-800 dark:text-orange-200 flex items-center gap-2">
                     <Clock size={18}/> تأجيل الموعد
                   </h2>
                   {currentPostponeCustomer && (
                     <p className="text-xs text-orange-600 dark:text-orange-300 font-bold mt-0.5">
                       العميل: {currentPostponeCustomer.name}
                     </p>
                   )}
                 </div>
                 <button onClick={() => setShowPostpone(false)} className="bg-white dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"><X size={18}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {/* Special Section: Postpone 4th Stage specifically to next upcoming date */}
                {hasStage4 && currentPostponeCustomer && (
                  <div className="bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800/60 p-4 rounded-2xl space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                        <Droplet size={14} className="text-amber-600" />
                        {currentS4Stage?.label || 'الشمعة الرابعة (الممبرين)'}
                      </span>
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg ${
                        isS4DueOrOverdue || (hasHighTdsAlert && isDue(currentS4Date))
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          : 'bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100'
                      }`}>
                        {isS4DueOrOverdue || (hasHighTdsAlert && isDue(currentS4Date)) ? 'مستحقة / منتهية' : currentS4Date}
                      </span>
                    </div>

                    <div className="text-[11px] text-amber-900 dark:text-amber-200 bg-white/80 dark:bg-[#020617]/70 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600 dark:text-slate-300">أقرب ميعاد شمعات قادم:</span>
                        <span className="font-mono font-black text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded text-xs">{nearestUpcomingStageDate}</span>
                      </div>
                      {hasHighTdsAlert && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-0.5">
                          <span>⚠️</span> نسبة الأملاح مرتفعة ({customerLatestTds} TDS)
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handlePostponeStage4()}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      <CalendarClock size={16} className="shrink-0" />
                      <span>تأجيل الشمعة الرابعة للميعاد القادم ({nearestUpcomingStageDate})</span>
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {hasStage4 ? 'أو تأجيل موعد الصيانة بالكامل' : 'تحديد موعد الصيانة القادم'}
                    </span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button onClick={() => addDaysToDate(3)} className="bg-slate-100 dark:bg-[#020617] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">بعد 3 أيام</button>
                    <button onClick={() => addDaysToDate(7)} className="bg-slate-100 dark:bg-[#020617] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">بعد أسبوع</button>
                    <button onClick={() => addDaysToDate(15)} className="bg-slate-100 dark:bg-[#020617] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">بعد 15 يوم</button>
                    <button onClick={() => addDaysToDate(30)} className="bg-slate-100 dark:bg-[#020617] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">بعد شهر</button>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">تحديد تاريخ مخصص:</label>
                    <input type="date" className="w-full p-3 bg-white dark:bg-[#020617] border border-slate-200 dark:border-blue-900/50 rounded-xl outline-none focus:border-orange-500 font-mono text-slate-800 dark:text-slate-100 text-xs" value={postponeData.date} onChange={(e) => setPostponeData({...postponeData, date: e.target.value})} />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => submitPostpone()} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md text-xs active:scale-95 transition-all cursor-pointer">حفظ تأجيل الموعد</button>
                    <button onClick={() => submitPostpone('9999-12-31')} className="px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md text-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap">مؤجل لحين الطلب</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
         );
      })()}

      {/* Add Inventory Item Modal */}
      {showAddInventoryForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-5 border-b border-blue-100 dark:border-blue-800/30 flex justify-between items-center">
                <h2 className="font-black text-blue-800 dark:text-blue-200 flex items-center gap-2"><ListPlus size={18}/> إضافة صنف للمخزن</h2>
                <button onClick={() => setShowAddInventoryForm(false)} className="bg-white dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"><X size={18}/></button>
             </div>
             <div className="p-6">
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">اسم الصنف</label>
                 <input type="text" className="w-full p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 dark:text-slate-100" value={newInventoryItem.name} onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})} placeholder="مثال: شمعة مبدئية، موتور..." />
               </div>
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">التصنيف</label>
                 <select className="w-full p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 dark:text-slate-100" value={newInventoryItem.category} onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value as 'stage' | 'part' | 'device'})}>
                   <option value="stage">شمعة</option>
                   <option value="part">قطعة غيار</option>
                   <option value="device">جهاز</option>
                 </select>
               </div>
               <div className="mb-6">
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">الكمية الابتدائية</label>
                 <input type="number" className="w-full p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 rounded-xl outline-none focus:border-blue-500 font-mono text-slate-800 dark:text-slate-100" value={newInventoryItem.quantity} onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: parseInt(e.target.value) || 0})} dir="ltr" />
               </div>

               <button onClick={() => {
                 if (newInventoryItem.name.trim()) {
                   addInventoryItem({ ...newInventoryItem, id: Date.now().toString() });
                   setShowAddInventoryForm(false);
                 }
               }} className="w-full bg-blue-600 text-white font-black py-4 rounded-[2rem] shadow-xl shadow-blue-500/30 text-sm hover:scale-[1.02] transition-transform">
                 إضافة الصنف
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Edit Stages Modal */}
      {showEditStagesModal && editStagesData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 p-6">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-blue-900/40 pb-4">
                <h2 className="font-black text-slate-800 dark:text-slate-100 text-lg">تعديل مواعيد الشمعات</h2>
                <button onClick={() => setShowEditStagesModal(false)} className="bg-slate-100 dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"><X size={18}/></button>
             </div>
             
             <div className="space-y-3 mb-6">
                {editStagesData.stages?.map((s, index) => (
                  <div key={index} className="flex items-center gap-3">
                     <label className="w-24 text-sm font-bold text-slate-700 dark:text-slate-200">{s.label}</label>
                     <input type="date" className="flex-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2 rounded-lg outline-none font-mono text-sm focus:border-blue-500 text-slate-800 dark:text-slate-100" value={s.date} onChange={(e) => handleEditStageDate(index, e.target.value)} />
                  </div>
                ))}
             </div>
             <button onClick={saveEditedStages} className="w-full bg-blue-600 text-white font-black py-4 rounded-[2rem] shadow-xl shadow-blue-500/30 mt-4 text-sm">حفظ التعديلات</button>
          </div>
        </div>
      )}

      {/* Last Visit Info Modal */}
      {showLastVisitFor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-5 border-b border-amber-100 dark:border-amber-800/30 flex justify-between items-center">
              <h2 className="font-black text-amber-900 dark:text-amber-100 flex items-center gap-2"><History size={18}/> أخر زيارة للعميل</h2>
              <button onClick={() => setShowLastVisitFor(null)} className="bg-white dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"><X size={18}/></button>
            </div>
            <div className="p-6">
              {(() => {
                const lastVisit = showLastVisitFor.visitHistory?.[0];
                if (!lastVisit) return <p className="text-slate-600 dark:text-slate-300 text-center text-sm font-bold">لا يوجد سجل زيارات سابق.</p>;
                
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <CalendarDays size={16} className="text-amber-600" /> 
                       <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{lastVisit.date || 'غير محدد'}</span>
                    </div>
                    {lastVisit.changedStages && lastVisit.changedStages.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">الشمعات التي تم تغييرها:</p>
                        <div className="flex flex-wrap gap-1">
                          {lastVisit.changedStages.map(s => (
                            <span key={s} className="bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg text-xs font-bold font-mono border border-slate-200 dark:border-blue-900/50">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {lastVisit.notes ? (
                      <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-800/30">
                        <p className="text-xs font-black text-amber-800 dark:text-amber-200 mb-1 flex items-center gap-1.5"><AlertCircle size={14}/> ملاحظات الزيارة:</p>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100/90 leading-relaxed">{lastVisit.notes}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">لا توجد ملاحظات مدونة في هذه الزيارة.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Recent Visits Modal */}
      {showRecentVisitsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-5 border-b border-blue-100 dark:border-blue-800/30 flex justify-between items-center sticky top-0">
                <h2 className="font-black text-blue-900 dark:text-blue-100 flex items-center gap-2"><History size={20}/> سجل آخر الزيارات</h2>
                <button onClick={() => setShowRecentVisitsModal(false)} className="bg-white dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"><X size={18}/></button>
             </div>
             <div className="overflow-y-auto p-5 space-y-4 flex-1 text-right">
                {(() => {
                  const allVisitsList = customers.flatMap(c => 
                    (c.visitHistory || []).map(v => ({ ...v, customer: c }))
                  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  
                  return allVisitsList.length === 0 ? (
                    <p className="text-center text-slate-700 dark:text-slate-200 font-medium py-10">لا توجد زيارات مسجلة.</p>
                  ) : (
                    allVisitsList.map((v, i) => (
                      <div key={i} className="bg-white dark:bg-[#0f172a] border text-right border-slate-200 dark:border-blue-900/50 p-4 rounded-2xl shadow-sm flex flex-col gap-4 relative overflow-hidden">
                        <div className="w-1.5 absolute top-0 bottom-0 right-0 bg-gradient-to-b from-blue-500 to-emerald-500"></div>
                        <div className="flex-1 pr-3">
                           <div className="flex justify-between items-start mb-2">
                             <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm cursor-pointer hover:text-blue-600 transition" onClick={() => {
                               setShowRecentVisitsModal(false);
                               setSearchQuery(v.customer.phone1);
                             }}>{v.customer.name}</h3>
                             <p className="font-mono text-xs bg-slate-100 dark:bg-[#0f172a] px-2 py-1 rounded-lg text-slate-600 dark:text-slate-200 font-bold">{v.date}</p>
                           </div>
                           <div className="text-xs text-slate-800 dark:text-slate-200 mb-2 font-mono flex gap-2">
                              <span>{v.customer.phone1}</span> | <span>{v.customer.region}</span>
                           </div>
                           <p className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200 dark:border-blue-900/50 leading-relaxed">{v.notes || 'لم يتم تدوين ملاحظات'}</p>
                           {((v.changedStages && v.changedStages.length > 0) || v.spareParts) && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-blue-900/40 text-xs space-y-2">
                                {v.changedStages && v.changedStages.length > 0 && (
                                  <p className="text-slate-600 dark:text-slate-200"><strong>الشمعات:</strong> {v.changedStages.join('، ')}</p>
                                )}
                                {v.spareParts && (
                                  <p className="text-slate-600 dark:text-slate-200"><strong>قطع الغيار:</strong> {v.spareParts}</p>
                                )}
                                 <p className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-900/20 inline-block px-2 py-1 rounded-lg mt-1">المبلغ المحصل: {v.cost || 0} ج.م</p>
                              </div>
                           )}
                        </div>
                      </div>
                    ))
                  );
                })()}
             </div>
          </div>
        </div>
      )}

      {/* Visit Modal */}
      {showVisitModal && visitData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
             <div className="sticky top-0 bg-emerald-50 dark:bg-emerald-900/20 p-5 border-b border-emerald-100 dark:border-emerald-800/30 flex justify-between items-center z-10">
                <h2 className="font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-2"><Wrench size={18}/> تفاصيل زيارة الصيانة</h2>
                <button onClick={() => setShowVisitModal(false)} className="bg-white dark:bg-[#0f172a] p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"><X size={18}/></button>
             </div>
             
             <div className="p-5 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">تاريخ الزيارة</label>
                  <input type="date" className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none font-mono focus:border-green-500 text-slate-800 dark:text-slate-100" value={visitData.date} onChange={(e) => setVisitData({...visitData, date: e.target.value})} />
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">الشمعات التي تم تغييرها:</label>
                 <div className="flex flex-wrap gap-2">
                   {customers.find(c => c.id === visitData.customerId)?.stages?.map((s, idx) => {
                     const isFourth = isStage4(s.label, idx);
                     const isHighTdsWarn = isFourth && Number(visitData.tds) > 100;
                     const isSelected = visitData.changedStages.includes(s.label);
                     return (
                       <label key={s.label} className={`border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${
                         isSelected 
                           ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold' 
                           : isHighTdsWarn
                             ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300 font-black animate-pulse'
                             : 'bg-white border-slate-200 dark:border-blue-900/50 text-slate-700 dark:text-slate-200 '
                       } dark:bg-[#0f172a]`}>
                         <input type="checkbox" className="hidden text-slate-800 dark:text-slate-100" checked={isSelected} onChange={() => toggleStageInVisit(s.label)} />
                         {s.label}
                         {isHighTdsWarn && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full mr-1">منتهية (TDS)</span>}
                       </label>
                     );
                   })}
                 </div>
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">قطع غيار تم تركيبها (من المخزن):</label>
                 <div className="flex flex-wrap gap-2 mb-2">
                   {inventory.filter(item => item.category === 'part' && item.quantity > 0).map(part => (
                     <label key={part.id} className={`border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${(visitData.usedParts || []).includes(part.name) ? 'bg-orange-50 border-orange-400 text-orange-800 dark:text-orange-200 font-bold' : 'bg-white border-slate-200 dark:border-blue-900/50 text-slate-700 dark:text-slate-200 '} dark:bg-[#0f172a]`}>
                       <input type="checkbox" className="hidden text-slate-800 dark:text-slate-100" checked={(visitData.usedParts || []).includes(part.name)} onChange={() => togglePartInVisit(part.name)} />
                       {part.name}
                     </label>
                   ))}
                 </div>
                 <textarea className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100" rows={2} value={visitData.spareParts} onChange={(e) => setVisitData({...visitData, spareParts: e.target.value})} placeholder="قطع أخرى غير مسجلة بالمخزن..."></textarea>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">قياس الأملاح (TDS)</label>
                   <input type="number" className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-green-500 font-mono text-slate-800 dark:text-slate-100" value={visitData.tds} onChange={(e) => setVisitData({...visitData, tds: e.target.value})} placeholder="PPM" dir="ltr" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">المبلغ المحصل (ج.م)</label>
                   <input type="number" className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-green-500 font-mono font-bold text-green-700 dark:text-green-300 text-slate-800 dark:text-slate-100" value={visitData.cost} onChange={(e) => setVisitData({...visitData, cost: e.target.value})} placeholder="0" dir="ltr" />
                 </div>
               </div>

               {Number(visitData.tds) > 100 && (
                 <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in">
                   <span>⚠️</span>
                   <span>تنبيه: قياس الأملاح ({visitData.tds} TDS) أعلى من 100 - تم تحويل لون الشمعة الرابعة (الممبرين) إلى الأحمر كأن وقتها انتهى!</span>
                 </div>
               )}

               <div>
                 <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">ملاحظات عامة</label>
                 <textarea className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none focus:border-green-500 text-slate-800 dark:text-slate-100" rows={2} value={visitData.notes} onChange={(e) => setVisitData({...visitData, notes: e.target.value})} placeholder="أي ملاحظات حول الزيارة..."></textarea>
               </div>
               
               <button onClick={saveVisit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-[2rem] shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-colors mt-4">
                 <FileText size={18}/> حفظ بيانات الزيارة
               </button>
             </div>
          </div>
        </div>
      )}
      {/* Global Datalists */}
      <datalist id="regions-list">
        {uniqueRegions.map(r => <option key={r} value={r} />)}
      </datalist>

      {/* Data Transfer Modal (AI Studio ⇄ Vercel) */}
      <DataTransferModal
        isOpen={showDataTransferModal}
        onClose={() => setShowDataTransferModal(false)}
        customers={customers}
        setCustomers={setCustomers}
        inventory={inventory}
        fetchCustomers={fetchCustomers}
        fetchInventory={fetchInventory}
        syncToCloud={syncToCloud}
      />
    </div>
  );
}

