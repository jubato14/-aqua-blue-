import React, { useState } from 'react';
import { LogOut, Droplet, User, Phone, MapPin, CheckCircle, Calendar, RefreshCw, Smartphone, Clock } from 'lucide-react';
import { Customer } from '../types';
import { supabase } from '../supabase';
import { isStage4, getCustomerLatestTds } from '../utils';

interface ClientPortalProps {
  userProfile: any;
  supabaseUser: any;
  customers: Customer[];
  onSwitchToAdmin?: () => void;
  onOpenTransferModal?: () => void;
}

export function ClientPortal({ userProfile, supabaseUser, customers, onSwitchToAdmin, onOpenTransferModal }: ClientPortalProps) {
  const [codeInput, setCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchToAdmin = async () => {
    try {
      await supabase.from('users').update({ role: 'owner', status: 'approved' }).eq('id', supabaseUser.id);
    } catch (e) {
      console.error(e);
    }
    if (onSwitchToAdmin) {
      onSwitchToAdmin();
    }
  };

  // Find linked customer from live list
  const linkedCustomer = userProfile.linkedCustomerId
    ? customers.find(c => c.id.toString() === userProfile.linkedCustomerId.toString())
    : null;

  // Search and link customer code
  const handleLinkCard = async () => {
    setErrorMsg('');
    if (!codeInput.trim()) {
      setErrorMsg('الرجاء إدخال كود العميل أولاً');
      return;
    }

    setIsLoading(true);
    // Standardize search query (remove spaces)
    const searchVal = codeInput.trim();
    const getCustomerCode = (c: Customer) => {
      if (c.clientCode) return c.clientCode;
      return ((Number(c.id) % 900000) + 100000).toString();
    };
    const matched = customers.find(c => getCustomerCode(c) === searchVal);

    if (matched) {
      try {
        await supabase.from('users').update({
          linkedCustomerId: matched.id.toString(),
          linkedCustomerPhone: matched.phone1 // keep for legacy backwards compatibility
        }).eq('id', supabaseUser.id);
        setCodeInput('');
      } catch (err: any) {
        console.error(err);
        setErrorMsg('حدث خطأ أثناء الاتصال بقاعدة البيانات لربط الكارت.');
      }
    } else {
      setErrorMsg('عذراً، الكود غير صحيح أو غير مسجل. يرجى مراجعة الشركة للحصول على كود العميل الخاص بك.');
    }
    setIsLoading(false);
  };

  // Disconnect/unlink card
  const handleUnlink = async () => {
    if (confirm('هل ترغب حقاً في فك ترابط كارت المتابعة هذا؟')) {
      try {
         await supabase.from('users').update({
          linkedCustomerId: null,
          linkedCustomerPhone: null
        }).eq('id', supabaseUser.id);
      } catch (err) {
        console.error(err);
        alert('فشل فك الترابط');
      }
    }
  };

  const handleSignOut = async () => {
    if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
       await supabase.auth.signOut();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-12 font-sans text-right text-slate-900 dark:text-slate-50" dir="rtl">
      {/* Header banner */}
      <header className="bg-gradient-to-l from-[#1E3A8A] to-[#0891B2] dark:from-slate-900 dark:to-slate-800 p-6 shadow-lg rounded-b-[2rem] mb-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white dark:bg-[#0f172a] rounded-xl flex items-center justify-center">
              <Droplet size={26} className="text-[#0EA5E9]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">بوابة العميل</h1>
              <p className="text-cyan-100 text-xs opacity-80">كارت المتابعة الذكي وفترات الصيانة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenTransferModal && (
              <button
                onClick={onOpenTransferModal}
                className="px-2.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs flex items-center gap-1 transition"
                title="نقل واستيراد البيانات"
              >
                <span>📲</span>
                <span className="hidden sm:inline">نقل البيانات</span>
              </button>
            )}
            <button
              onClick={handleSwitchToAdmin}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-900 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
            >
              <span>👑 لوحة تحكم المدير</span>
            </button>
            <button 
              onClick={handleSignOut}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition dark:bg-[#0f172a]"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-2">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">مرحباً بك، {userProfile.displayName}!</h2>
          <p className="text-xs text-slate-500">
            أنت مسجل حالياً بصفتك <strong className="text-blue-600 dark:text-blue-400 font-bold">عميل</strong> (بوابة متابعة كارت الفلتر الشخصي).
          </p>
        </div>

        {/* Switch to Admin Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-5 rounded-3xl shadow-lg border border-blue-400/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-1.5">
              <span>👑</span> هل أنت المدير أو صاحب النظام؟
            </h3>
            <p className="text-xs text-blue-100/90 mt-1">
              اضغط هنا لفتح لوحة تحكم الإدارة الكاملة، عرض كافة العملاء، المخزن، والمواعيد.
            </p>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            className="w-full sm:w-auto bg-white hover:bg-blue-50 text-blue-900 font-black px-5 py-3 rounded-2xl text-xs shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap text-center"
          >
            الانتقال للوحة تحكم المدير ⚡
          </button>
        </div>

        {/* Link Customer Card if not linked */}
        {!linkedCustomer ? (
          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-blue-900/40 pb-3">
              <Smartphone className="text-blue-500 dark:text-blue-400" size={20} />
              <h3 className="font-black text-slate-800 dark:text-slate-100">ربط كارت المتابعة الخاص بك</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
              يرجى إدخال الكود السري الخاص بك لعرض كارت المتابعة وتفاصيل الشمعات:
            </p>
            
            <div className="space-y-3">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="أدخل كود العميل (مثال: 458129)"
                className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-900/50 p-3 rounded-xl outline-none text-center font-mono focus:border-blue-500 font-bold"
              />
              {errorMsg && (
                <p className="text-xs text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-800/30">
                  {errorMsg}
                </p>
              )}
              <button
                onClick={handleLinkCard}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-heavy p-3 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-sm font-black"
              >
                {isLoading ? 'جاري البحث...' : 'بحث وربط كارت الفلتر 🔗'}
              </button>
            </div>
          </div>
        ) : (
          /* Show active linked customer details */
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0f172a] p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{linkedCustomer.name}</h3>
                  <p className="text-xs text-[#0EA5E9] font-bold mt-1">{linkedCustomer.deviceType}</p>
                </div>
                <button
                  onClick={handleUnlink}
                  className="text-[10px] text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-800/30 transition hover:bg-red-100"
                >
                  فك ترابط الكارت
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-50/60 pt-3">
                <div className="flex items-center gap-1.5 text-slate-550">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="font-mono">{linkedCustomer.phone1}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-550">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span>{linkedCustomer.region}</span>
                </div>
              </div>

              {linkedCustomer.addressDetail && (
                <p className="text-slate-500 dark:text-slate-300 text-xs py-1.5 px-2 bg-white dark:bg-[#0f172a] rounded-xl leading-relaxed">
                  <strong>العنوان:</strong> {linkedCustomer.addressDetail}
                </p>
              )}
            </div>

            {/* Filter stages details */}
            <div className="bg-white dark:bg-[#0f172a] p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-blue-900/40 space-y-4">
              <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-blue-900/40 pb-3">
                مواعيد استبدال أجزاء الفلتر
              </h4>
              
              <div className="space-y-4">
                {(() => {
                  const latestTds = getCustomerLatestTds(linkedCustomer);
                  const isHighTdsOverall = latestTds !== null && latestTds > 100;
                  return (
                    <>
                      {isHighTdsOverall && (
                        <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-300">
                          <span>⚠️</span>
                          <span>تنبيه هام: نسبة الأملاح المسجلة لجهازك ({latestTds} TDS) أعلى من 100 - الشمعة الرابعة (الممبرين) منتهية الصلاحية وتتطلب التغيير!</span>
                        </div>
                      )}
                      {linkedCustomer.stages?.map((stage, sIdx) => {
                        const isDueByDate = new Date(stage.date) <= new Date();
                        const isHighTdsForStage4 = isStage4(stage.label, sIdx) && isHighTdsOverall;
                        const isStageDue = isDueByDate || isHighTdsForStage4;
                        return (
                          <div 
                            key={sIdx} 
                            className={`p-3.5 rounded-2xl border ${ isStageDue ? 'bg-red-50/70 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 shadow-sm shadow-red-500/5' : 'bg-white border-slate-100/60 dark:border-blue-900/40' } dark:bg-[#0f172a]`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{stage.label}</span>
                                {isHighTdsForStage4 && (
                                  <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                                    <span>⚠️</span> TDS {latestTds}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className={isStageDue ? "text-red-500" : "text-emerald-500"} />
                                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${ isStageDue ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300' : 'bg-emerald-100 text-emerald-600 dark:text-emerald-400' }`}>
                                  {isStageDue ? (isHighTdsForStage4 && !isDueByDate ? 'منتهية (أملاح TDS) 🛑' : 'مستحق التغيير فوراً 🛑') : stage.date}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div className={`h-full ${isStageDue ? 'bg-red-500 w-full' : 'bg-emerald-400 w-2/3'}`}></div>
                            </div>
                            {isHighTdsForStage4 && (
                              <p className="mt-2 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-950/50 p-2 rounded-xl border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                                <span>⚠️</span> نسبة الأملاح الأخير ({latestTds} TDS) أعلى من 100 - الشمعة الرابعة (الممبرين) منتهية الصلاحية ويجب تغييرها.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
