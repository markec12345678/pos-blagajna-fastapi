import hashlib
import base64
import logging
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import httpx

logger = logging.getLogger(__name__)

CRO_TEST_URL = "https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest"
CRO_PROD_URL = "https://cis.porezna-uprava.hr:8449/FiskalizacijaService"

SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
FISK_NS = "http://www.apis-it.hr/fin/2003/fiskalizacija" + \
          "/tipovi/v1.0"
FISK_NS_MSG = "http://www.apis-it.hr/fin/2003/fiskalizacija" + \
              "/poruke/v1.0"


def _fmt(val: float) -> str:
    return f"{val:.2f}"


def generate_croatian_invoice_xml(
    oib: str,
    invoice_number: str,
    issued_at: datetime,
    items: list[dict],
    subtotal: float,
    tax_total: float,
    total: float,
    payment_method: str = "G",
    operator_id: str = "",
    zki: str = "",
    jir: str = "",
) -> str:
    ns_map = {
        "fisk": "http://www.apis-it.hr/fin/2003/fiskalizacija/poruke/v1.0",
    }

    root = ET.Element("RacunZahtjev")
    root.set("xmlns", ns_map["fisk"])

    def add(parent, tag, text):
        el = ET.SubElement(parent, f"{{{ns_map['fisk']}}}{tag}")
        el.text = str(text)
        return el

    add(root, "Oib", oib)
    add(root, "Dv", "1.2")
    add(root, "DatVrijeme", issued_at.strftime("%d.%m.%YT%H:%M:%S"))
    add(root, "OznPoslProstora", "1")
    add(root, "BrRacuna", invoice_number)
    add(root, "VrstaPlac", payment_method)
    add(root, "OznNapUredj", "1")
    if operator_id:
        add(root, "NaplatniUredjajId", operator_id)

    stavke_el = ET.SubElement(root, f"{{{ns_map['fisk']}}}StavkeRacuna")

    for item in items:
        stavka_el = ET.SubElement(stavke_el, f"{{{ns_map['fisk']}}}StavkaRacuna")
        add(stavka_el, "OznakaStavke", "G" if item.get("tax_rate", 0) > 0 else "O")
        add(stavka_el, "NazivStavke", item.get("item_name", ""))
        add(stavka_el, "Kolicina", _fmt(item.get("quantity", 1)))
        add(stavka_el, "JedinicaMjere", item.get("unit", "kom"))
        add(stavka_el, "CijenaStavke", _fmt(item.get("unit_price", 0)))
        add(stavka_el, "StopaPDV", _fmt(item.get("tax_rate", 0)))
        add(stavka_el, "IznosStavke", _fmt(item.get("total_price", 0)))

    add(root, "IznosUkupno", _fmt(total))
    add(root, "NacinPlacanja", payment_method)

    if zki:
        add(root, "ZastKod", zki)
    if jir:
        add(root, "Jir", jir)

    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>'
    xml_str = ET.tostring(root, encoding="unicode")
    return xml_declaration + "\n" + xml_str


def calculate_zki(invoice_data: dict, private_key_path: str) -> str:
    oib = invoice_data["oib"]
    invoice_number = invoice_data["invoice_number"]
    issued_at = invoice_data["issued_at"]
    total = invoice_data["total"]
    payment_method = invoice_data.get("payment_method", "G")

    data_to_sign = (
        f"{oib}{invoice_number}{issued_at}{_fmt(total)}{payment_method}"
    )

    with open(private_key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
        )

    signature = private_key.sign(
        data_to_sign.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA1(),
    )

    return base64.b64encode(signature).decode("utf-8")


def sign_xml(xml_content: str, cert_path: str, key_path: str) -> str:
    with open(cert_path, "rb") as f:
        cert_data = f.read()
    cert_b64 = base64.b64encode(cert_data).decode("utf-8")

    cert_lines = []
    for i in range(0, len(cert_b64), 64):
        cert_lines.append(cert_b64[i:i + 64])
    cert_text = "\n".join(cert_lines)

    digest_value = hashlib.sha1(xml_content.encode("utf-8")).hexdigest()
    signature_id = f"sig-{uuid.uuid4().hex[:16]}"

    signed_info_xml = (
        f'<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">'
        f'<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>'
        f'<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>'
        f'<Reference URI="">'
        f'<Transforms>'
        f'<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>'
        f'<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>'
        f'</Transforms>'
        f'<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>'
        f'<DigestValue>{digest_value}</DigestValue>'
        f'</Reference>'
        f'</SignedInfo>'
    )

    with open(key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
        )

    signature = private_key.sign(
        signed_info_xml.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA1(),
    )
    sig_b64 = base64.b64encode(signature).decode("utf-8")

    signature_xml = (
        f'<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="{signature_id}">'
        f'{signed_info_xml}'
        f'<SignatureValue>{sig_b64}</SignatureValue>'
        f'<KeyInfo>'
        f'<X509Data>'
        f'<X509Certificate>{cert_text}</X509Certificate>'
        f'</X509Data>'
        f'</KeyInfo>'
        f'</Signature>'
    )

    root_end = xml_content.find(">")
    if root_end == -1:
        return xml_content

    insert_pos = root_end + 1
    return xml_content[:insert_pos] + signature_xml + xml_content[insert_pos:]


