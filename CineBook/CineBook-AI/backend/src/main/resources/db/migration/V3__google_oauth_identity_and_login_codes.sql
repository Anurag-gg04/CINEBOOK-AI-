CREATE TABLE oauth_identities (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    email VARCHAR(190) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_oauth_identity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_oauth_provider_subject UNIQUE (provider, provider_subject),
    CONSTRAINT uq_oauth_user_provider UNIQUE (user_id, provider),
    INDEX idx_oauth_identity_email (email)
) ENGINE=InnoDB;

CREATE TABLE oauth_login_codes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_oauth_login_code_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_oauth_code_expiry (expires_at)
) ENGINE=InnoDB;
