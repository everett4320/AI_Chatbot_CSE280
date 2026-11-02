"""Turn a benchmark run record into a standalone HTML dashboard.

run_benchmark.py calls this at the end of a run. Run it directly to rebuild the
dashboard for an earlier run:

    python3 scripts/build_benchmark_dashboard.py path/to/run_record.json
"""

import argparse
import json
from pathlib import Path

TEMPLATE_PATH = Path(__file__).resolve().parent / "benchmark_dashboard_template.html"
RUN_RECORD_PLACEHOLDER = "__RUN_RECORD_JSON__"


def build_dashboard(run_record_path: Path) -> Path:
    """Write `dashboard.html` next to a run record.

    The data is embedded in the page, so the file opens by double-clicking and can
    be sent to teammates without a server or the run directory.

    Args:
        run_record_path (Path): A `run_record.json` written by run_benchmark.py.

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
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    dashboard_path = run_record_path.with_name("dashboard.html")
    dashboard_path.write_text(
        template.replace(RUN_RECORD_PLACEHOLDER, embedded_record), encoding="utf-8"
    )
    return dashboard_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the dashboard for a benchmark run.")
    parser.add_argument("run_record", type=Path, help="Path to a run_record.json file.")
    print(build_dashboard(parser.parse_args().run_record))
