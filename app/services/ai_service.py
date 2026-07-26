"""
AI Service — Puter.com free API integration.

Uses z-ai/glm-5 (free via Puter) for natural language features:
- Menu search in Slovenian
- Combo/upsell suggestions
- Order summaries
- Customer insights
"""
import httpx
import json
import logging
import time
import hashlib
from typing import Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Simple in-memory cache with TTL
_ai_cache = {}
CACHE_TTL = 300  # 5 minutes

def _get_cache_key(prompt: str, system: str, model: str) -> str:
    """Generate cache key from prompt and system message."""
    key = f"{model}:{system}:{prompt}"
    return hashlib.md5(key.encode(), usedforsecurity=False).hexdigest()

def _get_cached(key: str) -> Optional[str]:
    """Get cached result if not expired."""
    if key in _ai_cache:
        result, timestamp = _ai_cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return result
        del _ai_cache[key]
    return None

def _set_cache(key: str, result: str):
    """Cache result with timestamp."""
    _ai_cache[key] = (result, time.time())

PUTER_API_URL = "https://api.puter.com/puterai/openai/v1/chat/completions"


def _call_puter(prompt: str, system: str = "", model: str = "z-ai/glm-5", max_tokens: int = 500, use_cache: bool = True) -> str:
    """Call Puter AI API (free, no API key needed from frontend — but we use server-side)."""
    # Check cache first
    cache_key = _get_cache_key(prompt, system, model)
    if use_cache:
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached

    from app.core.config import get_settings
    token = get_settings().PUTER_TOKEN
    if not token:
        logger.warning("PUTER_TOKEN not configured")
        return ""

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        resp = httpx.post(
            PUTER_API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            timeout=30,
        )
        if resp.status_code != 200:
            logger.error(f"AI API error: {resp.status_code} - {resp.text}")
            return ""
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        result = content.strip()
        if use_cache and result:
            _set_cache(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"AI call failed: {e}")
        return ""


def ai_menu_search(query: str, menu_items: list[dict]) -> list[dict]:
    """Natural language menu search. Returns matching item IDs with relevance scores."""
    if not query or not menu_items:
        return []

    menu_text = "\n".join([
        f"- ID:{item['id']} | {item['name']} | {item.get('category', '')} | {item.get('price', 0)}€ | {item.get('description', '')}"
        for item in menu_items[:100]
    ])

    system = (
        "Si pomočnik za iskanje po jedilniku restavracije. "
        "Uporabnik bo opisal kaj išče v naravnem jeziku (lahko v slovenščini ali angleščini). "
        "Vrni SAMO JSON seznam ID-jev artiklov, ki ustrezajo iskanju, urejen po ustreznosti. "
        "Format: [{\"id\": 123, \"reason\": \"kratka razlog\"}]"
    )

    prompt = f"Jedilnik:\n{menu_text}\n\nIskanje: {query}\n\nVrni JSON seznam ustreznih ID-jev:"
    result = _call_puter(prompt, system, max_tokens=300)

    if not result:
        # Fallback to simple keyword search
        return _simple_fallback_search(query, menu_items)

    try:
        # Try to extract JSON from response
        start = result.find('[')
        end = result.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
    except json.JSONDecodeError:
        pass
    # Fallback on parse error
    return _simple_fallback_search(query, menu_items)


def ai_combo_suggestions(cart_items: list[dict], menu_items: list[dict]) -> list[dict]:
    """Suggest combo/upsell items based on what's in the cart."""
    if not cart_items:
        return []

    cart_text = ", ".join([f"{i.get('name', '')} ({i.get('price', 0)}€)" for i in cart_items])
    menu_text = "\n".join([
        f"- ID:{item['id']} | {item['name']} | {item.get('category', '')} | {item.get('price', 0)}€"
        for item in menu_items[:100]
    ])

    system = (
        "Si pameten pomočnik za prodajo v restavraciji. "
        "Predlagaj 2-4 artikle, ki se dobro ujemajo z že izbranimi artikli v košarici. "
        "Upoštevaj kategorije, cene in logične kombinacije (npr. pivo k burgerju, solata k pici). "
        "Vrni SAMO JSON seznam."
    )

    prompt = (
        f"V košarici: {cart_text}\n\n"
        f"Meni:\n{menu_text}\n\n"
        f"Predlagaj 2-4 komplementarne artikle. Format: [{{\"id\": 123, \"reason\": \"razlog\"}}]"
    )
    result = _call_puter(prompt, system, max_tokens=200)

    if not result:
        # Fallback to simple category-based suggestions
        return _simple_fallback_combo(cart_items, menu_items)

    try:
        start = result.find('[')
        end = result.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
    except json.JSONDecodeError:
        pass
    # Fallback on parse error
    return _simple_fallback_combo(cart_items, menu_items)


def ai_order_summary(order_data: dict) -> str:
    """Generate a natural language summary of an order (for kitchen notes, customer messages, etc.)."""
    items_text = ", ".join([
        f"{i.get('quantity', 1)}x {i.get('name', '')}" for i in order_data.get("items", [])
    ])

    system = "Si pomočnik v restavraciji. Opiši naročilo v 1-2 kratkih stavkah v slovenščini."
    prompt = f"Naročilo: {items_text}. Skupaj: {order_data.get('total', 0)}€"

    return _call_puter(prompt, system, max_tokens=100)


def _simple_fallback_search(query: str, menu_items: list[dict]) -> list[dict]:
    """Simple keyword-based fallback when AI is unavailable."""
    query_lower = query.lower()
    results = []
    for item in menu_items:
        name = item.get('name', '').lower()
        desc = item.get('description', '').lower()
        if query_lower in name or query_lower in desc:
            results.append({"id": item['id'], "reason": "Najdeno po ključnih besedah"})
    return results[:5]


def _simple_fallback_combo(cart_items: list[dict], menu_items: list[dict]) -> list[dict]:
    """Simple category-based fallback for combo suggestions."""
    if not cart_items:
        return []
    # Get categories in cart
    cart_cats = set(i.get('category', '') for i in cart_items if i.get('category'))
    # Suggest from different categories
    suggestions = []
    for item in menu_items:
        if item.get('category') not in cart_cats and len(suggestions) < 3:
            suggestions.append({"id": item['id'], "reason": "Dodaj različno kategorijo"})
    return suggestions


def ai_inventory_insight(ingredients: list[dict]) -> str:
    """Analyze inventory and suggest reordering or waste reduction."""
    if not ingredients:
        return ""

    items_text = "\n".join([
        f"- {i['name']}: {i['stock']} {i.get('unit', '')} (min: {i.get('min_stock', 0)}, cena: {i.get('cost_per_unit', 0)}€)"
        for i in ingredients[:50]
    ])

    system = (
        "Si pomočnik za upravljanje zalog v restavraciji. "
        "Analiziraj zaloge in podaj kratke nasvete v slovenščini (2-3 stavke). "
        "Opozori na nizke zaloge, predlagaj optimalne količine za naročilo."
    )
    prompt = f"Zaloge:\n{items_text}\n\nKakšni so tvoji nasveti?"

    return _call_puter(prompt, system, max_tokens=200)
