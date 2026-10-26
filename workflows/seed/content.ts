/**
 * Demo content for "Paxon (demo)". Capabilities, industries and wording come from paxon.com;
 * policy details (time windows, cut-off times, onboarding duration) are fictional.
 */

export const FAQS = [
  {
    _id: 'paxon-faq-receiving',
    topic: 'fulfillment',
    question: 'What happens when my inventory arrives at a Paxon warehouse?',
    answer:
      'Our team receives, counts and checks every inbound shipment against your advance shipping notice. Stock is put away and becomes available to sell in your Paxon portal within 48 hours of arrival.',
  },
  {
    _id: 'paxon-faq-pick-pack',
    topic: 'fulfillment',
    question: 'How fast are orders picked, packed and shipped?',
    answer:
      'Orders received before 2 p.m. local warehouse time are picked, packed and handed to the carrier the same business day. Orders received later ship the next business day.',
  },
  {
    _id: 'paxon-faq-kitting',
    topic: 'fulfillment',
    question: 'Can Paxon build gift sets, kits or subscription boxes?',
    answer:
      'Yes. Our kitting service assembles gift sets, bundles and subscription boxes to your specification, including inserts and branded packaging, as part of the pick and pack process.',
  },
  {
    _id: 'paxon-faq-returns',
    topic: 'returns',
    question: 'How long do customers have to return an order?',
    answer:
      'Your customers can return an order within 30 days of delivery. They start a return in your webshop and print a prepaid label; Paxon receives and inspects the item within 2 business days.',
  },
  {
    _id: 'paxon-faq-returns-value',
    topic: 'returns',
    question: 'What does Paxon do with returned products?',
    answer:
      'We turn returns into value: every returned item is inspected and graded, then restocked, refurbished or recycled. You see the outcome of each return in your Paxon portal.',
  },
  {
    _id: 'paxon-faq-shipping-options',
    topic: 'transportation',
    question: 'Which shipping options does Paxon offer?',
    answer:
      'Paxon Freight Management plans and executes parcel, LTL (less than truckload) and full truckload shipments, matched to the demands of each shipment.',
  },
  {
    _id: 'paxon-faq-delivery-times',
    topic: 'transportation',
    question: 'How long does delivery take?',
    answer:
      'Parcel deliveries typically arrive within 1 to 3 business days. LTL and full truckload transit times depend on the lane and are confirmed when the shipment is booked.',
  },
  {
    _id: 'paxon-faq-regulated',
    topic: 'regulated',
    question: 'Can Paxon handle temperature-sensitive or regulated health products?',
    answer:
      'Yes. Specialized & Regulated Logistics covers storage and fulfillment of temperature-sensitive and regulated items for health and wellness brands, with compliance handling and lot tracking.',
  },
  {
    _id: 'paxon-faq-commerce',
    topic: 'commerce',
    question: 'What are Paxon Commerce Solutions?',
    answer:
      'Paxon Commerce Solutions helps you optimize payments and stop fraud, so more legitimate orders reach fulfillment and fewer chargebacks reach you.',
  },
  {
    _id: 'paxon-faq-onboarding',
    topic: 'onboarding',
    question: 'How do I connect my webshop to Paxon?',
    answer:
      'Onboarding takes about four weeks. Your onboarding manager connects your webshop through one of our standard integrations, sets up your products and runs test orders before go-live.',
  },
  {
    _id: 'paxon-faq-api',
    topic: 'api',
    question: 'How do I get API access?',
    answer:
      'Ask your account manager for API credentials. You first receive a sandbox key to build and test against; production keys are issued after a successful test order.',
  },
  {
    _id: 'paxon-faq-industries',
    topic: 'fulfillment',
    question: 'Which industries does Paxon support?',
    answer:
      'Paxon supports health and wellness, fashion, beauty and cosmetics, consumer goods, home goods and consumer electronics brands.',
  },
]

