"""Customer Feedback QR API — anketa zadovoljstva prek QR kode."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/feedback-qr", tags=["Feedback QR"])


class FeedbackSubmit(BaseModel):
    table_id: int
    order_id: Optional[int] = None
    rating: int  # 1-5
    food_rating: Optional[int] = None
    service_rating: Optional[int] = None
    ambiance_rating: Optional[int] = None
    comment: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    recommend: Optional[bool] = None


@router.get("/table/{table_id}")
def get_table_feedback_link(table_id: int, db: Session = Depends(get_db)):
    """Generiraj QR kodo za feedback za mizo."""
    import qrcode
    import base64
    from io import BytesIO
    from app.models.table import Table

    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        return {"error": "Miza ni najdena"}

    # Generate QR code
    url = f"/feedback/{table_id}"
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    return {
        "table_id": table_id,
        "table_name": table.name,
        "url": url,
        "qr_image": f"data:image/png;base64,{base64.b64encode(buffer.read()).decode()}"
    }


@router.post("/submit")
def submit_feedback(feedback: FeedbackSubmit, db: Session = Depends(get_db)):
    """Oddaj povratno informacijo (javni endpoint)."""
    from app.models.rating import Rating

    rating = Rating(
        table_id=feedback.table_id,
        order_id=feedback.order_id,
        score=feedback.rating,
        food_quality=feedback.food_rating,
        service_quality=feedback.service_rating,
        ambiance=feedback.ambiance_rating,
        comment=feedback.comment,
        name=feedback.name,
        email=feedback.email,
        recommend=feedback.recommend,
    )
    db.add(rating)
    db.commit()

    return {
        "message": "Hvala za vašo povratno informacijo! 🙏",
        "rating_id": rating.id,
    }


@router.get("/stats")
def get_feedback_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Statistika povratnih informacij."""
    from app.models.rating import Rating
    from datetime import timedelta

    start = datetime.now() - timedelta(days=days)
    ratings = db.query(Rating).filter(Rating.created_at >= start).all()

    if not ratings:
        return {
            "total": 0,
            "average": 0,
            "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "nps": 0,
        }

    scores = [r.score for r in ratings if r.score]
    avg_score = sum(scores) / len(scores) if scores else 0

    # Distribution
    dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for s in scores:
        if 1 <= s <= 5:
            dist[s] += 1

    # NPS (recommend)
    recommend_ratings = [r for r in ratings if r.recommend is not None]
    promoters = sum(1 for r in recommend_ratings if r.recommend == True)
    detractors = sum(1 for r in recommend_ratings if r.recommend == False and r.score <= 3)
    nps = ((promoters - detractors) / len(recommend_ratings) * 100) if recommend_ratings else 0

    # Average categories
    food_scores = [r.food_quality for r in ratings if r.food_quality]
    service_scores = [r.service_quality for r in ratings if r.service_quality]

    return {
        "total": len(ratings),
        "average": round(avg_score, 1),
        "distribution": dist,
        "nps": round(nps, 0),
        "avg_food": round(sum(food_scores) / len(food_scores), 1) if food_scores else None,
        "avg_service": round(sum(service_scores) / len(service_scores), 1) if service_scores else None,
        "recent": [
            {
                "id": r.id,
                "score": r.score,
                "comment": r.comment,
                "name": r.name,
                "created_at": r.created_at.isoformat() if hasattr(r.created_at, 'isoformat') else str(r.created_at),
            }
            for r in ratings[-10:]
        ],
    }


