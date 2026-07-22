@echo off
echo Starting AegisNet Backend...
start "AegisNet Backend" cmd /c ".\venv\Scripts\uvicorn.exe src.backend.main:app --port 8000"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak

echo Starting AegisNet Frontend...
cd frontend
start "AegisNet Frontend" cmd /c "npm run dev"

echo.
echo ===================================================
echo AegisNet Demo is running!
echo Backend API: http://127.0.0.1:8000
echo Frontend Dashboard: http://localhost:5174
echo ===================================================
