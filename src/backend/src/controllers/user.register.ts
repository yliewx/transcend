import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import User from '../models/user';
import Profile from '../models/profile';
import { Database } from 'sqlite';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

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
            const userId = uuidv4();
            await User.create(db, { id: userId, username, password, email });
            
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

        const userId = uuidv4();
        await User.create(db, { id: userId, username, email: validEmail, password, google_id: validGoogleId });

        await Profile.create(db, {
            user_id: userId,
            display_name: username 
        });

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