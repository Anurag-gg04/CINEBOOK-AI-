ALTER TABLE email_verification_tokens
    MODIFY COLUMN token_hash VARCHAR(64) NOT NULL;