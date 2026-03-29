"""
Train a Ridge regression model to predict life expectancy by ZIP code.

Usage:
    python model/train.py
"""

import os
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge, RidgeCV
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import KFold, cross_val_score
import joblib

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.dirname(__file__)


def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    df = pd.read_csv(path)
    df = df.rename(columns={df.columns[3]: "zip"})
    df["zip"] = df["zip"].astype(str).str.zfill(5)
    df = df.drop(columns=[df.columns[0], df.columns[1], df.columns[2]], errors="ignore")
    return df


def main():
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

    TARGET = "Life Expectancy at Birth (2010-2015)"
    merged = merged.dropna(subset=[TARGET])

    FEATURES = {
        "Lack of Health Insurance Among Adults (2023)":                                "pct_uninsured",
        "Median Household Income (2020-2024)":                                         "median_income",
        "Regular Smoking Among Adults (2023)":                                         "pct_smoking",
        "Obesity Among Adults (2023)":                                                 "pct_obesity",
        "No Leisure-Time Physical Activity Among Adults (2023)":                       "pct_inactive",
        "Social Vulnerability Index Within the State (2022)":                          "svi_score",
        "People 1/2 Mile Urban/10 Miles Rural with Low Access to Healthy Food (2019)": "food_desert_pop",
        "Percent Area Covered by Parks (2018)":                                        "pct_park_area",
    }

    available = {k: v for k, v in FEATURES.items() if k in merged.columns}
    X = merged[list(available.keys())].copy().rename(columns=available)
    y = merged[TARGET].copy()
    feature_names = list(available.values())

    X = X.apply(pd.to_numeric, errors="coerce")
    mask = X.notna().all(axis=1) & y.notna()
    X, y = X[mask], y[mask]
    zips = merged["zip"][mask].values

    print(f"Training on {len(X)} ZIP codes with {len(feature_names)} features")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Step 1: find best alpha via RidgeCV
    ridge_cv = RidgeCV(alphas=np.logspace(-2, 3, 100))
    ridge_cv.fit(X_scaled, y)
    best_alpha = ridge_cv.alpha_
    print(f"Best alpha: {best_alpha:.4f}")

    # Step 2: fit final model and evaluate with k-fold CV
    model = Ridge(alpha=best_alpha)
    model.fit(X_scaled, y)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_scaled, y, cv=kf, scoring="r2")
    r2_train  = model.score(X_scaled, y)

    print(f"5-fold CV R2 scores: {cv_scores.round(3)}")
    print(f"Mean CV R2: {cv_scores.mean():.3f}  |  Train R2: {r2_train:.3f}")

    joblib.dump({
        "model": model,
        "scaler": scaler,
        "feature_names": feature_names,
        "coef": dict(zip(feature_names, model.coef_)),
        "intercept": model.intercept_,
        "r2_cv": cv_scores.mean(),
        "r2_train": r2_train,
    }, os.path.join(MODEL_DIR, "model.pkl"))

    zip_df = pd.DataFrame(X.values, columns=feature_names)
    zip_df.insert(0, "zip", zips)
    zip_df[TARGET] = y.values
    zip_df.to_csv(os.path.join(MODEL_DIR, "zip_features.csv"), index=False)

    print("Saved model.pkl and zip_features.csv")
    print("\nCoefficients (1 std change -> delta life expectancy years):")
    for name, coef in sorted(zip(feature_names, model.coef_), key=lambda x: abs(x[1]), reverse=True):
        print(f"  {name:<30}  {coef:+.4f}")


if __name__ == "__main__":
    main()
