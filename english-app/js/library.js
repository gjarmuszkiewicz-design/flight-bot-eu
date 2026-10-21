// Wbudowana biblioteka scenek wideo. Filmy NIE są kopiowane – aplikacja tylko osadza oficjalny
// odtwarzacz YouTube (podgląd), tak jak robi to każda strona z filmem z YouTube.
// Każdy film jest przypisany do lekcji, więc aplikacja podsuwa go wtedy, gdy przerabiasz dany temat.
//
// src: "voa" – VOA Learning English (domena publiczna, rząd USA)
//      "bbc" – BBC Learning English
//      "yt"  – kanały edukacyjne na YouTube
// short: true – pionowy film (YouTube Shorts)

// type: "dialog" – scenka/rozmowa dwóch osób, "lesson" – nauczyciel tłumaczy zwroty
// desc: krótki opis po polsku, wyświetlany przy wyborze filmu po lekcji
export const LIBRARY = [
  // 👋 Pierwsze kroki
  { id: "XBxz8_Ri8-Y", lesson: "basics-1", type: "lesson", title: "Introducing Yourself in English and Meeting New People", desc: "Co powiedzieć o sobie, gdy poznajesz nowych ludzi.", src: "yt" },
  { id: "hCon8Uq_Bas", lesson: "basics-1", type: "lesson", title: "Learn How to Talk About Yourself in English", desc: "Jak opowiedzieć o sobie – kim jesteś, czym się zajmujesz.", src: "yt" },
  { id: "mXcVe4sQ0yc", lesson: "basics-1", type: "lesson", title: "How to Introduce Yourself in English", desc: "Najprostsze zwroty do przedstawienia się.", src: "yt" },
  { id: "heycg7D5VZw", lesson: "basics-1", type: "dialog", title: "Let's Learn English – Lesson 1: Welcome!", desc: "Anna przeprowadza się do Waszyngtonu i poznaje nowych ludzi.", src: "voa" },

  { id: "IDmXW50yyas", lesson: "basics-2", type: "lesson", title: "How to Say Where You're From in English (A1)", desc: "Jak powiedzieć, skąd jesteś – poziom dla początkujących.", src: "yt" },
  { id: "LviuW-6sXtQ", lesson: "basics-2", type: "lesson", title: "Where Are You From?", desc: "Pytanie „Where are you from?” i różne odpowiedzi.", src: "yt" },
  { id: "qlYyNJ0K3pY", lesson: "basics-2", type: "lesson", title: "Where Are You From? Common Conversation Starter", desc: "Jak tym pytaniem zacząć rozmowę z nieznajomym.", src: "yt" },
  { id: "quJ8dlyxWIk", lesson: "basics-2", type: "dialog", title: "Let's Learn English – Lesson 1: Speaking Practice", desc: "ćwiczenie wymowy – powtarzasz zdania za lektorem.", src: "voa" },

  { id: "_6hZqkzAgfY", lesson: "basics-3", type: "lesson", title: "3 Polite Ways to Say “I Don't Understand”", desc: "Trzy uprzejme sposoby, żeby powiedzieć, że nie rozumiesz.", src: "yt" },
  { id: "uLRU_09D1AQ", lesson: "basics-3", type: "lesson", title: "10 Ways to Say “I Don't Understand” in English", desc: "Dziesięć zwrotów na „nie rozumiem” i „możesz powtórzyć?”.", src: "yt" },
  { id: "ZLqJcGVFWQo", lesson: "basics-3", type: "lesson", title: "What to Do When You Don't Understand in English", desc: "Co robić, gdy zgubisz się w rozmowie – bez paniki.", src: "yt" },
  { id: "vjaU4aKHvpM", lesson: "basics-3", type: "lesson", title: "Other Ways to Say “I Don't Understand”", desc: "Szybka powtórka zwrotów w minutę.", src: "yt", short: true },

  // ✈️ Lotnisko
  { id: "Owkvl_TNRqU", lesson: "airport-1", type: "dialog", title: "Check In at the Airport Conversation", desc: "Rozmowa przy stanowisku odprawy: paszport, bagaż, miejsce.", src: "yt" },
  { id: "aXwFBsIk7dw", lesson: "airport-1", type: "lesson", title: "Easy English at the Airport", desc: "Najważniejsze zwroty na lotnisku, prostym językiem.", src: "yt" },
  { id: "DXx0C-4G338", lesson: "airport-1", type: "dialog", title: "Airport Check-In – Conversation Practice", desc: "Krótka scenka odprawy do powtarzania na głos.", src: "yt", short: true },
  { id: "dgRN_5lHIMA", lesson: "airport-1", type: "dialog", title: "Airport Check-in Conversation in English", desc: "Pasażer i pracownik linii – odprawa w minutę.", src: "yt", short: true },

  { id: "QXA0lMhuvqI", lesson: "airport-2", type: "dialog", title: "Airport Security Check!", desc: "Kontrola bezpieczeństwa: co usłyszysz i co odpowiedzieć.", src: "yt" },
  { id: "O2NdAwgXaeE", lesson: "airport-2", type: "dialog", title: "Check In, Go Through Security – Airport Dialogue", desc: "Od odprawy przez kontrolę – pytania i rozmowy krok po kroku.", src: "yt" },
  { id: "sv_Plybhy_Q", lesson: "airport-2", type: "dialog", title: "Flight Attendant and Passenger on a Plane", desc: "Na pokładzie: rozmowa pasażera ze stewardesą.", src: "yt" },
  { id: "x4EPq4omFNI", lesson: "airport-2", type: "dialog", title: "Flight Delayed, Gate Changed, Luggage Lost", desc: "Gdy wszystko idzie nie tak: opóźnienie, zmiana bramki, zgubiony bagaż.", src: "yt" },

  { id: "nyhYxZwJjTs", lesson: "airport-3", type: "dialog", title: "Airport English: Lost Suitcase Dialogue", desc: "Zgłaszasz zgubioną walizkę w biurze bagażowym.", src: "yt" },
  { id: "M7HsVGR65rs", lesson: "airport-3", type: "dialog", title: "Lost Luggage at the Airport", desc: "Jak opisać walizkę i dowiedzieć się, kiedy wróci.", src: "yt" },
  { id: "f1d6JPEYeuQ", lesson: "airport-3", type: "dialog", title: "Lost Luggage at the Airport", desc: "Zgubiony bagaż w minutę – szybka scenka.", src: "yt", short: true },
  { id: "LMJUjYxqTZ4", lesson: "airport-3", type: "dialog", title: "All Airport English Dialogues in One Video", desc: "Wszystkie sytuacje na lotnisku w jednym filmie – od odprawy po odbiór bagażu.", src: "yt" },

  // 🏨 Hotel
  { id: "RJYoFjX5MiA", lesson: "hotel-1", type: "dialog", title: "English Conversation: Hotel Check-in", desc: "Zameldowanie w hotelu – klasyczna rozmowa z recepcją.", src: "yt" },
  { id: "GLgx51zl6Lw", lesson: "hotel-1", type: "dialog", title: "Checking In with the Receptionist", desc: "Słuchasz i czytasz rozmowę gościa z recepcjonistą.", src: "yt" },
  { id: "_sNg7zm6J64", lesson: "hotel-1", type: "dialog", title: "Hotel Front Desk Conversation Practice", desc: "Zameldowanie krok po kroku – dla tych, którzy stresują się recepcją.", src: "yt" },
  { id: "r1HtfyVGWl8", lesson: "hotel-1", type: "dialog", title: "Hotel English Conversations (Booking to Check-out)", desc: "Cały pobyt: rezerwacja, zameldowanie, pytania, wymeldowanie.", src: "yt" },

  { id: "0tRfLCDpuIg", lesson: "hotel-2", type: "dialog", title: "Guest Complains About AC Not Working", desc: "Nie działa klimatyzacja – dokładnie jak w Twojej lekcji.", src: "yt" },
  { id: "1riDRt78ZUU", lesson: "hotel-2", type: "lesson", title: "Hotel Problems in English – How to Complain Politely (A2–B1)", desc: "Jak uprzejmie (i skutecznie) zgłosić problem w pokoju.", src: "yt" },
  { id: "HkbuZ7u771s", lesson: "hotel-2", type: "dialog", title: "At the Hotel – Making Complaints", desc: "Gość zgłasza kilka problemów, recepcja je rozwiązuje.", src: "yt" },
  { id: "a4zGpfCGk7k", lesson: "hotel-2", type: "dialog", title: "Guest Has Trouble with the Safe", desc: "Sejf nie chce się otworzyć – zgłoszenie i wizyta technika.", src: "yt" },

  { id: "ZOpVW-egVDM", lesson: "hotel-3", type: "dialog", title: "English Conversation: Hotel Check Out", desc: "Wymeldowanie: rachunek, klucz, minibarek.", src: "yt" },
  { id: "fGDMZ1cz3_o", lesson: "hotel-3", type: "dialog", title: "Checking Out of the Hotel", desc: "Typowa rozmowa przy wymeldowaniu.", src: "yt" },
  { id: "Yyvu9J1uPV8", lesson: "hotel-3", type: "dialog", title: "Early Check-in & Late Check-out", desc: "Jak poprosić o wcześniejsze zameldowanie albo późniejsze wymeldowanie.", src: "yt" },
  { id: "Q-Wp5KOnZzI", lesson: "hotel-3", type: "dialog", title: "Hotel Check-in & Check-out Conversation", desc: "Zameldowanie i wymeldowanie w prostych dialogach.", src: "yt" },

  // ☕ Kawiarnia i restauracja
  { id: "2VeQTuSSiI0", lesson: "food-1", type: "dialog", title: "English Conversation at a Café", desc: "Zamawianie kawy i czegoś do jedzenia w kawiarni.", src: "yt" },
  { id: "tYql4WTRkLU", lesson: "food-1", type: "lesson", title: "How to Order Coffee in English at a Coffee Shop", desc: "Jak zamówić kawę w USA – rozmiary, mleko, na wynos.", src: "yt" },
  { id: "0gu3MSatfo4", lesson: "food-1", type: "dialog", title: "Ordering Drinks and Pastries at a Coffee Shop", desc: "Emma zamawia napoje i ciastka w kawiarni.", src: "yt" },
  { id: "hS9a9UpkHfA", lesson: "food-1", type: "dialog", title: "Ordering Coffee – Real Café Conversation", desc: "Kawa i croissant w minutę.", src: "yt", short: true },

  { id: "lvw_ht29FXE", lesson: "food-2", type: "dialog", title: "At the Restaurant (Ordering Food)", desc: "Zamawianie jedzenia – rozmowa z kelnerem do ćwiczenia mówienia.", src: "yt" },
  { id: "CjzrznCrUTI", lesson: "food-2", type: "dialog", title: "At the Restaurant – English Conversation", desc: "Od stolika, przez menu, po zamówienie.", src: "yt" },
  { id: "lbFze-78qyw", lesson: "food-2", type: "dialog", title: "Ordering Food at a Restaurant", desc: "Klient i kelner – naturalny dialog w restauracji.", src: "yt" },
  { id: "i6lTtcrKQDk", lesson: "food-2", type: "dialog", title: "Ordering Food in a Restaurant (Dialogue)", desc: "Zamówienie w restauracji w minutę.", src: "yt", short: true },

  { id: "XGUE3Xo1Sqs", lesson: "food-3", type: "lesson", title: "How to Pay the Bill Politely in English", desc: "Jak uprzejmie poprosić o rachunek – jak native speaker.", src: "yt" },
  { id: "dbO31dHzpMg", lesson: "food-3", type: "dialog", title: "Ordering Food and Asking for the Bill", desc: "Zamówienie i płacenie w jednej rozmowie.", src: "yt" },
  { id: "0MdHgwZrUKA", lesson: "food-3", type: "dialog", title: "Conversation at a Restaurant About the Bill", desc: "Coś się nie zgadza na rachunku – jak to grzecznie wyjaśnić.", src: "yt" },
  { id: "xFhKDhQHoSE", lesson: "food-3", type: "dialog", title: "Asking for the Bill & Tipping", desc: "Rachunek i napiwek w minutę.", src: "yt", short: true },

  // 🛒 Sklep i zakupy
  { id: "WDleCLQKEk0", lesson: "shop-1", type: "dialog", title: "Grocery Store – English Conversation", desc: "Słówka i zwroty przydatne w sklepie spożywczym.", src: "yt" },
  { id: "xA32p3CEt8Y", lesson: "shop-1", type: "dialog", title: "At the Supermarket", desc: "Zabawna rozmowa w supermarkecie z codziennymi zwrotami.", src: "yt" },
  { id: "81V09w7rGB0", lesson: "shop-1", type: "lesson", title: "Real English at the Grocery Store", desc: "Dwoje prowadzących tłumaczy naturalne zwroty z zakupów.", src: "yt" },
  { id: "MnLSCJdv2XA", lesson: "shop-1", type: "dialog", title: "At the Grocery Store – Easy Conversation", desc: "Zakupy spożywcze w minutę.", src: "yt", short: true },

  { id: "JsxtUOesbFE", lesson: "shop-2", type: "dialog", title: "English Conversation: Shopping for Clothes", desc: "Szukanie ubrań, rozmiar, przymierzalnia.", src: "yt" },
  { id: "lgDJn9ywo8I", lesson: "shop-2", type: "dialog", title: "Clothes Shopping English Conversation", desc: "Rozmowa klienta ze sprzedawcą w sklepie z ubraniami.", src: "yt" },
  { id: "IqEiAQACWIY", lesson: "shop-2", type: "lesson", title: "Shopping for Clothes in English", desc: "Najważniejsze pytania i odpowiedzi przy kupowaniu ubrań.", src: "yt" },
  { id: "ad8a2BiXulw", lesson: "shop-2", type: "dialog", title: "Shopping for Clothes", desc: "Kolejna scenka zakupów odzieżowych – utrwal zwroty.", src: "yt" },

  { id: "jwVvOCZI6iM", lesson: "shop-3", type: "dialog", title: "Easy English Conversation: Returns & Refunds", desc: "Wolna, prosta rozmowa o zwrocie towaru i pieniędzy.", src: "yt" },
  { id: "Ck1dCV070s8", lesson: "shop-3", type: "dialog", title: "How to Return an Item to a Store", desc: "Co powiedzieć, gdy oddajesz coś do sklepu.", src: "yt" },
  { id: "zAXXXg3Gt8w", lesson: "shop-3", type: "lesson", title: "Returning a Product – Phrases for Refunds & Exchanges", desc: "Zwroty do zwrotów i wymian towaru.", src: "yt" },
  { id: "OnmfUb9NoTU", lesson: "shop-3", type: "dialog", title: "Returning a Shirt in English", desc: "Oddajesz koszulę – scenka w minutę.", src: "yt", short: true },

  // 🚕 Miasto i transport
  { id: "w6uq2exFfg0", lesson: "city-1", type: "lesson", title: "Asking for and Giving Directions", desc: "Słówka i zwroty do pytania o drogę i jej wskazywania.", src: "yt" },
  { id: "nLqJOBnkNrQ", lesson: "city-1", type: "dialog", title: "Asking for Directions in English", desc: "Pytasz o drogę w mieście – prosty angielski.", src: "yt" },
  { id: "hxOPLsQ1J0k", lesson: "city-1", type: "dialog", title: "Asking for Directions to the Bank", desc: "Prosty, przyjazny dialog: jak dojść do banku.", src: "yt" },
  { id: "I8PqBxVmpE4", lesson: "city-1", type: "lesson", title: "How to Ask for Directions and Understand the Answer", desc: "Nie tylko zapytać – ale też zrozumieć odpowiedź.", src: "yt" },

  { id: "74T4ZeALAiI", lesson: "city-2", type: "dialog", title: "Taking a Taxi", desc: "Przydatne zwroty i pytania w taksówce.", src: "yt" },
  { id: "MQkDIvO-2Gk", lesson: "city-2", type: "dialog", title: "Taxi to the Airport", desc: "Krótki dialog: taksówką na lotnisko.", src: "yt" },
  { id: "KgRzIGWPAB8", lesson: "city-2", type: "lesson", title: "How to Take a Taxi in English", desc: "Od wskazania celu po płacenie i napiwek.", src: "yt" },
  { id: "NjFWtg0CBdM", lesson: "city-2", type: "dialog", title: "Small Talk in a Taxi", desc: "O czym rozmawiać z kierowcą podczas jazdy.", src: "yt" },

  { id: "sM1mWWY75n0", lesson: "city-3", type: "dialog", title: "Metro English Conversation", desc: "Kupujesz bilet na stacji metra.", src: "yt" },
  { id: "PHkIfzx5pXw", lesson: "city-3", type: "dialog", title: "English Conversation: At the Train Station", desc: "Turysta i kasjer na dworcu – bilet, peron, przesiadka.", src: "yt" },
  { id: "JD0N2r5JThk", lesson: "city-3", type: "dialog", title: "British English Conversation – Train Station", desc: "Bilety na brytyjskim dworcu – prawdziwa rozmowa.", src: "yt" },
  { id: "AEuSQWQhiHc", lesson: "city-3", type: "dialog", title: "Buying a Train Ticket", desc: "Bilet na pociąg w minutę.", src: "yt", short: true },

  // 💊 Zdrowie
  { id: "UdakI1zk0xE", lesson: "health-1", type: "dialog", title: "At the Pharmacy – Everyday English Conversation", desc: "Codzienna rozmowa w aptece.", src: "yt" },
  { id: "ma8Yd25t1fE", lesson: "health-1", type: "dialog", title: "English Conversation at the Pharmacy", desc: "Kupujesz lek i opisujesz, co Ci dolega.", src: "yt" },
  { id: "ChDdPCLPD48", lesson: "health-1", type: "dialog", title: "What Do You Say at the Pharmacy?", desc: "Proste rozmowy w aptece dla początkujących.", src: "yt" },
  { id: "jGADYTSRKB0", lesson: "health-1", type: "dialog", title: "Buying Medicine with a Prescription", desc: "Odbiór leku na receptę w minutę.", src: "yt", short: true },

  { id: "G7DJacWF2Eg", lesson: "health-2", type: "dialog", title: "English Conversation at the Doctor (A1–A2)", desc: "Naturalna rozmowa pacjenta z lekarzem, poziom podstawowy.", src: "yt" },
  { id: "Zk1L0m67pfU", lesson: "health-2", type: "dialog", title: "At the Doctor's Office – Easy Conversation", desc: "Wolny, łatwy dialog – dla tych, którzy stresują się mówieniem.", src: "yt" },
  { id: "k0NvrZFqIko", lesson: "health-2", type: "dialog", title: "Feeling Sick (Making a Doctor's Appointment)", desc: "Źle się czujesz i umawiasz wizytę przez telefon.", src: "yt" },
  { id: "IB5lctk2E1Q", lesson: "health-2", type: "dialog", title: "Talking to a Doctor About Symptoms", desc: "Jak opisać objawy lekarzowi.", src: "yt" },

  { id: "55DUJfo2O1I", lesson: "health-3", type: "dialog", title: "Reporting a Lost Wallet at the Police Station (A1–A2)", desc: "Zgłaszasz zgubiony portfel na policji.", src: "yt" },
  { id: "ZHUGCS7lRw4", lesson: "health-3", type: "dialog", title: "Reporting a Stolen Bag: Police Officer and a Traveller", desc: "Turyście kradną torbę z paszportem – rozmowa z policjantem.", src: "yt" },
  { id: "H6as-76WGRg", lesson: "health-3", type: "dialog", title: "Reporting a Theft", desc: "Zgłoszenie kradzieży krok po kroku.", src: "yt" },
  { id: "4z_TK18v2u8", lesson: "health-3", type: "dialog", title: "Let's Learn English – Lesson 43: Time for Plan B", desc: "Anna gubi portfel i musi sobie poradzić.", src: "voa" },

  // 💬 Small talk
  { id: "lLzxBcjbXBw", lesson: "smalltalk-1", type: "dialog", title: "Small Talk with a Friend – 5-Minute Practice", desc: "Pięciominutowa luźna rozmowa dwójki znajomych.", src: "yt" },
  { id: "tjIAu3L5Rrc", lesson: "smalltalk-1", type: "dialog", title: "Asking about Weekend Plans", desc: "Jak zapytać o weekend i jak o nim opowiedzieć.", src: "yt" },
  { id: "lrTRNbC3BDQ", lesson: "smalltalk-1", type: "dialog", title: "Talking about Weekend Plans – Real Easy English", desc: "Plany na weekend w prostym, naturalnym angielskim.", src: "yt" },
  { id: "1FP3amclqGg", lesson: "smalltalk-1", type: "dialog", title: "Talking About Your Plans for the Weekend", desc: "Ćwiczenie ze słuchu: rozmowa o weekendzie.", src: "yt" },

  { id: "azaCzXkxlIw", lesson: "smalltalk-2", type: "dialog", title: "Easy English Conversation: Interests and Hobbies", desc: "Jak zapytać o zainteresowania i opowiedzieć o swoich.", src: "yt" },
  { id: "DaDaZcBE8MQ", lesson: "smalltalk-2", type: "dialog", title: "Hobbies and Free Time Activities", desc: "Rozmowa o czasie wolnym – do ćwiczenia mówienia.", src: "yt" },
  { id: "vslGMV71200", lesson: "smalltalk-2", type: "dialog", title: "Jobs and Occupations Conversation", desc: "Rozmowa o pracy i zawodach w formie wywiadu.", src: "yt" },
  { id: "yTMPRRmv-kU", lesson: "smalltalk-2", type: "lesson", title: "100 Everyday Phrases for Small Talk (A2–B1)", desc: "Sto zwrotów do luźnej rozmowy: pogoda, praca, hobby, podróże.", src: "yt" },

  { id: "3GNvELF0zNY", lesson: "smalltalk-3", type: "dialog", title: "Making and Responding to Plans", desc: "Zapraszanie, zgadzanie się i zmiana planów.", src: "yt" },
  { id: "XAURVf81vgQ", lesson: "smalltalk-3", type: "dialog", title: "Accept or Decline Invitations – Easy Conversation", desc: "Jak odmówić zaproszenia, żeby nikogo nie urazić.", src: "yt" },
  { id: "AecqTms6_-M", lesson: "smalltalk-3", type: "lesson", title: "Making, Accepting and Declining Invitations", desc: "Zwroty do zapraszania, przyjmowania i odmawiania.", src: "yt" },
  { id: "D_yasSFDjyw", lesson: "smalltalk-3", type: "dialog", title: "Weekend Plans Conversation in Simple English", desc: "Plany na weekend w minutę.", src: "yt", short: true },

  // ===== Poziom średni (B1) =====
  { id: "NPYWTkPj5bM", lesson: "b1-airport-1", type: "dialog", title: "Airport Check-in: Flight Is Cancelled", desc: "Przy odprawie okazuje się, że lot jest odwołany – co dalej.", src: "yt" },
  { id: "1Hj0sXXTW_w", lesson: "b1-airport-1", type: "dialog", title: "What to Say When Your Flight Is Delayed", desc: "Jak spokojnie i pewnie rozmawiać, gdy lot się opóźnia.", src: "yt" },
  { id: "FBwsBs2nkQk", lesson: "b1-airport-1", type: "lesson", title: "99 English Sentences for Travel Problems", desc: "Odwołany lot, zgubiona walizka, choroba za granicą – gotowe zdania.", src: "yt" },

  { id: "GgWNytdjzP8", lesson: "b1-airport-2", type: "dialog", title: "English Conversation at the Airport – Passport Control", desc: "Rozmowa z funkcjonariuszem przy kontroli paszportowej.", src: "yt" },
  { id: "gVolfItd4Mo", lesson: "b1-airport-2", type: "dialog", title: "English Conversation at Immigration", desc: "Odprawa imigracyjna: cel podróży, długość pobytu, nocleg.", src: "yt" },
  { id: "b4CUB4X4HO4", lesson: "b1-airport-2", type: "dialog", title: "Passport Control & Border Interview", desc: "Pełna, realistyczna rozmowa na granicy.", src: "yt" },
  { id: "OVl1HSM3BVU", lesson: "b1-airport-2", type: "dialog", title: "At the Airport: Passport Control and Customs", desc: "Kontrola paszportowa i celna – dwie rozmowy po kolei.", src: "yt" },

  { id: "weoQEWXSDZo", lesson: "b1-hotel-1", type: "dialog", title: "Making a Hotel Reservation by Phone", desc: "Rezerwacja pokoju przez telefon krok po kroku.", src: "yt" },
  { id: "6KpyzK6y8Oc", lesson: "b1-hotel-1", type: "dialog", title: "Making a Hotel Reservation in English", desc: "Gość i recepcja: rodzaj pokoju, cena, nazwisko do rezerwacji.", src: "yt" },
  { id: "H2s79ftTD4k", lesson: "b1-hotel-1", type: "dialog", title: "Hotel Reservation Telephone Conversation", desc: "Rozmowa telefoniczna z hotelem.", src: "yt" },
  { id: "gW-2gsHqGt0", lesson: "b1-hotel-1", type: "dialog", title: "Hotel Reservation in English", desc: "Rezerwacja przez telefon albo online – najprostsze kroki.", src: "yt" },

  { id: "Ed6LzrUBe9M", lesson: "b1-food-1", type: "dialog", title: "Making a Restaurant Reservation", desc: "Rezerwacja stolika w restauracji.", src: "yt" },
  { id: "PfSaePOl4mc", lesson: "b1-food-1", type: "dialog", title: "Make a Restaurant Reservation – Phone Conversation", desc: "Dzwonisz do restauracji, żeby zarezerwować stolik.", src: "yt" },
  { id: "zI60alGD0XE", lesson: "b1-food-1", type: "dialog", title: "Speak English at the Restaurant: 4 Real-Life Conversations", desc: "Cztery rozmowy: od rezerwacji po zamówienie.", src: "yt" },
  { id: "9GSYHmeFWXA", lesson: "b1-food-1", type: "dialog", title: "Do You Have Any Allergies?", desc: "Krótka rozmowa o alergiach pokarmowych.", src: "yt", short: true },

  { id: "uB6h0AINl_s", lesson: "b1-shop-2", type: "lesson", title: "Useful English Expressions for Price Negotiation", desc: "Zwroty do targowania się o cenę.", src: "yt" },
  { id: "-VcFoAYhDAM", lesson: "b1-shop-2", type: "dialog", title: "Bargaining in English: Ask for Better Prices", desc: "„Ile to kosztuje? Da pan taniej?” – targowanie w praktyce.", src: "yt" },
  { id: "8ZmpqhhO4Dk", lesson: "b1-shop-2", type: "dialog", title: "Asking for Discounts", desc: "Jak uprzejmie poprosić o zniżkę.", src: "yt" },
  { id: "YKAjbfPGx6Q", lesson: "b1-shop-2", type: "lesson", title: "How to Bargain Politely in English", desc: "Proste wskazówki, jak negocjować grzecznie i pewnie.", src: "yt" },

  { id: "DLdJeOlDpRE", lesson: "b1-city-1", type: "dialog", title: "Renting a Car – Customer and Rental Agent Dialogue", desc: "Klient i pracownik wypożyczalni przy ladzie.", src: "yt" },
  { id: "WzlniZ700V4", lesson: "b1-city-1", type: "dialog", title: "English Conversation: Renting a Car", desc: "Wynajem samochodu – rozmowa do odegrania.", src: "yt" },
  { id: "br4OzOZPQug", lesson: "b1-city-1", type: "dialog", title: "Intermediate English Dialogue: Renting a Car (B1–B2)", desc: "Wynajem auta na poziomie średnim – zwroty i słowa kluczowe.", src: "yt" },
  { id: "ux9iLl83zF4", lesson: "b1-city-1", type: "lesson", title: "English for Real Life: Renting a Car", desc: "Słownictwo przydatne w wypożyczalni.", src: "yt" },

  // ===== Poziom zaawansowany (C1) =====
  { id: "k-mKCM84SYY", lesson: "c1-basics-1", type: "lesson", title: "How to Make Small Talk at a Business Meeting", desc: "Small talk na spotkaniu biznesowym.", src: "yt" },
  { id: "UTtFtVWQ9KQ", lesson: "c1-basics-1", type: "lesson", title: "Business English Small Talk", desc: "Typowe pytania i odpowiedzi w biznesowym small talku.", src: "yt" },
  { id: "FuSqOJHgPC8", lesson: "c1-basics-1", type: "lesson", title: "How to Make Small Talk – Business English Lesson", desc: "Jak zaczynać i podtrzymywać rozmowę w pracy.", src: "yt" },
  { id: "xrKToKZ-lWI", lesson: "c1-basics-1", type: "lesson", title: "Mastering Small Talk (Business English Podcast)", desc: "Podcast o sztuce small talku – do słuchania.", src: "yt" },

  { id: "HakpWDCIXTw", lesson: "c1-basics-2", type: "lesson", title: "How to Disagree in English Politely", desc: "Jak powiedzieć „nie zgadzam się” bez napięcia w rozmowie.", src: "yt" },
  { id: "CuV9qNigH-U", lesson: "c1-basics-2", type: "lesson", title: "Expressing Opinions, Agreeing & Disagreeing Politely (B2)", desc: "Wyrażanie opinii, zgoda i uprzejma niezgoda.", src: "yt" },
  { id: "cDk-95Udb9Y", lesson: "c1-basics-2", type: "lesson", title: "27 Alternatives to “I think” (Advanced)", desc: "27 sposobów, żeby nie mówić ciągle „I think”.", src: "yt" },
  { id: "59ZE3OiLdtU", lesson: "c1-basics-2", type: "lesson", title: "How to Speak Better in Business Meetings (Advanced)", desc: "Jak zabierać głos na spotkaniach, gdy stawka jest wysoka.", src: "yt" },

  { id: "60Yf75IrWHk", lesson: "c1-basics-3", type: "lesson", title: "21 Advanced English Idioms", desc: "21 idiomów na poziomie zaawansowanym.", src: "yt" },
  { id: "PS-lNmwBI50", lesson: "c1-basics-3", type: "lesson", title: "27 English Idioms for Fluent Conversation", desc: "Idiomy, dzięki którym brzmisz płynnie.", src: "yt" },
  { id: "zn-05H-PlgA", lesson: "c1-basics-3", type: "lesson", title: "50 Advanced (C2) Expressions Native Speakers Use", desc: "50 wyrażeń, których używają native speakerzy.", src: "yt" },
  { id: "6DbCTfepYgM", lesson: "c1-basics-3", type: "lesson", title: "221 Advanced English Phrases and Idioms", desc: "Długa lekcja: 221 zwrotów do codziennych rozmów.", src: "yt" },

  { id: "qjQ_h4HWShU", lesson: "c1-airport-2", type: "dialog", title: "Immigration English — 35 Airport Questions & Answers", desc: "35 pytań, które może zadać urzędnik imigracyjny, i odpowiedzi.", src: "yt" },
  { id: "5qVLppU4Th8", lesson: "c1-airport-2", type: "lesson", title: "How to Answer English Questions at Passport Control", desc: "Najczęstsze pytania na granicy z wyjaśnieniem.", src: "yt" },

  { id: "OA1iXnZ0lNw", lesson: "c1-airport-3", type: "lesson", title: "6 Minute English – Travel and Tourism (Box Set)", desc: "BBC: kilka odcinków o podróżach i turystyce w jednym.", src: "bbc" },
  { id: "UhR-Bn4UII0", lesson: "c1-airport-3", type: "lesson", title: "Is Tourism Harmful? – 6 Minute English", desc: "BBC: miasta jak Rzym i Brugia ograniczają ruch turystów.", src: "bbc" },
  { id: "ZLl0BlZ6who", lesson: "c1-airport-3", type: "lesson", title: "Should Tourists Go to Antarctica? – 6 Minute English", desc: "BBC: czy turyści powinni jeździć na Antarktydę.", src: "bbc" },
  { id: "EVXMiy4LCYE", lesson: "c1-airport-3", type: "lesson", title: "6 Minute English – Transport (Box Set)", desc: "BBC: pół godziny o transporcie i nowym słownictwie.", src: "bbc" },

  { id: "6g-cQjYTgy0", lesson: "c1-food-1", type: "lesson", title: "Making Small Talk at the Restaurant – Business English", desc: "Small talk z klientem lub partnerem przy kolacji.", src: "yt" },
  { id: "x3B11_WAmxM", lesson: "c1-food-1", type: "lesson", title: "Making Small Talk at the Restaurant – Part 2", desc: "Ciąg dalszy: rozmowa przy stole biznesowym.", src: "yt" },
  { id: "jRZ57FfByR0", lesson: "c1-food-1", type: "lesson", title: "Business English: Talking About Food", desc: "Jak rozmawiać o menu i jedzeniu na biznesowym lunchu.", src: "yt" },

  { id: "V9up8rWL3zQ", lesson: "c1-shop-1", type: "lesson", title: "How to Successfully Negotiate in English", desc: "Jak skutecznie negocjować: słuchać, mówić krótko i konkretnie.", src: "yt" },
  { id: "-QVP1xuXurg", lesson: "c1-shop-1", type: "lesson", title: "20 Key Expressions for Negotiating in English", desc: "20 kluczowych zwrotów do negocjacji.", src: "yt" },
  { id: "kO-xNOOoxsM", lesson: "c1-shop-1", type: "dialog", title: "Business English Conversation – Negotiation", desc: "Rozmowa biznesowa o cenie i warunkach.", src: "yt" },

  { id: "fUcU39F73R0", lesson: "c1-shop-3", type: "dialog", title: "Apartment Rental Conversation", desc: "Najemca i właściciel – pełna rozmowa o wynajmie.", src: "yt" },
  { id: "lPlpScj1QIo", lesson: "c1-shop-3", type: "dialog", title: "Renting an Apartment – Real English Conversation", desc: "Prawdziwa rozmowa o wynajmie mieszkania.", src: "yt" },
  { id: "0DRPOQIOK6s", lesson: "c1-shop-3", type: "dialog", title: "English Conversation for Renting an Apartment", desc: "Czynsz, kaucja, opłaty – pytania do właściciela.", src: "yt" },
  { id: "CVhX52dhDMo", lesson: "c1-shop-3", type: "lesson", title: "38 Phrases for Renting an Apartment", desc: "38 zwrotów do rozmowy z wynajmującym – shadowing.", src: "yt" },

  { id: "GWkzCr3i0o0", lesson: "c1-smalltalk-3", type: "dialog", title: "Job Interview in English – Conversation Practice", desc: "Rozmowa kwalifikacyjna do przećwiczenia.", src: "yt" },
  { id: "e3XlBiR7uaE", lesson: "c1-smalltalk-3", type: "dialog", title: "The Most Complete Job Interview in English", desc: "Realistyczna, pełna rozmowa o pracę.", src: "yt" },
  { id: "-JNjsOX0N0c", lesson: "c1-smalltalk-3", type: "lesson", title: "English Job Interview Dos & Don'ts", desc: "Co mówić, a czego unikać: mocne i słabe strony, plany.", src: "yt" },
  { id: "E_Bnirme2ec", lesson: "c1-smalltalk-3", type: "lesson", title: "1 Hour C1 Advanced English Listening – Job Interviews", desc: "Godzina słuchania na poziomie C1 o rozmowach o pracę.", src: "yt" },
];

export const TYPE_LABEL = { dialog: "🎭 Scenka", lesson: "👩‍🏫 Lekcja z lektorem" };

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
