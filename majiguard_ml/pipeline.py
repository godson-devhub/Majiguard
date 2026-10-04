"""Builds the MajiGuard production pipeline: raw water-point features in,
Non-Functional probability out.

Pipeline = CyclicalMonthTransformer -> ColumnTransformer -> RandomForest

This reproduces the notebook's preprocessing (cells 232-241) exactly,
except the boolean step uses a named function instead of a lambda so the
whole pipeline can be saved with joblib.
"""

import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    FunctionTransformer,
    OneHotEncoder,
    StandardScaler,
)

from majiguard_ml.data_prep import (
    BOOLEAN_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
)
from majiguard_ml.transformers import CyclicalMonthTransformer, boolean_to_int

NON_FUNCTIONAL_CLASS = 0
FUNCTIONAL_CLASS = 1
DEPLOYMENT_THRESHOLD = 0.40


def build_preprocessor():
    """The (unfitted) ColumnTransformer, matching notebook cell 239."""
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    boolean_pipeline = Pipeline([
        ("to_numeric", FunctionTransformer(
            boolean_to_int, feature_names_out="one-to-one"
        )),
        ("imputer", SimpleImputer(strategy="most_frequent")),
    ])

    return ColumnTransformer(transformers=[
        ("numeric", numeric_pipeline, NUMERIC_FEATURES),
        ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ("boolean", boolean_pipeline, BOOLEAN_FEATURES),
    ])


def build_full_pipeline(fitted_preprocessor, trained_model):
    """Combine an already-fitted preprocessor with the already-trained
    Random Forest into one Pipeline object. Does NOT call .fit() -
    both steps must already be fitted before calling this.
    """
    return Pipeline([
        ("cyclical_month", CyclicalMonthTransformer()),
        ("preprocessing", fitted_preprocessor),
        ("model", trained_model),
    ])


def predict_with_pipeline(pipeline, X_raw):
    """Run the pipeline and return a small, human-readable result table.

    X_raw must contain the 42 raw columns in data_prep.RAW_INPUT_COLUMNS.
    """
    probabilities = pipeline.predict_proba(X_raw)
    non_functional_index = list(pipeline.named_steps["model"].classes_).index(
        NON_FUNCTIONAL_CLASS
    )
    proba_non_functional = probabilities[:, non_functional_index]

    is_non_functional = proba_non_functional >= DEPLOYMENT_THRESHOLD
    predicted_class = np.where(
        is_non_functional, NON_FUNCTIONAL_CLASS, FUNCTIONAL_CLASS
    )
    predicted_status = np.where(
        is_non_functional, "Non-Functional", "Functional"
    )

    return proba_non_functional, predicted_class, predicted_status