def send_to_cro_cis(
    xml: str,
    cert_path: str,
    key_path: str,
    env: str = "test",
) -> dict:
    url = CRO_TEST_URL if env == "test" else CRO_PROD_URL

    soap_envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="{SOAP_NS}" xmlns:fin="{FISK_NS_MSG}">
  <soap:Header/>
  <soap:Body>
    <fin:RacunZahtjev>
      {xml}
    </fin:RacunZahtjev>
  </soap:Body>
</soap:Envelope>"""

    try:
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "",
        }

        client_cert = (cert_path, key_path)

        with httpx.Client(cert=client_cert, timeout=30.0, verify=True) as client:
            response = client.post(url, content=soap_envelope.encode("utf-8"), headers=headers)
            response.raise_for_status()
            return {"success": True, "response_text": response.text, "status_code": response.status_code}
    except httpx.ConnectError as e:
        logger.error("Croatian CIS connection error: %s", e)
        return {"success": False, "error": "Connection to CIS failed", "message": str(e)}
    except httpx.TimeoutException as e:
        logger.error("Croatian CIS timeout: %s", e)
        return {"success": False, "error": "CIS request timed out", "message": str(e)}
    except Exception as e:
        logger.error("Croatian CIS submission error: %s", e)
        return {"success": False, "error": "CIS submission failed", "message": str(e)}


def parse_croatian_response(response: dict) -> dict:
    errors = []

    if not response:
        errors.append("Empty response from Croatian CIS")
        return {"valid": False, "errors": errors}

    success = response.get("success", False)
    response_text = response.get("response_text", "")

    if not success:
        errors.append(response.get("error", "Unknown error"))
        return {"valid": False, "errors": errors}

    jir = ""
    try:
        root = ET.fromstring(response_text)
        ns_map = {
            "soap": SOAP_NS,
            "fisk": FISK_NS_MSG,
        }

        body = root.find(".//soap:Body", ns_map)
        if body is None:
            body = root

        jir_el = body.find(".//{*}Jir")
        if jir_el is not None and jir_el.text:
            jir = jir_el.text

        greska_el = body.find(".//{*}Greska")
        if greska_el is not None and greska_el.text:
            errors.append(f"CIS Error: {greska_el.text}")

        sifra_greske_el = body.find(".//{*}SifraGreske")
        if sifra_greske_el is not None and sifra_greske_el.text:
            errors.append(f"CIS Error Code: {sifra_greske_el.text}")

    except ET.ParseError as e:
        logger.error("Failed to parse CIS response: %s", e)
        errors.append(f"Response parse error: {str(e)}")

    return {
        "valid": len(errors) == 0 and bool(jir),
        "jir": jir,
        "errors": errors,
    }


def fiscalize_croatian(
    oib: str,
    invoice_number: str,
    issued_at: datetime,
    items: list[dict],
    subtotal: float,
    tax_total: float,
    total: float,
    payment_method: str = "G",
    operator_id: str = "",
    private_key_path: str = "",
    cert_path: str = "",
    key_path: str = "",
    env: str = "test",
) -> dict:
    invoice_data = {
        "oib": oib,
        "invoice_number": invoice_number,
        "issued_at": issued_at.strftime("%d.%m.%YT%H:%M:%S"),
        "total": total,
        "payment_method": payment_method,
    }

    zki = ""
    if private_key_path:
        try:
            zki = calculate_zki(invoice_data, private_key_path)
        except Exception as e:
            logger.error("ZKI calculation error: %s", e)
            return {"success": False, "error": "ZKI calculation failed", "message": str(e)}

    xml = generate_croatian_invoice_xml(
        oib=oib,
        invoice_number=invoice_number,
        issued_at=issued_at,
        items=items,
        subtotal=subtotal,
        tax_total=tax_total,
        total=total,
        payment_method=payment_method,
        operator_id=operator_id,
        zki=zki,
    )

    if cert_path and key_path:
        try:
            signed_xml = sign_xml(xml, cert_path, key_path)
        except Exception as e:
            logger.error("XML signing error: %s", e)
            return {"success": False, "error": "XML signing failed", "message": str(e), "xml": xml}

        response = send_to_cro_cis(signed_xml, cert_path, key_path, env)
        parsed = parse_croatian_response(response)

        if parsed["valid"]:
            return {
                "success": True,
                "jir": parsed["jir"],
                "zki": zki,
                "xml": xml,
                "signed_xml": signed_xml,
                "response": response,
            }
        else:
            return {
                "success": False,
                "errors": parsed["errors"],
                "xml": xml,
                "zki": zki,
            }

    return {
        "success": True,
        "jir": "",
        "zki": zki,
        "xml": xml,
        "response": None,
        "note": "Generated XML only - no certificate configured for CIS submission",
    }


def validate_oib(oib: str) -> bool:
    if not oib or len(oib) != 11 or not oib.isdigit():
        return False

    weights = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    total = sum(int(oib[i]) * weights[i] for i in range(10))
    remainder = total % 11
    check_digit = 0 if remainder == 0 else 11 - remainder

    if check_digit == 10:
        check_digit = 0

    return int(oib[10]) == check_digit
