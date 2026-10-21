// Treść kursu. Każdy rozdział = sytuacja z życia, każda lekcja = słówka + zwroty + scenka.
// To jest poziom początkujący; średni i zaawansowany są w course-levels.js.
// Ten sam format posłuży później dla hiszpańskiego (osobny plik course-es.js z lang: "es-ES").
//
// words:   pojedyncze słówka (en, pl)
// phrases: gotowe schematy zdań – to na nich opiera się mówienie (alt = inne poprawne wersje)
// dialog:  krótka scenka; "you" to kwestie, które wypowiadasz Ty

import { COURSE_B1, COURSE_C1 } from "./course-levels.js";

export const COURSE = {
  id: "en",
  lang: "en-US",
  title: "Angielski w praktyce",
  chapters: [
    {
      id: "basics",
      emoji: "👋",
      title: "Pierwsze kroki",
      description: "Przywitaj się, przedstaw i nie zgub się w pierwszej rozmowie.",
      lessons: [
        {
          id: "basics-1",
          title: "Cześć, jestem…",
          words: [
            { en: "hello", pl: "cześć / dzień dobry" },
            { en: "name", pl: "imię" },
            { en: "nice", pl: "miły" },
            { en: "meet", pl: "poznać" },
            { en: "friend", pl: "przyjaciel" },
            { en: "thanks", pl: "dzięki" },
          ],
          phrases: [
            { en: "Hi, my name is Tom.", pl: "Cześć, mam na imię Tom." },
            { en: "What's your name?", pl: "Jak masz na imię?", alt: ["What is your name?"] },
            { en: "Nice to meet you.", pl: "Miło cię poznać." },
            { en: "How are you?", pl: "Jak się masz?" },
            { en: "I'm fine, thanks.", pl: "Dobrze, dzięki.", alt: ["I am fine, thanks.", "I'm fine, thank you."] },
          ],
          dialog: [
            { who: "them", en: "Hi! I'm Anna. What's your name?", pl: "Cześć! Jestem Anna. Jak masz na imię?" },
            { who: "you", en: "Hi, my name is Tom.", pl: "Cześć, mam na imię Tom." },
            { who: "them", en: "Nice to meet you, Tom!", pl: "Miło cię poznać, Tom!" },
            { who: "you", en: "Nice to meet you.", pl: "Miło cię poznać." },
          ],
        },
        {
          id: "basics-2",
          title: "Skąd jesteś?",
          words: [
            { en: "Poland", pl: "Polska" },
            { en: "country", pl: "kraj" },
            { en: "city", pl: "miasto" },
            { en: "live", pl: "mieszkać" },
            { en: "from", pl: "z (skąd)" },
            { en: "here", pl: "tutaj" },
          ],
          phrases: [
            { en: "Where are you from?", pl: "Skąd jesteś?" },
            { en: "I'm from Poland.", pl: "Jestem z Polski.", alt: ["I am from Poland."] },
            { en: "I live in Warsaw.", pl: "Mieszkam w Warszawie." },
            { en: "Is this your first time here?", pl: "Jesteś tu pierwszy raz?" },
            { en: "Yes, it's my first time.", pl: "Tak, jestem tu pierwszy raz.", alt: ["Yes, it is my first time."] },
          ],
          dialog: [
            { who: "them", en: "Where are you from?", pl: "Skąd jesteś?" },
            { who: "you", en: "I'm from Poland.", pl: "Jestem z Polski." },
            { who: "them", en: "Cool! Is this your first time here?", pl: "Super! Jesteś tu pierwszy raz?" },
            { who: "you", en: "Yes, it's my first time.", pl: "Tak, jestem tu pierwszy raz." },
          ],
        },
        {
          id: "basics-3",
          title: "Nie rozumiem!",
          words: [
            { en: "understand", pl: "rozumieć" },
            { en: "slowly", pl: "powoli" },
            { en: "again", pl: "znowu / jeszcze raz" },
            { en: "speak", pl: "mówić" },
            { en: "little", pl: "trochę / mały" },
            { en: "sorry", pl: "przepraszam" },
          ],
          phrases: [
            { en: "Sorry, I don't understand.", pl: "Przepraszam, nie rozumiem.", alt: ["Sorry, I do not understand."] },
            { en: "Can you say that again?", pl: "Możesz powtórzyć?" },
            { en: "Can you speak slowly, please?", pl: "Możesz mówić powoli, proszę?", alt: ["Could you speak slowly, please?"] },
            { en: "I speak a little English.", pl: "Mówię trochę po angielsku." },
            { en: "What does it mean?", pl: "Co to znaczy?" },
          ],
          dialog: [
            { who: "them", en: "Would you like to join our pub quiz tonight?", pl: "Chcesz dołączyć do naszego quizu w pubie dziś wieczorem?" },
            { who: "you", en: "Sorry, I don't understand.", pl: "Przepraszam, nie rozumiem." },
            { who: "them", en: "No problem! A quiz. Tonight. In the pub.", pl: "Nie ma sprawy! Quiz. Dziś. W pubie." },
            { who: "you", en: "I speak a little English.", pl: "Mówię trochę po angielsku." },
          ],
        },
      ],
    },
    {
      id: "airport",
      emoji: "✈️",
      title: "Lotnisko",
      description: "Odprawa, kontrola, samolot i walizka, która poleciała gdzie indziej.",
      lessons: [
        {
          id: "airport-1",
          title: "Odprawa",
          words: [
            { en: "passport", pl: "paszport" },
            { en: "ticket", pl: "bilet" },
            { en: "suitcase", pl: "walizka" },
            { en: "flight", pl: "lot" },
            { en: "gate", pl: "bramka (wyjście)" },
            { en: "window seat", pl: "miejsce przy oknie" },
          ],
          phrases: [
            { en: "Can I see your passport, please?", pl: "Mogę prosić paszport?" },
            { en: "Here you are.", pl: "Proszę (podając coś)." },
            { en: "I have one suitcase.", pl: "Mam jedną walizkę." },
            { en: "Can I have a window seat?", pl: "Czy mogę dostać miejsce przy oknie?" },
            { en: "Which gate is it?", pl: "Która to bramka?" },
          ],
          dialog: [
            { who: "them", en: "Good morning. Can I see your passport, please?", pl: "Dzień dobry. Mogę prosić paszport?" },
            { who: "you", en: "Here you are.", pl: "Proszę." },
            { who: "them", en: "Thank you. Any bags to check in?", pl: "Dziękuję. Jakiś bagaż do nadania?" },
            { who: "you", en: "I have one suitcase.", pl: "Mam jedną walizkę." },
            { who: "them", en: "Great. Window or aisle?", pl: "Świetnie. Okno czy przejście?" },
            { who: "you", en: "Can I have a window seat?", pl: "Czy mogę dostać miejsce przy oknie?" },
          ],
        },
        {
          id: "airport-2",
          title: "Kontrola i na pokładzie",
          words: [
            { en: "liquids", pl: "płyny" },
            { en: "laptop", pl: "laptop" },
            { en: "bag", pl: "torba" },
            { en: "water", pl: "woda" },
            { en: "blanket", pl: "koc" },
            { en: "delay", pl: "opóźnienie" },
          ],
          phrases: [
            { en: "Do I need to take out my laptop?", pl: "Czy muszę wyjąć laptopa?" },
            { en: "Is this your bag?", pl: "Czy to pani/pana torba?" },
            { en: "Can I have some water, please?", pl: "Mogę prosić trochę wody?" },
            { en: "Is the flight delayed?", pl: "Czy lot jest opóźniony?" },
            { en: "Excuse me, I think you're in my seat.", pl: "Przepraszam, chyba siedzi pan/pani na moim miejscu.", alt: ["Excuse me, I think you are in my seat."] },
          ],
          dialog: [
            { who: "them", en: "Any liquids in your bag?", pl: "Jakieś płyny w torbie?" },
            { who: "you", en: "Do I need to take out my laptop?", pl: "Czy muszę wyjąć laptopa?" },
            { who: "them", en: "Yes, please. And your shoes too.", pl: "Tak, proszę. I buty też." },
            { who: "you", en: "Is the flight delayed?", pl: "Czy lot jest opóźniony?" },
            { who: "them", en: "Only one hour. Lucky you!", pl: "Tylko godzinę. Ma pan szczęście!" },
          ],
        },
        {
          id: "airport-3",
          title: "Gdzie jest moja walizka?",
          words: [
            { en: "lost", pl: "zgubiony" },
            { en: "luggage", pl: "bagaż" },
            { en: "baggage claim", pl: "odbiór bagażu" },
            { en: "blue", pl: "niebieski" },
            { en: "big", pl: "duży" },
            { en: "address", pl: "adres" },
          ],
          phrases: [
            { en: "My suitcase didn't arrive.", pl: "Moja walizka nie przyleciała.", alt: ["My suitcase did not arrive."] },
            { en: "Where is the baggage claim?", pl: "Gdzie jest odbiór bagażu?" },
            { en: "It's a big blue suitcase.", pl: "To duża niebieska walizka.", alt: ["It is a big blue suitcase."] },
            { en: "Here is my hotel address.", pl: "Oto adres mojego hotelu." },
            { en: "When will it be here?", pl: "Kiedy tu będzie?" },
          ],
          dialog: [
            { who: "you", en: "My suitcase didn't arrive.", pl: "Moja walizka nie przyleciała." },
            { who: "them", en: "I'm sorry. What does it look like?", pl: "Przykro mi. Jak wygląda?" },
            { who: "you", en: "It's a big blue suitcase.", pl: "To duża niebieska walizka." },
            { who: "them", en: "Good news: it's in Barcelona. Having a better holiday than you.", pl: "Dobra wiadomość: jest w Barcelonie. Ma lepsze wakacje niż pan." },
            { who: "you", en: "When will it be here?", pl: "Kiedy tu będzie?" },
          ],
        },
      ],
    },
    {
      id: "hotel",
      emoji: "🏨",
      title: "Hotel",
      description: "Zameldowanie, problemy w pokoju i wymeldowanie bez stresu.",
      lessons: [
        {
          id: "hotel-1",
          title: "Zameldowanie",
          words: [
            { en: "reservation", pl: "rezerwacja" },
            { en: "room", pl: "pokój" },
            { en: "night", pl: "noc" },
            { en: "breakfast", pl: "śniadanie" },
            { en: "key", pl: "klucz" },
            { en: "floor", pl: "piętro" },
          ],
          phrases: [
            { en: "I have a reservation.", pl: "Mam rezerwację." },
            { en: "It's for three nights.", pl: "To na trzy noce.", alt: ["It is for three nights."] },
            { en: "Is breakfast included?", pl: "Czy śniadanie jest wliczone?" },
            { en: "What time is breakfast?", pl: "O której jest śniadanie?" },
            { en: "What's the Wi-Fi password?", pl: "Jakie jest hasło do Wi-Fi?", alt: ["What is the Wi-Fi password?"] },
          ],
          dialog: [
            { who: "them", en: "Welcome! How can I help you?", pl: "Witamy! W czym mogę pomóc?" },
            { who: "you", en: "I have a reservation.", pl: "Mam rezerwację." },
            { who: "them", en: "Perfect. Your room is on the fifth floor.", pl: "Świetnie. Pana pokój jest na piątym piętrze." },
            { who: "you", en: "Is breakfast included?", pl: "Czy śniadanie jest wliczone?" },
            { who: "them", en: "Yes, from seven to ten.", pl: "Tak, od siódmej do dziesiątej." },
            { who: "you", en: "What's the Wi-Fi password?", pl: "Jakie jest hasło do Wi-Fi?" },
          ],
        },
        {
          id: "hotel-2",
          title: "Coś nie działa",
          words: [
            { en: "towel", pl: "ręcznik" },
            { en: "shower", pl: "prysznic" },
            { en: "air conditioning", pl: "klimatyzacja" },
            { en: "noisy", pl: "głośny" },
            { en: "broken", pl: "zepsuty" },
            { en: "hot water", pl: "ciepła woda" },
          ],
          phrases: [
            { en: "The air conditioning doesn't work.", pl: "Klimatyzacja nie działa.", alt: ["The air conditioning does not work."] },
            { en: "There's no hot water.", pl: "Nie ma ciepłej wody.", alt: ["There is no hot water."] },
            { en: "Can I have more towels?", pl: "Mogę dostać więcej ręczników?" },
            { en: "My room is very noisy.", pl: "Mój pokój jest bardzo głośny." },
            { en: "Can I change rooms?", pl: "Mogę zmienić pokój?" },
          ],
          dialog: [
            { who: "you", en: "The air conditioning doesn't work.", pl: "Klimatyzacja nie działa." },
            { who: "them", en: "Oh no. Did you try the remote?", pl: "Ojej. Próbował pan pilotem?" },
            { who: "you", en: "My room is very noisy.", pl: "Mój pokój jest bardzo głośny." },
            { who: "them", en: "Yes, there's a wedding downstairs. Until 3 a.m.", pl: "Tak, na dole jest wesele. Do trzeciej w nocy." },
            { who: "you", en: "Can I change rooms?", pl: "Mogę zmienić pokój?" },
          ],
        },
        {
          id: "hotel-3",
          title: "Wymeldowanie",
          words: [
            { en: "check out", pl: "wymeldować się" },
            { en: "bill", pl: "rachunek" },
            { en: "taxi", pl: "taksówka" },
            { en: "leave", pl: "zostawić / wyjechać" },
            { en: "late", pl: "późno" },
            { en: "minibar", pl: "minibarek" },
          ],
          phrases: [
            { en: "I'd like to check out.", pl: "Chciałbym się wymeldować.", alt: ["I would like to check out."] },
            { en: "Can I leave my bags here?", pl: "Mogę tu zostawić bagaże?" },
            { en: "Can I have a late checkout?", pl: "Mogę wymeldować się później?" },
            { en: "I didn't use the minibar.", pl: "Nie korzystałem z minibarku.", alt: ["I did not use the minibar."] },
            { en: "Can you call a taxi for me?", pl: "Może pan zamówić mi taksówkę?" },
          ],
          dialog: [
            { who: "you", en: "I'd like to check out.", pl: "Chciałbym się wymeldować." },
            { who: "them", en: "Sure. Did you use the minibar?", pl: "Oczywiście. Korzystał pan z minibarku?" },
            { who: "you", en: "I didn't use the minibar.", pl: "Nie korzystałem z minibarku." },
            { who: "them", en: "Hmm, the system says six chocolates.", pl: "Hmm, system mówi, że sześć czekoladek." },
            { who: "you", en: "Can you call a taxi for me?", pl: "Może pan zamówić mi taksówkę?" },
          ],
        },
      ],
    },
    {
      id: "food",
      emoji: "☕",
      title: "Kawiarnia i restauracja",
      description: "Zamów kawę, stolik, danie i poproś o rachunek.",
      lessons: [
        {
          id: "food-1",
          title: "Kawa na wynos",
          words: [
            { en: "coffee", pl: "kawa" },
            { en: "milk", pl: "mleko" },
            { en: "sugar", pl: "cukier" },
            { en: "small", pl: "mały" },
            { en: "large", pl: "duży" },
            { en: "to go", pl: "na wynos" },
          ],
          phrases: [
            { en: "Can I get a coffee, please?", pl: "Poproszę kawę.", alt: ["Can I have a coffee, please?"] },
            { en: "A large latte to go, please.", pl: "Duże latte na wynos, proszę." },
            { en: "With milk, no sugar.", pl: "Z mlekiem, bez cukru." },
            { en: "For here, please.", pl: "Na miejscu, proszę." },
            { en: "How much is it?", pl: "Ile to kosztuje?" },
          ],
          dialog: [
            { who: "them", en: "Hi there! What can I get you?", pl: "Cześć! Co podać?" },
            { who: "you", en: "A large latte to go, please.", pl: "Duże latte na wynos, proszę." },
            { who: "them", en: "Sure. Can I get a name for the cup?", pl: "Jasne. Jakie imię napisać na kubku?" },
            { who: "you", en: "Tom.", pl: "Tom." },
            { who: "them", en: "Perfect, Tim!", pl: "Super, Tim!" },
            { who: "you", en: "How much is it?", pl: "Ile to kosztuje?" },
          ],
        },
        {
          id: "food-2",
          title: "Stolik i zamówienie",
          words: [
            { en: "table", pl: "stolik" },
            { en: "menu", pl: "menu / karta" },
            { en: "chicken", pl: "kurczak" },
            { en: "vegetarian", pl: "wegetariański" },
            { en: "spicy", pl: "ostry" },
            { en: "recommend", pl: "polecać" },
          ],
          phrases: [
            { en: "A table for two, please.", pl: "Stolik dla dwóch osób, proszę." },
            { en: "Can I see the menu?", pl: "Mogę zobaczyć menu?" },
            { en: "What do you recommend?", pl: "Co pan poleca?" },
            { en: "I'll have the chicken.", pl: "Wezmę kurczaka.", alt: ["I will have the chicken."] },
            { en: "Is it spicy?", pl: "Czy to jest ostre?" },
          ],
          dialog: [
            { who: "you", en: "A table for two, please.", pl: "Stolik dla dwóch osób, proszę." },
            { who: "them", en: "Of course. Here's the menu.", pl: "Oczywiście. Proszę, oto menu." },
            { who: "you", en: "What do you recommend?", pl: "Co pan poleca?" },
            { who: "them", en: "The chicken curry. It's our best dish.", pl: "Kurczaka curry. To nasze najlepsze danie." },
            { who: "you", en: "Is it spicy?", pl: "Czy to jest ostre?" },
            { who: "them", en: "Only a little. Maybe a lot. Depends on the chef's mood.", pl: "Tylko trochę. Może bardzo. Zależy od humoru kucharza." },
          ],
        },
        {
          id: "food-3",
          title: "Rachunek, proszę",
          words: [
            { en: "check", pl: "rachunek (USA)" },
            { en: "card", pl: "karta" },
            { en: "cash", pl: "gotówka" },
            { en: "tip", pl: "napiwek" },
            { en: "delicious", pl: "pyszny" },
            { en: "together", pl: "razem" },
          ],
          phrases: [
            { en: "Can we have the bill, please?", pl: "Możemy prosić rachunek?", alt: ["Could we have the bill, please?", "Can we have the check, please?"] },
            { en: "Can I pay by card?", pl: "Mogę zapłacić kartą?" },
            { en: "We'll pay separately.", pl: "Zapłacimy osobno.", alt: ["We will pay separately."] },
            { en: "It was delicious.", pl: "Było pyszne." },
            { en: "Keep the change.", pl: "Reszty nie trzeba." },
          ],
          dialog: [
            { who: "you", en: "Can we have the bill, please?", pl: "Możemy prosić rachunek?" },
            { who: "them", en: "Sure. Together or separately?", pl: "Jasne. Razem czy osobno?" },
            { who: "you", en: "We'll pay separately.", pl: "Zapłacimy osobno." },
            { who: "them", en: "How was everything?", pl: "Jak smakowało?" },
            { who: "you", en: "It was delicious.", pl: "Było pyszne." },
          ],
        },
      ],
    },
    {
      id: "shop",
      emoji: "🛒",
      title: "Sklep i zakupy",
      description: "Supermarket, ubrania, przymierzalnia i zwroty.",
      lessons: [
        {
          id: "shop-1",
          title: "W supermarkecie",
          words: [
            { en: "bread", pl: "chleb" },
            { en: "eggs", pl: "jajka" },
            { en: "cheese", pl: "ser" },
            { en: "bag", pl: "torba / reklamówka" },
            { en: "aisle", pl: "alejka" },
            { en: "receipt", pl: "paragon" },
          ],
          phrases: [
            { en: "Excuse me, where can I find eggs?", pl: "Przepraszam, gdzie znajdę jajka?" },
            { en: "Do you have fresh bread?", pl: "Czy macie świeży chleb?" },
            { en: "Do you need a bag?", pl: "Potrzebuje pan torby?" },
            { en: "No, thanks, I have one.", pl: "Nie, dzięki, mam swoją." },
            { en: "Can I have the receipt?", pl: "Mogę prosić paragon?" },
          ],
          dialog: [
            { who: "you", en: "Excuse me, where can I find eggs?", pl: "Przepraszam, gdzie znajdę jajka?" },
            { who: "them", en: "Aisle five, next to the cheese.", pl: "Alejka piąta, obok sera." },
            { who: "them", en: "Do you need a bag?", pl: "Potrzebuje pan torby?" },
            { who: "you", en: "No, thanks, I have one.", pl: "Nie, dzięki, mam swoją." },
          ],
        },
        {
          id: "shop-2",
          title: "Ubrania i przymierzalnia",
          words: [
            { en: "size", pl: "rozmiar" },
            { en: "shirt", pl: "koszula" },
            { en: "shoes", pl: "buty" },
            { en: "try on", pl: "przymierzyć" },
            { en: "fitting room", pl: "przymierzalnia" },
            { en: "too small", pl: "za mały" },
          ],
          phrases: [
            { en: "Can I try this on?", pl: "Mogę to przymierzyć?" },
            { en: "Where is the fitting room?", pl: "Gdzie jest przymierzalnia?" },
            { en: "Do you have this in a bigger size?", pl: "Macie to w większym rozmiarze?" },
            { en: "It's too small.", pl: "Jest za mały.", alt: ["It is too small."] },
            { en: "I'm just looking, thanks.", pl: "Tylko się rozglądam, dzięki.", alt: ["I am just looking, thanks."] },
          ],
          dialog: [
            { who: "them", en: "Hi! Can I help you?", pl: "Cześć! Mogę w czymś pomóc?" },
            { who: "you", en: "I'm just looking, thanks.", pl: "Tylko się rozglądam, dzięki." },
            { who: "you", en: "Can I try this on?", pl: "Mogę to przymierzyć?" },
            { who: "them", en: "Sure, the fitting room is over there.", pl: "Jasne, przymierzalnia jest tam." },
            { who: "you", en: "Do you have this in a bigger size?", pl: "Macie to w większym rozmiarze?" },
          ],
        },
        {
          id: "shop-3",
          title: "Płacenie i zwrot",
          words: [
            { en: "price", pl: "cena" },
            { en: "expensive", pl: "drogi" },
            { en: "cheap", pl: "tani" },
            { en: "discount", pl: "zniżka" },
            { en: "return", pl: "zwrócić" },
            { en: "refund", pl: "zwrot pieniędzy" },
          ],
          phrases: [
            { en: "How much does this cost?", pl: "Ile to kosztuje?" },
            { en: "That's too expensive.", pl: "To za drogie.", alt: ["That is too expensive."] },
            { en: "Is there a discount?", pl: "Czy jest jakaś zniżka?" },
            { en: "I'd like to return this.", pl: "Chciałbym to zwrócić.", alt: ["I would like to return this."] },
            { en: "Can I get a refund?", pl: "Mogę dostać zwrot pieniędzy?" },
          ],
          dialog: [
            { who: "you", en: "I'd like to return this.", pl: "Chciałbym to zwrócić." },
            { who: "them", en: "Okay. What's wrong with it?", pl: "Dobrze. Co jest nie tak?" },
            { who: "you", en: "It's too small.", pl: "Jest za mały." },
            { who: "them", en: "Do you have the receipt?", pl: "Ma pan paragon?" },
            { who: "you", en: "Can I get a refund?", pl: "Mogę dostać zwrot pieniędzy?" },
          ],
        },
      ],
    },
    {
      id: "city",
      emoji: "🚕",
      title: "Miasto i transport",
      description: "Zapytaj o drogę, złap taksówkę, kup bilet na metro.",
      lessons: [
        {
          id: "city-1",
          title: "Jak dojść do…?",
          words: [
            { en: "left", pl: "w lewo" },
            { en: "right", pl: "w prawo" },
            { en: "straight", pl: "prosto" },
            { en: "near", pl: "blisko" },
            { en: "far", pl: "daleko" },
            { en: "street", pl: "ulica" },
          ],
          phrases: [
            { en: "How do I get to the station?", pl: "Jak dojść do dworca?" },
            { en: "Is it far from here?", pl: "Czy to daleko stąd?" },
            { en: "Go straight and turn left.", pl: "Idź prosto i skręć w lewo." },
            { en: "It's on the right.", pl: "Jest po prawej.", alt: ["It is on the right."] },
            { en: "Can you show me on the map?", pl: "Możesz mi pokazać na mapie?" },
          ],
          dialog: [
            { who: "you", en: "How do I get to the station?", pl: "Jak dojść do dworca?" },
            { who: "them", en: "Go straight and turn left at the bank.", pl: "Idź prosto i skręć w lewo przy banku." },
            { who: "you", en: "Is it far from here?", pl: "Czy to daleko stąd?" },
            { who: "them", en: "Ten minutes. Five if you run.", pl: "Dziesięć minut. Pięć, jeśli pobiegniesz." },
          ],
        },
        {
          id: "city-2",
          title: "Taksówka",
          words: [
            { en: "driver", pl: "kierowca" },
            { en: "airport", pl: "lotnisko" },
            { en: "stop", pl: "zatrzymać się" },
            { en: "hurry", pl: "pośpiech / spieszyć się" },
            { en: "traffic", pl: "korek / ruch uliczny" },
            { en: "minutes", pl: "minuty" },
          ],
          phrases: [
            { en: "To the airport, please.", pl: "Na lotnisko, proszę." },
            { en: "How long does it take?", pl: "Ile to zajmie?" },
            { en: "I'm in a hurry.", pl: "Spieszę się.", alt: ["I am in a hurry."] },
            { en: "Can you stop here, please?", pl: "Może się pan tu zatrzymać?" },
            { en: "Is there a lot of traffic?", pl: "Czy są duże korki?" },
          ],
          dialog: [
            { who: "them", en: "Where to?", pl: "Dokąd?" },
            { who: "you", en: "To the airport, please.", pl: "Na lotnisko, proszę." },
            { who: "you", en: "How long does it take?", pl: "Ile to zajmie?" },
            { who: "them", en: "Twenty minutes, without traffic. So… one hour.", pl: "Dwadzieścia minut bez korków. Czyli… godzinę." },
            { who: "you", en: "I'm in a hurry.", pl: "Spieszę się." },
          ],
        },
        {
          id: "city-3",
          title: "Metro i bilety",
          words: [
            { en: "subway", pl: "metro (USA)" },
            { en: "single ticket", pl: "bilet jednorazowy" },
            { en: "return ticket", pl: "bilet powrotny" },
            { en: "platform", pl: "peron" },
            { en: "line", pl: "linia" },
            { en: "change", pl: "przesiąść się" },
          ],
          phrases: [
            { en: "One single ticket, please.", pl: "Jeden bilet jednorazowy, proszę." },
            { en: "Which line goes to the center?", pl: "Która linia jedzie do centrum?" },
            { en: "Do I need to change?", pl: "Czy muszę się przesiadać?" },
            { en: "Which platform is it?", pl: "Który to peron?" },
            { en: "Is this the right train?", pl: "Czy to dobry pociąg?" },
          ],
          dialog: [
            { who: "you", en: "One single ticket, please.", pl: "Jeden bilet jednorazowy, proszę." },
            { who: "them", en: "Here you go. Where are you going?", pl: "Proszę. Dokąd pan jedzie?" },
            { who: "you", en: "Which line goes to the center?", pl: "Która linia jedzie do centrum?" },
            { who: "them", en: "The red line, platform two.", pl: "Czerwona linia, peron drugi." },
            { who: "you", en: "Do I need to change?", pl: "Czy muszę się przesiadać?" },
          ],
        },
      ],
    },
    {
      id: "health",
      emoji: "💊",
      title: "Zdrowie",
      description: "Apteka, lekarz i sytuacje awaryjne – lepiej znać, niż potrzebować.",
      lessons: [
        {
          id: "health-1",
          title: "W aptece",
          words: [
            { en: "headache", pl: "ból głowy" },
            { en: "cold", pl: "przeziębienie" },
            { en: "medicine", pl: "lek" },
            { en: "painkiller", pl: "środek przeciwbólowy" },
            { en: "cough", pl: "kaszel" },
            { en: "allergic", pl: "uczulony" },
          ],
          phrases: [
            { en: "I have a headache.", pl: "Boli mnie głowa." },
            { en: "Do you have something for a cold?", pl: "Macie coś na przeziębienie?" },
            { en: "How many times a day?", pl: "Ile razy dziennie?" },
            { en: "I'm allergic to penicillin.", pl: "Jestem uczulony na penicylinę.", alt: ["I am allergic to penicillin."] },
            { en: "Do I need a prescription?", pl: "Czy potrzebuję recepty?" },
          ],
          dialog: [
            { who: "them", en: "Hello, how can I help?", pl: "Dzień dobry, w czym pomóc?" },
            { who: "you", en: "Do you have something for a cold?", pl: "Macie coś na przeziębienie?" },
            { who: "them", en: "Yes, these tablets work well.", pl: "Tak, te tabletki dobrze działają." },
            { who: "you", en: "How many times a day?", pl: "Ile razy dziennie?" },
            { who: "them", en: "Three times a day, after food.", pl: "Trzy razy dziennie, po jedzeniu." },
          ],
        },
        {
          id: "health-2",
          title: "U lekarza",
          words: [
            { en: "doctor", pl: "lekarz" },
            { en: "appointment", pl: "wizyta" },
            { en: "fever", pl: "gorączka" },
            { en: "stomach", pl: "brzuch / żołądek" },
            { en: "hurt", pl: "boleć" },
            { en: "since", pl: "od (czasu)" },
          ],
          phrases: [
            { en: "I need to see a doctor.", pl: "Muszę iść do lekarza." },
            { en: "I have a fever.", pl: "Mam gorączkę." },
            { en: "My stomach hurts.", pl: "Boli mnie brzuch." },
            { en: "Since yesterday.", pl: "Od wczoraj." },
            { en: "Can I make an appointment?", pl: "Mogę umówić wizytę?" },
          ],
          dialog: [
            { who: "them", en: "What seems to be the problem?", pl: "Co panu dolega?" },
            { who: "you", en: "My stomach hurts.", pl: "Boli mnie brzuch." },
            { who: "them", en: "Since when?", pl: "Od kiedy?" },
            { who: "you", en: "Since yesterday.", pl: "Od wczoraj." },
            { who: "them", en: "Did you eat anything strange?", pl: "Jadł pan coś dziwnego?" },
            { who: "you", en: "I have a fever.", pl: "Mam gorączkę." },
          ],
        },
        {
          id: "health-3",
          title: "Pomocy!",
          words: [
            { en: "help", pl: "pomoc / pomocy" },
            { en: "police", pl: "policja" },
            { en: "ambulance", pl: "karetka" },
            { en: "stolen", pl: "skradziony" },
            { en: "wallet", pl: "portfel" },
            { en: "emergency", pl: "nagły wypadek" },
          ],
          phrases: [
            { en: "Please call an ambulance!", pl: "Proszę wezwać karetkę!" },
            { en: "My wallet was stolen.", pl: "Ukradziono mi portfel." },
            { en: "Where is the police station?", pl: "Gdzie jest komisariat?" },
            { en: "It's an emergency.", pl: "To nagły wypadek.", alt: ["It is an emergency."] },
            { en: "Can you help me, please?", pl: "Może mi pan pomóc?" },
          ],
          dialog: [
            { who: "you", en: "Can you help me, please?", pl: "Może mi pan pomóc?" },
            { who: "them", en: "Sure, what happened?", pl: "Jasne, co się stało?" },
            { who: "you", en: "My wallet was stolen.", pl: "Ukradziono mi portfel." },
            { who: "them", en: "Oh no. The police station is around the corner.", pl: "O nie. Komisariat jest za rogiem." },
          ],
        },
      ],
    },
    {
      id: "smalltalk",
      emoji: "💬",
      title: "Small talk",
      description: "Pogoda, praca, weekend, plany – rozmowy, które otwierają drzwi.",
      lessons: [
        {
          id: "smalltalk-1",
          title: "Pogoda i weekend",
          words: [
            { en: "weather", pl: "pogoda" },
            { en: "sunny", pl: "słonecznie" },
            { en: "rain", pl: "deszcz" },
            { en: "weekend", pl: "weekend" },
            { en: "beach", pl: "plaża" },
            { en: "relax", pl: "odpoczywać" },
          ],
          phrases: [
            { en: "Nice weather today, isn't it?", pl: "Ładna dziś pogoda, prawda?" },
            { en: "It's going to rain.", pl: "Będzie padać.", alt: ["It is going to rain."] },
            { en: "How was your weekend?", pl: "Jak minął weekend?" },
            { en: "I went to the beach.", pl: "Byłem na plaży." },
            { en: "I just relaxed at home.", pl: "Po prostu odpoczywałem w domu." },
          ],
          dialog: [
            { who: "them", en: "Nice weather today, isn't it?", pl: "Ładna dziś pogoda, prawda?" },
            { who: "you", en: "Yes! How was your weekend?", pl: "Tak! Jak minął weekend?" },
            { who: "them", en: "Great, I went hiking. And you?", pl: "Super, chodziłam po górach. A ty?" },
            { who: "you", en: "I just relaxed at home.", pl: "Po prostu odpoczywałem w domu." },
          ],
        },
        {
          id: "smalltalk-2",
          title: "Praca i hobby",
          words: [
            { en: "job", pl: "praca" },
            { en: "work", pl: "pracować" },
            { en: "company", pl: "firma" },
            { en: "hobby", pl: "hobby" },
            { en: "free time", pl: "czas wolny" },
            { en: "cooking", pl: "gotowanie" },
          ],
          phrases: [
            { en: "What do you do?", pl: "Czym się zajmujesz?" },
            { en: "I work in marketing.", pl: "Pracuję w marketingu." },
            { en: "What do you do in your free time?", pl: "Co robisz w wolnym czasie?" },
            { en: "I like cooking and traveling.", pl: "Lubię gotować i podróżować.", alt: ["I like cooking and travelling."] },
            { en: "That sounds interesting.", pl: "To brzmi ciekawie." },
          ],
          dialog: [
            { who: "them", en: "So, what do you do?", pl: "To czym się zajmujesz?" },
            { who: "you", en: "I work in marketing.", pl: "Pracuję w marketingu." },
            { who: "them", en: "Nice! And in your free time?", pl: "Fajnie! A w wolnym czasie?" },
            { who: "you", en: "I like cooking and traveling.", pl: "Lubię gotować i podróżować." },
            { who: "them", en: "Me too! Mostly eating, not cooking.", pl: "Ja też! Głównie jedzenie, nie gotowanie." },
          ],
        },
        {
          id: "smalltalk-3",
          title: "Plany i zaproszenia",
          words: [
            { en: "tonight", pl: "dziś wieczorem" },
            { en: "tomorrow", pl: "jutro" },
            { en: "free", pl: "wolny" },
            { en: "join", pl: "dołączyć" },
            { en: "maybe", pl: "może" },
            { en: "sounds good", pl: "brzmi dobrze" },
          ],
          phrases: [
            { en: "Are you free tonight?", pl: "Masz wolny wieczór?" },
            { en: "Do you want to join us?", pl: "Chcesz do nas dołączyć?" },
            { en: "Sounds good!", pl: "Brzmi dobrze!" },
            { en: "Maybe next time.", pl: "Może następnym razem." },
            { en: "What time should we meet?", pl: "O której się spotkamy?" },
          ],
          dialog: [
            { who: "them", en: "Are you free tonight?", pl: "Masz wolny wieczór?" },
            { who: "you", en: "Yes, why?", pl: "Tak, czemu?" },
            { who: "them", en: "We're going for pizza. Do you want to join us?", pl: "Idziemy na pizzę. Chcesz dołączyć?" },
            { who: "you", en: "Sounds good!", pl: "Brzmi dobrze!" },
            { who: "you", en: "What time should we meet?", pl: "O której się spotkamy?" },
          ],
        },
      ],
    },
  ],
};

