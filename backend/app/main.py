from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Clean imports for our structure
from .database import engine, Base, SessionLocal, get_db
from .models import user, job
from .schemas import job as job_schema

# Modern lifespan (replaces deprecated @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db = SessionLocal()
    try:
        seed_sample_data(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title="Black Rabbit Landscaping API",
    description="Marketplace for landscaping and lawn care jobs",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def seed_sample_data(db: Session):
    """Seed some demo data on first run."""
    if db.query(user.User).count() == 0:
        sample_users = [
            user.User(email="jane@example.com", name="Jane Doe", phone="555-123-4567", is_provider=False),
            user.User(email="mike@example.com", name="Mike Green", phone="555-987-6543", is_provider=True),
        ]
        db.add_all(sample_users)
        db.commit()

    if db.query(job.Job).count() == 0:
        customer = db.query(user.User).filter_by(email="jane@example.com").first()
        if customer:
            sample_jobs = [
                job.Job(
                    customer_id=customer.id,
                    title="Backyard mowing",
                    description="Trim the lawn, edge the walkways and remove clippings.",
                    service_type="Lawn Care",
                    urgency="Today",
                    address="123 Maple St, Brooklyn",
                    latitude=40.7128,
                    longitude=-74.0060,
                ),
                job.Job(
                    customer_id=customer.id,
                    title="Mulch freshen-up",
                    description="Add fresh mulch to the flower beds and weed the front yard.",
                    service_type="Landscaping",
                    urgency="This week",
                    address="456 Oak Ave, Brooklyn",
                    latitude=40.7306,
                    longitude=-73.9352,
                ),
            ]
            db.add_all(sample_jobs)
            db.commit()


@app.get("/")
def root():
    return {"message": "Black Rabbit Landscaping API running. Use the React frontend at http://localhost:5173"}


# Job endpoints - clean and focused
@app.post("/jobs/", response_model=job_schema.JobRead)
def create_job(job_data: job_schema.JobCreate, db: Session = Depends(get_db)):
    new_job = job.Job(**job_data.dict())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@app.get("/jobs/")
def list_all_jobs(db: Session = Depends(get_db)):
    return db.query(job.Job).all()

@app.get("/jobs/open/")
def list_open_jobs(db: Session = Depends(get_db)):
    return db.query(job.Job).filter(job.Job.status == "open").all()

@app.put("/jobs/{job_id}/status/")
def update_status(job_id: int, status: str, db: Session = Depends(get_db)):
    job_obj = db.query(job.Job).filter(job.Job.id == job_id).first()
    if not job_obj:
        return {"error": "Job not found"}
    job_obj.status = status
    db.commit()
    db.refresh(job_obj)
    return {"message": f"Job {job_id} updated to {status}"}
