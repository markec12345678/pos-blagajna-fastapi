import hashlib
import base64
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, utils
import httpx

logger = logging.getLogger(__name__)

ZAPOS_TEST_URL = "https://blagajne-test.fu.gov.si:9002"
ZAPOS_PROD_URL = "https://blagajne.fu.gov.si:9003"


def _fmt(val: float) -> str:
    return f"{val:.2f}"


def generate_zapos_xml(
    tax_number: str,
    invoice_number: str,
    issued_at: datetime,
    items: list[dict],
    subtotal: float,
    tax_total: float,
    total: float,
    payment_method: str = "gotovina",
    operator_id: str = "",
    zoi: str = "",
    eor: str = "",
    environment: str = "test",
) -> str:
    ns_map = {
        "furs": "http://www.fu.gov.si/schema/eblagajne/ZAPOS/v1.0",
    }
    root = ET.Element("{" + ns_map["furs"] + "}ProdajniRacun")
    root.set("xmlns:furs", ns_map["furs"])

    def add(parent, tag, text):
        el = ET.SubElement(parent, f"{{{ns_map['furs']}}}{tag}")
        el.text = str(text)
        return el

    add(root, "DavcnaStevilka", tax_number)
    add(root, "StevilkaRacuna", invoice_number)
    add(root, "CasIzdaje", issued_at.strftime("%Y-%m-%dT%H:%M:%S"))
    add(root, "Okolje", environment.upper())

    if operator_id:
        add(root, "OperaterID", operator_id)

    for i, item in enumerate(items, 1):
        postavka = ET.SubElement(root, f"{{{ns_map['furs']}}}PostavkaRacuna")
        add(postavka, "Naziv", item.get("item_name", ""))
        add(postavka, "Kolicina", _fmt(item.get("quantity", 1)))
        add(postavka, "EnotaKolicine", item.get("unit", "kos"))
        add(postavka, "CenaNaEnoto", _fmt(item.get("unit_price", 0)))
        add(postavka, "Vrednost", _fmt(item.get("total_price", 0)))
        add(postavka, "DavcnaStopnja", _fmt(item.get("tax_rate", 0)))
        add(postavka, "DavekZnesek", _fmt(item.get("tax_amount", 0)))

    add(root, "SkupajBruto", _fmt(subtotal))
    add(root, "SkupajDavek", _fmt(tax_total))
    add(root, "SkupajNeto", _fmt(subtotal - tax_total))
    add(root, "SkupajPlacilo", _fmt(total))
    add(root, "NacinPlacila", payment_method)

    if zoi:
        add(root, "ZOI", zoi)
    if eor:
        add(root, "EOR", eor)

    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>'
    xml_str = ET.tostring(root, encoding="unicode")
    return xml_declaration + "\n" + xml_str


def calculate_zoi(invoice_data: dict, private_key_path: str) -> str:
    tax_number = invoice_data["tax_number"]
    invoice_number = invoice_data["invoice_number"]
    issued_at = invoice_data["issued_at"]
    total = invoice_data["total"]

    data_to_sign = (
        f"{tax_number}{invoice_number}{issued_at}{_fmt(total)}"
    )

    with open(private_key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
        )

    signature = private_key.sign(
        data_to_sign.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )

    return hashlib.sha256(signature).hexdigest().upper()


def generate_qr_data(
    eor: str,
    zoi: str,
    tax_number: str,
    total: float,
    issued_at: datetime,
) -> str:
    parts = [
        tax_number.ljust(13),
        issued_at.strftime("%Y%m%d"),
        issued_at.strftime("%H%M%S"),
        eor.ljust(8),
        zoi.ljust(64),
    ]
    raw = "".join(parts)
    qr_str = raw[:60].ljust(60, "0")
    qr_hash = hashlib.sha1(qr_str.encode("utf-8")).hexdigest().upper()[:10]
    return f"{qr_str}{qr_hash}"


