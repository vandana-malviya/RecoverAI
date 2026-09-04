import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import copy
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("recoverai.database")


class InMemoryCollection:
    """Async MongoDB-compatible in-memory collection fallback for turnkey zero-dependency local testing."""
    def __init__(self, name: str):
        self.name = name
        self.docs: List[Dict[str, Any]] = []

    def _matches_query(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for key, expected in query.items():
            if key == "$or":
                matched_or = False
                for subquery in expected:
                    if self._matches_query(doc, subquery):
                        matched_or = True
                        break
                if not matched_or:
                    return False
                continue
            
            if key == "$and":
                for subquery in expected:
                    if not self._matches_query(doc, subquery):
                        return False
                continue

            val = doc.get(key)
            if isinstance(expected, dict):
                for op, target in expected.items():
                    if op == "$eq" and val != target:
                        return False
                    elif op == "$ne" and val == target:
                        return False
                    elif op == "$gt" and not (val is not None and val > target):
                        return False
                    elif op == "$gte" and not (val is not None and val >= target):
                        return False
                    elif op == "$lt" and not (val is not None and val < target):
                        return False
                    elif op == "$lte" and not (val is not None and val <= target):
                        return False
                    elif op == "$in" and val not in target:
                        return False
                    elif op == "$nin" and val in target:
                        return False
                    elif op == "$regex":
                        import re
                        pattern = target
                        flags = 0
                        if "$options" in expected and "i" in expected["$options"]:
                            flags = re.IGNORECASE
                        if val is None or not re.search(pattern, str(val), flags):
                            return False
            else:
                if val != expected:
                    return False
        return True

    async def insert_one(self, document: Dict[str, Any]):
        doc_copy = copy.deepcopy(document)
        if "_id" not in doc_copy:
            doc_copy["_id"] = str(len(self.docs) + 1)
        self.docs.append(doc_copy)
        class Result:
            inserted_id = doc_copy["_id"]
        return Result()

    async def insert_many(self, documents: List[Dict[str, Any]]):
        inserted_ids = []
        for d in documents:
            res = await self.insert_one(d)
            inserted_ids.append(res.inserted_id)
        class Result:
            pass
        r = Result()
        r.inserted_ids = inserted_ids
        return r

    async def find_one(self, query: Dict[str, Any] = None, projection: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        query = query or {}
        for doc in self.docs:
            if self._matches_query(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query: Dict[str, Any] = None, projection: Dict[str, Any] = None):
        query = query or {}
        matched = [copy.deepcopy(doc) for doc in self.docs if self._matches_query(doc, query)]
        return InMemoryCursor(matched)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        query = query or {}
        matched_idx = -1
        for idx, doc in enumerate(self.docs):
            if self._matches_query(doc, query):
                matched_idx = idx
                break
        
        class Result:
            matched_count = 0
            modified_count = 0

        res = Result()
        if matched_idx >= 0:
            target_doc = self.docs[matched_idx]
            if "$set" in update:
                for k, v in update["$set"].items():
                    target_doc[k] = v
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    target_doc[k] = target_doc.get(k, 0) + v
            if "$push" in update:
                for k, v in update["$push"].items():
                    if k not in target_doc or not isinstance(target_doc[k], list):
                        target_doc[k] = []
                    target_doc[k].append(v)
            res.matched_count = 1
            res.modified_count = 1
        elif upsert:
            new_doc = copy.deepcopy(query)
            if "$set" in update:
                new_doc.update(update["$set"])
            await self.insert_one(new_doc)
            res.modified_count = 1
        return res

    async def count_documents(self, query: Dict[str, Any] = None) -> int:
        query = query or {}
        count = sum(1 for doc in self.docs if self._matches_query(doc, query))
        return count

    async def delete_many(self, query: Dict[str, Any] = None):
        query = query or {}
        initial_len = len(self.docs)
        self.docs = [doc for doc in self.docs if not self._matches_query(doc, query)]
        class Result:
            deleted_count = initial_len - len(self.docs)
        return Result()

    async def create_index(self, *args, **kwargs):
        return "index_created"


class InMemoryCursor:
    def __init__(self, items: List[Dict[str, Any]]):
        self.items = items
        self._sort_key = None
        self._sort_direction = 1
        self._skip_count = 0
        self._limit_count = None

    def sort(self, key_or_list, direction: int = 1):
        if isinstance(key_or_list, list):
            self._sort_key = key_or_list[0][0]
            self._sort_direction = key_or_list[0][1]
        else:
            self._sort_key = key_or_list
            self._sort_direction = direction
        
        reverse = self._sort_direction == -1
        self.items.sort(key=lambda x: (x.get(self._sort_key) is None, x.get(self._sort_key)), reverse=reverse)
        return self

    def skip(self, count: int):
        self._skip_count = count
        return self

    def limit(self, count: int):
        self._limit_count = count
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        sliced = self.items[self._skip_count:]
        if self._limit_count is not None:
            sliced = sliced[:self._limit_count]
        if length is not None:
            sliced = sliced[:length]
        return sliced

    def __aiter__(self):
        self._iter_idx = 0
        sliced = self.items[self._skip_count:]
        if self._limit_count is not None:
            sliced = sliced[:self._limit_count]
        self._iter_items = sliced
        return self

    async def __anext__(self):
        if self._iter_idx < len(self._iter_items):
            item = self._iter_items[self._iter_idx]
            self._iter_idx += 1
            return item
        raise StopAsyncIteration


class InMemoryDB:
    def __init__(self, name: str):
        self.name = name
        self.collections: Dict[str, InMemoryCollection] = {}

    def __getitem__(self, name: str) -> InMemoryCollection:
        if name not in self.collections:
            self.collections[name] = InMemoryCollection(name)
        return self.collections[name]

    def __getattr__(self, name: str) -> InMemoryCollection:
        return self[name]


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_in_memory: bool = False

    @classmethod
    async def connect_db(cls):
        try:
            logger.info(f"Attempting MongoDB connection to {settings.DATABASE_URL}...")
            # Try real Mongo with short timeout for check
            test_client = AsyncIOMotorClient(settings.DATABASE_URL, serverSelectionTimeoutMS=2000)
            await test_client.admin.command('ping')
            cls.client = test_client
            cls.db = cls.client[settings.DATABASE_NAME]
            cls.is_in_memory = False
            logger.info(f"Successfully connected to live MongoDB: {settings.DATABASE_NAME}")
        except Exception as e:
            logger.warning(f"Live MongoDB not available ({e}). Initializing high-performance in-memory database store.")
            cls.client = None
            cls.db = InMemoryDB(settings.DATABASE_NAME)
            cls.is_in_memory = True

    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed.")


def get_db():
    if DatabaseManager.db is None:
        DatabaseManager.db = InMemoryDB(settings.DATABASE_NAME)
        DatabaseManager.is_in_memory = True
    return DatabaseManager.db
