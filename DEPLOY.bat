@echo off
setlocal

:: Git path
set GIT=C:\Users\ertug\Git\cmd\git.exe

echo.
echo ===================================
echo  ARYA SANAT - Guncelleme Scripti
echo ===================================
echo.

:: Commit mesajini al
set /p MSG="Guncelleme mesaji girin (bos birak = 'Site guncellendi'): "
if "%MSG%"=="" set MSG=Site guncellendi

:: Git add + commit + push
echo.
echo [1/3] Degisiklikler ekleniyor...
"%GIT%" -C "%~dp0" add .

echo [2/3] Commit olusturuluyor...
"%GIT%" -C "%~dp0" commit -m "%MSG%"

echo [3/3] GitHub'a yukleniyor (Vercel otomatik deploy baslatir)...
"%GIT%" -C "%~dp0" push origin main

echo.
echo =====================================
echo  TAMAMLANDI!
echo  GitHub: https://github.com/ErtugPektas/arya-sanat-akademisi
echo  Site: https://arya-sanat-akademisi.vercel.app
echo =====================================
echo.
pause
