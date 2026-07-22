import httpx
import logging
from src.config import GROQ_API_KEY, GROQ_MODEL, LLM_REQUEST_TIMEOUT_SEC

logger = logging.getLogger(__name__)

async def chat_with_analyst(history: list) -> str:
    """
    history: List of dicts [{"role": "user"/"assistant", "content": "msg"}]
    """
    if not GROQ_API_KEY:
        return "Chat unavailable: Missing GROQ_API_KEY."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = {
        "role": "system", 
        "content": (
            "You are an automated AegisNet Security Operations AI. Your purpose is strictly to provide direct, concise, and optimal mitigation steps for network threats.\n"
            "RULES:\n"
            "1. ONLY output in plain text. DO NOT use markdown formatting, bolding, lists, or tables.\n"
            "2. Keep responses extremely short, direct, and straightforward. Provide ONLY the requested steps.\n"
            "3. Do not be conversational, creative, or use filler text. Do not say 'Here is your checklist' or similar.\n"
            "4. Your context is strictly AegisNet SIEM operations."
        )
    }

    messages = [system_prompt] + history

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.5
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_REQUEST_TIMEOUT_SEC) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Chat agent failed: {e}")
        return "I'm currently overwhelmed with analysis requests. Please try again in a moment."
