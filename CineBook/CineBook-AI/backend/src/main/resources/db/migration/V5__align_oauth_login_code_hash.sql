ALTER TABLE oauth_login_codes
    MODIFY COLUMN code_hash VARCHAR(64) NOT NULL;