export const GUIDELINES = [
  {
    _id: 'paxon-guideline-en',
    language: 'en',
    formality: 'neutral',
    requireHumanReview: false,
    tone: ['clear', 'confident', 'helpful'],
    instructions:
      'Write for busy webshop owners. Short sentences. Lead with the answer, then the detail.',
    useTerms: [
      {avoid: 'Transport Management', use: 'Freight Management'},
      {avoid: 'warehouse partner', use: 'logistics partner'},
    ],
  },
  {
    _id: 'paxon-guideline-nl',
    language: 'nl',
    formality: 'formal',
    requireHumanReview: false,
    tone: ['helder', 'betrouwbaar'],
    instructions: 'Spreek de klant aan met "u". Gebruik Belgisch-Nederlandse woordkeuze waar mogelijk.',
    useTerms: [
      {avoid: 'transportmanagement', use: 'vrachtmanagement'},
      {avoid: 'magazijnpartner', use: 'logistieke partner'},
    ],
  },
  {
    _id: 'paxon-guideline-fr',
    language: 'fr',
    formality: 'formal',
    requireHumanReview: true,
    tone: ['clair', 'professionnel'],
    instructions: 'Vouvoyez toujours le client. Évitez les anglicismes inutiles.',
    useTerms: [
      {avoid: 'gestion du transport', use: 'gestion du fret'},
      {avoid: 'pick and pack', use: 'préparation de commandes'},
    ],
  },
  {
    _id: 'paxon-guideline-de',
    language: 'de',
    formality: 'formal',
    requireHumanReview: true,
    tone: ['präzise', 'professionell'],
    instructions: 'Sprechen Sie den Kunden mit "Sie" an. Vermeiden Sie unnötige Anglizismen.',
    useTerms: [
      {avoid: 'Transportmanagement', use: 'Frachtmanagement'},
      {avoid: 'Retouren-Management', use: 'Retourenabwicklung'},
    ],
  },
]

export const GLOSSARY = [
  {_id: 'paxon-term-paxon', term: 'Paxon', status: 'approved', doNotTranslate: true, definition: 'Brand name.'},
  {
    _id: 'paxon-term-commerce',
    term: 'Paxon Commerce Solutions',
    status: 'approved',
    doNotTranslate: true,
    definition: 'Product name for payments and fraud services.',
  },
  {_id: 'paxon-term-ltl', term: 'LTL', status: 'approved', doNotTranslate: true, definition: 'Less than truckload.'},
  {_id: 'paxon-term-api', term: 'API', status: 'approved', doNotTranslate: true},
  {
    _id: 'paxon-term-freight',
    term: 'Freight Management',
    status: 'approved',
    definition: 'Paxon capability name for transportation planning and execution.',
    translations: [
      {language: 'nl', translation: 'vrachtmanagement'},
      {language: 'fr', translation: 'gestion du fret'},
      {language: 'de', translation: 'Frachtmanagement'},
    ],
  },
  {
    _id: 'paxon-term-pick-pack',
    term: 'pick and pack',
    status: 'approved',
    translations: [
      {language: 'nl', translation: 'orderpicking en verpakking'},
      {language: 'fr', translation: 'préparation de commandes'},
      {language: 'de', translation: 'Kommissionierung und Verpackung'},
    ],
  },
  {
    _id: 'paxon-term-kitting',
    term: 'kitting',
    status: 'approved',
    translations: [
      {language: 'nl', translation: 'kitting'},
      {language: 'fr', translation: 'kitting'},
      {language: 'de', translation: 'Kitting'},
    ],
  },
  {
    _id: 'paxon-term-transport-management',
    term: 'Transport Management',
    status: 'forbidden',
    definition: 'Old capability name. Use Freight Management.',
  },
]

/**
 * Incoming questions. The comments are the intended Knowledge Base outcome.
 */
export const QUESTIONS = [
  {
    // answered: covered by paxon-faq-regulated
    _id: 'paxon-question-1',
    channel: 'chatbot',
    market: 'BE',
    language: 'en',
    questionText: 'Can you store our vitamin supplements that need to stay below 25°C?',
  },
  {
    // outdated: FAQ says 30 days, the legacy brand page says 45 days
    _id: 'paxon-question-2',
    channel: 'contactCentre',
    market: 'NL',
    language: 'en',
    questionText:
      'One of your pages says my customers get 45 days to return, the help centre says 30. Which one is right?',
  },
  {
    // missing: no FAQ on peak-season cut-offs
    _id: 'paxon-question-3',
    channel: 'chatbot',
    market: 'FR',
    language: 'en',
    questionText: 'What are your order cut-off times during Black Friday and the December peak?',
  },
  {
    // answered: paxon-faq-shipping-options
    _id: 'paxon-question-4',
    channel: 'chatbot',
    market: 'FR',
    language: 'fr',
    questionText: 'Proposez-vous aussi des envois LTL pour les palettes ?',
  },
  {
    // answered: paxon-faq-api
    _id: 'paxon-question-5',
    channel: 'contactCentre',
    market: 'DE',
    language: 'de',
    questionText: 'Wie bekomme ich einen API-Schlüssel für unseren Shop?',
  },
  {
    // answered: paxon-faq-kitting
    _id: 'paxon-question-6',
    channel: 'chatbot',
    market: 'BE',
    language: 'nl',
    questionText: 'Kunnen jullie ook cadeausets samenstellen voor de feestdagen?',
  },
]
