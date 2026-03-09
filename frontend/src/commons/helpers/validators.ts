import { EMAIL_REGEX, COMPULSORY_REGEX, STRONG_PASSWORD_REGEX } from "./regex.ts"

export function getBlankFieldError(id:string, value: string) {
    if (!COMPULSORY_REGEX.test(value)) {
        return `${id.charAt(0).toUpperCase() + id.slice(1)} is required. \n`;
    }
    return "";
}

export function getValidPasswordError(value: string) {
    getBlankFieldError('password', value)
    if (!STRONG_PASSWORD_REGEX.test(value)) {
        return `Passwords need to be  at least 8 characters long, \n with
        at least one lowercase, one uppercase, one number and one special character. \n`;
    }
    return "";
}

export function getValidConfirmPasswordError(confirmPasswordValue: string, passwordValue:string) {
    getBlankFieldError('confirm password', confirmPasswordValue)
    if (confirmPasswordValue != passwordValue) {
        return `Password does not match.\n `;
    }
    return "";
}

export function getValidEmailError(value: string) {
    getBlankFieldError('email', value)
    if (!EMAIL_REGEX.test(value)) {
        return `Email needs to be in the correct format.\n `;
    }
    return "";
}

export function getValidUsernameError(value: string) {
    getBlankFieldError('username', value)
    if (value.length < 6) {
        return `Username needs to be at least 6 character long.\n `;
    }
    return "";
}

