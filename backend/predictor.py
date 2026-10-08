import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "electricity_model.pkl")
saved = joblib.load(MODEL_PATH)

model = saved["model"]
features = saved["features"]


def predict_consumption(data):
    df = pd.DataFrame([data])
    df = df[features]
    prediction = model.predict(df)[0]
    return round(float(prediction), 2)