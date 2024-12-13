# Printer Farm Management System

A web-based system for managing multiple 3D printers in a farm setup.

## Features

- Monitor multiple 3D printers
- Track printer status
- Manage print jobs
- Queue management
- Web interface for control

## Installation

1. Install Python 3.8 or higher
2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
uvicorn main:app --reload
```

4. Open http://localhost:8000 in your browser

## Configuration

Edit the `config.py` file to add your printers and customize settings.
