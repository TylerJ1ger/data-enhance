from typing import Dict, Optional, Tuple

# 标准语言代码字典 (ISO 639-1/639-2)
# 格式: {语言代码: 语言名称}
VALID_LANGUAGE_CODES = {
    'ab': 'Abkhaz',
    'aa': 'Afar',
    'af': 'Afrikaans',
    'ak': 'Akan',
    'sq': 'Albanian',
    'am': 'Amharic',
    'ar': 'Arabic',
    'an': 'Aragonese',
    'hy': 'Armenian',
    'as': 'Assamese',
    'av': 'Avaric',
    'ae': 'Avestan',
    'ay': 'Aymara',
    'az': 'Azerbaijani',
    'bm': 'Bambara',
    'ba': 'Bashkir',
    'eu': 'Basque',
    'be': 'Belarusian',
    'bn': 'Bengali, Bangla',
    'bh': 'Bihari',
    'bi': 'Bislama',
    'bs': 'Bosnian',
    'br': 'Breton',
    'bg': 'Bulgarian',
    'my': 'Burmese',
    'ca': 'Catalan, Valencian',
    'ch': 'Chamorro',
    'ce': 'Chechen',
    'ny': 'Chichewa, Chewa, Nyanja',
    'zh': 'Chinese',
    'cv': 'Chuvash',
    'kw': 'Cornish',
    'co': 'Corsican',
    'cr': 'Cree',
    'hr': 'Croatian',
    'cs': 'Czech',
    'da': 'Danish',
    'dv': 'Divehi, Dhivehi, Maldivian',
    'nl': 'Dutch',
    'dz': 'Dzongkha',
    'en': 'English',
    'eo': 'Esperanto',
    'et': 'Estonian',
    'ee': 'Ewe',
    'fo': 'Faroese',
    'fj': 'Fijian',
    'fi': 'Finnish',
    'fr': 'French',
    'ff': 'Fula, Fulah, Pulaar, Pular',
    'gl': 'Galician',
    'ka': 'Georgian',
    'de': 'German',
    'el': 'Greek (modern)',
    'gn': 'Guaraní',
    'gu': 'Gujarati',
    'ht': 'Haitian, Haitian Creole',
    'ha': 'Hausa',
    'he': 'Hebrew (modern)',
    'hz': 'Herero',
    'hi': 'Hindi',
    'ho': 'Hiri Motu',
    'hu': 'Hungarian',
    'ia': 'Interlingua',
    'id': 'Indonesian',
    'ie': 'Interlingue',
    'ga': 'Irish',
    'ig': 'Igbo',
    'ik': 'Inupiaq',
    'io': 'Ido',
    'is': 'Icelandic',
    'it': 'Italian',
    'iu': 'Inuktitut',
    'ja': 'Japanese',
    'jv': 'Javanese',
    'kl': 'Kalaallisut, Greenlandic',
    'kn': 'Kannada',
    'kr': 'Kanuri',
    'ks': 'Kashmiri',
    'kk': 'Kazakh',
    'km': 'Khmer',
    'ki': 'Kikuyu, Gikuyu',
    'rw': 'Kinyarwanda',
    'ky': 'Kyrgyz',
    'kv': 'Komi',
    'kg': 'Kongo',
    'ko': 'Korean',
    'ku': 'Kurdish',
    'kj': 'Kwanyama, Kuanyama',
    'la': 'Latin',
    'lb': 'Luxembourgish, Letzeburgesch',
    'lg': 'Ganda',
    'li': 'Limburgish, Limburgan, Limburger',
    'ln': 'Lingala',
    'lo': 'Lao',
    'lt': 'Lithuanian',
    'lu': 'Luba-Katanga',
    'lv': 'Latvian',
    'gv': 'Manx',
    'mk': 'Macedonian',
    'mg': 'Malagasy',
    'ms': 'Malay',
    'ml': 'Malayalam',
    'mt': 'Maltese',
    'mi': 'Māori',
    'mr': 'Marathi (Marāṭhī)',
    'mh': 'Marshallese',
    'mn': 'Mongolian',
    'na': 'Nauru',
    'nv': 'Navajo, Navaho',
    'nd': 'Northern Ndebele',
    'ne': 'Nepali',
    'ng': 'Ndonga',
    'nb': 'Norwegian Bokmål',
    'nn': 'Norwegian Nynorsk',
    'no': 'Norwegian',
    'ii': 'Nuosu',
    'nr': 'Southern Ndebele',
    'oc': 'Occitan',
    'oj': 'Ojibwe, Ojibwa',
    'cu': 'Old Church Slavonic, Church Slavonic, Old Bulgarian',
    'om': 'Oromo',
    'or': 'Oriya',
    'os': 'Ossetian, Ossetic',
    'pa': 'Panjabi, Punjabi',
    'pi': 'Pāli',
    'fa': 'Persian (Farsi)',
    'pl': 'Polish',
    'ps': 'Pashto, Pushto',
    'pt': 'Portuguese',
    'qu': 'Quechua',
    'rm': 'Romansh',
    'rn': 'Kirundi',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sa': 'Sanskrit (Saṁskṛta)',
    'sc': 'Sardinian',
    'sd': 'Sindhi',
    'se': 'Northern Sami',
    'sm': 'Samoan',
    'sg': 'Sango',
    'sr': 'Serbian',
    'gd': 'Scottish Gaelic, Gaelic',
    'sn': 'Shona',
    'si': 'Sinhala, Sinhalese',
    'sk': 'Slovak',
    'sl': 'Slovene',
    'so': 'Somali',
    'st': 'Southern Sotho',
    'es': 'Spanish, Castilian',
    'su': 'Sundanese',
    'sw': 'Swahili',
    'ss': 'Swati',
    'sv': 'Swedish',
    'ta': 'Tamil',
    'te': 'Telugu',
    'tg': 'Tajik',
    'th': 'Thai',
    'ti': 'Tigrinya',
    'bo': 'Tibetan Standard, Tibetan, Central',
    'tk': 'Turkmen',
    'tl': 'Tagalog',
    'tn': 'Tswana',
    'to': 'Tonga (Tonga Islands)',
    'tr': 'Turkish',
    'ts': 'Tsonga',
    'tt': 'Tatar',
    'tw': 'Twi',
    'ty': 'Tahitian',
    'ug': 'Uyghur, Uighur',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'uz': 'Uzbek',
    've': 'Venda',
    'vi': 'Vietnamese',
    'vo': 'Volapük',
    'wa': 'Walloon',
    'cy': 'Welsh',
    'wo': 'Wolof',
    'fy': 'Western Frisian',
    'xh': 'Xhosa',
    'yi': 'Yiddish',
    'yo': 'Yoruba',
    'za': 'Zhuang, Chuang',
    'zu': 'Zulu',
}

