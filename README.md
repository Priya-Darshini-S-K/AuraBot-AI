# AuraBot AI

A pastel sky-blue and white AI chat interface inspired by the provided design. Includes a responsive layout, quick prompts, typing indicator, recent prompts, light/dark toggle, and a Flask backend. It runs in demo mode even before an API key is added; configure Gemini to enable live AI responses.

## Requirements
- Python 3.10 or newer
- Internet connection for installing packages and using Gemini
- Optional: a Google AI Studio Gemini API key

## Run on Windows (VS Code)
Open the `AuraBot` folder in VS Code, then open **Terminal → New Terminal** and run these commands one by one:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python app.py
```

Open `http://127.0.0.1:5000` in your browser. Keep the terminal open while using the app.

If PowerShell blocks activation, run this in the same terminal, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

## Enable live AI responses
1. Get a Gemini API key from Google AI Studio, if API access is available to your account.
2. Open `.env` and set `GEMINI_API_KEY=your_key_here` (do not include quotes unless needed).
3. Save `.env`, stop the server with `Ctrl+C`, then run `python app.py` again.
4. Do not share `.env` or upload it to GitHub. It is ignored by `.gitignore`.

If no key is configured, the UI still works with a small demo response handler. API quotas and access depend on the Google account, project, model, and current limits; this project cannot guarantee external API availability.

## Troubleshooting
- **`python` is not recognized:** try `py app.py` and `py -m pip install -r requirements.txt`.
- **`ModuleNotFoundError`:** activate the virtual environment and run `pip install -r requirements.txt` again.
- **Page does not open:** make sure the terminal says the Flask server is running, then visit `http://127.0.0.1:5000`.
- **Port already in use:** stop the other server or set `PORT=5001` in `.env`, restart, and open `http://127.0.0.1:5001`.
- **Gemini quota/API error:** verify the API key and model access in Google AI Studio; the UI will remain running and show a friendly message.

## Routes
- `/` — chat UI
- `/api/chat` — POST JSON `{ "message": "Hello" }`
- `/health` — backend status (does not reveal the API key)
