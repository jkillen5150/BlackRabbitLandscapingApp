from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal, get_db
from .models import user, job
from .schemas import user as user_schema, job as job_schema

frontend_dir = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(title="Black Rabbit Services", description="Marketplace connecting customers with local service providers", version="0.1.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory=str(frontend_dir), html=True), name="static")

Base.metadata.create_all(bind=engine)


def seed_sample_data(db: Session):
    if db.query(user.User).count() == 0:
        sample_users = [
            user.User(email="jane@example.com", name="Jane Doe", phone="555-123-4567", is_provider=False, address="Downtown"),
            user.User(email="mike@example.com", name="Mike Green", phone="555-987-6543", is_provider=True, address="Uptown"),
        ]
        db.add_all(sample_users)
        db.commit()

    if db.query(job.Job).count() == 0:
        customer = db.query(user.User).filter_by(email="jane@example.com").first()
        sample_jobs = [
            job.Job(
                customer_id=customer.id,
                title="Backyard mowing",
                description="Trim the lawn, edge the walkways and remove clippings.",
                service_type="Lawn Care",
                urgency="Today",
                address="123 Maple St",
                latitude=40.7128,
                longitude=-74.0060,
            ),
            job.Job(
                customer_id=customer.id,
                title="Mulch freshen-up",
                description="Add fresh mulch to the flower beds and weed the front yard.",
                service_type="Landscaping",
                urgency="This week",
                address="456 Oak Ave",
                latitude=40.7306,
                longitude=-73.9352,
            ),
        ]
        db.add_all(sample_jobs)
        db.commit()


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_sample_data(db)
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Black Rabbit Services API is running"}

@app.get("/dashboard", response_class=FileResponse)
def dashboard():
    return FileResponse(frontend_dir / "provider-dashboard.html")

@app.get("/post-job", response_class=FileResponse)
def post_job():
    return FileResponse(frontend_dir / "customer-job-post.html")

@app.post("/jobs/", response_model=job_schema.JobRead)
def create_job(job_data: job_schema.JobCreate, db: Session = Depends(get_db)):
    new_job = job.Job(**job_data.dict())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@app.get("/jobs/")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(job.Job).all()

@app.get("/jobs/open/")
def get_open_jobs(db: Session = Depends(get_db)):
    return db.query(job.Job).filter(job.Job.status == "open").all()

@app.put("/jobs/{job_id}/status/")
def update_job_status(job_id: int, status: str, db: Session = Depends(get_db)):
    job_obj = db.query(job.Job).filter(job.Job.id == job_id).first()
    if job_obj:
        job_obj.status = status
        db.commit()
        db.refresh(job_obj)
        return {"message": f"Job {job_id} updated to {status}"}
    return {"error": "Job not found"}