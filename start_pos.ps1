$log = "F:\testcursor\server.log"
$err = "F:\testcursor\server.err"
Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "F:\testcursor" -RedirectStandardOutput $log -RedirectStandardError $err
Write-Host "Server starting on http://localhost:8000"
