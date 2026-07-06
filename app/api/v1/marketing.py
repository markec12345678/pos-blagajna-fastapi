from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.campaign import Campaign, CampaignRecipient
from app.models.customer import Customer
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from datetime import datetime
import json
import smtplib
from email.mime.text import MIMEText

router = APIRouter(prefix="/marketing", tags=["marketing"])


def _filter_customers(db: Session, sf: dict, branch_id: int = 0):
    q = db.query(Customer)
    if branch_id:
        q = q.filter(Customer.branch_id == branch_id)
    if sf.get("is_member"):
        q = q.filter(Customer.is_member == True)
    if sf.get("has_email"):
        q = q.filter(Customer.email != "", Customer.email != None)
    if sf.get("has_phone"):
        q = q.filter(Customer.phone != "", Customer.phone != None)
    if sf.get("min_total_spent", 0) > 0:
        q = q.filter(Customer.total_spent >= sf["min_total_spent"])
    if sf.get("min_loyalty_points", 0) > 0:
        q = q.filter(Customer.loyalty_points >= sf["min_loyalty_points"])
    return q.all()


@router.post("/preview")
def preview_segment(data: dict, db: Session = Depends(get_db)):
    customers = _filter_customers(db, data.get("segment_filter", {}), data.get("branch_id", 0))
    return {"count": len(customers), "sample": [{"id": c.id, "name": c.name, "email": c.email, "phone": c.phone} for c in customers[:5]]}


@router.get("/campaigns")
def list_campaigns(branch_id: int = 0, db: Session = Depends(get_db)):
    q = db.query(Campaign)
    if branch_id:
        q = q.filter(Campaign.branch_id == branch_id)
    q = q.order_by(Campaign.created_at.desc())
    return [
        {
            "id": c.id, "name": c.name, "type": c.type,
            "subject": c.subject, "content": c.content,
            "status": c.status, "segment_filter": c.segment_filter,
            "recipient_count": c.recipient_count, "sent_count": c.sent_count,
            "opened_count": c.opened_count,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "sent_at": c.sent_at.isoformat() if c.sent_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "branch_id": c.branch_id,
        }
        for c in q.all()
    ]


@router.post("/campaigns")
def create_campaign(data: dict, db: Session = Depends(get_db)):
    c = Campaign(
        name=data["name"],
        type=data.get("type", "email"),
        subject=data.get("subject", ""),
        content=data.get("content", ""),
        status="draft",
        segment_filter=json.dumps(data.get("segment_filter", {})),
        scheduled_at=datetime.fromisoformat(data["scheduled_at"]) if data.get("scheduled_at") else None,
        created_by=data.get("created_by"),
        branch_id=data.get("branch_id"),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    log_action("campaign", c.id, "create", f"Ustvarjena kampanja: {c.name}", db)
    return {"id": c.id, "status": c.status}


@router.put("/campaigns/{campaign_id}")
def update_campaign(campaign_id: int, data: dict, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    for f in ["name", "type", "subject", "content", "status"]:
        if f in data:
            setattr(c, f, data[f])
    if "segment_filter" in data:
        c.segment_filter = json.dumps(data["segment_filter"])
    if "scheduled_at" in data:
        c.scheduled_at = datetime.fromisoformat(data["scheduled_at"]) if data["scheduled_at"] else None
    db.commit()
    log_action("campaign", c.id, "update", f"Posodobljena kampanja: {c.name}", db)
    return {"id": c.id, "status": c.status}


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == campaign_id).delete()
    db.delete(c)
    db.commit()
    log_action("campaign", campaign_id, "delete", "Izbrisana kampanja", db)
    return {"ok": True}


@router.post("/campaigns/{campaign_id}/send")
def send_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if c.status == "sent":
        raise HTTPException(400, "Campaign already sent")

    sf = json.loads(c.segment_filter or "{}")
    customers = _filter_customers(db, sf, c.branch_id or 0)
    c.recipient_count = len(customers)
    c.status = "sending"
    db.commit()

    smtp_host = db.query(Setting).filter(Setting.key == "smtp_host").first()
    smtp_port = db.query(Setting).filter(Setting.key == "smtp_port").first()
    smtp_user = db.query(Setting).filter(Setting.key == "smtp_user").first()
    smtp_pass = db.query(Setting).filter(Setting.key == "smtp_pass").first()
    sms_provider = db.query(Setting).filter(Setting.key == "sms_provider").first()
    sms_api_key = db.query(Setting).filter(Setting.key == "sms_api_key").first()
    sms_sender = db.query(Setting).filter(Setting.key == "sms_sender").first()

    sent = 0
    for cust in customers:
        if c.type == "email" and cust.email:
            if smtp_host and smtp_user and smtp_pass:
                try:
                    msg = MIMEText(c.content, "html" if "<html>" in c.content else "plain")
                    msg["Subject"] = c.subject
                    msg["To"] = cust.email
                    msg["From"] = smtp_user.value
                    with smtplib.SMTP(smtp_host.value, int(smtp_port.value or 587)) as server:
                        server.starttls()
                        server.login(smtp_user.value, smtp_pass.value)
                        server.send_message(msg)
                except:
                    pass
            rec = CampaignRecipient(campaign_id=c.id, customer_id=cust.id, sent_at=datetime.now())
            db.add(rec)
            sent += 1
        if c.type == "sms" and cust.phone:
            from app.core.sms_service import send_sms
            try:
                send_sms(cust.phone, c.content or c.subject or "",
                         sms_provider.value if sms_provider else "",
                         sms_api_key.value if sms_api_key else "",
                         sms_sender.value if sms_sender else "")
            except:
                pass
            rec = CampaignRecipient(campaign_id=c.id, customer_id=cust.id, sent_at=datetime.now())
            db.add(rec)
            sent += 1

    c.sent_count = sent
    c.status = "sent"
    c.sent_at = datetime.now()
    db.commit()
    log_action("campaign", c.id, "send", f"Poslana kampanja: {c.name}, {sent} prejemnikov", db)
    return {"sent": sent, "total": len(customers)}


@router.post("/sms/send")
def send_sms_single(data: dict, db: Session = Depends(get_db)):
    from app.core.sms_service import send_sms as send_svc
    sms_provider = db.query(Setting).filter(Setting.key == "sms_provider").first()
    sms_api_key = db.query(Setting).filter(Setting.key == "sms_api_key").first()
    sms_sender = db.query(Setting).filter(Setting.key == "sms_sender").first()
    phone = data.get("phone", "")
    message = data.get("message", "")
    if not phone or not message:
        raise HTTPException(400, "phone and message required")
    ok = send_svc(phone, message,
                  sms_provider.value if sms_provider else "",
                  sms_api_key.value if sms_api_key else "",
                  sms_sender.value if sms_sender else "")
    if ok:
        log_action(db, "sms_sent", "sms", 0, details=f"To {phone}: {message[:50]}")
    return {"ok": ok}


@router.get("/campaigns/{campaign_id}/recipients")
def list_recipients(campaign_id: int, db: Session = Depends(get_db)):
    recs = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == campaign_id).all()
    result = []
    for r in recs:
        cust = db.query(Customer).filter(Customer.id == r.customer_id).first()
        result.append({
            "id": r.id, "customer_id": r.customer_id,
            "customer_name": cust.name if cust else "?",
            "customer_email": cust.email if cust else "",
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            "opened_at": r.opened_at.isoformat() if r.opened_at else None,
        })
    return result
