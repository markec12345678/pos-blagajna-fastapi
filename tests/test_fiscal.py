import os
import hashlib
import base64
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes


# ── Shared helpers ──

def _generate_rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _save_key_to_file(key, password=None):
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption() if password is None else serialization.BestAvailableEncryption(password.encode()),
    )
    f = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
    f.write(pem)
    f.close()
    return f.name


def _save_cert_to_file():
    f = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
    f.write(b"-----BEGIN CERTIFICATE-----\nMIIBkTCB+wI...\n-----END CERTIFICATE-----")
    f.close()
    return f.name


# ── FURS ZAPOS Tests ──

from app.core.furs_zapos import (
    generate_zapos_xml,
    calculate_zoi,
    generate_qr_data,
    submit_to_furs,
    verify_furs_response,
    fiscalize_zapos,
)


class TestFursZaposXml:
    def test_generate_zapos_xml_basic(self):
        items = [{"item_name": "Margherita", "quantity": 1, "unit": "kos", "unit_price": 8.50, "total_price": 8.50, "tax_rate": 22.0, "tax_amount": 1.55}]
        xml = generate_zapos_xml(
            tax_number="12345678",
            invoice_number="RAC-2024-0001",
            issued_at=datetime(2024, 6, 15, 10, 30, 0),
            items=items,
            subtotal=8.50,
            tax_total=1.55,
            total=8.50,
        )
        assert "DavcnaStevilka" in xml
        assert "12345678" in xml
        assert "RAC-2024-0001" in xml
        assert "Margherita" in xml
        assert "8.50" in xml

    def test_generate_zapos_xml_with_zoi_eor(self):
        items = [{"item_name": "Caesar", "quantity": 2, "unit": "kos", "unit_price": 7.50, "total_price": 15.00, "tax_rate": 22.0, "tax_amount": 2.73}]
        xml = generate_zapos_xml(
            tax_number="SI12345678",
            invoice_number="RAC-001",
            issued_at=datetime(2024, 1, 1, 12, 0, 0),
            items=items,
            subtotal=15.00,
            tax_total=2.73,
            total=15.00,
            zoi="ABC123DEF456",
            eor="EOR12345",
        )
        assert "ABC123DEF456" in xml
        assert "EOR12345" in xml

    def test_generate_zapos_xml_multiple_items(self):
        items = [
            {"item_name": "Pizza", "quantity": 2, "unit": "kos", "unit_price": 10.0, "total_price": 20.0, "tax_rate": 22.0, "tax_amount": 3.64},
            {"item_name": "Pivo", "quantity": 3, "unit": "kos", "unit_price": 3.0, "total_price": 9.0, "tax_rate": 22.0, "tax_amount": 1.62},
        ]
        xml = generate_zapos_xml(
            tax_number="11111111",
            invoice_number="RAC-002",
            issued_at=datetime(2024, 3, 10, 18, 0, 0),
            items=items,
            subtotal=29.00,
            tax_total=5.26,
            total=29.00,
        )
        assert "Pizza" in xml
        assert "Pivo" in xml
        assert "29.00" in xml

    def test_generate_zapos_xml_payment_method(self):
        items = [{"item_name": "Item", "quantity": 1, "unit": "kos", "unit_price": 5.0, "total_price": 5.0, "tax_rate": 0.0, "tax_amount": 0.0}]
        xml = generate_zapos_xml(
            tax_number="22222222",
            invoice_number="RAC-003",
            issued_at=datetime(2024, 5, 1, 8, 0, 0),
            items=items,
            subtotal=5.0,
            tax_total=0.0,
            total=5.0,
            payment_method="kartica",
        )
        assert "kartica" in xml