// ---------- Poziomy ----------
// Każdy poziom ma te same tematy (rozdziały), ale inne sytuacje i trudniejszy język.

export const LEVELS = [
  { id: "A", code: "A1–A2", name: "Początkujący", emoji: "🌱", course: COURSE },
  { id: "B", code: "B1–B2", name: "Średni", emoji: "🌿", course: COURSE_B1 },
  { id: "C", code: "C1", name: "Zaawansowany", emoji: "🌳", course: COURSE_C1 },
];

export function levelInfo(levelId) {
  return LEVELS.find((l) => l.id === levelId) || LEVELS[0];
}

export function courseFor(levelId) {
  return levelInfo(levelId).course;
}

export function levelOfLesson(lessonId) {
  if (lessonId.startsWith("b1-")) return "B";
  if (lessonId.startsWith("c1-")) return "C";
  return "A";
}

// id rozdziału (tematu) niezależnie od poziomu, np. "c1-airport-2" → "airport"
export function chapterOf(lessonId) {
  return lessonId.replace(/^(b1|c1)-/, "").split("-")[0];
}

// Pomocnicze: płaska lista lekcji w kolejności kursu
export function allLessons(course = COURSE) {
  return course.chapters.flatMap((ch) => ch.lessons.map((l) => ({ ...l, chapterId: ch.id })));
}

// Szuka lekcji na wszystkich poziomach
export function findLesson(id) {
  for (const lvl of LEVELS) {
    for (const ch of lvl.course.chapters) {
      const lesson = ch.lessons.find((l) => l.id === id);
      if (lesson) return { chapter: ch, lesson, level: lvl };
    }
  }
  return null;
}
