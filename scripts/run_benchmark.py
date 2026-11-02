"""Send the Ross benchmark questions to the chat API and build a results dashboard.

Reads a CSV with at least `id` and `question` columns, asks each question in its
own session, saves the replies in a new run directory, and writes a standalone
HTML dashboard next to them. A question written as "T1: ... T2: ..." is sent as
consecutive messages in one session.

Requests match what the production frontend sends, including the system prompt
as `custom_prompt`, so a run measures what students would see.

Usage:
    python3 scripts/run_benchmark.py --endpoint URL --bot-name NAME
    python3 scripts/run_benchmark.py --endpoint URL --bot-name NAME --tier quick
    python3 scripts/run_benchmark.py --endpoint URL --bot-name NAME --only-ids EC-10,AM-04
"""

import argparse
import csv
import hashlib
import http.client
import json
import os
import random
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from build_benchmark_dashboard import build_dashboard

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_QUESTIONS_FILE = REPO_ROOT / "fetched_site/questions/ross_benchmark.csv"
DEFAULT_PROMPT_FILE = REPO_ROOT / "christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt"
DEFAULT_RUNS_DIR = REPO_ROOT / "fetched_site/prompt_effectiveness_runs"
LEGACY_SHARED_ENDPOINT = "https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call"
REQUIRED_COLUMNS = {"id", "question"}
TURN_MARKER = re.compile(r"\bT\d+:\s*")
ERROR_SNIPPET_LENGTH = 300
UTC_TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def load_questions(questions_path: Path) -> list[dict[str, str]]:
    """Read benchmark questions from a CSV file.

    Args:
        questions_path (Path): CSV with `id` and `question` columns. Any other
            columns, such as `category` or `expected_response`, are kept so the
            dashboard can show them. Column names are normalized, so "Expected
            response" from a spreadsheet export becomes `expected_response`.

    Returns:
        list[dict[str, str]]: One dict per question in file order, with values
        stripped of surrounding whitespace. Fully blank rows are skipped.

    Raises:
        ValueError: If a required column is missing, or a row has a blank or
            repeated ID or a blank question.
    """
    # utf-8-sig drops the byte order mark that Excel adds to exported CSV files.
    with questions_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        reader.fieldnames = [
            re.sub(r"[^a-z0-9]+", "_", column.lower()).strip("_")
            for column in reader.fieldnames or []
        ]
        missing_columns = REQUIRED_COLUMNS.difference(reader.fieldnames)
        if missing_columns:
            raise ValueError(
                f"{questions_path} is missing columns: {', '.join(sorted(missing_columns))}"
            )

        questions = []
        seen_ids = set()
        for row_number, row in enumerate(reader, start=2):
            question = {
                column: (value or "").strip() for column, value in row.items() if column
            }
            if not any(question.values()):
                continue
            if not question["id"] or not question["question"]:
                raise ValueError(f"Row {row_number} needs both an id and a question.")
            if question["id"] in seen_ids:
                raise ValueError(f"Row {row_number} repeats the id {question['id']}.")
            seen_ids.add(question["id"])
            questions.append(question)
    return questions


def select_questions(
    questions: list[dict[str, str]], tier: str, only_ids: str | None
) -> list[dict[str, str]]:
    """Choose which questions a run should send.

    The Quick tier is the rows labeled Quick. The Extensive tier is the full
    benchmark, because the team's testing framework defines it as covering every
    question, so it includes the rows labeled Quick as well.

    Args:
        questions (list[dict[str, str]]): All questions from the CSV.
        tier (str): "quick" or "extensive".
        only_ids (str | None): Comma-separated IDs to keep, applied after the
            tier filter. None keeps every question in the tier.

    Returns:
        list[dict[str, str]]: The selected questions in their original order.

    Raises:
        ValueError: If `only_ids` names an ID that is not in the selected tier.
    """
    selected = questions
    if tier == "quick":
        selected = [
            question for question in selected if question.get("tier", "").lower() == "quick"
        ]
    if only_ids:
        wanted_ids = {question_id.strip() for question_id in only_ids.split(",")}
        unknown_ids = wanted_ids.difference(question["id"] for question in selected)
        if unknown_ids:
            raise ValueError(f"Unknown question IDs: {', '.join(sorted(unknown_ids))}")
        selected = [question for question in selected if question["id"] in wanted_ids]
    return selected


