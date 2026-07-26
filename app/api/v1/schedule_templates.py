"""Schedule templates for recurring shifts."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/schedule-templates", tags=["Predloge urnika"])


class ShiftTemplate(BaseModel):
    name: str
    user_id: int
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str
    end_time: str
    role: Optional[str] = None


class WeekTemplate(BaseModel):
    name: str
    shifts: List[ShiftTemplate]


@router.get("/")
def get_templates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vrni vse predloge urnika."""
    # In production: fetch from ScheduleTemplate table
    # For now: return default templates
    return {
        "templates": [
            {
                "id": 1,
                "name": "Standardni teden",
                "shifts": [
                    {"day_of_week": 0, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
                    {"day_of_week": 0, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 1, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
                    {"day_of_week": 1, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 2, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
                    {"day_of_week": 2, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 3, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
                    {"day_of_week": 3, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 4, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
                    {"day_of_week": 4, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 5, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
                    {"day_of_week": 5, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 6, "start_time": "08:00", "end_time": "16:00", "role": "Natačnik"},
                ],
            },
            {
                "id": 2,
                "name": "Vikend (petek-nedelja)",
                "shifts": [
                    {"day_of_week": 4, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 5, "start_time": "10:00", "end_time": "22:00", "role": "Natačnik"},
                    {"day_of_week": 6, "start_time": "10:00", "end_time": "18:00", "role": "Natačnik"},
                ],
            },
        ]
    }


@router.post("/")
def create_template(template: WeekTemplate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari novo predlogo urnika."""
    # In production: save to ScheduleTemplate table
    return {
        "message": f"Predloga '{template.name}' ustvarjena",
        "name": template.name,
        "shift_count": len(template.shifts),
    }


@router.post("/apply/{template_id}")
def apply_template(
    template_id: int,
    start_date: str,
    weeks: int = Query(1, ge=1, le=12),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Uporabi predlogo za ustvarjanje izmen."""
    from app.models.shift import EmployeeShift

    # Get template (in production: from DB)
    templates = {
        1: {"name": "Standardni teden", "shifts": [
            {"user_id": 1, "day_of_week": 0, "start_time": "06:00", "end_time": "14:00", "role": "Kuhar"},
            {"user_id": 2, "day_of_week": 0, "start_time": "14:00", "end_time": "22:00", "role": "Natačnik"},
        ]},
    }

    template = templates.get(template_id)
    if not template:
        return {"error": "Predloga ni najdena"}

    start = datetime.strptime(start_date, '%Y-%m-%d')
    created = []

    for week in range(weeks):
        week_start = start + timedelta(weeks=week)
        for shift_data in template["shifts"]:
            # Calculate the date for this day of week
            day_offset = shift_data["day_of_week"] - week_start.weekday()
            if day_offset < 0:
                day_offset += 7
            shift_date = week_start + timedelta(days=day_offset)

            # Check if shift already exists
            existing = db.query(EmployeeShift).filter(
                EmployeeShift.user_id == shift_data["user_id"],
                EmployeeShift.date == shift_date.strftime('%Y-%m-%d'),
                EmployeeShift.start_time == shift_data["start_time"]
            ).first()

            if not existing:
                new_shift = EmployeeShift(
                    user_id=shift_data["user_id"],
                    date=shift_date.strftime('%Y-%m-%d'),
                    start_time=shift_data["start_time"],
                    end_time=shift_data["end_time"],
                    role=shift_data.get("role", ""),
                    notes=f"Iz predloge: {template['name']}"
                )
                db.add(new_shift)
                created.append({
                    "user_id": shift_data["user_id"],
                    "date": shift_date.strftime('%Y-%m-%d'),
                    "start_time": shift_data["start_time"],
                    "end_time": shift_data["end_time"],
                })

    db.commit()

    return {
        "message": f"Ustvarjenih {len(created)} izmen iz predloge",
        "template": template["name"],
        "weeks": weeks,
        "created_shifts": len(created),
    }


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Izbriši predlogo."""
    # In production: delete from ScheduleTemplate table
    return {"message": f"Predloga {template_id} izbrisana"}


@router.get("/copy-week")
def copy_week(
    from_date: str,
    to_date: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Kopiraj izmen iz enega tedena v drugega."""
    from app.models.planned_shift import PlannedShift

    from_start = datetime.strptime(from_date, '%Y-%m-%d')
    to_start = datetime.strptime(to_date, '%Y-%m-%d')
    from_end = from_start + timedelta(days=6)
    to_end = to_start + timedelta(days=6)

    # Get source shifts
    source_shifts = db.query(PlannedShift).filter(
        PlannedShift.date >= from_start.date(),
        PlannedShift.date <= from_end.date()
    ).all()

    # Create copies
    created = []
    for shift in source_shifts:
        source_date = shift.date if isinstance(shift.date, datetime) else datetime.strptime(str(shift.date), '%Y-%m-%d')
        day_offset = (source_date - from_start).days
        new_date = to_start + timedelta(days=day_offset)

        new_shift = PlannedShift(
            user_id=shift.user_id,
            date=new_date.date(),
            start_time=shift.start_time,
            end_time=shift.end_time,
            role=shift.role,
            notes=f"Kopirano iz {from_date}"
        )
        db.add(new_shift)
        created.append({
            "user_id": shift.user_id,
            "date": new_date.strftime('%Y-%m-%d'),
        })

    db.commit()

    return {
        "message": f"Kopiranih {len(created)} izmen",
        "from": from_date,
        "to": to_date,
        "copied": len(created),
    }