# 标准区域/国家代码字典 (ISO 3166-1 alpha-2)
# 格式: {区域代码: 区域名称}
VALID_REGION_CODES = {
    'AF': 'Afghanistan',
    'AX': 'Åland Islands',
    'AL': 'Albania',
    'DZ': 'Algeria',
    'AS': 'American Samoa',
    'AD': 'Andorra',
    'AO': 'Angola',
    'AI': 'Anguilla',
    'AQ': 'Antarctica',
    'AG': 'Antigua and Barbuda',
    'AR': 'Argentina',
    'AM': 'Armenia',
    'AW': 'Aruba',
    'AU': 'Australia',
    'AT': 'Austria',
    'AZ': 'Azerbaijan',
    'BS': 'Bahamas',
    'BH': 'Bahrain',
    'BD': 'Bangladesh',
    'BB': 'Barbados',
    'BY': 'Belarus',
    'BE': 'Belgium',
    'BZ': 'Belize',
    'BJ': 'Benin',
    'BM': 'Bermuda',
    'BT': 'Bhutan',
    'BO': 'Bolivia, Plurinational State of',
    'BQ': 'Bonaire, Sint Eustatius and Saba',
    'BA': 'Bosnia and Herzegovina',
    'BW': 'Botswana',
    'BV': 'Bouvet Island',
    'BR': 'Brazil',
    'IO': 'British Indian Ocean Territory',
    'BN': 'Brunei Darussalam',
    'BG': 'Bulgaria',
    'BF': 'Burkina Faso',
    'BI': 'Burundi',
    'KH': 'Cambodia',
    'CM': 'Cameroon',
    'CA': 'Canada',
    'CV': 'Cabo Verde',
    'KY': 'Cayman Islands',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'CL': 'Chile',
    'CN': 'China',
    'CX': 'Christmas Island',
    'CC': 'Cocos (Keeling) Islands',
    'CO': 'Colombia',
    'KM': 'Comoros',
    'CG': 'Congo',
    'CD': 'Congo, the Democratic Republic of the',
    'CK': 'Cook Islands',
    'CR': 'Costa Rica',
    'CI': 'Côte d\'Ivoire',
    'HR': 'Croatia',
    'CU': 'Cuba',
    'CW': 'Curaçao',
    'CY': 'Cyprus',
    'CZ': 'Czech Republic',
    'DK': 'Denmark',
    'DJ': 'Djibouti',
    'DM': 'Dominica',
    'DO': 'Dominican Republic',
    'EC': 'Ecuador',
    'EG': 'Egypt',
    'SV': 'El Salvador',
    'GQ': 'Equatorial Guinea',
    'ER': 'Eritrea',
    'EE': 'Estonia',
    'ET': 'Ethiopia',
    'FK': 'Falkland Islands (Malvinas)',
    'FO': 'Faroe Islands',
    'FJ': 'Fiji',
    'FI': 'Finland',
    'FR': 'France',
    'GF': 'French Guiana',
    'PF': 'French Polynesia',
    'TF': 'French Southern Territories',
    'GA': 'Gabon',
    'GM': 'Gambia',
    'GE': 'Georgia',
    'DE': 'Germany',
    'GH': 'Ghana',
    'GI': 'Gibraltar',
    'GR': 'Greece',
    'GL': 'Greenland',
    'GD': 'Grenada',
    'GP': 'Guadeloupe',
    'GU': 'Guam',
    'GT': 'Guatemala',
    'GG': 'Guernsey',
    'GN': 'Guinea',
    'GW': 'Guinea-Bissau',
    'GY': 'Guyana',
    'HT': 'Haiti',
    'HM': 'Heard Island and McDonald Islands',
    'VA': 'Holy See (Vatican City State)',
    'HN': 'Honduras',
    'HK': 'Hong Kong',
    'HU': 'Hungary',
    'IS': 'Iceland',
    'IN': 'India',
    'ID': 'Indonesia',
    'IR': 'Iran, Islamic Republic of',
    'IQ': 'Iraq',
    'IE': 'Ireland',
    'IM': 'Isle of Man',
    'IL': 'Israel',
    'IT': 'Italy',
    'JM': 'Jamaica',
    'JP': 'Japan',
    'JE': 'Jersey',
    'JO': 'Jordan',
    'KZ': 'Kazakhstan',
    'KE': 'Kenya',
    'KI': 'Kiribati',
    'KP': 'Korea, Democratic People\'s Republic of',
    'KR': 'Korea, Republic of',
    'KW': 'Kuwait',
    'KG': 'Kyrgyzstan',
    'LA': 'Lao People\'s Democratic Republic',
    'LV': 'Latvia',
    'LB': 'Lebanon',
    'LS': 'Lesotho',
    'LR': 'Liberia',
    'LY': 'Libya',
    'LI': 'Liechtenstein',
    'LT': 'Lithuania',
    'LU': 'Luxembourg',
    'MO': 'Macao',
    'MK': 'Macedonia, the former Yugoslav Republic of',
    'MG': 'Madagascar',
    'MW': 'Malawi',
    'MY': 'Malaysia',
    'MV': 'Maldives',
    'ML': 'Mali',
    'MT': 'Malta',
    'MH': 'Marshall Islands',
    'MQ': 'Martinique',
    'MR': 'Mauritania',
    'MU': 'Mauritius',
    'YT': 'Mayotte',
    'MX': 'Mexico',
    'FM': 'Micronesia, Federated States of',
    'MD': 'Moldova, Republic of',
    'MC': 'Monaco',
    'MN': 'Mongolia',
    'ME': 'Montenegro',
    'MS': 'Montserrat',
    'MA': 'Morocco',
    'MZ': 'Mozambique',
    'MM': 'Myanmar',
    'NA': 'Namibia',
    'NR': 'Nauru',
    'NP': 'Nepal',
    'NL': 'Netherlands',
    'NC': 'New Caledonia',
    'NZ': 'New Zealand',
    'NI': 'Nicaragua',
    'NE': 'Niger',
    'NG': 'Nigeria',
    'NU': 'Niue',
    'NF': 'Norfolk Island',
    'MP': 'Northern Mariana Islands',
    'NO': 'Norway',
    'OM': 'Oman',
    'PK': 'Pakistan',
    'PW': 'Palau',
    'PS': 'Palestine, State of',
    'PA': 'Panama',
    'PG': 'Papua New Guinea',
    'PY': 'Paraguay',
    'PE': 'Peru',
    'PH': 'Philippines',
    'PN': 'Pitcairn',
    'PL': 'Poland',
    'PT': 'Portugal',
    'PR': 'Puerto Rico',
    'QA': 'Qatar',
    'RE': 'Réunion',
    'RO': 'Romania',
    'RU': 'Russian Federation',
    'RW': 'Rwanda',
    'BL': 'Saint Barthélemy',
    'SH': 'Saint Helena, Ascension and Tristan da Cunha',
    'KN': 'Saint Kitts and Nevis',
    'LC': 'Saint Lucia',
    'MF': 'Saint Martin (French part)',
    'PM': 'Saint Pierre and Miquelon',
    'VC': 'Saint Vincent and the Grenadines',
    'WS': 'Samoa',
    'SM': 'San Marino',
    'ST': 'Sao Tome and Principe',
    'SA': 'Saudi Arabia',
    'SN': 'Senegal',
    'RS': 'Serbia',
    'SC': 'Seychelles',
    'SL': 'Sierra Leone',
    'SG': 'Singapore',
    'SX': 'Sint Maarten (Dutch part)',
    'SK': 'Slovakia',
    'SI': 'Slovenia',
    'SB': 'Solomon Islands',
    'SO': 'Somalia',
    'ZA': 'South Africa',
    'GS': 'South Georgia and the South Sandwich Islands',
    'SS': 'South Sudan',
    'ES': 'Spain',
    'LK': 'Sri Lanka',
    'SD': 'Sudan',
    'SR': 'Suriname',
    'SJ': 'Svalbard and Jan Mayen',
    'SZ': 'Swaziland',
    'SE': 'Sweden',
    'CH': 'Switzerland',
    'SY': 'Syrian Arab Republic',
    'TW': 'Taiwan, Province of China',
    'TJ': 'Tajikistan',
    'TZ': 'Tanzania, United Republic of',
    'TH': 'Thailand',
    'TL': 'Timor-Leste',
    'TG': 'Togo',
    'TK': 'Tokelau',
    'TO': 'Tonga',
    'TT': 'Trinidad and Tobago',
    'TN': 'Tunisia',
    'TR': 'Turkey',
    'TM': 'Turkmenistan',
    'TC': 'Turks and Caicos Islands',
    'TV': 'Tuvalu',
    'UG': 'Uganda',
    'UA': 'Ukraine',
    'AE': 'United Arab Emirates',
    'GB': 'United Kingdom',
    'US': 'United States',
    'UM': 'United States Minor Outlying Islands',
    'UY': 'Uruguay',
    'UZ': 'Uzbekistan',
    'VU': 'Vanuatu',
    'VE': 'Venezuela, Bolivarian Republic of',
    'VN': 'Viet Nam',
    'VG': 'Virgin Islands, British',
    'VI': 'Virgin Islands, U.S.',
    'WF': 'Wallis and Futuna',
    'EH': 'Western Sahara',
    'YE': 'Yemen',
    'ZM': 'Zambia',
    'ZW': 'Zimbabwe'
}

