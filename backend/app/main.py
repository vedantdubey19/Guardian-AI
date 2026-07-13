import logging
import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.services.simulation import run_simulation_loop
from app.api.endpoints import router as api_router

# Configure Logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown lifecycle events.
    Synchronizes DB models and spawns background tasks.
    """
    logger.info("Starting up Guardian AI operations backend...")
    
    # 1. Initialize Database Tables
    try:
        await init_db()
        logger.info("Database tables verified/initialized.")
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}", exc_info=True)
        
    # 2. Spawn simulation background loop task
    sim_task = asyncio.create_task(run_simulation_loop())
    logger.info("Simulation engine started.")
    
    yield  # Application runs here
    
    # 3. Clean up on shutdown
    logger.info("Shutting down Guardian AI operations backend...")
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        logger.info("Simulation engine background task cancelled successfully.")

# Initialize FastAPI with metadata matching Google API standard style
app = FastAPI(
    title="Guardian AI - Stadium Intelligence API",
    description="Intelligent Command & Control Operations API for the FIFA World Cup 2026",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Policy - allow local next.js development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon ease of deployment, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Endpoints
app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "guardian-ai-api"}

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.BACKEND_PORT, reload=True)
