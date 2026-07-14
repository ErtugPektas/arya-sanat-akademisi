@echo off
echo.
echo  ============================================
echo    Arya Sanat Akademisi - Vercel Deploy
echo  ============================================
echo.
echo  Degisiklikler yukleniyor, lutfen bekleyin...
echo.
powershell -ExecutionPolicy Bypass -Command "npx vercel --prod --yes"
echo.
echo  ============================================
echo    Tamamlandi! Site guncellendi.
echo  ============================================
echo.
pause
