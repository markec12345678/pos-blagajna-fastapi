from datetime import datetime
from typing import Optional
import xml.etree.ElementTree as ET


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
    add_text(inv, "InvoiceTypeCode", "380")
    add_text(inv, "DocumentCurrencyCode", currency)

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

    ET.SubElement(inv, f"{{{cbc}}}Note").text = f"Elektronski račun – POS Blagajna"

    xml_str = ET.tostring(inv, encoding="unicode", xml_declaration=True)
    return xml_str