class TestFursZoi:
    def test_calculate_zoi_returns_hex(self):
        key_path = _save_key_to_file(_generate_rsa_key())
        try:
            zoi = calculate_zoi(
                {
                    "tax_number": "12345678",
                    "invoice_number": "RAC-001",
                    "issued_at": "2024-06-15T10:30:00",
                    "total": 25.50,
                },
                key_path,
            )
            assert len(zoi) == 64
            assert all(c in "0123456789ABCDEF" for c in zoi)
        finally:
            os.unlink(key_path)

    def test_calculate_zoi_deterministic(self):
        key_path = _save_key_to_file(_generate_rsa_key())
        try:
            data = {"tax_number": "123", "invoice_number": "R1", "issued_at": "2024-01-01T00:00:00", "total": 10.0}
            zoi1 = calculate_zoi(data, key_path)
            zoi2 = calculate_zoi(data, key_path)
            assert zoi1 == zoi2
        finally:
            os.unlink(key_path)

    def test_calculate_zoi_different_data(self):
        key_path = _save_key_to_file(_generate_rsa_key())
        try:
            zoi1 = calculate_zoi({"tax_number": "111", "invoice_number": "A", "issued_at": "2024-01-01T00:00:00", "total": 1.0}, key_path)
            zoi2 = calculate_zoi({"tax_number": "222", "invoice_number": "B", "issued_at": "2024-01-01T00:00:00", "total": 2.0}, key_path)
            assert zoi1 != zoi2
        finally:
            os.unlink(key_path)


class TestFursQrData:
    def test_qr_data_length(self):
        qr = generate_qr_data(
            eor="EOR12345",
            zoi="ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890",
            tax_number="12345678",
            total=25.50,
            issued_at=datetime(2024, 6, 15, 10, 30, 0),
        )
        assert len(qr) == 70

    def test_qr_data_contains_tax_number(self):
        qr = generate_qr_data(
            eor="",
            zoi="A" * 64,
            tax_number="12345678",
            total=10.0,
            issued_at=datetime(2024, 1, 1),
        )
        assert "12345678" in qr


class TestFursResponse:
    def test_valid_response(self):
        result = verify_furs_response({"success": True, "EOR": "EOR12345678"})
        assert result["valid"] is True
        assert result["eor"] == "EOR12345678"

    def test_error_response(self):
        result = verify_furs_response({"success": False, "errorCode": "E001", "errorMessage": "Invalid data"})
        assert result["valid"] is False
        assert len(result["errors"]) > 0

    def test_empty_response(self):
        result = verify_furs_response({})
        assert result["valid"] is False

    def test_none_response(self):
        result = verify_furs_response(None)
        assert result["valid"] is False


class TestFursFiscalize:
    def test_fiscalize_without_cert(self):
        result = fiscalize_zapos(
            tax_number="12345678",
            invoice_number="RAC-001",
            issued_at=datetime(2024, 6, 15, 10, 0, 0),
            items=[{"item_name": "Item", "quantity": 1, "unit": "kos", "unit_price": 10.0, "total_price": 10.0, "tax_rate": 22.0, "tax_amount": 1.80}],
            subtotal=10.0,
            tax_total=1.80,
            total=10.0,
        )
        assert result["success"] is True
        assert result["xml"] != ""
        assert result["note"] != ""


# ── Croatian Fiscal Tests ──

from app.core.croatian_fiscal import (
    generate_croatian_invoice_xml,
    calculate_zki,
    sign_xml,
    parse_croatian_response,
    fiscalize_croatian,
    validate_oib,
)


class TestCroatianXml:
    def test_generate_xml_basic(self):
        items = [{"item_name": "Riba", "quantity": 1, "unit": "kom", "unit_price": 15.0, "total_price": 15.0, "tax_rate": 25.0, "tax_amount": 3.0}]
        xml = generate_croatian_invoice_xml(
            oib="12345678901",
            invoice_number="1",
            issued_at=datetime(2024, 6, 15, 10, 30, 0),
            items=items,
            subtotal=15.0,
            tax_total=3.0,
            total=15.0,
        )
        assert "Oib" in xml
        assert "12345678901" in xml
        assert "Riba" in xml
        assert "15.00" in xml

    def test_generate_xml_payment_methods(self):
        items = [{"item_name": "Pivo", "quantity": 1, "unit": "kom", "unit_price": 3.0, "total_price": 3.0, "tax_rate": 25.0, "tax_amount": 0.6}]
        for method in ["G", "K", "C", "T"]:
            xml = generate_croatian_invoice_xml(
                oib="12345678901",
                invoice_number="1",
                issued_at=datetime(2024, 1, 1),
                items=items,
                subtotal=3.0,
                tax_total=0.6,
                total=3.6,
                payment_method=method,
            )
            assert method in xml

    def test_generate_xml_with_zki_jir(self):
        items = [{"item_name": "Test", "quantity": 1, "unit": "kom", "unit_price": 5.0, "total_price": 5.0, "tax_rate": 25.0, "tax_amount": 1.0}]
        xml = generate_croatian_invoice_xml(
            oib="12345678901",
            invoice_number="42",
            issued_at=datetime(2024, 3, 20, 14, 0, 0),
            items=items,
            subtotal=5.0,
            tax_total=1.0,
            total=6.0,
            zki="testzki123",
            jir="testjir456",
        )
        assert "testzki123" in xml
        assert "testjir456" in xml


