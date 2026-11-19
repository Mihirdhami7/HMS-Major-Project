"""
Calendar periods for super admin charts.

    week     this week (Mon-Sun), one bucket per day
    month    this month, one bucket per day
    quarter  this quarter, one bucket per week (Monday start)
    year     this year, one bucket per month
    all      first data month .. this month, one bucket per month

Each period also has the previous period of the same length (for "vs last ..." on cards).
Dates are compared as 'YYYY-MM-DD' strings (appointments store dates that way).
"""
from datetime import date, datetime, timedelta

PERIODS = ("week", "month", "quarter", "year", "all")
PERIOD_LABELS = {"week": "this week", "month": "this month", "quarter": "this quarter",
                 "year": "this year", "all": "all time"}


def _month_start(d):
    return d.replace(day=1)


def _add_months(d, n):
    m = d.month - 1 + n
    return date(d.year + m // 12, m % 12 + 1, 1)


def period_range(period, today=None, first_date=None):
    """(start, end) inclusive dates for the period that contains today."""
    today = today or date.today()
    if period == "week":
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    if period == "month":
        start = _month_start(today)
        return start, _add_months(start, 1) - timedelta(days=1)
    if period == "quarter":
        start = date(today.year, (today.month - 1) // 3 * 3 + 1, 1)
        return start, _add_months(start, 3) - timedelta(days=1)
    if period == "year":
        return date(today.year, 1, 1), date(today.year, 12, 31)
    # all time
    start = _month_start(first_date or today)
    return start, _add_months(_month_start(today), 1) - timedelta(days=1)


def previous_range(period, start, _end=None):
    """Same-length period right before (None for all time)."""
    if period == "all":
        return None
    if period == "week":
        return start - timedelta(days=7), start - timedelta(days=1)
    if period == "month":
        prev = _add_months(start, -1)
        return prev, start - timedelta(days=1)
    if period == "quarter":
        prev = _add_months(start, -3)
        return prev, start - timedelta(days=1)
    return date(start.year - 1, 1, 1), date(start.year - 1, 12, 31)


def buckets(period, start, end):
    """[{key, label, start, end}] covering the period."""
    out = []
    if period in ("week", "month"):
        d = start
        while d <= end:
            label = d.strftime("%a %d") if period == "week" else str(d.day)
            out.append({"key": d.isoformat(), "label": label, "start": d, "end": d})
            d += timedelta(days=1)
    elif period == "quarter":
        d = start - timedelta(days=start.weekday())
        while d <= end:
            out.append({"key": d.isoformat(), "label": d.strftime("%d %b"), "start": max(d, start),
                        "end": min(d + timedelta(days=6), end)})
            d += timedelta(days=7)
    else:
        d = start
        while d <= end:
            nxt = _add_months(d, 1)
            label = d.strftime("%b") if period == "year" else d.strftime("%b %y")
            out.append({"key": d.isoformat(), "label": label, "start": d, "end": nxt - timedelta(days=1)})
            d = nxt
    return out


def bucket_index(bucket_list):
    """Function: 'YYYY-MM-DD' -> bucket position (or None)."""
    def find(day):
        if not day:
            return None
        for i, b in enumerate(bucket_list):
            if b["start"].isoformat() <= day <= b["end"].isoformat():
                return i
        return None
    return find


def day_of(value):
    """'YYYY-MM-DD' from a date string or datetime (None if missing)."""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    return None


def in_range(day, start, end):
    return bool(day) and start.isoformat() <= day <= end.isoformat()


def pct_change(current, previous):
    if previous in (None, 0):
        return None
    return round((current - previous) * 100.0 / previous, 1)
