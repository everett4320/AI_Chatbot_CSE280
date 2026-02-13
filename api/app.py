import json
import os
from pathlib import Path
import sqlite3
import time
import urllib.error
import urllib.request
import uuid

from flask import Flask, abort, jsonify, request

app = Flask(__name__)

DB_PATH = os.getenv("DATABASE_PATH", "/data/app.db")
KB_DIR = os.getenv("KB_DIR", "/knowledge_base")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip() or "gemini-1.5-flash"

try:
    DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "30"))
except ValueError:
    DATA_RETENTION_DAYS = 30

ENABLE_DEV_ENDPOINTS = os.getenv("ENABLE_DEV_ENDPOINTS", "0").strip().lower() in {
    "1",
    "true",
    "yes",
}

_DB_ERROR: str | None = None


def _utc_now_epoch() -> int:
    return int(time.time())


def _utc_now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    global _DB_ERROR
    try:
        Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        with _db_connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA foreign_keys=ON;")

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_conversations (
                  id TEXT PRIMARY KEY,
                  created_at INTEGER NOT NULL
                )
                """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  conversation_id TEXT NOT NULL,
                  role TEXT NOT NULL,
                  content TEXT NOT NULL,
                  created_at INTEGER NOT NULL,
                  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)"
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS api_metrics (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  endpoint TEXT NOT NULL,
                  status_code INTEGER NOT NULL,
                  duration_ms INTEGER NOT NULL,
                  created_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_api_metrics_created_at ON api_metrics(created_at)"
            )

        _DB_ERROR = None
    except Exception as exc:  # noqa: BLE001 - keep demo resilient
        _DB_ERROR = f"{type(exc).__name__}: {exc}"


def _apply_retention() -> None:
    if DATA_RETENTION_DAYS <= 0:
        return
    cutoff = _utc_now_epoch() - (DATA_RETENTION_DAYS * 24 * 60 * 60)
    with _db_connect() as conn:
        conn.execute("DELETE FROM chat_messages WHERE created_at < ?", (cutoff,))
        conn.execute("DELETE FROM api_metrics WHERE created_at < ?", (cutoff,))
        conn.execute(
            """
            DELETE FROM chat_conversations
            WHERE id NOT IN (SELECT DISTINCT conversation_id FROM chat_messages)
            """
        )


def _record_metric(endpoint: str, status_code: int, duration_ms: int) -> None:
    with _db_connect() as conn:
        conn.execute(
            """
            INSERT INTO api_metrics (endpoint, status_code, duration_ms, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (endpoint, status_code, duration_ms, _utc_now_epoch()),
        )


def _require_dev_endpoints() -> None:
    if not ENABLE_DEV_ENDPOINTS:
        abort(404)


def _list_knowledge_base_files() -> list[Path]:
    kb_path = Path(KB_DIR)
    if not kb_path.exists() or not kb_path.is_dir():
        return []
    return [p for p in sorted(kb_path.rglob("*.md")) if p.is_file()]


def _knowledge_base_stats() -> dict[str, int]:
    total_bytes = 0
    files = _list_knowledge_base_files()
    for path in files:
        try:
            total_bytes += path.stat().st_size
        except OSError:
            continue
    return {"files": len(files), "bytes": total_bytes}


def _read_knowledge_base_text() -> str:
    kb_path = Path(KB_DIR)
    files = _list_knowledge_base_files()
    if not files:
        return ""

    chunks: list[str] = []
    for path in files:
        rel = str(path.relative_to(kb_path).as_posix())
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        chunks.append(f"[FILE: {rel}]\n{content}".strip())
    return "\n\n---\n\n".join(chunks).strip()


