import jwt from 'jsonwebtoken';
export declare const generateAccessToken: (userId: string, role: string) => string;
export declare const generateRefreshToken: (userId: string) => string;
export declare const verifyToken: (token: string) => string | jwt.JwtPayload;
export declare const generateEmailVerificationToken: (email: string) => string;
export declare const verifyEmailVerificationToken: (token: string) => {
    email: string;
};
//# sourceMappingURL=jwt.util.d.ts.map