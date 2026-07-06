import subprocess, sys, os, time, webbrowser

os.chdir("F:\\testcursor")
proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)
time.sleep(3)
print("POS Blagajna teče na: http://localhost:8000")
print("Pritisni Ctrl+C za zaustavitev")
try:
    webbrowser.open("http://localhost:8000")
    proc.wait()
except KeyboardInterrupt:
    proc.kill()
    print("\nStrežnik ustavljen")
