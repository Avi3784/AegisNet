import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from src.config import MODEL_DIR, DATA_PROCESSED
from src.backend.connection_manager import manager
from src.backend.pipeline_loop import run_pipeline_loop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check dependencies before starting
    model_path = MODEL_DIR / "aegis_xgb.json"
    scaler_path = MODEL_DIR / "scaler.pkl"
    csv_path = DATA_PROCESSED / "custom_extracted_features.csv"
    
    missing = []
    if not model_path.exists(): missing.append(str(model_path))
    if not scaler_path.exists(): missing.append(str(scaler_path))
    if not csv_path.exists(): missing.append(str(csv_path))
    
    if missing:
        msg = f"Startup aborted. Missing required files: {missing}"
        logger.error(msg)
        raise RuntimeError(msg)
        
    logger.info("All dependencies found. Starting pipeline loop task...")
    pipeline_task = asyncio.create_task(run_pipeline_loop())
    
    yield
    
    logger.info("Shutting down. Cancelling pipeline loop...")
    pipeline_task.cancel()
    try:
        await pipeline_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="AegisNet API", lifespan=lifespan)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/live-feed")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and handle incoming messages if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
