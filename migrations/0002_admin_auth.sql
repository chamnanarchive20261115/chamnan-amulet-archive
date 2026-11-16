-- Chamnan Archive administrator OTP and session storage.
-- Apply this migration to the existing chamnan-archive-db D1 database.
CREATE TABLE IF NOT EXISTS admin_login_otps (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_email
  ON admin_sessions(email);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry
  ON admin_sessions(expires_at);
