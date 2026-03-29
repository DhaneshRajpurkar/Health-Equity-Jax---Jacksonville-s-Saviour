"""
Life Expectancy ROI Calculator

Given a budget (USD), ranks Jacksonville ZIP codes by the life expectancy
gain achievable through targeted public health investment.

Each intervention maps a dollar amount to a unit improvement in a feature.
The gain is capped by how far each ZIP currently is from the best observed
value — ZIPs with worse baselines have more room to benefit.

Usage (standalone):
    python model/roi.py --budget 500000

Usage (imported):
    from model.roi import calculate_roi
    results = calculate_roi(budget=500000)
"""

import os
import argparse
import pandas as pd
import numpy as np
import joblib

MODEL_DIR = os.path.dirname(__file__)

# Cost to improve a feature by 1 unit.
# direction: -1 = lower is better, +1 = higher is better.
# ideal: the best realistic value for the feature (used to cap possible gain).
INTERVENTIONS = {
    "pct_uninsured": {
        "label": "Expand healthcare coverage",
        "cost_per_unit": 85_000,   # USD to reduce uninsured rate by 1 pp
        "direction": -1,
        "ideal": 5.0,              # 5% uninsured is a realistic floor
    },
    "pct_inactive": {
        "label": "Physical activity programs",
        "cost_per_unit": 40_000,   # USD to reduce physical inactivity by 1 pp
        "direction": -1,
        "ideal": 15.0,
    },
    "pct_obesity": {
        "label": "Obesity reduction programs",
        "cost_per_unit": 60_000,   # USD to reduce obesity rate by 1 pp
        "direction": -1,
        "ideal": 20.0,
    },
    "pct_smoking": {
        "label": "Smoking cessation programs",
        "cost_per_unit": 50_000,
        "direction": -1,
        "ideal": 8.0,
    },
    "food_desert_pop": {
        "label": "Reduce food desert population",
        "cost_per_unit": 500,      # USD per person gaining food access
        "direction": -1,
        "ideal": 0,
    },
    "pct_park_area": {
        "label": "Increase park coverage",
        "cost_per_unit": 200_000,  # USD per 1% increase in park coverage
        "direction": +1,
        "ideal": 15.0,             # 15% park area coverage is a strong target
    },
}


def calculate_roi(budget: float) -> list[dict]:
    """
    Calculate life expectancy ROI for each Jacksonville ZIP code.

    Args:
        budget: Total investment budget in USD.

    Returns:
        List of dicts sorted by predicted life expectancy gain (descending).
    """
    artifact = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
    model    = artifact["model"]
    scaler   = artifact["scaler"]
    feature_names = artifact["feature_names"]

    zip_df = pd.read_csv(os.path.join(MODEL_DIR, "zip_features.csv"))
    target_col = [c for c in zip_df.columns if "Life Expectancy" in c][0]

    # Pre-compute raw (unstandardized) coefficients per feature
    raw_coef = {}
    for feat in feature_names:
        idx = feature_names.index(feat)
        raw_coef[feat] = model.coef_[idx] / scaler.scale_[idx]

    # Which interventions are available in our feature set
    actionable = [f for f in INTERVENTIONS if f in feature_names]
    n = len(actionable)

    results = []

    for _, row in zip_df.iterrows():
        zip_code   = str(row["zip"]).zfill(5)
        current_le = float(row[target_col])

        total_gain = 0.0
        feature_gains = {}
        allocation = {}
        per_budget = budget / n if n else 0

        for feat in actionable:
            interv = INTERVENTIONS[feat]
            current_val = float(row.get(feat, np.nan))
            if np.isnan(current_val):
                continue

            ideal  = interv["ideal"]
            direc  = interv["direction"]

            # How many units of headroom does this ZIP have?
            if direc == -1:
                headroom = max(0.0, current_val - ideal)   # reduce from current to ideal
            else:
                headroom = max(0.0, ideal - current_val)   # increase from current to ideal

            # Units purchasable with allocated budget
            units_purchasable = per_budget / interv["cost_per_unit"]

            # Cap at headroom (can't improve beyond ideal)
            units_applied = min(units_purchasable, headroom)

            # Gain: raw coef * units changed (already direction-adjusted because
            # coef sign encodes the direction from model training)
            gain = raw_coef[feat] * units_applied * direc
            feature_gains[feat] = gain
            allocation[interv["label"]] = round(per_budget, 2)
            total_gain += gain

        top_feat  = max(feature_gains, key=lambda f: feature_gains[f]) if feature_gains else None
        top_label = INTERVENTIONS[top_feat]["label"] if top_feat else "N/A"

        results.append({
            "zip": zip_code,
            "current_life_expectancy": round(current_le, 2),
            "predicted_gain": round(total_gain, 4),
            "projected_life_expectancy": round(current_le + total_gain, 2),
            "top_intervention": top_label,
            "budget_allocation": allocation,
        })

    results.sort(key=lambda x: x["predicted_gain"], reverse=True)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget", type=float, default=1_000_000)
    parser.add_argument("--top",    type=int,   default=10)
    args = parser.parse_args()

    print(f"\nLife Expectancy ROI  |  Budget: ${args.budget:,.0f}\n")
    print(f"{'ZIP':<8} {'Current LE':>10} {'Gain (yrs)':>12} {'Projected LE':>14}  Top Intervention")
    print("-" * 85)
    for r in calculate_roi(args.budget)[:args.top]:
        print(
            f"{r['zip']:<8} {r['current_life_expectancy']:>10.2f} "
            f"{r['predicted_gain']:>+12.4f} {r['projected_life_expectancy']:>14.2f}"
            f"  {r['top_intervention']}"
        )
