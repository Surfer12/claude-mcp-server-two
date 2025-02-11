"""
FastAPI server with enhanced monitoring and visualization capabilities.
"""
import os
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
import uvicorn
from pydantic import BaseModel

from mcp_tools import MCPTools

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="Enhanced MCP Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize MCP Tools
mcp_tools = MCPTools()

# Security models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

# Request models
class CodeGenerationRequest(BaseModel):
    """Model for code generation requests."""
    prompt: str
    provider: Optional[str] = "auto"
    temperature: Optional[float] = 0.7

class CodeAnalysisRequest(BaseModel):
    """Model for code analysis requests."""
    code: str
    analysis_type: Optional[str] = "all"

class CommandRequest(BaseModel):
    """Model for general command requests."""
    type: str
    prompt: Optional[str] = None
    analysis_type: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# User database (replace with actual database in production)
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash(os.getenv("ADMIN_PASSWORD", "admin")),
        "disabled": False,
    }
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/generate")
async def generate_code(
    request: CodeGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate code using specified provider."""
    try:
        result = await mcp_tools.process_command({
            "type": "code_generation",
            **request.dict()
        })
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_code(
    request: CodeAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyze code structure and patterns."""
    try:
        result = await mcp_tools.process_command({
            "type": "code_analysis",
            **request.dict()
        })
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/command")
async def handle_command(
    request: CommandRequest,
    current_user: User = Depends(get_current_user)
):
    """Handle general MCP commands with monitoring."""
    try:
        result = await mcp_tools.process_command(request.dict())
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics(current_user: User = Depends(get_current_user)):
    """Get performance metrics and visualizations."""
    try:
        metrics = mcp_tools.get_performance_metrics()
        return JSONResponse(content=metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Render the dashboard interface."""
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "title": "MCP Server Dashboard"}
    )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)