// Pytania testu poziomującego (osobny plik – korzysta z nich też generator nagrań).

// type: "choose" – uzupełnij zdanie, "meaning" – co to znaczy, "reply" – najlepsza odpowiedź,
//       "listen" – posłuchaj i wybierz, co usłyszałeś. Pierwsza opcja w "options" jest poprawna.
export const QUESTIONS = [
  // A1–A2
  { band: "A", type: "choose", prompt: "___ name is Anna.", options: ["My", "I", "Me", "Mine"] },
  { band: "A", type: "meaning", prompt: "Where is the station?", options: ["Gdzie jest dworzec?", "Kiedy jest pociąg?", "Czy to jest stacja?", "Jak daleko jest stacja?"] },
  { band: "A", type: "reply", prompt: "How are you?", options: ["I'm fine, thanks.", "I'm thirty.", "I'm from Poland.", "Yes, I am."] },
  { band: "A", type: "listen", prompt: "Can I have the bill, please?", options: ["Can I have the bill, please?", "Can I have the pill, please?", "Can I have a bill, Steve?", "I can't have the bill, please."] },
  { band: "A", type: "choose", prompt: "I ___ coffee every morning.", options: ["drink", "drinks", "drinking", "am drink"] },
  { band: "A", type: "choose", prompt: "There ___ two beds in the room.", options: ["are", "is", "be", "am"] },
  { band: "A", type: "reply", prompt: "Can I pay by card?", options: ["Sure, no problem.", "It's on the left.", "Nice to meet you.", "I don't like it."] },
  // B1–B2
  { band: "B", type: "choose", prompt: "I ___ to London three times.", options: ["have been", "was", "have gone", "am"] },
  { band: "B", type: "choose", prompt: "If it rains tomorrow, we ___ at home.", options: ["will stay", "stay", "would stay", "stayed"] },
  { band: "B", type: "meaning", prompt: "My flight was cancelled, so I had to rebook.", options: ["Mój lot odwołano, więc musiałem zmienić rezerwację.", "Mój lot był opóźniony, więc czekałem na lotnisku.", "Zgubiłem bilet, więc kupiłem nowy.", "Lot był pełny, więc poleciałem później."] },
  { band: "B", type: "reply", prompt: "Would you mind opening the window?", options: ["Not at all.", "Yes, I mind it.", "I'm opening.", "No, thanks."] },
  { band: "B", type: "listen", prompt: "I'd rather sit by the window, if that's possible.", options: ["I'd rather sit by the window, if that's possible.", "I'd rather sit by the door, if that's possible.", "I'd like to sit by the window, it's possible.", "I'd rather sit with a widow, if that's possible."] },
  { band: "B", type: "choose", prompt: "She asked me where ___.", options: ["I lived", "did I live", "do I live", "I am live"] },
  { band: "B", type: "choose", prompt: "The museum is definitely worth ___.", options: ["visiting", "to visit", "visit", "visited"] },
  // C1
  { band: "C", type: "choose", prompt: "Had I known about the delay, I ___ a later train.", options: ["would have taken", "would take", "had taken", "will take"] },
  { band: "C", type: "meaning", prompt: "Let's not beat around the bush.", options: ["Nie owijajmy w bawełnę.", "Nie chodźmy na skróty.", "Nie traćmy nadziei.", "Nie kłóćmy się o drobiazgi."] },
  { band: "C", type: "reply", prompt: "I'm afraid we're fully booked tonight.", options: ["That's a shame. Could you recommend somewhere nearby?", "Don't be afraid, it's fine.", "Great, I'll book it then.", "Yes, I'm fully booked too."] },
  { band: "C", type: "choose", prompt: "Not only ___ late, but he also forgot the tickets.", options: ["was he", "he was", "he is", "did he"] },
  { band: "C", type: "listen", prompt: "I'm not entirely convinced this is the best way to go about it.", options: ["I'm not entirely convinced this is the best way to go about it.", "I'm entirely convinced this is the best way to go about it.", "I'm not entirely convinced this is the best way to go out.", "I was not convinced this was the best way around it."] },
  { band: "C", type: "meaning", prompt: "It's on the tip of my tongue.", options: ["Mam to na końcu języka.", "Ugryzłem się w język.", "To mi leży na sercu.", "Mówię to prosto z mostu."] },
];
