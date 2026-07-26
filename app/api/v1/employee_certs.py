"""Employee certifications and training tracking."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/employee-certs", tags=["Certifikati zaposlenih"])


class CertificationCreate(BaseModel):
    employee_id: int
    name: str
    issuer: Optional[str] = None
    issue_date: str
    expiry_date: Optional[str] = None
    certificate_number: Optional[str] = None
    notes: Optional[str] = None


class TrainingEnroll(BaseModel):
    employee_id: int
    training_id: int


@router.get("/")
def list_certifications(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni certifikate zaposlenih."""
    # In production: fetch from Certification table
    return {
        "certifications": [
            {
                "id": 1, "employee": "Janez Novak", "employee_id": 1,
                "name": "HACCP certifikat",
                "issuer": "Inštitut za varno hrano",
                "issue_date": "2025-06-15", "expiry_date": "2026-06-15",
                "certificate_number": "HACCP-2025-1234",
                "status": "valid", "days_until_expiry": 121,
            },
            {
                "id": 2, "employee": "Marija Kovač", "employee_id": 2,
                "name": "Certifikat za varno hrano",
                "issuer": "Zavod za zdravstveno varstvo",
                "issue_date": "2025-03-20", "expiry_date": "2026-03-20",
                "certificate_number": "VVH-2025-5678",
                "status": "valid", "days_until_expiry": 64,
            },
            {
                "id": 3, "employee": "Peter Horvat", "employee_id": 3,
                "name": "Certifikat strežnika",
                "issuer": "Šola za catering",
                "issue_date": "2024-01-10", "expiry_date": "2025-01-10",
                "certificate_number": "STR-2024-9012",
                "status": "expired", "days_until_expiry": -5,
            },
        ],
        "total": 3,
        "valid": 2,
        "expiring_soon": 0,
        "expired": 1,
    }


@router.post("/")
def create_certification(data: CertificationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Ustvari certifikat."""
    return {
        "message": "Certifikat ustvarjen",
        "certification": {
            "employee_id": data.employee_id,
            "name": data.name,
            "issuer": data.issuer,
            "issue_date": data.issue_date,
            "expiry_date": data.expiry_date,
            "certificate_number": data.certificate_number,
            "status": "valid",
        }
    }


@router.get("/expiring")
def get_expiring_certifications(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni certifikate, ki potečejo."""
    return {
        "expiring_in_days": days,
        "certifications": [
            {
                "id": 2, "employee": "Marija Kovač",
                "name": "Certifikat za varno hrano",
                "expiry_date": "2026-03-20",
                "days_until_expiry": 64,
                "status": "warning",
            },
        ],
        "total": 1,
    }


@router.get("/training")
def list_trainings(
    upcoming: bool = True,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Vrni usposabljanja."""
    return {
        "trainings": [
            {
                "id": 1, "name": "HACCP osnove",
                "description": "Osnove sistema HACCP za restavracije",
                "duration_hours": 8, "instructor": "Dr. Anna Berkopec",
                "date": "2026-02-15", "max_participants": 10,
                "enrolled": 5, "status": "upcoming",
            },
            {
                "id": 2, "name": "Varnost pri delu",
                "description": "Obnovitev tečaja varnosti pri delu",
                "duration_hours": 4, "instructor": "Inštitut za varnost",
                "date": "2026-02-20", "max_participants": 15,
                "enrolled": 8, "status": "upcoming",
            },
            {
                "id": 3, "name": "Upravljanje alergenov",
                "description": "Prepoznavanje in upravljanje alergenov v hrani",
                "duration_hours": 6, "instructor": "Nutricionistka Petra Novak",
                "date": "2026-03-01", "max_participants": 8,
                "enrolled": 3, "status": "upcoming",
            },
            {
                "id": 4, "name": "Osnove strežbe",
                "description": "Temeljno usposabljanje za natakarje",
                "duration_hours": 12, "instructor": "Šola za catering",
                "date": "2026-03-10", "max_participants": 12,
                "enrolled": 0, "status": "upcoming",
            },
        ],
        "total": 4,
    }


@router.post("/training/enroll")
def enroll_training(data: TrainingEnroll, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Prijavi zaposlenega na usposabljanje."""
    return {
        "message": "Zaposleni prijavljen na usposabljanje",
        "employee_id": data.employee_id,
        "training_id": data.training_id,
        "enrolled_at": datetime.now().isoformat(),
    }


@router.get("/training/history")
def get_training_history(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Zgodovina usposabljanj."""
    return {
        "history": [
            {
                "id": 1, "employee": "Janez Novak",
                "training": "HACCP osnove",
                "completed_date": "2025-06-10",
                "score": 95, "passed": True,
                "certificate_issued": True,
            },
            {
                "id": 2, "employee": "Marija Kovač",
                "training": "Varnost pri delu",
                "completed_date": "2025-03-15",
                "score": 88, "passed": True,
                "certificate_issued": True,
            },
        ],
        "total": 2,
    }


@router.get("/compliance")
def get_compliance_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Stanje skladnosti certifikatov."""
    return {
        "overall_compliance": 85.0,
        "employees": [
            {
                "id": 1, "name": "Janez Novak",
                "required": ["HACCP", "Varnost pri delu"],
                "completed": ["HACCP", "Varnost pri delu"],
                "compliance": 100,
            },
            {
                "id": 2, "name": "Marija Kovač",
                "required": ["HACCP", "Varnost pri delu"],
                "completed": ["HACCP"],
                "compliance": 50,
            },
            {
                "id": 3, "name": "Peter Horvat",
                "required": ["HACCP", "Certifikat strežnika"],
                "completed": [],
                "compliance": 0,
            },
        ],
        "gaps": [
            {"employee": "Peter Horvat", "missing": ["HACCP", "Certifikat strežnika"]},
            {"employee": "Marija Kovač", "missing": ["Varnost pri delu"]},
        ],
    }


@router.get("/stats")
def get_cert_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Statistika certifikatov."""
    return {
        "total_certifications": 3,
        "valid": 2,
        "expiring_soon": 0,
        "expired": 1,
        "upcoming_trainings": 4,
        "enrolled_employees": 16,
        "compliance_rate": 85.0,
        "next_deadline": {
            "employee": "Marija Kovač",
            "certification": "Certifikat za varno hrano",
            "expiry_date": "2026-03-20",
            "days_until_expiry": 64,
        },
    }