import json
import time
import asyncio
import httpx
import logging
from src.config import (
    GROQ_API_KEY, 
    GEMINI_API_KEY, 
    GROQ_MODEL, 
    GEMINI_MODEL, 
    LLM_MIN_INTERVAL_SEC,
    LLM_REQUEST_TIMEOUT_SEC
)

logger = logging.getLogger(__name__)

DEFAULT_ERROR_REPORT = {
    "Threat_Analysis": "Cognitive engine unavailable. Model flagged a potential anomaly.",
    "Confidence_Validation": "N/A - LLM offline.",
    "Recommended_Mitigation": ["Block IP immediately", "Investigate manually"],
    "MITRE_Techniques": ["T0000 Unknown"]
}

SYSTEM_PROMPT = """
You are AegisNet's Cognitive Engine, an expert in ATM network fraud and security. Analyze the given network flow data and provide a threat analysis from an ATM banking perspective (e.g., suspecting card skimming, jackpotting, or malware C2).
DO NOT use the word "BENIGN" under any circumstances. If the flow is safe, use the word "NORMAL" or "SAFE".
Respond ONLY with a valid JSON object strictly adhering to this schema:
{
  "Threat_Analysis": "A brief explanation of the likely attack.",
  "Confidence_Validation": "Your confidence in the threat assessment.",
  "Recommended_Mitigation": ["Concrete mitigation step 1", "Concrete mitigation step 2"],
  "MITRE_Techniques": ["T1059.001 PowerShell", "T1046 Network Service Scanning"]
}
"""

class CognitiveEngine:
    def __init__(self):
        self.last_call_time = 0.0
        self._lock = asyncio.Lock()
        
    async def analyze_threat(self, flow_data: dict) -> dict:
        """
        Main entry point for threat analysis. Honors rate limits and handles fallbacks.
        """
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_call_time
            if elapsed < LLM_MIN_INTERVAL_SEC:
                logger.warning(f"LLM rate limited. Throttling... (elapsed: {elapsed:.2f}s)")
                return DEFAULT_ERROR_REPORT
                
            self.last_call_time = time.time()
            
        try:
            return await self._call_with_fallback(flow_data)
        except Exception as e:
            logger.error(f"Cognitive Engine critical failure: {e}")
            return DEFAULT_ERROR_REPORT

    async def _call_with_fallback(self, flow_data: dict) -> dict:
        prompt = f"Analyze this network flow:\n{json.dumps(flow_data)}"
        
        # Try Groq with 1 retry
        for attempt in range(2):
            try:
                result = await self._call_groq(prompt)
                if result:
                    return result
            except Exception as e:
                logger.warning(f"Groq attempt {attempt + 1} failed: {e}")
                
            if attempt == 0:
                # Basic backoff/jitter between retries
                await asyncio.sleep(1.0)
                
        # Fallback to Gemini
        try:
            logger.info("Falling back to Gemini...")
            result = await self._call_gemini(prompt)
            if result:
                return result
        except Exception as e:
            logger.error(f"Gemini fallback failed: {e}")
            
        return DEFAULT_ERROR_REPORT
            
    async def _call_groq(self, prompt: str) -> dict:
        if not GROQ_API_KEY:
            raise ValueError("Missing GROQ_API_KEY")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        
        async with httpx.AsyncClient(timeout=LLM_REQUEST_TIMEOUT_SEC) as client:
            resp = await client.post(url, headers=headers, json=payload)
            
            if resp.status_code == 429:
                retry_after = resp.headers.get("retry-after")
                if retry_after:
                    await asyncio.sleep(float(retry_after))
                else:
                    await asyncio.sleep(2.0)
                raise Exception("429 Too Many Requests from Groq")
                
            resp.raise_for_status()
            data = resp.json()
            
            content = data["choices"][0]["message"]["content"]
            try:
                parsed = json.loads(content)
                self._validate_schema(parsed)
                return parsed
            except Exception as e:
                logger.error(f"Failed to parse Groq response as valid schema JSON: {content} - Error: {e}")
                return None
                
    async def _call_gemini(self, prompt: str) -> dict:
        if not GEMINI_API_KEY:
            raise ValueError("Missing GEMINI_API_KEY")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }
        
        async with httpx.AsyncClient(timeout=LLM_REQUEST_TIMEOUT_SEC) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            try:
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(content)
                self._validate_schema(parsed)
                return parsed
            except Exception as e:
                logger.error(f"Failed to parse Gemini response as valid schema JSON: Error: {e}")
                return None

    def _validate_schema(self, data: dict):
        required_keys = {"Threat_Analysis", "Confidence_Validation", "Recommended_Mitigation", "MITRE_Techniques"}
        if not required_keys.issubset(data.keys()):
            raise ValueError(f"Missing required keys in JSON. Found keys: {list(data.keys())}")
        if not isinstance(data["Recommended_Mitigation"], list) or len(data["Recommended_Mitigation"]) == 0:
            raise ValueError("Recommended_Mitigation must be a non-empty list of strings.")
        if not isinstance(data.get("MITRE_Techniques"), list):
            raise ValueError("MITRE_Techniques must be a list of strings.")

engine = CognitiveEngine()

COPILOT_SYSTEM_PROMPT = """If the user asks to isolate or reconnect an ATM, you must return a JSON object with this exact schema: `{"response": "your text", "action": {"type": "isolate_host" | "reconnect_host", "target": "ATM-XX"}}`. If no action is needed, return `{"response": "your text", "action": null}`."""

async def chat_with_copilot(message: str):
    if not GROQ_API_KEY and GEMINI_API_KEY:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "system_instruction": {"parts": [{"text": COPILOT_SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": message}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
        }
        async with httpx.AsyncClient(timeout=LLM_REQUEST_TIMEOUT_SEC) as client:
            try:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
            except Exception as e:
                logger.error(f"Copilot Gemini failed: {e}")
                return {"response": "Error processing request.", "action": None}

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": COPILOT_SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }
    async with httpx.AsyncClient(timeout=LLM_REQUEST_TIMEOUT_SEC) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            logger.error(f"Copilot Groq failed: {e}")
            return {"response": "Error processing request.", "action": None}
