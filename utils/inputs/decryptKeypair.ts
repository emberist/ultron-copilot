import { Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs-extra";
import { Profile } from "../../common/constants";
import { EncryptedData } from "../../common/types";
import { decrypt } from "../crypto";
import { getProfileKeypairPath } from "./getProfileKeypairPath";

export const decryptKeypair = (secret: Buffer, profile: Profile) => {
  const keypairPath = getProfileKeypairPath(profile);

  try {
    const fileContent = readFileSync(keypairPath).toString();
    const encryptedKeypair = JSON.parse(fileContent) as EncryptedData;

    if (
      !encryptedKeypair.iv ||
      !encryptedKeypair.content ||
      !encryptedKeypair.salt ||
      !encryptedKeypair.tag
    ) {
      return {
        type: "EncryptedKeypairParsingError" as const,
      };
    }

    const decryptedKeypair = decrypt(encryptedKeypair, secret);

    if (decryptedKeypair.type !== "Success") {
      return decryptedKeypair;
    }

    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(decryptedKeypair.result)
    );

    if (!PublicKey.isOnCurve(keypair.publicKey.toBytes())) {
      return { type: "KeypairIsNotOnCurve" as const };
    }

    return { type: "Success" as const, result: keypair };
  } catch (e) {
    return { type: "DecryptKeypairError" as const };
  }
};
