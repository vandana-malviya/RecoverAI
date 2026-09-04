import pytest
import asyncio
from app.database.connection import DatabaseManager
from app.database.seed_data import seed_database


@pytest.fixture(scope="session", autouse=True)
def init_test_database():
    asyncio.run(DatabaseManager.connect_db())
    asyncio.run(seed_database(force=True))
    yield
    asyncio.run(DatabaseManager.close_db())