RECOMMENDED_COMBINATIONS = {
    'en-US', 'en-GB', 'en-CA', 'en-AU',
    'es-ES', 'es-MX', 'es-AR',
    'fr-FR', 'fr-CA',
    'de-DE', 'de-AT',
    'pt-BR', 'pt-PT',
    'zh-CN', 'zh-TW', 'zh-HK',
    'ja-JP',
    'ko-KR',
    'ar-SA', 'ar-EG'
}

def parse_hreflang_code(code: str) -> Tuple[Optional[str], Optional[str]]:
    if not code or not isinstance(code, str):
        return None, None
    
    code = code.strip()
    
    # 特殊情况：x-default
    if code == 'x-default':
        return 'x-default', None
    
    # 分割语言和区域
    if '-' in code:
        parts = code.split('-')
        if len(parts) == 2:
            return parts[0], parts[1]
        else:
            # 超过两部分，不符合标准
            return None, None
    else:
        # 只有语言代码
        return code, None

def is_valid_hreflang(code: str) -> bool:
    language, region = parse_hreflang_code(code)
    
    if not language:
        return False
    
    # 特殊情况：x-default
    if language == 'x-default':
        return True
    
    # 检查语言代码（允许大小写变化）
    if language.lower() not in VALID_LANGUAGE_CODES:
        return False
    
    # 如果有区域代码，检查区域代码（允许大小写变化）
    if region:
        if region.upper() not in VALID_REGION_CODES:
            return False
    
    return True

