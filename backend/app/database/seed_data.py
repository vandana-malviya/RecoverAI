import random
from datetime import datetime, timedelta
import logging
from app.database.connection import get_db
from app.models.customer import CustomerSegment
from app.models.payment import PaymentMethod, PaymentStatus, FailureReason, RecoveryStatus
from app.models.recovery import RecoveryAction, ActionPriority
from app.utils.security import hash_password

logger = logging.getLogger("recoverai.seed")

# Deterministic random generator
random.seed(42)

CUSTOMER_NAMES = [
    ("Aditi Sharma", "aditi.sharma@techcorp.io", CustomerSegment.HIGH_VALUE, "CARD", 245000.0, 48, 45, 3),
    ("Rahul Verma", "rahul.v@quickpay.in", CustomerSegment.HIGH_VALUE, "UPI", 185000.0, 36, 34, 2),
    ("Priya Nair", "priya.nair@innovate.co", CustomerSegment.HIGH_VALUE, "NETBANKING", 310000.0, 52, 50, 2),
    ("Vikram Malhotra", "vikram.m@zenith.org", CustomerSegment.HIGH_VALUE, "CARD", 420000.0, 64, 61, 3),
    ("Ananya Desai", "ananya.d@cloudscale.ai", CustomerSegment.HIGH_VALUE, "UPI", 160000.0, 28, 27, 1),
    ("Rohan Gupta", "rohan.gupta@finscale.in", CustomerSegment.HIGH_VALUE, "CARD", 290000.0, 41, 39, 2),
    ("Sneha Kulkarni", "sneha.k@retailflow.com", CustomerSegment.HIGH_VALUE, "UPI", 215000.0, 39, 37, 2),
    ("Karan Mehta", "karan.mehta@saasflow.io", CustomerSegment.HIGH_VALUE, "NETBANKING", 380000.0, 49, 47, 2),
    ("Deepika Patel", "deepika.patel@designhub.co", CustomerSegment.HIGH_VALUE, "CARD", 195000.0, 33, 31, 2),
    ("Arjun Reddy", "arjun.reddy@apexlogistics.in", CustomerSegment.HIGH_VALUE, "UPI", 270000.0, 44, 42, 2),
    
    # Regular customers
    ("Siddharth Rao", "siddharth.rao@gmail.com", CustomerSegment.REGULAR, "UPI", 34000.0, 14, 12, 2),
    ("Neha Joshi", "neha.joshi@yahoo.com", CustomerSegment.REGULAR, "CARD", 45000.0, 16, 14, 2),
    ("Amit Bansal", "amit.bansal@outlook.com", CustomerSegment.REGULAR, "UPI", 28000.0, 11, 9, 2),
    ("Tanvi Singhania", "tanvi.s@gmail.com", CustomerSegment.REGULAR, "WALLET", 19000.0, 9, 8, 1),
    ("Manish Tiwari", "manish.tiwari@rediffmail.com", CustomerSegment.REGULAR, "NETBANKING", 52000.0, 18, 15, 3),
    ("Ritu Sen", "ritu.sen@gmail.com", CustomerSegment.REGULAR, "UPI", 31000.0, 12, 10, 2),
    ("Gaurav Kapoor", "gaurav.kapoor@gmail.com", CustomerSegment.REGULAR, "CARD", 62000.0, 20, 17, 3),
    ("Kavita Rao", "kavita.rao@outlook.com", CustomerSegment.REGULAR, "UPI", 24000.0, 10, 8, 2),
    ("Harsh Vardhan", "harsh.v@gmail.com", CustomerSegment.REGULAR, "UPI", 39000.0, 15, 13, 2),
    ("Pooja Hegde", "pooja.hegde@hotmail.com", CustomerSegment.REGULAR, "WALLET", 15000.0, 8, 7, 1),
    ("Naveen Kumar", "naveen.k@gmail.com", CustomerSegment.REGULAR, "NETBANKING", 48000.0, 17, 14, 3),
    ("Divya Menon", "divya.menon@gmail.com", CustomerSegment.REGULAR, "CARD", 56000.0, 19, 16, 3),
    ("Sanjay Pillai", "sanjay.pillai@gmail.com", CustomerSegment.REGULAR, "UPI", 29000.0, 11, 9, 2),
    ("Shweta Saxena", "shweta.s@yahoo.com", CustomerSegment.REGULAR, "UPI", 33000.0, 13, 11, 2),
    ("Abhishek Jha", "abhishek.jha@gmail.com", CustomerSegment.REGULAR, "CARD", 41000.0, 15, 13, 2),
    ("Meera Nambiar", "meera.n@gmail.com", CustomerSegment.REGULAR, "UPI", 26000.0, 10, 9, 1),
    ("Varun Dhawan", "varun.d@outlook.com", CustomerSegment.REGULAR, "NETBANKING", 68000.0, 22, 19, 3),
    ("Ankita Roy", "ankita.roy@gmail.com", CustomerSegment.REGULAR, "UPI", 22000.0, 9, 8, 1),
    ("Tarun Grover", "tarun.grover@gmail.com", CustomerSegment.REGULAR, "CARD", 47000.0, 16, 14, 2),
    ("Pallavi Shah", "pallavi.shah@gmail.com", CustomerSegment.REGULAR, "WALLET", 18000.0, 8, 7, 1),

    # New customers
    ("Ishaan Soni", "ishaan.soni@gmail.com", CustomerSegment.NEW, "UPI", 4500.0, 2, 1, 1),
    ("Bhavna Mishra", "bhavna.m@gmail.com", CustomerSegment.NEW, "CARD", 8900.0, 3, 2, 1),
    ("Raghav Chawla", "raghav.c@outlook.com", CustomerSegment.NEW, "UPI", 3200.0, 1, 1, 0),
    ("Smriti Iyer", "smriti.iyer@gmail.com", CustomerSegment.NEW, "UPI", 6100.0, 2, 1, 1),
    ("Yash Singhal", "yash.singhal@gmail.com", CustomerSegment.NEW, "NETBANKING", 12000.0, 4, 3, 1),
    ("Aakash Jain", "aakash.jain@gmail.com", CustomerSegment.NEW, "CARD", 7500.0, 2, 1, 1),
    ("Simran Gill", "simran.gill@yahoo.com", CustomerSegment.NEW, "UPI", 2900.0, 1, 0, 1),
    ("Kunal Bhatia", "kunal.bhatia@gmail.com", CustomerSegment.NEW, "WALLET", 1800.0, 1, 1, 0),
    ("Natasha Dsouza", "natasha.d@gmail.com", CustomerSegment.NEW, "CARD", 9400.0, 3, 2, 1),
    ("Devendra Yadav", "devendra.y@gmail.com", CustomerSegment.NEW, "UPI", 5300.0, 2, 1, 1),
    ("Rhea Agarwal", "rhea.agarwal@gmail.com", CustomerSegment.NEW, "UPI", 3700.0, 1, 0, 1),
    ("Aditya Kashyap", "aditya.k@outlook.com", CustomerSegment.NEW, "NETBANKING", 14500.0, 4, 3, 1),
    ("Geeta Swaminathan", "geeta.s@gmail.com", CustomerSegment.NEW, "CARD", 6800.0, 2, 1, 1),
    ("Chirag Mittal", "chirag.m@gmail.com", CustomerSegment.NEW, "UPI", 4100.0, 2, 1, 1),
    ("Monika Bisht", "monika.b@gmail.com", CustomerSegment.NEW, "UPI", 2200.0, 1, 0, 1),
    ("Pranav Hegde", "pranav.h@gmail.com", CustomerSegment.NEW, "CARD", 11200.0, 3, 2, 1),
    ("Zoya Akhtar", "zoya.a@gmail.com", CustomerSegment.NEW, "UPI", 5800.0, 2, 2, 0),
    ("Chetan Chauhan", "chetan.c@gmail.com", CustomerSegment.NEW, "WALLET", 3100.0, 1, 1, 0),
    ("Lavanya Sundaram", "lavanya.s@gmail.com", CustomerSegment.NEW, "NETBANKING", 16800.0, 4, 3, 1),
    ("Kartik Awasthi", "kartik.a@gmail.com", CustomerSegment.NEW, "UPI", 4900.0, 2, 1, 1),
    ("Radhika Madan", "radhika.m@yahoo.com", CustomerSegment.NEW, "CARD", 8200.0, 3, 2, 1),
    ("Tushar Gandhi", "tushar.g@gmail.com", CustomerSegment.NEW, "UPI", 3500.0, 1, 1, 0),
    ("Alka Pandey", "alka.pandey@gmail.com", CustomerSegment.NEW, "UPI", 6700.0, 2, 1, 1),
    ("Jayesh Trivedi", "jayesh.t@gmail.com", CustomerSegment.NEW, "NETBANKING", 13400.0, 3, 2, 1),
    ("Sunita Goswami", "sunita.g@outlook.com", CustomerSegment.NEW, "WALLET", 2400.0, 1, 0, 1),
]