def is_legacy_endpoint(endpoint: str) -> bool:
    """Tell whether a URL is the historical shared endpoint.

    Args:
        endpoint (str): The URL requests would be sent to.

    Returns:
        bool: True if the URL, ignoring case, query and trailing slash, is that endpoint.
    """
    return endpoint.split("?")[0].split("#")[0].rstrip("/").lower() == LEGACY_SHARED_ENDPOINT


def validate_endpoint(endpoint: str, allow_legacy_endpoint: bool = False) -> None:
    """Reject endpoints that cannot be the assigned Ross API.

    Args:
        endpoint (str): The URL requests would be sent to.
        allow_legacy_endpoint (bool): Accept the historical shared endpoint, for a
            trial of the pipeline whose answers do not count as Ross results.

    Raises:
        ValueError: If the URL is not absolute http(s), or is the historical
            shared endpoint, which routes to a different bot, without permission.
    """
    if not re.match(r"https?://", endpoint):
        raise ValueError("Endpoint must be an absolute http(s) URL.")
    if is_legacy_endpoint(endpoint) and not allow_legacy_endpoint:
        raise ValueError(
            "The historical shared endpoint is not a Ross endpoint. "
            "Supply Christopher's assigned endpoint, or pass --allow-legacy-endpoint "
            "for a trial run that does not count as a Ross result."
        )


def split_into_turns(question_text: str) -> list[str]:
    """Split a multi-turn question into the messages to send in order.

    Args:
        question_text (str): Question text. Text starting with "T1:" holds
            several messages, each introduced by a marker such as "T2:".

    Returns:
        list[str]: The messages to send. Holds one item for an ordinary question.
    """
    if not question_text.startswith("T1:"):
        return [question_text]
    turns = [turn.strip() for turn in TURN_MARKER.split(question_text)]
    return [turn for turn in turns if turn] or [question_text]


def parse_response_body(body: bytes) -> dict:
    """Classify a 2xx response body the way the production frontend does.

    `Response` is the only required success field in the API contract, so a reply
    without `Sources`, `sessionId` or `questionId` still counts as received.

    Args:
        body (bytes): Raw HTTP response body.

    Returns:
        dict: `status` ("transport_ok", "api_error" or "invalid_response"),
        `error` (str or None), `response` (str or None), `sources` (list of
        dicts) and `session_id` (the service's session ID, or None).
    """
    outcome = {
        "status": "invalid_response",
        "error": None,
        "response": None,
        "sources": [],
        "session_id": None,
    }
    snippet = body[:ERROR_SNIPPET_LENGTH].decode("utf-8", errors="replace")
    try:
        parsed_body = json.loads(body)
    except ValueError:
        outcome["error"] = f"Response body is not JSON: {snippet}"
        return outcome
    if not isinstance(parsed_body, dict):
        outcome["error"] = f"Response body is not a JSON object: {snippet}"
        return outcome

    response_text = parsed_body.get("Response")
    if isinstance(response_text, str) and response_text.strip():
        outcome["response"] = response_text
    sources = parsed_body.get("Sources")
    if isinstance(sources, list):
        outcome["sources"] = [source for source in sources if isinstance(source, dict)]
    outcome["session_id"] = parsed_body.get("sessionId") or None

    api_error = parsed_body.get("error")
    if isinstance(api_error, str) and api_error:
        outcome["status"] = "api_error"
        outcome["error"] = api_error
    elif outcome["response"] is None:
        outcome["error"] = "Response field is missing or empty."
    else:
        outcome["status"] = "transport_ok"
    return outcome


def send_turn(endpoint: str, payload: dict, timeout_seconds: float) -> dict:
    """Send one message to the chat API and record what came back.

    Args:
        endpoint (str): Chat API URL.
        payload (dict): JSON request body.
        timeout_seconds (float): Seconds to wait before treating the request as failed.

    Returns:
        dict: The fields from `parse_response_body`, plus `http_status` (int or
        None when no response arrived) and `latency_seconds` (float). Network
        failures are returned with status "request_failed" and HTTP errors with
        status "http_error", so one bad question does not stop the run.
    """
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        method="POST",
    )
    failed_outcome = {"response": None, "sources": [], "session_id": None}
    started_at = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as http_response:
            http_status = http_response.status
            outcome = parse_response_body(http_response.read())
    except urllib.error.HTTPError as e:
        http_status = e.code
        with e:
            snippet = e.read()[:ERROR_SNIPPET_LENGTH].decode("utf-8", errors="replace")
        outcome = {
            **failed_outcome,
            "status": "http_error",
            "error": f"Endpoint returned HTTP {e.code}: {snippet}",
        }
    except (OSError, http.client.HTTPException) as e:
        http_status = None
        outcome = {**failed_outcome, "status": "request_failed", "error": str(e)}
    latency_seconds = round(time.monotonic() - started_at, 3)
    return {**outcome, "http_status": http_status, "latency_seconds": latency_seconds}


