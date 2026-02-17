export type InvoiceLanguage = 'en' | 'ru' | 'ka' | 'tr';

export interface InvoiceLabels {
  // Header
  invoice: string;
  transportInvoice: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  language: string;
  documentType: string;

  // Company
  companySeller: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  bankAccounts: string;
  identificationCode: string;
  bankCode: string;
  accountNumber: string;

  // Buyer
  buyerClient: string;
  clientName: string;
  billTo: string;

  // Line items
  lineItems: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  measurementUnit: string;
  addItem: string;

  // Totals
  totals: string;
  subtotal: string;
  taxRate: string;
  tax: string;
  amount: string;

  // Notes
  notesAndTerms: string;
  paymentTerms: string;
  notes: string;
  paymentDetails: string;

  // Transport
  transportInfo: string;
  transportRoute: string;
  vehicleModel: string;
  vehiclePlate: string;
  trailerPlate: string;
  serviceDescription: string;
  directorName: string;
  amountInWords: string;

  // Signature
  signatureAndStamp: string;
  signature: string;
  stamp: string;
  signerName: string;

  // Placeholders (transport section)
  placeholderServiceDescription: string;
  placeholderTransportRoute: string;
  placeholderSelectTruck: string;
  placeholderVehicleModel: string;
  placeholderVehiclePlate: string;
  placeholderSelectTrailer: string;
  placeholderTrailerPlate: string;
  placeholderDirectorName: string;
  placeholderAmountInWords: string;

  // Template
  template: string;
  templateClassic: string;
  templateModern: string;
  templateMinimal: string;
  templateBold: string;
  templateCompact: string;

  // Auto-fill
  autoFill: string;
}

const en: InvoiceLabels = {
  invoice: 'Invoice',
  transportInvoice: 'Transport Invoice',
  invoiceNumber: 'Invoice Number',
  invoiceDate: 'Invoice Date',
  dueDate: 'Due Date',
  currency: 'Currency',
  language: 'Language',
  documentType: 'Document Type',

  companySeller: 'Company / Seller',
  companyName: 'Company Name',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  taxId: 'Tax ID',
  bankAccounts: 'Bank Accounts',
  identificationCode: 'Identification Code',
  bankCode: 'Bank Code',
  accountNumber: 'Account Number',

  buyerClient: 'Buyer / Client',
  clientName: 'Client Name',
  billTo: 'Bill To',

  lineItems: 'Line Items',
  description: 'Description',
  quantity: 'Qty',
  unitPrice: 'Unit Price',
  total: 'Total',
  measurementUnit: 'Unit',
  addItem: 'Add Item',

  totals: 'Totals',
  subtotal: 'Subtotal',
  taxRate: 'Tax Rate',
  tax: 'Tax',
  amount: 'Amount',

  notesAndTerms: 'Notes & Terms',
  paymentTerms: 'Payment Terms',
  notes: 'Notes',
  paymentDetails: 'Payment Details',

  transportInfo: 'Transport Information',
  transportRoute: 'Transport Route',
  vehicleModel: 'Vehicle Model',
  vehiclePlate: 'Vehicle Plate',
  trailerPlate: 'Trailer Plate',
  serviceDescription: 'Service Description',
  directorName: 'Director Name',
  amountInWords: 'Amount in Words',

  signatureAndStamp: 'Signature & Stamp',
  signature: 'Signature',
  stamp: 'Stamp',
  signerName: 'Signer Name',

  placeholderServiceDescription: 'Transportation of goods from...',
  placeholderTransportRoute: 'City A — City B',
  placeholderSelectTruck: 'Select truck...',
  placeholderVehicleModel: 'Mercedes Actros 1845',
  placeholderVehiclePlate: 'ABC-123',
  placeholderSelectTrailer: 'Select trailer...',
  placeholderTrailerPlate: 'XYZ-789',
  placeholderDirectorName: 'John Smith',
  placeholderAmountInWords: 'One thousand two hundred...',

  template: 'Template',
  templateClassic: 'Classic',
  templateModern: 'Modern',
  templateMinimal: 'Minimal',
  templateBold: 'Bold',
  templateCompact: 'Compact',
  autoFill: 'Auto-fill',
};

const ru: InvoiceLabels = {
  invoice: 'Счёт-фактура',
  transportInvoice: 'Транспортная накладная',
  invoiceNumber: 'Номер счёта',
  invoiceDate: 'Дата счёта',
  dueDate: 'Срок оплаты',
  currency: 'Валюта',
  language: 'Язык',
  documentType: 'Тип документа',

  companySeller: 'Компания / Продавец',
  companyName: 'Название компании',
  address: 'Адрес',
  phone: 'Телефон',
  email: 'Эл. почта',
  taxId: 'ИНН',
  bankAccounts: 'Банковские реквизиты',
  identificationCode: 'Идентификационный код',
  bankCode: 'Код банка',
  accountNumber: 'Номер счёта',

  buyerClient: 'Покупатель / Клиент',
  clientName: 'Имя клиента',
  billTo: 'Плательщик',

  lineItems: 'Позиции',
  description: 'Описание',
  quantity: 'Кол-во',
  unitPrice: 'Цена за ед.',
  total: 'Итого',
  measurementUnit: 'Ед. изм.',
  addItem: 'Добавить позицию',

  totals: 'Итоги',
  subtotal: 'Подитог',
  taxRate: 'Ставка налога',
  tax: 'Налог',
  amount: 'Сумма',

  notesAndTerms: 'Примечания и условия',
  paymentTerms: 'Условия оплаты',
  notes: 'Примечания',
  paymentDetails: 'Реквизиты для оплаты',

  transportInfo: 'Информация о перевозке',
  transportRoute: 'Маршрут перевозки',
  vehicleModel: 'Модель транспортного средства',
  vehiclePlate: 'Номер транспортного средства',
  trailerPlate: 'Номер прицепа',
  serviceDescription: 'Описание услуги',
  directorName: 'Имя директора',
  amountInWords: 'Сумма прописью',

  signatureAndStamp: 'Подпись и печать',
  signature: 'Подпись',
  stamp: 'Печать',
  signerName: 'Имя подписанта',

  placeholderServiceDescription: 'Перевозка грузов из...',
  placeholderTransportRoute: 'Город А — Город Б',
  placeholderSelectTruck: 'Выберите грузовик...',
  placeholderVehicleModel: 'Mercedes Actros 1845',
  placeholderVehiclePlate: 'А123БВ777',
  placeholderSelectTrailer: 'Выберите прицеп...',
  placeholderTrailerPlate: 'АВ1234 77',
  placeholderDirectorName: 'Иванов Иван',
  placeholderAmountInWords: 'Одна тысяча двести...',

  template: 'Шаблон',
  templateClassic: 'Классический',
  templateModern: 'Современный',
  templateMinimal: 'Минимальный',
  templateBold: 'Жирный',
  templateCompact: 'Компактный',
  autoFill: 'Автозаполнение',
};

const ka: InvoiceLabels = {
  invoice: 'ინვოისი',
  transportInvoice: 'სატრანსპორტო ინვოისი',
  invoiceNumber: 'ინვოისის ნომერი',
  invoiceDate: 'ინვოისის თარიღი',
  dueDate: 'გადახდის ვადა',
  currency: 'ვალუტა',
  language: 'ენა',
  documentType: 'დოკუმენტის ტიპი',

  companySeller: 'კომპანია / გამყიდველი',
  companyName: 'კომპანიის სახელი',
  address: 'მისამართი',
  phone: 'ტელეფონი',
  email: 'ელ. ფოსტა',
  taxId: 'საიდენტიფიკაციო კოდი',
  bankAccounts: 'საბანკო რეკვიზიტები',
  identificationCode: 'საიდენტიფიკაციო კოდი',
  bankCode: 'ბანკის კოდი',
  accountNumber: 'ანგარიშის ნომერი',

  buyerClient: 'მყიდველი / კლიენტი',
  clientName: 'კლიენტის სახელი',
  billTo: 'გადამხდელი',

  lineItems: 'პოზიციები',
  description: 'აღწერა',
  quantity: 'რაოდ.',
  unitPrice: 'ერთეულის ფასი',
  total: 'ჯამი',
  measurementUnit: 'ერთ.',
  addItem: 'პოზიციის დამატება',

  totals: 'ჯამები',
  subtotal: 'ქვეჯამი',
  taxRate: 'გადასახადის განაკვეთი',
  tax: 'გადასახადი',
  amount: 'თანხა',

  notesAndTerms: 'შენიშვნები და პირობები',
  paymentTerms: 'გადახდის პირობები',
  notes: 'შენიშვნები',
  paymentDetails: 'გადახდის რეკვიზიტები',

  transportInfo: 'ტრანსპორტირების ინფორმაცია',
  transportRoute: 'ტრანსპორტირების მარშრუტი',
  vehicleModel: 'ავტომობილის მოდელი',
  vehiclePlate: 'ავტომობილის ნომერი',
  trailerPlate: 'მისაბმელის ნომერი',
  serviceDescription: 'მომსახურების აღწერა',
  directorName: 'დირექტორის სახელი',
  amountInWords: 'თანხა სიტყვიერად',

  signatureAndStamp: 'ხელმოწერა და ბეჭედი',
  signature: 'ხელმოწერა',
  stamp: 'ბეჭედი',
  signerName: 'ხელმომწერის სახელი',

  placeholderServiceDescription: 'ტვირთის გადაზიდვა...',
  placeholderTransportRoute: 'ქალაქი A — ქალაქი B',
  placeholderSelectTruck: 'აირჩიეთ სატვირთო...',
  placeholderVehicleModel: 'Mercedes Actros 1845',
  placeholderVehiclePlate: 'ABC-123',
  placeholderSelectTrailer: 'აირჩიეთ მისაბმელი...',
  placeholderTrailerPlate: 'XYZ-789',
  placeholderDirectorName: 'სახელი გვარი',
  placeholderAmountInWords: 'ერთი ათას ორასი...',

  template: 'შაბლონი',
  templateClassic: 'კლასიკური',
  templateModern: 'თანამედროვე',
  templateMinimal: 'მინიმალისტური',
  templateBold: 'მუქი',
  templateCompact: 'კომპაქტური',
  autoFill: 'ავტომატური შევსება',
};