FAILURE_REASONS_INFO = {
    FailureReason.NETWORK_ERROR: ("GATEWAY_TIMEOUT_504", "Upstream payment gateway connection timed out during TLS handshake."),
    FailureReason.BANK_DECLINED: ("ISSUER_DECLINE_05", "Card issuing bank declined authorization without specific error code."),
    FailureReason.INSUFFICIENT_FUNDS: ("INSUFFICIENT_BALANCE_51", "Customer account does not have sufficient balance to authorize transaction."),
    FailureReason.EXPIRED_CARD: ("CARD_EXPIRED_54", "The payment card expired prior to transaction authorization."),
    FailureReason.INVALID_CARD: ("INVALID_CARD_NUMBER_14", "Card checksum validation failed or invalid CVV provided."),
    FailureReason.UPI_FAILURE: ("UPI_NPCI_UNAVAILABLE_U19", "National Payments Corporation of India (NPCI) node reported PSP unavailability."),
    FailureReason.TIMEOUT: ("CUSTOMER_AUTH_TIMEOUT_TIMEDOUT", "Customer OTP authentication session timed out on 3D-Secure page."),
    FailureReason.UNKNOWN: ("GENERIC_SYSTEM_ERR_99", "An unexpected financial switch communication error occurred."),
}


async def seed_database(force: bool = False):
    db = get_db()
    existing_count = await db.customers.count_documents({})
    if existing_count > 0 and not force:
        logger.info(f"Database already seeded with {existing_count} customers. Skipping.")
        return

    logger.info("Starting deterministic database seeding for RecoverAI...")

    # Clear existing
    await db.customers.delete_many({})
    await db.payments.delete_many({})
    await db.recovery_attempts.delete_many({})
    await db.agent_activities.delete_many({})
    await db.users.delete_many({})

    # 1. Create Default Merchant Admin User
    admin_user = {
        "user_id": "usr_merchant_001",
        "email": "merchant@recoverai.io",
        "name": "Alex Merchant",
        "merchant_name": "NovaFlow Commerce",
        "role": "merchant_admin",
        "hashed_password": hash_password("demo1234"),
    }
    await db.users.insert_one(admin_user)

    # 2. Seed Customers
    customers_list = []
    customer_ids = []
    for idx, c in enumerate(CUSTOMER_NAMES):
        cid = f"CUST_{1001 + idx}"
        customer_ids.append(cid)
        risk = 0.05 if c[2] == CustomerSegment.HIGH_VALUE else (0.15 if c[2] == CustomerSegment.REGULAR else 0.35)
        doc = {
            "customer_id": cid,
            "name": c[0],
            "email": c[1],
            "customer_segment": c[2].value,
            "preferred_payment_method": c[3],
            "lifetime_value": float(c[4]),
            "total_transactions": c[5],
            "successful_transactions": c[6],
            "failed_transactions": c[7],
            "risk_score": risk,
            "last_transaction_date": datetime.utcnow() - timedelta(days=random.randint(1, 28)),
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 365)),
        }
        customers_list.append(doc)
    await db.customers.insert_many(customers_list)
    logger.info(f"Seeded {len(customers_list)} customers.")

    # 3. Seed 5 Explicit Demo Scenario Payments
    now = datetime.utcnow()
    demo_payments = [
        # Scenario 1: Temporary network glitch -> High Value customer -> Recommend Retry after delay -> Successfully recovered
        {
            "payment_id": "PAY_DEMO_001",
            "customer_id": "CUST_1001",  # Aditi Sharma (HIGH_VALUE)
            "amount": 14500.0,
            "currency": "INR",
            "payment_method": PaymentMethod.CARD.value,
            "status": PaymentStatus.FAILED.value,
            "failure_reason": FailureReason.NETWORK_ERROR.value,
            "gateway_error_code": FAILURE_REASONS_INFO[FailureReason.NETWORK_ERROR][0],
            "gateway_error_description": FAILURE_REASONS_INFO[FailureReason.NETWORK_ERROR][1],
            "created_at": now - timedelta(minutes=45),
            "retry_count": 0,
            "recovered": False,
            "recovery_status": RecoveryStatus.UNPROCESSED.value,
            "metadata": {"scenario": "SCENARIO_1_NETWORK_ERROR", "product": "Enterprise Cloud Subscription Tier 2"},
        },
        # Scenario 2: Expired Card -> Regular customer -> AI recommends Payment Method Update
        {
            "payment_id": "PAY_DEMO_002",
            "customer_id": "CUST_1012",  # Neha Joshi (REGULAR)
            "amount": 4200.0,
            "currency": "INR",
            "payment_method": PaymentMethod.CARD.value,
            "status": PaymentStatus.FAILED.value,
            "failure_reason": FailureReason.EXPIRED_CARD.value,
            "gateway_error_code": FAILURE_REASONS_INFO[FailureReason.EXPIRED_CARD][0],
            "gateway_error_description": FAILURE_REASONS_INFO[FailureReason.EXPIRED_CARD][1],
            "created_at": now - timedelta(hours=3),
            "retry_count": 0,
            "recovered": False,
            "recovery_status": RecoveryStatus.UNPROCESSED.value,
            "metadata": {"scenario": "SCENARIO_2_EXPIRED_CARD", "product": "Monthly Premium Membership"},
        },
        # Scenario 3: UPI Failure / NPCI Timeout -> AI recommends Suggest Alternative Payment Method
        {
            "payment_id": "PAY_DEMO_003",
            "customer_id": "CUST_1011",  # Siddharth Rao (REGULAR)
            "amount": 2850.0,
            "currency": "INR",
            "payment_method": PaymentMethod.UPI.value,
            "status": PaymentStatus.FAILED.value,
            "failure_reason": FailureReason.UPI_FAILURE.value,
            "gateway_error_code": FAILURE_REASONS_INFO[FailureReason.UPI_FAILURE][0],
            "gateway_error_description": FAILURE_REASONS_INFO[FailureReason.UPI_FAILURE][1],
            "created_at": now - timedelta(hours=1),
            "retry_count": 1,
            "recovered": False,
            "recovery_status": RecoveryStatus.UNPROCESSED.value,
            "metadata": {"scenario": "SCENARIO_3_UPI_FAILURE", "product": "E-Commerce Checkout Cart #8831"},
        },
        # Scenario 4: High Value VIP customer with Bank Decline on High Ticket Basket -> HIGH priority recovery
        {
            "payment_id": "PAY_DEMO_004",
            "customer_id": "CUST_1004",  # Vikram Malhotra (HIGH_VALUE)
            "amount": 48500.0,
            "currency": "INR",
            "payment_method": PaymentMethod.CARD.value,
            "status": PaymentStatus.FAILED.value,
            "failure_reason": FailureReason.BANK_DECLINED.value,
            "gateway_error_code": FAILURE_REASONS_INFO[FailureReason.BANK_DECLINED][0],
            "gateway_error_description": FAILURE_REASONS_INFO[FailureReason.BANK_DECLINED][1],
            "created_at": now - timedelta(hours=2),
            "retry_count": 0,
            "recovered": False,
            "recovery_status": RecoveryStatus.UNPROCESSED.value,
            "metadata": {"scenario": "SCENARIO_4_HIGH_VALUE_BASKET", "product": "Annual Enterprise B2B License"},
        },
        # Scenario 5: Exhausted Retry Limit (3 failed attempts) -> AI + Guardrail Enforces Escalate to Merchant
        {
            "payment_id": "PAY_DEMO_005",
            "customer_id": "CUST_1037",  # Simran Gill (NEW)
            "amount": 3400.0,
            "currency": "INR",
            "payment_method": PaymentMethod.CARD.value,
            "status": PaymentStatus.FAILED.value,
            "failure_reason": FailureReason.INSUFFICIENT_FUNDS.value,
            "gateway_error_code": FAILURE_REASONS_INFO[FailureReason.INSUFFICIENT_FUNDS][0],
            "gateway_error_description": FAILURE_REASONS_INFO[FailureReason.INSUFFICIENT_FUNDS][1],
            "created_at": now - timedelta(hours=12),
            "retry_count": 3,
            "recovered": False,
            "recovery_status": RecoveryStatus.UNPROCESSED.value,
            "metadata": {"scenario": "SCENARIO_5_RETRY_EXHAUSTED", "product": "Standard Checkout Order #9914"},
        },
    ]

    # 4. Generate 220+ Realistic Historical Payments across the past 30 days
    all_payments = list(demo_payments)
    all_recoveries = []
    all_agent_activities = []

    methods = [PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.NETBANKING, PaymentMethod.WALLET]
    failure_types = list(FailureReason)

    for i in range(1, 225):
        pid = f"PAY_{10100 + i}"
        cid = random.choice(customer_ids)
        cust_doc = next(c for c in customers_list if c["customer_id"] == cid)
        
        days_ago = random.uniform(0.1, 29.5)
        p_time = now - timedelta(days=days_ago)
        
        if cust_doc["customer_segment"] == CustomerSegment.HIGH_VALUE.value:
            amt = round(random.uniform(5000, 65000), 2)
        elif cust_doc["customer_segment"] == CustomerSegment.REGULAR.value:
            amt = round(random.uniform(1200, 18000), 2)
        else:
            amt = round(random.uniform(499, 8500), 2)

        method = random.choices(
            methods, 
            weights=[0.50, 0.30, 0.12, 0.08]
        )[0]

        is_failed = random.random() < 0.42

        if not is_failed:
            payment_doc = {
                "payment_id": pid,
                "customer_id": cid,
                "amount": amt,
                "currency": "INR",
                "payment_method": method.value,
                "status": PaymentStatus.SUCCESS.value,
                "failure_reason": None,
                "gateway_error_code": None,
                "gateway_error_description": None,
                "created_at": p_time,
                "retry_count": 0,
                "recovered": False,
                "recovery_status": RecoveryStatus.UNPROCESSED.value,
                "metadata": {"order_type": "instant_checkout"},
            }
        else:
            reason = random.choices(
                failure_types,
                weights=[0.25, 0.20, 0.18, 0.10, 0.08, 0.12, 0.05, 0.02]
            )[0]
            err_code, err_desc = FAILURE_REASONS_INFO[reason]
            
            is_recovered = random.random() < 0.62
            retry_cnt = random.randint(1, 2) if is_recovered else random.randint(0, 3)

            rec_status = RecoveryStatus.RECOVERED.value if is_recovered else (
                RecoveryStatus.ESCALATED.value if retry_cnt >= 3 else 
                random.choice([RecoveryStatus.ACTION_EXECUTED.value, RecoveryStatus.ACTION_RECOMMENDED.value, RecoveryStatus.UNPROCESSED.value])
            )

            p_status = PaymentStatus.RECOVERED.value if is_recovered else PaymentStatus.FAILED.value

            payment_doc = {
                "payment_id": pid,
                "customer_id": cid,
                "amount": amt,
                "currency": "INR",
                "payment_method": method.value,
                "status": p_status,
                "failure_reason": reason.value,
                "gateway_error_code": err_code,
                "gateway_error_description": err_desc,
                "created_at": p_time,
                "retry_count": retry_cnt,
                "recovered": is_recovered,
                "recovery_status": rec_status,
                "metadata": {"order_type": "subscription" if amt > 5000 else "standard"},
            }

            if is_recovered:
                rec_id = f"REC_{pid}_01"
                action_chosen = random.choice([
                    RecoveryAction.RETRY_AFTER_DELAY,
                    RecoveryAction.SEND_PAYMENT_REMINDER,
                    RecoveryAction.SUGGEST_ALTERNATIVE_PAYMENT,
                ])
                rec_time = p_time + timedelta(minutes=random.randint(15, 180))
                rec_attempt = {
                    "recovery_id": rec_id,
                    "payment_id": pid,
                    "customer_id": cid,
                    "action": action_chosen.value,
                    "status": "SUCCESS",
                    "timestamp": rec_time,
                    "agent_confidence": round(random.uniform(0.82, 0.96), 2),
                    "reason": f"Agent selected {action_chosen.value} based on {reason.value} failure profile and positive customer history.",
                    "result": f"Payment successfully recovered via {action_chosen.value}.",
                    "details": {"recovered_amount": amt, "method_used": method.value},
                    "guardrail_applied": False,
                }
                all_recoveries.append(rec_attempt)

                all_agent_activities.append({
                    "activity_id": f"ACT_{pid}",
                    "payment_id": pid,
                    "customer_id": cid,
                    "customer_name": cust_doc["name"],
                    "amount": amt,
                    "action": action_chosen.value,
                    "confidence": rec_attempt["agent_confidence"],
                    "timestamp": rec_time,
                    "status": "RECOVERED",
                    "reason": rec_attempt["reason"],
                    "result": f"₹{amt:,.2f} recovered successfully",
                })

        all_payments.append(payment_doc)

    await db.payments.insert_many(all_payments)
    if all_recoveries:
        await db.recovery_attempts.insert_many(all_recoveries)
    if all_agent_activities:
        await db.agent_activities.insert_many(all_agent_activities)

    logger.info(f"Seeded {len(all_payments)} payments, {len(all_recoveries)} recovery attempts, and {len(all_agent_activities)} agent activity logs.")