def is_standard_hreflang_format(code: str) -> bool:
    language, region = parse_hreflang_code(code)
    
    if not language:
        return False
    
    # 特殊情况：x-default
    if language == 'x-default':
        return True
    
    # 检查语言代码格式（必须小写）
    if language != language.lower():
        return False
    
    # 检查语言代码是否有效
    if language not in VALID_LANGUAGE_CODES:
        return False
    
    # 如果有区域代码，检查格式（必须大写）
    if region:
        if region != region.upper():
            return False
        
        # 检查区域代码是否有效
        if region not in VALID_REGION_CODES:
            return False
    
    return True

def suggest_standard_hreflang_format(code: str) -> Optional[str]:
    language, region = parse_hreflang_code(code)
    
    if not language:
        return None
    
    # 特殊情况：x-default
    if language == 'x-default':
        return code
    
    # 转换为标准格式
    standard_language = language.lower()
    
    # 检查语言代码是否有效
    if standard_language not in VALID_LANGUAGE_CODES:
        return None
    
    if region:
        standard_region = region.upper()
        
        # 检查区域代码是否有效
        if standard_region not in VALID_REGION_CODES:
            return None
        
        return f"{standard_language}-{standard_region}"
    else:
        return standard_language

def is_recommended_combination(code: str) -> bool:
    if not is_standard_hreflang_format(code):
        return False
    
    return code in RECOMMENDED_COMBINATIONS or code == 'x-default'

