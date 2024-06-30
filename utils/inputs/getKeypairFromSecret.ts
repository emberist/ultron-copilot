import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import inquirer from "inquirer";
import { Profile } from "../../common/constants";
import { getKeypairVariableName } from "../variables/getKeypairVariableName";
import { decryptKeypair } from "./decryptKeypair";

export const getKeypairFromSecret = async (
  profile: Profile
): Promise<Keypair> => {
  const keypairFromEnv = process.env[getKeypairVariableName(profile)];

  if (keypairFromEnv) {
    return Keypair.fromSecretKey(base58.decode(keypairFromEnv));
  }

  const answer = await inquirer.prompt([
    {
      type: "password",
      name: "secret",
      message: "Enter your password to start:",
      validate: (input) => {
        const secret = Buffer.from(input);
        const keypair = decryptKeypair(secret, profile);

        if (keypair.type !== "Success") {
          return "Wrong password or incorrect keypair, please retry";
        }

        return true;
      },
    },
  ]);

  const secret = Buffer.from(answer.secret);
  const keypair = decryptKeypair(secret, profile);

  if (keypair.type !== "Success") {
    console.log("Wrong password or incorrect keypair, please retry");

    process.exit(1);
  }

  return keypair.result;
};
