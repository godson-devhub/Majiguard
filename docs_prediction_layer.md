# Step 4 — Prediction layer

`majiguard_ml.predict` loads the unchanged serialized MajiGuard preprocessing and Random Forest pipeline and predicts from an exact prepared 42-feature record. It delegates preprocessing to the saved pipeline; it does not encode or scale features itself.

The model decision is **Non-Functional** when `probability_non_functional >= 0.40`; otherwise it is **Functional**. `risk_band` is presentation-only: `<0.40` Functional, `0.40–<0.70` Non-Functional / Moderate Risk, and `>=0.70` Non-Functional / High Risk. Risk bands do not change the model decision.

The five unresolved WPDx+ road/city/town features are required inputs and are never imputed, fabricated, or replaced by proxies. Prediction fails clearly when required inputs are missing.
