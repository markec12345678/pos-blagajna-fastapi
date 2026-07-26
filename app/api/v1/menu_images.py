"""Menu item image upload and management."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os
import shutil
import uuid

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/menu-images", tags=["Meni slike"])

UPLOAD_DIR = "uploads/menu"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{item_id}")
def upload_menu_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Nalogo sliko za jed v meniju."""
    from app.models.menu_item import MenuItem

    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Jed ni najdena")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Podprte slike: JPG, PNG, WebP, GIF")

    # Validate file size (max 5MB)
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(400, "Največja velikost: 5MB")

    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in (file.filename or '') else 'jpg'
    filename = f"{item_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update item with image URL
    image_url = f"/uploads/menu/{filename}"
    item.image_url = image_url
    db.commit()

    return {
        "message": "Slika naložena",
        "item_id": item_id,
        "image_url": image_url,
        "filename": filename,
    }


@router.delete("/{item_id}")
def delete_menu_image(
    item_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Izbriši sliko jedi."""
    from app.models.menu_item import MenuItem

    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Jed ni najdena")

    if item.image_url:
        # Delete file
        filepath = os.path.join(".", item.image_url.lstrip('/'))
        if os.path.exists(filepath):
            os.remove(filepath)
        
        item.image_url = None
        db.commit()

    return {"message": "Slika izbrisana", "item_id": item_id}


@router.get("/{item_id}")
def get_menu_image(
    item_id: int,
    db: Session = Depends(get_db)
):
    """Vrni sliko jedi."""
    from app.models.menu_item import MenuItem

    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Jed ni najdena")

    return {
        "item_id": item_id,
        "image_url": item.image_url if hasattr(item, 'image_url') else None,
    }


@router.post("/bulk-upload")
def bulk_upload_images(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Množično nalaganje slik (za testiranje)."""
    from app.models.menu_item import MenuItem

    items = db.query(MenuItem).filter(MenuItem.image_url == None).limit(10).all()
    
    return {
        "message": f"{len(items)} jedi brez slik",
        "items_without_images": [{
            "id": item.id,
            "name": item.name,
        } for item in items]
    }