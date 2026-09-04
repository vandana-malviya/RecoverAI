from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.routers.auth import get_current_user
from app.models.auth import User

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/{customer_id}")
async def get_customer(customer_id: str, current_user: User = Depends(get_current_user)):
    """Fetches customer profile, lifetime value, and historical payment breakdown."""
    db = get_db()
    customer = await db.customers.find_one({"customer_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    
    customer = dict(customer)
    customer.pop("_id", None)
    
    total = customer.get("total_transactions", 0)
    success = customer.get("successful_transactions", 0)
    customer["historical_success_rate"] = round((success / total * 100), 1) if total > 0 else 0.0

    payments = await db.payments.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=50)
    for p in payments:
        p.pop("_id", None)

    return {
        "customer": customer,
        "payment_history": payments,
        "payment_count": len(payments)
    }
