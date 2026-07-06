from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.menu_course import MenuCourse

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(MenuCourse).order_by(MenuCourse.sort_order).all()
    return [{"id": c.id, "name": c.name, "sort_order": c.sort_order} for c in courses]


@router.post("")
def create_course(data: dict, db: Session = Depends(get_db)):
    max_order = db.query(MenuCourse.sort_order).order_by(MenuCourse.sort_order.desc()).first()
    c = MenuCourse(
        name=data["name"],
        sort_order=(max_order[0] + 1 if max_order else 0)
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name}


@router.put("/{course_id}")
def update_course(course_id: int, data: dict, db: Session = Depends(get_db)):
    c = db.query(MenuCourse).filter(MenuCourse.id == course_id).first()
    if not c:
        raise HTTPException(404, "Course not found")
    if "name" in data:
        c.name = data["name"]
    if "sort_order" in data:
        c.sort_order = data["sort_order"]
    db.commit()
    return {"ok": True}


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    c = db.query(MenuCourse).filter(MenuCourse.id == course_id).first()
    if not c:
        raise HTTPException(404, "Course not found")
    from app.models.menu_item import MenuItem
    items = db.query(MenuItem).filter(MenuItem.course_id == course_id).count()
    if items > 0:
        raise HTTPException(400, f"Course has {items} items. Remove them first.")
    db.delete(c)
    db.commit()
    return {"ok": True}
