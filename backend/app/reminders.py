import logging
import os
import secrets
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Header, HTTPException

from .supabase_client import get_admin_client

router = APIRouter()
logger = logging.getLogger("synaptiq")

RESEND_FROM_EMAIL = os.environ.get("REMINDER_FROM_EMAIL", "onboarding@resend.dev")


def _send_email(to_email: str, subject: str, html: str) -> None:
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
        json={
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=15,
    )
    response.raise_for_status()


def _reminder_email_html(entries: list[dict]) -> str:
    rows = "".join(
        f"<li><strong>{e['filename']}</strong> — {e['days_left']} "
        f"day{'s' if e['days_left'] != 1 else ''} left "
        f"(exam on {e['exam_date']})</li>"
        for e in entries
    )
    return (
        "<p>Here's where your study plans stand:</p>"
        f"<ul>{rows}</ul>"
        '<p><a href="https://synaptiq-eta.vercel.app/dashboard">Keep studying →</a></p>'
    )


@router.post("/reminders/send")
def send_reminders(authorization: str | None = Header(default=None)):
    expected = f"Bearer {os.environ['REMINDER_CRON_SECRET']}"
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")

    admin = get_admin_client()
    today = datetime.now(timezone.utc).date()

    documents = (
        admin.table("documents")
        .select("id, filename, user_id, exam_date")
        .not_.is_("exam_date", None)
        .gte("exam_date", today.isoformat())
        .execute()
        .data
        or []
    )

    by_user: dict[str, list[dict]] = defaultdict(list)
    for doc in documents:
        exam_date = datetime.fromisoformat(doc["exam_date"]).date()
        by_user[doc["user_id"]].append(
            {
                "filename": doc["filename"],
                "exam_date": doc["exam_date"],
                "days_left": (exam_date - today).days,
            }
        )

    sent = 0
    failed = 0
    for user_id, entries in by_user.items():
        try:
            user_result = admin.auth.admin.get_user_by_id(user_id)
        except Exception:
            logger.exception("Reminder: couldn't look up user %s", user_id)
            failed += 1
            continue
        email = user_result.user.email if user_result and user_result.user else None
        if not email:
            logger.warning("Reminder: user %s has no email on file", user_id)
            failed += 1
            continue

        entries.sort(key=lambda e: e["days_left"])
        subject = f"{entries[0]['days_left']} day{'s' if entries[0]['days_left'] != 1 else ''} until your next exam"
        try:
            _send_email(email, subject, _reminder_email_html(entries))
            sent += 1
        except Exception:
            logger.exception("Reminder: failed to send to %s", email)
            failed += 1

    return {"sent": sent, "failed": failed}