@router.get("/html/{table_id}")
def get_feedback_page(table_id: int, db: Session = Depends(get_db)):
    """Generiraj HTML stran za feedback."""
    from app.models.table import Table

    table = db.query(Table).filter(Table.id == table_id).first()
    table_name = table.name if table else f"Miza {table_id}"

    html = f"""<!DOCTYPE html>
<html lang="sl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Povratna informacija - {table_name}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }}
  .card {{ background: #fff; border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.3); }}
  h1 {{ font-size: 24px; margin-bottom: 8px; text-align: center; }}
  .subtitle {{ color: #666; text-align: center; margin-bottom: 24px; }}
  .stars {{ display: flex; justify-content: center; gap: 8px; margin: 16px 0; }}
  .star {{ font-size: 40px; cursor: pointer; transition: transform .2s; opacity: 0.3; }}
  .star.active {{ opacity: 1; transform: scale(1.1); }}
  .category {{ margin: 12px 0; }}
  .category label {{ font-size: 13px; color: #666; display: block; margin-bottom: 4px; }}
  .category-stars {{ display: flex; gap: 4px; }}
  .category-stars span {{ font-size: 24px; cursor: pointer; opacity: 0.3; }}
  .category-stars span.active {{ opacity: 1; }}
  textarea {{ width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; resize: vertical; min-height: 80px; margin: 12px 0; }}
  input {{ width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin: 4px 0; }}
  button {{ width: 100%; padding: 14px; background: #667eea; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 12px; }}
  button:hover {{ background: #5a6fd6; }}
  .success {{ display: none; text-align: center; padding: 40px 0; }}
  .success h2 {{ font-size: 48px; margin-bottom: 16px; }}
</style>
</head>
<body>
<div class="card">
  <div id="form">
    <h1>🍽️ {table_name}</h1>
    <p class="subtitle">Kako ste bili zadovoljni?</p>

    <div class="stars" id="mainStars">
      <span class="star" onclick="setRating(1)">⭐</span>
      <span class="star" onclick="setRating(2)">⭐</span>
      <span class="star" onclick="setRating(3)">⭐</span>
      <span class="star" onclick="setRating(4)">⭐</span>
      <span class="star" onclick="setRating(5)">⭐</span>
    </div>

    <div class="category">
      <label>🍔 Hrana</label>
      <div class="category-stars" id="foodStars">
        <span onclick="setCat('food',1)">⭐</span>
        <span onclick="setCat('food',2)">⭐</span>
        <span onclick="setCat('food',3)">⭐</span>
        <span onclick="setCat('food',4)">⭐</span>
        <span onclick="setCat('food',5)">⭐</span>
      </div>
    </div>

    <div class="category">
      <label>🧑‍🍳 Storitev</label>
      <div class="category-stars" id="serviceStars">
        <span onclick="setCat('service',1)">⭐</span>
        <span onclick="setCat('service',2)">⭐</span>
        <span onclick="setCat('service',3)">⭐</span>
        <span onclick="setCat('service',4)">⭐</span>
        <span onclick="setCat('service',5)">⭐</span>
      </div>
    </div>

    <textarea id="comment" placeholder="Dodajte komentar (opcijsko)..."></textarea>
    <input id="name" placeholder="Vaše ime (opcijsko)">

    <button onclick="submitFeedback()">✅ Pošlji</button>
  </div>

  <div class="success" id="success">
    <h2>🙏</h2>
    <h2>Hvala!</h2>
    <p>Vaša povratna informacija nam veliko pomeni.</p>
  </div>
</div>

<script>
let rating = 0, food = 0, service = 0;

function setRating(r) {{
  rating = r;
  document.querySelectorAll('#mainStars .star').forEach((s,i) => s.classList.toggle('active', i < r));
}}

function setCat(cat, r) {{
  if (cat === 'food') food = r;
  if (cat === 'service') service = r;
  const stars = document.getElementById(cat + 'Stars').children;
  for (let i = 0; i < stars.length; i++) stars[i].classList.toggle('active', i < r);
}}

async function submitFeedback() {{
  if (!rating) {{ alert('Prosim izberite oceno'); return; }}
  const body = {{
    table_id: {table_id},
    rating: rating,
    food_rating: food || null,
    service_rating: service || null,
    comment: document.getElementById('comment').value,
    name: document.getElementById('name').value,
  }};
  const r = await fetch('/api/v1/feedback-qr/submit', {{
    method: 'POST',
    headers: {{'Content-Type': 'application/json'}},
    body: JSON.stringify(body)
  }});
  if (r.ok) {{
    document.getElementById('form').style.display = 'none';
    document.getElementById('success').style.display = 'block';
  }}
}}
</script>
</body>
</html>"""

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.get("/batch/{count}")
def batch_generate_qr(count: int = 10, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Množično generiranje QR kod za vse mize."""
    from app.models.table import Table
    import qrcode
    import base64
    from io import BytesIO

    tables = db.query(TableModel).filter(TableModel.is_active == True).limit(count).all()

    qr_codes = []
    for table in tables:
        url = f"/feedback/{table.id}"
        qr = qrcode.QRCode(version=1, box_size=6, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        qr_codes.append({
            "table_id": table.id,
            "table_name": table.name,
            "url": url,
            "qr_image": f"data:image/png;base64,{base64.b64encode(buffer.read()).decode()}"
        })

    return {
        "count": len(qr_codes),
        "qr_codes": qr_codes,
    }


@router.get("/dashboard")
def feedback_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Dashboard za povratne informacije."""
    from app.models.rating import Rating
    from datetime import timedelta

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)

    # Today
    today_ratings = db.query(Rating).filter(Rating.created_at >= today_start).all()
    today_avg = sum(r.score for r in today_ratings) / len(today_ratings) if today_ratings else 0

    # This week
    week_ratings = db.query(Rating).filter(Rating.created_at >= week_start).all()
    week_avg = sum(r.score for r in week_ratings) / len(week_ratings) if week_ratings else 0

    # This month
    month_ratings = db.query(Rating).filter(Rating.created_at >= month_start).all()
    month_avg = sum(r.score for r in month_ratings) / len(month_ratings) if month_ratings else 0

    # NPS calculation
    recommend_ratings = [r for r in month_ratings if r.recommend is not None]
    promoters = sum(1 for r in recommend_ratings if r.recommend == True)
    detractors = sum(1 for r in recommend_ratings if r.recommend == False and r.score <= 3)
    nps = ((promoters - detractors) / len(recommend_ratings) * 100) if recommend_ratings else 0

    # Category averages
    food_scores = [r.food_quality for r in month_ratings if r.food_quality]
    service_scores = [r.service_quality for r in month_ratings if r.service_quality]

    return {
        "today": {
            "count": len(today_ratings),
            "average": round(today_avg, 1),
        },
        "week": {
            "count": len(week_ratings),
            "average": round(week_avg, 1),
        },
        "month": {
            "count": len(month_ratings),
            "average": round(month_avg, 1),
        },
        "nps": round(nps, 0),
        "avg_food": round(sum(food_scores) / len(food_scores), 1) if food_scores else None,
        "avg_service": round(sum(service_scores) / len(service_scores), 1) if service_scores else None,
        "recent": [
            {
                "id": r.id,
                "score": r.score,
                "comment": r.comment,
                "name": r.name,
                "created_at": r.created_at.isoformat() if hasattr(r.created_at, 'isoformat') else str(r.created_at),
            }
            for r in today_ratings[-5:]
        ],
    }
