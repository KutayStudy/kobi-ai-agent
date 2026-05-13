from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    stock: int
    critical_stock: int
    price: float


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_name: str
    product_id: int
    quantity: int
    status: str
    cargo_tracking_no: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Cargo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tracking_no: str
    status: str
    estimated_delivery: str
    delayed: bool = False


class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str
    message: str
    resolved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)