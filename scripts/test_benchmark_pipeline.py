"""Tests for the benchmark pipeline, using a fake chat API and fake site on localhost.

Run with: python3 scripts/test_benchmark_pipeline.py
"""

import json
import re
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

import run_benchmark

CANONICAL_SESSION_ID = "session-from-backend"
SLOW_REPLY_SECONDS = 0.3
SITE_ENDPOINT = "https://abc123.execute-api.us-east-1.amazonaws.com/call/"
SITE_PROMPT = 'You are Ross.\nCite `sources` and say "hi".'
# A miniature build of the deployed site: the page loads one script, which loads
# the chunk that holds the chat settings, written the way the real build writes them,
# with the prompt as a template literal holding real line breaks and escaped backticks.
FAKE_SITE_FILES = {
    "/": '<html><link rel="modulepreload" href="/assets/entry.js"></html>',
    "/assets/entry.js": 'import("./home.js");',
    "/assets/home.js": (
        f'const a="{SITE_ENDPOINT}",b="le-chat".trim();'
        'function q(e){return{action:"question",bot_name:b,custom_prompt:`You are Ross.\n'
        r'''Cite \`sources\` and say "hi".`}}'''
    ),
    "/broken/": "<html>No scripts here.</html>",
}


class FakeChatHandler(BaseHTTPRequestHandler):
    """Answers each message according to the keyword it contains, and records the request."""

    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        self.server.received_payloads.append(payload)
        message = payload["userMessage"]
        with self.server.counter_lock:
            times_seen = self.server.message_counts.get(message, 0) + 1
            self.server.message_counts[message] = times_seen
        if "slow" in message:
            # Count how many slow requests are open at once to detect concurrent sending.
            with self.server.counter_lock:
                self.server.open_requests += 1
                self.server.peak_open_requests = max(self.server.peak_open_requests, self.server.open_requests)
            time.sleep(SLOW_REPLY_SECONDS)
            with self.server.counter_lock:
                self.server.open_requests -= 1
        status_code = 200
        body = json.dumps(
            {
                "Response": f"Answer to {message}",
                "Sources": [{"title": "Lehigh", "url": "https://www.lehigh.edu"}],
            }
        ).encode("utf-8")
        if "http500" in message:
            status_code = 500
            body = b"internal server error"
        elif "flaky" in message and times_seen == 1:
            status_code = 503
            body = b"service unavailable"
        elif "apierror" in message:
            body = json.dumps({"error": "bot not found"}).encode("utf-8")
        elif "notjson" in message:
            body = b"<html>gateway</html>"
        elif "noreply" in message:
            body = json.dumps({"Response": "   "}).encode("utf-8")
        elif "newsession" in message:
            body = json.dumps({"Response": "ok", "sessionId": CANONICAL_SESSION_ID}).encode("utf-8")
        elif "scripttag" in message:
            body = json.dumps({"Response": "</script><img src=x onerror=alert(1)>"}).encode("utf-8")
        self.send_response(status_code)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        page = FAKE_SITE_FILES.get(self.path)
        self.send_response(404 if page is None else 200)
        self.end_headers()
        if page is not None:
            self.wfile.write(page.encode("utf-8"))

    def log_message(self, *log_arguments):
        pass


