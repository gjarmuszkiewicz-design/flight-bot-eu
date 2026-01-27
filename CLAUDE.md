# CLAUDE.md - AI Assistant Guide for Flight Finder EU Bot

## Project Overview

Flight Finder EU Bot is a Telegram chatbot that helps users find cheap flights across Europe. It uses natural language processing via Claude AI to understand user queries in Polish and searches for flights using the Amadeus Flight API.

**Primary Language**: Polish (UI and user interactions)
**Target Region**: European Union flights

## Architecture

```
User (Telegram) → bot.py → claude_client.py (query analysis)
                        ↓
                  amadeus_client.py (flight search)
                        ↓
                  claude_client.py (result formatting)
                        ↓
                  User (Telegram response)
```

The bot follows a two-stage Claude AI processing pattern:
1. **Input parsing**: Converts natural language queries to structured flight search parameters
2. **Output formatting**: Transforms raw flight data into user-friendly Telegram messages

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Python | 3.11 |
| Bot Framework | python-telegram-bot | 21.9 |
| LLM | Claude (anthropic SDK) | 0.60.0 |
| Flight API | Amadeus | 9.0.0 |
| Deployment | Railway.app | - |

## File Structure

```
flight-bot-eu/
├── bot.py              # Main entry point, Telegram handlers
├── claude_client.py    # Claude AI integration (query analysis + formatting)
├── amadeus_client.py   # Amadeus Flight API wrapper
├── config.py           # Environment variable configuration
├── requirements.txt    # Python dependencies
├── runtime.txt         # Python version for Railway (python-3.11)
├── Procfile            # Railway worker configuration
└── README.md           # Basic project documentation (Polish)
```

**Total codebase**: ~260 lines across 4 Python modules

## Configuration

All configuration is environment-based (12-factor app). Required environment variables:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_TOKEN` | Telegram Bot API token |
| `CLAUDE_API_KEY` | Anthropic Claude API key |
| `AMADEUS_API_KEY` | Amadeus API client ID |
| `AMADEUS_API_SECRET` | Amadeus API client secret |

Configuration is loaded in `config.py` via `os.getenv()`.

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export TELEGRAM_TOKEN="your-token"
export CLAUDE_API_KEY="your-key"
export AMADEUS_API_KEY="your-key"
export AMADEUS_API_SECRET="your-secret"

# Run the bot
python bot.py
```

The bot runs as a long-polling worker process.

## Code Conventions

### General Patterns
- **Modular design**: Each external service has its own client module
- **Async/await**: All Telegram handlers use async functions
- **Error handling**: Try-catch with user-friendly Polish error messages
- **Logging**: Standard Python logging with timestamps, INFO level

### Telegram Bot Patterns
- Command handlers: `/start`, `/help`
- Message handler: Free-text queries via `MessageHandler`
- Markdown formatting: `parse_mode='Markdown'` for rich messages
- Emoji-heavy UI for visual appeal

### Claude AI Integration
- Model: `claude-sonnet-4-20250514`
- Query analysis: max_tokens=500, returns JSON
- Result formatting: max_tokens=1500, returns Markdown
- Prompts enforce strict output format (JSON or plain text, no markdown code blocks)

### Amadeus API Integration
- IATA 3-letter airport codes (uppercase)
- Default search: 14 days ahead if no date specified
- Results limited to 10 flights, sorted by price ascending
- Currency: EUR
- Single adult passenger default

## Key Behaviors

### Query Processing Flow (bot.py:49-98)
1. User sends message
2. Bot acknowledges with "Szukam..." (searching) status
3. Claude analyzes query → extracts origin, destination, dates
4. Bot confirms understanding with parsed data
5. Amadeus searches for flights
6. Claude formats top 5 results for Telegram
7. Bot sends formatted results

### Default Values
- **No date specified**: Search 14 days from now (`amadeus_client.py:13-14`)
- **Flight limit**: 10 results max from API (`amadeus_client.py:28`)
- **Display limit**: Top 5 flights formatted (`claude_client.py:54`)

### Error Handling
- Invalid query: Polish message with example format
- No flights found: Suggests checking city codes
- API errors: Generic error with retry suggestion

## API Response Structures

### Claude Query Analysis Output (claude_client.py)
```json
{
  "origin": "WAW",
  "destination": "BCN",
  "date_from": "2025-06-15",
  "date_to": null,
  "preferences": []
}
```

### Flight Data Structure (amadeus_client.py)
```python
{
    'price': float,
    'currency': str,
    'duration': str,
    'segments': [
        {
            'from': str,      # IATA code
            'to': str,        # IATA code
            'departure_time': str,
            'arrival_time': str,
            'carrier': str,
            'flight_number': str
        }
    ]
}
```

## Common Tasks for AI Assistants

### Adding a New Command
1. Create async handler function in `bot.py`
2. Register with `application.add_handler(CommandHandler("name", handler))`
3. Follow existing pattern with `parse_mode='Markdown'`

### Modifying Claude Prompts
- Query analysis prompt: `claude_client.py:10-28`
- Result formatting prompt: `claude_client.py:56-71`
- Always enforce output format (JSON or plain text)

### Changing Search Defaults
- Default date offset: `amadeus_client.py:14` (currently 14 days)
- Max results: `amadeus_client.py:28` (currently 10)
- Currency: `amadeus_client.py:29` (currently EUR)

### Deployment
- Push to connected branch for Railway auto-deploy
- Procfile defines worker: `worker: python bot.py`
- Runtime: Python 3.11

## Testing Notes

- No automated tests currently exist
- Manual testing via Telegram bot interaction
- Test queries: "Warszawa → Barcelona w czerwcu", "POZ → LIS w maju"

## Important Airport Codes (Referenced in Help)

| Code | City |
|------|------|
| WAW | Warsaw |
| KRK | Krakow |
| POZ | Poznan |
| BCN | Barcelona |
| MAD | Madrid |
| FCO | Rome |
| MXP | Milan |
| LIS | Lisbon |
| OPO | Porto |
