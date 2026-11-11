@echo off
chcp 65001 > nul
cls
echo ========================================================
echo      Aqua Blue Water - سكريبت الرفع المباشر على Vercel
echo ========================================================
echo.
echo [1/3] جاري التحقق من بيئة العمل وبناء التطبيق...
call npm run build
if %errorlevel% neq 0 (
    echo [خطأ] فشلت عملية البناء (Build)، يرجى التأكد من تشغيل npm install أولاً.
    pause
    exit /b %errorlevel%
)
echo.
echo [2/3] تم بناء التطبيق بنجاح!
echo [3/3] جاري الرفع المباشر إلى Vercel (Production)...
call npx --yes vercel --prod
echo.
echo ========================================================
echo   تم الرفع بنجاح! مبروك تم نشر تطبيقك على Vercel
echo ========================================================
pause
