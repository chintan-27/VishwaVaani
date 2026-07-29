import type { HintLocale, Mission, MissionSlug } from "@/lib/types";

export const localeLabels: Record<HintLocale, { label: string; native: string }> = {
  "hi-IN": { label: "Hindi", native: "हिन्दी" },
  "ta-IN": { label: "Tamil", native: "தமிழ்" },
  "te-IN": { label: "Telugu", native: "తెలుగు" },
  "bn-IN": { label: "Bengali", native: "বাংলা" },
  "mr-IN": { label: "Marathi", native: "मराठी" },
};

export const repairPhrases = {
  repeat: {
    en: "Could you repeat that?",
    hints: {
      "hi-IN": "क्या आप इसे फिर से कहेंगे?",
      "ta-IN": "அதை மீண்டும் சொல்ல முடியுமா?",
      "te-IN": "దాన్ని మళ్లీ చెప్పగలరా?",
      "bn-IN": "আপনি কি আবার বলবেন?",
      "mr-IN": "तुम्ही ते पुन्हा सांगाल का?",
    },
  },
  slower: {
    en: "Please speak a little more slowly.",
    hints: {
      "hi-IN": "कृपया थोड़ा धीरे बोलिए।",
      "ta-IN": "தயவுசெய்து சற்று மெதுவாகப் பேசுங்கள்.",
      "te-IN": "దయచేసి కొంచెం నెమ్మదిగా మాట్లాడండి.",
      "bn-IN": "দয়া করে একটু ধীরে বলুন।",
      "mr-IN": "कृपया थोडे हळू बोला.",
    },
  },
  meaning: {
    en: "What does that mean?",
    hints: {
      "hi-IN": "इसका क्या मतलब है?",
      "ta-IN": "அதற்கு என்ன அர்த்தம்?",
      "te-IN": "దాని అర్థం ఏమిటి?",
      "bn-IN": "এর মানে কী?",
      "mr-IN": "याचा अर्थ काय?",
    },
  },
} as const;

