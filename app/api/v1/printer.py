"""Thermal printer API - ESC/POS generation and network printing."""
import socket
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.escpos import ESCPOS, ESCPOSConfig

router = APIRouter(prefix="/printer", tags=["printer"])


class ReceiptItem(BaseModel):
    name: str
    quantity: int = 1
    price: float = 0.0
    total: Optional[float] = None
    modifiers: Optional[List[str]] = None


class ReceiptData(BaseModel):
    order_id: Optional[int] = None
    table: Optional[str] = None
    order_type: Optional[str] = None
    date: Optional[str] = None
    cashier: Optional[str] = None
    customer: Optional[str] = None
    items: Optional[List[ReceiptItem]] = None
    subtotal: Optional[float] = None
    discount: Optional[float] = None
    discount_label: Optional[str] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    payment_method: Optional[str] = None
    amount_paid: Optional[float] = None
    change: Optional[float] = None
    tip: Optional[float] = None
    points_earned: Optional[int] = None
    points_redeemed: Optional[int] = None
    header_center: Optional[str] = None
    sub_header: Optional[List[str]] = None
    footer: Optional[str] = None
    qr_data: Optional[str] = None
    double_header: bool = False


class KitchenOrderData(BaseModel):
    order_id: Optional[int] = None
    table: Optional[str] = None
    order_type: Optional[str] = None
    time: Optional[str] = None
    items: Optional[List[ReceiptItem]] = None
    notes: Optional[str] = None


class PrintRequest(BaseModel):
    ip: str
    port: int = 9100
    data: str  # ESC/POS hex string or base64
    encoding: str = "cp852"
    width: int = 32


class ZReportData(BaseModel):
    date: str = ""
    sections: Optional[List[Dict[str, Any]]] = None
    totals: Optional[Dict[str, str]] = None


@router.post("/receipt")
def generate_receipt_escpos(data: ReceiptData, width: int = 32) -> dict:
    """Generate ESC/POS bytes for a receipt (returned as hex string)."""
    config = ESCPOSConfig(width=width)
    esc = ESCPOS(config)
    receipt_dict = data.model_dump(exclude_none=True)
    if receipt_dict.get("items"):
        receipt_dict["items"] = [i if isinstance(i, dict) else i.model_dump() for i in receipt_dict["items"]]
    raw = esc.print_receipt(receipt_dict)
    return {"hex": raw.hex(), "length": len(raw)}


@router.post("/kitchen")
def generate_kitchen_escpos(data: KitchenOrderData, width: int = 32) -> dict:
    """Generate ESC/POS bytes for a kitchen order ticket."""
    config = ESCPOSConfig(width=width)
    esc = ESCPOS(config)
    kitchen_dict = data.model_dump(exclude_none=True)
    if kitchen_dict.get("items"):
        kitchen_dict["items"] = [i if isinstance(i, dict) else i.model_dump() for i in kitchen_dict["items"]]
    raw = esc.print_kitchen_order(kitchen_dict)
    return {"hex": raw.hex(), "length": len(raw)}


@router.post("/z-report")
def generate_z_report_escpos(data: ZReportData, width: int = 32) -> dict:
    """Generate ESC/POS bytes for a Z-report."""
    config = ESCPOSConfig(width=width)
    esc = ESCPOS(config)
    raw = esc.print_z_report(data.model_dump(exclude_none=True))
    return {"hex": raw.hex(), "length": len(raw)}


@router.post("/send")
def send_to_printer(req: PrintRequest) -> dict:
    """Send raw ESC/POS data to a network printer."""
    try:
        raw = bytes.fromhex(req.data)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((req.ip, req.port))
        sock.sendall(raw)
        sock.close()
        return {"status": "sent", "bytes": len(raw), "printer": f"{req.ip}:{req.port}"}
    except socket.timeout:
        raise HTTPException(status_code=504, detail="Printer timeout - no response")
    except ConnectionRefusedError:
        raise HTTPException(status_code=502, detail="Printer connection refused")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Print error: {str(e)}")


@router.get("/test")
def test_printer(ip: str = "192.168.1.100", port: int = 9100) -> dict:
    """Send a test page to the printer."""
    config = ESCPOSConfig(width=32)
    esc = ESCPOS(config)
    buf = bytearray()
    buf.extend(esc.init())
    buf.extend(esc.align("center"))
    buf.extend(esc.double_size(True))
    buf.extend(esc.bold(True))
    buf.extend(esc._line("TEST NOVO"))
    buf.extend(esc.bold(False))
    buf.extend(esc.double_size(False))
    buf.extend(esc._line(""))
    buf.extend(esc._line("Tiskalnik je uspesno"))
    buf.extend(esc._line("povezan in pripravljen."))
    buf.extend(esc._line(""))
    buf.extend(esc._line("River Kolpa"))
    buf.extend(esc.separator())
    buf.extend(esc._line("Griblje 70"))
    buf.extend(esc._line("8332 Gradac"))
    buf.extend(esc._line(""))
    buf.extend(esc.align("center"))
    buf.extend(esc._line("Hvala za obisk!"))
    buf.extend(esc._line(""))
    buf.extend(esc.cut())

    try:
        raw = bytes(buf)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((ip, port))
        sock.sendall(raw)
        sock.close()
        return {"status": "test_page_sent", "bytes": len(raw), "printer": f"{ip}:{port}"}
    except socket.timeout:
        raise HTTPException(status_code=504, detail="Printer timeout")
    except ConnectionRefusedError:
        raise HTTPException(status_code=502, detail="Printer connection refused")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
