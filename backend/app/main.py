from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .models import user, job
from .schemas import user as user_schema, job as job_schema

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Black Rabbit Services", description="Marketplace connecting customers with local service providers", version="0.1.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def read_root():
    return {"message": "Black Rabbit Services API is running"}

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