from fastapi import APIRouter
router = APIRouter(prefix="/quality-v3", tags=["Quality V3"])

@router.get("/haccp")
def haccp():
    return {
        "status": "Skladen",
        "last_audit": "2026-07-10",
        "next_audit": "2026-08-10",
        "violations": 0,
        "critical_points": [
            {"point": "Hlajenje", "temp_min": 0, "temp_max": 5, "current": 3.2, "status": "ok"},
            {"point": "Kuhanje", "temp_min": 65, "temp_max": 100, "current": 72, "status": "ok"},
            {"point": "Ohlajanje", "temp_min": 0, "temp_max": 60, "current": 8, "status": "ok"},
            {"point": "Shranjevanje", "temp_min": -18, "temp_max": -15, "current": -16.5, "status": "ok"},
        ],
        "compliance_score": 98.5
    }

@router.get("/temperature")
def temperature_monitoring():
    return {
        "devices": 8,
        "all_ok": True,
        "alerts_today": 0,
        "readings": [
            {"device": "Hladilnik 1", "temp": 3.2, "target_min": 0, "target_max": 5, "status": "ok"},
            {"device": "Hladilnik 2", "temp": 2.8, "target_min": 0, "target_max": 5, "status": "ok"},
            {"device": "Zamrzovalnik", "temp": -16.5, "target_min": -18, "target_max": -15, "status": "ok"},
            {"device": "Vitrina", "temp": 4.1, "target_min": 0, "target_max": 5, "status": "ok"},
            {"device": "Skladišče", "temp": 18.2, "target_min": 15, "target_max": 22, "status": "ok"},
        ],
        "history_24h": {"avg": 3.4, "min": 2.1, "max": 4.8, "deviations": 0}
    }

@router.get("/hygiene")
def hygiene():
    return {
        "score": 94.2,
        "last_cleaning": "2026-07-16 06:00",
        "next_cleaning": "2026-07-16 18:00",
        "checklist": [
            {"task": "Čiščenje površin", "status": "done", "time": "06:00", "by": "Ana"},
            {"task": "Dezinfekcija orodja", "status": "done", "time": "06:15", "by": "Ana"},
            {"task": "Čiščenje tal", "status": "done", "time": "06:30", "by": "Luka"},
            {"task": "Kontrola hladilnikov", "status": "done", "time": "06:45", "by": "Marko"},
            {"task": "Večerno čiščenje", "status": "pending", "time": "18:00", "by": ""},
        ],
        "incidents_this_month": 0
    }

@router.get("/compliance")
def compliance():
    return {
        "overall_score": 97.8,
        "categories": [
            {"name": "HACCP", "score": 98.5, "status": "Skladen"},
            {"name": "Higiena", "score": 94.2, "status": "Skladen"},
            {"name": "Usposabljanje", "score": 100, "status": "Skladen"},
            {"name": "Dokumentacija", "score": 96.0, "status": "Skladen"},
            {"name": "Odpadki", "score": 98.0, "status": "Skladen"},
        ],
        "certifications": [
            {"name": "HACCP", "valid_until": "2027-03-15", "status": "veljavno"},
            {"name": "IFS Food", "valid_until": "2026-12-01", "status": "veljavno"},
        ]
    }
