import type { CurrencyCode } from '~/types/admin.types';

function getCurrencySign(currencyCode: CurrencyCode) {
  const currencySymbols = {
    AED: 'د.إ',
    AFN: '؋',
    ALL: 'L',
    AMD: '֏',
    ANG: 'ƒ',
    AOA: 'Kz',
    ARS: '$',
    AUD: '$',
    AWG: 'ƒ',
    AZN: '₼',
    BAM: 'KM',
    BBD: '$',
    BDT: '৳',
    BGN: 'лв',
    BHD: 'د.ب',
    BIF: 'FBu',
    BMD: '$',
    BND: '$',
    BOB: 'Bs',
    BRL: 'R$',
    BSD: '$',
    BTN: 'Nu.',
    BWP: 'P',
    BYN: 'Br',
    BYR: 'Br',
    BZD: '$',
    CAD: '$',
    CDF: 'Fr',
    CHF: 'CHF',
    CLP: '$',
    CNY: '¥',
    COP: '$',
    CRC: '₡',
    CVE: '$',
    CZK: 'Kč',
    DJF: 'Fr',
    DKK: 'kr',
    DOP: 'RD$',
    DZD: 'د.ج',
    EGP: 'ج.م',
    ERN: 'Nkf',
    ETB: 'Br',
    EUR: '€',
    FJD: '$',
    FKP: '£',
    GBP: '£',
    GEL: '₾',
    GHS: '₵',
    GIP: '£',
    GMD: 'D',
    GNF: 'Fr',
    GTQ: 'Q',
    GYD: '$',
    HKD: '$',
    HNL: 'L',
    HRK: 'kn',
    HTG: 'G',
    HUF: 'Ft',
    IDR: 'Rp',
    ILS: '₪',
    INR: '₹',
    IQD: 'ع.د',
    IRR: '﷼',
    ISK: 'kr',
    JEP: '£',
    JMD: '$',
    JOD: 'د.أ',
    JPY: '¥',
    KES: 'KSh',
    KGS: 'с',
    KHR: '៛',
    KID: '$',
    KMF: 'Fr',
    KRW: '₩',
    KWD: 'د.ك',
    KYD: '$',
    KZT: '₸',
    LAK: '₭',
    LBP: 'ل.ل',
    LKR: 'Rs',
    LRD: '$',
    LSL: 'L',
    LTL: 'Lt',
    LVL: 'Ls',
    LYD: 'ل.د',
    MAD: 'د.م.',
    MDL: 'L',
    MGA: 'Ar',
    MKD: 'ден',
    MMK: 'K',
    MNT: '₮',
    MOP: 'P',
    MRU: 'UM',
    MUR: '₨',
    MVR: 'ރ',
    MWK: 'MK',
    MXN: '$',
    MYR: 'RM',
    MZN: 'MT',
    NAD: '$',
    NGN: '₦',
    NIO: 'C$',
    NOK: 'kr',
    NPR: 'Rs',
    NZD: '$',
    OMR: '﷼',
    PAB: 'B/. ',
    PEN: 'S/.',
    PGK: 'K',
    PHP: '₱',
    PKR: '₨',
    PLN: 'zł',
    PYG: '₲',
    QAR: 'ر.ق',
    RON: 'lei',
    RSD: 'дин',
    RUB: '₽',
    RWF: 'FRw',
    SAR: 'ر.س',
    SBD: '$',
    SCR: '₨',
    SDG: 'ج.س',
    SEK: 'kr',
    SGD: '$',
    SHP: '£',
    SLL: 'Le',
    SOS: 'Sh',
    SRD: '$',
    SSP: '£',
    STD: 'Db',
    STN: 'Db',
    SYP: 'ل.س',
    SZL: 'E',
    THB: '฿',
    TJS: 'ЅМ',
    TMT: 'T',
    TND: 'د.ت',
    TOP: 'PT',
    TRY: '₺',
    TTD: 'TT$',
    TWD: 'NT$',
    TZS: 'TSh',
    UAH: '₴',
    UGX: 'USh',
    USD: '$',
    UYU: '$U',
    UZS: 'с',
    VED: 'Bs.S',
    VEF: 'Bs.F',
    VES: 'Bs.S',
    VND: '₫',
    VUV: 'Vt',
    WST: 'WS$',
    XAF: 'Fr',
    XCD: '$',
    XOF: 'Fr',
    XPF: 'Fr',
    XXX: 'XXX',
    YER: 'ر.ي',
    ZAR: 'R',
    ZMW: 'ZK',
  };
  const currencySign = currencySymbols[currencyCode];
  return currencySign;
}

export default getCurrencySign;
