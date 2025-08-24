from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from flask import Flask
from flask_cors import CORS

app = Flask(__name__, static_url_path='/static', static_folder='static')
# only allow your domain in production (replace later)
CORS(app, resources={r"/*": {"origins": ["https://yourdomain.com", "https://www.yourdomain.com"]}})

@app.route("/")
def home():
    return render_template("index.html")

# dummy chat route so the Send button doesn't error if your LLM isn't wired yet
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_msg = (data.get("message") or "").strip()
    if not user_msg:
        return jsonify({"reply": "Tell me your main concern and I’ll share a practical next step."})
    return jsonify({"reply": f"CureMax says: I understand you said “{user_msg}”. Let’s work on that together."})

# dummy image analyzer (no vision key required)
@app.route("/analyze_image", methods=["POST"])
def analyze_image():
    if "image" not in request.files:
        return jsonify({"reply": "No image received."})
    f = request.files["image"]
    return jsonify({"reply": f"Got your image: {f.filename}. I’ll describe this once vision is enabled."})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
