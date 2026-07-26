from datetime import datetime
from typing import Optional
import xml.etree.ElementTree as ET
import hashlib
import uuid as _uuid
import base64
import json


def _fmt(val: float) -> str:
    return f"{val:.2f}"


def generate_eracun_xml(
    invoice_number: str,
    issued_at: datetime,
    due_at: Optional[datetime],
    buyer_name: str,
    buyer_tax_id: str,
    buyer_address: str,
    seller_name: str,
    seller_tax_id: str,
    seller_address: str,
    items: list[dict],
    subtotal: float,
    tax_total: float,
    discount_amount: float,
    total: float,
    currency: str = "EUR",
    invoice_type_code: str = "380",
    credit_note_ref: str = "",
) -> str:
    # Build XML manually (UBL 2.1 / eSLOG 2.0 simplified)
    inv = ET.Element("Invoice", xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2")
    cbc = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    cac = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"

    def add_text(parent, tag, text, ns=cbc):
        el = ET.SubElement(parent, f"{{{ns}}}{tag}")
        el.text = str(text)
        return el

    # IDs
    add_text(inv, "UBLVersionID", "2.1")
    add_text(inv, "CustomizationID", "urn:cen.eu:en16931:2017#compliant#urn:fdc:si:eracun:2020:v2.0")
    add_text(inv, "ID", invoice_number)
    add_text(inv, "IssueDate", issued_at.strftime("%Y-%m-%d"))
    add_text(inv, "IssueTime", issued_at.strftime("%H:%M:%S"))
    if due_at:
        add_text(inv, "DueDate", due_at.strftime("%Y-%m-%d"))
    add_text(inv, "InvoiceTypeCode", invoice_type_code)
    add_text(inv, "DocumentCurrencyCode", currency)

    if credit_note_ref:
        billing_ref = ET.SubElement(inv, f"{{{cac}}}BillingReference")
        inv_doc_ref = ET.SubElement(billing_ref, f"{{{cac}}}InvoiceDocumentReference")
        add_text(inv_doc_ref, "ID", credit_note_ref, cbc)

    # AccountingSupplierParty (seller)
    acc_supp = ET.SubElement(inv, f"{{{cac}}}AccountingSupplierParty")
    party = ET.SubElement(acc_supp, f"{{{cac}}}Party")
    if seller_tax_id:
        pti = ET.SubElement(party, f"{{{cac}}}PartyTaxScheme")
        add_text(pti, "CompanyID", seller_tax_id, cbc)
    pn = ET.SubElement(party, f"{{{cac}}}PartyName")
    add_text(pn, "Name", seller_name, cbc)
    pa = ET.SubElement(party, f"{{{cac}}}PostalAddress")
    add_text(pa, "StreetName", seller_address, cbc)

    # AccountingCustomerParty (buyer)
    acc_cust = ET.SubElement(inv, f"{{{cac}}}AccountingCustomerParty")
    party2 = ET.SubElement(acc_cust, f"{{{cac}}}Party")
    if buyer_tax_id:
        pti2 = ET.SubElement(party2, f"{{{cac}}}PartyTaxScheme")
        add_text(pti2, "CompanyID", buyer_tax_id, cbc)
    pn2 = ET.SubElement(party2, f"{{{cac}}}PartyName")
    add_text(pn2, "Name", buyer_name, cbc)
    pa2 = ET.SubElement(party2, f"{{{cac}}}PostalAddress")
    add_text(pa2, "StreetName", buyer_address, cbc)

    # Tax totals
    tax_total_el = ET.SubElement(inv, f"{{{cac}}}TaxTotal")
    add_text(tax_total_el, "TaxAmount", _fmt(tax_total), cbc)
    add_text(tax_total_el, "CurrencyCode", currency, cbc)

    # LegalMonetaryTotal
    lmt = ET.SubElement(inv, f"{{{cac}}}LegalMonetaryTotal")
    add_text(lmt, "LineExtensionAmount", _fmt(subtotal), cbc)
    if discount_amount > 0:
        add_text(lmt, "AllowanceTotalAmount", _fmt(discount_amount), cbc)
    add_text(lmt, "TaxExclusiveAmount", _fmt(subtotal - discount_amount), cbc)
    add_text(lmt, "TaxInclusiveAmount", _fmt(total), cbc)
    add_text(lmt, "PayableAmount", _fmt(total), cbc)

    # Invoice lines
    for i, item in enumerate(items, 1):
        il = ET.SubElement(inv, f"{{{cac}}}InvoiceLine")
        add_text(il, "ID", str(i), cbc)
        add_text(il, "InvoicedQuantity", _fmt(item.get("quantity", 1)), cbc)
        add_text(il, "LineExtensionAmount", _fmt(item.get("total_price", 0)), cbc)

        il_item = ET.SubElement(il, f"{{{cac}}}Item")
        add_text(il_item, "Name", item.get("item_name", ""), cbc)
        if item.get("notes"):
            add_text(il_item, "Description", item["notes"], cbc)

        il_price = ET.SubElement(il, f"{{{cac}}}Price")
        add_text(il_price, "PriceAmount", _fmt(item.get("unit_price", 0)), cbc)

        # Tax per line
        il_tax = ET.SubElement(il, f"{{{cac}}}ClassifiedTaxCategory")
        add_text(il_tax, "Percent", _fmt(item.get("tax_rate", 0)), cbc)
        add_text(il_tax, "TaxAmount", _fmt(item.get("tax_amount", 0)), cbc)

    ET.SubElement(inv, f"{{{cbc}}}Note").text = f"Elektronski racun - POS Blagajna"

    xml_str = ET.tostring(inv, encoding="unicode", xml_declaration=True)
    return xml_str


def calculate_eracun_hash(xml_content: str) -> str:
    """SHA-256 hash of e-invoice XML for FURS signing."""
    return hashlib.sha256(xml_content.encode("utf-8")).hexdigest()


def generate_furs_payload(xml: str, private_key_id: str = "") -> dict:
    """Generate FURS submission payload."""
    return {
        "einvoice": base64.b64encode(xml.encode("utf-8")).decode("utf-8"),
        "invoiceHash": calculate_eracun_hash(xml),
        "privateKeyId": private_key_id,
        "uuid": str(_uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def validate_eracun_xml(xml: str) -> dict:
    """Validate e-invoice XML structure for FURS compliance."""
    errors = []
    required_elements = [
        "InvoiceHeader", "AccountingSupplierParty", "AccountingCustomerParty",
        "TaxTotal", "LegalMonetaryTotal", "InvoiceLine",
    ]
    for el in required_elements:
        if f"}}{el}" not in xml and el + ">" not in xml:
            errors.append(f"Manjka obvezen element: {el}")

    if "CustomizationID" not in xml:
        errors.append("Manjka CustomizationID (eSLOG 2.0)")
    if "InvoiceTypeCode" not in xml:
        errors.append("Manjka InvoiceTypeCode")

    return {"valid": len(errors) == 0, "errors": errors}


def parse_eracun_xml(xml: str) -> dict:
    """Parse e-invoice XML back to a dictionary for display."""
    try:
        root = ET.fromstring(xml)  # nosec B320 - trusted FURS XML
        ns = {
            "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
            "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
        }
        return {
            "invoice_number": _find_text(root, ".//cbc:ID", ns),
            "issue_date": _find_text(root, ".//cbc:IssueDate", ns),
            "currency": _find_text(root, ".//cbc:DocumentCurrencyCode", ns),
            "seller_name": _find_text(root, ".//cac:AccountingSupplierParty//cac:PartyName/cbc:Name", ns),
            "seller_tax_id": _find_text(root, ".//cac:AccountingSupplierParty//cac:PartyTaxScheme/cbc:CompanyID", ns),
            "buyer_name": _find_text(root, ".//cac:AccountingCustomerParty//cac:PartyName/cbc:Name", ns),
            "buyer_tax_id": _find_text(root, ".//cac:AccountingCustomerParty//cac:PartyTaxScheme/cbc:CompanyID", ns),
            "total": _find_text(root, ".//cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount", ns),
            "valid": True,
        }
    except ET.ParseError as e:
        return {"valid": False, "error": str(e)}


def _find_text(root, path, ns):
    el = root.find(path, ns)
    return el.text if el is not None else ""
