"""
Hreflang validation and processing utilities for SEO analysis.

This module provides comprehensive support for validating and processing hreflang attributes
according to HTML5 and Google's SEO guidelines. It includes validation for ISO 639-1/639-2 
language codes and ISO 3166-1 alpha-2 country/region codes.

Features:
- Language and region code validation
- Format standardization 
- Recommended combination checking
- Batch validation utilities
- Detailed validation reporting

Author: SEO Analysis Tool
Version: 2.0.0 (Refactored)
"""

from typing import Dict, Optional, Tuple, List, Set, Any

# =============================================================================
# CONSTANTS AND REFERENCE DATA
# =============================================================================

# Standard language codes dictionary (ISO 639-1/639-2)
# Format: {language_code: language_name}
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

# Standard region/country codes dictionary (ISO 3166-1 alpha-2)
# Format: {region_code: region_name}
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

# Commonly recommended language-region combinations for better SEO
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

# =============================================================================
# CORE PARSING AND VALIDATION FUNCTIONS
# =============================================================================

def parse_hreflang_code(code: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse an hreflang code into language and region components.
    
    Args:
        code: The hreflang code to parse (e.g., 'en-US', 'zh', 'x-default')
        
    Returns:
        Tuple of (language_code, region_code). Region code may be None.
        Returns (None, None) if parsing fails.
        
    Examples:
        >>> parse_hreflang_code('en-US')
        ('en', 'US')
        >>> parse_hreflang_code('zh')
        ('zh', None)
        >>> parse_hreflang_code('x-default')
        ('x-default', None)
    """
    if not code or not isinstance(code, str):
        return None, None
    
    code = code.strip()
    
    # Special case: x-default
    if code == 'x-default':
        return 'x-default', None
    
    # Split language and region
    if '-' in code:
        parts = code.split('-')
        if len(parts) == 2:
            return parts[0], parts[1]
        else:
            # More than two parts, doesn't follow standard
            return None, None
    else:
        # Only language code
        return code, None


def is_valid_hreflang(code: str) -> bool:
    """
    Check if an hreflang code is valid according to standards.
    
    Validates both the language code (ISO 639-1/639-2) and region code (ISO 3166-1).
    Case variations are accepted but must follow the pattern of lowercase language
    and uppercase region.
    
    Args:
        code: The hreflang code to validate
        
    Returns:
        True if the code is valid, False otherwise
        
    Examples:
        >>> is_valid_hreflang('en-US')
        True
        >>> is_valid_hreflang('EN-us')  # Wrong case but valid
        True
        >>> is_valid_hreflang('invalid-XX')
        False
    """
    language, region = parse_hreflang_code(code)
    
    if not language:
        return False
    
    # Special case: x-default
    if language == 'x-default':
        return True
    
    # Check language code (allow case variations)
    if language.lower() not in VALID_LANGUAGE_CODES:
        return False
    
    # If there's a region code, check it (allow case variations)
    if region:
        if region.upper() not in VALID_REGION_CODES:
            return False
    
    return True


def is_standard_hreflang_format(code: str) -> bool:
    """
    Check if an hreflang code follows the standard format exactly.
    
    Standard format requires:
    - Language code in lowercase
    - Region code in uppercase  
    - Proper hyphen separation
    - Valid ISO codes
    
    Args:
        code: The hreflang code to check
        
    Returns:
        True if the code follows standard format exactly
        
    Examples:
        >>> is_standard_hreflang_format('en-US')
        True
        >>> is_standard_hreflang_format('EN-us')  # Wrong case
        False
    """
    language, region = parse_hreflang_code(code)
    
    if not language:
        return False
    
    # Special case: x-default
    if language == 'x-default':
        return True
    
    # Check language code format (must be lowercase)
    if language != language.lower():
        return False
    
    # Check language code validity
    if language not in VALID_LANGUAGE_CODES:
        return False
    
    # If there's a region code, check format (must be uppercase)
    if region:
        if region != region.upper():
            return False
        
        # Check region code validity
        if region not in VALID_REGION_CODES:
            return False
    
    return True


def suggest_standard_hreflang_format(code: str) -> Optional[str]:
    """
    Suggest the standard format for a given hreflang code.
    
    Attempts to correct case issues and format problems while maintaining
    the original language-region combination.
    
    Args:
        code: The hreflang code to standardize
        
    Returns:
        Standardized hreflang code, or None if invalid
        
    Examples:
        >>> suggest_standard_hreflang_format('EN-us')
        'en-US'
        >>> suggest_standard_hreflang_format('zh-cn')
        'zh-CN'
        >>> suggest_standard_hreflang_format('invalid')
        None
    """
    language, region = parse_hreflang_code(code)
    
    if not language:
        return None
    
    # Special case: x-default
    if language == 'x-default':
        return code
    
    # Convert to standard format
    standard_language = language.lower()
    
    # Check language code validity
    if standard_language not in VALID_LANGUAGE_CODES:
        return None
    
    if region:
        standard_region = region.upper()
        
        # Check region code validity
        if standard_region not in VALID_REGION_CODES:
            return None
        
        return f"{standard_language}-{standard_region}"
    else:
        return standard_language


def is_recommended_combination(code: str) -> bool:
    """
    Check if an hreflang code represents a commonly recommended combination.
    
    Args:
        code: The hreflang code to check
        
    Returns:
        True if the combination is commonly recommended for SEO
    """
    if not is_standard_hreflang_format(code):
        return False
    
    return code in RECOMMENDED_COMBINATIONS or code == 'x-default'

# =============================================================================
# COMPREHENSIVE VALIDATION AND REPORTING
# =============================================================================

def get_hreflang_validation_result(code: str) -> Dict[str, Any]:
    """
    Get comprehensive validation results for an hreflang code.
    
    Provides detailed analysis including validity, format compliance,
    recommendations, and human-readable information.
    
    Args:
        code: The hreflang code to analyze
        
    Returns:
        Dictionary containing comprehensive validation results
        
    Example:
        >>> result = get_hreflang_validation_result('en-US')
        >>> result['is_valid']
        True
        >>> result['language_name']
        'English'
    """
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


def validate_hreflang_list(codes: List[str]) -> Dict[str, List[str]]:
    """
    Validate a list of hreflang codes and categorize them.
    
    Processes multiple hreflang codes and groups them by validation status.
    Also identifies duplicate entries which can cause SEO issues.
    
    Args:
        codes: List of hreflang codes to validate
        
    Returns:
        Dictionary with categorized validation results:
        - valid_standard: Codes that are valid and properly formatted
        - valid_non_standard: Codes that are valid but poorly formatted  
        - invalid: Codes that are completely invalid
        - duplicates: Codes that appear multiple times
        
    Example:
        >>> codes = ['en-US', 'EN-us', 'invalid', 'en-US']
        >>> result = validate_hreflang_list(codes)
        >>> result['valid_standard']
        ['en-US']
        >>> result['duplicates']
        ['en-US']
    """
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

# =============================================================================
# UTILITY FUNCTIONS FOR LANGUAGE AND REGION INFORMATION
# =============================================================================

def get_language_info(language_code: str) -> Optional[str]:
    """
    Get the full name of a language from its ISO code.
    
    Args:
        language_code: ISO 639-1/639-2 language code
        
    Returns:
        Full language name, or None if not found
        
    Example:
        >>> get_language_info('en')
        'English'
        >>> get_language_info('zh')
        'Chinese'
    """
    return VALID_LANGUAGE_CODES.get(language_code.lower())


def get_region_info(region_code: str) -> Optional[str]:
    """
    Get the full name of a region/country from its ISO code.
    
    Args:
        region_code: ISO 3166-1 alpha-2 region/country code
        
    Returns:
        Full region/country name, or None if not found
        
    Example:
        >>> get_region_info('US')
        'United States'
        >>> get_region_info('CN')
        'China'
    """
    return VALID_REGION_CODES.get(region_code.upper())


def get_all_language_codes() -> Set[str]:
    """
    Get all valid language codes.
    
    Returns:
        Set of all valid ISO 639-1/639-2 language codes
    """
    return set(VALID_LANGUAGE_CODES.keys())


def get_all_region_codes() -> Set[str]:
    """
    Get all valid region codes.
    
    Returns:
        Set of all valid ISO 3166-1 alpha-2 region codes
    """
    return set(VALID_REGION_CODES.keys())


def get_recommended_combinations() -> Set[str]:
    """
    Get all recommended language-region combinations.
    
    Returns:
        Set of recommended hreflang combinations for SEO
    """
    return RECOMMENDED_COMBINATIONS.copy()

# =============================================================================
# BATCH PROCESSING AND ANALYSIS FUNCTIONS
# =============================================================================

def analyze_hreflang_implementation(codes: List[str]) -> Dict[str, Any]:
    """
    Analyze an entire hreflang implementation for SEO compliance.
    
    Provides comprehensive analysis including coverage, issues, and recommendations
    for a complete set of hreflang codes typically found on a website.
    
    Args:
        codes: List of all hreflang codes from a website
        
    Returns:
        Detailed analysis report with recommendations
    """
    if not codes:
        return {
            'total_codes': 0,
            'has_x_default': False,
            'issues': ['No hreflang codes found'],
            'recommendations': ['Add hreflang implementation for international SEO']
        }
    
    validation_results = validate_hreflang_list(codes)
    
    # Analyze key metrics
    total_codes = len(codes)
    unique_codes = len(set(codes))
    has_x_default = 'x-default' in codes
    
    # Count different types
    valid_count = len(validation_results['valid_standard']) + len(validation_results['valid_non_standard'])
    invalid_count = len(validation_results['invalid'])
    duplicate_count = len(validation_results['duplicates'])
    
    # Language and region coverage
    languages = set()
    regions = set()
    for code in codes:
        lang, region = parse_hreflang_code(code)
        if lang and lang != 'x-default':
            languages.add(lang.lower())
        if region:
            regions.add(region.upper())
    
    # Identify issues
    issues = []
    recommendations = []
    
    if invalid_count > 0:
        issues.append(f"{invalid_count} invalid hreflang codes found")
        recommendations.append("Fix invalid hreflang codes using standard ISO language and region codes")
    
    if duplicate_count > 0:
        issues.append(f"{duplicate_count} duplicate hreflang codes found")
        recommendations.append("Remove duplicate hreflang codes to avoid search engine confusion")
    
    if not has_x_default:
        recommendations.append("Consider adding x-default hreflang for users who don't match specific language/region combinations")
    
    if validation_results['valid_non_standard']:
        issues.append(f"{len(validation_results['valid_non_standard'])} codes use non-standard formatting")
        recommendations.append("Standardize hreflang format: language codes lowercase, region codes uppercase")
    
    # Check for common missing combinations
    missing_recommended = []
    for combo in RECOMMENDED_COMBINATIONS:
        if combo not in codes:
            lang, region = parse_hreflang_code(combo)
            if lang in languages:  # If we have this language but not this specific region
                missing_recommended.append(combo)
    
    if missing_recommended:
        recommendations.append(f"Consider adding these commonly used combinations: {', '.join(missing_recommended[:3])}")
    
    return {
        'total_codes': total_codes,
        'unique_codes': unique_codes,
        'valid_codes': valid_count,
        'invalid_codes': invalid_count,
        'duplicate_codes': duplicate_count,
        'has_x_default': has_x_default,
        'language_coverage': len(languages),
        'region_coverage': len(regions),
        'languages': sorted(list(languages)),
        'regions': sorted(list(regions)),
        'validation_details': validation_results,
        'issues': issues,
        'recommendations': recommendations,
        'compliance_score': round((valid_count / total_codes * 100)) if total_codes > 0 else 0
    }


def suggest_hreflang_improvements(codes: List[str]) -> List[Dict[str, str]]:
    """
    Suggest specific improvements for hreflang implementation.
    
    Args:
        codes: Current hreflang codes
        
    Returns:
        List of improvement suggestions with before/after examples
    """
    suggestions = []
    
    for code in set(codes):  # Remove duplicates for analysis
        validation = get_hreflang_validation_result(code)
        
        if not validation['is_valid']:
            suggestions.append({
                'type': 'invalid',
                'current': code,
                'issue': 'Invalid hreflang code',
                'suggestion': 'Use valid ISO language and region codes',
                'improved': None
            })
        elif validation['needs_format_improvement']:
            suggestions.append({
                'type': 'format',
                'current': code,
                'issue': 'Non-standard format',
                'suggestion': 'Use standard case formatting',
                'improved': validation['suggested_format']
            })
    
    # Check for missing x-default
    if 'x-default' not in codes and len(codes) > 1:
        suggestions.append({
            'type': 'missing',
            'current': None,
            'issue': 'Missing x-default',
            'suggestion': 'Add x-default for better fallback handling',
            'improved': 'x-default'
        })
    
    return suggestions