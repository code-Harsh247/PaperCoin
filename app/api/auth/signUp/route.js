// Author of code is Abhinav Kumar Singh
import { NextResponse } from "next/server"; 
import { doesUserExists, addUsertoDb, isPasswordSet, runQuery } from "@/lib/db-utils";
import bcrypt from 'bcrypt';

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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const isUserExists = await doesUserExists(email);
        console.log("User exists:", isUserExists);

        if (isUserExists) {
            const isPasswordAlreadySet = await isPasswordSet(email);
            console.log("User has password set:", isPasswordAlreadySet);
            
            if (isPasswordAlreadySet) {
                return NextResponse.json({ message: "User already exists with password set" }, { status: 400 });
            }
            await addUsertoDb({ email: email, password_hash: hashedPassword });
            return NextResponse.json({ message: "User successfully updated with password" }, { status: 200 });
        } 

        // Add new user and get user_id
        const user_id = await addUsertoDb({ email: email, password_hash: hashedPassword });
        
        if (!user_id) {
            return NextResponse.json({ message: "Failed to create user account." }, { status: 500 });
        }

        // Initialize default funds for new user
        const defaultFundQuery = `
            INSERT INTO user_portfolios (user_id, total_balance, total_invested, available_funds, last_updated, btccoins)
            VALUES ($1, 10000, 0, 10000, NOW(), 0);
        `;
        
        await runQuery(defaultFundQuery, [user_id]);
        return NextResponse.json({ message: "User added successfully with default portfolio." }, { status: 200 });

    } catch (error) {
        console.error("Error in user registration:", error);
        return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
    }
}