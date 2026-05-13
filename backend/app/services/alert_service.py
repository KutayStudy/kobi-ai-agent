from sqlmodel import Session, select
from app.models import Alert


def create_alert(session: Session, type_: str, message: str):
    existing_alert = session.exec(select(Alert).where(Alert.type == type_, Alert.message == message, Alert.resolved == False)).first()

    if existing_alert:
        return existing_alert

    alert = Alert(type=type_, message=message)

    session.add(alert)
    session.commit()
    session.refresh(alert)

    return alert