import React, { useState } from 'react';
import { X, Search, UserCheck, UserPlus, HelpCircle, Save, CheckSquare, Plus, Check } from 'lucide-react';
import { Customer, Stage, Visit } from '../types';
import { getStagesBreakdown, deviceOptions, isStage4 } from '../utils';

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  inventory: any[];
  onSaveExistingCustomerAppointment: (customerId: string | number, visitData: Omit<Visit, 'id'>) => void;
  onSaveNewCustomer: (newCustomer: Omit<Customer, 'id'>, initialVisit: Omit<Visit, 'id'>) => void;
  onSaveExternalVisit: (externalInfo: any, continueWithUs: boolean) => void;
}

export function MaintenanceFormModal({
  isOpen,
  onClose,
  customers,
  inventory,
  onSaveExistingCustomerAppointment,
  onSaveNewCustomer,
  onSaveExternalVisit
}: MaintenanceFormModalProps) {
  const [flowType, setFlowType] = useState<'selection' | 'old' | 'new' | 'external' | 'external_decision' | 'convert_new'>('selection');

  // Search state for Old Customer
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOldCustomer, setSelectedOldCustomer] = useState<Customer | null>(null);

  // Common dynamic form states for appointment / visit
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [spareParts, setSpareParts] = useState('');
  const [usedParts, setUsedParts] = useState<string[]>([]);
  const [cost, setCost] = useState('');
  const [tds, setTds] = useState('');

  // New Customer states
  const [newName, setNewName] = useState('');
  const [newPhone1, setNewPhone1] = useState('');
  const [newPhone2, setNewPhone2] = useState('');
  const [newPhone3, setNewPhone3] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newAddressDetail, setNewAddressDetail] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('7 مراحل R.O');

  // External Customer states
  const [extName, setExtName] = useState('');
  const [extPhone, setExtPhone] = useState('');
  const [extRegion, setExtRegion] = useState('');
  const [extAddress, setExtAddress] = useState('');
  const [extPurpose, setExtPurpose] = useState('');
  const [extDoneResult, setExtDoneResult] = useState('');

  if (!isOpen) return null;

  // Filter customers based on search
  const filteredSearchCustomers = searchQuery.trim() === ''
    ? []
    : customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone1.includes(searchQuery) ||
        c.phone2?.includes(searchQuery) ||
        c.phone3?.includes(searchQuery)
      );

  // Reset form states
  const resetAll = () => {
    setFlowType('selection');
    setSearchQuery('');
    setSelectedOldCustomer(null);
    setVisitDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSelectedStages([]);
    setSpareParts('');
    setUsedParts([]);
    setCost('');
    setTds('');
    setNewName('');
    setNewPhone1('');
    setNewPhone2('');
    setNewPhone3('');
    setNewRegion('');
    setNewAddressDetail('');
    setNewDeviceType('7 مراحل R.O');
    setExtName('');
    setExtPhone('');
    setExtRegion('');
    setExtAddress('');
    setExtPurpose('');
    setExtDoneResult('');
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const toggleStageSelection = (stage: string) => {
    if (selectedStages.includes(stage)) {
      setSelectedStages(selectedStages.filter(s => s !== stage));
    } else {
      setSelectedStages([...selectedStages, stage]);
    }
  };

  const togglePartSelection = (partName: string) => {
    if (usedParts.includes(partName)) {
      setUsedParts(usedParts.filter(p => p !== partName));
    } else {
      setUsedParts([...usedParts, partName]);
    }
  };

  // Submission for OLD Customer Appointment
  const submitOldCustomerAppointment = () => {
    if (!selectedOldCustomer) {
      alert('الرجاء اختيار العميل أولاً');
      return;
    }
    const data: Omit<Visit, 'id'> = {
      customerId: selectedOldCustomer.id,
      date: visitDate,
      changedStages: selectedStages,
      spareParts: spareParts,
      usedParts: usedParts,
      cost: cost,
      notes: notes,
      tds: tds
    };
    onSaveExistingCustomerAppointment(selectedOldCustomer.id, data);
    alert('تمت إضافة موعد صيانة العميل وتحديث كارت المتابعة الخاص به بنجاح!');
    handleClose();
  };

  // Submission for NEW Customer
  const submitNewCustomer = () => {
    if (!newName.trim() || !newPhone1.trim() || !newRegion.trim()) {
      alert('الرجاء إكمال البيانات الأساسية المطلوبة: الاسم، رقم الهاتف، والمنطقة');
      return;
    }
    
    // Create initial customer representation
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const customerPayload: Omit<Customer, 'id'> = {
      name: newName,
      phone1: newPhone1,
      phone2: newPhone2,
      phone3: newPhone3,
      region: newRegion,
      addressDetail: newAddressDetail,
      deviceType: newDeviceType,
      clientCode: generatedCode,
      lastService: visitDate,
      nextService: '', // Will be computed in App.tsx
      image: '',
      stages: [], // Will be computed in App.tsx using getStagesBreakdown
      visitHistory: [],
      status: 'active'
    };

    const visitPayload: Omit<Visit, 'id'> = {
      customerId: 0, // Placeholder
      date: visitDate,
      changedStages: selectedStages,
      spareParts: spareParts,
      usedParts: usedParts,
      cost: cost,
      notes: notes || 'زيارة أولى وتركيب فلتر جديد',
      tds: tds
    };

    onSaveNewCustomer(customerPayload, visitPayload);
    alert('تمت إضافة العميل الجديد وسجل الزيارة بنجاح إلى قاعدة بيانات العملاء!');
    handleClose();
  };

  // Submission for EXTERNAL Customer
  const submitExternalVisit = () => {
    if (!extName.trim() || !extPhone.trim()) {
      alert('الرجاء إدخال اسم العميل الخارجي ورقم هاتفه');
      return;
    }
    // Advance to next step for decision: Does he continue with us?
    setFlowType('external_decision');
  };

  const finalizeExternalDecision = (continueWithUs: boolean) => {
    const externalInfo = {
      name: extName,
      phone: extPhone,
      region: extRegion,
      address: extAddress,
      purpose: extPurpose,
      doneResult: extDoneResult,
      date: visitDate,
      cost: cost,
      usedParts: usedParts,
      changedStages: selectedStages,
      deviceType: newDeviceType,
    };

    if (continueWithUs) {
      // Transition to Convert New Customer panel, pre-filling details
      setNewName(extName);
      setNewPhone1(extPhone);
      setNewRegion(extRegion);
      setNewAddressDetail(extAddress);
      setNotes(extPurpose + ' | تم التحويل من عميل خارجي: ' + extDoneResult);
      setFlowType('convert_new');
    } else {
      // Done - save external visit
      onSaveExternalVisit(externalInfo, false);
      alert('تم حفظ تقرير الزيارة للعميل الخارجي بنجاح!');
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 border border-slate-150 text-right" dir="rtl">
        {/* Modal Sticky Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-md p-5 border-b border-slate-100 dark:border-blue-900/40 flex justify-between items-center z-10">
          <h2 className="text-lg font-black text-slate-850">
            {flowType === 'selection' && 'إضافة موعد صيانة جديد'}
            {flowType === 'old' && 'جدولة موعد - عميل قديم'}
            {flowType === 'new' && 'خدمة عميل جديد بالكامل'}
            {flowType === 'external' && 'تقرير زيارة - عميل خارجي'}
            {flowType === 'external_decision' && 'الموقف النهائي للعميل'}
            {flowType === 'convert_new' && 'استكمال وترقية العميل الخارجي'}
          </h2>
          <button 
            onClick={handleClose} 
            className="bg-slate-100 dark:bg-[#0f172a] p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-250 transition"
          >
            <X size={18}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* STEP 0: Selection Menu */}
          {flowType === 'selection' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-4000 font-medium">
                يرجى تحديد درجة تصنيف العميل لفتح المعالج المناسب لإجراء الصيانة:
              </p>
              
              <div className="grid grid-cols-1 gap-3.5">
                <button
                  onClick={() => setFlowType('old')}
                  className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-blue-955 transition text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center font-bold">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-blue-900 dark:text-blue-100">عميل قديم</h4>
                      <p className="text-[10px] text-slate-505 mt-0.5">مسجل بالفعل في كارت المتابعة والبرنامج</p>
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-[-4px] transition-transform">&larr;</span>
                </button>

                <button
                  onClick={() => setFlowType('new')}
                  className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-955 transition text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold">
                      <UserPlus size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-emerald-900 dark:text-emerald-100">عميل جديد</h4>
                      <p className="text-[10px] text-slate-505 mt-0.5">يريد تركيب جهاز جديد وضمه لشبكة العملاء</p>
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-[-4px] transition-transform">&larr;</span>
                </button>

                <button
                  onClick={() => setFlowType('external')}
                  className="flex items-center justify-between p-4 bg-white dark:bg-[#0f172a] border border-slate-200/50/70 rounded-2xl text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 transition text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-500 text-white rounded-xl flex items-center justify-center font-bold">
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-700 dark:text-slate-200">عميل خارجي</h4>
                      <p className="text-[10px] text-slate-505 mt-0.5">صيانة عاجلة أو زائر استثنائي لمرة واحدة</p>
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-[-4px] transition-transform">&larr;</span>
                </button>
              </div>
            </div>
          )}

          {/* FLOW A: Existing Customer */}
          {flowType === 'old' && (
            <div className="space-y-4">
              {!selectedOldCustomer ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">ابحث عن العميل القديم بالاسم أو الهاتف *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="اكتب اسم العميل أو رقمه..."
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 pr-10 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 dark:text-slate-100"
                    />
                    <Search className="absolute right-3.5 top-3.5 text-slate-400" size={18} />
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredSearchCustomers.map(cust => (
                      <button
                        key={cust.id}
                        onClick={() => setSelectedOldCustomer(cust)}
                        className="w-full text-right p-3 rounded-xl border border-slate-100 dark:border-blue-900/40 hover:bg-blue-50/45/80 transition flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-heavy text-slate-800 dark:text-slate-100 font-bold">{cust.name}</p>
                          <p className="text-[10px] text-slate-700 dark:text-slate-200 font-mono mt-0.5">{cust.phone1} | {cust.region}</p>
                        </div>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black px-2.5 py-1 rounded">اختيار</span>
                      </button>
                    ))}
                    {searchQuery.trim() !== '' && filteredSearchCustomers.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">لم يتم العثور على نتائج للبحث.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-black text-blue-900 dark:text-blue-100 font-bold">العميل المحدد: {selectedOldCustomer.name}</p>
                      <p className="text-slate-600 dark:text-slate-200 font-medium mt-1">نوع الجهاز: {selectedOldCustomer.deviceType} | {selectedOldCustomer.region}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedOldCustomer(null)}
                      className="text-red-600 dark:text-red-400 hover:underline font-bold"
                    >
                      تغيير
                    </button>
                  </div>

                  {/* Appointment parameters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">تاريخ الصيانة *</label>
                      <input 
                        type="date" 
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">نسبة الأملاح TDS</label>
                      <input 
                        type="number" 
                        value={tds}
                        onChange={(e) => setTds(e.target.value)}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100" 
                        placeholder="أدخل TDS"
                      />
                      {Number(tds) > 100 && (
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 animate-pulse">
                          <span>⚠️</span> أملاح مرتفعة ({tds} TDS) - الشمعة الرابعة منتهية الصلاحية
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">الملاحظات وغرض الزيارة</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="تغيير الشمعات الأساسية..."
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-250 p-3 rounded-xl outline-none text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Stage list checkbox based on device type */}
                  <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100/80 space-y-2">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-200 mb-2">الشمعات التي تم استبدالها في الزيارة:</p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                      {getStagesBreakdown(selectedOldCustomer.deviceType).map((stg, stgIdx) => {
                        const isFourth = isStage4(stg.label, stgIdx);
                        const isHighTdsWarn = isFourth && Number(tds) > 100;
                        const isSelected = selectedStages.includes(stg.label);
                        return (
                          <button
                            key={stg.label}
                            onClick={() => toggleStageSelection(stg.label)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold text-right transition ${ 
                              isSelected 
                                ? 'bg-blue-100 border-blue-200 dark:border-blue-800/50 text-blue-700' 
                                : isHighTdsWarn
                                  ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300 animate-pulse'
                                  : 'bg-white border-slate-200 dark:border-blue-900/50 text-slate-600' 
                            } dark:bg-[#0f172a]`}
                          >
                            <CheckSquare size={14} className={isSelected ? "text-blue-500" : isHighTdsWarn ? "text-red-500" : "text-slate-300"} />
                            <span className="flex-1">{stg.label}</span>
                            {isHighTdsWarn && !isSelected && (
                              <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full mr-1 font-bold">منتهية (TDS)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Warehouse spare parts selection */}
                  <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100/80 space-y-2">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-200 mb-1">قطع غيار من المخزن (سيتم خصمها آلياً):</p>
                    {inventory.filter(item => item.category === 'part' || item.category === 'device').length === 0 ? (
                      <p className="text-[11px] text-slate-400">لا توجد قطع غيار مسجلة بالمخزن حالياً</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {inventory.filter(item => item.category === 'part' || item.category === 'device').map((item) => {
                          const isSelected = usedParts.includes(item.name);
                          const isOutOfStock = item.quantity <= 0;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={isOutOfStock && !isSelected}
                              onClick={() => togglePartSelection(item.name)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${ isSelected ? 'bg-blue-600 border-blue-600 text-white' : isOutOfStock ? 'bg-slate-100 border-slate-200 dark:border-blue-900/50 text-slate-400 cursor-not-allowed opacity-500' : 'bg-white text-slate-700 dark:text-slate-200 hover:border-slate-300' } dark:bg-[#0f172a]`}
                            >
                              {isSelected && <Check size={12} />}
                              <span>{item.name}</span>
                              <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                ({item.quantity})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">الأجزاء المضافة (مثل ماتور)</label>
                      <input 
                        type="text" 
                        value={spareParts}
                        onChange={(e) => setSpareParts(e.target.value)}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl outline-none text-xs text-slate-800 dark:text-slate-100" 
                        placeholder="خلية، فلتر..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">التكلفة المالية (ج.م)</label>
                      <input 
                        type="number" 
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100" 
                        placeholder="350"
                      />
                    </div>
                  </div>

                  <button
                    onClick={submitOldCustomerAppointment}
                    className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-black p-3.5 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-xs"
                  >
                    إنهاء وحفظ الزيارة بكارت العميل 📂
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FLOW B: New Customer */}
          {flowType === 'new' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 text-xs text-emerald-805 leading-relaxed">
                سيقوم هذا المعالج بإضافة بطاقة كارت عميل جديد، وجدولة شمعاته آلياً مع تدوين أول صيانة/تركيب له.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="أدخل اسم العميل ثلاثي..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none focus:border-green-500 font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم الهاتف الأساسي *</label>
                  <input
                    type="tel"
                    value={newPhone1}
                    onChange={(e) => setNewPhone1(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs text-center font-mono outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم الهاتف البديل 2</label>
                  <input
                    type="tel"
                    value={newPhone2}
                    onChange={(e) => setNewPhone2(e.target.value)}
                    placeholder="(اختياري)"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs text-center font-mono outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">المنطقة / المحافظة *</label>
                  <input
                    type="text"
                    list="regions-list"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    placeholder="مثال: مدينة نصر"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">نوع جهاز الفلتر *</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none font-bold text-slate-800 dark:text-slate-100"
                  >
                    {deviceOptions.map(option => (
                      <option key={option} value={option} className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100">{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={newAddressDetail}
                  onChange={(e) => setNewAddressDetail(e.target.value)}
                  placeholder="رقم الشقة، العمارة، الشارع..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Maintenance Done parameters */}
              <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100/80 space-y-3.5">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-200">تفاصيل الزيارة الحالية / التركيب:</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">تاريخ التركيب/الصيانة</label>
                    <input 
                      type="date" 
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2.5 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">الأملاح TDS</label>
                    <input 
                      type="number" 
                      value={tds}
                      onChange={(e) => setTds(e.target.value)}
                      placeholder="TDS"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2.5 rounded-lg text-xs text-slate-800 dark:text-slate-100" 
                    />
                    {Number(tds) > 100 && (
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 animate-pulse">
                        <span>⚠️</span> أملاح مرتفعة ({tds} TDS) - الشمعة الرابعة منتهية
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">ما تم تغييره للعميل</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                    {getStagesBreakdown(newDeviceType).map((stg, stgIdx) => {
                      const isFourth = isStage4(stg.label, stgIdx);
                      const isHighTdsWarn = isFourth && Number(tds) > 100;
                      const isSelected = selectedStages.includes(stg.label);
                      return (
                        <button
                          key={stg.label}
                          type="button"
                          onClick={() => toggleStageSelection(stg.label)}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] font-medium transition text-right ${ 
                            isSelected 
                              ? 'bg-emerald-100 border-emerald-200 dark:border-emerald-800/50 text-emerald-800' 
                              : isHighTdsWarn
                                ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300 font-bold animate-pulse'
                                : 'bg-white border-slate-200 dark:border-blue-900/50 text-slate-600' 
                          } dark:bg-[#0f172a]`}
                        >
                          <CheckSquare size={12} className={isSelected ? "text-emerald-500" : isHighTdsWarn ? "text-red-500" : "text-slate-300"} />
                          <span className="flex-1">{stg.label}</span>
                          {isHighTdsWarn && !isSelected && (
                            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full mr-1 font-bold">منتهية (TDS)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Warehouse spare parts selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">قطع غيار من المخزن (سيتم خصمها آلياً):</label>
                  {inventory.filter(item => item.category === 'part' || item.category === 'device').length === 0 ? (
                    <p className="text-[11px] text-slate-400">لا توجد قطع غيار مسجلة بالمخزن حالياً</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto mt-1">
                      {inventory.filter(item => item.category === 'part' || item.category === 'device').map((item) => {
                        const isSelected = usedParts.includes(item.name);
                        const isOutOfStock = item.quantity <= 0;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={isOutOfStock && !isSelected}
                            onClick={() => togglePartSelection(item.name)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition ${ isSelected ? 'bg-blue-600 border-blue-600 text-white' : isOutOfStock ? 'bg-slate-100 border-slate-200 dark:border-blue-900/50 text-slate-350 cursor-not-allowed opacity-50' : 'bg-white text-slate-700 dark:text-slate-200 hover:border-slate-300' } dark:bg-[#0f172a]`}
                          >
                            {isSelected && <Check size={11} />}
                            <span>{item.name}</span>
                            <span className={`text-[9px] font-mono ${isSelected ? 'text-blue-105' : 'text-slate-400'}`}>
                              ({item.quantity})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">قطع الغيار الإضافية</label>
                    <input 
                      type="text" 
                      value={spareParts}
                      onChange={(e) => setSpareParts(e.target.value)}
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2 rounded-lg text-xs text-slate-800 dark:text-slate-100" 
                      placeholder="خزان، حنفية..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">إجمالي الحساب (ج.م)</label>
                    <input 
                      type="number" 
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-2 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100" 
                      placeholder="تكلفة التركيب"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={submitNewCustomer}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-xs"
              >
                حفظ بيانات العميل وجدولة مواعيده 💾
              </button>
            </div>
          )}

          {/* FLOW C: External Customer */}
          {flowType === 'external' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#020617] p-3 rounded-2xl border border-slate-200/60 text-xs text-slate-550 leading-relaxed">
                يستخدم هذا القسم لتسجيل زيارة عاجلة لعميل غير مسجل (خارجي) دون الحاجة لجدولته بصفة مستديمة الآن.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">اسم العميل الخارجي *</label>
                <input
                  type="text"
                  value={extName}
                  onChange={(e) => setExtName(e.target.value)}
                  placeholder="أدخل اسم العميل..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم الهاتف *</label>
                  <input
                    type="tel"
                    value={extPhone}
                    onChange={(e) => setExtPhone(e.target.value)}
                    placeholder="رقم الهاتف"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs text-center font-mono outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">المنطقة ورقم هاف 2</label>
                  <input
                    type="text"
                    list="regions-list"
                    value={extRegion}
                    onChange={(e) => setExtRegion(e.target.value)}
                    placeholder="مثال: شبرا الخيمة"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={extAddress}
                  onChange={(e) => setExtAddress(e.target.value)}
                  placeholder="العنوان ومكان الزيارة..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">الهدف / الغرض من الزيارة</label>
                <input
                  type="text"
                  value={extPurpose}
                  onChange={(e) => setExtPurpose(e.target.value)}
                  placeholder="مثال: فحص تسريب وتغيير خزان..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">نوع جهاز الفلتر المعتمد للعميل الخارجي *</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none font-bold text-slate-800 dark:text-slate-100"
                >
                  {deviceOptions.map(option => (
                    <option key={option} value={option} className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100">{option}</option>
                  ))}
                </select>
              </div>

              {/* Stage list checkbox based on device type */}
              <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100/80 space-y-2">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-200 mb-2">الشمعات والمراحل التي تم تغييرها بالزيارة:</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {(() => {
                    const baseStages = getStagesBreakdown(newDeviceType);
                    const isCompact = newDeviceType.includes('كومباكت');
                    const extra = isCompact
                      ? [
                          { label: 'شمعة 1', months: 3 },
                          { label: 'شمعة 2', months: 3 },
                          { label: 'شمعة 3', months: 3 }
                        ]
                      : [
                          { label: 'شمعة 1 كومباكت', months: 3 },
                          { label: 'شمعة 2 كومباكت', months: 3 },
                          { label: 'شمعة 3 كومباكت', months: 3 }
                        ];
                    const allStages = [...baseStages];
                    extra.forEach(ex => {
                      if (!allStages.some(s => s.label === ex.label)) {
                        allStages.push(ex);
                      }
                    });
                    return allStages.map((stg) => (
                      <button
                        key={stg.label}
                        type="button"
                        onClick={() => toggleStageSelection(stg.label)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold text-right transition ${ selectedStages.includes(stg.label) ? 'bg-blue-100 border-blue-200 dark:border-blue-800/50 text-blue-700' : 'bg-white border-slate-200 dark:border-blue-900/50 text-slate-600' } dark:bg-[#0f172a]`}
                      >
                        <CheckSquare size={14} className={selectedStages.includes(stg.label) ? "text-blue-500" : "text-slate-300"} />
                        <span>{stg.label}</span>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">ما تم عمله / ملاحظات أخرى بالزيارة</label>
                <textarea
                  value={extDoneResult}
                  onChange={(e) => setExtDoneResult(e.target.value)}
                  rows={2}
                  placeholder="تم إصلاح المشترك وضبط ضغط الهواء بالخزان..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-210 p-3 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Warehouse spare parts selection */}
              <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100/80 space-y-2">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-200">قطع غيار من المخزن (سيتم خصمها آلياً):</p>
                {inventory.filter(item => item.category === 'part' || item.category === 'device').length === 0 ? (
                  <p className="text-[11px] text-slate-400">لا توجد قطع غيار مسجلة بالمخزن حالياً</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {inventory.filter(item => item.category === 'part' || item.category === 'device').map((item) => {
                      const isSelected = usedParts.includes(item.name);
                      const isOutOfStock = item.quantity <= 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isOutOfStock && !isSelected}
                          onClick={() => togglePartSelection(item.name)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition ${ isSelected ? 'bg-blue-600 border-blue-600 text-white' : isOutOfStock ? 'bg-slate-100 border-slate-200 dark:border-blue-900/50 text-slate-350 cursor-not-allowed opacity-50' : 'bg-white text-slate-700 dark:text-slate-200 hover:border-slate-300' } dark:bg-[#0f172a]`}
                        >
                          {isSelected && <Check size={11} />}
                          <span>{item.name}</span>
                          <span className={`text-[9px] font-mono ${isSelected ? 'text-blue-105' : 'text-slate-400'}`}>
                            ({item.quantity})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">تاريخ الزيارة</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">المبلغ المحصل (ج.م)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="150"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                onClick={submitExternalVisit}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white font-black p-3.5 rounded-xl shadow-lg transition text-xs"
              >
                حفظ الزيارة الخارجية وتحديد الموقف &larr;
              </button>
            </div>
          )}

          {/* FLOW C-2: Decision Prompt */}
          {flowType === 'external_decision' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full mx-auto flex items-center justify-center border border-blue-100 dark:border-blue-800/30">
                <HelpCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-slate-805 text-base">الموقف الفني للعميل الخارجي</h3>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed px-2">
                  لقد أتممت تقرير الصيانة لـ <strong>{extName}</strong>.
                  هل سيستمر هذا العميل معنا مستقبلاً ونقوم بإنشاء كارت متابعة مجدول له بالبرنامج؟
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => finalizeExternalDecision(true)}
                  className="bg-emerald-600 hover:bg-emerald-750 text-white font-heavy p-4 rounded-2xl text-xs transition shadow-md flex flex-col items-center justify-center gap-1.5"
                >
                  <Check size={18} />
                  <strong>نعم، سيستمر معنا</strong>
                  <span className="text-[9px] opacity-80">(فتح كارت عميل دائم)</span>
                </button>

                <button
                  onClick={() => finalizeExternalDecision(false)}
                  className="bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-slate-705 text-slate-750 font-heavy p-4 rounded-2xl text-xs transition border border-slate-200 dark:border-blue-900/50 flex flex-col items-center justify-center gap-1.5"
                >
                  <X size={18} />
                  <strong>لا، لن يستمر</strong>
                  <span className="text-[9px] opacity-80">(حفظ كتقرير مؤقت فقط)</span>
                </button>
              </div>
            </div>
          )}

          {/* FLOW C-3: Conversion to Permanent Customer */}
          {flowType === 'convert_new' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100/80 text-xs text-slate-655 leading-relaxed">
                يرجى استكمال البيانات الفنية المتبقية لترقية العميل الخارجي <strong>{newName}</strong> وتحويله إلى عميل دائم مجدول:
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">نوع جهاز الفلتر المعتمد للعميل *</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs outline-none font-bold text-slate-800 dark:text-slate-100"
                >
                  {deviceOptions.map(option => (
                    <option key={option} value={option} className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100">{option}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">المحافظة / المنطقة</label>
                  <input
                    type="text"
                    list="regions-list"
                    value={newName === extName ? extRegion : newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">رقم الهاتف الأساسي</label>
                  <input
                    type="tel"
                    value={newName === extName ? extPhone : newPhone1}
                    onChange={(e) => setNewPhone1(e.target.value)}
                    className="w-full text-center bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">العنوان بالتفصيل</label>
                <input
                  type="text"
                  value={newAddressDetail}
                  onChange={(e) => setNewAddressDetail(e.target.value)}
                  placeholder="استكمل تفاصيل عمارة، شقة..."
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-205 p-3 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="bg-slate-50 dark:bg-[#020617] p-3 rounded-xl text-xs border border-dashed border-slate-200 dark:border-blue-900/50 space-y-1">
                <p className="font-bold">سيتم تسجيل الزيارة السابقة:</p>
                <p>&bull; الغرض: {extPurpose || 'صيانة أولى'}</p>
                <p>&bull; ما تم عمله: {extDoneResult || 'تم الفحص والصيانة'}</p>
                {selectedStages.length > 0 && (
                  <p>&bull; الشمعات المستبدلة: {selectedStages.join(' ، ')}</p>
                )}
                <p>&bull; تكلفة الزيارة: {cost || '0'} ج.م</p>
              </div>

              <button
                onClick={submitNewCustomer}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black p-3.5 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-xs"
              >
                توليد كارت المتابعة والجدولة المستمرة 🔮
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
