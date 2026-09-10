from pathlib import Path


ROOT = Path(__file__).parents[3]
MIGRATIONS = "\n".join(path.read_text(encoding="utf-8") for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql")))


def test_core_user_tables_enable_rls_and_ownership_policies():
    for table in ("profiles", "student_subjects", "assignments", "attendance_records", "reminders", "documents", "chat_sessions", "document_chunks"):
        assert f"alter table public.{table} enable row level security" in MIGRATIONS
    assert "profiles are editable by their owner" in MIGRATIONS
    assert "roles are visible to their owner" in MIGRATIONS
    assert "with check ((select auth.uid()) = user_id)" in MIGRATIONS


def test_storage_is_private_and_user_scoped():
    assert "'academic-documents', 'academic-documents', false" in MIGRATIONS
    assert "'avatars', 'avatars', false" in MIGRATIONS
    assert "(storage.foldername(name))[1] = (select auth.uid()::text)" in MIGRATIONS
