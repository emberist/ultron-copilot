import { Keypair } from "@solana/web3.js";
import crypto, { randomFillSync } from "crypto";
import { EncryptedData } from "../common/types";

const ALGORITHM = "aes-256-gcm";
const KEY_SIZE = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const DIGEST = "sha256";

const HEX_SALT_LENGTH = SALT_LENGTH * 2;
const HEX_IV_LENGTH = IV_LENGTH * 2;
const HEX_TAG_LENGTH = 16 * 2;
const MIN_SECRET_LENGTH = 32;

type CryptoContent = {
  salt: string;
  iv: string;
  tag: string;
  content: string;
};

function validateCryptoInputs(secret: Buffer, components?: CryptoContent) {
  if (secret.length < MIN_SECRET_LENGTH) {
    return { type: "SecretTooShort" as const };
  }

  if (components) {
    if (components.salt.length !== HEX_SALT_LENGTH) {
      return { type: "InvalidSaltLength" as const };
    }
    if (components.iv.length !== HEX_IV_LENGTH) {
      return { type: "InvalidIVLength" as const };
    }
    if (components.tag.length !== HEX_TAG_LENGTH) {
      return { type: "InvalidTagLength" as const };
    }
    if (!/^[a-f0-9]+$/i.test(components.content)) {
      return { type: "InvalidContentHex" as const };
    }
  }

  return { type: "Success" as const };
}

export const encrypt = (keypair: Keypair, secret: Buffer) => {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_SIZE, DIGEST);
    validateCryptoInputs(hash);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, hash, iv);
    randomFillSync(hash);

    let encrypted = cipher.update(Buffer.from(keypair.secretKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      type: "Success" as const,
      result: {
        iv: iv.toString("hex"),
        salt: salt.toString("hex"),
        content: encrypted.toString("hex"),
        tag: authTag.toString("hex"),
      },
    };
  } catch (error) {
    return { type: "EncryptionFailed" as const };
  }
};

export const decrypt = (encryptedKeypair: EncryptedData, secret: Buffer) => {
  try {
    const salt = Buffer.from(encryptedKeypair.salt, "hex");
    const iv = Buffer.from(encryptedKeypair.iv, "hex");
    const encryptedText = Buffer.from(encryptedKeypair.content, "hex");
    const authTag = Buffer.from(encryptedKeypair.tag, "hex");

    const hash = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_SIZE, DIGEST);
    validateCryptoInputs(hash);

    const decipher = crypto.createDecipheriv(ALGORITHM, hash, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    randomFillSync(salt);
    randomFillSync(hash);
    randomFillSync(iv);
    randomFillSync(encryptedText);
    randomFillSync(authTag);

    return { type: "Success" as const, result: decrypted };
  } catch (error) {
    return { type: "DecryptionFailed" as const };
  }
};
