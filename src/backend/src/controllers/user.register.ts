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

export async function registerUser(request: FastifyRequest<{ Body: RegistrationRequest }>, reply: FastifyReply) 
{
	const { username, password, email } = request.body;

	if (!username || !password || !email) {
		return reply.status(400).send({ 
			success: false, 
			error: 'All fields are required' 
		});
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return reply.status(400).send({ 
			success: false, 
			error: 'Please enter a valid email address' 
		});
	}

	if (password.length < 8) {
		return reply.status(400).send({ 
			success: false, 
			error: 'Password must be at least 8 characters long' 
		});
	}

	try {
		const db = await getDb();
		
		await db.run('BEGIN TRANSACTION');
		
		try {
			const userResult = await User.create(db, { username, password, email });
			if (userResult.lastID === undefined) {
				throw new Error("Failed to create user: No user ID was generated");
			}
			const userId = userResult.lastID;
			await Profile.create(db, {user_id: userId, display_name: username});
			await db.run(
				`INSERT INTO player_stats (user_id, elo_rating, games_played, games_won, games_lost, current_win_streak, max_win_streak) 
					VALUES (?, 1200, 0, 0, 0, 0, 0)`, 
				[userId]
			);

			await db.run('COMMIT');
			
			return reply.status(201).send({ 
				success: true, 
				message: 'Registration successful' 
			});
		} catch (error) {
			await db.run('ROLLBACK');
			throw error;
		}
	} catch (error) {
		request.log.error(error);
		if (error instanceof Error && error.message.includes('already exists')) {
			return reply.status(409).send({
				success: false,
				error: error.message
			});
		}
		return reply.status(400).send({
			success: false,
			error: 'Registration failed. Please try again later.'
		});
	}
}

export async function registerGoogleUser(db: Database, server: FastifyInstance, name?: string, email?: string, google_id?: string) {
  await db.run('BEGIN TRANSACTION');
  try {
    const username = name ?? (email ? email.split('@')[0] : 'default_username');
    const password = 'placeholder_for_google_user';

    const validEmail = email ?? '';
    const validGoogleId = google_id ?? '';

    const userResult = await User.create(db, { username, email: validEmail, password, google_id: validGoogleId });
    if (userResult.lastID === undefined) {
      throw new Error("Failed to create user: No user ID was generated");
    }
    const userId = userResult.lastID;

    await Profile.create(db, {
      user_id: userId,
      display_name: username 
    });

    const profResult = await Profile.findByUserId(db, userId);
    server.log.info(`profResult: ${profResult}`);

	 await db.run(
		`INSERT INTO player_stats (user_id, elo_rating, games_played, games_won, games_lost, current_win_streak, max_win_streak) 
		 VALUES (?, 1200, 0, 0, 0, 0, 0)`, 
		[userId]
	  );

    await db.run('COMMIT');

	server.log.info('created user and profile');
    
    return await User.findByGoogleId(db, google_id as string);
  } catch (error) {
    await db.run('ROLLBACK');
		server.log.info(`ERROR in registerGoogleUser: ${error}`);
    throw error;
  }
}
