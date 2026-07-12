import asyncio
import json
import websockets
import pytest

async def test_backend_websocket():
    uri = "ws://localhost:8000/ws/live-feed"
    
    # Try connecting, with some retries in case the server takes a moment to boot
    for _ in range(5):
        try:
            async with websockets.connect(uri) as websocket:
                messages = []
                # Collect 3 messages with a timeout
                for _ in range(3):
                    msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    parsed = json.loads(msg)
                    messages.append(parsed)
                    
                # Assertions
                assert len(messages) == 3
                for m in messages:
                    assert "type" in m
                    assert m["type"] in ["flow", "threat"]
                    assert "timestamp" in m
                    if m["type"] == "flow":
                        assert "flow" in m
                        assert "prediction" in m["flow"]
                        
                return
        except ConnectionRefusedError:
            await asyncio.sleep(1)
            
    pytest.fail("Could not connect to WebSocket server.")

if __name__ == "__main__":
    asyncio.run(test_backend_websocket())
