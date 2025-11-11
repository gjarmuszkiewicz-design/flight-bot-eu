import anthropic
import json
from config import CLAUDE_API_KEY

client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

def analyze_query(user_message: str) -> dict:
    """Analizuje zapytanie użytkownika"""
    
    prompt = f"""Użytkownik szuka lotów w Europie (UE). Przeanalizuj zapytanie i wyciągnij:
- miasto/lotnisko wylotu (3-literowy kod IATA jeśli znasz, lub nazwa miasta)
- miasto/lotnisko przylotu (3-literowy kod IATA jeśli znasz, lub nazwa miasta)
- zakres dat (format YYYY-MM-DD)
- preferencje użytkownika

Zapytanie: "{user_message}"

Odpowiedz TYLKO w formacie JSON (bez markdown, bez ```):
{{
  "origin": "kod_IATA_3_litery",
  "destination": "kod_IATA_3_litery",
  "date_from": "YYYY-MM-DD lub null",
  "date_to": "YYYY-MM-DD lub null",
  "preferences": []
}}

Jeśli nie możesz określić origin lub destination, zwróć null.
TYLKO JSON, NIC WIĘCEJ."""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = message.content[0].text.strip()
        text = text.replace('```json', '').replace('```', '').strip()
        
        data = json.loads(text)
        
        if not data.get('origin') or not data.get('destination'):
            return None
            
        return data
        
    except Exception as e:
        print(f"Claude error: {e}")
        return None

def format_results(flights: list, query_data: dict) -> str:
    """Formatuje wyniki lotów"""
    
    flights_json = json.dumps(flights[:5], indent=2, ensure_ascii=False)
    
    prompt = f"""Masz wyniki lotów:

Z: {query_data['origin']} → Do: {query_data['destination']}
Data: {query_data.get('date_from', 'elastyczna')}

Loty (top 5):
{flights_json}

Sformatuj dla Telegram (Markdown):
1. Wypisz TOP 3 najlepsze opcje
2. Dla każdej: cena, czas, przesiadki
3. Krótka rekomendacja (najlepszy wybór)
4. Użyj emoji
5. Format czytelny dla mobile

ODPOWIEDŹ TYLKO TEKSTEM, BEZ KOMENTARZY."""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text.strip()
        
    except Exception as e:
        return f"❌ Błąd formatowania: {e}"
