from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

AccountStatus = Literal["pending", "approved", "rejected", "disabled"]


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: str = Field(min_length=5, max_length=255)
    # A known code (ministry_of_water, ruwasa, district_water_authority) or a typed institution name.
    institution: str = Field(min_length=2, max_length=200)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("institution")
    @classmethod
    def _institution(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise PydanticCustomError("institution_required", "Enter your institution")
        return value

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        value = value.strip().lower()
        local, _, domain = value.partition("@")
        if not local or "." not in domain or " " in value:
            # PydanticCustomError keeps the error payload JSON-serialisable for the API error handler.
            raise PydanticCustomError("invalid_email", "Enter a valid email address")
        return value

    @field_validator("full_name")
    @classmethod
    def _name(cls, value: str) -> str:
        return " ".join(value.split())


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    institution: str
    status: AccountStatus
    is_admin: bool
    created_at: datetime
    approved_at: datetime | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut
