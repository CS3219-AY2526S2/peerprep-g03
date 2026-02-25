export const EMAIL_REGEX: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const COMPULSORY_REGEX: RegExp = /\S/;
export const STRONG_PASSWORD_REGEX: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,#])[A-Za-z\d@$!%*?&.,#]{8,}$/;  // 8 char with at least one lowercase, one uppercase, one number and one special character
