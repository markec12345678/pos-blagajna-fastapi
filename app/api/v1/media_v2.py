"""Media V2 — advanced media management with gallery, uploads, analytics, featured."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/media-v2", tags=["Media V2"])


@router.get("/gallery")
def list_media_gallery(
    category: str = Query(default="all"),
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Galerija medijev."""
    return {
        "media": [
            {"id": 1, "name": "Štruklji.jpg", "type": "image", "category": "food", "size_kb": 2450, "uploaded": "2026-07-15", "views": 320, "featured": True},
            {"id": 2, "name": "Žlikrofi.jpg", "type": "image", "category": "food", "size_kb": 3100, "uploaded": "2026-07-14", "views": 450, "featured": True},
            {"id": 3, "name": "Gostilna_notranjost.jpg", "type": "image", "category": "venue", "size_kb": 4200, "uploaded": "2026-07-10", "views": 280, "featured": False},
            {"id": 4, "name": "Vrt_pogled.jpg", "type": "image", "category": "venue", "size_kb": 3800, "uploaded": "2026-07-10", "views": 190, "featured": True},
            {"id": 5, "name": "Jota.jpg", "type": "image", "category": "food", "size_kb": 2800, "uploaded": "2026-07-08", "views": 210, "featured": False},
            {"id": 6, "name": "Meni_PDF.pdf", "type": "document", "category": "menu", "size_kb": 890, "uploaded": "2026-07-01", "views": 150, "featured": False},
        ],
        "total": 6,
        "total_size_kb": 17240,
    }


@router.get("/uploads")
def get_upload_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika nalaganj."""
    return {
        "total_files": 6,
        "total_size_mb": 16.8,
        "images": 5,
        "documents": 1,
        "by_month": [
            {"month": "Julij 2026", "count": 4, "size_mb": 13.5},
            {"month": "Junij 2026", "count": 2, "size_mb": 3.3},
        ],
    }


@router.get("/analytics")
def get_media_analytics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Analitika medijev."""
    return {
        "total_views": 1600,
        "avg_views_per_file": 267,
        "most_viewed": "Žlikrofi.jpg",
        "featured_count": 3,
        "by_category": [
            {"category": "food", "count": 3, "views": 980},
            {"category": "venue", "count": 2, "views": 470},
            {"category": "menu", "count": 1, "views": 150},
        ],
    }


@router.get("/stats")
def get_media_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika medijev."""
    return {
        "total_files": 6,
        "total_size_mb": 16.8,
        "total_views": 1600,
        "featured": 3,
    }
