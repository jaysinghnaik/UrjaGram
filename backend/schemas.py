from pydantic import BaseModel, Field
from typing import Optional

class PredictionRequest(BaseModel):

    monthly_income: int = Field(..., ge=0)

    family_size: int = Field(..., ge=1)

    num_rooms: int = Field(..., ge=1)

    num_fans: int = Field(..., ge=0)

    num_tv: int = Field(..., ge=0)

    num_ac: int = Field(..., ge=0)

    num_cooler: int = Field(..., ge=0)

    has_fridge: int = Field(..., ge=0, le=1)

    num_geyser: int = Field(..., ge=0)

    num_heater: int = Field(..., ge=0)

    has_mixer: int = Field(..., ge=0, le=1)

    has_washing_machine: int = Field(..., ge=0, le=1)

    has_pump: int = Field(..., ge=0, le=1)

    num_bulbs: int = Field(..., ge=0)

    supply_hours_per_day: int = Field(..., ge=0, le=24)

    season: int = Field(..., ge=1, le=3)


class VillagePredictionRequest(BaseModel):

    village_name: Optional[str] = Field("Model Village", max_length=100)

    village_size: int = Field(..., ge=10, le=3000)

    grid_reliability_start: float = Field(..., ge=2.0, le=24.0)

    grid_reliability_end: float = Field(..., ge=2.0, le=24.0)

    income_growth_rate: float = Field(..., ge=0.0, le=25.0)

    population_growth_rate: float = Field(..., ge=0.0, le=15.0)

    low_income_pct: float = Field(..., ge=0.0, le=100.0)

    mid_income_pct: float = Field(..., ge=0.0, le=100.0)

    high_income_pct: float = Field(..., ge=0.0, le=100.0)

    traditional_cooking_pct: float = Field(..., ge=0.0, le=100.0)

    clean_transition_target_pct: float = Field(..., ge=0.0, le=100.0)