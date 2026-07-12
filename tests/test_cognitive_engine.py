import pytest
import asyncio
from src.cognitive.llm_agent import CognitiveEngine, DEFAULT_ERROR_REPORT

@pytest.mark.asyncio
async def test_cognitive_engine_positive():
    engine = CognitiveEngine()
    
    # Real flagged flow row
    flow_data = {
        "destination_port": 443,
        "flow_duration": 1500000,
        "total_fwd_packets": 40,
        "total_bwd_packets": 0,
        "total_fwd_bytes": 2000,
        "total_bwd_bytes": 0,
        "fwd_packet_length_max": 50,
        "fwd_packet_length_mean": 50.0,
        "bwd_packet_length_max": 0,
        "bwd_packet_length_mean": 0.0,
        "flow_bytes_per_sec": 1333.33,
        "flow_packets_per_sec": 26.66,
        "flow_iat_mean": 37500.0,
        "down_up_ratio": 0.0,
        "syn_flag_count": 40,
        "ack_flag_count": 0,
        "fin_flag_count": 0,
        "rst_flag_count": 0,
        "psh_flag_count": 0
    }
    
    result = await engine.analyze_threat(flow_data)
    
    assert result is not None
    assert "Threat_Analysis" in result
    assert "Confidence_Validation" in result
    assert "Recommended_Mitigation" in result
    assert isinstance(result["Recommended_Mitigation"], list)
    assert len(result["Recommended_Mitigation"]) == 2

@pytest.mark.asyncio
async def test_cognitive_engine_negative(monkeypatch):
    engine = CognitiveEngine()
    
    # Break GROQ key to force fallback, and also break GEMINI key to force fallback to DEFAULT
    import src.cognitive.llm_agent
    monkeypatch.setattr(src.cognitive.llm_agent, "GROQ_API_KEY", "INVALID_KEY")
    monkeypatch.setattr(src.cognitive.llm_agent, "GEMINI_API_KEY", "INVALID_KEY")
    
    flow_data = {"test": "data"}
    
    # Needs to reset last_call_time to avoid hitting the 2.5s throttle check and 
    # failing early because of throttling rather than API fallback.
    engine.last_call_time = 0.0
    
    result = await engine.analyze_threat(flow_data)
    
    # Should fall back to DEFAULT_ERROR_REPORT gracefully without throwing
    assert result == DEFAULT_ERROR_REPORT
