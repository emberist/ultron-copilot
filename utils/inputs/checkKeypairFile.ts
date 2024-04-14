import { existsSync, readFileSync } from "fs-extra";
import { EncryptedData } from "../../common/types";

export const checkKeypairFile = (keypairPath: string) => {
  if (!existsSync(keypairPath)) return { type: "KeypairFileNotFound" as const };
  const fileContent = readFileSync(keypairPath).toString();
  const encryptedKeypair = JSON.parse(fileContent) as EncryptedData;

  if (
    encryptedKeypair.iv &&
    encryptedKeypair.content &&
    encryptedKeypair.salt &&
    encryptedKeypair.tag
  )
    return { type: "Success" as const };

  return { type: "KeypairFileParsingError" as const };
};
