"""
Seed Firestore with:
  1. zip_insights — one doc per ZIP with all health metrics
  2. roi_results  — pre-computed ROI for $250k, $500k, $1M, $5M budgets

Usage:
    python scripts/seed_firestore.py
"""

import os
import sys
import json
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

# ── Init Firebase ──────────────────────────────────────────────────────────────
KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "firebase-key.json")
cred = credentials.Certificate(KEY_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

DATA_DIR  = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")


def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    df = pd.read_csv(path)
    df = df.rename(columns={df.columns[3]: "zip"})
    df["zip"] = df["zip"].astype(str).str.zfill(5)
    df = df.drop(columns=[df.columns[0], df.columns[1], df.columns[2]], errors="ignore")
    return df


def seed_zip_insights():
    print("Seeding zip_insights...")
    cdc     = load_csv("CDCPlaces.csv")
    demo    = load_csv("Census-Demographics.csv")
    svi     = load_csv("SocialVulnerabilityIndex.csv")
    hca     = load_csv("HealthCareAccess.csv")
    food    = load_csv("USDA-FoodAccess.csv")
    parks   = load_csv("Parks.csv")
    housing = load_csv("Census-Housing&Poverty.csv")
    fema    = load_csv("FEMA.csv")
    workers = load_csv("HealthCareWorkers.csv")

    merged = cdc
    for df in [demo, svi, hca, food, parks, housing, fema, workers]:
        merged = merged.merge(df, on="zip", how="inner", suffixes=("", "_dup"))
        merged = merged[[c for c in merged.columns if not c.endswith("_dup")]]

    FIELD_MAP = {
        "Life Expectancy at Birth (2010-2015)":                                    "lifeExpectancy",
        "Lack of Health Insurance Among Adults (2023)":                            "pctUninsured",
        "Regular Smoking Among Adults (2023)":                                     "pctSmoking",
        "Obesity Among Adults (2023)":                                             "pctObesity",
        "No Leisure-Time Physical Activity Among Adults (2023)":                   "pctInactive",
        "Median Household Income (2020-2024)":                                     "medianIncome",
        "Social Vulnerability Index Within the State (2022)":                      "sviScore",
        "People 1/2 Mile Urban/10 Miles Rural with Low Access to Healthy Food (2019)": "foodDesertPop",
        "Percent Area Covered by Parks (2018)":                                    "pctParkArea",
        "Total Population (2020-2024)":                                            "totalPopulation",
        "People Below Poverty Level (2020-2024)":                                  "peopleBelowPoverty",
        "Fair or Poor General Health Among Adults (2023)":                         "pctPoorHealth",
        "Diagnosed Depression Among Adults (2023)":                                "pctDepression",
        "High Blood Pressure Among Adults (2023)":                                 "pctHighBP",
        "Mental Health Providers (2025)":                                          "mentalHealthProviders",
        "Primary Care Physician Ratio (2025)":                                     "primaryCareRatio",
        "Environmental Hazard Expected Annual Loss Total (2025)":                  "envHazardLoss",
        "Air Toxics Cancer Risk Environmental Justice Index (2023)":               "airToxicsRisk",
    }

    batch = db.batch()
    count = 0

    for _, row in merged.iterrows():
        zip_code = str(row["zip"]).zfill(5)
        doc = {"zip": zip_code}
        for csv_col, field in FIELD_MAP.items():
            if csv_col in row:
                val = row[csv_col]
                doc[field] = None if pd.isna(val) else float(val)

        ref = db.collection("zip_insights").document(zip_code)
        batch.set(ref, doc)
        count += 1
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()

    batch.commit()
    print(f"  Seeded {count} ZIP documents into zip_insights")


def seed_roi_results():
    print("Seeding roi_results...")
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from model.roi import calculate_roi

    BUDGETS = [250_000, 500_000, 1_000_000, 5_000_000]
    batch = db.batch()
    count = 0

    for budget in BUDGETS:
        results = calculate_roi(budget)
        for r in results:
            doc = {
                "zip":                    r["zip"],
                "budget":                 budget,
                "currentLifeExpectancy":  r["current_life_expectancy"],
                "predictedGain":          r["predicted_gain"],
                "projectedLifeExpectancy": r["projected_life_expectancy"],
                "topIntervention":        r["top_intervention"],
                "budgetAllocation":       r["budget_allocation"],
            }
            doc_id = f"{r['zip']}_{int(budget)}"
            ref = db.collection("roi_results").document(doc_id)
            batch.set(ref, doc)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()

    batch.commit()
    print(f"  Seeded {count} ROI documents into roi_results")


if __name__ == "__main__":
    seed_zip_insights()
    seed_roi_results()
    print("\nDone! Firestore is seeded.")