def ask_question(
    question: dict[str, str],
    endpoint: str,
    bot_name: str,
    custom_prompt: str | None,
    timeout_seconds: float,
) -> dict:
    """Send every message of one question in a single new session.

    Args:
        question (dict[str, str]): One row from the question CSV.
        endpoint (str): Chat API URL.
        bot_name (str): Bot the service should route to.
        custom_prompt (str | None): System prompt to send. None uses the prompt
            configured in the backend.
        timeout_seconds (float): Per-message request timeout.

    Returns:
        dict: The CSV row plus `session_id`, `status`, `error`, `latency_seconds`
        (total across turns) and `turns` (one record per message sent). A failed
        message ends the question, so `status` and `error` describe the last turn.
    """
    session_id = f"session-{int(time.time())}-{random.randrange(100000)}"
    safe_code = re.sub(r"[^A-Za-z0-9_-]", "", question["id"]) or "question"
    turns = []
    for message in split_into_turns(question["question"]):
        question_id = f"{safe_code}-{int(time.time())}-{random.randrange(100000)}"
        payload = {
            "action": "question",
            "bot_name": bot_name,
            "httpMethod": "POST",
            "userMessage": message,
            "sessionId": session_id,
            "questionId": question_id,
        }
        if custom_prompt is not None:
            payload["custom_prompt"] = custom_prompt

        turn = send_turn(endpoint, payload, timeout_seconds)
        # The frontend adopts a session ID returned by the service, so later turns do too.
        session_id = turn.pop("session_id") or session_id
        turns.append({"question": message, "question_id": question_id, **turn})
        if turn["status"] != "transport_ok":
            break

    return {
        **question,
        "session_id": session_id,
        "status": turns[-1]["status"],
        "error": turns[-1]["error"],
        "latency_seconds": round(sum(turn["latency_seconds"] for turn in turns), 3),
        "turns": turns,
    }


def write_run_record(run_record_path: Path, run_record: dict) -> None:
    """Save the run record, replacing the file in one step.

    The record is rewritten after each question, so stopping a long run keeps
    every answer received so far and never leaves a half-written file.

    Args:
        run_record_path (Path): Destination file.
        run_record (dict): JSON-serializable run record.
    """
    temporary_path = run_record_path.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(run_record, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temporary_path, run_record_path)


def to_repo_relative(path: Path) -> str:
    """Return `path` relative to the repository when possible.

    Keeps local home directories out of run records and dashboards that get shared.

    Args:
        path (Path): Any file path.

    Returns:
        str: The repository-relative path, or the original path if it lies outside.
    """
    resolved_path = path.resolve()
    if resolved_path.is_relative_to(REPO_ROOT):
        return str(resolved_path.relative_to(REPO_ROOT))
    return str(path)


