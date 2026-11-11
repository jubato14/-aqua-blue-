import React, { useState } from 'react';
import { X, Copy, Check, Download, Upload, ArrowRightLeft, Database, RefreshCw, FileText } from 'lucide-react';
import { Customer, InventoryItem } from '../types';
import { SHEETDB_URL, migrateCustomer } from '../utils';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  inventory: InventoryItem[];
  fetchCustomers?: () => Promise<void>;
  fetchInventory?: () => Promise<void>;
  syncToCloud?: (cust: Customer) => Promise<void>;
}

export function DataTransferModal({
  isOpen,
  onClose,
  customers,
  setCustomers,
  inventory,
  fetchCustomers,
  fetchInventory,
  syncToCloud
}: DataTransferModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'sheetdb'>('export');
  const [copied, setCopied] = useState(false);
  const [pasteCode, setPasteCode] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isLoadingSheetDB, setIsLoadingSheetDB] = useState(false);

  if (!isOpen) return null;

  // Prepare full data bundle
  const getBundleData = () => {
    let usersList = [];
    try {
      const u = localStorage.getItem('aqua_users_list');
      if (u) usersList = JSON.parse(u);
    } catch (e) {}

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      customers,
      inventory,
      usersList
    };
  };

  const bundleData = getBundleData();
  const jsonString = JSON.stringify(bundleData, null, 2);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AquaBlue_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const applyImportedData = async (parsed: any) => {
    if (!parsed || (!parsed.customers && !Array.isArray(parsed))) {
      throw new Error("تنسيق البيانات غير صحيح. تأكد من نسخ الكود بالكامل.");
    }

    const importedCustomers: Customer[] = Array.isArray(parsed) ? parsed : (parsed.customers || []);
    const importedInventory: InventoryItem[] = parsed.inventory || [];
    const importedUsers = parsed.usersList || [];

    // Save to localStorage
    if (importedCustomers.length > 0) {
      const migrated = importedCustomers.map((c: any) => migrateCustomer(c));
      localStorage.setItem('aqua_blue_customers', JSON.stringify(migrated));
      setCustomers(migrated);
      if (syncToCloud) {
        for (const c of migrated) {
          try { await syncToCloud(c); } catch (e) {}
        }
      }
    }

    if (importedInventory.length > 0) {
      localStorage.setItem('aqua_blue_inventory', JSON.stringify(importedInventory));
      if (fetchInventory) await fetchInventory();
    }

    if (importedUsers.length > 0) {
      localStorage.setItem('aqua_users_list', JSON.stringify(importedUsers));
    }

    setImportStatus({
      type: 'success',
      message: `تمت استعادة ونقل البيانات بنجاح! تم استيراد ${importedCustomers.length} عميل و ${importedInventory.length} صنف مخزن.`
    });
  };

  const handleApplyPasteCode = async () => {
    setImportStatus({ type: '', message: '' });
    if (!pasteCode.trim()) {
      setImportStatus({ type: 'error', message: 'يرجى لصق كود البيانات أولاً' });
      return;
    }
    try {
      const parsed = JSON.parse(pasteCode.trim());
      await applyImportedData(parsed);
      setPasteCode('');
    } catch (e: any) {
      setImportStatus({ type: 'error', message: 'خطأ في قراءة الكود: ' + e.message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        await applyImportedData(parsed);
      } catch (err: any) {
        setImportStatus({ type: 'error', message: 'خطأ في معالجة الملف: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handlePullFromSheetDB = async () => {
    setIsLoadingSheetDB(true);
    setImportStatus({ type: '', message: '' });
    try {
      const res = await fetch(SHEETDB_URL);
      if (!res.ok) throw new Error("فشل الاتصال بـ SheetDB");
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("لا توجد بيانات مسجلة في شيت SheetDB");
      }

      const imported = rows.map((r: any, idx: number) => {
        const cleanPhone = (r.phone || '').replace(/[^0-9]/g, '');
        return migrateCustomer({
          id: r.id || 'sheet_' + (Date.now() + idx),
          name: r.name || 'عميل بدون اسم',
          phone1: cleanPhone,
          deviceType: r.device || '7 مراحل R.O',
          region: r.region || '',
          nextService: r.nextService || new Date().toISOString().split('T')[0],
          status: 'active',
          stages: [],
          visitHistory: []
        });
      });

      // Merge with existing
      const existing = [...customers];
      let newCount = 0;
      imported.forEach(c => {
        if (!existing.some(x => x.name === c.name || (x.phone1 && x.phone1 === c.phone1))) {
          existing.push(c);
          newCount++;
        }
      });

      localStorage.setItem('aqua_blue_customers', JSON.stringify(existing));
      setCustomers(existing);
      setImportStatus({
        type: 'success',
        message: `تم جلب ${imported.length} عميل من شيت إكسل SheetDB بنجاح! (تمت إضافة ${newCount} عميل جديد).`
      });
    } catch (e: any) {
      setImportStatus({ type: 'error', message: 'خطأ: ' + e.message });
    } finally {
      setIsLoadingSheetDB(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-blue-900/40 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-700 via-indigo-700 to-cyan-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ArrowRightLeft size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black">نقل ومزامنة البيانات</h2>
              <p className="text-xs text-blue-100 opacity-90">نقل عملائك وبياناتك الحقيقية إلى رابط Vercel بنقرة واحدة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 dark:border-blue-900/40 p-2 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => { setActiveTab('export'); setImportStatus({ type: '', message: '' }); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'export' ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Copy size={14} />
            <span>1. نسخ وتصدير من هنا</span>
          </button>
          <button
            onClick={() => { setActiveTab('import'); setImportStatus({ type: '', message: '' }); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'import' ? 'bg-white dark:bg-[#0f172a] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Upload size={14} />
            <span>2. لصق واستيراد في Vercel</span>
          </button>
          <button
            onClick={() => { setActiveTab('sheetdb'); setImportStatus({ type: '', message: '' }); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${activeTab === 'sheetdb' ? 'bg-white dark:bg-[#0f172a] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Database size={14} />
            <span>سحب من SheetDB</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-right">
          
          {importStatus.message && (
            <div className={`p-4 rounded-2xl text-xs font-bold leading-relaxed border ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/40'}`}>
              {importStatus.message}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl space-y-1">
                <h4 className="font-black text-xs text-blue-900 dark:text-blue-200">البيانات المتوفرة في جهازك حالياً:</h4>
                <div className="flex gap-4 text-xs text-blue-700 dark:text-blue-300 font-bold pt-1">
                  <span>👥 {customers.length} عميل</span>
                  <span>📦 {inventory.length} صنف بالمخزن</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                اضغط على زر <strong>نسخ كود نقل البيانات</strong>، ثم افتح موقعك على <strong>Vercel</strong> واضغط على زر <strong>استيراد</strong> والصق الكود لتظهر جميع بياناتك وعملاؤك في Vercel فوراً!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCopyCode}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-3.5 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95"
                >
                  {copied ? <Check size={18} className="text-emerald-300" /> : <Copy size={18} />}
                  <span>{copied ? 'تم نسخ كود بياناتك بنجاح! 📋' : 'نسخ كود نقل البيانات (بنقرة واحدة)'}</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95"
                >
                  <Download size={18} />
                  <span>تحميل ملف النسخ الاحتياطي (JSON)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                إذا قمت بنسخ الكود من شاشة المعاينة هنا، الصقه في المربع أدناه واضغط على <strong>استيراد وتطبيق البيانات</strong> لنقلها فوراً إلى هذا الرابط:
              </p>

              <div>
                <textarea
                  rows={4}
                  value={pasteCode}
                  onChange={(e) => setPasteCode(e.target.value)}
                  placeholder="الصق كود البيانات هنا..."
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-blue-900/50 rounded-2xl text-xs font-mono outline-none focus:border-blue-500 text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApplyPasteCode}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 px-4 rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>⚡ استيراد وتطبيق البيانات فوراً</span>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-blue-900/30 pt-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">أو رفع ملف JSON تم تنزيله سابقاً:</p>
                <label className="w-full border-2 border-dashed border-slate-300 dark:border-blue-900/50 hover:border-blue-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-900/30">
                  <Upload size={24} className="text-slate-400 mb-1" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">اختر ملف AquaBlue_Backup.json</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'sheetdb' && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 p-4 rounded-2xl">
                <h4 className="font-black text-xs text-purple-900 dark:text-purple-200 mb-1">الربط مع Google Sheets / SheetDB</h4>
                <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                  يمكنك استرداد العملاء المسجلين في جدول الإكسل المربوط بحسابك تلقائياً:
                </p>
                <code className="block mt-2 text-[10px] bg-white dark:bg-purple-900/40 p-2 rounded-xl text-purple-700 dark:text-purple-300 font-mono" dir="ltr">
                  {SHEETDB_URL}
                </code>
              </div>

              <button
                onClick={handlePullFromSheetDB}
                disabled={isLoadingSheetDB}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black py-4 px-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoadingSheetDB ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Database size={18} />
                )}
                <span>{isLoadingSheetDB ? 'جاري جلب البيانات من شيت إكسل...' : 'سحب واستيراد بيانات العملاء من SheetDB الآن'}</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-blue-900/30 text-center">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition px-6 py-2"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
