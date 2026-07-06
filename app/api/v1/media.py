import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, f"Format ni podprt: {file.content_type}. Podprti: {', '.join(ALLOWED)}")
    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Datoteka je prevelika (max 5 MB)")
    with open(dest, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{name}", "name": name, "size": len(content)}


@router.get("/list")
def list_uploads(user: dict = Depends(get_current_user)):
    files = []
    for f in sorted(UPLOAD_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if f.is_file():
            files.append({
                "name": f.name,
                "url": f"/uploads/{f.name}",
                "size": f.stat().st_size,
                "modified": f.stat().st_mtime
            })
    return files


@router.delete("/{filename}")
def delete_upload(filename: str, user: dict = Depends(get_current_user)):
    dest = UPLOAD_DIR / filename
    if not dest.exists():
        raise HTTPException(404, "Datoteka ne obstaja")
    dest.unlink()
    return {"ok": True}
