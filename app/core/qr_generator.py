"""QR Code Generator for table ordering — generiranje QR kod za mize."""
import qrcode
from io import BytesIO
import base64


def generate_table_qr(table_id: int, base_url: str = None) -> str:
    """Generiraj QR kodo za mizo in vrni base64 PNG."""
    if not base_url:
        base_url = "http://localhost:5173"

    url = f"{base_url}/table-order/{table_id}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode('utf-8')


def generate_table_qr_html(table_id: int, table_name: str, base_url: str = None) -> str:
    """Generiraj HTML za tiskanje QR kode za mizo."""
    qr_b64 = generate_table_qr(table_id, base_url)

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Miza {table_name}</title>
<style>
  body {{ margin: 0; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; }}
  .qr-container {{ text-align: center; padding: 30px; border: 2px solid #333; border-radius: 12px; max-width: 350px; }}
  .qr-code {{ margin: 20px 0; }}
  .qr-code img {{ width: 200px; height: 200px; }}
  .table-name {{ font-size: 28px; font-weight: bold; margin-bottom: 10px; }}
  .instructions {{ font-size: 14px; color: #666; margin-top: 10px; }}
  .restaurant-name {{ font-size: 12px; color: #999; margin-top: 20px; }}
  @media print {{
    body {{ padding: 10px; }}
    .qr-container {{ border: 1px solid #000; }}
  }}
</style>
</head>
<body>
  <div class="qr-container">
    <div class="table-name">Miza {table_name}</div>
    <div class="qr-code">
      <img src="data:image/png;base64,{qr_b64}" alt="QR koda za naročilo">
    </div>
    <div class="instructions">
      📱 Skenirajte QR kodo za naročilo<br>
      Scan QR code to order
    </div>
    <div class="restaurant-name">Restavracija</div>
  </div>
</body>
</html>"""


def generate_bulk_qr(tables: list[dict], base_url: str = None) -> str:
    """Generiraj HTML za tiskanje več QR kod naenkrat."""
    qr_items = []
    for table in tables:
        qr_b64 = generate_table_qr(table['id'], base_url)
        qr_items.append(f"""
        <div class="qr-item">
          <div class="table-name">Miza {table['name']}</div>
          <img src="data:image/png;base64,{qr_b64}" alt="QR koda">
          <div class="table-num">#{table['id']}</div>
        </div>""")

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>QR Kode za mize</title>
<style>
  body {{ font-family: sans-serif; padding: 20px; }}
  .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }}
  .qr-item {{ text-align: center; border: 1px solid #ddd; border-radius: 8px; padding: 15px; page-break-inside: avoid; }}
  .table-name {{ font-size: 18px; font-weight: bold; margin-bottom: 8px; }}
  img {{ width: 150px; height: 150px; }}
  .table-num {{ font-size: 11px; color: #999; margin-top: 4px; }}
  @media print {{
    .qr-item {{ border: 1px solid #000; }}
  }}
</style>
</head>
<body>
  <h1>QR Kode za mize</h1>
  <div class="grid">
    {''.join(qr_items)}
  </div>
</body>
</html>"""
