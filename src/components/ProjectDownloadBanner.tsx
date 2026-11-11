import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Sparkles } from 'lucide-react';

export const ProjectDownloadBanner: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const startDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/aqua-blue-water.zip');
      if (!res.ok) throw new Error('File not found');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'aqua-blue-water.zip';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 500);
      setDownloaded(true);
    } catch (e) {
      console.warn('Fallback direct download triggered', e);
      window.location.href = '/aqua-blue-water.zip';
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    // Attempt automatic download upon page load
    const timer = setTimeout(() => {
      startDownload();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs z-[9999] border-b border-blue-400/40 font-sans" dir="rtl">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">📦</span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-white">تنزيل مشروع Aqua Blue Water لجهازك</span>
            <span className="bg-blue-900/70 border border-blue-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full text-blue-200">
              30 ملفاً فقط - جاهز لـ Vercel
            </span>
          </div>
          <p className="text-[11px] text-blue-100/90 mt-0.5">
            تم ضبط التنزيل تلقائياً، وإذا منعه المتصفح اضغط على الزر لتنزيله فوراً
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={startDownload}
          disabled={downloading}
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center gap-1.5 cursor-pointer text-xs"
        >
          {downloaded ? (
            <>
              <CheckCircle2 size={15} />
              <span>تم التنزيل بنجاح! اضغط للتحميل مجدداً</span>
            </>
          ) : (
            <>
              <Download size={15} className={downloading ? "animate-bounce" : ""} />
              <span>{downloading ? "جارٍ التنزيل الآن..." : "اضغط هنا لتنزيل الملف تلقائياً"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
