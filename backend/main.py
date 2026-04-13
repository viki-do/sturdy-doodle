import os
import socketio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

import models
from database import engine
from routers import auth, game

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")

# Adatbázis táblák létrehozása
models.Base.metadata.create_all(bind=engine)

# --- SOCKET.IO BEÁLLÍTÁSA ---
# 1. Létrehozzuk az aszinkron Socket.io szervert
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"]
)

# 2. Létrehozzuk a FastAPI appot
app = FastAPI(title="Checkmate.com API")


# --- MIDDLEWARE-EK ---
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

# --- SOCKET.IO ESEMÉNYEK ---
@sio.event
async def connect(sid, environ):
    print(f"Socket csatlakozott: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Socket lecsatlakozott: {sid}")

# Példa: Játékos csatlakoztatása egy konkrét meccs szobájához
@sio.on("join_game")
async def join_game(sid, data):
    game_id = data.get("game_id")
    if game_id:
        await sio.enter_room(sid, str(game_id))
        print(f"SID {sid} belépett a {game_id} szobába.")

# --- ROUTEREK ---
app.include_router(auth.router)
app.include_router(game.router)

app.state.sio = sio

@app.get("/")
def home():
    return {"status": "Online"}


socket_app = socketio.ASGIApp(sio, app)