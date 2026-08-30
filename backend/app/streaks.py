from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Header

from .documents import get_user_id
from .supabase_client import get_admin_client

router = APIRouter()


def record_study_session(admin, user_id: str, questions_count: int, correct_count: int) -> None:
    """Upserts today's row in study_sessions, incrementing rather than
    overwriting - a user may submit several small batches of answers
    (diagnostic, practice, topic quizzes) across one sitting."""
    if questions_count <= 0:
        return

    today = datetime.now(timezone.utc).date().isoformat()
    result = (
        admin.table("study_sessions")
        .select("id, questions_answered, correct_answered")
        .eq("user_id", user_id)
        .eq("session_date", today)
        .maybe_single()
        .execute()
    )
    existing = result.data if result else None
    if existing:
        admin.table("study_sessions").update(
            {
                "questions_answered": existing["questions_answered"] + questions_count,
                "correct_answered": existing["correct_answered"] + correct_count,
            }
        ).eq("id", existing["id"]).execute()
    else:
        admin.table("study_sessions").insert(
            {
                "user_id": user_id,
                "session_date": today,
                "questions_answered": questions_count,
                "correct_answered": correct_count,
            }
        ).execute()


@router.get("/streaks")
def get_streaks(authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    sessions = (
        admin.table("study_sessions")
        .select("session_date, questions_answered, correct_answered")
        .eq("user_id", user_id)
        .order("session_date", desc=True)
        .limit(30)
        .execute()
        .data
        or []
    )

    session_dates = {date.fromisoformat(s["session_date"]) for s in sessions}
    today = datetime.now(timezone.utc).date()

    # A streak still counts as "current" if today hasn't been studied yet
    # but yesterday was - the day isn't over. It breaks once a full day is
    # skipped.
    cursor = today if today in session_dates else today - timedelta(days=1)
    current_streak = 0
    while cursor in session_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    return {"current_streak": current_streak, "history": sessions}
