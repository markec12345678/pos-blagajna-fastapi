from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FiscalItem(BaseModel):
    item_name: str = ""
    quantity: float = 1.0
    unit: str = "kos"
    unit_price: float = 0.0
    total_price: float = 0.0
    tax_rate: float = 22.0
    tax_amount: float = 0.0


class FursZaposRequest(BaseModel):
    tax_number: str = Field(..., description="Davčna številka")
    operator_id: str = Field(default="", description="ID operaterja")
    payment_method: str = Field(default="gotovina", description="Način plačila: gotovina, kartica")
    private_key_path: str = Field(default="", description="Pot do privatnega ključa za ZOI")
    cert_path: str = Field(default="", description="Pot do certifikata za mTLS")
    key_path: str = Field(default="", description="Pot do privatnega ključa za mTLS")
    environment: str = Field(default="test", description="test ali prod")


class FursZaposResponse(BaseModel):
    success: bool
    eor: str = ""
    zoi: str = ""
    xml: str = ""
    qr_data: str = ""
    errors: List[str] = []
    note: str = ""


class CroatianFiscalRequest(BaseModel):
    oib: str = Field(..., description="OIB (11-mestna davčna številka Hrvaške)")
    payment_method: str = Field(default="G", description="Vrsta plačila: G=gotovina, K=kartica, C=čeek")
    operator_id: str = Field(default="", description="ID naplatnega uređaja")
    private_key_path: str = Field(default="", description="Pot do privatnega ključa za ZKI")
    cert_path: str = Field(default="", description="Pot do certifikata za SOAP")
    key_path: str = Field(default="", description="Pot do privatnega ključa za SOAP")
    environment: str = Field(default="test", description="test ali prod")


class CroatianFiscalResponse(BaseModel):
    success: bool
    jir: str = ""
    zki: str = ""
    xml: str = ""
    signed_xml: str = ""
    errors: List[str] = []
    note: str = ""


class FiscalStatusResponse(BaseModel):
    invoice_id: int
    furs_zapos_status: str = ""
    furs_zapos_eor: str = ""
    croatian_zki: str = ""
    croatian_jir: str = ""
    eracun_status: str = ""
