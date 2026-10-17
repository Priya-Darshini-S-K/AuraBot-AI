import os

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai

# Load environment variables from the .env file
load_dotenv()

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
).strip() or "gemini-2.5-flash"

# Create the Gemini client only when an API key is available
client = genai.Client(api_key=API_KEY) if API_KEY else None

SYSTEM_PROMPT = """
You are AuraBot, a friendly and helpful AI companion.

Guidelines:
- Support English, Tamil, and Tanglish.
- Explain difficult concepts in simple language.
- Help with programming, HTML, CSS, JavaScript, Python, AI,
  study tips, career guidance, and general questions.
- Use examples when helpful.
- Keep simple answers concise.
- Use bullet points for step-by-step explanations.
- Never claim to have performed actions you cannot perform.
"""


def demo_reply(message: str) -> str:
    """Provide simple responses when no API key is configured."""

    text = message.lower().strip()

    if any(word in text for word in ["hello", "hi", "hey", "vanakkam"]):
        return (
            "Hi there! 🩵 I'm AuraBot, your AI companion. "
            "What would you like to explore today?"
        )

    if "html" in text and any(
        word in text for word in ["meaning", "what", "define"]
    ):
        return (
            "HTML stands for HyperText Markup Language. 💻 "
            "It provides the structure of a webpage. "
            "CSS styles it, and JavaScript adds interactivity."
        )

    if "html" in text and "use" in text:
        return (
            "HTML is used to create the structure of webpages. "
            "It helps display headings, paragraphs, images, links, "
            "forms, and other website elements. 🌐"
        )

    if "artificial intelligence" in text or text in {
        "what is ai",
        "what is ai?"
    }:
        return (
            "Artificial Intelligence (AI) helps computers perform "
            "tasks that usually require human intelligence, such as "
            "understanding language and solving problems. ✨"
        )

    if "study" in text or "exam" in text:
        return (
            "Try this study plan 📚\n"
            "1. Choose one small topic.\n"
            "2. Study for 25 minutes.\n"
            "3. Take a 5-minute break.\n"
            "4. Explain what you learned in your own words.\n"
            "5. Review it later."
        )

    return (
        "I'm currently in demo mode. 🩵 "
        "Configure a valid Gemini API key in your .env file "
        "to enable AI-powered responses."
    )


def ask_gemini(message: str) -> tuple[str, str]:
    """Generate an AI response or return a safe fallback."""

    if client is None:
        return demo_reply(message), "demo"

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=(
                SYSTEM_PROMPT
                + "\n\nUser message:\n"
                + message
            ),
        )

        answer = getattr(response, "text", None)

        if answer and answer.strip():
            return answer.strip(), "ai"

        return (
            "I couldn't generate a response just now. "
            "Please try asking in a different way.",
            "error",
        )

    except Exception as exc:
        # Keep technical details in the server terminal,
        # not in the public chat response.
        print(f"Gemini API error: {exc}")

        error_text = str(exc).lower()

        if any(
            word in error_text
            for word in [
                "quota",
                "resource_exhausted",
                "429",
                "rate limit",
            ]
        ):
            return (
                "The AI service has reached its usage limit. "
                "Please check your Gemini API quota and try again later. 🩵",
                "error",
            )

        if any(
            word in error_text
            for word in [
                "api key",
                "unauthorized",
                "permission denied",
                "401",
                "403",
            ]
        ):
            return (
                "I couldn't authenticate with the AI service. "
                "Please check your Gemini API key and permissions.",
                "error",
            )

        if "404" in error_text or "not found" in error_text:
            return (
                "The selected AI model may not be available. "
                "Check GEMINI_MODEL in your .env file.",
                "error",
            )

        return (
            "I couldn't connect to the AI service. "
            "Please check your internet connection and API settings, "
            "then try again. 🩵",
            "error",
        )


@app.get("/")
def home():
    return render_template("index.html")


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}

    message = str(data.get("message", "")).strip()

    if not message:
        return jsonify({
            "error": "Please type a message first."
        }), 400

    if len(message) > 5000:
        return jsonify({
            "error": "Please keep your message under 5,000 characters."
        }), 400

    reply, mode = ask_gemini(message)

    return jsonify({
        "reply": reply,
        "mode": mode,
    })


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "api_configured": client is not None,
        "model": MODEL_NAME,
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))

    app.run(
        host="127.0.0.1",
        port=port,
        debug=False,
    )