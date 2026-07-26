from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.campaign import Campaign, CampaignRecipient
from app.models.customer import Customer
from app.models.settings import Setting
from app.api.v1.audit_log import log_action
from app.schemas.marketing import PreviewSegment, CreateCampaign, UpdateCampaign, SendSmsSingle
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
def preview_segment(data: PreviewSegment, db: Session = Depends(get_db)):
    customers = _filter_customers(db, data.segment_filter, data.branch_id)
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
def create_campaign(data: CreateCampaign, db: Session = Depends(get_db)):
    c = Campaign(
        name=data.name,
        type=data.type,
        subject=data.subject,
        content=data.content,
        status="draft",
        segment_filter=json.dumps(data.segment_filter),
        scheduled_at=datetime.fromisoformat(data.scheduled_at) if data.scheduled_at else None,
        created_by=data.created_by,
        branch_id=data.branch_id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    log_action(db, "create", "campaign", c.id, details=f"Ustvarjena kampanja: {c.name}")
    return {"id": c.id, "status": c.status}


@router.put("/campaigns/{campaign_id}")
def update_campaign(campaign_id: int, data: UpdateCampaign, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if data.name is not None:
        c.name = data.name
    if data.type is not None:
        c.type = data.type
    if data.subject is not None:
        c.subject = data.subject
    if data.content is not None:
        c.content = data.content
    if data.status is not None:
        c.status = data.status
    if data.segment_filter is not None:
        c.segment_filter = json.dumps(data.segment_filter)
    if data.scheduled_at is not None:
        c.scheduled_at = datetime.fromisoformat(data.scheduled_at) if data.scheduled_at else None
    db.commit()
    log_action(db, "update", "campaign", c.id, details=f"Posodobljena kampanja: {c.name}")
    return {"id": c.id, "status": c.status}


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == campaign_id).delete()
    db.delete(c)
    db.commit()
    log_action(db, "delete", "campaign", campaign_id, details="Izbrisana kampanja")
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

    setting_keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "sms_provider", "sms_api_key", "sms_sender"]
    settings_rows = db.query(Setting).filter(Setting.key.in_(setting_keys)).all()
    settings = {s.key: s for s in settings_rows}
    smtp_host = settings.get("smtp_host")
    smtp_port = settings.get("smtp_port")
    smtp_user = settings.get("smtp_user")
    smtp_pass = settings.get("smtp_pass")
    sms_provider = settings.get("sms_provider")
    sms_api_key = settings.get("sms_api_key")
    sms_sender = settings.get("sms_sender")

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
                except Exception:
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
            except Exception:
                pass
            rec = CampaignRecipient(campaign_id=c.id, customer_id=cust.id, sent_at=datetime.now())
            db.add(rec)
            sent += 1

    c.sent_count = sent
    c.status = "sent"
    c.sent_at = datetime.now()
    db.commit()
    log_action(db, "send", "campaign", c.id, details=f"Poslana kampanja: {c.name}, {sent} prejemnikov")
    return {"sent": sent, "total": len(customers)}


@router.post("/sms/send")
def send_sms_single(data: SendSmsSingle, db: Session = Depends(get_db)):
    from app.core.sms_service import send_sms as send_svc
    setting_keys = ["sms_provider", "sms_api_key", "sms_sender"]
    settings_rows = db.query(Setting).filter(Setting.key.in_(setting_keys)).all()
    settings = {s.key: s for s in settings_rows}
    sms_provider = settings.get("sms_provider")
    sms_api_key = settings.get("sms_api_key")
    sms_sender = settings.get("sms_sender")
    phone = data.phone
    message = data.message
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
    customer_ids = list({r.customer_id for r in recs})
    customers = {c.id: c for c in db.query(Customer).filter(Customer.id.in_(customer_ids)).all()} if customer_ids else {}
    result = []
    for r in recs:
        cust = customers.get(r.customer_id)
        result.append({
            "id": r.id, "customer_id": r.customer_id,
            "customer_name": cust.name if cust else "?",
            "customer_email": cust.email if cust else "",
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            "opened_at": r.opened_at.isoformat() if r.opened_at else None,
        })
    return result
