"""Custom preprocessing steps used inside the saved MajiGuard pipeline.

These must live in a real, importable module (not defined inline in a
notebook or a lambda) so that `joblib.dump` / `joblib.load` can pickle and
unpickle them from any process, including a fresh FastAPI server later.

This module must stay importable (on the Python path) wherever
`majiguard_pipeline.joblib` is loaded.
"""

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin


def boolean_to_int(x):
    """Convert True/False columns to 0/1 before imputing.

    This replaces the `lambda x: x.astype(int)` that was used inside a
    FunctionTransformer in the training notebook. A lambda cannot be
    pickled by joblib/pickle, which is what caused the earlier
    PicklingError when saving the full sklearn Pipeline. A plain,
    module-level function like this one is picklable.
    """
    return x.astype(int)


class CyclicalMonthTransformer(BaseEstimator, TransformerMixin):
    """Turn `survey_month` (1-12) into sine/cosine seasonal features.

    Reproduces the training notebook's manual step exactly:
        survey_month_sin = sin(2 * pi * survey_month / 12)
        survey_month_cos = cos(2 * pi * survey_month / 12)
        drop survey_month

    Implemented as a transformer (instead of a one-off pandas step) so it
    becomes part of the saved pipeline: the pipeline can then accept a raw
    `survey_month` column and do this step itself.
    """

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = X.copy()
        X["survey_month_sin"] = np.sin(2 * np.pi * X["survey_month"] / 12)
        X["survey_month_cos"] = np.cos(2 * np.pi * X["survey_month"] / 12)
        X = X.drop(columns=["survey_month"])
        return X
