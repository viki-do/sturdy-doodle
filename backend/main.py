import uuid
import jwt # type: ignore
import chess
import chess.engine
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext # type: ignore
from pydantic import BaseModel
import os
from dotenv import load_dotenv # type: ignore
from fastapi import FastAPI, Request, HTTPException, Depends
import models
from database import SessionLocal, engine
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth # type: ignore
from starlette.responses import RedirectResponse
from fastapi import UploadFile, File
import shutil

# --- 1. KONFIGURÁCIÓ ---
load_dotenv()
STOCKFISH_PATH = "engine/stockfish.exe"
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Chess Backend")

# --- MIDDLEWARE ---
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
    same_site="lax", 
    https_only=False
)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- OAUTH REGISZTRÁCIÓ ---
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
oauth.register(
    name='github',
    client_id=os.getenv("GITHUB_CLIENT_ID"),
    client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

# --- 2. ADATMODELLEK (PYDANTIC) ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# --- 3. SEGÉDFÜGGVÉNYEK ---

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Érvénytelen token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Lejárt vagy hibás munkamenet")
    
def rebuild_board(game_id: uuid.UUID, db: Session):
    moves = db.query(models.Move).filter(models.Move.game_id == game_id).order_by(models.Move.move_number.asc()).all()
    board = chess.Board()
    for m in moves:
        if m.notation == "start" or not m.notation: continue
        parts = m.notation.split()
        for p in parts:
            try: board.push_san(p)
            except:
                try: board.push_uci(p)
                except: continue
    return board

# --- 4. AUTH ÚTVONALAK ---

@app.post("/register")
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter((models.User.username == user_data.username) | (models.User.email == user_data.email)).first()
    if existing_user: raise HTTPException(status_code=400, detail="Már létezik ilyen felhasználó!")
    hashed_pwd = pwd_context.hash(user_data.password)
    new_user = models.User(username=user_data.username, email=user_data.email, password_hash=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Sikeres regisztráció!", "user_id": str(new_user.id)}

@app.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or not pwd_context.verify(data.password, user.password_hash): raise HTTPException(status_code=401, detail="Hibás adatok!")
    token = create_access_token(data={"user_id": str(user.id), "username": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "user_id": str(user.id)}

# --- OAUTH CALLBACKS ---

@app.get("/auth/google")
async def login_google(request: Request):
    redirect_uri = "http://localhost:8000/auth/google/callback" 
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get("/auth/google/callback")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo') or (await oauth.google.get('https://openidconnect.googleapis.com/v1/userinfo', token=token)).json()
        email = user_info.get('email')
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            user = models.User(id=uuid.uuid4(), username=email.split('@')[0], email=email, provider="google")
            db.add(user)
            db.commit()
            db.refresh(user)
        jwt_token = create_access_token(data={"user_id": str(user.id), "username": user.username})
        return RedirectResponse(url=f"http://localhost:5173/login?token={jwt_token}&username={user.username}&user_id={user.id}")
    except Exception: return RedirectResponse(url="http://localhost:5173/login?error=google_auth_failed")

@app.get("/auth/github")
async def login_github(request: Request):
    return await oauth.github.authorize_redirect(request, "http://localhost:8000/auth/github/callback")

@app.get("/auth/github/callback")
async def auth_github(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.github.authorize_access_token(request)
        user_info = (await oauth.github.get('user', token=token)).json()
        email = user_info.get('email') or next(e['email'] for e in (await oauth.github.get('user/emails', token=token)).json() if e['primary'])
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            user = models.User(id=uuid.uuid4(), username=user_info.get('login'), email=email, provider="github")
            db.add(user)
            db.commit()
            db.refresh(user)
        jwt_token = create_access_token(data={"user_id": str(user.id), "username": user.username})
        return RedirectResponse(url=f"http://localhost:5173/login?token={jwt_token}&username={user.username}&user_id={user.id}")
    except Exception: return RedirectResponse(url="http://localhost:5173/login?error=github_auth_failed")

# --- PROFIL ÉS SAKK ---

@app.get("/profile")
def get_profile(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
    if not user: raise HTTPException(status_code=404, detail="Nem található")
    return {"username": user.username, "email": user.email, "provider": user.provider}

@app.post("/create-game")
def create_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        # 1. UUID konvertálása
        try:
            u_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Érvénytelen user_id formátum")

        # 2. Adatok kinyerése a kérésből (amiket a frontend küld)
        # Ha nem küld semmit, adunk alapértelmezett értékeket
        time_cat = data.get("time_category", "rapid")
        base_time = data.get("base_time", 600) 

        board = chess.Board()
        
        # 3. Játék létrehozása - MOST MÁR MINDEN KÖTELEZŐ MEZŐVEL!
       # Játék létrehozása
        new_game = models.Game(
        white_player_id=u_uuid,
        time_category=time_cat,      
        base_time_sec=base_time,     
        status=models.GameStatus.ongoing,  # Így használd, idézőjel nélkül!
        created_at=datetime.utcnow()
)
        
        db.add(new_game)
        db.commit()
        db.refresh(new_game)
        
        # 4. Kezdő lépés rögzítése
        start_move = models.Move(
            game_id=new_game.id,
            move_number=0,
            notation="start",
            fen_before=board.fen()
        )
        db.add(start_move)
        db.commit()
        
        print(f"Sikeres játék létrehozás! ID: {new_game.id}")
        return {"game_id": str(new_game.id), "fen": board.fen()}
        
    except Exception as e:
        db.rollback()
        print(f"VÁRATLAN HIBA A JÁTÉK INDÍTÁSAKOR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-valid-moves")
def get_valid_moves(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_id_str = data.get("game_id")
    
    # 1. Alapvető ellenőrzések
    if not game_id_str or game_id_str == "null": 
        return {"valid_moves": [], "is_in_check": False}
    
    try:
        # 2. Tábla újraépítése az adatbázisból
        board = rebuild_board(uuid.UUID(game_id_str), db)
        
        # 3. Sakk-állapot lekérdezése (a soron következő játékosra nézve)
        is_in_check = board.is_check()
        
        # 4. Érvényes lépések kigyűjtése a kijelölt mezőre
        from_sq_str = data.get("square")
        if not from_sq_str:
            return {"valid_moves": [], "is_in_check": is_in_check}
            
        from_sq = chess.parse_square(from_sq_str)
        valid_moves = [
            chess.square_name(m.to_square) 
            for m in board.legal_moves 
            if m.from_square == from_sq
        ]
        
        return {
            "valid_moves": valid_moves, 
            "is_in_check": is_in_check
        }
        
    except Exception as e:
        print(f"Hiba a valid moves lekérésekor: {e}")
        return {"valid_moves": [], "is_in_check": False}

@app.post("/move")
def make_move(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    game_uuid = uuid.UUID(data.get("game_id"))
    board = rebuild_board(game_uuid, db)
    move_uci = data.get("move")
    try:
        user_move = chess.Move.from_uci(move_uci)
        user_move_san = board.san(user_move)
        board.push(user_move)
        stock_san, m_from, m_to = "", "", ""
        if not board.is_game_over():
            engine_proc = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
            result = engine_proc.play(board, chess.engine.Limit(time=0.1))
            m_from, m_to = chess.square_name(result.move.from_square), chess.square_name(result.move.to_square)
            stock_san = board.san(result.move)
            board.push(result.move)
            engine_proc.quit()
        new_move = models.Move(game_id=game_uuid, move_number=db.query(models.Move).filter(models.Move.game_id == game_uuid).count(), notation=f"{user_move_san} {stock_san}".strip(), fen_before=board.fen())
        db.add(new_move)
        db.commit()
        return {"new_fen": board.fen(), "is_checkmate": board.is_checkmate(), "last_move_from": m_from if m_from else move_uci[:2], "last_move_to": m_to if m_to else move_uci[2:4]}
    except: raise HTTPException(status_code=400, detail="Lépési hiba")

@app.get("/game/{game_id}/history")
def get_game_history(game_id: str, db: Session = Depends(get_db)):
    try:
        game_uuid = uuid.UUID(game_id)
        moves = db.query(models.Move).filter(models.Move.game_id == game_uuid).order_by(models.Move.move_number.asc()).all()
        
        history_data = []
        board = chess.Board()
        
        # Ha nincs még lépés, csak a kezdő állást küldjük
        if not moves:
            return {"history": [{"num": 0, "m": "start", "fen": board.fen(), "from": None, "to": None}]}

        for m in moves:
            if m.notation == "start":
                history_data.append({"num": 0, "m": "start", "fen": m.fen_before, "from": None, "to": None})
                continue
            
            try:
                parts = m.notation.split()
                f, t = None, None
                for p in parts:
                    mv = board.push_san(p)
                    f, t = chess.square_name(mv.from_square), chess.square_name(mv.to_square)
                
                history_data.append({
                    "num": m.move_number, 
                    "m": m.notation, 
                    "fen": board.fen(), 
                    "from": f, 
                    "to": t
                })
            except Exception as e:
                print(f"Hiba a lépés feldolgozásánál: {e}")
                continue
        
        return {"history": history_data}
    except Exception as e:
        print(f"History hiba: {e}")
        # Vészmegoldás: ha bármi baj van, legalább egy üres kezdőpontot küldjünk
        return {"history": [{"num": 0, "m": "start", "fen": chess.STARTING_FEN, "from": None, "to": None}]}

@app.get("/get-active-game")
def get_active_game(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # .value használatával biztosítjuk, hogy a nyers szöveget kapja az adatbázis
    active_game = db.query(models.Game).filter(
        models.Game.white_player_id == uuid.UUID(user_id),
        models.Game.status == models.GameStatus.ongoing
    ).order_by(models.Game.created_at.desc()).first()

    if active_game:
        # Biztonsági start move ellenőrzés marad
        move_exists = db.query(models.Move).filter(models.Move.game_id == active_game.id).first()
        if not move_exists:
            db.add(models.Move(
                game_id=active_game.id, 
                move_number=0, 
                notation="start", 
                fen_before=chess.STARTING_FEN
            ))
            db.commit()
        
        return {"game_id": str(active_game.id)}
    
    return {"game_id": None}

@app.post("/resign-game")
def resign_game(data: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        game_id_str = data.get("game_id")
        game_uuid = uuid.UUID(game_id_str)
        game = db.query(models.Game).filter(models.Game.id == game_uuid).first()
        
        if game:
            # Itt is az Enum objektumot adjuk át, az SQLAlchemy elvégzi a többit
            game.status = models.GameStatus.finished # Mivel a models.py-ban 'finished' van, használjuk azt!
            db.commit()
            print(f"Adatbázis frissítve: {game_id_str} -> finished")
            return {"status": "resigned"}
        
        return {"status": "not_found"}
    except Exception as e:
        db.rollback()
        print(f"HIBA A RESIGN SORÁN: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home(): return {"status": "Chess Server Online"}