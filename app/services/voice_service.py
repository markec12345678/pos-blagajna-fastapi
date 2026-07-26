"""
Voice Ordering Service — AI-powered voice recognition for POS.
Uses Puter AI for natural language understanding and order processing.
"""
import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def parse_voice_order(text: str, menu_items: list[dict]) -> dict:
    """Parse voice input into structured order using AI."""
    if not text or not menu_items:
        return {"items": [], "error": "Ni bilo mogoče razumeti"}

    menu_text = "\n".join([
        f"- ID:{item['id']} | {item['name']} | {item.get('category', '')} | {item.get('price', 0)}€"
        for item in menu_items[:80]
    ])

    system = (
        "Si pomočnik za glasovno naročanje v restavraciji. "
        "Uporabnik bo naročil v naravnem jeziku (slovenščina ali angleščina). "
        "Razumi količine, imena artiklov in morebitne posebne želje. "
        "Vrni SAMO JSON z seznamom artiklov. "
        "Format: {\"items\": [{\"id\": 123, \"quantity\": 2, \"notes\": \"brez čebule\"}], "
        "\"summary\": \"2× Ime artikla\", \"total_items\": 2}"
    )

    prompt = f"Jedilnik:\n{menu_text}\n\nNaročilo stranke: \"{text}\"\n\nRazumi naročilo in vrni JSON:"

    from app.services.ai_service import _call_puter
    result = _call_puter(prompt, system, max_tokens=300)

    if not result:
        # Fallback to simple keyword matching
        return _simple_fallback_voice(text, menu_items)

    try:
        start = result.find('{')
        end = result.rfind('}') + 1
        if start >= 0 and end > start:
            parsed = json.loads(result[start:end])
            valid_items = []
            for item in parsed.get("items", []):
                item_id = item.get("id")
                matched = next((m for m in menu_items if m["id"] == item_id), None)
                if matched:
                    valid_items.append({
                        "id": matched["id"],
                        "name": matched["name"],
                        "price": matched.get("price", 0),
                        "quantity": item.get("quantity", 1),
                        "notes": item.get("notes", "")
                    })
            return {
                "items": valid_items,
                "summary": parsed.get("summary", ""),
                "total_items": sum(i["quantity"] for i in valid_items)
            }
    except json.JSONDecodeError:
        pass

    # Fallback on parse error
    return _simple_fallback_voice(text, menu_items)


def _simple_fallback_voice(text: str, menu_items: list[dict]) -> dict:
    """Simple keyword-based fallback for voice ordering."""
    text_lower = text.lower()
    items = []
    for item in menu_items:
        name_lower = item.get('name', '').lower()
        desc_lower = item.get('description', '').lower()
        if any(word in name_lower or word in desc_lower for word in text_lower.split()):
            items.append({
                "id": item['id'],
                "name": item['name'],
                "price": item.get('price', 0),
                "quantity": 1,
                "notes": ""
            })
    return {
        "items": items[:5],
        "summary": f"Najdenih {len(items)} artiklov",
        "total_items": len(items)
    }


def voice_search(text: str, menu_items: list[dict]) -> list[dict]:
    """Search menu items by voice description."""
    if not text or not menu_items:
        return []

    menu_text = "\n".join([
        f"- ID:{item['id']} | {item['name']} | {item.get('category', '')} | {item.get('price', 0)}€ | {item.get('description', '')}"
        for item in menu_items[:80]
    ])

    system = (
        "Si pomočnik za iskanje po jedilniku. "
        "Uporabnik opiše kaj išče v naravnem jeziku. "
        "Vrni SAMO JSON seznam ID-jev ustreznih artiklov. "
        "Format: [{\"id\": 123, \"reason\": \"razlog\"}]"
    )

    prompt = f"Jedilnik:\n{menu_text}\n\nIskanje: \"{text}\"\n\nVrni JSON:"
    from app.services.ai_service import _call_puter
    result = _call_puter(prompt, system, max_tokens=200)

    if not result:
        return []

    try:
        start = result.find('[')
        end = result.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
    except json.JSONDecodeError:
        pass
    return []


VOICE_COMMANDS = {
    "počisti košarico": "clear_cart",
    "razveljavi": "undo",
    "razdeli račun": "split_bill",
    "plačilo": "pay",
    "popust": "discount",
    "naslednja miza": "next_table",
    "iskanje": "search",
    "pomoč": "help",
    "košarica": "show_cart",
    "zadrži": "hold",
    "klici kuhinjo": "call_kitchen",
}


def recognize_command(text: str) -> Optional[str]:
    """Match voice text to a known POS command."""
    text_lower = text.lower().strip()
    for phrase, command in VOICE_COMMANDS.items():
        if phrase in text_lower:
            return command
    return None
