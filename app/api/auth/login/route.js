// app/api/auth/login/route.js
import { NextResponse } from "next/server";     
import { authenticateUser } from "@/lib/db-utils";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getJwtSecret } from "@/lib/jwtSecret";

export async function POST(request) {
    if(!request) {
        return NextResponse.json({ message: "Request not found." }, { status: 400 });
    }
    
    let email, password;
    
    try {
        const body = await request.json();
        email = body.email;
        password = body.password;
    } catch (error) {
        return NextResponse.json({ message: "Invalid JSON in request body." }, { status: 400 });
    }
    
    if (!email || !password) {
        return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    try {
        const user = await authenticateUser(email, password);
        
        if (!user) {
            return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
        }

        // Generate JWT token
        const token = await new SignJWT({ email: user.email, username: user.username })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(getJwtSecret());
        
        // Set the token in a cookie
        const cookieStore = await cookies();
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
            sameSite: 'strict'
        });

        // Return user info to store in Zustand
        return NextResponse.json({ 
            message: "Login successful.",
            user: {
                userId: user.user_id,
                email: user.email,
                username: user.username
            }
        }, { status: 200 });
    }
    catch(error) {
        console.error("Error in user authentication:", error);
        return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
    }
}