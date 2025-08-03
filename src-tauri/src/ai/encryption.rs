use anyhow::{Result, Context};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use ring::{aead, pbkdf2, rand::{SecureRandom, SystemRandom}};
use std::num::NonZeroU32;

const CREDENTIAL_LEN: usize = 32; // ChaCha20Poly1305 key length
const NONCE_LEN: usize = 12;      // ChaCha20Poly1305 nonce length
const SALT_LEN: usize = 32;
const PBKDF2_ITERATIONS: u32 = 100_000;

pub struct SecureStorage {
    rng: SystemRandom,
}

impl SecureStorage {
    pub fn new() -> Self {
        Self {
            rng: SystemRandom::new(),
        }
    }

    /// Encrypts plaintext using a derived key from password
    pub fn encrypt(&self, plaintext: &str, password: &str) -> Result<String> {
        // Generate random salt
        let mut salt = [0u8; SALT_LEN];
        self.rng.fill(&mut salt).map_err(|_| anyhow::anyhow!("Failed to generate salt"))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_LEN];
        self.rng.fill(&mut nonce_bytes).map_err(|_| anyhow::anyhow!("Failed to generate nonce"))?;

        // Derive key from password using PBKDF2
        let mut key_bytes = [0u8; CREDENTIAL_LEN];
        pbkdf2::derive(
            pbkdf2::PBKDF2_HMAC_SHA256,
            NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
            &salt,
            password.as_bytes(),
            &mut key_bytes,
        );

        // Create encryption key
        let unbound_key = aead::UnboundKey::new(&aead::CHACHA20_POLY1305, &key_bytes)
            .map_err(|_| anyhow::anyhow!("Failed to create encryption key"))?;
        let key = aead::LessSafeKey::new(unbound_key);

        // Create nonce
        let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);

        // Encrypt the data
        let mut in_out = plaintext.as_bytes().to_vec();
        key.seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut in_out)
            .map_err(|_| anyhow::anyhow!("Failed to encrypt data"))?;

        // Combine salt + nonce + ciphertext and encode as base64
        let mut result = Vec::new();
        result.extend_from_slice(&salt);
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&in_out);

        Ok(BASE64.encode(&result))
    }

    /// Decrypts ciphertext using a derived key from password
    pub fn decrypt(&self, ciphertext: &str, password: &str) -> Result<String> {
        // Decode from base64
        let data = BASE64.decode(ciphertext).context("Invalid base64 encoding")?;

        if data.len() < SALT_LEN + NONCE_LEN {
            return Err(anyhow::anyhow!("Ciphertext too short"));
        }

        // Extract salt, nonce, and encrypted data
        let (salt, remaining) = data.split_at(SALT_LEN);
        let (nonce_bytes, encrypted_data) = remaining.split_at(NONCE_LEN);

        // Derive key from password using the same salt
        let mut key_bytes = [0u8; CREDENTIAL_LEN];
        pbkdf2::derive(
            pbkdf2::PBKDF2_HMAC_SHA256,
            NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
            salt,
            password.as_bytes(),
            &mut key_bytes,
        );

        // Create decryption key
        let unbound_key = aead::UnboundKey::new(&aead::CHACHA20_POLY1305, &key_bytes)
            .map_err(|_| anyhow::anyhow!("Failed to create decryption key"))?;
        let key = aead::LessSafeKey::new(unbound_key);

        // Create nonce
        let mut nonce_array = [0u8; NONCE_LEN];
        nonce_array.copy_from_slice(nonce_bytes);
        let nonce = aead::Nonce::assume_unique_for_key(nonce_array);

        // Decrypt the data
        let mut in_out = encrypted_data.to_vec();
        let plaintext_bytes = key.open_in_place(nonce, aead::Aad::empty(), &mut in_out)
            .map_err(|_| anyhow::anyhow!("Failed to decrypt data - incorrect password or corrupted data"))?;

        // Convert back to string
        String::from_utf8(plaintext_bytes.to_vec())
            .context("Decrypted data is not valid UTF-8")
    }

    /// Generates a secure random master password
    pub fn generate_master_password(&self) -> Result<String> {
        let mut password_bytes = [0u8; 32];
        self.rng.fill(&mut password_bytes).map_err(|_| anyhow::anyhow!("Failed to generate password"))?;
        Ok(BASE64.encode(&password_bytes))
    }
}

/// Get or create master password for encryption
pub fn get_master_password() -> Result<String> {
    use std::fs;
    use dirs;

    let config_dir = dirs::config_dir()
        .context("Failed to get config directory")?
        .join("banshee");

    fs::create_dir_all(&config_dir)
        .context("Failed to create config directory")?;

    let password_file = config_dir.join(".master_key");

    if password_file.exists() {
        // Read existing password
        fs::read_to_string(&password_file)
            .context("Failed to read master password file")
    } else {
        // Generate new password
        let storage = SecureStorage::new();
        let password = storage.generate_master_password()?;
        
        // Save password to file with restricted permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::write(&password_file, &password)
                .context("Failed to write master password file")?;
            let mut perms = fs::metadata(&password_file)?.permissions();
            perms.set_mode(0o600); // Only owner can read/write
            fs::set_permissions(&password_file, perms)
                .context("Failed to set password file permissions")?;
        }
        
        #[cfg(not(unix))]
        {
            fs::write(&password_file, &password)
                .context("Failed to write master password file")?;
        }

        Ok(password)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let storage = SecureStorage::new();
        let plaintext = "test_api_key_12345";
        let password = "test_password";

        let encrypted = storage.encrypt(plaintext, password).unwrap();
        let decrypted = storage.decrypt(&encrypted, password).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_wrong_password_fails() {
        let storage = SecureStorage::new();
        let plaintext = "test_api_key_12345";
        let password = "test_password";
        let wrong_password = "wrong_password";

        let encrypted = storage.encrypt(plaintext, password).unwrap();
        let result = storage.decrypt(&encrypted, wrong_password);

        assert!(result.is_err());
    }

    #[test]
    fn test_different_encryptions_different_results() {
        let storage = SecureStorage::new();
        let plaintext = "test_api_key_12345";
        let password = "test_password";

        let encrypted1 = storage.encrypt(plaintext, password).unwrap();
        let encrypted2 = storage.encrypt(plaintext, password).unwrap();

        // Should be different due to random salt and nonce
        assert_ne!(encrypted1, encrypted2);

        // But both should decrypt to the same plaintext
        assert_eq!(storage.decrypt(&encrypted1, password).unwrap(), plaintext);
        assert_eq!(storage.decrypt(&encrypted2, password).unwrap(), plaintext);
    }
}