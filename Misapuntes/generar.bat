@echo off
setlocal enabledelayedexpansion
set "jsonFile=carpetas.json"

echo { > "%jsonFile%"
echo   "partidas": [ >> "%jsonFile%"

set "first=1"

:: Recorremos las carpetas principales
for /d %%D in (*) do (
    set "subfolder="
    set "movimientos=0"
    
    :: Entramos en la carpeta para buscar la subcarpeta de la jugada
    for /d %%S in ("%%~D\*") do (
        set "subfolder=%%~nS"
        set "count=0"
        :: Contamos los movimientos dentro de la subcarpeta
        for %%F in ("%%~D\!subfolder!\movimiento_*.png") do (
            set /a count+=1
        )
        set "movimientos=!count!"
    )

    :: Manejo de la coma para que el JSON no se rompa
    if !first! equ 0 (
        echo ,>> "%jsonFile%"
    )
    
    :: Escribimos la línea del objeto JSON con comillas seguras
    <nul set /p ="    {"nombre": "%%~nD", "sub": "!subfolder!", "totalMovs": !movimientos!}" >> "%jsonFile%"
    set "first=0"
)

:: Terminamos el JSON correctamente
echo. >> "%jsonFile%"
echo   ] >> "%jsonFile%"
echo } >> "%jsonFile%"

echo.
echo Proceso terminado. JSON actualizado con exito.
pause