
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "https://ep-frosty-queen-ahrep9ya.neonauth.c-3.us-east-1.aws-neon.tech/neondb/auth",
    disableCookieCache: true,
    fetchOptions: {
        credentials: "include",
    }
});