def parse_arguments(argv: list[str] | None) -> argparse.Namespace:
    """Parse command-line options.

    Args:
        argv (list[str] | None): Arguments to parse. None reads `sys.argv`.

    Returns:
        argparse.Namespace: The parsed options.
    """
    parser = argparse.ArgumentParser(
        description="Run the Ross benchmark and build a results dashboard."
    )
    parser.add_argument(
        "--endpoint",
        default=os.environ.get("ROSS_API_ENDPOINT"),
        help="Assigned Ross API URL (or set ROSS_API_ENDPOINT).",
    )
    parser.add_argument(
        "--bot-name",
        default=os.environ.get("BOT_NAME"),
        help="Assigned Ross bot name (or set BOT_NAME).",
    )
    parser.add_argument(
        "--allow-legacy-endpoint",
        action="store_true",
        help="Allow the historical shared endpoint for a trial run. Its answers are not Ross results.",
    )
    parser.add_argument("--questions-file", type=Path, default=DEFAULT_QUESTIONS_FILE)
    parser.add_argument(
        "--tier",
        choices=["quick", "extensive"],
        default="extensive",
        help="quick: rows labeled Quick. extensive: every question (default).",
    )
    parser.add_argument("--only-ids", help="Comma-separated question IDs, such as EC-10,AM-04.")
    parser.add_argument("--prompt-file", type=Path, default=DEFAULT_PROMPT_FILE)
    parser.add_argument(
        "--no-custom-prompt",
        action="store_true",
        help="Send no custom_prompt, which tests the prompt configured in the backend.",
    )
    parser.add_argument("--runs-dir", type=Path, default=DEFAULT_RUNS_DIR)
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=60,
        help="Seconds to wait for a reply. The default matches the frontend, which gives up at 60.",
    )
    parser.add_argument("--sleep-seconds", type=float, default=0, help="Pause between questions.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Run the benchmark from start to finish.

    Args:
        argv (list[str] | None): Command-line arguments. None reads `sys.argv`.

    Returns:
        int: 0 if every question got a reply. 1 if any failed or the run was stopped.

    Raises:
        SystemExit: If the options or the input files are invalid.
    """
    arguments = parse_arguments(argv)
    if not arguments.bot_name:
        raise SystemExit("Error: --bot-name or BOT_NAME is required.")
    custom_prompt = None
    try:
        validate_endpoint(arguments.endpoint or "", arguments.allow_legacy_endpoint)
        selected = select_questions(
            load_questions(arguments.questions_file), arguments.tier, arguments.only_ids
        )
        if not arguments.no_custom_prompt:
            custom_prompt = arguments.prompt_file.read_text(encoding="utf-8")
    except (ValueError, OSError) as e:
        raise SystemExit(f"Error: {e}") from e
    if not selected:
        raise SystemExit("Error: no questions match the selected tier.")

    started_at = datetime.now(timezone.utc)
    run_id = f"{started_at:%Y%m%dT%H%M%SZ}_{random.randrange(100000)}"
    run_dir = arguments.runs_dir / run_id
    run_dir.mkdir(parents=True)
    shutil.copy(arguments.questions_file, run_dir / "questions_snapshot.csv")
    if custom_prompt is not None:
        (run_dir / "prompt_snapshot.txt").write_text(custom_prompt, encoding="utf-8")

    run_record_path = run_dir / "run_record.json"
    run_record = {
        "run_id": run_id,
        "started_at_utc": started_at.strftime(UTC_TIMESTAMP_FORMAT),
        "ended_at_utc": None,
        "total_questions": len(selected),
        "config": {
            "questions_file": to_repo_relative(arguments.questions_file),
            "tier": arguments.tier,
            "only_ids": arguments.only_ids,
            "bot_name": arguments.bot_name,
            "endpoint": arguments.endpoint,
            "uses_legacy_endpoint": is_legacy_endpoint(arguments.endpoint),
            "prompt_file": None if custom_prompt is None else to_repo_relative(arguments.prompt_file),
            "prompt_sha256": (
                None if custom_prompt is None else hashlib.sha256(custom_prompt.encode("utf-8")).hexdigest()
            ),
        },
        "results": [],
    }
    write_run_record(run_record_path, run_record)

    print(f"Sending {len(selected)} questions to {arguments.endpoint}")
    interrupted = False
    try:
        for position, question in enumerate(selected, start=1):
            result = ask_question(
                question, arguments.endpoint, arguments.bot_name, custom_prompt, arguments.timeout_seconds
            )
            run_record["results"].append(result)
            write_run_record(run_record_path, run_record)
            print(
                f"[{position}/{len(selected)}] {result['id']} {result['status']} "
                f"{result['latency_seconds']:.1f}s"
            )
            if arguments.sleep_seconds and position < len(selected):
                time.sleep(arguments.sleep_seconds)
    except KeyboardInterrupt:
        interrupted = True
        print("Stopped. Building the dashboard from the questions finished so far.")

    if not interrupted:
        run_record["ended_at_utc"] = datetime.now(timezone.utc).strftime(UTC_TIMESTAMP_FORMAT)
        write_run_record(run_record_path, run_record)
    dashboard_path = build_dashboard(run_record_path)

    failed_count = sum(1 for result in run_record["results"] if result["status"] != "transport_ok")
    print(f"Replies received: {len(run_record['results']) - failed_count} of {len(selected)}")
    print(f"Failed: {failed_count}")
    print(f"Run record: {to_repo_relative(run_record_path)}")
    print(f"Dashboard: {to_repo_relative(dashboard_path)}")
    return 1 if failed_count or interrupted else 0


if __name__ == "__main__":
    sys.exit(main())
