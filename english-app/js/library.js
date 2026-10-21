// Wbudowana biblioteka scenek wideo. Filmy NIE są kopiowane – aplikacja tylko osadza oficjalny
// odtwarzacz YouTube (podgląd), tak jak robi to każda strona z filmem z YouTube.
// Każdy film jest przypisany do lekcji, więc aplikacja podsuwa go wtedy, gdy przerabiasz dany temat.
//
// src: "voa" – VOA Learning English (domena publiczna, rząd USA)
//      "bbc" – BBC Learning English
//      "yt"  – kanały edukacyjne na YouTube
// short: true – pionowy film (YouTube Shorts)

export const LIBRARY = [
  // 👋 Pierwsze kroki
  { id: "XBxz8_Ri8-Y", lesson: "basics-1", title: "Introducing Yourself in English and Meeting New People", src: "yt" },
  { id: "hCon8Uq_Bas", lesson: "basics-1", title: "Learn How to Talk About Yourself in English", src: "yt" },
  { id: "heycg7D5VZw", lesson: "basics-1", title: "Let's Learn English – Lesson 1: Welcome!", src: "voa" },
  { id: "quJ8dlyxWIk", lesson: "basics-2", title: "Let's Learn English – Lesson 1: Speaking Practice", src: "voa" },
  { id: "mXcVe4sQ0yc", lesson: "basics-2", title: "How to Introduce Yourself in English", src: "yt" },

  // ✈️ Lotnisko
  { id: "Owkvl_TNRqU", lesson: "airport-1", title: "Check In At The Airport Conversation", src: "yt" },
  { id: "aXwFBsIk7dw", lesson: "airport-1", title: "Easy English at the Airport", src: "yt" },
  { id: "DXx0C-4G338", lesson: "airport-1", title: "Airport Check-In – English Conversation Practice", src: "yt", short: true },
  { id: "dgRN_5lHIMA", lesson: "airport-1", title: "Airport Check-in Conversation in English", src: "yt", short: true },
  { id: "LMJUjYxqTZ4", lesson: "airport-2", title: "All Airport English Dialogues in One Video", src: "yt" },
  { id: "x4EPq4omFNI", lesson: "airport-2", title: "Flight Delayed, Gate Changed, Luggage Lost", src: "yt" },
  { id: "nyhYxZwJjTs", lesson: "airport-3", title: "Airport English Conversation: Lost Suitcase Dialogue", src: "yt" },
  { id: "M7HsVGR65rs", lesson: "airport-3", title: "Lost Luggage at the Airport", src: "yt" },
  { id: "f1d6JPEYeuQ", lesson: "airport-3", title: "Lost Luggage at the Airport", src: "yt", short: true },

  // 🏨 Hotel
  { id: "RJYoFjX5MiA", lesson: "hotel-1", title: "English Conversation: Hotel Check-in", src: "yt" },
  { id: "GLgx51zl6Lw", lesson: "hotel-1", title: "Checking In with the Receptionist", src: "yt" },
  { id: "_sNg7zm6J64", lesson: "hotel-1", title: "Hotel Front Desk English Conversation Practice", src: "yt" },
  { id: "Q-Wp5KOnZzI", lesson: "hotel-3", title: "Hotel Check-in & Check-out English Conversation", src: "yt" },
  { id: "Yyvu9J1uPV8", lesson: "hotel-3", title: "Early Check-in & Late Check-out", src: "yt" },

  // ☕ Kawiarnia i restauracja
  { id: "2VeQTuSSiI0", lesson: "food-1", title: "English Conversation at a Café", src: "yt" },
  { id: "tYql4WTRkLU", lesson: "food-1", title: "How to Order Coffee in English at a Coffee Shop", src: "yt" },
  { id: "hS9a9UpkHfA", lesson: "food-1", title: "Ordering Coffee in English – Real Café Conversation", src: "yt", short: true },
  { id: "0gu3MSatfo4", lesson: "food-1", title: "Ordering Drinks and Pastries at a Coffee Shop", src: "yt" },
  { id: "lvw_ht29FXE", lesson: "food-2", title: "At the Restaurant (Ordering Food) – Conversation Practice", src: "yt" },
  { id: "CjzrznCrUTI", lesson: "food-2", title: "At the Restaurant – English Conversation", src: "yt" },
  { id: "i6lTtcrKQDk", lesson: "food-2", title: "Ordering Food in a Restaurant (Dialogue)", src: "yt", short: true },
  { id: "lbFze-78qyw", lesson: "food-3", title: "Ordering Food at a Restaurant", src: "yt" },
  { id: "bBajqbE82Ys", lesson: "food-3", title: "Ordering Coffee & Food in English", src: "yt" },

  // 🛒 Sklep i zakupy
  { id: "WDleCLQKEk0", lesson: "shop-1", title: "Grocery Store – English Conversation", src: "yt" },
  { id: "xA32p3CEt8Y", lesson: "shop-1", title: "At the Supermarket", src: "yt" },
  { id: "MnLSCJdv2XA", lesson: "shop-1", title: "At the Grocery Store – Easy Conversation", src: "yt", short: true },
  { id: "JsxtUOesbFE", lesson: "shop-2", title: "English Conversation: Shopping for Clothes", src: "yt" },
  { id: "lgDJn9ywo8I", lesson: "shop-2", title: "Clothes Shopping English Conversation", src: "yt" },
  { id: "IqEiAQACWIY", lesson: "shop-2", title: "Shopping for Clothes in English", src: "yt" },
  { id: "ad8a2BiXulw", lesson: "shop-3", title: "Shopping for Clothes", src: "yt" },

  // 🚕 Miasto i transport
  { id: "w6uq2exFfg0", lesson: "city-1", title: "Asking for and Giving Directions", src: "yt" },
  { id: "nLqJOBnkNrQ", lesson: "city-1", title: "Asking for Directions in English", src: "yt" },
  { id: "hxOPLsQ1J0k", lesson: "city-1", title: "Asking for Directions to the Bank", src: "yt" },
  { id: "74T4ZeALAiI", lesson: "city-2", title: "Taking a Taxi", src: "yt" },
  { id: "MQkDIvO-2Gk", lesson: "city-2", title: "Taxi to the Airport", src: "yt" },
  { id: "NjFWtg0CBdM", lesson: "city-2", title: "Small Talk in a Taxi", src: "yt" },
  { id: "sM1mWWY75n0", lesson: "city-3", title: "Metro English Conversation", src: "yt" },
  { id: "PHkIfzx5pXw", lesson: "city-3", title: "English Conversation: At the Train Station", src: "yt" },
  { id: "AEuSQWQhiHc", lesson: "city-3", title: "Buying a Train Ticket", src: "yt", short: true },

  // 💊 Zdrowie
  { id: "UdakI1zk0xE", lesson: "health-1", title: "At the Pharmacy – Everyday English Conversation", src: "yt" },
  { id: "ma8Yd25t1fE", lesson: "health-1", title: "English Conversation at the Pharmacy", src: "yt" },
  { id: "G7DJacWF2Eg", lesson: "health-2", title: "English Conversation at the Doctor (A1–A2)", src: "yt" },
  { id: "Zk1L0m67pfU", lesson: "health-2", title: "At the Doctor's Office – Easy Conversation Practice", src: "yt" },
  { id: "55DUJfo2O1I", lesson: "health-3", title: "Reporting a Lost Wallet at the Police Station (A1–A2)", src: "yt" },
  { id: "ZHUGCS7lRw4", lesson: "health-3", title: "Reporting a Stolen Bag: Police Officer and a Traveller", src: "yt" },
  { id: "4z_TK18v2u8", lesson: "health-3", title: "Let's Learn English – Lesson 43: Time for Plan B", src: "voa" },

  // 💬 Small talk
  { id: "lLzxBcjbXBw", lesson: "smalltalk-1", title: "Small Talk with a Friend – 5-Minute Practice", src: "yt" },
  { id: "tjIAu3L5Rrc", lesson: "smalltalk-1", title: "Asking about Weekend Plans", src: "yt" },
  { id: "lrTRNbC3BDQ", lesson: "smalltalk-1", title: "Talking about Weekend Plans – Real Easy English", src: "yt" },
  { id: "yTMPRRmv-kU", lesson: "smalltalk-2", title: "100 Everyday Phrases for Small Talk (A2–B1)", src: "yt" },
  { id: "KWmi_v6XgAo", lesson: "smalltalk-2", title: "How to Make Fantastic Small Talk", src: "yt" },
  { id: "B-7waURX8Xc", lesson: "smalltalk-2", title: "Learn Real English with Street Interviews", src: "yt" },
  { id: "3GNvELF0zNY", lesson: "smalltalk-3", title: "Making and Responding to Plans in English", src: "yt" },
  { id: "D_yasSFDjyw", lesson: "smalltalk-3", title: "Weekend Plans Conversation in Simple English", src: "yt", short: true },
];

