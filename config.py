import os

# Telegram
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', '')

# Claude
CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY', '')

# Amadeus
AMADEUS_API_KEY = os.getenv('AMADEUS_API_KEY', '')
AMADEUS_API_SECRET = os.getenv('AMADEUS_API_SECRET', '')
```

---

#### **📄 Plik 5: `requirements.txt`**
```
python-telegram-bot==20.7
anthropic==0.18.0
amadeus==9.0.0
```

---

#### **📄 Plik 6: `Procfile`**
```
worker: python bot.py
```

---

#### **📄 Plik 7: `runtime.txt`**
```
python-3.11.0
