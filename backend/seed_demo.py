"""
Seed a couple of demo listings/jobs so Pros/Jobs don't look abandoned.
Run from backend/:  python seed_demo.py
"""
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.provider_listing import ProviderListing
from app.models.job import Job

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def get_or_create_user(name: str, phone: str, **kwargs) -> User:
    u = db.query(User).filter(User.phone == phone).first()
    if u:
        return u
    u = User(name=name, phone=phone, **kwargs)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


try:
    pro = get_or_create_user(
        "South Sound Lawns",
        "3605550101",
        email="demo-pro@blackrabbit.local",
        is_provider=True,
        email_verified=True,
        bio="Family crew · Yelm & Rainier · reliable weekly mows",
        services_offered="Lawn Care, Edging, Cleanup",
        address="Yelm, WA",
    )
    pro2 = get_or_create_user(
        "Rainier Handy Co",
        "3605550102",
        email="demo-handy@blackrabbit.local",
        is_provider=True,
        email_verified=True,
        bio="Fences, gutters, odd jobs",
        services_offered="Handyman, Gutter Cleaning",
        address="Rainier, WA",
    )
    customer = get_or_create_user(
        "Alex Neighbor",
        "3605550199",
        email="demo-customer@blackrabbit.local",
        is_provider=False,
        email_verified=True,
        address="Yelm, WA",
    )

    if not db.query(ProviderListing).filter(ProviderListing.provider_id == pro.id).first():
        db.add(
            ProviderListing(
                provider_id=pro.id,
                title="Weekly lawn care",
                description="Mow, edge, blow-off. Reliable for busy households.",
                service_type="Lawn Care",
                service_area="Yelm, Rainier, Roy",
                status="active",
            )
        )
    if not db.query(ProviderListing).filter(ProviderListing.provider_id == pro2.id).first():
        db.add(
            ProviderListing(
                provider_id=pro2.id,
                title="Gutter clean + minor fixes",
                description="Seasonal gutters, fence boards, odds and ends.",
                service_type="Handyman",
                service_area="Rainier, Yelm, Tenino",
                status="active",
            )
        )

    open_count = db.query(Job).filter(Job.status == "open").count()
    if open_count == 0:
        db.add(
            Job(
                customer_id=customer.id,
                title="Front & back mow",
                description="Standard mow, edge driveway, leave clippings.",
                service_type="Lawn Care",
                urgency="This Week",
                address="Yelm, WA",
                status="open",
            )
        )

    db.commit()
    print("Demo seed OK — pros + open job ready.")
except Exception as e:
    db.rollback()
    print("Seed failed:", e)
    raise
finally:
    db.close()
