import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.connection import DatabaseManager
from app.database.seed_data import seed_database
from app.routers import auth, dashboard, payments, customers, agent, simulator, demo

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("recoverai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect DB and seed if needed
    logger.info("Initializing RecoverAI Backend Services...")
    await DatabaseManager.connect_db()
    await seed_database(force=False)
    logger.info("RecoverAI Database & Agent Workflow Ready.")
    yield
    # Shutdown
    await DatabaseManager.close_db()
    logger.info("RecoverAI Backend Shutdown Complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic Payment Revenue Recovery Platform built for Razorpay AI Builder Internship.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(customers.router, prefix=settings.API_V1_STR)
app.include_router(agent.router, prefix=settings.API_V1_STR)
app.include_router(simulator.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "app": "RecoverAI — Agentic Payment Revenue Recovery Platform",
        "status": "operational",
        "version": settings.VERSION,
        "docs": "/docs",
        "mode": "Simulated Gateway Environment",
        "track": "Razorpay AI Builder — Revenue Recovery"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "in_memory" if DatabaseManager.is_in_memory else "mongodb_connected",
        "openai_configured": bool(settings.OPENAI_API_KEY)
    }
