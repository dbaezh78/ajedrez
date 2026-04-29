@echo off
setlocal enabledelayedexpansion
set "jsonFile=carpetas.json"

echo { > %jsonFile%
echo   "partidas": [ >> %jsonFile%

set "first=1"

for /d %%D in (*) do (
    set "subfolder="
    set "movimientos=0"
    
    for /d %%S in ("%%~nD\*") do (
        set "subfolder=%%~nS"
        set "count=0"
        for %%F in ("%%~nD\!subfolder!\movimiento_*.png") do (
            set /a count+=1
        )
        set "movimientos=!count!"
    )

    if !first! equ 0 ( echo ,>> %jsonFile% )
    
    <nul set /p ="    {"nombre": "%%~nD", "sub": "!subfolder!", "totalMovs": !movimientos!}" >> %jsonFile%
    set "first=0"
)

echo. >> %jsonFile%
echo   ] >> %jsonFile%
echo } >> %jsonFile%

echo Proceso terminado. JSON actualizado.
pause