class BenchmarkPipelineTest(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeChatHandler)
        self.server.received_payloads = []
        self.server.counter_lock = threading.Lock()
        self.server.open_requests = 0
        self.server.peak_open_requests = 0
        self.server.message_counts = {}
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.endpoint = f"http://127.0.0.1:{self.server.server_port}/call"
        self.site_url = f"http://127.0.0.1:{self.server.server_port}/"
        temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(temporary_directory.cleanup)
        self.temporary_path = Path(temporary_directory.name)
        self.runs_dir = self.temporary_path / "runs"
        # Read settings from the fake site, write results to a temporary folder, and
        # keep the real retry count without its pauses so the tests stay fast.
        replacements = {"SITE_URL": self.site_url, "RUNS_DIR": self.runs_dir, "RETRY_DELAY_SECONDS": 0}
        for name, value in replacements.items():
            constant_patch = mock.patch.object(run_benchmark, name, value)
            constant_patch.start()
            self.addCleanup(constant_patch.stop)

    def write_csv(self, text, encoding="utf-8"):
        questions_path = self.temporary_path / "questions.csv"
        questions_path.write_text(text, encoding=encoding)
        return questions_path

    def ask(self, text, custom_prompt="You are Ross."):
        return run_benchmark.ask_question(
            {"id": "Q1", "question": text}, self.endpoint, "le-chat", custom_prompt, 5
        )

    def test_load_questions_accepts_id_and_question_only(self):
        questions = run_benchmark.load_questions(self.write_csv("id,question\nQ1, Hello \n,\nQ2,Bye\n"))
        self.assertEqual(
            questions, [{"id": "Q1", "question": "Hello"}, {"id": "Q2", "question": "Bye"}]
        )

    def test_load_questions_handles_excel_byte_order_mark(self):
        questions = run_benchmark.load_questions(self.write_csv("id,question\nQ1,Hello\n", "utf-8-sig"))
        self.assertEqual(questions[0]["id"], "Q1")

    def test_load_questions_accepts_spreadsheet_column_names(self):
        questions = run_benchmark.load_questions(
            self.write_csv("ID,Question,Expected response,Edge case?\nQ1,Hello,Greets,Yes\n")
        )
        self.assertEqual(
            questions,
            [{"id": "Q1", "question": "Hello", "expected_response": "Greets", "edge_case": "Yes"}],
        )

    def test_load_questions_rejects_bad_files(self):
        bad_files = {
            "missing column": "id,text\nQ1,Hello\n",
            "repeated id": "id,question\nQ1,Hello\nQ1,Bye\n",
            "blank question": "id,question\nQ1,\n",
        }
        for name, text in bad_files.items():
            with self.subTest(name), self.assertRaises(ValueError):
                run_benchmark.load_questions(self.write_csv(text))

    def test_repository_csv_loads_and_quick_is_a_smaller_subset(self):
        questions = run_benchmark.load_questions(run_benchmark.DEFAULT_QUESTIONS_FILE)
        quick_questions = run_benchmark.select_questions(questions, "quick", None)
        self.assertTrue(quick_questions)
        self.assertLess(len(quick_questions), len(questions))
        self.assertEqual(run_benchmark.select_questions(questions, "extensive", None), questions)

    def test_select_questions_rejects_unknown_ids(self):
        questions = [{"id": "Q1", "question": "Hello", "tier": "Quick"}]
        self.assertEqual(run_benchmark.select_questions(questions, "quick", "Q1"), questions)
        with self.assertRaises(ValueError):
            run_benchmark.select_questions(questions, "quick", "Q9")

    def test_main_rejects_an_endpoint_that_is_not_an_absolute_url(self):
        for endpoint in ["example.com/call", ""]:
            with self.subTest(endpoint), self.assertRaises(SystemExit):
                run_benchmark.main(["--endpoint", endpoint])
        self.assertFalse(self.runs_dir.exists())

    def test_main_rejects_concurrency_outside_one_to_sixteen(self):
        for concurrency in ["0", "17"]:
            with self.subTest(concurrency), self.assertRaises(SystemExit):
                run_benchmark.main(["--endpoint", self.endpoint, "--concurrency", concurrency])
        self.assertFalse(self.runs_dir.exists())
        self.assertEqual(self.server.received_payloads, [])

    def test_split_into_turns(self):
        self.assertEqual(run_benchmark.split_into_turns("How do I apply?"), ["How do I apply?"])
        self.assertEqual(
            run_benchmark.split_into_turns("T1: Tell me about 4+1. T2: What about for civil?"),
            ["Tell me about 4+1.", "What about for civil?"],
        )

    def test_reply_needs_only_the_response_field(self):
        result = self.ask("hello")
        self.assertEqual(result["status"], "transport_ok")
        self.assertEqual(result["turns"][0]["response"], "Answer to hello")
        self.assertEqual(len(result["turns"][0]["sources"]), 1)

    def test_request_matches_the_frontend_payload(self):
        self.ask("hello")
        payload = self.server.received_payloads[0]
        self.assertEqual(payload["action"], "question")
        self.assertEqual(payload["bot_name"], "le-chat")
        self.assertEqual(payload["httpMethod"], "POST")
        self.assertEqual(payload["custom_prompt"], "You are Ross.")
        self.assertTrue(payload["sessionId"].startswith("session-"))
        self.assertTrue(payload["questionId"].startswith("Q1-"))

    def test_failures_are_recorded_instead_of_raised(self):
        expected_statuses = {
            "http500": "http_error",
            "apierror": "api_error",
            "notjson": "invalid_response",
            "noreply": "invalid_response",
        }
        for message, status in expected_statuses.items():
            with self.subTest(message):
                result = self.ask(message)
                self.assertEqual(result["status"], status)
                self.assertTrue(result["error"])

    def test_unreachable_endpoint_is_a_request_failure(self):
        self.server.server_close()
        result = run_benchmark.ask_question(
            {"id": "Q1", "question": "hello"}, "http://127.0.0.1:9/call", "le-chat", None, 2
        )
        self.assertEqual(result["status"], "request_failed")
        self.assertIsNone(result["turns"][0]["http_status"])
        self.assertEqual(result["turns"][0]["attempts"], run_benchmark.MAX_ATTEMPTS_PER_MESSAGE)

    def test_temporary_failure_is_retried_until_it_succeeds(self):
        result = self.ask("flaky")
        self.assertEqual(result["status"], "transport_ok")
        self.assertEqual(result["turns"][0]["attempts"], 2)
        self.assertEqual(result["retries"], 1)
        first_payload, second_payload = self.server.received_payloads
        self.assertEqual(first_payload["sessionId"], second_payload["sessionId"])
        self.assertNotEqual(first_payload["questionId"], second_payload["questionId"])

    def test_lasting_server_error_stops_at_the_attempt_limit(self):
        result = self.ask("http500")
        self.assertEqual(result["status"], "http_error")
        self.assertEqual(result["turns"][0]["attempts"], run_benchmark.MAX_ATTEMPTS_PER_MESSAGE)
        self.assertEqual(len(self.server.received_payloads), run_benchmark.MAX_ATTEMPTS_PER_MESSAGE)

    def test_errors_the_service_reports_are_not_retried(self):
        for message in ["apierror", "notjson", "noreply"]:
            with self.subTest(message):
                result = self.ask(message)
                self.assertEqual(result["turns"][0]["attempts"], 1)
                self.assertEqual(self.server.message_counts[message], 1)

    def test_multi_turn_question_shares_a_session(self):
        result = self.ask("T1: first T2: second")
        first_payload, second_payload = self.server.received_payloads
        self.assertEqual(first_payload["sessionId"], second_payload["sessionId"])
        self.assertNotEqual(first_payload["questionId"], second_payload["questionId"])
        self.assertEqual([turn["question"] for turn in result["turns"]], ["first", "second"])

    def test_later_turns_adopt_a_session_id_from_the_service(self):
        self.ask("T1: newsession T2: second")
        self.assertEqual(self.server.received_payloads[1]["sessionId"], CANONICAL_SESSION_ID)

    def test_failed_turn_ends_the_question(self):
        result = self.ask("T1: http500 T2: second")
        sent_messages = [payload["userMessage"] for payload in self.server.received_payloads]
        self.assertEqual(sent_messages, ["http500"] * run_benchmark.MAX_ATTEMPTS_PER_MESSAGE)
        self.assertEqual(result["status"], "http_error")

    def test_each_question_gets_its_own_session(self):
        self.ask("first")
        self.ask("second")
        first_payload, second_payload = self.server.received_payloads
        self.assertNotEqual(first_payload["sessionId"], second_payload["sessionId"])

    def test_dashboard_keeps_bot_replies_inside_the_data_block(self):
        run_record_path = self.temporary_path / "run_record.json"
        reply = "</script><img src=x onerror=alert(1)>"
        run_record_path.write_text(json.dumps({"results": [{"reply": reply}]}), encoding="utf-8")

        dashboard_path = run_benchmark.build_dashboard(run_record_path)

        html = dashboard_path.read_text(encoding="utf-8")
        self.assertNotIn(reply, html)
        self.assertNotIn(run_benchmark.RUN_RECORD_PLACEHOLDER, html)
        embedded = re.search(
            r'<script id="run-record" type="application/json">(.*?)</script>', html, re.DOTALL
        ).group(1)
        self.assertEqual(json.loads(embedded)["results"][0]["reply"], reply)

    def run_main(self, questions_text, extra_arguments=()):
        """Run the whole benchmark against the fake server, using temporary input files.

        Args:
            questions_text (str): Contents of the question CSV.
            extra_arguments (tuple[str, ...]): More command-line options, such as
                ("--concurrency", "1"). Empty by default.

        Settings come from the fake site, except the endpoint, which points at the
        fake chat API because the site's address is not reachable from tests.

        Returns:
            tuple[int, Path, dict]: The exit code, the run directory and the saved run record.
        """
        questions_path = self.write_csv(questions_text)
        exit_code = run_benchmark.main(
            ["--endpoint", self.endpoint, "--questions-file", str(questions_path), *extra_arguments]
        )
        run_dir = next(self.runs_dir.iterdir())
        return exit_code, run_dir, json.loads((run_dir / "run_record.json").read_text(encoding="utf-8"))

    def test_full_run_writes_results_and_dashboard(self):
        exit_code, run_dir, run_record = self.run_main(
            "id,category,question\nQ1,Majors,hello\nQ2,Majors,scripttag\n"
        )
        self.assertEqual(exit_code, 0)
        self.assertEqual(len(run_record["results"]), 2)
        self.assertEqual(run_record["results"][0]["category"], "Majors")
        self.assertIsNotNone(run_record["ended_at_utc"])
        self.assertEqual(sorted(path.name for path in run_dir.iterdir()), ["dashboard.html", "run_record.json"])
        # Eastern-time month, day, hour, minute and second, with no year.
        self.assertRegex(run_dir.name, r"^\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$")
        self.assertEqual(run_record["run_id"], run_dir.name)

    def test_runs_started_in_the_same_second_get_separate_folders(self):
        questions_path = self.write_csv("id,question\nQ1,hello\n")
        frozen_time = run_benchmark.datetime(2026, 11, 5, 20, 18, 1, tzinfo=run_benchmark.timezone.utc)
        with mock.patch.object(run_benchmark, "datetime") as mocked_datetime:
            mocked_datetime.now.return_value = frozen_time
            for unused_run_number in range(2):
                run_benchmark.main(["--endpoint", self.endpoint, "--questions-file", str(questions_path)])
        self.assertEqual(sorted(path.name for path in self.runs_dir.iterdir()), ["11-05_15-18-01", "11-05_15-18-01_2"])

    def test_reads_endpoint_bot_name_and_prompt_from_the_site(self):
        settings = run_benchmark.read_live_site_settings(self.site_url)
        self.assertEqual(
            settings, {"endpoint": SITE_ENDPOINT, "bot_name": "le-chat", "custom_prompt": SITE_PROMPT}
        )

    def test_run_stops_when_the_site_settings_cannot_be_found(self):
        broken_site_url = self.site_url + "broken/"
        with self.assertRaises(ValueError):
            run_benchmark.read_live_site_settings(broken_site_url)
        with mock.patch.object(run_benchmark, "SITE_URL", broken_site_url), self.assertRaises(SystemExit):
            run_benchmark.main(["--questions-file", str(self.write_csv("id,question\nQ1,hello\n"))])
        self.assertFalse(self.runs_dir.exists())
        self.assertEqual(self.server.received_payloads, [])

    def test_default_run_sends_the_site_prompt_and_bot_name(self):
        unused_exit_code, unused_run_dir, run_record = self.run_main("id,question\nQ1,hello\n")
        payload = self.server.received_payloads[0]
        self.assertEqual(payload["custom_prompt"], SITE_PROMPT)
        self.assertEqual(payload["bot_name"], "le-chat")
        self.assertEqual(run_record["config"]["prompt_source"], "site")
        # The tests replace the site's endpoint, so the run is marked as not matching the site.
        self.assertEqual(run_record["config"]["endpoint_source"], "command line")
        self.assertFalse(run_record["config"]["matches_site"])

    def test_local_prompt_file_replaces_the_site_prompt(self):
        prompt_path = self.temporary_path / "my_prompt.txt"
        prompt_path.write_text("You are a local test prompt.", encoding="utf-8")
        unused_exit_code, unused_run_dir, run_record = self.run_main(
            "id,question\nQ1,hello\n", ("--prompt-file", str(prompt_path))
        )
        self.assertEqual(self.server.received_payloads[0]["custom_prompt"], "You are a local test prompt.")
        self.assertEqual(run_record["config"]["prompt_source"], str(prompt_path))
        self.assertFalse(run_record["config"]["matches_site"])

    def test_run_continues_past_a_failure_and_exits_nonzero(self):
        exit_code, unused_run_dir, run_record = self.run_main("id,question\nQ1,http500\nQ2,hello\n")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            [result["status"] for result in run_record["results"]], ["http_error", "transport_ok"]
        )

    def test_questions_are_sent_together_and_saved_in_file_order(self):
        # The fast last question finishes first, but the record must keep the CSV order.
        questions_text = "id,question\nQ1,slow one\nQ2,slow two\nQ3,slow three\nQ4,hello\n"
        exit_code, unused_run_dir, run_record = self.run_main(questions_text, ("--concurrency", "4"))
        self.assertEqual(exit_code, 0)
        self.assertGreater(self.server.peak_open_requests, 1)
        self.assertEqual([result["id"] for result in run_record["results"]], ["Q1", "Q2", "Q3", "Q4"])
        session_ids = [payload["sessionId"] for payload in self.server.received_payloads]
        self.assertEqual(len(set(session_ids)), 4)

    def test_concurrency_of_one_sends_questions_one_by_one(self):
        self.run_main("id,question\nQ1,slow one\nQ2,slow two\nQ3,slow three\n", ("--concurrency", "1"))
        self.assertEqual(self.server.peak_open_requests, 1)


if __name__ == "__main__":
    unittest.main()
