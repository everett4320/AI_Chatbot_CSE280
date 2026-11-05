"""Send the Ross benchmark questions to the chat API and build a results dashboard.

Reads a CSV with at least `id` and `question` columns, asks each question in its
own session, saves the replies in a new run directory, and writes a standalone
HTML dashboard next to them. A question written as "T1: ... T2: ..." is sent as
consecutive messages in one session.

Up to 16 questions are sent at the same time. The messages of one multi-turn
question are still sent one after another, because each depends on the last.

A message that fails with a network error, a timeout, HTTP 429 or a 5xx status
is sent again, up to 3 attempts in total. Errors the service reports in its JSON
body, malformed replies and other 4xx statuses are not retried.

Before sending anything, the script reads the chat API URL, the bot name and the
system prompt from the deployed site at https://ross.cc.lehigh.edu/, so every
request is the one the site sends when someone asks the same question in a new
chat. The knowledge base lives in the backend, so both use the same one. A run
with --prompt-file, --no-custom-prompt or --endpoint is marked as not matching
the site.

Usage:
    python3 scripts/run_benchmark.py
    python3 scripts/run_benchmark.py --tier quick
    python3 scripts/run_benchmark.py --only-ids EC-10,AM-04
    python3 scripts/run_benchmark.py --prompt-file my_prompt.txt
"""

import argparse
import csv
import hashlib
import http.client
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

REPO_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_TEMPLATE_PATH = Path(__file__).resolve().parent / "benchmark_dashboard_template.html"
RUN_RECORD_PLACEHOLDER = "__RUN_RECORD_JSON__"
DEFAULT_QUESTIONS_FILE = REPO_ROOT / "fetched_site/questions/ross_benchmark.csv"
# Only compared with the site's prompt, so the run can say whether the two differ.
REPO_PROMPT_FILE = REPO_ROOT / "christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt"
DEFAULT_RUNS_DIR = REPO_ROOT / "fetched_site/test_prompt"
DEFAULT_SITE_URL = "https://ross.cc.lehigh.edu/"
# Run folders are named by their start time in US Eastern time, such as 11-05_15-18-01.
RUN_FOLDER_TIME_ZONE = "America/New_York"
RUN_FOLDER_TIME_FORMAT = "%m-%d_%H-%M-%S"
MAX_CONCURRENT_REQUESTS = 16
MAX_ATTEMPTS_PER_MESSAGE = 3
RETRY_DELAY_SECONDS = 2
RETRYABLE_HTTP_STATUSES = {429, 500, 502, 503, 504}
REQUIRED_COLUMNS = {"id", "question"}
TURN_MARKER = re.compile(r"\bT\d+:\s*")
ERROR_SNIPPET_LENGTH = 300
UTC_TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

