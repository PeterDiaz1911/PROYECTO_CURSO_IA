import bcrypt from "bcryptjs";
import { generateSecret, verify } from "otplib";
import { clearLoginFailures, isIpLocked, registerLoginFailure } from "@/lib/login-attempts";

export const passwordHash = (password: string) => bcrypt.hash(password, 12);
export const passwordMatches = (password: string, hash: string) => bcrypt.compare(password, hash);
export const createTotpSecret = () => generateSecret();
export const verifyTotp = async (token: string, secret: string) => (await verify({ token, secret })).valid;
export { isIpLocked, clearLoginFailures as registerSuccess, registerLoginFailure as registerFailure };
