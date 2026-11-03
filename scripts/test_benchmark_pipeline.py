"""Tests for the benchmark pipeline, using a fake chat API server on localhost.

Run with: python3 scripts/test_benchmark_pipeline.py
"""

import json
import re
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import build_benchmark_dashboard
import run_benchmark

CANONICAL_SESSION_ID = "session-from-backend"


class FakeChatHandler(BaseHTTPRequestHandler):
    """Answers each message according to the keyword it contains, and records the request."""

    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        self.server.received_payloads.append(payload)
        message = payload["userMessage"]
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

    def log_message(self, *log_arguments):
        pass


class BenchmarkPipelineTest(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeChatHandler)
        self.server.received_payloads = []
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.endpoint = f"http://127.0.0.1:{self.server.server_port}/call"
        temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(temporary_directory.cleanup)
        self.temporary_path = Path(temporary_directory.name)

    def write_csv(self, text, encoding="utf-8"):
        questions_path = self.temporary_path / "questions.csv"
        questions_path.write_text(text, encoding=encoding)
        return questions_path

    def ask(self, text, custom_prompt=None):
        return run_benchmark.ask_question(
            {"id": "Q1", "question": text}, self.endpoint, "ross-test", custom_prompt, 5
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
        runs_dir = self.temporary_path / "runs"
        for endpoint in ["example.com/call", ""]:
            with self.subTest(endpoint), self.assertRaises(SystemExit):
                run_benchmark.main(
                    ["--endpoint", endpoint, "--bot-name", "ross-test", "--runs-dir", str(runs_dir)]
                )
        self.assertFalse(runs_dir.exists())

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
        self.ask("hello", custom_prompt="You are Ross.")
        payload = self.server.received_payloads[0]
        self.assertEqual(payload["action"], "question")
        self.assertEqual(payload["bot_name"], "ross-test")
        self.assertEqual(payload["httpMethod"], "POST")
        self.assertEqual(payload["custom_prompt"], "You are Ross.")
        self.assertTrue(payload["sessionId"].startswith("session-"))
        self.assertTrue(payload["questionId"].startswith("Q1-"))

        self.ask("hello", custom_prompt=None)
        self.assertNotIn("custom_prompt", self.server.received_payloads[1])

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
            {"id": "Q1", "question": "hello"}, "http://127.0.0.1:9/call", "ross-test", None, 2
        )
        self.assertEqual(result["status"], "request_failed")
        self.assertIsNone(result["turns"][0]["http_status"])

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
        self.assertEqual(len(self.server.received_payloads), 1)
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

        dashboard_path = build_benchmark_dashboard.build_dashboard(run_record_path)

        html = dashboard_path.read_text(encoding="utf-8")
        self.assertNotIn(reply, html)
        self.assertNotIn(build_benchmark_dashboard.RUN_RECORD_PLACEHOLDER, html)
        embedded = re.search(
            r'<script id="run-record" type="application/json">(.*?)</script>', html, re.DOTALL
        ).group(1)
        self.assertEqual(json.loads(embedded)["results"][0]["reply"], reply)

    def run_main(self, questions_text):
        """Run the whole benchmark against the fake server, using temporary input files.

        Args:
            questions_text (str): Contents of the question CSV.

        Returns:
            tuple[int, Path, dict]: The exit code, the run directory and the saved run record.
        """
        questions_path = self.write_csv(questions_text)
        prompt_path = self.temporary_path / "prompt.txt"
        prompt_path.write_text("You are Ross.", encoding="utf-8")
        runs_dir = self.temporary_path / "runs"
        exit_code = run_benchmark.main(
            [
                "--endpoint", self.endpoint,
                "--bot-name", "ross-test",
                "--questions-file", str(questions_path),
                "--prompt-file", str(prompt_path),
                "--runs-dir", str(runs_dir),
            ]
        )
        run_dir = next(runs_dir.iterdir())
        return exit_code, run_dir, json.loads((run_dir / "run_record.json").read_text(encoding="utf-8"))

    def test_full_run_writes_results_and_dashboard(self):
        exit_code, run_dir, run_record = self.run_main(
            "id,category,question\nQ1,Majors,hello\nQ2,Majors,scripttag\n"
        )
        self.assertEqual(exit_code, 0)
        self.assertEqual(len(run_record["results"]), 2)
        self.assertEqual(run_record["results"][0]["category"], "Majors")
        self.assertIsNotNone(run_record["ended_at_utc"])
        self.assertTrue((run_dir / "dashboard.html").is_file())
        self.assertEqual((run_dir / "prompt_snapshot.txt").read_text(encoding="utf-8"), "You are Ross.")
        self.assertTrue((run_dir / "questions_snapshot.csv").is_file())

    def test_run_continues_past_a_failure_and_exits_nonzero(self):
        exit_code, unused_run_dir, run_record = self.run_main("id,question\nQ1,http500\nQ2,hello\n")
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            [result["status"] for result in run_record["results"]], ["http_error", "transport_ok"]
        )


if __name__ == "__main__":
    unittest.main()
