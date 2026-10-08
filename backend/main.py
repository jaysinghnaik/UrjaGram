import os
import random
import pandas as pd
import numpy as np
from backend.schemas import PredictionRequest, VillagePredictionRequest
from backend.predictor import predict_consumption, model as ml_model, features as model_features
import json
import ee
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from typing import Optional

app = FastAPI(title="UrjaGram GEE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://urja-gram.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── GEE Initialisation ────────────────────────────────────────────────────────
_ee_ready = False

def init_ee():
    global _ee_ready
    key_json = os.environ.get("GEE_SERVICE_ACCOUNT_KEY")
    if not key_json:
        print("[GEE] GEE_SERVICE_ACCOUNT_KEY not set — Earth Engine disabled.")
        return
    try:
        key_data = json.loads(key_json)
        credentials = ee.ServiceAccountCredentials(
            email=key_data["client_email"],
            key_data=key_json,
        )
        ee.Initialize(credentials)
        _ee_ready = True
        print("[GEE] Earth Engine initialised ✓")
    except Exception as exc:
        print(f"[GEE] Init failed: {exc}")

init_ee()

# ── Helpers ───────────────────────────────────────────────────────────────────
def fetch_peak_sun_hours(lat: float, lng: float) -> float:
    """Return 5-year (2019–2023) average daily GHI in kWh/m²/day for a point."""
    point = ee.Geometry.Point([lng, lat])
    era5 = (
        ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY")
        .filterDate("2019-01-01", "2023-12-31")
        .select("surface_solar_radiation_downwards")
    )
    total = era5.sum()
    val = (
        total.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point,
            scale=11132,
            maxPixels=1,
        )
        .get("surface_solar_radiation_downwards")
        .getInfo()
    )
    if val is None:
        raise ValueError("No ERA5 data for this location")
    n_days = 5 * 365  # 2019-2023
    return round(val / 3_600 / 1_000 / n_days, 2)



# Load dataset for simulation
DATA_PATH = os.path.join(os.path.dirname(__file__), "data/rural_electricity_v2_dataset.csv")
if os.path.exists(DATA_PATH):
    df_data = pd.read_csv(DATA_PATH)
    df_data_sorted = df_data.sort_values(by="monthly_income").reset_index(drop=True)
else:
    df_data_sorted = None

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "geeReady": _ee_ready}


