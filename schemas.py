from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    name: str
    password: str

class ResultCreate(BaseModel):
    user_id: int
    strength: str