from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import models, schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(email=user.email, name=user.name, password=user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/submit")
def submit_result(result: schemas.ResultCreate, db: Session = Depends(get_db)):
    db_result = models.Result(user_id=result.user_id, strength=result.strength)
    db.add(db_result)
    db.commit()
    return {"message": "Result stored"}