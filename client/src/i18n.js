export const LANGS = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी' };

const T = {
  en: {
    sos: 'Need Help', track: 'Track', network: 'Shelters & Resources', hub: 'Responder Hub',
    emergency: 'Request Emergency Help', yourName: 'Your name (optional)', phone: 'Phone number',
    category: 'What do you need?', urgency: 'How urgent?', people: 'People affected',
    vulnerable: 'Anyone vulnerable?', details: 'Details / landmark', location: 'Location',
    getGps: 'Use my GPS', send: 'Send SOS',
    rescue: 'Rescue', food: 'Food', water: 'Water', medical: 'Medical', shelter: 'Shelter',
    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
    elderly: 'Elderly', children: 'Children', patient: 'Medical patient', pregnant: 'Pregnant', disabled: 'Disabled',
  },
  ta: {
    sos: 'உதவி தேவை', track: 'நிலை அறிய', network: 'தங்குமிடம் & வளங்கள்', hub: 'மீட்பாளர் மையம்',
    emergency: 'அவசர உதவி கோருங்கள்', yourName: 'உங்கள் பெயர் (விருப்பம்)', phone: 'தொலைபேசி எண்',
    category: 'உங்களுக்கு என்ன தேவை?', urgency: 'எவ்வளவு அவசரம்?', people: 'பாதிக்கப்பட்டவர்கள்',
    vulnerable: 'பாதிக்கப்படக்கூடியவர்கள் உள்ளனரா?', details: 'விவரம் / அடையாளம்', location: 'இடம்',
    getGps: 'என் GPS ஐப் பயன்படுத்து', send: 'SOS அனுப்பு',
    rescue: 'மீட்பு', food: 'உணவு', water: 'தண்ணீர்', medical: 'மருத்துவம்', shelter: 'தங்குமிடம்',
    critical: 'மிக அவசரம்', high: 'அதிகம்', medium: 'நடுத்தரம்', low: 'குறைவு',
    elderly: 'முதியோர்', children: 'குழந்தைகள்', patient: 'நோயாளி', pregnant: 'கர்ப்பிணி', disabled: 'மாற்றுத்திறனாளி',
  },
  hi: {
    sos: 'मदद चाहिए', track: 'स्थिति देखें', network: 'आश्रय और संसाधन', hub: 'रेस्पॉन्डर हब',
    emergency: 'आपातकालीन मदद माँगें', yourName: 'आपका नाम (वैकल्पिक)', phone: 'फ़ोन नंबर',
    category: 'आपको क्या चाहिए?', urgency: 'कितना ज़रूरी?', people: 'प्रभावित लोग',
    vulnerable: 'कोई संवेदनशील व्यक्ति?', details: 'विवरण / पहचान स्थल', location: 'स्थान',
    getGps: 'मेरा GPS उपयोग करें', send: 'SOS भेजें',
    rescue: 'बचाव', food: 'भोजन', water: 'पानी', medical: 'चिकित्सा', shelter: 'आश्रय',
    critical: 'अत्यंत गंभीर', high: 'ज़्यादा', medium: 'मध्यम', low: 'कम',
    elderly: 'बुज़ुर्ग', children: 'बच्चे', patient: 'मरीज़', pregnant: 'गर्भवती', disabled: 'दिव्यांग',
  },
};

export const t = (lang, key) => T[lang]?.[key] || T.en[key] || key;