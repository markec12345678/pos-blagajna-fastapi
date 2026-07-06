import socket
import json
import requests
from typing import Optional


def terminal_pay(amount: float, reference: str,
                 terminal_type: str = "",
                 host: str = "", port: int = 0,
                     api_key: str = "", timeout: int = 30) -> dict:
    try:
        if terminal_type == "verifone":
            return _verifone_pay(amount, reference, host, port, timeout)
        elif terminal_type == "pax":
            return _pax_pay(amount, reference, host, port, timeout)
        elif terminal_type == "generic_http":
            return _generic_http_pay(amount, reference, host, port, api_key, timeout)
        else:
            return _simulate_pay(amount, reference)
    except Exception as e:
        return {"approved": False, "error": str(e)}


def terminal_status(terminal_type: str = "",
                    host: str = "", port: int = 0,
                    api_key: str = "", timeout: int = 5) -> dict:
    try:
        if terminal_type == "verifone":
            return _verifone_status(host, port, timeout)
        elif terminal_type == "pax":
            return _pax_status(host, port, timeout)
        elif terminal_type == "generic_http":
            return _generic_http_status(host, port, api_key, timeout)
        else:
            return {"online": True, "mode": "simulated"}
    except Exception as e:
        return {"online": False, "error": str(e)}


# ── Simulated terminal (for testing) ──

def _simulate_pay(amount: float, reference: str) -> dict:
    import random
    return {
        "approved": True,
        "transaction_id": f"SIM-{random.randint(100000, 999999)}",
        "card_type": "Visa",
        "card_last4": f"{random.randint(1000, 9999)}",
        "amount": amount,
        "reference": reference,
        "terminal": "simulated",
    }


# ── Verifone (TCP/IP) ──

def _verifone_pay(amount: float, reference: str,
                  host: str, port: int, timeout: int) -> dict:
    s = socket.create_connection((host, port), timeout=timeout)
    cmd = f"PAY:{amount:.2f}:{reference}\n"
    s.send(cmd.encode())
    resp = s.recv(4096).decode().strip()
    s.close()
    parts = resp.split(":")
    if len(parts) >= 3 and parts[0] == "OK":
        return {
            "approved": True,
            "transaction_id": parts[1],
            "card_type": parts[2] if len(parts) > 3 else "Unknown",
            "card_last4": parts[3] if len(parts) > 3 else "",
            "amount": amount,
            "reference": reference,
            "terminal": "verifone",
        }
    return {"approved": False, "error": resp}


def _verifone_status(host: str, port: int, timeout: int) -> dict:
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.send(b"STATUS\n")
        resp = s.recv(4096).decode().strip()
        s.close()
        return {"online": resp == "OK", "mode": "verifone"}
    except:
        return {"online": False, "error": "Connection failed"}


# ── PAX (TCP/IP) ──

def _pax_pay(amount: float, reference: str,
             host: str, port: int, timeout: int) -> dict:
    s = socket.create_connection((host, port), timeout=timeout)
    cmd = json.dumps({"cmd": "sale", "amount": amount, "reference": reference})
    s.send(cmd.encode() + b"\n")
    resp = s.recv(4096).decode().strip()
    s.close()
    try:
        data = json.loads(resp)
        return {
            "approved": data.get("approved", False),
            "transaction_id": data.get("transaction_id", ""),
            "card_type": data.get("card_type", ""),
            "card_last4": data.get("card_last4", ""),
            "amount": data.get("amount", amount),
            "reference": reference,
            "terminal": "pax",
        }
    except:
        return {"approved": False, "error": resp}


def _pax_status(host: str, port: int, timeout: int) -> dict:
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.send(json.dumps({"cmd": "status"}).encode() + b"\n")
        resp = s.recv(4096).decode().strip()
        s.close()
        data = json.loads(resp)
        return {"online": True, "mode": "pax", **data}
    except:
        return {"online": False, "error": "Connection failed"}


# ── Generic HTTP terminal ──

def _generic_http_pay(amount: float, reference: str,
                      host: str, port: int, api_key: str,
                      timeout: int) -> dict:
    url = f"http://{host}:{port}/api/pos/pay"
    r = requests.post(url, json={
        "amount": amount,
        "reference": reference,
        "api_key": api_key,
    }, timeout=timeout)
    data = r.json()
    return {
        "approved": data.get("approved", data.get("success", False)),
        "transaction_id": data.get("transaction_id", data.get("id", "")),
        "card_type": data.get("card_type", ""),
        "card_last4": data.get("card_last4", ""),
        "amount": data.get("amount", amount),
        "reference": reference,
        "terminal": "generic_http",
    }


def _generic_http_status(host: str, port: int, api_key: str,
                         timeout: int) -> dict:
    url = f"http://{host}:{port}/api/pos/status"
    r = requests.get(url, params={"api_key": api_key}, timeout=timeout)
    return {"online": r.ok, "mode": "generic_http"}
