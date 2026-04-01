import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

import models
from database import engine
# Itt NEM szabad pontot használni az import előtt!
from routers import auth, game

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Checkmate.com API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware, 
    secret_key=SECRET_KEY,
    session_cookie="chess_session",
)

# Bekötjük a routereket
app.include_router(auth.router)
app.include_router(game.router)

@app.get("/")
def home():
    return {"status": "Online"}