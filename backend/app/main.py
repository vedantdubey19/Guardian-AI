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
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Policy - restrict origins in production
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
import os
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# Register Endpoints
app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "guardian-ai-api"}

if __name__ == "__main__":
    should_reload = settings.ENVIRONMENT == "dev"
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.BACKEND_PORT, reload=should_reload)