class TestCroatianZki:
    def test_calculate_zki_base64(self):
        key_path = _save_key_to_file(_generate_rsa_key())
        try:
            zki = calculate_zki(
                {
                    "oib": "12345678901",
                    "invoice_number": "1",
                    "issued_at": "15.06.2024T10:30:00",
                    "total": 25.50,
                    "payment_method": "G",
                },
                key_path,
            )
            decoded = base64.b64decode(zki)
            assert len(decoded) > 0
        finally:
            os.unlink(key_path)

    def test_calculate_zki_deterministic(self):
        key_path = _save_key_to_file(_generate_rsa_key())
        try:
            data = {"oib": "12345678901", "invoice_number": "1", "issued_at": "01.01.2024T00:00:00", "total": 10.0, "payment_method": "G"}
            zki1 = calculate_zki(data, key_path)
            zki2 = calculate_zki(data, key_path)
            assert zki1 == zki2
        finally:
            os.unlink(key_path)


class TestCroatianXmlSigning:
    def test_sign_xml_adds_signature(self):
        key = _generate_rsa_key()
        key_path = _save_key_to_file(key)
        cert_path = _save_cert_to_file()
        try:
            xml = '<?xml version="1.0" encoding="UTF-8"?><Root><Data>test</Data></Root>'
            signed = sign_xml(xml, cert_path, key_path)
            assert "Signature" in signed
            assert "SignedInfo" in signed
            assert "SignatureValue" in signed
            assert "X509Certificate" in signed
        finally:
            os.unlink(key_path)
            os.unlink(cert_path)


class TestCroatianResponse:
    def test_valid_jir(self):
        result = parse_croatian_response({
            "success": True,
            "response_text": '<?xml version="1.0"?><Resp><Jir>abc-123-def</Jir></Resp>',
        })
        assert result["valid"] is True
        assert result["jir"] == "abc-123-def"

    def test_error_response(self):
        result = parse_croatian_response({"success": False, "error": "Connection failed"})
        assert result["valid"] is False
        assert len(result["errors"]) > 0

    def test_empty_response(self):
        result = parse_croatian_response(None)
        assert result["valid"] is False


class TestCroatianFiscalize:
    def test_fiscalize_without_cert(self):
        result = fiscalize_croatian(
            oib="12345678901",
            invoice_number="1",
            issued_at=datetime(2024, 6, 15, 10, 0, 0),
            items=[{"item_name": "Item", "quantity": 1, "unit": "kom", "unit_price": 10.0, "total_price": 10.0, "tax_rate": 25.0, "tax_amount": 2.0}],
            subtotal=10.0,
            tax_total=2.0,
            total=12.0,
        )
        assert result["success"] is True
        assert result["xml"] != ""


class TestOibValidation:
    def test_valid_oib(self):
        assert validate_oib("12345678900") is True

    def test_invalid_oib(self):
        assert validate_oib("12345678901") is False

    def test_wrong_length(self):
        assert validate_oib("12345") is False

    def test_non_numeric(self):
        assert validate_oib("1234567890A") is False

    def test_empty(self):
        assert validate_oib("") is False


# ── Error Handler Tests ──

from app.core.error_handler import register_error_handlers
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient


class TestErrorHandler:
    def test_404_handler(self):
        app = FastAPI()
        register_error_handlers(app)

        @app.get("/missing")
        def missing_route():
            raise HTTPException(404, "Not found")

        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/missing")
        assert r.status_code == 404
        assert "not found" in r.json()["detail"].lower()

    def test_400_handler(self):
        app = FastAPI()
        register_error_handlers(app)

        @app.get("/bad")
        def bad_request():
            raise HTTPException(400, "Invalid input")

        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/bad")
        assert r.status_code == 400
        assert "Invalid input" in r.json()["detail"]

    def test_global_exception_handler(self):
        app = FastAPI()
        register_error_handlers(app)

        @app.get("/crash")
        def crash():
            raise RuntimeError("boom")

        client = TestClient(app, raise_server_exceptions=False)
        r = client.get("/crash")
        assert r.status_code == 500
        assert r.json()["detail"] == "Internal server error"