// Seriale – dłuższe historie z tymi samymi bohaterami, gdy masz ochotę na więcej
export const SERIES = [
  {
    name: "Let's Learn English (VOA)",
    note: "Anna przeprowadza się do Waszyngtonu. Proste scenki z życia, domena publiczna.",
    episodes: [
      { id: "heycg7D5VZw", title: "Lesson 1: Welcome!" },
      { id: "quJ8dlyxWIk", title: "Lesson 1: Speaking Practice" },
      { id: "GpiXMzf3FvY", title: "Lesson 33: Learning America's Sport" },
      { id: "4z_TK18v2u8", title: "Lesson 43: Time for Plan B" },
    ],
  },
  {
    name: "English at Work (BBC)",
    note: "Animowany serial o Annie w nowej pracy. Angielski w biurze, z humorem.",
    episodes: [
      { id: "Aj-EnsvU5Q0", title: "Zapowiedź serii" },
      { id: "5b5zdQFVIII", title: "Episode 01: The Interview" },
      { id: "PyL2HDKwR9E", title: "Box set: odcinki 0–5" },
    ],
  },
];

export const SRC_LABEL = { voa: "VOA · domena publiczna", bbc: "BBC Learning English", yt: "YouTube" };

// Pytania do oglądania – pasują do tematu rozdziału (do każdego filmu z tego rozdziału)
export const CHAPTER_TASKS = {
  basics: [
    { q: "How do the people say hello?", hint_pl: "Jak ludzie się witają?" },
    { q: "Introduce yourself like in the video.", hint_pl: "Przedstaw się tak jak w filmie." },
    { q: "Where are you from? Where do you live?", hint_pl: "Skąd jesteś? Gdzie mieszkasz?" },
  ],
  airport: [
    { q: "What does the airport staff ask the passenger?", hint_pl: "O co pracownik lotniska pyta pasażera?" },
    { q: "Repeat one question from the video.", hint_pl: "Powtórz jedno pytanie z filmu." },
    { q: "You are at the check-in desk. What do you say?", hint_pl: "Jesteś przy odprawie. Co mówisz?" },
  ],
  hotel: [
    { q: "What does the guest need?", hint_pl: "Czego potrzebuje gość?" },
    { q: "Repeat what the receptionist says.", hint_pl: "Powtórz, co mówi recepcjonista." },
    { q: "Ask about breakfast and Wi-Fi.", hint_pl: "Zapytaj o śniadanie i Wi-Fi." },
  ],
  food: [
    { q: "What does the customer order?", hint_pl: "Co zamawia klient?" },
    { q: "Order your favourite drink or meal.", hint_pl: "Zamów swój ulubiony napój lub danie." },
    { q: "Ask for the bill.", hint_pl: "Poproś o rachunek." },
  ],
  shop: [
    { q: "What is the customer looking for?", hint_pl: "Czego szuka klient?" },
    { q: "Ask for a different size.", hint_pl: "Poproś o inny rozmiar." },
    { q: "Ask how much something costs.", hint_pl: "Zapytaj, ile coś kosztuje." },
  ],
  city: [
    { q: "Where does the person want to go?", hint_pl: "Dokąd chce dojść/dojechać ta osoba?" },
    { q: "Repeat the directions from the video.", hint_pl: "Powtórz wskazówki z filmu." },
    { q: "Ask how to get to the station.", hint_pl: "Zapytaj, jak dojść do dworca." },
  ],
  health: [
    { q: "What is the problem?", hint_pl: "Jaki jest problem?" },
    { q: "Describe how you feel when you have a cold.", hint_pl: "Opisz, jak się czujesz, gdy masz przeziębienie." },
    { q: "Ask for help in English.", hint_pl: "Poproś o pomoc po angielsku." },
  ],
  smalltalk: [
    { q: "What do the people talk about?", hint_pl: "O czym rozmawiają?" },
    { q: "What did you do last weekend?", hint_pl: "Co robiłeś w ostatni weekend?" },
    { q: "Invite a friend for pizza tonight.", hint_pl: "Zaproś znajomego na pizzę dziś wieczorem." },
  ],
};

export const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