export const missions: Mission[] = [
  {
    slug: "us-immigration",
    eyebrow: "Arrival · New York",
    title: "US Immigration",
    objective: "Explain your visit, stay, and return plan to a border officer.",
    description: "Answer calm, direct questions at the arrivals desk and recover if you miss a detail.",
    duration: "6–8 min",
    difficulty: "Beginner",
    location: "Terminal 4",
    number: "01",
    accent: "American English",
    color: "#8D9CFF",
    preparation: [
      {
        en: "I am here for a holiday.",
        hints: {
          "hi-IN": "मैं छुट्टी मनाने आया / आई हूँ।",
          "ta-IN": "நான் விடுமுறைக்காக வந்திருக்கிறேன்.",
          "te-IN": "నేను సెలవు కోసం వచ్చాను.",
          "bn-IN": "আমি ছুটি কাটাতে এসেছি।",
          "mr-IN": "मी सुट्टीसाठी आलो / आले आहे.",
        },
      },
      {
        en: "I will stay for ten days.",
        hints: {
          "hi-IN": "मैं दस दिनों तक रुकूँगा / रुकूँगी।",
          "ta-IN": "நான் பத்து நாட்கள் தங்குவேன்.",
          "te-IN": "నేను పది రోజులు ఉంటాను.",
          "bn-IN": "আমি দশ দিন থাকব।",
          "mr-IN": "मी दहा दिवस राहीन.",
        },
      },
      {
        en: "I am staying at a hotel.",
        hints: {
          "hi-IN": "मैं एक होटल में ठहरा / ठहरी हूँ।",
          "ta-IN": "நான் ஒரு விடுதியில் தங்குகிறேன்.",
          "te-IN": "నేను ఒక హోటల్‌లో ఉంటున్నాను.",
          "bn-IN": "আমি একটি হোটেলে থাকছি।",
          "mr-IN": "मी एका हॉटेलमध्ये राहत आहे.",
        },
      },
    ],
    requiredSlots: ["purpose", "duration", "accommodation", "return-plan"],
  },
  {
    slug: "hotel-check-in",
    eyebrow: "Stay · Hotel lobby",
    title: "Hotel Check-in",
    objective: "Find your booking, confirm the room, and ask one practical question.",
    description: "Check in smoothly even when the receptionist asks for details in a different order.",
    duration: "5–7 min",
    difficulty: "Beginner",
    location: "Front desk",
    number: "02",
    accent: "International English",
    color: "#68E0D1",
    preparation: [
      {
        en: "I have a reservation under the name Rao.",
        hints: {
          "hi-IN": "राव नाम से मेरी बुकिंग है।",
          "ta-IN": "ராவ் என்ற பெயரில் எனக்கு முன்பதிவு உள்ளது.",
          "te-IN": "రావు పేరుతో నాకు రిజర్వేషన్ ఉంది.",
          "bn-IN": "রাও নামে আমার একটি বুকিং আছে।",
          "mr-IN": "राव नावाने माझे आरक्षण आहे.",
        },
      },
      {
        en: "Could I check in, please?",
        hints: {
          "hi-IN": "क्या मैं चेक-इन कर सकता / सकती हूँ?",
          "ta-IN": "நான் செக்-இன் செய்யலாமா?",
          "te-IN": "నేను చెక్-ఇన్ చేయవచ్చా?",
          "bn-IN": "আমি কি চেক-ইন করতে পারি?",
          "mr-IN": "मी चेक-इन करू शकतो / शकते का?",
        },
      },
      {
        en: "What time is breakfast?",
        hints: {
          "hi-IN": "नाश्ता कितने बजे है?",
          "ta-IN": "காலை உணவு எத்தனை மணிக்கு?",
          "te-IN": "అల్పాహారం ఎన్ని గంటలకు?",
          "bn-IN": "সকালের নাশতা কখন?",
          "mr-IN": "नाश्ता किती वाजता आहे?",
        },
      },
    ],
    requiredSlots: ["booking-name", "identity", "room", "hotel-question"],
  },
  {
    slug: "restaurant-ordering",
    eyebrow: "Food · Café",
    title: "Restaurant Ordering",
    objective: "Ask about a dish, order clearly, and settle the bill.",
    description: "Navigate menu questions and dietary needs without relying on a memorised script.",
    duration: "6–8 min",
    difficulty: "Growing",
    location: "Table 12",
    number: "03",
    accent: "American English",
    color: "#FFB15A",
    preparation: [
      {
        en: "I would like to order this.",
        hints: {
          "hi-IN": "मैं यह ऑर्डर करना चाहूँगा / चाहूँगी।",
          "ta-IN": "நான் இதை ஆர்டர் செய்ய விரும்புகிறேன்.",
          "te-IN": "నేను దీన్ని ఆర్డర్ చేయాలనుకుంటున్నాను.",
          "bn-IN": "আমি এটি অর্ডার করতে চাই।",
          "mr-IN": "मला हे ऑर्डर करायचे आहे.",
        },
      },
      {
        en: "Is this dish vegetarian?",
        hints: {
          "hi-IN": "क्या यह व्यंजन शाकाहारी है?",
          "ta-IN": "இந்த உணவு சைவமா?",
          "te-IN": "ఈ వంటకం శాకాహారమా?",
          "bn-IN": "এই খাবারটি কি নিরামিষ?",
          "mr-IN": "हा पदार्थ शाकाहारी आहे का?",
        },
      },
      {
        en: "Could we have the bill, please?",
        hints: {
          "hi-IN": "कृपया बिल दे दीजिए।",
          "ta-IN": "தயவுசெய்து பில் தர முடியுமா?",
          "te-IN": "దయచేసి బిల్లు ఇవ్వగలరా?",
          "bn-IN": "দয়া করে বিলটি দেবেন?",
          "mr-IN": "कृपया बिल द्याल का?",
        },
      },
    ],
    requiredSlots: ["dish", "dietary-check", "quantity", "bill"],
  },
  {
    slug: "asking-directions",
    eyebrow: "City · Street corner",
    title: "Asking for Directions",
    objective: "Find a place and confirm the route before you leave.",
    description: "Listen for landmarks, walking time, and turns while keeping the conversation moving.",
    duration: "4–6 min",
    difficulty: "Growing",
    location: "City centre",
    number: "04",
    accent: "International English",
    color: "#69D69F",
    preparation: [
      {
        en: "Could you show me on the map?",
        hints: {
          "hi-IN": "क्या आप मुझे नक्शे पर दिखा सकते हैं?",
          "ta-IN": "வரைபடத்தில் காட்ட முடியுமா?",
          "te-IN": "మ్యాప్‌లో చూపించగలరా?",
          "bn-IN": "মানচিত্রে দেখাতে পারবেন?",
          "mr-IN": "नकाशावर दाखवू शकाल का?",
        },
      },
      {
        en: "How long does it take to walk?",
        hints: {
          "hi-IN": "पैदल जाने में कितना समय लगता है?",
          "ta-IN": "நடந்து செல்ல எவ்வளவு நேரம் ஆகும்?",
          "te-IN": "నడిచి వెళ్లడానికి ఎంత సమయం పడుతుంది?",
          "bn-IN": "হেঁটে যেতে কত সময় লাগে?",
          "mr-IN": "चालत जाण्यास किती वेळ लागतो?",
        },
      },
      {
        en: "Did you say turn left?",
        hints: {
          "hi-IN": "क्या आपने बाएँ मुड़ने को कहा?",
          "ta-IN": "இடதுபுறம் திரும்பச் சொன்னீர்களா?",
          "te-IN": "ఎడమవైపు తిరగమని చెప్పారా?",
          "bn-IN": "আপনি কি বাঁ দিকে ঘুরতে বললেন?",
          "mr-IN": "तुम्ही डावीकडे वळायला सांगितले का?",
        },
      },
    ],
    requiredSlots: ["destination", "landmark", "turns", "confirmation"],
  },
  {
    slug: "missing-baggage",
    eyebrow: "Problem · Baggage desk",
    title: "Missing Baggage",
    objective: "Report your bag, identify it, and arrange delivery.",
    description: "Stay clear under pressure while sharing the tag, description, and a fictional address.",
    duration: "7–8 min",
    difficulty: "Challenge",
    location: "Claims desk",
    number: "05",
    accent: "International English",
    color: "#FF7D86",
    preparation: [
      {
        en: "My bag did not arrive.",
        hints: {
          "hi-IN": "मेरा बैग नहीं आया।",
          "ta-IN": "என் பை வந்து சேரவில்லை.",
          "te-IN": "నా బ్యాగ్ రాలేదు.",
          "bn-IN": "আমার ব্যাগটি আসেনি।",
          "mr-IN": "माझी बॅग आली नाही.",
        },
      },
      {
        en: "Here is my baggage tag.",
        hints: {
          "hi-IN": "यह मेरा बैगेज टैग है।",
          "ta-IN": "இதோ என் பயணப்பை சீட்டு.",
          "te-IN": "ఇది నా బ్యాగేజ్ ట్యాగ్.",
          "bn-IN": "এই নিন আমার ব্যাগেজ ট্যাগ।",
          "mr-IN": "हा माझा बॅगेज टॅग आहे.",
        },
      },
      {
        en: "Where can it be delivered?",
        hints: {
          "hi-IN": "इसे कहाँ पहुँचाया जा सकता है?",
          "ta-IN": "அதை எங்கே கொண்டு சேர்க்க முடியும்?",
          "te-IN": "దాన్ని ఎక్కడికి డెలివరీ చేయవచ్చు?",
          "bn-IN": "এটি কোথায় পৌঁছে দেওয়া যাবে?",
          "mr-IN": "ती कुठे पोहोचवता येईल?",
        },
      },
    ],
    requiredSlots: ["bag-tag", "description", "contact", "delivery-address"],
  },
];

export const getMission = (slug: string): Mission | undefined =>
  missions.find((mission) => mission.slug === slug);

export const isMissionSlug = (slug: string): slug is MissionSlug =>
  missions.some((mission) => mission.slug === slug);