def get_hreflang_validation_result(code: str) -> Dict[str, any]:
    language, region = parse_hreflang_code(code)
    is_valid = is_valid_hreflang(code)
    is_standard = is_standard_hreflang_format(code)
    suggested_format = suggest_standard_hreflang_format(code)
    is_recommended = is_recommended_combination(code) if is_standard else False
    
    return {
        'original_code': code,
        'language_code': language,
        'region_code': region,
        'is_valid': is_valid,
        'is_standard_format': is_standard,
        'is_recommended_combination': is_recommended,
        'suggested_format': suggested_format,
        'needs_format_improvement': is_valid and not is_standard,
        'language_name': VALID_LANGUAGE_CODES.get(language.lower()) if language and language != 'x-default' else None,
        'region_name': VALID_REGION_CODES.get(region.upper()) if region else None
    }

def get_language_info(language_code: str) -> Optional[str]:
    return VALID_LANGUAGE_CODES.get(language_code.lower())

def get_region_info(region_code: str) -> Optional[str]:
    return VALID_REGION_CODES.get(region_code.upper())

def validate_hreflang_list(codes: list) -> Dict[str, list]:
    result = {
        'valid_standard': [],
        'valid_non_standard': [], 
        'invalid': [],
        'duplicates': []
    }
    
    seen_codes = set()
    
    for code in codes:
        if code in seen_codes:
            result['duplicates'].append(code)
            continue
        seen_codes.add(code)
        
        validation = get_hreflang_validation_result(code)
        
        if not validation['is_valid']:
            result['invalid'].append(code)
        elif validation['is_standard_format']:
            result['valid_standard'].append(code)
        else:
            result['valid_non_standard'].append(code)
    
    return result