import os
import re
from pathlib import Path

import pandas as pd

input_file = os.environ.get("SURVEY_INPUT_FILE")
output_dir = Path(os.environ.get("SURVEY_OUTPUT_DIR", "split_output"))

if not input_file:
    raise SystemExit(
        "Set SURVEY_INPUT_FILE to an approved local survey CSV. "
        "Survey exports are intentionally not versioned."
    )

input_path = Path(input_file)
if not input_path.is_file():
    raise SystemExit(f"Survey input does not exist: {input_path}")

df = pd.read_csv(input_path)
required_columns = {"Affiliation", "Engineer Interest", "C1-1"}
missing_columns = sorted(required_columns.difference(df.columns))
if missing_columns:
    raise SystemExit(
        "Survey input is missing required columns: " + ", ".join(missing_columns)
    )

output_dir.mkdir(parents=True, exist_ok=True)


def slug(value: str) -> str:
    value = re.sub(r"[^\w]+", "_", value.strip())
    return value.strip("_")


def write(name: str, rows: pd.DataFrame) -> None:
    if rows.empty:
        return
    path = output_dir / name
    rows.to_csv(path, index=False)
    print(f"{name}: {len(rows)} rows")


C1_LABELS = {
    "Yes (primary appointment)": "Yes_primary",
    "Yes (secondary / joint appointment)": "Yes_secondary",
    "Not College of Engineering faculty (but I collaborate with College of Engineering)": "Not_faculty_collaborate",
    "No connection to the College of Engineering": "No_connection",
}

affiliation_values = df["Affiliation"].astype("string")
df = df[affiliation_values.notna() & affiliation_values.str.strip().ne("")]

print(f"Writing local survey splits to: {output_dir}")
for affiliation, aff_df in df.groupby("Affiliation"):
    print(f"Processing affiliation group: {affiliation!r} ({len(aff_df)} rows)")
    affiliation_slug = slug(str(affiliation))

    if affiliation == "Student":
        for answer, sub_df in aff_df.groupby("Engineer Interest", dropna=False):
            if pd.isna(answer) or str(answer).strip() == "":
                continue
            write(f"survey_Current_Student_{slug(str(answer))}.csv", sub_df)

    elif affiliation == "Prospective Student":
        for answer, sub_df in aff_df.groupby("Engineer Interest", dropna=False):
            if pd.isna(answer) or str(answer).strip() == "":
                continue
            write(f"survey_Prospective_Student_{slug(str(answer))}.csv", sub_df)

    elif affiliation == "Faculty/Staff":
        for option, label in C1_LABELS.items():
            write(
                f"survey_Faculty_Staff_C1_{label}.csv",
                aff_df[aff_df["C1-1"] == option],
            )
        write(
            "survey_Faculty_Staff_C1_Other.csv",
            aff_df[aff_df["C1-1"] == "Other"],
        )

    else:
        write(f"survey_{affiliation_slug}.csv", aff_df)

print(f"Total rows after dropping blank-Affiliation partials: {len(df)}")