# The deployed site is a static build: the chat API URL, the bot name and the full
# system prompt are written into its JavaScript, and these patterns find them there.
# The site loads a few dozen scripts at most; the limit stops a runaway crawl.
MAX_SITE_SCRIPT_FILES = 40
SITE_SCRIPT_REFERENCE = re.compile(r"(?:/assets/|\./)([A-Za-z0-9_.-]+\.js)\b")
SITE_PROMPT_LITERAL = re.compile(r'custom_prompt:\s*(`(?:[^`\\]|\\[\s\S])*`|"(?:[^"\\]|\\.)*")')
SITE_ENDPOINT_LITERAL = re.compile(
    r'"(https://[A-Za-z0-9.-]+\.execute-api\.[A-Za-z0-9-]+\.amazonaws\.com/[^"]*)"'
)
# The frontend trims its configured bot name, which the build turns into "name".trim().
SITE_BOT_NAME_LITERAL = re.compile(r'"([^"\\]+)"\.trim\(\)')
SITE_REQUEST_HEADERS = {"User-Agent": "ross-benchmark"}
JAVASCRIPT_ESCAPE = re.compile(r"\\(u\{[0-9A-Fa-f]+\}|u[0-9A-Fa-f]{4}|x[0-9A-Fa-f]{2}|\r\n|[\s\S])")
SINGLE_CHARACTER_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}


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

    Several questions can be asked at once from different threads, because each
    call uses its own session and shares no state with the others.

    A message that fails in a way that may be temporary (no response, a timeout,
    HTTP 429 or a 5xx status) is sent again after a growing pause, up to
    `MAX_ATTEMPTS_PER_MESSAGE` attempts. Each attempt gets a new question ID.

    Args:
        question (dict[str, str]): One row from the question CSV.
        endpoint (str): Chat API URL.
        bot_name (str): Bot the service should route to.
        custom_prompt (str | None): System prompt to send. None uses the prompt
            configured in the backend.
        timeout_seconds (float): Per-attempt request timeout.

    Returns:
        dict: The CSV row plus `session_id`, `status`, `error`, `latency_seconds`
        (total of the final attempts), `retries` (extra attempts across all
        messages) and `turns` (one record per message, including its `attempts`).
        A failed message ends the question, so `status` and `error` describe the
        last turn.
    """
    # Random UUIDs, as the frontend uses, keep questions that start in the same
    # second from sharing a session.
    session_id = f"session-{uuid.uuid4()}"
    safe_code = re.sub(r"[^A-Za-z0-9_-]", "", question["id"]) or "question"
    turns = []
    for message in split_into_turns(question["question"]):
        for attempt in range(1, MAX_ATTEMPTS_PER_MESSAGE + 1):
            question_id = f"{safe_code}-{uuid.uuid4()}"
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
            may_succeed_on_retry = turn["status"] == "request_failed" or (
                turn["status"] == "http_error" and turn["http_status"] in RETRYABLE_HTTP_STATUSES
            )
            if not may_succeed_on_retry or attempt == MAX_ATTEMPTS_PER_MESSAGE:
                break
            # Wait longer before each new attempt so an overloaded service can recover.
            time.sleep(RETRY_DELAY_SECONDS * 2 ** (attempt - 1))

        # The frontend adopts a session ID returned by the service, so later turns do too.
        session_id = turn.pop("session_id") or session_id
        turns.append({"question": message, "question_id": question_id, "attempts": attempt, **turn})
        if turn["status"] != "transport_ok":
            break

    return {
        **question,
        "session_id": session_id,
        "status": turns[-1]["status"],
        "error": turns[-1]["error"],
        "latency_seconds": round(sum(turn["latency_seconds"] for turn in turns), 3),
        "retries": sum(turn["attempts"] - 1 for turn in turns),
        "turns": turns,
    }


def decode_javascript_escape(match: re.Match) -> str:
    """Return the character that one JavaScript escape sequence stands for.

    Args:
        match (re.Match): A match of `JAVASCRIPT_ESCAPE`; group 1 is the text after
            the backslash.

    Returns:
        str: The decoded character, or an empty string for a line continuation.
    """
    escape = match.group(1)
    if escape in ("\n", "\r", "\r\n"):
        return ""
    if escape.startswith("u{"):
        return chr(int(escape[2:-1], 16))
    if escape[0] in "ux" and len(escape) > 1:
        return chr(int(escape[1:], 16))
    return SINGLE_CHARACTER_ESCAPES.get(escape, escape)


def decode_javascript_string(literal: str) -> str:
    """Turn a JavaScript string or template literal into the text it holds.

    Args:
        literal (str): The literal as written in the bundle, including its
            surrounding double quotes or backticks.

    Returns:
        str: The text value of the literal.

    Raises:
        ValueError: If a template literal contains a `${...}` expression, whose
            value cannot be known without running the site's code.
    """
    body = literal[1:-1]
    if literal.startswith("`") and re.search(r"(?<!\\)\$\{", body):
        raise ValueError("The site's prompt contains a ${...} expression and cannot be read as plain text.")
    return JAVASCRIPT_ESCAPE.sub(decode_javascript_escape, body)


def fetch_site_text(url: str, timeout_seconds: float) -> str:
    """Download one page or script from the deployed site as text.

    Args:
        url (str): Absolute URL to fetch.
        timeout_seconds (float): Seconds to wait before giving up.

    Returns:
        str: The response body decoded as UTF-8.

    Raises:
        OSError: If the request fails or the server returns an error status.
    """
    request = urllib.request.Request(url, headers=SITE_REQUEST_HEADERS)
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        return response.read().decode("utf-8", errors="replace")


def read_live_site_settings(site_url: str, timeout_seconds: float) -> dict[str, str]:
    """Read the chat API URL, bot name and system prompt from the deployed site.

    The site writes these values into its JavaScript at build time, so they can
    differ from the files in this repository. Downloading the page and the
    scripts it loads, and taking the values from there, makes a run send exactly
    what the site sends. Each value must appear exactly once, so a changed build
    stops the run instead of silently sending something else.

    Args:
        site_url (str): Address of the deployed site, such as
            https://ross.cc.lehigh.edu/.
        timeout_seconds (float): Per-request timeout for each download.

    Returns:
        dict[str, str]: `endpoint`, `bot_name` and `custom_prompt` as the site
        sends them.

    Raises:
        OSError: If the site or one of its scripts cannot be downloaded.
        ValueError: If any of the three values is missing or appears more than
            once with different contents.
    """
    if not site_url.endswith("/"):
        site_url += "/"
    page = fetch_site_text(site_url, timeout_seconds)
    pending_scripts = list(dict.fromkeys(SITE_SCRIPT_REFERENCE.findall(page)))
    fetched_scripts = set()
    script_texts = []
    while pending_scripts and len(fetched_scripts) < MAX_SITE_SCRIPT_FILES:
        script_name = pending_scripts.pop()
        if script_name in fetched_scripts:
            continue
        fetched_scripts.add(script_name)
        script_text = fetch_site_text(urllib.parse.urljoin(site_url, f"assets/{script_name}"), timeout_seconds)
        script_texts.append(script_text)
        pending_scripts.extend(
            name for name in SITE_SCRIPT_REFERENCE.findall(script_text) if name not in fetched_scripts
        )
    bundle = "\n".join(script_texts)

    found_values = {
        "system prompt": {decode_javascript_string(literal) for literal in SITE_PROMPT_LITERAL.findall(bundle)},
        "chat API URL": set(SITE_ENDPOINT_LITERAL.findall(bundle)),
        "bot name": set(SITE_BOT_NAME_LITERAL.findall(bundle)),
    }
    for label, values in found_values.items():
        if len(values) != 1:
            raise ValueError(
                f"Expected one {label} in the JavaScript of {site_url} but found {len(values)}. "
                "The site's build may have changed, so the run cannot match what the site sends."
            )
    return {
        "endpoint": found_values["chat API URL"].pop(),
        "bot_name": found_values["bot name"].pop(),
        "custom_prompt": found_values["system prompt"].pop(),
    }


def build_dashboard(run_record_path: Path) -> Path:
    """Write `dashboard.html` next to a run record.

    The data is embedded in the page, so the file opens by double-clicking and can
    be sent to teammates without a server or the run directory.

    Args:
        run_record_path (Path): A `run_record.json` written by this script.

    Returns:
        Path: The dashboard file. An existing dashboard for the run is replaced.

    Raises:
        OSError: If the run record or template cannot be read, or the output
            cannot be written.
        ValueError: If the run record is not valid JSON.
    """
    run_record = json.loads(run_record_path.read_text(encoding="utf-8"))
    # Escaping "<" stops a bot reply containing "</script>" from ending the data block.
    embedded_record = json.dumps(run_record, ensure_ascii=False).replace("<", "\\u003c")
    template = DASHBOARD_TEMPLATE_PATH.read_text(encoding="utf-8")
    dashboard_path = run_record_path.with_name("dashboard.html")
    dashboard_path.write_text(
        template.replace(RUN_RECORD_PLACEHOLDER, embedded_record), encoding="utf-8"
    )
    return dashboard_path


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
        "--site-url",
        default=DEFAULT_SITE_URL,
        help="Deployed Ross site whose chat API URL, bot name and prompt the run copies.",
    )
    parser.add_argument(
        "--endpoint",
        help="Send to this chat API URL instead of the site's. Replies then may not match the site.",
    )
    parser.add_argument("--questions-file", type=Path, default=DEFAULT_QUESTIONS_FILE)
    parser.add_argument(
        "--tier",
        choices=["quick", "extensive"],
        default="extensive",
        help="quick: rows labeled Quick. extensive: every question (default).",
    )
    parser.add_argument("--only-ids", help="Comma-separated question IDs, such as EC-10,AM-04.")
    prompt_options = parser.add_mutually_exclusive_group()
    prompt_options.add_argument(
        "--prompt-file",
        type=Path,
        help="Send this local prompt instead of the site's, for example to try an edited prompt.",
    )
    prompt_options.add_argument(
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
    parser.add_argument(
        "--concurrency",
        type=int,
        default=MAX_CONCURRENT_REQUESTS,
        help=(
            f"Questions sent at the same time, 1 to {MAX_CONCURRENT_REQUESTS} "
            f"(default {MAX_CONCURRENT_REQUESTS}). Use 1 to send them one by one."
        ),
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Run the benchmark from start to finish.

    The chat API URL, bot name and prompt are read from the deployed site first,
    unless options replace them. Questions are sent on up to `--concurrency` threads. The run record is saved
    after every finished question and keeps the CSV order. Ctrl-C skips the
    questions not yet sent, waits for the ones in progress (at most the request
    timeout per message), and still builds the dashboard.

    Args:
        argv (list[str] | None): Command-line arguments. None reads `sys.argv`.

    Returns:
        int: 0 if every question got a reply. 1 if any failed or the run was stopped.

    Raises:
        SystemExit: If the options or the input files are invalid, or the site's
            settings cannot be read.
    """
    arguments = parse_arguments(argv)
    if not 1 <= arguments.concurrency <= MAX_CONCURRENT_REQUESTS:
        raise SystemExit(f"Error: --concurrency must be between 1 and {MAX_CONCURRENT_REQUESTS}.")
    try:
        if arguments.endpoint is not None and not re.match(r"https?://", arguments.endpoint):
            raise ValueError("--endpoint must be an absolute http(s) URL.")
        selected = select_questions(
            load_questions(arguments.questions_file), arguments.tier, arguments.only_ids
        )
        local_prompt = None
        if arguments.prompt_file is not None:
            local_prompt = arguments.prompt_file.read_text(encoding="utf-8")
        site_settings = read_live_site_settings(arguments.site_url, arguments.timeout_seconds)
    except (ValueError, OSError) as e:
        raise SystemExit(f"Error: {e}") from e
    if not selected:
        raise SystemExit("Error: no questions match the selected tier.")

    endpoint = arguments.endpoint or site_settings["endpoint"]
    bot_name = site_settings["bot_name"]
    if arguments.no_custom_prompt:
        custom_prompt = None
        prompt_source = None
        print("Prompt: none sent, so the backend uses its own. Replies will not match the site.")
    elif local_prompt is not None:
        custom_prompt = local_prompt
        prompt_source = to_repo_relative(arguments.prompt_file)
        print(f"Prompt: {prompt_source}, a local file. Replies will not match the site.")
    else:
        custom_prompt = site_settings["custom_prompt"]
        prompt_source = "site"
        repo_prompt = REPO_PROMPT_FILE.read_text(encoding="utf-8") if REPO_PROMPT_FILE.is_file() else ""
        comparison = "same as" if custom_prompt.strip() == repo_prompt.strip() else "different from"
        print(f"Prompt: the one {arguments.site_url} sends ({comparison} {to_repo_relative(REPO_PROMPT_FILE)})")
    if arguments.endpoint is not None:
        print(f"Endpoint: {endpoint}, set by --endpoint. Replies may not match the site.")
    print(f"Bot name: {bot_name}, read from {arguments.site_url}")

    started_at = datetime.now(timezone.utc)
    try:
        folder_time_zone = ZoneInfo(RUN_FOLDER_TIME_ZONE)
    except ZoneInfoNotFoundError:
        # Windows has no time zone database unless the tzdata package is installed.
        # The team works in Eastern time, so the computer's own clock is used instead.
        folder_time_zone = None
    base_run_id = started_at.astimezone(folder_time_zone).strftime(RUN_FOLDER_TIME_FORMAT)
    run_id = base_run_id
    copy_number = 2
    # Two runs started in the same second get distinct folders.
    while (arguments.runs_dir / run_id).exists():
        run_id = f"{base_run_id}_{copy_number}"
        copy_number += 1
    run_dir = arguments.runs_dir / run_id
    run_dir.mkdir(parents=True)

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
            "site_url": arguments.site_url,
            "bot_name": bot_name,
            "endpoint": endpoint,
            "endpoint_source": "site" if arguments.endpoint is None else "command line",
            "prompt_source": prompt_source,
            "prompt_sha256": (
                None if custom_prompt is None else hashlib.sha256(custom_prompt.encode("utf-8")).hexdigest()
            ),
            # True only when the run sent exactly what the site sends.
            "matches_site": prompt_source == "site" and arguments.endpoint is None,
        },
        "results": [],
    }
    write_run_record(run_record_path, run_record)

    print(
        f"Sending {len(selected)} questions to {endpoint}, "
        f"up to {arguments.concurrency} at a time"
    )
    results_by_position = {}
    interrupted = False
    with ThreadPoolExecutor(max_workers=arguments.concurrency) as executor:
        future_positions = {
            executor.submit(
                ask_question,
                question,
                endpoint,
                bot_name,
                custom_prompt,
                arguments.timeout_seconds,
            ): position
            for position, question in enumerate(selected)
        }
        pending = set(future_positions)
        while pending:
            try:
                finished, pending = wait(pending, return_when=FIRST_COMPLETED)
            except KeyboardInterrupt:
                # Requests already sent cannot be recalled, so their replies are still saved.
                interrupted = True
                print("Stopping. Questions not yet sent are skipped; waiting for the ones in progress.")
                for future in pending:
                    future.cancel()
                continue
            for future in finished:
                if future.cancelled():
                    continue
                result = future.result()
                results_by_position[future_positions[future]] = result
                # Questions finish out of order, so rebuild the list in CSV order.
                run_record["results"] = [
                    results_by_position[position] for position in sorted(results_by_position)
                ]
                write_run_record(run_record_path, run_record)
                retry_note = f" after {result['retries']} retries" if result["retries"] else ""
                print(
                    f"[{len(results_by_position)}/{len(selected)}] {result['id']} {result['status']} "
                    f"{result['latency_seconds']:.1f}s{retry_note}"
                )

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
