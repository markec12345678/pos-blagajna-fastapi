"""ESC/POS thermal printer command generator."""
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class ESCPOSConfig:
    width: int = 32  # 32 or 48 characters
    encoding: str = "cp852"  # Slovenian character encoding


class ESCPOS:
    """Generate ESC/POS commands for thermal printers."""

    # ESC/POS command bytes
    INIT = b"\x1b\x40"  # Initialize printer
    BOLD_ON = b"\x1b\x45\x01"
    BOLD_OFF = b"\x1b\x45\x00"
    UNDERLINE_ON = b"\x1b\x2d\x01"
    UNDERLINE_OFF = b"\x1b\x2d\x00"
    ALIGN_LEFT = b"\x1b\x61\x00"
    ALIGN_CENTER = b"\x1b\x61\x01"
    ALIGN_RIGHT = b"\x1b\x61\x02"
    CUT = b"\x1d\x56\x00"  # Full cut
    PARTIAL_CUT = b"\x1d\x56\x01"
    FEED_LINES = b"\x1b\x64\x03"  # Feed 3 lines before cut

    def __init__(self, config: Optional[ESCPOSConfig] = None):
        self.config = config or ESCPOSConfig()

    def _encode(self, text: str) -> bytes:
        """Encode text for the printer."""
        try:
            return text.encode(self.config.encoding)
        except UnicodeEncodeError:
            return text.encode("latin-1", errors="replace")

    def _line(self, text: str) -> bytes:
        """Encode a line with newline."""
        return self._encode(text + "\n")

    def init(self) -> bytes:
        """Initialize printer."""
        return self.INIT

    def cut(self) -> bytes:
        """Cut paper."""
        return self.FEED_LINES + self.CUT

    def text(self, content: str) -> bytes:
        """Add raw text."""
        return self._line(content)

    def bold(self, on: bool = True) -> bytes:
        """Toggle bold."""
        return self.BOLD_ON if on else self.BOLD_OFF

    def underline(self, on: bool = True) -> bytes:
        """Toggle underline."""
        return self.UNDERLINE_ON if on else self.UNDERLINE_OFF

    def align(self, position: str) -> bytes:
        """Set alignment: left, center, right."""
        return {"left": self.ALIGN_LEFT, "center": self.ALIGN_CENTER, "right": self.ALIGN_RIGHT}[position]

    def line(self, left: str = "", right: str = "") -> bytes:
        """Print a line with left and right aligned text."""
        width = self.config.width
        if not right:
            return self._line(left.ljust(width)[:width])
        gap = width - len(left) - len(right)
        if gap < 1:
            gap = 1
        return self._line(left + " " * gap + right)

    def separator(self) -> bytes:
        """Print a separator line."""
        return self._line("-" * self.config.width)

    def double_height(self, on: bool = True) -> bytes:
        """Toggle double height."""
        if on:
            return b"\x1b\x21\x10"
        return b"\x1b\x21\x00"

    def double_width(self, on: bool = True) -> bytes:
        """Toggle double width."""
        if on:
            return b"\x1b\x21\x20"
        return b"\x1b\x21\x00"

    def double_size(self, on: bool = True) -> bytes:
        """Toggle double size (height + width)."""
        if on:
            return b"\x1b\x21\x30"
        return b"\x1b\x21\x00"

    def print_receipt(self, data: dict) -> bytes:
        """Generate ESC/POS receipt from data dict."""
        buf = bytearray()
        buf.extend(self.init())

        # Header
        if data.get("header_center"):
            buf.extend(self.align("center"))
            if data.get("double_header"):
                buf.extend(self.double_size(True))
            buf.extend(self.bold(True))
            buf.extend(self._line(data["header_center"]))
            buf.extend(self.bold(False))
            if data.get("double_header"):
                buf.extend(self.double_size(False))

        # Sub-header
        for line in data.get("sub_header", []):
            buf.extend(self.align("center"))
            buf.extend(self._line(line))

        buf.extend(self.separator())
        buf.extend(self.align("left"))

        # Order info
        if data.get("order_id"):
            buf.extend(self.line(f"Narocilo #{data['order_id']}", ""))
        if data.get("table"):
            buf.extend(self.line(f"Miza: {data['table']}", ""))
        if data.get("order_type"):
            buf.extend(self.line(f"Tip: {data['order_type']}", ""))
        if data.get("date"):
            buf.extend(self.line(f"Datum: {data['date']}", ""))
        if data.get("cashier"):
            buf.extend(self.line(f"Blagajnik: {data['cashier']}", ""))
        if data.get("customer"):
            buf.extend(self.line(f"Stranka: {data['customer']}", ""))

        if data.get("items"):
            buf.extend(self.separator())
            for item in data["items"]:
                name = item.get("name", "")
                qty = item.get("quantity", 1)
                price = item.get("price", 0)
                total = item.get("total", qty * price)
                qty_str = f"{qty}x"
                price_str = f"{total:.2f} EUR"
                buf.extend(self.line(f"  {qty_str} {name}", price_str))
                if item.get("modifiers"):
                    for mod in item["modifiers"]:
                        buf.extend(self.line(f"    + {mod}", ""))

        buf.extend(self.separator())
        buf.extend(self.align("left"))

        # Subtotal / discount
        if data.get("subtotal"):
            buf.extend(self.line("Vmesna vsota:", f"{data['subtotal']:.2f} EUR"))
        if data.get("discount"):
            buf.extend(self.line(f"Popust ({data.get('discount_label', '')}):", f"-{data['discount']:.2f} EUR"))
        if data.get("tax"):
            buf.extend(self.line("DDV:", f"{data['tax']:.2f} EUR"))

        # Total (bold)
        if data.get("total"):
            buf.extend(self.bold(True))
            buf.extend(self.line("SKUPAJ:", f"{data['total']:.2f} EUR"))
            buf.extend(self.bold(False))

        # Payment
        if data.get("payment_method"):
            buf.extend(self.separator())
            buf.extend(self.line(f"Placilo ({data['payment_method']}):", f"{data.get('amount_paid', data['total']):.2f} EUR"))
        if data.get("change") and data["change"] > 0:
            buf.extend(self.line("Vracilo:", f"{data['change']:.2f} EUR"))
        if data.get("tip") and data["tip"] > 0:
            buf.extend(self.line("Napitnina:", f"{data['tip']:.2f} EUR"))

        # Loyalty points
        if data.get("points_earned"):
            buf.extend(self.line(f"Tocke zasluzene: +{data['points_earned']}", ""))
        if data.get("points_redeemed"):
            buf.extend(self.line(f"Tocke unovcene: -{data['points_redeemed']}", ""))

        # Footer
        if data.get("footer"):
            buf.extend(self.separator())
            buf.extend(self.align("center"))
            for line in data["footer"].split("\n"):
                buf.extend(self._line(line.strip()))

        # QR code (placeholder - would need qrcode generation on server)
        if data.get("qr_data"):
            buf.extend(self.align("center"))
            buf.extend(self._line("[QR koda za povratno informacijo]"))

        buf.extend(self.align("center"))
        buf.extend(self._line(""))
        buf.extend(self._line("Hvala za obisk!"))
        buf.extend(self._line(""))
        buf.extend(self.cut())

        return bytes(buf)

    def print_kitchen_order(self, data: dict) -> bytes:
        """Generate ESC/POS kitchen order ticket."""
        buf = bytearray()
        buf.extend(self.init())
        buf.extend(self.align("center"))
        buf.extend(self.double_size(True))
        buf.extend(self.bold(True))
        buf.extend(self._line(f"NAROCILO #{data.get('order_id', '?')}"))
        buf.extend(self.bold(False))
        buf.extend(self.double_size(False))
        buf.extend(self._line(""))
        buf.extend(self._line(f"Miza: {data.get('table', '?')}"))
        if data.get("order_type"):
            buf.extend(self._line(f"Tip: {data['order_type']}"))
        if data.get("time"):
            buf.extend(self._line(f"Cas: {data['time']}"))
        buf.extend(self.separator())
        buf.extend(self.align("left"))

        if data.get("items"):
            for item in data["items"]:
                buf.extend(self.bold(True))
                buf.extend(self._line(f"  {item.get('quantity', 1)}x {item.get('name', '')}"))
                buf.extend(self.bold(False))
                if item.get("notes"):
                    buf.extend(self._line(f"    Opomba: {item['notes']}"))
                if item.get("modifiers"):
                    for mod in item["modifiers"]:
                        buf.extend(self._line(f"    + {mod}"))

        if data.get("notes"):
            buf.extend(self.separator())
            buf.extend(self.bold(True))
            buf.extend(self._line(f"Opombe: {data['notes']}"))
            buf.extend(self.bold(False))

        buf.extend(self.separator())
        buf.extend(self.align("center"))
        buf.extend(self._line(""))
        buf.extend(self.cut())

        return bytes(buf)

    def print_z_report(self, data: dict) -> bytes:
        """Generate ESC/POS Z-report (end of day)."""
        buf = bytearray()
        buf.extend(self.init())
        buf.extend(self.align("center"))
        buf.extend(self.double_size(True))
        buf.extend(self.bold(True))
        buf.extend(self._line("DNEVNO POROCILO"))
        buf.extend(self.bold(False))
        buf.extend(self.double_size(False))
        buf.extend(self._line(data.get("date", "")))
        buf.extend(self.separator())

        buf.extend(self.align("left"))
        for section in data.get("sections", []):
            buf.extend(self.bold(True))
            buf.extend(self._line(section.get("title", "")))
            buf.extend(self.bold(False))
            for row in section.get("rows", []):
                buf.extend(self.line(f"  {row[0]}", f"{row[1]}"))
            buf.extend(self._line(""))

        if data.get("totals"):
            buf.extend(self.separator())
            buf.extend(self.bold(True))
            for key, val in data["totals"].items():
                buf.extend(self.line(f"{key}:", f"{val}"))
            buf.extend(self.bold(False))

        buf.extend(self.separator())
        buf.extend(self.align("center"))
        buf.extend(self._line("Konec porocila"))
        buf.extend(self._line(""))
        buf.extend(self.cut())

        return bytes(buf)