@app.get("/solar/peak-hours")
def peak_hours(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """
    Returns real satellite-derived peak sun hours for any lat/lng.
    Uses ECMWF ERA5-Land 5-year average (2019–2023).
    """
    if not _ee_ready:
        raise HTTPException(
            status_code=503,
            detail="Earth Engine not initialised — set GEE_SERVICE_ACCOUNT_KEY env var.",
        )
    try:
        psh = fetch_peak_sun_hours(lat, lng)
        return {"lat": lat, "lng": lng, "peakSunHours": psh, "source": "ERA5-Land 2019-2023"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class UrjaSakhiData(BaseModel):
    householdHead: str
    contactNumber: str
    email: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    state: str
    district: str
    address: str
    familySize: Optional[int] = None
    discom: str
    consumerAccountNumber: str
    electricitySource: str
    monthlyBill: Optional[float] = None
    sanctionedLoadKw: Optional[float] = None
    category: str = 'Residential'
    roofType: str
    roofAreaSqft: Optional[float] = None
    bankName: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    bankIfsc: Optional[str] = None
    # Assuming documents are handled as URLs or file paths for now
    aadhaarFrontUrl: Optional[str] = None
    aadhaarBackUrl: Optional[str] = None
    electricityBillFrontUrl: Optional[str] = None
    electricityBillBackUrl: Optional[str] = None
    rooftopPhotoFrontUrl: Optional[str] = None
    rooftopPhotoBackUrl: Optional[str] = None


@app.post("/api/urjasakhi/submit")
def submit_urjasakhi_data(data: UrjaSakhiData):
    """
    Plug-and-play wrapper endpoint for Urjasakhi data.
    Receives comprehensive data and splits it across multiple government/vendor silos (mocked here).
    """
    try:
        # 1. Save all data to our internal DB (Simulated or via Supabase client if configured here)
        # In a real scenario we'd insert this into Supabase urjasakhi_data here.
        print(f"[WRAPPER] Received complete PM Surya Ghar data for {data.householdHead}")

        # 2. Distribute data to Vendors (Technical & Location Info)
        vendor_payload = {
            "name": data.householdHead,
            "contact": data.contactNumber,
            "address": f"{data.address}, {data.district}, {data.state}",
            "roofAreaSqft": data.roofAreaSqft,
            "roofType": data.roofType,
            "sanctionedLoadKw": data.sanctionedLoadKw,
            "monthlyBill": data.monthlyBill,
            "rooftopPhotos": [data.rooftopPhotoFrontUrl, data.rooftopPhotoBackUrl]
        }
        print(f"[VENDOR_API] Pushed technical requirements to partner vendors: {vendor_payload['name']}")

        # 3. Distribute data to MNRE/Central Portal (Scheme Registration)
        mnre_payload = {
            "state": data.state,
            "district": data.district,
            "discom": data.discom,
            "consumerAccountNumber": data.consumerAccountNumber,
            "mobile": data.contactNumber,
            "email": data.email,
            "category": data.category
        }
        print(f"[MNRE_API] Registered case on National Portal for {mnre_payload['consumerAccountNumber']}")

        # 4. Distribute data to DISCOM (Load Sanction / Feasibility)
        discom_payload = {
            "consumerAccountNumber": data.consumerAccountNumber,
            "requestedLoadKw": data.sanctionedLoadKw,
            "electricityBillUrls": [data.electricityBillFrontUrl, data.electricityBillBackUrl]
        }
        print(f"[DISCOM_API] Initiated load feasibility with {data.discom}")

        # 5. Distribute data to Banks (Loan / Subsidy routing)
        bank_payload = {
            "applicantName": data.householdHead,
            "bankName": data.bankName,
            "accountNumber": data.bankAccountNumber,
            "ifsc": data.bankIfsc,
            "aadhaar": data.aadhaarNumber,
            "kycUrls": [data.aadhaarFrontUrl, data.aadhaarBackUrl]
        }
        if data.bankAccountNumber:
            print(f"[BANK_API] Pushed KYC and account details for subsidy routing.")

        return {
            "status": "success",
            "message": "Data orchestrated successfully across Vendor, MNRE, DISCOM, and Bank systems.",
            "dispatched": ["vendor", "mnre", "discom", "bank"]
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/simulation/predict")
def predict(payload: PredictionRequest):
    try:
        prediction = predict_consumption(payload.model_dump())

        if prediction < 100:
            solar_rec_kw = 1
            solar_subsidy = 30000
            solar_gross_cost = 60000
        elif prediction < 250:
            solar_rec_kw = 2
            solar_subsidy = 60000
            solar_gross_cost = 120000
        else:
            solar_rec_kw = 3
            solar_subsidy = 78000
            solar_gross_cost = 180000

        solar_net_cost = solar_gross_cost - solar_subsidy
        monthly_savings = round(prediction * 5, 2)
        payback_months = round(solar_net_cost / monthly_savings, 1) if monthly_savings > 0 else 0

        return {
            "prediction_kwh": prediction,
            "estimated_bill": round(prediction * 5, 2),
            "annual_consumption": round(prediction * 12, 2),
            "co2_emission": round(prediction * 12 * 0.716, 2),
            "rooftop_solar": {
                "recommended_capacity_kw": solar_rec_kw,
                "gross_cost_rs": solar_gross_cost,
                "subsidy_rs": solar_subsidy,
                "net_cost_rs": solar_net_cost,
                "monthly_savings_rs": monthly_savings,
                "payback_months": payback_months
            }
        }

    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulation/predict_village")
def predict_village(payload: VillagePredictionRequest):
    try:
        params = payload.model_dump()
        
        village_name = params.get("village_name", "Model Village")
        N = params["village_size"]
        grid_start = params["grid_reliability_start"]
        grid_end = params["grid_reliability_end"]
        income_growth = params["income_growth_rate"] / 100.0
        pop_growth = params["population_growth_rate"] / 100.0
        
        p_low = params["low_income_pct"]
        p_mid = params["mid_income_pct"]
        p_high = params["high_income_pct"]
        
        total_p = p_low + p_mid + p_high
        if total_p == 0:
            p_low, p_mid, p_high = 50.0, 40.0, 10.0
        else:
            p_low = (p_low / total_p) * 100
            p_mid = (p_mid / total_p) * 100
            p_high = (p_high / total_p) * 100
            
        trad_cooking_pct = params["traditional_cooking_pct"] / 100.0
        clean_target_pct = params["clean_transition_target_pct"] / 100.0
        
        if df_data_sorted is None:
            raise HTTPException(status_code=500, detail="Simulation dataset not found")
            
        df_low = df_data_sorted[df_data_sorted["monthly_income"] < 8000]
        df_mid = df_data_sorted[(df_data_sorted["monthly_income"] >= 8000) & (df_data_sorted["monthly_income"] < 18000)]
        df_high = df_data_sorted[df_data_sorted["monthly_income"] >= 18000]
        
        if len(df_low) == 0: df_low = df_data_sorted
        if len(df_mid) == 0: df_mid = df_data_sorted
        if len(df_high) == 0: df_high = df_data_sorted
        
        n_low = int(N * p_low / 100.0)
        n_mid = int(N * p_mid / 100.0)
        n_high = N - n_low - n_mid
        
        households = []
        
        def row_to_dict(row):
            return {
                "monthly_income": int(row["monthly_income"]),
                "family_size": int(row["family_size"]),
                "num_rooms": int(row["num_rooms"]),
                "num_fans": int(row["num_fans"]),
                "num_tv": int(row["num_tv"]),
                "num_ac": int(row["num_ac"]),
                "num_cooler": int(row["num_cooler"]),
                "has_fridge": int(row["has_fridge"]),
                "num_geyser": int(row["num_geyser"]),
                "num_heater": int(row["num_heater"]),
                "has_mixer": int(row["has_mixer"]),
                "has_washing_machine": int(row["has_washing_machine"]),
                "has_pump": int(row["has_pump"]),
                "num_bulbs": int(row["num_bulbs"])
            }
            
        for _ in range(n_low):
            row = df_low.sample(n=1).iloc[0]
            households.append(row_to_dict(row))
        for _ in range(n_mid):
            row = df_mid.sample(n=1).iloc[0]
            households.append(row_to_dict(row))
        for _ in range(n_high):
            row = df_high.sample(n=1).iloc[0]
            households.append(row_to_dict(row))
            
        roadmap = []
        dataset_incomes = df_data_sorted["monthly_income"].values
        
        for year in range(1, 6):
            supply_hours = grid_start + (year - 1) * (grid_end - grid_start) / 4.0
            supply_hours = max(2.0, min(24.0, supply_hours))
            
            if year > 1:
                n_new = int(len(households) * pop_growth)
                for _ in range(n_new):
                    rand_val = random.random() * 100.0
                    if rand_val < p_low:
                        row = df_low.sample(n=1).iloc[0]
                    elif rand_val < p_low + p_mid:
                        row = df_mid.sample(n=1).iloc[0]
                    else:
                        row = df_high.sample(n=1).iloc[0]
                    households.append(row_to_dict(row))
                    
            if year > 1:
                for hh in households:
                    hh["monthly_income"] = int(hh["monthly_income"] * (1 + income_growth))
                    target_income = hh["monthly_income"]
                    idx = np.searchsorted(dataset_incomes, target_income)
                    start_idx = max(0, idx - 20)
                    end_idx = min(len(df_data_sorted) - 1, idx + 20)
                    sampled_idx = random.randint(start_idx, end_idx)
                    sampled_row = df_data_sorted.iloc[sampled_idx]
                    
                    hh["family_size"] = int(sampled_row["family_size"])
                    hh["num_rooms"] = int(sampled_row["num_rooms"])
                    hh["num_fans"] = int(sampled_row["num_fans"])
                    hh["num_tv"] = int(sampled_row["num_tv"])
                    hh["num_ac"] = int(sampled_row["num_ac"])
                    hh["num_cooler"] = int(sampled_row["num_cooler"])
                    hh["has_fridge"] = int(sampled_row["has_fridge"])
                    hh["num_geyser"] = int(sampled_row["num_geyser"])
                    hh["num_heater"] = int(sampled_row["num_heater"])
                    hh["has_mixer"] = int(sampled_row["has_mixer"])
                    hh["has_washing_machine"] = int(sampled_row["has_washing_machine"])
                    hh["has_pump"] = int(sampled_row["has_pump"])
                    hh["num_bulbs"] = int(sampled_row["num_bulbs"])
            
            clean_share = (year - 1) * clean_target_pct / 4.0
            n_transitioned = int(len(households) * clean_share)
            
            batch_data_summer = []
            batch_data_monsoon = []
            batch_data_winter = []
            
            for index, hh in enumerate(households):
                cooking_load = 30.0 if index < n_transitioned else 0.0
                
                base_feat = hh.copy()
                base_feat["supply_hours_per_day"] = int(supply_hours)
                
                summer_feat = base_feat.copy()
                summer_feat["season"] = 1
                batch_data_summer.append(summer_feat)
                
                monsoon_feat = base_feat.copy()
                monsoon_feat["season"] = 2
                batch_data_monsoon.append(monsoon_feat)
                
                winter_feat = base_feat.copy()
                winter_feat["season"] = 3
                batch_data_winter.append(winter_feat)
                
            df_summer = pd.DataFrame(batch_data_summer)[model_features]
            df_monsoon = pd.DataFrame(batch_data_monsoon)[model_features]
            df_winter = pd.DataFrame(batch_data_winter)[model_features]
            
            preds_summer = np.maximum(0, ml_model.predict(df_summer))
            preds_monsoon = np.maximum(0, ml_model.predict(df_monsoon))
            preds_winter = np.maximum(0, ml_model.predict(df_winter))
            
            hh_annual_kwh = []
            for i in range(len(households)):
                cooking_annual = 12.0 * 30.0 if i < n_transitioned else 0.0
                val = 3.0 * preds_summer[i] + 3.0 * preds_monsoon[i] + 6.0 * preds_winter[i] + cooking_annual
                hh_annual_kwh.append(val)
                
            village_annual_mwh = sum(hh_annual_kwh) / 1000.0
            elec_clean_mwh = village_annual_mwh * clean_share
            elec_grid_mwh = village_annual_mwh * (1.0 - clean_share)
            
            trad_share = trad_cooking_pct * (1.0 - clean_share)
            n_traditional = int(len(households) * trad_share)
            
            pump_count = sum(1 for hh in households if hh["has_pump"] == 1)
            diesel_pumps = int(pump_count * trad_share)
            
            firewood_tons = n_traditional * 1.5
            kerosene_liters = n_traditional * 60
            diesel_liters = diesel_pumps * 100
            
            wood_saved_tons = (len(households) * trad_cooking_pct - n_traditional) * 1.5
            wood_saved_tons = max(0.0, wood_saved_tons)
            
            kerosene_saved_liters = (len(households) * trad_cooking_pct - n_traditional) * 60
            kerosene_saved_liters = max(0.0, kerosene_saved_liters)
            
            diesel_saved_liters = (pump_count * trad_cooking_pct - diesel_pumps) * 100
            diesel_saved_liters = max(0.0, diesel_saved_liters)
            
            base_elec_grid_mwh = village_annual_mwh
            base_n_traditional = int(len(households) * trad_cooking_pct)
            base_diesel_pumps = int(pump_count * trad_cooking_pct)
            
            base_co2_grid = base_elec_grid_mwh * 0.716
            base_co2_trad = base_n_traditional * 2.5 + base_n_traditional * 0.16 + base_diesel_pumps * 0.26
            total_co2_baseline = base_co2_grid + base_co2_trad
            
            trans_co2_grid = elec_grid_mwh * 0.716
            trans_co2_trad = n_traditional * 2.5 + n_traditional * 0.16 + diesel_pumps * 0.26
            total_co2_transition = trans_co2_grid + trans_co2_trad
            
            co2_saved_tons = total_co2_baseline - total_co2_transition
            
            avg_income = sum(hh["monthly_income"] for hh in households) / len(households)
            
            fridge_count = sum(1 for hh in households if hh["has_fridge"] == 1)
            ac_count = sum(1 for hh in households if hh["num_ac"] > 0)
            fridge_ownership_pct = (fridge_count / len(households)) * 100
            ac_ownership_pct = (ac_count / len(households)) * 100
            
            roadmap.append({
                "year": year,
                "households": len(households),
                "avg_income": round(avg_income, 0),
                "supply_hours": round(supply_hours, 1),
                "clean_share_pct": round(clean_share * 100, 1),
                "total_demand_mwh": round(village_annual_mwh, 2),
                "clean_generation_mwh": round(elec_clean_mwh, 2),
                "grid_consumption_mwh": round(elec_grid_mwh, 2),
                "firewood_tons": round(firewood_tons, 1),
                "kerosene_liters": int(kerosene_liters),
                "diesel_liters": int(diesel_liters),
                "wood_saved_tons": round(wood_saved_tons, 1),
                "kerosene_saved_liters": int(kerosene_saved_liters),
                "diesel_saved_liters": int(diesel_saved_liters),
                "co2_baseline_tons": round(total_co2_baseline, 1),
                "co2_transition_tons": round(total_co2_transition, 1),
                "co2_saved_tons": round(co2_saved_tons, 1),
                "fridge_ownership_pct": round(fridge_ownership_pct, 1),
                "ac_ownership_pct": round(ac_ownership_pct, 1)
            })
            
        y5 = roadmap[-1]
        y5_clean_generation_mwh = y5["clean_generation_mwh"]
        
        solar_generation_mwh = y5_clean_generation_mwh * 0.85
        wind_generation_mwh = y5_clean_generation_mwh * 0.15
        
        solar_capacity_kw = solar_generation_mwh / 1.577 if solar_generation_mwh > 0 else 0.0
        wind_capacity_kw = wind_generation_mwh / 1.927 if wind_generation_mwh > 0 else 0.0
        battery_storage_kwh = solar_capacity_kw * 3.5 if solar_capacity_kw > 0 else 0.0
        
        pumps_transitioned = pump_count * clean_target_pct
        solar_pumps_count = int(pumps_transitioned)
        solar_pumps_capacity_kw = solar_pumps_count * 3.7
        
        cost_solar_gross = (solar_capacity_kw * 60000.0) / 100000.0
        cost_solar_subsidy = cost_solar_gross * 0.40
        cost_solar_net = cost_solar_gross - cost_solar_subsidy
        
        cost_battery = (battery_storage_kwh * 15000.0) / 100000.0
        
        cost_wind_gross = (wind_capacity_kw * 80000.0) / 100000.0
        cost_wind_subsidy = cost_wind_gross * 0.25
        cost_wind_net = cost_wind_gross - cost_wind_subsidy
        
        cost_pumps_gross = (solar_pumps_count * 250000.0) / 100000.0
        cost_pumps_subsidy = cost_pumps_gross * 0.60
        cost_pumps_net = cost_pumps_gross - cost_pumps_subsidy
        
        total_investment_gross = cost_solar_gross + cost_battery + cost_wind_gross + cost_pumps_gross
        total_subsidy = cost_solar_subsidy + cost_wind_subsidy + cost_pumps_subsidy
        total_investment_net = total_investment_gross - total_subsidy
        
        elec_savings = (y5_clean_generation_mwh * 1000.0 * 5.0) / 100000.0
        wood_savings = (y5["wood_saved_tons"] * 3000.0) / 100000.0
        kerosene_savings = (y5["kerosene_saved_liters"] * 70.0) / 100000.0
        diesel_savings = (y5["diesel_saved_liters"] * 90.0) / 100000.0
        
        total_annual_savings = elec_savings + wood_savings + kerosene_savings + diesel_savings
        
        if total_annual_savings > 0:
            payback_years = total_investment_net / total_annual_savings
            payback_years = max(1.5, min(10.0, payback_years))
        else:
            payback_years = 0.0

        annual_opex_lakhs = total_investment_gross * 0.02
        
        cash_flows_list = []
        cumulative_co2_saved = 0.0
        
        for t in range(1, 16):
            if t <= 5:
                y_data = roadmap[t-1]
                y_elec_savings = (y_data["clean_generation_mwh"] * 1000.0 * 5.0) / 100000.0
                y_wood_savings = (y_data["wood_saved_tons"] * 3000.0) / 100000.0
                y_kerosene_savings = (y_data["kerosene_saved_liters"] * 70.0) / 100000.0
                y_diesel_savings = (y_data["diesel_saved_liters"] * 90.0) / 100000.0
                y_savings = y_elec_savings + y_wood_savings + y_kerosene_savings + y_diesel_savings
                y_co2 = y_data["co2_saved_tons"]
            else:
                y_savings = total_annual_savings
                y_co2 = y5["co2_saved_tons"]
                
            y_carbon_rev = (y_co2 * 1250.0) / 100000.0
            
            net_cf = y_savings + y_carbon_rev - annual_opex_lakhs
            cash_flows_list.append(net_cf)
            cumulative_co2_saved += y_co2

        npv_lakhs = -total_investment_net + sum(cf / ((1.10) ** t) for t, cf in enumerate(cash_flows_list, 1))
        
        def solve_irr(capx_net, cfs):
            if capx_net <= 0:
                return 100.0
            low_r, high_r = -0.30, 3.0
            def npv_f(r):
                return -capx_net + sum(cf / ((1.0 + r) ** t) for t, cf in enumerate(cfs, 1))
            
            if npv_f(low_r) * npv_f(high_r) > 0:
                return 200.0 if npv_f(high_r) > 0 else -30.0
                
            for _ in range(80):
                mid_r = (low_r + high_r) / 2.0
                val = npv_f(mid_r)
                if abs(val) < 1e-6:
                    return mid_r * 100.0
                if val > 0:
                    low_r = mid_r
                else:
                    high_r = mid_r
            return ((low_r + high_r) / 2.0) * 100.0
            
        irr_pct = solve_irr(total_investment_net, cash_flows_list)
        
        pv_costs_lakhs = total_investment_net + sum(annual_opex_lakhs / ((1.10) ** t) for t in range(1, 16))
        pv_gen_mwh = sum((roadmap[t-1]["clean_generation_mwh"] if t <= 5 else y5["clean_generation_mwh"]) / ((1.10) ** t) for t in range(1, 16))
        
        lcoe_rs_kwh = (pv_costs_lakhs * 100000.0) / (pv_gen_mwh * 1000.0) if pv_gen_mwh > 0 else 0.0
        
        total_carbon_rev_lakhs = (cumulative_co2_saved * 1250.0) / 100000.0
        
        investor_summary = {
            "project_irr_pct": round(irr_pct, 2),
            "npv_lakhs": round(npv_lakhs, 2),
            "lcoe_rs_kwh": round(lcoe_rs_kwh, 2),
            "total_carbon_rev_lakhs": round(total_carbon_rev_lakhs, 2),
            "annual_opex_lakhs": round(annual_opex_lakhs, 2),
            "cash_flows_15y": [round(cf, 2) for cf in cash_flows_list]
        }
        
        sizing_summary = {
            "solar_capacity_kw": round(solar_capacity_kw, 1),
            "wind_capacity_kw": round(wind_capacity_kw, 1),
            "battery_storage_kwh": round(battery_storage_kwh, 1),
            "solar_pumps_count": solar_pumps_count,
            "solar_pumps_capacity_kw": round(solar_pumps_capacity_kw, 1),
            "cost_solar_lakhs": round(cost_solar_net, 2),
            "cost_battery_lakhs": round(cost_battery, 2),
            "cost_wind_lakhs": round(cost_wind_net, 2),
            "cost_pumps_lakhs": round(cost_pumps_net, 2),
            "total_investment_gross_lakhs": round(total_investment_gross, 2),
            "total_subsidy_lakhs": round(total_subsidy, 2),
            "total_investment_net_lakhs": round(total_investment_net, 2),
            "annual_savings_lakhs": round(total_annual_savings, 2),
            "payback_years": round(payback_years, 1),
            "grid_offset_mwh": round(y5_clean_generation_mwh, 2),
            "firewood_offset_tons": round(y5["wood_saved_tons"], 1),
            "kerosene_offset_liters": int(y5["kerosene_saved_liters"]),
            "diesel_offset_liters": int(y5["diesel_saved_liters"]),
            "total_co2_saved_tons": round(y5["co2_saved_tons"], 1)
        }
        
        return {
            "status": "success",
            "village_name": village_name,
            "roadmap": roadmap,
            "sizing_recommendations": sizing_summary,
            "investor_metrics": investor_summary
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
