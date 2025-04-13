// db-util.js

import exp from 'constants';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function insertOrderBookUpdate(update) {
  const query = `
    INSERT INTO order_book_updates (time, symbol, side, price, quantity, first_update_id, last_update_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING;  -- optional
  `;
  const values = [
    update.time,
    update.symbol,
    update.side,
    update.price,
    update.quantity,
    update.firstUpdateId,
    update.lastUpdateId,
  ];

  await pool.query(query, values);
}

export async function insertSnapshot(snapshot) {
  const query = `
    INSERT INTO order_book_snapshots (time, symbol, last_update_id, bids, asks)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING;
  `;
  const values = [
    snapshot.time,
    snapshot.symbol,
    snapshot.lastUpdateId,
    JSON.stringify(snapshot.bids),
    JSON.stringify(snapshot.asks),
  ];

  await pool.query(query, values);
}

export async function getRecentUpdates(symbol, limit = 100) {
  const query = `
    SELECT * FROM order_book_updates
    WHERE symbol = $1
    ORDER BY time DESC
    LIMIT $2;
  `;
  const { rows } = await pool.query(query, [symbol, limit]);
  return rows;
}

export async function getOpenOrders(userId) {
  const query = `
    SELECT * FROM "openorders"
    WHERE user_id = $1
    ORDER BY trade_time DESC;
  `;

  try {
    const { rows } = await pool.query(query, [userId]);  
    return rows;
  } catch (error) {
    console.error("Error fetching open orders:", error);
    throw new Error("Failed to fetch open orders");
  }
}

export async function getOrderHistory(userId) {
  const query = `
    SELECT * FROM "orderhistory"
    WHERE user_id = $1
    ORDER BY trade_time DESC;
  `;

  try {
    const { rows } = await pool.query(query, [userId]);  
    return rows; 
  } catch (error) {
    console.error("Error fetching order history:", error);
    throw new Error("Failed to fetch order history");
  }
}


export async function getFunds(userId) {
  const query = `
    SELECT * FROM "wallets"
    WHERE user_id = $1;
  `;

  try {
    const { rows } = await pool.query(query, [userId]);  
    return rows; 
  } catch (error) {
    console.error("Error fetching funds:", error);
    throw new Error("Failed to fetch funds");
  }
}

export async function addUsertoDb(userInfo) {
  // console.log("Adding user to DB:", userInfo);
  const {username=null, email, password_hash = null, google_id = null } = userInfo;

  const query = `
    INSERT INTO users (username, email, password_hash, google_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) 
    DO UPDATE SET 
      password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
      google_id = COALESCE(EXCLUDED.google_id, users.google_id)
    RETURNING *;
  `;

  try {
    const client = await pool.connect();
    const result = await client.query(query, [username, email, password_hash, google_id]);
    client.release();

    if (result.rowCount === 0) {
      console.log("User already exists, not inserting again.");
      return null;
    }

    console.log("New user added or updated:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("Error adding/updating user in DB:", error);
    throw error;
  }
}

export async function isPasswordSet(email) {
  const query = `
    SELECT username, password_hash, google_id FROM users
    WHERE email=$1;
  `;

  try {
    const { rows } = await pool.query(query, [email]);
    
    if (rows.length === 0) {
      return false; // User doesn't exist
    }
    const user = rows[0];
    return user.password_hash != null; // Return true if password is set
    
  } catch (error) {
    console.error("Error checking if password is set:", error);
    throw error;
  }
}
export async function doesUserExists(email) {
  const query = `
    SELECT * FROM users WHERE email = $1;
  `;

  try {
    const { rows } = await pool.query(query, [email]);
    return rows.length > 0; // Returns true if user exists
  } catch (error) {
    console.error("Error checking if user exists:", error);
    throw error;
  }
}

// in @/lib/db-utils.js
export async function authenticateUser(email, password) {
  const query = `
    SELECT user_id, email, password_hash 
    FROM users 
    WHERE email = $1
    LIMIT 1
  `;
  
  const result = await pool.query(query, [email]);
  
  if (result.rowCount === 0) {
    return null;
  }
  
  const user = result.rows[0];
  // Using bcrypt to compare password with stored hash
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordValid) {
    return null;
  }
  
  // Return user without password_hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function checkIfUserNameSet(email) {
  const query = `
    SELECT username FROM users
    WHERE email=$1;
  `;

  try {
    const { rows } = await pool.query(query, [email]);
    return rows.length > 0 && rows[0].username !== null;
  } catch (error) {
    console.error("Error checking if username is set:", error);
    throw error;
  }
}

export async function fetchUserName(email){
  const query = `
    SELECT username FROM users
    WHERE email=$1;
  `;

  try {
    const { rows } = await pool.query(query, [email]);
    return rows.length > 0 ? rows[0].username : null;
  } catch (error) {
    console.error("Error fetching username:", error);
    throw error;
  }
}

export async function checkIfUserNameExists(username) {
  const query = `
    SELECT * FROM users
    WHERE username=$1;
  `;
  try {
    const { rows } = await pool.query(query, [username]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking if username exists:", error);
    throw error;
  }
}

export async function updateUserName(email, username) {
  const query = `
    UPDATE users
    SET username = $1
    WHERE email = $2;
  `

  try {
    const { rowCount } = await pool.query(query, [username, email]);
    return rowCount > 0;
  } catch (error) {
    console.error("Error updating username:", error);
    throw error;
  }
}

export async function runQuery(query, params) {
  try {
    const { rows } = await pool.query(query, params);
    // console.log("Query executed successfully:", query, params);
    // console.log("Rows returned:", rows);
    return rows;
  } catch (err) {
    console.error("Database query error:", err);
    throw err; // rethrow for handling at a higher level
  }
}

export async function getUserId(email) {
  const query = `
    SELECT user_id FROM users
    WHERE email=$1;
  `;

  try {
    const { rows } = await pool.query(query, [email]);
    return rows.length > 0 ? rows[0].user_id : null;
  } catch (error) {
    console.error("Error fetching user ID:", error);
    throw error;
  }
}