from app.imports.jane_import import clean_str, parse_date, parse_datetime
from datetime import date


# ── clean_str() tests ────────────────────────────────────────

def test_clean_str_removes_nan_string():
    assert clean_str("nan") is None
    assert clean_str("NaN") is None

def test_clean_str_removes_none_string():
    assert clean_str("none") is None
    assert clean_str("None") is None

def test_clean_str_removes_empty_string():
    assert clean_str("") is None
    assert clean_str("   ") is None

def test_clean_str_handles_actual_none():
    assert clean_str(None) is None

def test_clean_str_keeps_valid_text():
    assert clean_str("John") == "John"

def test_clean_str_strips_whitespace():
    assert clean_str("  Sarah  ") == "Sarah"

def test_clean_str_removes_nat_string():
    # pandas sometimes exports missing dates as "NaT"
    assert clean_str("NaT") is None

def test_clean_str_removes_n_a_string():
    assert clean_str("n/a") is None


# ── parse_date() tests ───────────────────────────────────────

def test_parse_date_handles_utc_timestamp_format():
    # Jane exports dates like "2024-08-27 18:30:00 UTC"
    result = parse_date("2024-08-27 18:30:00 UTC")
    assert result == date(2024, 8, 27)

def test_parse_date_handles_us_slash_format():
    # Jane exports birth dates like "11/8/1986" (month/day/year)
    result = parse_date("11/8/1986")
    assert result == date(1986, 11, 8)

def test_parse_date_handles_iso_format():
    result = parse_date("2024-01-15")
    assert result == date(2024, 1, 15)

def test_parse_date_returns_none_for_empty_string():
    assert parse_date("") is None

def test_parse_date_returns_none_for_nan_string():
    assert parse_date("nan") is None

def test_parse_date_returns_none_for_none():
    assert parse_date(None) is None

def test_parse_date_returns_none_for_garbage_input():
    assert parse_date("not a date") is None

def test_parse_date_returns_none_for_nat_string():
    assert parse_date("NaT") is None


# ── parse_datetime() tests ───────────────────────────────────

def test_parse_datetime_handles_valid_timestamp():
    result = parse_datetime("2024-08-27 18:30:00")
    assert result is not None
    assert result.year == 2024
    assert result.month == 8
    assert result.day == 27

def test_parse_datetime_returns_none_for_empty_string():
    assert parse_datetime("") is None

def test_parse_datetime_returns_none_for_none():
    assert parse_datetime(None) is None