const tr: InvoiceLabels = {
  invoice: 'Fatura',
  transportInvoice: 'Nakliye Faturası',
  invoiceNumber: 'Fatura Numarası',
  invoiceDate: 'Fatura Tarihi',
  dueDate: 'Vade Tarihi',
  currency: 'Para Birimi',
  language: 'Dil',
  documentType: 'Belge Türü',

  companySeller: 'Firma / Satıcı',
  companyName: 'Firma Adı',
  address: 'Adres',
  phone: 'Telefon',
  email: 'E-posta',
  taxId: 'Vergi Numarası',
  bankAccounts: 'Banka Hesapları',
  identificationCode: 'Kimlik Kodu',
  bankCode: 'Banka Kodu',
  accountNumber: 'Hesap Numarası',

  buyerClient: 'Alıcı / Müşteri',
  clientName: 'Müşteri Adı',
  billTo: 'Fatura Adresi',

  lineItems: 'Kalemler',
  description: 'Açıklama',
  quantity: 'Miktar',
  unitPrice: 'Birim Fiyat',
  total: 'Toplam',
  measurementUnit: 'Birim',
  addItem: 'Kalem Ekle',

  totals: 'Toplamlar',
  subtotal: 'Ara Toplam',
  taxRate: 'Vergi Oranı',
  tax: 'Vergi',
  amount: 'Tutar',

  notesAndTerms: 'Notlar ve Koşullar',
  paymentTerms: 'Ödeme Koşulları',
  notes: 'Notlar',
  paymentDetails: 'Ödeme Bilgileri',

  transportInfo: 'Nakliye Bilgileri',
  transportRoute: 'Nakliye Güzergahı',
  vehicleModel: 'Araç Modeli',
  vehiclePlate: 'Araç Plakası',
  trailerPlate: 'Römork Plakası',
  serviceDescription: 'Hizmet Açıklaması',
  directorName: 'Müdür Adı',
  amountInWords: 'Yazıyla Tutar',

  signatureAndStamp: 'İmza ve Mühür',
  signature: 'İmza',
  stamp: 'Mühür',
  signerName: 'İmza Sahibi',

  placeholderServiceDescription: 'Mal taşımacılığı...',
  placeholderTransportRoute: 'Şehir A — Şehir B',
  placeholderSelectTruck: 'Kamyon seçin...',
  placeholderVehicleModel: 'Mercedes Actros 1845',
  placeholderVehiclePlate: '34 ABC 123',
  placeholderSelectTrailer: 'Römork seçin...',
  placeholderTrailerPlate: '34 XYZ 789',
  placeholderDirectorName: 'Ad Soyad',
  placeholderAmountInWords: 'Bin iki yüz...',

  template: 'Şablon',
  templateClassic: 'Klasik',
  templateModern: 'Modern',
  templateMinimal: 'Minimal',
  templateBold: 'Kalın',
  templateCompact: 'Kompakt',
  autoFill: 'Otomatik Doldur',
};

const TRANSLATIONS: Record<InvoiceLanguage, InvoiceLabels> = {
  en,
  ru,
  ka,
  tr,
};

export const INVOICE_LANGUAGES: { value: InvoiceLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'ka', label: 'ქართული' },
  { value: 'tr', label: 'Türkçe' },
];

export function getInvoiceLabels(lang: InvoiceLanguage): InvoiceLabels {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}
