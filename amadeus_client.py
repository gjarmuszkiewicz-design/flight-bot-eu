from amadeus import Client, ResponseError
from config import AMADEUS_API_KEY, AMADEUS_API_SECRET
from datetime import datetime, timedelta

client = Client(
    client_id=AMADEUS_API_KEY,
    client_secret=AMADEUS_API_SECRET
)

def search_flights(origin: str, destination: str, date_from: str = None, date_to: str = None):
    """Wyszukuje loty przez Amadeus API"""
    
    if not date_from:
        date_from = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
    
    try:
        # Upewniamy się że kody są 3-literowe i uppercase
        origin_code = origin.upper()[:3]
        dest_code = destination.upper()[:3]
        
        print(f"Searching: {origin_code} → {dest_code} on {date_from}")
        
        response = client.shopping.flight_offers_search.get(
            originLocationCode=origin_code,
            destinationLocationCode=dest_code,
            departureDate=date_from,
            adults=1,
            max=10,
            currencyCode='EUR'
        )
        
        flights = []
        for offer in response.data:
            flight = {
                'price': float(offer['price']['total']),
                'currency': offer['price']['currency'],
                'segments': [],
                'duration': None
            }
            
            for itinerary in offer['itineraries']:
                flight['duration'] = itinerary.get('duration', 'N/A')
                for segment in itinerary['segments']:
                    flight['segments'].append({
                        'from': segment['departure']['iataCode'],
                        'to': segment['arrival']['iataCode'],
                        'departure_time': segment['departure']['at'],
                        'arrival_time': segment['arrival']['at'],
                        'carrier': segment['carrierCode'],
                        'flight_number': segment['number']
                    })
            
            flights.append(flight)
        
        flights.sort(key=lambda x: x['price'])
        print(f"Found {len(flights)} flights")
        return flights
        
    except ResponseError as error:
        print(f"Amadeus API Error: {error}")
        return []
    except Exception as e:
        print(f"Search error: {e}")
        return []