def _load_conversation_history(
    conn: sqlite3.Connection, conversation_id: str, max_messages: int = 20
) -> list[tuple[str, str]]:
    rows = conn.execute(
        """
        SELECT role, content
        FROM chat_messages
        WHERE conversation_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (conversation_id, max_messages),
    ).fetchall()
    history = [(r["role"], r["content"]) for r in reversed(rows)]
    return history


def _conversation_as_text(history: list[tuple[str, str]]) -> str:
    lines: list[str] = []
    for role, content in history:
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content}")
    return "\n".join(lines).strip()


def _build_gemini_prompt(knowledge_base: str, conversation_text: str) -> str:
    return (
        "You are an AI chatbot embedded on a university engineering website.\n"
        "Use the provided Knowledge Base as your source of truth.\n"
        "If the Knowledge Base does not contain the answer, say you do not have that information.\n"
        "Do not request or store sensitive personal data.\n\n"
        "Knowledge Base:\n"
        f"{knowledge_base}\n\n"
        "Conversation:\n"
        f"{conversation_text}\n\n"
        "Assistant:"
    )


def _call_gemini(prompt_text: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set.")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt_text}],
            }
        ]
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTPError {exc.code}: {raw}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Gemini URLError: {exc}") from exc

    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    parts = ((candidates[0].get("content") or {}).get("parts") or [])
    text = "".join((p.get("text") or "") for p in parts if isinstance(p, dict)).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response.")
    return text


@app.get("/health")
def health():
    kb_stats = _knowledge_base_stats()
    payload: dict[str, object] = {
        "status": "ok" if _DB_ERROR is None else "degraded",
        "time": _utc_now_iso(),
        "db": "ok" if _DB_ERROR is None else "error",
        "knowledge_base_files": kb_stats["files"],
        "knowledge_base_bytes": kb_stats["bytes"],
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_model": GEMINI_MODEL,
    }

    if _DB_ERROR is not None:
        payload["db_error"] = _DB_ERROR
        return jsonify(payload), 200

    with _db_connect() as conn:
        payload["conversations"] = conn.execute(
            "SELECT COUNT(*) AS n FROM chat_conversations"
        ).fetchone()["n"]
        payload["messages"] = conn.execute("SELECT COUNT(*) AS n FROM chat_messages").fetchone()["n"]
        payload["metrics"] = conn.execute("SELECT COUNT(*) AS n FROM api_metrics").fetchone()["n"]

    return jsonify(payload), 200


@app.post("/chat")
def chat():
    start = time.perf_counter()
    status_code = 500

    try:
        if _DB_ERROR is not None:
            status_code = 500
            return jsonify({"reply": "Database not available."}), status_code

        payload = request.get_json(silent=True) or {}
        message = (payload.get("message") or "").strip()
        if not message:
            status_code = 400
            return jsonify({"reply": "Please enter a message."}), status_code

        conversation_id = (payload.get("conversation_id") or "").strip()
        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        now = _utc_now_epoch()
        with _db_connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO chat_conversations (id, created_at) VALUES (?, ?)",
                (conversation_id, now),
            )
            conn.execute(
                """
                INSERT INTO chat_messages (conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (conversation_id, "user", message, now),
            )

            if GEMINI_API_KEY:
                knowledge_base = _read_knowledge_base_text()
                conversation_text = _conversation_as_text(
                    _load_conversation_history(conn, conversation_id, max_messages=20)
                )
                prompt_text = _build_gemini_prompt(knowledge_base, conversation_text)
                try:
                    reply = _call_gemini(prompt_text)
                except Exception as exc:  # noqa: BLE001
                    status_code = 502
                    return jsonify({"reply": f"Gemini request failed: {exc}"}), status_code
            else:
                reply = f"Echo: {message} (GEMINI_API_KEY not set, demo is echo mode)"

            conn.execute(
                """
                INSERT INTO chat_messages (conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (conversation_id, "bot", reply, now),
            )

        status_code = 200
        return jsonify({"conversation_id": conversation_id, "reply": reply}), status_code
    finally:
        duration_ms = int((time.perf_counter() - start) * 1000)
        if _DB_ERROR is None:
            try:
                _record_metric("chat", status_code, duration_ms)
            except Exception:
                pass


@app.get("/dev/metrics")
def dev_metrics():
    _require_dev_endpoints()
    if _DB_ERROR is not None:
        return jsonify({"error": _DB_ERROR}), 500
    with _db_connect() as conn:
        total = conn.execute(
            "SELECT COUNT(*) AS n FROM api_metrics WHERE endpoint = 'chat'"
        ).fetchone()["n"]
        avg_last_100 = conn.execute(
            """
            SELECT AVG(duration_ms) AS avg_ms
            FROM (
              SELECT duration_ms
              FROM api_metrics
              WHERE endpoint = 'chat'
              ORDER BY id DESC
              LIMIT 100
            )
            """
        ).fetchone()["avg_ms"]
    return jsonify({"chat_requests": total, "avg_duration_ms_last_100": avg_last_100})


@app.get("/dev/conversations")
def dev_conversations():
    _require_dev_endpoints()
    if _DB_ERROR is not None:
        return jsonify({"error": _DB_ERROR}), 500
    limit = request.args.get("limit", "20")
    try:
        limit_int = max(1, min(100, int(limit)))
    except ValueError:
        limit_int = 20

    with _db_connect() as conn:
        rows = conn.execute(
            """
            SELECT
              c.id AS conversation_id,
              c.created_at AS created_at,
              (
                SELECT m.content
                FROM chat_messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.id DESC
                LIMIT 1
              ) AS last_message
            FROM chat_conversations c
            ORDER BY c.created_at DESC
            LIMIT ?
            """,
            (limit_int,),
        ).fetchall()
    return jsonify(
        {
            "count": len(rows),
            "conversations": [
                {
                    "conversation_id": r["conversation_id"],
                    "created_at": r["created_at"],
                    "last_message": r["last_message"],
                }
                for r in rows
            ],
        }
    )


_init_db()
if _DB_ERROR is None:
    _apply_retention()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
