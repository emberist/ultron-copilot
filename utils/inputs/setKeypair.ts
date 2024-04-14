import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { chmodSync, outputFileSync, removeSync } from "fs-extra";
import inquirer, { QuestionCollection } from "inquirer";
import { encrypt } from "../crypto";
import { checkKeypairFile } from "./checkKeypairFile";

export const setKeypair = (keypairPath: string) => {
  const ckf = checkKeypairFile(keypairPath);
  if (ckf.type === "KeypairFileParsingError") removeSync(keypairPath);
  if (ckf.type === "Success") return Promise.resolve();

  const questions: QuestionCollection = [
    {
      type: "password",
      name: "secretKey",
      message: "Enter your base58 wallet private key:",
      validate: (input) => {
        try {
          const secret = bs58.decode(input);
          const keypair = Keypair.fromSecretKey(secret);

          if (!PublicKey.isOnCurve(keypair.publicKey.toBytes()))
            throw new Error("KeypairIsNotOnCurve");

          return true;
        } catch (e) {
          return "Wrong private key, please retry again";
        }
      },
    },
    {
      type: "password",
      name: "secret",
      message:
        "Enter a password (at least 8 characters with one capital, one number and one special character) to encrypt your private key. Be sure to save it in a safe place and do not share it with anyone:",
      validate: (input, answers) => {
        if (answers) {
          const hasUpperCase = /[A-Z]/.test(input);
          const hasLowerCase = /[a-z]/.test(input);
          const hasNumber = /\d/.test(input);
          const hasSpecialChar = /\W/.test(input);

          if (
            input.length >= 8 &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumber &&
            hasSpecialChar
          ) {
            return true;
          }
          return "The password must contain at least 8 characters with at least one capital, one number and one special character.";
        }
      },
    },
    {
      type: "password",
      name: "confirmSecret",
      message: "Confirm your password:",
      validate: (input, answers) => {
        if (answers && input === answers.secret) {
          const secret = Buffer.from(input);
          const keypair = Keypair.fromSecretKey(bs58.decode(answers.secretKey));
          const encryptedKeypair = encrypt(keypair, secret);
          if (encryptedKeypair.type !== "Success")
            return `Encryption Failed, please retry. Error: ${encryptedKeypair.type}`;

          outputFileSync(keypairPath, JSON.stringify(encryptedKeypair.result));
          chmodSync(keypairPath, 0o400);

          return true;
        }
        return "Passwords don't match. If you didn't remember the first password, restart Ultron.";
      },
    },
  ];

  return inquirer.prompt(questions);
};
