from fastapi import FastAPI, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import json
from pathlib import Path
from typing import Dict, Optional, Literal

app = FastAPI(title="Printer Farm Management System")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Create data directory if it doesn't exist
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)
printers_file = data_dir / "printers.json"

# Initialize printers data
if not printers_file.exists():
    default_printers = {
        "printer1": {
            "name": "Octo Printer 1",
            "type": "octoprint",
            "status": "idle",
            "progress": 0,
            "ip": "192.168.1.100",
            "api_key": ""
        },
        "printer2": {
            "name": "Bambu X1C",
            "type": "bambulab",
            "status": "printing",
            "progress": 45,
            "ip": "192.168.1.101",
            "api_key": "",
            "serial": "BBLP1234567",
            "access_code": ""
        },
        "printer3": {
            "name": "Klipper Ender 3",
            "type": "klipper",
            "status": "idle",
            "progress": 0,
            "ip": "192.168.1.102",
            "port": "7125",
            "api_key": ""
        }
    }
    printers_file.write_text(json.dumps(default_printers, indent=2))

def load_printers():
    return json.loads(printers_file.read_text())

def save_printers(printers):
    printers_file.write_text(json.dumps(printers, indent=2))

class OctoPrinter(BaseModel):
    name: str
    type: Literal["octoprint"]
    ip: str
    api_key: Optional[str] = ""

class BambuPrinter(BaseModel):
    name: str
    type: Literal["bambulab"]
    ip: str
    serial: str
    access_code: Optional[str] = ""
    api_key: Optional[str] = ""

class KlipperPrinter(BaseModel):
    name: str
    type: Literal["klipper"]
    ip: str
    port: str = "7125"
    api_key: Optional[str] = ""

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "printers": load_printers()}
    )

@app.get("/api/printers")
async def get_printers():
    return load_printers()

@app.get("/api/printer/{printer_id}")
async def get_printer(printer_id: str):
    printers = load_printers()
    return printers.get(printer_id, {"error": "Printer not found"})

@app.post("/api/printers")
async def add_printer(printer: OctoPrinter | BambuPrinter | KlipperPrinter):
    printers = load_printers()
    printer_id = f"printer{len(printers) + 1}"
    
    printer_data = printer.dict()
    printer_data.update({
        "status": "offline",
        "progress": 0
    })
    
    printers[printer_id] = printer_data
    save_printers(printers)
    return {"id": printer_id, "printer": printers[printer_id]}

@app.delete("/api/printers/{printer_id}")
async def delete_printer(printer_id: str):
    printers = load_printers()
    if printer_id not in printers:
        raise HTTPException(status_code=404, detail="Printer not found")
    del printers[printer_id]
    save_printers(printers)
    return {"message": "Printer deleted"}

@app.put("/api/printers/{printer_id}")
async def update_printer(printer_id: str, printer: OctoPrinter | BambuPrinter | KlipperPrinter):
    printers = load_printers()
    if printer_id not in printers:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    printer_data = printer.dict()
    printer_data["status"] = printers[printer_id]["status"]
    printer_data["progress"] = printers[printer_id]["progress"]
    
    printers[printer_id] = printer_data
    save_printers(printers)
    return printers[printer_id]

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