def submit_to_furs(
    xml: str,
    cert_path: str,
    key_path: str,
    env: str = "test",
) -> dict:
    url = ZAPOS_TEST_URL if env == "test" else ZAPOS_PROD_URL
    endpoint = f"{url}/v1/cashregisters/proxy/submit"

    try:
        with open(cert_path, "rb") as cert_file:
            cert_data = cert_file.read()
        with open(key_path, "rb") as key_file:
            key_data = key_file.read()

        xml_b64 = base64.b64encode(xml.encode("utf-8")).decode("utf-8")

        payload = {
            "EInvoice": xml_b64,
            "InvoiceHash": hashlib.sha256(xml.encode("utf-8")).hexdigest(),
        }

        client_cert = (cert_path, key_path)

        with httpx.Client(cert=client_cert, timeout=30.0, verify=True) as client:
            response = client.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.ConnectError as e:
        logger.error("FURS connection error: %s", e)
        return {"success": False, "error": "Connection to FURS failed", "message": str(e)}
    except httpx.TimeoutException as e:
        logger.error("FURS timeout: %s", e)
        return {"success": False, "error": "FURS request timed out", "message": str(e)}
    except Exception as e:
        logger.error("FURS submission error: %s", e)
        return {"success": False, "error": "FURS submission failed", "message": str(e)}


def verify_furs_response(response: dict) -> dict:
    errors = []

    if not response:
        errors.append("Empty response from FURS")
        return {"valid": False, "errors": errors}

    success = response.get("success", False)
    eor = response.get("EOR", "")
    error_code = response.get("errorCode", "")
    error_message = response.get("errorMessage", "")

    if not success:
        errors.append(f"FURS error: {error_code} - {error_message}")

    if success and not eor:
        errors.append("Success response but missing EOR")

    if eor and len(eor) < 4:
        errors.append(f"Invalid EOR length: {len(eor)}")

    return {
        "valid": len(errors) == 0 and success,
        "eor": eor,
        "errors": errors,
    }


def fiscalize_zapos(
    tax_number: str,
    invoice_number: str,
    issued_at: datetime,
    items: list[dict],
    subtotal: float,
    tax_total: float,
    total: float,
    payment_method: str = "gotovina",
    operator_id: str = "",
    private_key_path: str = "",
    cert_path: str = "",
    key_path: str = "",
    env: str = "test",
) -> dict:
    invoice_data = {
        "tax_number": tax_number,
        "invoice_number": invoice_number,
        "issued_at": issued_at.strftime("%Y-%m-%dT%H:%M:%S"),
        "total": total,
    }

    zoi = ""
    if private_key_path:
        try:
            zoi = calculate_zoi(invoice_data, private_key_path)
        except Exception as e:
            logger.error("ZOI calculation error: %s", e)
            return {"success": False, "error": "ZOI calculation failed", "message": str(e)}

    xml = generate_zapos_xml(
        tax_number=tax_number,
        invoice_number=invoice_number,
        issued_at=issued_at,
        items=items,
        subtotal=subtotal,
        tax_total=tax_total,
        total=total,
        payment_method=payment_method,
        operator_id=operator_id,
        zoi=zoi,
    )

    qr_data = generate_qr_data(
        eor="",
        zoi=zoi,
        tax_number=tax_number,
        total=total,
        issued_at=issued_at,
    )

    if cert_path and key_path:
        response = submit_to_furs(xml, cert_path, key_path, env)
        verification = verify_furs_response(response)

        if verification["valid"]:
            eor = verification["eor"]
            qr_data = generate_qr_data(
                eor=eor,
                zoi=zoi,
                tax_number=tax_number,
                total=total,
                issued_at=issued_at,
            )
            return {
                "success": True,
                "eor": eor,
                "zoi": zoi,
                "xml": xml,
                "qr_data": qr_data,
                "response": response,
            }
        else:
            return {
                "success": False,
                "errors": verification["errors"],
                "xml": xml,
                "zoi": zoi,
            }

    return {
        "success": True,
        "eor": "",
        "zoi": zoi,
        "xml": xml,
        "qr_data": qr_data,
        "response": None,
        "note": "Generated XML only - no certificate configured for FURS submission",
    }
