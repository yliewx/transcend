import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Profile from '../models/profile';
import { Database } from 'sqlite';
import { getDb } from '../db.js';

interface RegistrationRequest {
  username: string;
  password: string;
  email: string;
}

// User registration handler
export async function registerUser(
    request: FastifyRequest<{ Body: RegistrationRequest }>,
    reply: FastifyReply
) {
	const { username, password, email } = request.body;

	// Validate input
	if (!username || !password || !email) {
		return reply.status(400).send({ 
			success: false, 
			error: 'All fields are required' 
		});
	}

	// Email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return reply.status(400).send({ 
			success: false, 
			error: 'Please enter a valid email address' 
		});
	}

	// Password validation (at least 8 characters)
	if (password.length < 8) {
		return reply.status(400).send({ 
			success: false, 
			error: 'Password must be at least 8 characters long' 
		});
	}

	try {
		// Get database connection
		const db = await getDb();
		
		// Begin transaction
		await db.run('BEGIN TRANSACTION');
		
		try {
				// Create user
				const userResult = await User.create(db, { username, password, email });
				if (userResult.lastID === undefined) {
					throw new Error("Failed to create user: No user ID was generated");
				}
				const userId = userResult.lastID; // Now userId is guaranteed to be a number

				// Create profile
				await Profile.create(db, {
					user_id: userId,
					display_name: username // Use username as default display name
				});
				const profResult = Profile.findByUserId(db, userId);
				console.log(`profResult: ${profResult}`);

				// Create default player stats entry
				await db.run(
					`INSERT INTO player_stats (user_id, elo_rating, games_played, games_won, games_lost, current_win_streak, max_win_streak) 
					 VALUES (?, 1200, 0, 0, 0, 0, 0)`, 
					[userId]
				);

				// Commit transaction
				await db.run('COMMIT');
				
				return reply.status(201).send({ 
					success: true, 
					message: 'Registration successful' 
				});
		} catch (error) {
				// Rollback transaction if error occurs
				await db.run('ROLLBACK');
				throw error;
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes('already exists')) {
			return reply.status(409).send({
				success: false,
				error: error.message
			});
		}

		request.log.error(error);
		return reply.status(500).send({
			success: false,
			error: 'Registration failed. Please try again later.'
		});
	}
}

export async function registerGoogleUser(db: Database, server: FastifyInstance, name?: string, email?: string, google_id?: string) {
  // Begin transaction
  await db.run('BEGIN TRANSACTION');
  try {
    const username = name ?? (email ? email.split('@')[0] : 'default_username');
    const password = 'placeholder_for_google_user';

    const validEmail = email ?? '';  // Default to empty string if email is undefined
    const validGoogleId = google_id ?? ''; // Default to empty string if google_id is undefined

    // Create user
    const userResult = await User.create(db, { username, email: validEmail, password, google_id: validGoogleId });
    if (userResult.lastID === undefined) {
      throw new Error("Failed to create user: No user ID was generated");
    }
    const userId = userResult.lastID; // Now userId is guaranteed to be a number

    // Create profile
    await Profile.create(db, {
      user_id: userId,
      display_name: username // Use username as default display name
    });

    const profResult = await Profile.findByUserId(db, userId);
    server.log.info(`profResult: ${profResult}`);

	 // Create default player stats entry
	 await db.run(
		`INSERT INTO player_stats (user_id, elo_rating, games_played, games_won, games_lost, current_win_streak, max_win_streak) 
		 VALUES (?, 1200, 0, 0, 0, 0, 0)`, 
		[userId]
	  );

    // Commit transaction
    await db.run('COMMIT');

		server.log.info('created user and profile');
    
    return await User.findByGoogleId(db, google_id as string);
  } catch (error) {
    // Rollback transaction if error occurs
    await db.run('ROLLBACK');
		server.log.info(`ERROR in registerGoogleUser: ${error}`);
    throw error;
  }
}
