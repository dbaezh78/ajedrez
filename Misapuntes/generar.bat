@echo off
setlocal enabledelayedexpansion
set "jsonFile=partidas.json"

echo { > "%jsonFile%"
echo   "partidas": [ >> "%jsonFile%"

set "first=1"

:: Usamos 'dir' filtrado para obligar al script a leer SOLO archivos reales .txt (ignorando carpetas y basura)
for /f "delims=" %%F in ('dir /b /a:-d *.txt 2^>nul') do (
    set "nombreArchivo=%%~nF"
    
    :: Evitamos de forma estricta que el script intente indexarse a sí mismo o al JSON si coincide la extensión
    if /i not "!nombreArchivo!"=="partidas" (
        if /i not "!nombreArchivo!"=="Generar" (
            
            :: Manejo perfecto de la coma de separación de la estructura JSON
            if !first! equ 0 (
                echo ,>> "%jsonFile%"
            )
            
            :: Escribimos la línea limpia del objeto JSON
            <nul set /p ="    {"nombre": "!nombreArchivo!", "sub": "Interactiva", "totalMovs": 0}" >> "%jsonFile%"
            set "first=0"
        )
    )
)

:: Cerramos el archivo JSON de forma limpia
echo. >> "%jsonFile%"
echo   ] >> "%jsonFile%"
echo } >> "%jsonFile%"

echo ¡Listo, Carlos! %jsonFile% generado exclusivamente con tus archivos de texto .txt reales.
pause