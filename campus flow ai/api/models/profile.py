from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    college_name: str | None = Field(default=None, max_length=160)
    timezone: str = Field(min_length=1, max_length=64)
    minimum_attendance_percentage: float = Field(ge=0, le=100)
