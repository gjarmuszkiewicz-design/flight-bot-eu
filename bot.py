import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from claude_client import analyze_query, format_results
from amadeus_client import search_flights
from config import TELEGRAM_TOKEN
import json

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_text = """
🛫 **Witaj w Flight Finder EU!**

Pomogę Ci znaleźć najtańsze loty w Europie.

**Przykłady:**
- Warszawa → Barcelona w czerwcu
- POZ → LIS w maju
- Kraków do Rzymu tanio

**Komendy:**
/help - Pomoc

Napisz gdzie chcesz polecieć! ✈️
"""
    await update.message.reply_text(welcome_text, parse_mode='Markdown')

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """
📖 **Jak używać:**

**Przykłady:**
✈️ Poznań → Barcelona w lipcu
✈️ WAW → ROM 10-15 czerwca

**Kody lotnisk:**
🇵🇱 WAW (Warszawa), KRK (Kraków), POZ (Poznań)
🇪🇸 BCN (Barcelona), MAD (Madryt)
🇮🇹 FCO (Rzym), MXP (Mediolan)
🇵🇹 LIS (Lizbona), OPO (Porto)
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_message = update.message.text
    user_id = update.effective_user.id
    
    await update.message.reply_text("🔍 Szukam najlepszych lotów...\n⏳ To może potrwać 15-30 sekund...")
    
    try:
        logger.info(f"User {user_id}: {user_message}")
        query_data = analyze_query(user_message)
        
        if not query_data:
            await update.message.reply_text(
                "❌ Nie rozumiem.\n\n**Spróbuj:**\n\"Warszawa → Barcelona w czerwcu\"",
                parse_mode='Markdown'
            )
            return
        
        logger.info(f"Query: {json.dumps(query_data, ensure_ascii=False)}")
        
        await update.message.reply_text(
            f"✅ Rozumiem!\n🛫 Z: **{query_data['origin']}**\n"
            f"🛬 Do: **{query_data['destination']}**\n"
            f"📅 {query_data.get('date_from', 'elastyczna data')}\n\n"
            f"Sprawdzam loty...",
            parse_mode='Markdown'
        )
        
        flights = search_flights(
            origin=query_data['origin'],
            destination=query_data['destination'],
            date_from=query_data.get('date_from')
        )
        
        if not flights:
            await update.message.reply_text(
                "❌ Nie znalazłem lotów.\n"
                "Sprawdź czy miasta są w UE i kody są poprawne."
            )
            return
        
        logger.info(f"Found {len(flights)} flights")
        formatted = format_results(flights, query_data)
        
        await update.message.reply_text(formatted, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        await update.message.reply_text(
            f"❌ Wystąpił błąd: {str(e)}\n\nSpróbuj ponownie za chwilę."
        )

def main():
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    logger.info("🚀 Bot startuje...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
