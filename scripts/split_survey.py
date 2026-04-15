import pandas as pd
import os

INPUT_FILE = "AI Chatbot Official Survey_April 14, 2026_13.06.csv"
OUTPUT_DIR = "split_output"

# Read CSV, skipping Qualtrics metadata rows (question text + import IDs)
df = pd.read_csv(INPUT_FILE, skiprows=[1, 2])

os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Split 1: by Affiliation + Engineer Interest ---
print("=== Split by Affiliation + Engineer Interest ===")
grouped = df.groupby(["Affiliation", "Engineer Interest"], dropna=False)

for (affiliation, eng_interest), group_df in grouped:
    parts = [str(affiliation).replace("/", "_")]
    if pd.notna(eng_interest) and str(eng_interest).strip():
        parts.append(str(eng_interest))
    filename = "survey_" + "_".join(parts) + ".csv"

    output_path = os.path.join(OUTPUT_DIR, filename)
    group_df.to_csv(output_path, index=False)
    print(f"{filename}: {len(group_df)} rows")

# --- Split 2: by C1-1 (PC Rossin affiliation) ---
print("\n=== Split by C1-1 (PC Rossin Affiliation) ===")
grouped2 = df.groupby("C1-1", dropna=False)

for val, group_df in grouped2:
    if pd.notna(val) and str(val) == "Other":
        continue  # these rows go into C1-1_Other_Text instead
    if pd.isna(val):
        label = "NA"
    else:
        label = str(val).replace("/", "_").replace(" ", "_")
    filename = f"survey_C1-1_{label}.csv"

    output_path = os.path.join(OUTPUT_DIR, filename)
    group_df.to_csv(output_path, index=False)
    print(f"{filename}: {len(group_df)} rows")

# --- Split 3: C1-1_5_TEXT (Other free-text responses) ---
print("\n=== C1-1_5_TEXT (Other free-text) ===")
other_text_df = df[df["C1-1_5_TEXT"].notna()]
filename = "survey_C1-1_Other_Text.csv"
output_path = os.path.join(OUTPUT_DIR, filename)
other_text_df.to_csv(output_path, index=False)
print(f"{filename}: {len(other_text_df)} rows")

print(f"\nTotal rows in source: {len(df)}")
