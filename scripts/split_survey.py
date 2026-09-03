import pandas as pd
import os
import re

INPUT_FILE = "AI Chatbot Official Survey_August 27, 2026_13.30.csv"
OUTPUT_DIR = "split_output"

df = pd.read_csv(INPUT_FILE, skiprows=[1, 2])
os.makedirs(OUTPUT_DIR, exist_ok=True)


def slug(s: str) -> str:
    s = re.sub(r"[^\w]+", "_", s.strip())
    return s.strip("_")


def write(name: str, rows: pd.DataFrame) -> None:
    if rows.empty:
        return
    path = os.path.join(OUTPUT_DIR, name)
    rows.to_csv(path, index=False)
    print(f"{name}: {len(rows)} rows")


C1_LABELS = {
    "Yes (primary appointment)": "Yes_primary",
    "Yes (secondary / joint appointment)": "Yes_secondary",
    "Not College of Engineering faculty (but I collaborate with College of Engineering)": "Not_faculty_collaborate",
    "No connection to the College of Engineering": "No_connection",
}

# Drop partial responses: rows with no Affiliation at all.
df = df[df["Affiliation"].notna() & (df["Affiliation"].str.strip() != "")]

for affiliation, aff_df in df.groupby("Affiliation"):
    print(f"Processing affiliation group: {affiliation!r} ({len(aff_df)} rows)")
    aff_slug = slug(str(affiliation))

    if affiliation == "Student":
        for answer, sub_df in aff_df.groupby("Engineer Interest", dropna=False):
            if pd.isna(answer) or str(answer).strip() == "":
                continue
            write(f"survey_Current_Student_{slug(str(answer))}.csv", sub_df)

    elif affiliation == "Prospective Student":
        for answer, sub_df in aff_df.groupby("Engineer Interest", dropna=False):
            if pd.isna(answer):
                continue
            write(f"survey_Prospective_Student_{slug(str(answer))}.csv", sub_df)

    elif affiliation == "Faculty/Staff":
        for option, label in C1_LABELS.items():
            sub_df = aff_df[aff_df["C1-1"] == option]
            write(f"survey_Faculty_Staff_C1_{label}.csv", sub_df)
        other_df = aff_df[aff_df["C1-1"] == "Other"]
        write("survey_Faculty_Staff_C1_Other.csv", other_df)

    else:  # Alumni, Other
        write(f"survey_{aff_slug}.csv", aff_df)

print(f"\nTotal rows in source (after dropping blank-Affiliation partials): {len(df)}")